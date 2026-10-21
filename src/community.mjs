/** Archidekt public-deck data: user-selected URLs only; never crawl/search the site. */
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {legalFor,oracleId,isCommander} from './cards.mjs';
import {analyzeCommunityKnowledge,communityClusters} from './communityKnowledge.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
export const COMMUNITY_FILE=path.join(HERE,'..','data','community-decks.json');
const DECK_RE=/^\/(?:decks|api\/decks)\/([1-9]\d{0,11})(?:\/[^/?#]*)?\/?$/;
const EXCLUDED=/^(maybeboard|sideboard|considering|consider|tokens?|extras?|outside|wishboard|attractions|stickers)$/i;
const COMMANDER=/^(commander|commanders|partner|partners)$/i;
const TTL=24*60*60*1000;
const USER_AGENT='CommanderOracleIndependent/0.9.0 (read-only public deck access)';
let lastFetch=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function parseArchidektUrl(value){
 let u;try{u=new URL(value);}catch{throw Error('Enter a public Archidekt URL such as https://archidekt.com/decks/123456/title');}
 if(u.protocol!=='https:'||!['archidekt.com','www.archidekt.com'].includes(u.hostname)||u.username||u.password||u.port)throw Error('Only https://archidekt.com/decks/<id> public URLs are accepted.');
 const m=u.pathname.match(DECK_RE);if(!m)throw Error('Archidekt deck URL must contain a numeric deck ID.');
 return {id:m[1],url:`https://archidekt.com/decks/${m[1]}`};
}

export function normalizeArchidektDeck(payload,source,cardCatalog=[]){
 if(!payload||typeof payload!=='object'||!Array.isArray(payload.cards))throw Error('Archidekt response did not contain a deck card list. Their undocumented API may have changed.');
 if(payload.cards.length>500)throw Error('Unexpected deck size; refused to import over 500 entries.');
 const parsed=parseArchidektUrl(source);
 if(payload.id!=null&&String(payload.id)!==parsed.id)throw Error('Archidekt returned a different deck ID than requested.');
 const categories=new Map();
 for(const cat of payload.categories||[])if(cat&&typeof cat.name==='string')categories.set(cat.name.trim().toLowerCase(),{included:cat.includedInDeck===true?true:cat.includedInDeck===false?false:null,premier:!!cat.isPremier});
 const byName=new Map(),byScryfallPrinting=new Map(),byOracleId=new Map();
 const normalizeName=n=>String(n||'').normalize('NFKC').replace(/[‘’]/g,"'").replace(/\s*\/\/\s*/g,' // ').replace(/\s+/g,' ').trim().toLocaleLowerCase('en');
 for(const c of cardCatalog){
  const names=[c.name,...(c.card_faces||[]).map(f=>f.name)].filter(Boolean);
  for(const n of names)byName.set(normalizeName(n),c);
  byOracleId.set(String(oracleId(c)).toLowerCase(),c);
  // Compact cards may have oracle IDs; printing UUID mapping is opportunistic.
  if(c.scryfall_id)byScryfallPrinting.set(c.scryfall_id,c);
 }
 const main=new Map(),commanders=new Map(),unknown=[],excluded=[];
 let sourceIncludedCards=0,sourceExcludedCards=0;
 for(const e of payload.cards){
  if(!e||typeof e!=='object')continue;
  const qty=Number(e.quantity??e.qty??1);
  if(!Number.isInteger(qty)||qty<1||qty>99){unknown.push({name:String(e.card?.oracleCard?.name||'?'),quantity:0,reason:'invalid quantity'});continue;}
  if(e.inDeck===false){sourceExcludedCards+=qty;excluded.push({name:e.card?.oracleCard?.name||'Unknown',quantity:qty,primary:'',reason:'not in deck'});continue;}
  const catNames=(Array.isArray(e.categories)&&e.categories.length?e.categories:(e.category?[e.category]:[])).map(x=>typeof x==='string'?x:x?.name).filter(Boolean);
  const meta=e.card||{}, oracle=meta.oracleCard||{},name=String(oracle.name||meta.name||e.name||'').trim();
  // Archidekt's first category is the PRIMARY placement. Other categories
  // may be additional user-defined tags. A secondary maybeboard/sideboard tag
  // must not discard an otherwise included main-deck card.
  const primary=(typeof e.category==='string'&&e.category.trim()?e.category.trim():catNames[0]||'');
  const defined=categories.get(primary.toLowerCase());
  // Archidekt category names are USER LABELS, not reliable zone identifiers.
  // A custom 'Tokens' category can contain ordinary cards that create tokens.
  // The API's explicit includedInDeck flag has priority over any label.
  // Apply conventional sideboard/maybeboard names ONLY if category metadata
  // doesn't state whether the category is included in the 100-card deck.
  const nonDeck=defined?.included===false||(defined?.included==null&&EXCLUDED.test(primary));
  if(nonDeck){sourceExcludedCards+=qty;excluded.push({name:name||'Unknown',quantity:qty,primary,reason:'primary category outside deck'});continue;}
  sourceIncludedCards+=qty;
  if(!name){unknown.push({name:'?',quantity:qty,primary,reason:'missing card name'});continue;}
  if(!primary){unknown.push({name,quantity:qty,primary:'',reason:'no Archidekt deck category'});continue;}
  const commanderCategory=COMMANDER.test(primary)||defined?.premier===true;
  const candidateIds=[oracle.uid,oracle.id,meta.oracleId,meta.oracle_id,meta.uid,meta.scryfallId,meta.scryfall_id].filter(Boolean);
  const c=candidateIds.map(id=>byOracleId.get(String(id).toLowerCase())||byScryfallPrinting.get(String(id))).find(Boolean)
     ||byName.get(normalizeName(name))||byName.get(normalizeName(name.split(' // ')[0]));
  if(!c){unknown.push({name,quantity:qty,primary,reason:'no matching Scryfall Oracle identity or name'});continue;}
  const dst=commanderCategory?commanders:main;
  dst.set(oracleId(c),(dst.get(oracleId(c))||0)+qty);
 }
 const commanderIds=[...commanders.keys()].sort();
 const mainboard=[...main.entries()].map(([id,quantity])=>({id,quantity})).sort((a,b)=>a.id.localeCompare(b.id));
 const matching=new Map(cardCatalog.map(c=>[oracleId(c),c]));
 const totalCards=mainboard.reduce((s,x)=>s+x.quantity,0)+[...commanders.values()].reduce((s,q)=>s+q,0);
 const issues=[];
 if(!commanderIds.length)issues.push('No commander identified in Archidekt categories.');
 if(commanderIds.length>2)issues.push('More than two commanders; partner/background rules not verified.');
 if(commanderIds.length===2)issues.push('Two-commanders deck: partner/background eligibility and combined color identity not yet verified; excluded from statistics.');
 if(!payload.categories?.length)issues.push('Missing category metadata; mainboard versus non-deck sections cannot be verified.');
 if(!cardCatalog.length)issues.push('Scryfall catalog missing: imported data cannot be verified against local card identities.');
 if(unknown.length)issues.push(`${unknown.length} unmatched or malformed card entries (${unknown.reduce((n,x)=>n+(x.quantity||0),0)} copies).`);
 if(totalCards!==100)issues.push(`${totalCards} verified cards; expected 100 including commander. Archidekt categories indicate ${sourceIncludedCards} included cards before matching.`);
 const duplicate=mainboard.filter(x=>x.quantity>1&&!/\bBasic\b/i.test(matching.get(x.id)?.type_line||''));
 if(duplicate.length)issues.push(`${duplicate.length} possible singleton violations (special exceptions not checked).`);
 if(commanderIds.length===1){
  const commander=matching.get(commanderIds[0]);
  if(commander){
   if(!isCommander(commander))issues.push('The imported commander is not recognized as a legal commander in the local catalog.');
   const invalid=mainboard.filter(x=>{const c=matching.get(x.id);return c&&!legalFor(c,commander);});
   if(invalid.length)issues.push(`${invalid.length} cards fail basic Commander color-identity/legality checks.`);
  }
 }
 const commanderNames=commanderIds.map(id=>matching.get(id)?.name||id);
 const title=String(payload.name||`Archidekt deck ${parsed.id}`).slice(0,200);
 const owner=typeof payload.owner?.username==='string'&& !payload.owner.username.includes('@')?payload.owner.username.slice(0,80):null;
 const importedAt=new Date().toISOString();
 return {
  key:`archidekt:${parsed.id}`,source:'Archidekt',sourceId:parsed.id,url:parsed.url,title,
  owner,format:payload.deckFormat?.name||payload.deckFormat||null,
  edhBracket:(Number.isInteger(Number(payload.edhBracket))&&Number(payload.edhBracket)>=1&&Number(payload.edhBracket)<=5&&payload.edhBracket!==null&&payload.edhBracket!=='')?Number(payload.edhBracket):null,
  commanderIds,commanderNames,mainboard,totalCards,sourceIncludedCards,sourceExcludedCards,
  validated:issues.length===0,issues,unmatched:unknown,excludedCount:excluded.length,excluded:excluded.slice(0,100),importedAt,
  // The source deck is attributed, never published as our own original brew.
 };
}

export async function loadCommunity(file=COMMUNITY_FILE){
 try{const doc=JSON.parse(await readFile(file,'utf8'));return Array.isArray(doc.decks)?doc.decks:[];}
 catch(e){if(e.code==='ENOENT')return [];throw e;}
}
export async function saveCommunity(decks,file=COMMUNITY_FILE){
 await mkdir(path.dirname(file),{recursive:true});
 const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify({version:1,decks},null,2));await rename(tmp,file);
}
export async function fetchArchidektDeck(id,{fetcher=fetch,now=()=>Date.now(),minGapMs=2000}={}){
 // All user input has already been converted to a numeric ID; fixed upstream host prevents SSRF.
 if(!/^[1-9]\d{0,11}$/.test(String(id)))throw Error('Invalid Archidekt ID');
 const remaining=minGapMs-(now()-lastFetch);if(remaining>0)await sleep(remaining);
 lastFetch=now();
 const response=await fetcher(`https://archidekt.com/api/decks/${id}/`,{
  method:'GET',headers:{'Accept':'application/json','User-Agent':USER_AGENT},
  redirect:'manual',signal:AbortSignal.timeout(15000)
 });
 if(response.status===429)throw Error('Archidekt rate limit reached. Please wait before trying again.');
 if(response.status===401||response.status===403||response.status===404)throw Error('Deck unavailable or not public. Only public decks are supported.');
 if(!response.ok)throw Error(`Archidekt deck fetch failed (HTTP ${response.status}).`);
 const len=Number(response.headers?.get?.('content-length'))||0;
 if(len>4_000_000)throw Error('Archidekt response exceeds 4 MB.');
 const text=await response.text();if(text.length>4_000_000)throw Error('Archidekt response exceeds 4 MB.');
 let json;try{json=JSON.parse(text);}catch{throw Error('Archidekt returned unexpected non-JSON content.');}
 return json;
}
export async function importPublicDeck(rawUrl,{catalog=[],file=COMMUNITY_FILE,fetcher=fetch,now=()=>Date.now(),forceRefresh=false}={}){
 const {id,url}=parseArchidektUrl(rawUrl);
 const decks=await loadCommunity(file);
 const prior=decks.find(d=>d.key===`archidekt:${id}`);
 if(!forceRefresh&&prior&&now()-Date.parse(prior.importedAt)<TTL)return {deck:prior,fromCache:true,deckCount:decks.length};
 const payload=await fetchArchidektDeck(id,{fetcher,now});
 const deck=normalizeArchidektDeck(payload,url,catalog);
 const next=[...decks.filter(d=>d.key!==deck.key),deck];
 await saveCommunity(next,file);
 return {deck,fromCache:false,deckCount:next.length};
}

/** v0.9 keeps the established public API while applying deduplication,
 * independent bracket cohorts, shrunk associations and transparent provenance.
 * This is intentionally NOT wired into card selection until v1.0 safeguards exist.
 */
export function communityInsights(decks,options={}){return analyzeCommunityKnowledge(decks,options);}
export function clusterDecks(decks,options={}){return communityClusters(decks,options);}
