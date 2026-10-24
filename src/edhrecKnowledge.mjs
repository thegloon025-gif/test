/** Local-only parser for USER-SUPPLIED EDHREC commander JSON snapshots.
 * No network calls, scraping, automated EDHREC requests, bracket/ranking merit.
 * Only structured community evidence; never certified combo or deck strength.
 */
import {createHash,randomUUID} from 'node:crypto';
import {open,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','data','edhrec-imports');
export const MAX_EDHREC_BYTES=3_000_000;
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const safe=(s,n=160)=>typeof s==='string'?s.trim().slice(0,n):'';
const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;

export function edhrecCachePath(commanderName,{directory=ROOT}={}){
 const n=safe(commanderName);
 if(typeof commanderName!=='string'||commanderName.trim().length>160)throw Error('Invalid single commander name.');
 if(!n||/[\u0000-\u001f]/.test(n))throw Error('Invalid single commander name.');
 return path.join(directory,createHash('sha256').update(norm(n)).digest('hex').slice(0,32)+'.json');
}

export function parseEdhrecCommanderJson(payload,{commanderName}={}){
 const expected=safe(commanderName);
 if(typeof commanderName!=='string'||commanderName.trim().length>160)throw Error('Invalid commander name.');
 if(!expected||/[\u0000-\u001f]/.test(expected))throw Error('Invalid commander name.');
 const root=payload?.container?.json_dict;
 const actual=safe(root?.card?.name);
 if(typeof root?.card?.name!=='string'||root.card.name.trim().length>160)throw Error('Invalid exact commander identity.');
 if(!actual)throw Error('No exact commander identity in EDHREC-style JSON.');
 if(norm(actual)!==norm(expected))throw Error('Different commander in EDHREC snapshot; import rejected.');
 const groups=root?.cardlists;
 if(!Array.isArray(groups)||!groups.length||groups.length>100)throw Error('Invalid EDHREC cardlists; coverage unknown, not zero.');
 const categories=[],all=new Map();let omitted=0,entries=0;
 if(Buffer.byteLength(JSON.stringify(payload),'utf8')>MAX_EDHREC_BYTES)throw Error('Input JSON exceeds 3MB.');
 for(const [i,g] of groups.entries()){
  if(!Array.isArray(g?.cardviews)||g.cardviews.length>1000)throw Error('Invalid EDHREC card group.');
  const name=safe(g.header||g.tag||('Group '+i),100),tag=safe(g.tag,80),cards=[],seen=new Set();
  for(const raw of g.cardviews){
   if(++entries>10000)throw Error('Too many recommendation entries.');
   const cardName=safe(raw?.name);
   if(typeof raw?.name!=='string'||raw.name.trim().length>160||/[\u0000-\u001f]/.test(cardName)){omitted++;continue;}
   if(!cardName||norm(cardName)===norm(expected)){omitted++;continue;}
   const includedDecks=count(raw.num_decks),sampleDecks=count(raw.potential_decks);
   const fraction=sampleDecks>0&&includedDecks!==null&&includedDecks<=sampleDecks?includedDecks/sampleDecks:null;
   const synergy=typeof raw.synergy==='number'&&Number.isFinite(raw.synergy)&&Math.abs(raw.synergy)<=1?raw.synergy:null;
   const card={name:cardName,category:name,tag,includedDecks,sampleDecks,inclusionFraction:fraction,synergy};
   // Retain separate observations: category/cohort statistics are not merged.
   const observation=JSON.stringify([norm(cardName),includedDecks,sampleDecks,synergy]);
   if(seen.has(observation)){omitted++;continue;}seen.add(observation);
   cards.push(card);
   const prior=all.get(norm(cardName));
   if(prior){if(!prior.categories.includes(name))prior.categories.push(name);prior.observations.push(card);}
   else all.set(norm(cardName),{name:cardName,categories:[name],observations:[card]});
  }
  categories.push({name,tag,cards});
 }
 if(!all.size)throw Error('Snapshot contains no recognizable recommendations; coverage unknown.');
 const distinctCards=[...all.values()].sort((a,b)=>norm(a.name).localeCompare(norm(b.name))).map(card=>{
  card.categories.sort();
  const signatures=new Set(card.observations.map(v=>JSON.stringify([v.includedDecks,v.sampleDecks,v.synergy])));
  return {...card,conflictingStatistics:signatures.size>1,stats:signatures.size===1?card.observations[0]:null};
 });
 return {schema:2,source:'EDHREC user-supplied snapshot',commanderName:expected,
  categories,distinctCards,cardCount:all.size,omittedEntries:omitted};
}

export async function importEdhrecCommanderJson({commanderName,payload,directory=ROOT,retrievedAt=null,now=()=>new Date().toISOString()}={}){
 const parsed=parseEdhrecCommanderJson(payload,{commanderName}),date=now();
 if(!Number.isFinite(Date.parse(date)))throw Error('Invalid import time.');
 if(retrievedAt!==null&&(!Number.isFinite(Date.parse(retrievedAt))||Date.parse(retrievedAt)>Date.parse(date)))throw Error('Invalid source retrieval date.');
 const saved={...parsed,importedAt:date,
  provenance:{source:'EDHREC-style user-provided file',retrievedAt,
   note:'Import time is not EDHREC retrieval time. Permission and accuracy are not independently verified.'}};
 const serialized=JSON.stringify(saved);
 if(Buffer.byteLength(serialized,'utf8')>MAX_EDHREC_BYTES)throw Error('Normalized import exceeds 3MB.');
 const file=edhrecCachePath(commanderName,{directory});
 await mkdir(directory,{recursive:true});
 const tmp=file+'.tmp-'+randomUUID();
 try{await writeFile(tmp,serialized,{encoding:'utf8',flag:'wx',mode:0o600});await rename(tmp,file);}
 finally{await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 return {file,saved};
}

export async function readEdhrecCommanderJson({commanderName,directory=ROOT,now=()=>Date.now()}={}){
 const file=edhrecCachePath(commanderName,{directory});
 let raw,handle;
 try{
  handle=await open(file,'r');
  // Bound the allocation as well as parsing, including a file growing after stat.
  const bytes=Buffer.alloc(MAX_EDHREC_BYTES+1);
  let used=0,n=1;while(n&&used<bytes.length){n=(await handle.read(bytes,used,bytes.length-used,null)).bytesRead;used+=n;}
  if(used>MAX_EDHREC_BYTES)throw Error('Local EDHREC import exceeds limit.');
  raw=bytes.subarray(0,used).toString('utf8');
 }catch(e){if(e.code==='ENOENT')return {status:'not-imported',source:'EDHREC local JSON',cardCount:null};throw e;}
 finally{await handle?.close();}
 const doc=JSON.parse(raw);
 if(![1,2].includes(doc.schema)||doc.source!=='EDHREC user-supplied snapshot'||norm(doc.commanderName)!==norm(commanderName)||!Array.isArray(doc.categories)||!Array.isArray(doc.distinctCards))throw Error('Invalid imported commander or schema.');
 const revalidated=parseEdhrecCommanderJson({container:{json_dict:{card:{name:doc.commanderName},
  cardlists:doc.categories.map(g=>({header:g.name,tag:g.tag,cardviews:g.cards.map(v=>({
   name:v.name,num_decks:v.includedDecks,potential_decks:v.sampleDecks,synergy:v.synergy}))}))}}},{commanderName});
 if(revalidated.cardCount!==doc.cardCount)throw Error('Imported card count mismatch.');
 // Derived distinctCards are never trusted, even in old schema-1 imports.
 const stamp=Date.parse(doc.importedAt),at=now();
 if(!Number.isFinite(stamp)||stamp>at)throw Error('Invalid import time.');
 const retrieved=doc.provenance?.retrievedAt??null;
 if(retrieved!==null&&(!Number.isFinite(Date.parse(retrieved))||Date.parse(retrieved)>stamp))throw Error('Invalid source retrieval date.');
 const ageHours=Math.round((at-stamp)/360000)/10;
 return {status:'local-import',source:doc.source,commanderName:doc.commanderName,
  importedAt:doc.importedAt,ageHours,sourceRetrievedAt:retrieved,
  sourceAgeHours:retrieved?Math.round((at-Date.parse(retrieved))/360000)/10:null,
  coverage:'unknown; user-supplied partial categories, not bracket-specific',cardCount:revalidated.cardCount,
  categories:revalidated.categories.map(g=>({name:g.name,count:new Set(g.cards.map(c=>norm(c.name))).size,observations:g.cards.length})),
  exampleOrdering:'alphabetical, not recommendation rank',
  topCards:revalidated.distinctCards.slice(0,12).map(c=>({name:c.name,categories:c.categories,
   inclusionFraction:c.stats?.inclusionFraction??null,synergy:c.stats?.synergy??null,
   conflictingStatistics:c.conflictingStatistics,observations:c.observations})),
  note:'Alphabetical examples, not ranked. Conflicting category statistics remain separate. Local observations only; no bracket, deck-power or executable-combo claim.'};
}
