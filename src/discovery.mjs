/** Bounded, user-initiated discovery of public Archidekt decks.
 * Archidekt's undocumented v3 list query appears to filter deck TITLES by name;
 * commander identity must be verified by fetching each candidate's deck details.
 * No background harvest, pagination loop, or hidden remote requests.
 */
import {fetchArchidektDeck,loadCommunity,saveCommunity,normalizeArchidektDeck} from './community.mjs';

const DISCOVERY_URL='https://archidekt.com/api/decks/v3/';
const CACHE_TTL=2*60*60*1000;
const PAGE_SIZE=20;
const MAX_PREVIEWS=12;
const MAX_IMPORTS=4;
const MAX_PAGES=3; // Extra bounded title-search pages only for bracket-specific requests.
const normalizeRequestedBracket=value=>value==null||value===''?null:([2,3,4].includes(Number(value))?Number(value):(()=>{throw Error('Choose bracket 2, 3, 4, or any.');})());
export function declaredBracket(value){const num=Number(value);return value!==null&&value!==undefined&&value!==''&&Number.isInteger(num)&&num>=1&&num<=5?num:null;}
const WAIT_MS=2000;
const MAX_JSON=2_000_000;
const cachedSearches=new Map();
let lastSearchAt=0;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function discoverySearchUrl(commanderName,{page=1}={}){
 if(!Number.isInteger(page)||page<1||page>MAX_PAGES)throw Error('Search page outside the bounded limit.');
 const name=String(commanderName||'').split(' // ')[0].trim();
 if(!name||name.length>110||/[\u0000-\u001f]/.test(name))throw Error('Select a valid commander before searching community decks.');
 const url=new URL(DISCOVERY_URL);
 url.searchParams.set('name',name);
 url.searchParams.set('deckFormat','3');
 url.searchParams.set('pageSize',String(PAGE_SIZE));
 url.searchParams.set('page',String(page));
 url.searchParams.set('orderBy','-viewCount');
 return url.toString();
}

export function normalizeSearchResults(response,{limit=MAX_PREVIEWS,bracket=null}={}){
 const targetBracket=normalizeRequestedBracket(bracket);
 if(!response||typeof response!=='object'||!Array.isArray(response.results))throw Error('Archidekt search format changed: missing results list.');
 if(response.results.length>250)throw Error('Unexpected Archidekt results size.');
 const unique=new Set(),results=[];
 for(const deck of response.results){
  const id=String(deck?.id??'');
  if(!/^[1-9]\d{0,11}$/.test(id)||unique.has(id))continue;
  unique.add(id);
  const edhBracket=declaredBracket(deck.edhBracket);
  if(targetBracket!==null&&edhBracket!==targetBracket)continue;
  const title=String(deck.name||deck.title||'Public deck').slice(0,160);
  const owner=String(deck.owner?.username||deck.username||'').slice(0,80);
  const countValue=deck.size??deck.cardCount??deck.card_count??null;
  const cardCount=countValue==null?null:(Number.isInteger(Number(countValue))&&Number(countValue)>=0?Number(countValue):null);
  results.push({id,title,owner,cardCount,edhBracket,url:`https://archidekt.com/decks/${id}`});
  if(results.length>=limit)break;
 }
 return results;
}

