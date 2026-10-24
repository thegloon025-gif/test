/** Local-only parser for USER-SUPPLIED EDHREC commander JSON snapshots.
 * No network calls, scraping, automated EDHREC requests, bracket/ranking merit.
 * Only structured community evidence; never certified combo or deck strength.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','data','edhrec-imports');
export const MAX_EDHREC_BYTES=3_000_000;
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const safe=(s,n=160)=>String(s||'').trim().slice(0,n);
const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;

export function edhrecCachePath(commanderName,{directory=ROOT}={}){
 const n=safe(commanderName);
 if(!n||/[\u0000-\u001f]/.test(n))throw Error('Invalid single commander name.');
 return path.join(directory,createHash('sha256').update(norm(n)).digest('hex').slice(0,32)+'.json');
}

export function parseEdhrecCommanderJson(payload,{commanderName}={}){
 const expected=safe(commanderName);
 if(!expected||/[\u0000-\u001f]/.test(expected))throw Error('Invalid commander name.');
 const root=payload?.container?.json_dict;
 const actual=safe(root?.card?.name);
 if(!actual)throw Error('No exact commander identity in EDHREC-style JSON.');
 if(norm(actual)!==norm(expected))throw Error('Different commander in EDHREC snapshot; import rejected.');
 const groups=root?.cardlists;
 if(!Array.isArray(groups)||!groups.length||groups.length>100)throw Error('Invalid EDHREC cardlists; coverage unknown, not zero.');
 const categories=[],all=new Map();let omitted=0;
 for(const [i,g] of groups.entries()){
  if(!Array.isArray(g?.cardviews)||g.cardviews.length>1000)throw Error('Invalid EDHREC card group.');
  const name=safe(g.header||g.tag||('Group '+i),100),tag=safe(g.tag,80),cards=[];
  for(const raw of g.cardviews){
   const cardName=safe(raw?.name);
   if(!cardName||norm(cardName)===norm(expected)){omitted++;continue;}
   const includedDecks=count(raw.num_decks),sampleDecks=count(raw.potential_decks);
   const fraction=sampleDecks>0&&includedDecks!==null&&includedDecks<=sampleDecks?includedDecks/sampleDecks:null;
   const synergy=typeof raw.synergy==='number'&&Number.isFinite(raw.synergy)&&Math.abs(raw.synergy)<=1?raw.synergy:null;
   const card={name:cardName,category:name,tag,includedDecks,sampleDecks,inclusionFraction:fraction,synergy};
   cards.push(card);
   const prior=all.get(norm(cardName));
   if(prior){if(!prior.categories.includes(name))prior.categories.push(name);}
   else all.set(norm(cardName),{name:cardName,categories:[name],stats:card});
  }
  categories.push({name,tag,cards});
 }
 if(!all.size)throw Error('Snapshot contains no recognizable recommendations; coverage unknown.');
 return {schema:1,source:'EDHREC user-supplied snapshot',commanderName:expected,
  categories,distinctCards:[...all.values()],cardCount:all.size,omittedEntries:omitted};
}

export async function importEdhrecCommanderJson({commanderName,payload,directory=ROOT,now=()=>new Date().toISOString()}={}){
 const parsed=parseEdhrecCommanderJson(payload,{commanderName}),date=now();
 if(!Number.isFinite(Date.parse(date)))throw Error('Invalid import time.');
 const saved={...parsed,importedAt:date,
  provenance:{source:'EDHREC-style user-provided file',retrievedAt:null,
   note:'Import time is not EDHREC retrieval time. Permission and accuracy are not independently verified.'}};
 const serialized=JSON.stringify(saved);
 if(Buffer.byteLength(serialized,'utf8')>MAX_EDHREC_BYTES)throw Error('Normalized import exceeds 3MB.');
 const file=edhrecCachePath(commanderName,{directory});
 await mkdir(directory,{recursive:true});
 const tmp=file+'.tmp-'+process.pid;
 await writeFile(tmp,serialized,'utf8');await rename(tmp,file);
 return {file,saved};
}

export async function readEdhrecCommanderJson({commanderName,directory=ROOT,now=()=>Date.now()}={}){
 const file=edhrecCachePath(commanderName,{directory});
 let raw;try{raw=await readFile(file,'utf8');}
 catch(e){if(e.code==='ENOENT')return {status:'not-imported',source:'EDHREC local JSON',cardCount:0};throw e;}
 if(Buffer.byteLength(raw,'utf8')>MAX_EDHREC_BYTES)throw Error('Local EDHREC import exceeds limit.');
 const doc=JSON.parse(raw);
 if(doc.schema!==1||doc.source!=='EDHREC user-supplied snapshot'||norm(doc.commanderName)!==norm(commanderName)||!Array.isArray(doc.categories)||!Array.isArray(doc.distinctCards))throw Error('Invalid imported commander or schema.');
 const revalidated=parseEdhrecCommanderJson({container:{json_dict:{card:{name:doc.commanderName},
  cardlists:doc.categories.map(g=>({header:g.name,tag:g.tag,cardviews:g.cards.map(v=>({
   name:v.name,num_decks:v.includedDecks,potential_decks:v.sampleDecks,synergy:v.synergy}))}))}}},{commanderName});
 if(revalidated.cardCount!==doc.cardCount)throw Error('Imported card count mismatch.');
 const stamp=Date.parse(doc.importedAt),ageHours=Number.isFinite(stamp)&&now()>=stamp?Math.round((now()-stamp)/360000)/10:null;
 return {status:'local-import',source:doc.source,commanderName:doc.commanderName,
  importedAt:doc.importedAt,ageHours,cardCount:doc.cardCount,
  categories:doc.categories.map(g=>({name:g.name,count:g.cards.length})),
  topCards:doc.distinctCards.slice(0,12).map(c=>({name:c.name,categories:c.categories,
   inclusionFraction:c.stats.inclusionFraction,synergy:c.stats.synergy})),
  note:'Local observations only. No automatic EDHREC requests; no bracket, deck-power or executable-combo claim.'};
}
