/** Provenance-preserving local library of variants actually returned by Spellbook.
 * Generated decks read this on disk; they do not contact Spellbook. */
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeVariant} from './combos.mjs';
let writes=Promise.resolve();
const DEFAULT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','data','combo-library.json');
export async function readComboLibrary(file=DEFAULT){
 try{
  const json=JSON.parse(await readFile(file,'utf8'));
  if(json?.schema!==1||!Array.isArray(json?.entries))throw Error('Unsupported combo-library schema.');
  return json.entries.filter(e=>typeof e.commanderId==='string'&&Array.isArray(e.variants)&&e.source==='Commander Spellbook')
   .map(e=>({...e,variants:e.variants.map(normalizeVariant).filter(Boolean)}));
 }catch(e){if(e.code==='ENOENT')return [];throw e;}
}
export function recordSpellbookVariants(commanderId,normalized,options={}){
 const pending=writes.then(()=>writeVariants(commanderId,normalized,options));writes=pending.catch(()=>{});return pending;
}
async function writeVariants(commanderId,normalized,{file=DEFAULT,now=()=>new Date().toISOString(),provenance=null}={}){
 if(typeof commanderId!=='string'||!commanderId||!Array.isArray(normalized?.included)||!Array.isArray(normalized?.near))throw Error('Only verified normalized Spellbook responses can be recorded.');
 const entries=await readComboLibrary(file);
 const existing=entries.find(e=>e.commanderId===commanderId),prior=existing?.variants||[];
 const incoming=provenance?.scope==='color-identity'?[]:[...normalized.near,...normalized.included];
 const variants=[...new Map([...prior,...incoming].map(v=>[v.id,v])).values()].filter(v=>v&&/^\d+(?:(?:-\d+)|(?:--\d+))*$/.test(v.id)).slice(-1000);
 const updated=entries.filter(e=>e.commanderId!==commanderId);
 const research=[...(existing?.research||[])];
 if(provenance){
  if(!['commander-card','color-identity','deck-inventory'].includes(provenance.scope)||typeof provenance.query!=='string'||typeof provenance.fetchedAt!=='string')throw Error('Invalid Spellbook research provenance.');
  const event={scope:provenance.scope,query:provenance.query.slice(0,300),fetchedAt:provenance.fetchedAt,endpoint:provenance.scope==='deck-inventory'?'https://backend.commanderspellbook.com/find-my-combos':'https://backend.commanderspellbook.com/variants/',partial:provenance.partial===true,truncated:provenance.truncated===true,variantIds:[...new Set([...normalized.included,...normalized.near].map(v=>v.id))].slice(0,120)};
  const key=x=>JSON.stringify([x.scope,x.query,x.fetchedAt]);if(!research.some(x=>key(x)===key(event)))research.push(event);
 }
 const colorCandidates=provenance?.scope==='color-identity'?[...new Map([...(existing?.colorCandidates||[]),...normalized.near,...normalized.included].map(v=>[v.id,v])).values()].slice(-40):existing?.colorCandidates;
 updated.push({...existing,...(colorCandidates?{colorCandidates}:{}),commanderId,source:'Commander Spellbook',updatedAt:now(),variants,...(research.length?{research:research.slice(-16)}:{})});
 await mkdir(path.dirname(file),{recursive:true});
 const tmp=file+'.tmp-'+process.pid;
 await writeFile(tmp,JSON.stringify({schema:1,entries:updated}));await rename(tmp,file);
 return variants.length;
}

/** Repair an older combo library from the exact saved, on-demand Spellbook
 * responses for locally VERIFIED imports. No network requests are made.
 * The hash must match a validated 100-card list; a random cached response is
 * never attributed to a different commander.
 */
export async function repairComboLibraryFromCache(decks,catalog,{file=DEFAULT,cacheDir=path.join(path.dirname(DEFAULT),'spellbook-cache')}={}){
 const {createHash}=await import('node:crypto');
 const {spellbookRequest,normalizeFindResponse}=await import('./combos.mjs');
 const stats={checked:0,cacheHits:0,added:0,errors:[]};
 if(!Array.isArray(decks)||!Array.isArray(catalog)||!catalog.length)return stats;
 for(const deck of decks.slice(0,100)){
  if(!deck?.validated||deck.totalCards!==100||deck.commanderIds?.length!==1)continue;
  stats.checked++;
  try{
   const request=spellbookRequest(deck,catalog);
   const hash=createHash('sha256').update(JSON.stringify(request)).digest('hex');
   let raw;
   try{raw=await readFile(path.join(cacheDir,hash+'.json'),'utf8');}
   catch(e){if(e.code==='ENOENT')continue;throw e;}
   if(raw.length>3_000_000)throw Error('Oversized cached response');
   const cached=JSON.parse(raw);
   if(!Number.isFinite(cached.stamp)||cached.stamp<=0)throw Error('Unstamped response');
   const normalized=normalizeFindResponse(cached.response);
   stats.cacheHits++;
   const old=(await readComboLibrary(file)).find(e=>e.commanderId===deck.commanderIds[0])?.variants.length||0;
   const n=await recordSpellbookVariants(deck.commanderIds[0],normalized,{file});
   stats.added+=Math.max(0,n-old);
  }catch(e){stats.errors.push(`${deck.key||'saved deck'}: ${e.message}`);}
 }
 return stats;
}