export async function discoverPublicDecks(commanderName,{bracket=null,startPage=1,maxPreviews=MAX_PREVIEWS,fetcher=fetch,now=()=>Date.now(),minGapMs=WAIT_MS,forceRefresh=false}={}){
 if(!Number.isInteger(maxPreviews)||maxPreviews<1||maxPreviews>36)throw Error('Search preview count must be between 1 and 36.');
 if(!Number.isInteger(startPage)||startPage<1||startPage>MAX_PAGES)throw Error('Choose public search page 1, 2 or 3.');
 const targetBracket=normalizeRequestedBracket(bracket);
 const url=discoverySearchUrl(commanderName);
 const cacheKey=`${url}#bracket=${targetBracket??'any'}#page=${startPage}#limit=${maxPreviews}`;
 const cached=cachedSearches.get(cacheKey);
 if(!forceRefresh&&cached&&now()-cached.stamp>=0&&now()-cached.stamp<(cached.value.partial?600000:CACHE_TTL))return {...cached.value,fromCache:true,cacheAgeMs:now()-cached.stamp};
 const previews=[],seen=new Set();let inspected=0,unknownBracket=0,pagesSearched=0,truncated=false,partial=false,searchError=null;
 // Deck listings are title-based. The API's search-side bracket parameter is
 // not documented, so filter actual edhBracket metadata locally rather than
 // pretending an unverified query parameter applies a server-side restriction.
 for(let page=startPage;page<=(startPage===1&&targetBracket!==null?MAX_PAGES:startPage);page++){
  try{
  const pageUrl=discoverySearchUrl(commanderName,{page});
  const remaining=minGapMs-(now()-lastSearchAt);if(remaining>0)await pause(remaining);
  lastSearchAt=now();
  const response=await fetcher(pageUrl,{method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(response.status===429)throw Error('Archidekt rate limit reached. Please wait and try again later.');
  if(response.status===401||response.status===403)throw Error('Archidekt public search is unavailable from this connection.');
  if(!response.ok)throw Error(`Archidekt search failed (HTTP ${response.status}).`);
  const len=Number(response.headers?.get?.('content-length'))||0;
  if(len>MAX_JSON)throw Error('Archidekt search response too large.');
  const content=await response.text();if(content.length>MAX_JSON)throw Error('Archidekt search response too large.');
  let data;try{data=JSON.parse(content);}catch{throw Error('Archidekt returned non-JSON search results.');}
  if(!data||!Array.isArray(data.results))throw Error('Archidekt search format changed: missing results list.');
  pagesSearched++;
  inspected+=data.results.length;
  unknownBracket+=data.results.filter(x=>declaredBracket(x?.edhBracket)===null).length;
  const matches=normalizeSearchResults(data,{limit:PAGE_SIZE,bracket:targetBracket});
  for(const deck of matches){if(!seen.has(deck.id)){seen.add(deck.id);previews.push(deck);}if(previews.length>=maxPreviews)break;}
  const hasNext=Object.hasOwn(data,'next')?data.next!==null:data.results.length>=PAGE_SIZE;
  truncated=hasNext||previews.length>=maxPreviews&&matches.length>0;
  if(previews.length>=maxPreviews||!hasNext)break;
  }catch(e){if(!pagesSearched)throw e;partial=true;truncated=true;searchError=String(e.message||e).slice(0,250);break;}
 }
 const value={previews,bracket:targetBracket,startPage,pagesSearched,inspected,unknownBracket,truncated,partial,error:searchError,
  query:String(commanderName).split(' // ')[0],searchedAt:new Date(now()).toISOString(),
  note:'Title matches only; bracket matches use creator-declared Archidekt edhBracket metadata, not computed power. Unknown bracket decks excluded from filtered search. Commander verified on import.'};
 cachedSearches.set(cacheKey,{stamp:now(),value});
 if(cachedSearches.size>80)cachedSearches.delete(cachedSearches.keys().next().value);
 return {...value,fromCache:false,cacheAgeMs:0};
}

/** Only IDs returned by a recent bounded search can be submitted for batch import. */
export async function importDiscoveredDecks({commanderId,commanderName,bracket=null,startPage=1,ids,catalog=[],file,fetcher=fetch,now=()=>Date.now(),minGapMs=WAIT_MS}={}){
 if(!Number.isInteger(startPage)||startPage<1||startPage>MAX_PAGES)throw Error('Choose public search page 1, 2 or 3.');
 const targetBracket=normalizeRequestedBracket(bracket);
 const url=discoverySearchUrl(commanderName);
 const cached=cachedSearches.get(`${url}#bracket=${targetBracket??'any'}#page=${startPage}#limit=${MAX_PREVIEWS}`);
 if(!cached||now()-cached.stamp>=CACHE_TTL)throw Error('Search for public decks first; previews expire after two hours.');
 if(!Array.isArray(ids)||!ids.length||ids.length>MAX_IMPORTS)throw Error(`Choose between 1 and ${MAX_IMPORTS} search results to import.`);
 const allowed=new Set(cached.value.previews.map(d=>d.id));
 const uniqueIds=[...new Set(ids.map(String))];
 if(uniqueIds.length!==ids.length||uniqueIds.some(id=>!allowed.has(id)))throw Error('Import IDs must be unique and come from the current search preview.');
 const knownIds=new Set(catalog.map(c=>c.id));
 if(!knownIds.has(commanderId))throw Error('Selected commander not present in the local Scryfall catalog.');
 let decks=await loadCommunity(file);
 const added=[],skipped=[];
 // Avoid making the first detail request immediately after the listing query.
 if(minGapMs>0)await pause(minGapMs);
 for(const id of uniqueIds){
  const key=`archidekt:${id}`;
  const existing=decks.find(d=>d.key===key);
  if(existing?.validated&&existing.commanderIds.length===1&&existing.commanderIds[0]===commanderId&&(targetBracket===null||existing.edhBracket===targetBracket)){skipped.push({id,reason:'Already imported and verified.'});continue;}
  try{
   const payload=await fetchArchidektDeck(id,{fetcher,now,minGapMs});
   const normalized=normalizeArchidektDeck(payload,`https://archidekt.com/decks/${id}`,catalog);
   if(!normalized.validated){skipped.push({id,reason:`Deck failed validation: ${normalized.issues.slice(0,2).join(' | ')}`});continue;}
   if(targetBracket!==null&&normalized.edhBracket!==targetBracket){skipped.push({id,reason:`Archidekt deck bracket is ${normalized.edhBracket??'unset'}, not Bracket ${targetBracket}.`});continue;}
   if(normalized.commanderIds.length!==1||normalized.commanderIds[0]!==commanderId){skipped.push({id,reason:`Different commander: ${normalized.commanderNames.join(' + ')||'unknown'}.`});continue;}
   decks=[...decks.filter(d=>d.key!==key),normalized];added.push({id,title:normalized.title,url:normalized.url});
  }catch(e){
   if(/rate limit/i.test(e.message)){
    skipped.push({id,reason:e.message});break;
   }
   skipped.push({id,reason:e.message});
  }
 }
 if(added.length)await saveCommunity(decks,file);
 return {added,skipped,importedCount:added.length,totalStored:decks.length};
}
