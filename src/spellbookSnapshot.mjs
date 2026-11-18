import {randomUUID} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,rename,stat,unlink} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGunzip,createGzip} from 'node:zlib';
import {normalizeVariant} from './combos.mjs';
import {indexDiscoveryCombos} from './discoveryCombos.mjs';
import {noteSpellbookResponse,waitForSpellbook} from './spellbookTransport.mjs';

export const SPELLBOOK_EXPORT='https://json.commanderspellbook.com/variants.json.gz';
const cacheFile=join(import.meta.dirname,'..','data','spellbook-discovery-v1.json.gz');
const maxArchiveBytes=64*1024*1024;
// The official archive includes hundreds of MB of repeated printing metadata.
const maxDocumentBytes=1_300_000_000;
const maxVariants=250_000;
const cacheVersion=1;
const week=7*24*60*60_000;
const schemaError=()=>Error('Commander Spellbook snapshot is incomplete or has an unsupported format.');
const excludedStatuses=new Set(['N','D','NR','E','R','NW','RF']);

/** The public export places its metadata before the variants array. Parse one
 * variant at a time, leaving the much smaller alias table for footer validation.
 * Both archive and compact local cache use this envelope. */
async function readVariantDocument(stream,visit){
 let prefix='',suffix='',metadata=null,depth=0,inString=false,escaped=false;
 let state='first',recordLength=0,bytes=0,count=0;
 const record=[];
 const structural=/["\\{}]/g,whitespace=/[ \t\r\n]*/y;
 for await(let chunk of stream.setEncoding('utf8')){
  bytes+=Buffer.byteLength(chunk);
  if(bytes>maxDocumentBytes)throw Error('Commander Spellbook snapshot exceeds the decoded size limit.');
  if(!metadata){
   prefix+=chunk;
   const start=/^\s*(\{[\s\S]*?)"variants"\s*:\s*\[/.exec(prefix);
   if(!start){
    if(prefix.length>8192)throw schemaError();
    continue;
   }
   if(start[0].length>8192)throw schemaError();
   metadata=JSON.parse(start[1]+'"variants":[]}');
   if(!Number.isFinite(Date.parse(metadata.timestamp))||typeof metadata.version!=='string')throw schemaError();
   chunk=prefix.slice(start[0].length);
   prefix='';
  }
  let cursor=0;
  while(cursor<chunk.length){
   if(state==='footer'){
    suffix+=chunk.slice(cursor);
    if(suffix.length>16*1024*1024)throw schemaError();
    break;
   }
   if(!depth){
    whitespace.lastIndex=cursor;
    whitespace.exec(chunk);
    cursor=whitespace.lastIndex;
    if(cursor===chunk.length)break;
    if(chunk[cursor]===']'&&state!=='next'){
     state='footer';
     cursor++;
     continue;
    }
    if(state==='after'){
     if(chunk[cursor]!==',')throw schemaError();
     state='next';
     cursor++;
     continue;
    }
    if(chunk[cursor]!=='{')throw schemaError();
   }
   structural.lastIndex=cursor+(escaped?1:0);
   escaped=false;
   let end=chunk.length,token;
   while((token=structural.exec(chunk))){
    if(token[0]==='"')inString=!inString;
    else if(inString&&token[0]==='\\'){
     escaped=structural.lastIndex===chunk.length;
     structural.lastIndex++;
    }else if(!inString){
     if(token[0]==='{')depth++;
     if(token[0]==='}'&&--depth===0){
      end=structural.lastIndex;
      break;
     }
    }
   }
   recordLength+=end-cursor;
   if(recordLength>2_000_000)throw schemaError();
   record.push(chunk.slice(cursor,end));
   cursor=end;
   if(!depth){
    if(++count>maxVariants)throw Error('Commander Spellbook snapshot exceeds the variant count limit.');
    visit(JSON.parse(record.join('')),metadata);
    record.length=0;
    recordLength=0;
    state='after';
   }
  }
 }
 if(state!=='footer'||!count)throw schemaError();
 JSON.parse('{"variants":[]'+suffix);
 return {...metadata,count};
}

async function loadSnapshot(stream,{fromCache,downloadedAt}){
 const variants=[];
 let skipped=0;
 const metadata=await readVariantDocument(stream,(raw,header)=>{
  if(fromCache){
   if(header.cacheVersion!==cacheVersion||!Number.isInteger(header.skipped)||!/^\d+(?:--?\d+)*$/.test(raw.id)||
    !Array.isArray(raw.uses)||!raw.uses.length||!Array.isArray(raw.results)||!Array.isArray(raw.templateRequirements)||
    !Array.isArray(raw.steps)||!Array.isArray(raw.prerequisites)||!Array.isArray(raw.comboIds)||typeof raw.manaNeeded!=='string'||
    raw.uses.some(use=>typeof use.name!=='string'||!Array.isArray(use.zoneLocations)||!Number.isInteger(use.quantity)||use.quantity<1))throw schemaError();
   variants.push({...raw,url:'https://commanderspellbook.com/combo/'+raw.id+'/'});
   return;
  }
  // Draft, example-only, broken, spoiler and non-Commander entries are
  // outside the published, playable corpus for this search.
  if(excludedStatuses.has(raw.status)||raw.spoiler||raw.legalities?.commander===false)return;
  const variant=normalizeVariant(raw);
  if(raw.status!=='OK'||raw.legalities?.commander!==true||!variant?.results.length||
    variant.uses.length!==raw.uses?.length||variant.templateRequirements.length!==raw.requires?.length||
    [...variant.uses,...variant.templateRequirements].some(use=>!Number.isInteger(use.quantity)||use.quantity<1||use.quantity>99)){
   skipped++;
   return;
  }
  // Keep the matching and execution fields, not printing images, prices,
  // or metadata specific to the manual Find My Combos response.
  const {id,url,uses,templateRequirements,prerequisites,steps,results,manaNeeded,manaValueNeeded,identity,comboIds}=variant;
  variants.push({id,url,uses,templateRequirements,prerequisites,steps,results,manaNeeded,manaValueNeeded,identity,comboIds});
 });
 if(!variants.length||fromCache&&metadata.count!==metadata.keptVariants)throw schemaError();
 const fetchedAt=fromCache?metadata.downloadedAt:downloadedAt;
 if(!Number.isFinite(fetchedAt)||fetchedAt<=0)throw schemaError();
 return {variants,index:indexDiscoveryCombos(variants),downloadedAt:fetchedAt,
  timestamp:new Date(metadata.timestamp).toISOString(),version:metadata.version,skipped:fromCache?metadata.skipped:skipped};
}

function* serializeSnapshot(snapshot){
 const header={cacheVersion,version:snapshot.version,timestamp:snapshot.timestamp,
  downloadedAt:snapshot.downloadedAt,keptVariants:snapshot.variants.length,skipped:snapshot.skipped};
 yield JSON.stringify(header).slice(0,-1)+',"variants":[';
 let separator='',batch='';
 for(const variant of snapshot.variants){
  batch+=separator+JSON.stringify(variant);
  separator=',';
  if(batch.length>=128*1024){
   yield batch;
   batch='';
  }
 }
 yield batch+']}';
}

async function saveSnapshot(file,snapshot){
 await mkdir(dirname(file),{recursive:true});
 const tmp=file+'.'+randomUUID()+'.tmp';
 try{
  await pipeline(Readable.from(serializeSnapshot(snapshot)),createGzip({level:1}),createWriteStream(tmp,{flags:'wx'}));
  await rename(tmp,file);
 }finally{await unlink(tmp).catch(()=>{});}
}

async function cachedSnapshot(file){
 if((await stat(file)).size>maxArchiveBytes)throw schemaError();
 const zip=createReadStream(file),inflated=createGunzip();
 zip.on('error',err=>inflated.destroy(err));
 zip.pipe(inflated);
 try{return await loadSnapshot(inflated,{fromCache:true});}
 finally{zip.destroy();inflated.destroy();}
}

/** One fetch/index build for overlapping searches, fresh memory/disk reuse,
 * and a dated stale fallback during an upstream outage. */
export function createSpellbookSnapshotStore({file=cacheFile,fetcher=fetch,now=Date.now,maxAgeMs=week,minGapMs=2000}={}){
 let snapshot=null,pending=null,retryAt=0,lastError=null,cacheWarning=null;
 const fresh=()=>snapshot&&now()>=snapshot.downloadedAt&&now()-snapshot.downloadedAt<maxAgeMs;
 const result=source=>({snapshot,source,error:lastError,cacheWarning,status:snapshot?(fresh()?'ready':'stale'):'unavailable'});
 return async function getSnapshot(){
  if(pending)return pending;
  if(fresh()||now()<retryAt)return result(snapshot?'memory':null);
  pending=(async()=>{
   if(!snapshot){
    try{snapshot=await cachedSnapshot(file);}
    catch(err){if(err.code!=='ENOENT')cacheWarning='The saved Spellbook snapshot could not be read.';}
    if(fresh())return result('disk');
   }
   try{
    await waitForSpellbook({fetcher,now,minGapMs});
    const response=await fetcher(SPELLBOOK_EXPORT,{headers:{Accept:'application/json','User-Agent':'CommanderOracleIndependent/1.1.5'},
     redirect:'error',signal:AbortSignal.timeout(60_000)});
    noteSpellbookResponse(response,{fetcher,now});
    if(!response.ok||!response.body)throw Error('Commander Spellbook snapshot download failed (HTTP '+response.status+').');
    // Fetch streams the decoded HTTP body from the official gzip endpoint.
    if(Number(response.headers.get('content-length'))>maxArchiveBytes){
     await response.body.cancel();
     throw Error('Commander Spellbook snapshot exceeds the download size limit.');
    }
    const body=Readable.fromWeb(response.body);
    try{snapshot=await loadSnapshot(body,{fromCache:false,downloadedAt:now()});}
    finally{body.destroy();}
    lastError=null;
    cacheWarning=null;
    try{await saveSnapshot(file,snapshot);}
    catch{cacheWarning='The Spellbook snapshot is available for this session; disk caching failed.';}
    return result('download');
   }catch(err){
    lastError=String(err.message||err).slice(0,240);
    retryAt=now()+5*60_000;
    return result(snapshot?'stale-cache':null);
   }
  })();
  try{return await pending;}
  finally{pending=null;}
 };
}

export const getSpellbookSnapshot=createSpellbookSnapshotStore();
