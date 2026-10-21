/** Provenance-preserving local library of variants actually returned by Spellbook.
 * Generated decks read this on disk; they do not contact Spellbook. */
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeVariant} from './combos.mjs';
const DEFAULT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','data','combo-library.json');
export async function readComboLibrary(file=DEFAULT){
 try{
  const json=JSON.parse(await readFile(file,'utf8'));
  if(json?.schema!==1||!Array.isArray(json?.entries))throw Error('Unsupported combo-library schema.');
  return json.entries.filter(e=>typeof e.commanderId==='string'&&Array.isArray(e.variants)&&e.source==='Commander Spellbook')
   .map(e=>({...e,variants:e.variants.map(normalizeVariant).filter(Boolean)}));
 }catch(e){if(e.code==='ENOENT')return [];throw e;}
}
export async function recordSpellbookVariants(commanderId,normalized,{file=DEFAULT,now=()=>new Date().toISOString()}={}){
 if(typeof commanderId!=='string'||!commanderId||!Array.isArray(normalized?.included)||!Array.isArray(normalized?.near))throw Error('Only verified normalized Spellbook responses can be recorded.');
 const entries=await readComboLibrary(file);
 const prior=entries.find(e=>e.commanderId===commanderId)?.variants||[];
 const variants=[...new Map([...prior,...normalized.near,...normalized.included].map(v=>[v.id,v])).values()].filter(v=>v&&/^\d+(?:(?:-\d+)|(?:--\d+))*$/.test(v.id)).slice(-1000);
 const updated=entries.filter(e=>e.commanderId!==commanderId);
 updated.push({commanderId,source:'Commander Spellbook',updatedAt:now(),variants});
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
