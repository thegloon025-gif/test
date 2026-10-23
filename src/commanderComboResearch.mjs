/** On-demand, bounded commander-centric Spellbook discovery independent of imports.
 * A matching variant is a combo CANDIDATE, not a present/executable combo.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeVariant,normalizedName} from './combos.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','data','spellbook-commander-cache');
const ENDPOINT='https://backend.commanderspellbook.com/variants/';
const TTL=24*60*60*1000, PAGE=40, MAX_PAGES=2, MAX_BYTES=1_500_000;
let lastRequest=0;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function commanderVariantQuery(name){
 const n=String(name||'').split(' // ')[0].trim();
 if(!n||n.length>130||/[\u0000-\u001f]/.test(n))throw Error('A valid commander name is required for Spellbook lookup.');
 return 'card="'+n.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'" legal:commander';
}
export function parseCommanderVariants(payload,commanderName){
 if(!payload||typeof payload!=='object'||!Array.isArray(payload.results))throw Error('Spellbook variant search changed response shape; results are unknown.');
 if(payload.results.length>PAGE)throw Error('Spellbook response exceeded requested page size.');
 if(payload.count!=null&&(!Number.isInteger(payload.count)||payload.count<0))throw Error('Invalid Spellbook variant count.');
 const target=normalizedName(String(commanderName).split(' // ')[0]);
 const results=[];
 for(const entry of payload.results){
  const v=normalizeVariant(entry?.variant||entry);
  if(!v)continue;
  if(!v.cards.some(name=>normalizedName(String(name).split(' // ')[0])===target))continue;
  if(v.legalities?.commander!=null&&!['legal',true].includes(v.legalities.commander))continue;
  results.push(v);
 }
 return {variants:results,count:payload.count??payload.results.length};
}
export async function lookupCommanderVariants({commanderId,commanderName,fetcher=fetch,now=()=>Date.now(),minGapMs=2000,cacheDir=ROOT,forceRefresh=false}={}){
 if(typeof commanderId!=='string'||!commanderId)throw Error('A local commander identity is required.');
 const query=commanderVariantQuery(commanderName);
 const hash=createHash('sha256').update(JSON.stringify({commanderId,query,version:1})).digest('hex');
 const filename=path.join(cacheDir,hash+'.json');
 if(!forceRefresh){
  try{
   const cached=JSON.parse(await readFile(filename,'utf8'));
   if(cached.schema===1&&Number.isFinite(cached.stamp)&&now()-cached.stamp>=0&&now()-cached.stamp<TTL){
    if(!Array.isArray(cached.variants)||!Number.isInteger(cached.total))throw Error('Invalid cached Spellbook commander query.');
    const variants=cached.variants.map(normalizeVariant).filter(Boolean);
    return {variants,total:cached.total,truncated:cached.truncated===true,fromCache:true,query,pages:cached.pages};
   }
  }catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;}
 }
 const unique=new Map();let total=0,pages=0;
 for(let page=0;page<MAX_PAGES;page++){
  const url=new URL(ENDPOINT);
  url.searchParams.set('q',query);
  url.searchParams.set('limit',String(PAGE));
  url.searchParams.set('offset',String(page*PAGE));
  const remaining=minGapMs-(now()-lastRequest);if(remaining>0)await pause(remaining);
  lastRequest=now();
  const response=await fetcher(url.toString(),{method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(20000)});
  if(response.status===429)throw Error('Commander Spellbook rate limited the commander search.');
  if(response.status===401||response.status===403)throw Error('Commander Spellbook rejected public commander search.');
  if(!response.ok)throw Error('Commander Spellbook variant search failed (HTTP '+response.status+').');
  const length=Number(response.headers?.get?.('content-length'))||0;
  if(length>MAX_BYTES)throw Error('Spellbook commander search response is too large.');
  const raw=await response.text();if(raw.length>MAX_BYTES)throw Error('Spellbook commander search response is too large.');
  let payload;try{payload=JSON.parse(raw);}catch{throw Error('Spellbook returned invalid JSON for commander search.');}
  const result=parseCommanderVariants(payload,commanderName);
  pages++;total=result.count;
  for(const variant of result.variants)unique.set(variant.id,variant);
  if(payload.results.length<PAGE||page*PAGE+PAGE>=total)break;
 }
 const variants=[...unique.values()];
 const result={variants,total,truncated:total>PAGE*pages,fromCache:false,query,pages};
 await mkdir(cacheDir,{recursive:true});
 const temporary=filename+'.tmp-'+process.pid;
 await writeFile(temporary,JSON.stringify({schema:1,stamp:now(),commanderId,query,total,pages,truncated:result.truncated,variants}));
 await rename(temporary,filename);
 return result;
}
