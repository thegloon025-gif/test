import {mkdir,readFile,writeFile,rename,stat,unlink} from 'node:fs/promises';
import {createWriteStream,createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {createGunzip} from 'node:zlib';
import {StringDecoder} from 'node:string_decoder';
import readline from 'node:readline';
import path from 'node:path';
import {compact,priceOf} from './cards.mjs';
import {eligibleScryfallPrinting, maskKnownIneligibleCachePrint} from './printingEligibility.mjs';
const API='https://api.scryfall.com';
const HEADERS={'Accept':'application/json;q=0.9,*/*;q=0.8','User-Agent':'CommanderOracleIndependent/0.1 (local deckbuilder; Scryfall data cached)'};
let lastRequest=0;
async function api(resource){
 const since=Date.now()-lastRequest;if(since<130)await new Promise(r=>setTimeout(r,130-since));lastRequest=Date.now();
 const r=await fetch(API+resource,{headers:HEADERS,signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error(`Scryfall API ${r.status} while fetching ${resource}`);
 return r.json();
}
export async function remoteCommanders(query){
 if(query.trim().length<2)return [];
 const s=encodeURIComponent(`is:commander f:commander ${query.trim()}`);
 try {const x=await api(`/cards/search?q=${s}&unique=cards&order=name`);return (x.data||[]).slice(0,20).map(compact);}catch(e){if(/404/.test(e.message))return [];throw e;}
}
export const DATA_DIR=path.join(import.meta.dirname,'..','data');
export const CARD_FILE=path.join(DATA_DIR,'cards.json');
export const META_FILE=path.join(DATA_DIR,'metadata.json');
export async function loadCatalog(){try {const [cards,meta]=await Promise.all([readFile(CARD_FILE,'utf8').then(JSON.parse),readFile(META_FILE,'utf8').then(JSON.parse)]);return {cards:cards.map(maskKnownIneligibleCachePrint),meta};}catch(e){if(e.code==='ENOENT')return {cards:[],meta:null};throw e;}}
function addCard(map,raw,progress){
 if(raw?.object!=='card'||raw.legalities?.commander!=='legal'||!eligibleScryfallPrinting(raw))return;
 const c=compact(raw);if(!c.id)return;
 const old=map.get(c.id);
 if(!old){map.set(c.id,c);}
 else {
  // Keep ALL Cardmarket printing identifiers for the Oracle card, even though
  // gameplay uses one deduplicated Oracle entry. Offers are printing-specific.
  const ids=[...new Set([...(old.cardmarketIds||[]),...(c.cardmarketIds||[])])];
  if(priceOf(c)!==null&&(priceOf(old)===null||priceOf(c)<priceOf(old)))map.set(c.id,{...c,cardmarketIds:ids});
  else old.cardmarketIds=ids;
 }
 progress.parsed++;progress.unique=map.size;
}
async function parseJsonl(stream,map,progress){const rl=readline.createInterface({input:stream,crlfDelay:Infinity});for await(const line of rl){if(!line.trim())continue;addCard(map,JSON.parse(line),progress);}}
async function parseJsonArray(stream,map,progress){
 let reading=false,depth=0,quoted=false,escape=false,buffer='';const decoder=new StringDecoder('utf8');
 function processChunk(chunk){for(let i=0;i<chunk.length;i++){const ch=chunk[i];if(!reading){if(ch==='{'){reading=true;depth=1;buffer='{';quoted=false;escape=false;}continue;}
 buffer+=ch;if(quoted){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch==='"')quoted=false;}
 else{if(ch==='"')quoted=true;else if(ch==='{')depth++;else if(ch==='}')depth--;}
 if(depth===0){const raw=JSON.parse(buffer);buffer='';reading=false;addCard(map,raw,progress);}}
 }
 for await(const chunk of stream)processChunk(typeof chunk==='string'?chunk:decoder.write(chunk));
 processChunk(decoder.end());if(reading)throw Error('Incomplete Scryfall JSON array');
}
export async function parseBulkForTest(stream,format='jsonl'){const map=new Map(),progress={parsed:0,unique:0};if(format==='jsonl')await parseJsonl(stream,map,progress);else await parseJsonArray(stream,map,progress);return {cards:[...map.values()],progress};}
export async function refreshCatalog(onProgress=()=>{}){
 await mkdir(DATA_DIR,{recursive:true});const progress={phase:'metadata',bytes:0,parsed:0,unique:0};onProgress({...progress});
 const metadata=await api('/bulk-data');
 const selected=(metadata.data||[]).find(x=>x.type==='default_cards')||(metadata.data||[]).find(x=>x.type==='oracle_cards');
 if(!selected)throw Error('Scryfall bulk metadata has no default_cards/oracle_cards dataset.');
 const uri=selected.jsonl_download_uri||selected.download_uri;
 if(!uri)throw Error('Bulk metadata has no supported download URL.');
 const u=new URL(uri);
 if(u.protocol!=='https:'||!(/(^|\.)scryfall\.io$/.test(u.hostname)))throw Error('Unexpected bulk file hostname; refused download.');
 const tmp=path.join(DATA_DIR,'.download.part');
 progress.phase='downloading';onProgress({...progress});
 try{
  const r=await fetch(u,{headers:{'User-Agent':HEADERS['User-Agent']},signal:AbortSignal.timeout(600000)});
  if(!r.ok||!r.body)throw Error('Scryfall bulk download HTTP '+r.status);
  const len=Number(r.headers.get('content-length'))||0;
  const file=createWriteStream(tmp);
  let count=0;
  const progressStream=Readable.fromWeb(r.body).map(chunk=>{count+=chunk.length;if(count>900_000_000)throw Error('Bulk file exceeds safety limit (900MB)');if(count-progress.bytes>1_000_000){progress.bytes=count;progress.totalBytes=len;onProgress({...progress});}return chunk;});
  await pipeline(progressStream,file);
  progress.bytes=count;progress.totalBytes=len;progress.phase='parsing';onProgress({...progress});
  const source=createReadStream(tmp);
  const gz=u.pathname.endsWith('.gz');
  const decompressed=gz?source.pipe(createGunzip()):source;
  const map=new Map();
  if(u.pathname.includes('.jsonl'))await parseJsonl(decompressed,map,progress);
  else await parseJsonArray(decompressed,map,progress);
  if(map.size<10000)throw Error(`Bulk import yielded only ${map.size} unique cards; refused to replace current database.`);
  progress.phase='saving';onProgress({...progress});
  const cards=[...map.values()];
  const tempCards=CARD_FILE+'.tmp';await writeFile(tempCards,JSON.stringify(cards));await rename(tempCards,CARD_FILE);
  const meta={savedAt:new Date().toISOString(),updatedAt:selected.updated_at||null,source:selected.type,count:cards.length,bulkUri:uri,printingEligibilityVersion:2,pricingPolicy:'Cheapest observed English paper printing with black, white, or borderless border; excludes gold/silver/acorn, oversized and digital'};
  await writeFile(META_FILE,JSON.stringify(meta,null,2));
  progress.phase='ready';progress.unique=cards.length;onProgress({...progress});return {cards,meta};
 }finally{await unlink(tmp).catch(()=>{});}
}
