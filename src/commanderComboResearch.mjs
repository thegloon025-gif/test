/** Bounded per-action research. Candidates never certify inventory, execution,
 * timing or wins. No background scan and no arbitrary next URLs. */
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeVariant,normalizedName} from './combos.mjs';
import {legalFor} from './cards.mjs';
import {waitForSpellbook,boundedSpellbookJSON} from './spellbookTransport.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','data','spellbook-commander-cache');
export const SPELLBOOK_VARIANTS='https://backend.commanderspellbook.com/variants/';
const TTL=86400000,PARTIAL_TTL=600000,PAGE=40,MAX_BYTES=1500000,inFlight=new Map();
const totalValid=n=>n===null||Number.isInteger(n)&&n>=0;
const firstName=n=>normalizedName(String(n).split(' // ')[0]);
export function commanderVariantQuery(name){
 const n=String(name||'').split(' // ')[0].trim();
 if(!n||n.length>130||/[\u0000-\u001f]/.test(n))throw Error('A valid commander name is required for Spellbook lookup.');
 return 'card="'+n.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'" legal:commander';
}
export function colorVariantQuery(identity){
 if(!Array.isArray(identity)||identity.some(c=>typeof c!=='string'||c.length!==1||!'WUBRG'.includes(c)))throw Error('Known commander color identity required.');
 return 'identity<='+('WUBRG'.split('').filter(c=>identity.includes(c)).join('')||'C')+' legal:commander cards<=3';
}
function pageVariants(payload,accept){
 if(!payload||typeof payload!=='object'||!Array.isArray(payload.results))throw Error('Spellbook variant search changed response shape; results are unknown.');
 if(payload.results.length>PAGE)throw Error('Spellbook response exceeded requested page size.');
 if(payload.count!=null&&!totalValid(payload.count))throw Error('Invalid Spellbook variant count.');
 let malformed=0,excluded=0;const variants=[];
 for(const entry of payload.results){const v=normalizeVariant(entry?.variant||entry);if(!v){malformed++;continue;}
  if(v.legalities?.commander!=null&&!['legal',true].includes(v.legalities.commander)||v.spoiler||!accept(v)){excluded++;continue;}variants.push(v);
 }
 if(malformed&&malformed===payload.results.length)throw Error('Spellbook variants could not be decoded; results are unknown.');
 return{variants,count:payload.count??null,malformed,excluded};
}
export function parseCommanderVariants(payload,commanderName){return pageVariants(payload,v=>v.cards.some(n=>firstName(n)===firstName(commanderName)));}
function morePages(payload,offset,query){
 if(payload.next!=null){let url;try{url=new URL(payload.next);}catch{throw Error('Invalid Spellbook pagination link.');}
  if(url.origin!==new URL(SPELLBOOK_VARIANTS).origin||url.pathname!=='/variants/'||url.searchParams.get('q')!==query||Number(url.searchParams.get('offset'))!==offset+PAGE)throw Error('Unexpected Spellbook pagination link.');
  if(!payload.results.length)throw Error('Spellbook pagination made no progress.');return true;
 }
 if(Object.hasOwn(payload,'next'))return false;
 if(payload.count!=null)return offset+payload.results.length<payload.count;
 throw Error('Spellbook pagination coverage is unknown.');
}
async function lookup({commanderId,commanderName,scope='commander-card',identity=[],catalog=[],fetcher=fetch,now=()=>Date.now(),minGapMs=2000,cacheDir=ROOT,forceRefresh=false}={}){
 if(typeof commanderId!=='string'||!commanderId)throw Error('A local commander identity is required.');
 const query=scope==='color-identity'?colorVariantQuery(identity):commanderVariantQuery(commanderName),maxPages=scope==='color-identity'?1:2;
 const hash=createHash('sha256').update(JSON.stringify({commanderId,query,version:3})).digest('hex'),filename=path.join(cacheDir,hash+'.json');
 const names=new Map();for(const c of catalog){names.set(normalizedName(c.name),c);if(!names.has(firstName(c.name)))names.set(firstName(c.name),c);}
 const commander=catalog.find(c=>c.id===commanderId)||{color_identity:identity};
 const accept=scope==='commander-card'?v=>v.cards.some(n=>firstName(n)===firstName(commanderName)):v=>{
  if(v.cards.length>3||v.cards.some(n=>firstName(n)===firstName(commanderName))||v.uses.some(u=>u.mustBeCommander))return false;
  const rawColors=Array.isArray(v.identity)?v.identity:typeof v.identity==='string'&&/^[WUBRGC]*$/.test(v.identity)?v.identity.split(''):null;
  const colors=rawColors?.every(c=>'WUBRGC'.includes(c)&&c.length===1)?rawColors.filter(c=>c!=='C'):null;
  return colors!==null&&colors.every(c=>identity.includes(c))&&v.cards.every(n=>{const c=names.get(normalizedName(n))||names.get(firstName(n));return c&&legalFor(c,commander);});
 };
 let cached=null;
 try{const c=JSON.parse(await readFile(filename,'utf8'));
  if(c.schema===3&&c.commanderId===commanderId&&c.query===query&&Number.isFinite(c.stamp)&&c.stamp>0&&c.stamp<=now()&&totalValid(c.total)&&Number.isInteger(c.pages)&&c.pages>=1&&c.pages<=maxPages&&Array.isArray(c.variants)&&c.variants.length<=PAGE*maxPages){
   const variants=c.variants.map(normalizeVariant);if(variants.every(v=>v&&accept(v)&&!v.spoiler&&(v.legalities?.commander==null||['legal',true].includes(v.legalities.commander))))cached={...c,variants};
  }
 }catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;}
 const present=(c,extra={})=>({variants:c.variants,total:c.total,truncated:c.truncated===true,partial:c.partial===true,pages:c.pages,query,scope,endpoint:SPELLBOOK_VARIANTS,fetchedAt:new Date(c.stamp).toISOString(),cacheAgeMs:Math.max(0,now()-c.stamp),...extra});
 if(cached&&!forceRefresh&&now()-cached.stamp<(cached.partial?PARTIAL_TTL:TTL))return present(cached,{fromCache:true,stale:false,networkStatus:'not-requested'});
 const unique=new Map();let total=null,pages=0,more=false,partial=false,error=null,malformed=0,excluded=0;
 try{
  for(let page=0;page<maxPages;page++){
   const url=new URL(SPELLBOOK_VARIANTS);url.searchParams.set('q',query);url.searchParams.set('limit',String(PAGE));url.searchParams.set('offset',String(page*PAGE));
   await waitForSpellbook({now,minGapMs});
   const response=await fetcher(url.toString(),{method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error(response.status===429?'Commander Spellbook rate limited the variant search.':'Commander Spellbook variant search unavailable (HTTP '+response.status+').');
   const payload=await boundedSpellbookJSON(response,MAX_BYTES),result=pageVariants(payload,accept);
   pages++;total=result.count;malformed+=result.malformed;excluded+=result.excluded;for(const v of result.variants)unique.set(v.id,v);
   more=morePages(payload,page*PAGE,query);partial||=result.malformed>0;
   if(!more)break;
  }
 }catch(e){error=String(e.message||e).slice(0,250);partial=true;
  if(!pages){if(cached)return present(cached,{fromCache:true,stale:true,networkStatus:'unavailable',error});throw e;}
 }
 const c={schema:3,stamp:now(),commanderId,query,total,pages,truncated:more||partial,partial,variants:[...unique.values()],malformed,excluded};
 await mkdir(cacheDir,{recursive:true});const temporary=filename+'.tmp-'+randomUUID();await writeFile(temporary,JSON.stringify(c));await rename(temporary,filename);
 return present(c,{fromCache:false,stale:false,networkStatus:error?'partial':'completed',error,malformed,excluded});
}
function deduplicated(options){const key=JSON.stringify([options.cacheDir||ROOT,options.commanderId,options.commanderName,options.scope||'commander-card',options.identity||[],!!options.forceRefresh]);if(inFlight.has(key))return inFlight.get(key);const pending=lookup(options).finally(()=>inFlight.delete(key));inFlight.set(key,pending);return pending;}
export function lookupCommanderVariants(options={}){return deduplicated(options);}
export function lookupColorVariants(options={}){return deduplicated({...options,scope:'color-identity'});}
