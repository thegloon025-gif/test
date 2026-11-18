/** Bounded, user-initiated discovery of public Archidekt decks.
 * Archidekt's undocumented v3 list query appears to filter deck TITLES by name;
 * commander identity must be verified by fetching each candidate's deck details.
 * No background harvest, pagination loop, or hidden remote requests.
 */
import {fetchArchidektDeck,loadCommunity,saveCommunity,normalizeArchidektDeck,waitForArchidekt,checkArchidektRateLimit,declaredBracket} from './community.mjs';
export {declaredBracket} from './community.mjs';

const DISCOVERY_URL='https://archidekt.com/api/decks/v3/';
const CACHE_TTL=2*60*60*1000;
const PAGE_SIZE=20;
const MAX_PREVIEWS=12;
const MAX_IMPORTS=4;
const MAX_PAGES=3; // Extra bounded title-search pages only for bracket-specific requests.
export const COMBINED_BRACKETS='3+4';
function normalizeRequestedBracket(value){
 if(value==null||value==='')return null;
 if(value===COMBINED_BRACKETS)return value;
 if([2,3,4,'2','3','4'].includes(value))return Number(value);
 throw Error('Choose bracket 2, 3, 4, 3+4, or any.');
}
export function bracketMatches(actual,requested){
 return requested===null||(requested===COMBINED_BRACKETS ? actual===3||actual===4 : actual===requested);
}
const WAIT_MS=2000;
const MAX_JSON=2_000_000;
const cachedSearches=new Map();
const searchCacheKey=(url,bracket,page,limit)=>`${url}#bracket=${bracket??'any'}#page=${page}#limit=${limit}`;

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
  if(!bracketMatches(edhBracket,targetBracket))continue;
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
 const cacheKey=searchCacheKey(url,targetBracket,startPage,maxPreviews);
 const cached=cachedSearches.get(cacheKey);
 if(!forceRefresh&&cached&&now()-cached.stamp>=0&&now()-cached.stamp<(cached.value.partial?600000:CACHE_TTL))return {...cached.value,fromCache:true,cacheAgeMs:now()-cached.stamp};
 const matchesById=new Map();
 const combined=targetBracket===COMBINED_BRACKETS;
 const quota3=Math.ceil(maxPreviews/2),quota4=Math.floor(maxPreviews/2);
 let bracket3=0,bracket4=0,inspected=0,unknownBracket=0,pagesSearched=0,truncated=false,partial=false,searchError=null;
 // Deck listings are title-based. The API's search-side bracket parameter is
 // not documented, so filter actual edhBracket metadata locally rather than
 // pretending an unverified query parameter applies a server-side restriction.
 for(let page=startPage;page<=(startPage===1&&targetBracket!==null?MAX_PAGES:startPage);page++){
  try{
  const pageUrl=discoverySearchUrl(commanderName,{page});
  await waitForArchidekt({fetcher,now,minGapMs});
  const response=await fetcher(pageUrl,{method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(15000)});
  checkArchidektRateLimit(response,{fetcher,now});
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
  for(const deck of matches){
   if(matchesById.has(deck.id))continue;
   matchesById.set(deck.id,deck);
   if(deck.edhBracket===3)bracket3++;
   if(deck.edhBracket===4)bracket4++;
  }
  const hasNext=Object.hasOwn(data,'next')?data.next!==null:data.results.length>=PAGE_SIZE;
  truncated=hasNext||matchesById.size>maxPreviews;
  const enough=combined?bracket3>=quota3&&bracket4>=quota4:matchesById.size>=maxPreviews;
  if(enough||!hasNext)break;
  }catch(e){if(!pagesSearched)throw e;partial=true;truncated=true;searchError=String(e.message||e).slice(0,250);break;}
 }
 const matches=[...matchesById.values()];
 // Both brackets get a share of the detail budget even if the more popular
 // bracket fills the first page. Unused places go to the other bracket.
 const prioritized=new Set(combined?[
  ...matches.filter(d=>d.edhBracket===3).slice(0,quota3),
  ...matches.filter(d=>d.edhBracket===4).slice(0,quota4)
 ]:[]);
 for(const deck of matches){
  if(prioritized.size>=maxPreviews)break;
  prioritized.add(deck);
 }
 const previews=matches.filter(d=>prioritized.has(d));
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
 const cached=cachedSearches.get(searchCacheKey(url,targetBracket,startPage,MAX_PREVIEWS));
 if(!cached||now()-cached.stamp>=CACHE_TTL)throw Error('Search for public decks first; previews expire after two hours.');
 if(!Array.isArray(ids)||!ids.length||ids.length>MAX_IMPORTS)throw Error(`Choose between 1 and ${MAX_IMPORTS} search results to import.`);
 const allowed=new Set(cached.value.previews.map(d=>d.id));
 const uniqueIds=[...new Set(ids.map(String))];
 if(uniqueIds.length!==ids.length||uniqueIds.some(id=>!allowed.has(id)))throw Error('Import IDs must be unique and come from the current search preview.');
 const knownIds=new Set(catalog.map(c=>c.id));
 if(!knownIds.has(commanderId))throw Error('Selected commander not present in the local Scryfall catalog.');
 let decks=await loadCommunity(file);
 const added=[],skipped=[];
 for(const id of uniqueIds){
  const key=`archidekt:${id}`;
  const existing=decks.find(d=>d.key===key);
  if(existing?.validated&&existing.commanderIds.length===1&&existing.commanderIds[0]===commanderId&&bracketMatches(existing.edhBracket,targetBracket)){skipped.push({id,reason:'Already imported and verified.'});continue;}
  try{
   const payload=await fetchArchidektDeck(id,{fetcher,now,minGapMs});
   const normalized=normalizeArchidektDeck(payload,`https://archidekt.com/decks/${id}`,catalog);
   if(!normalized.validated){skipped.push({id,reason:`Deck failed validation: ${normalized.issues.slice(0,2).join(' | ')}`});continue;}
   if(!bracketMatches(normalized.edhBracket,targetBracket)){skipped.push({id,reason:`Archidekt deck bracket is ${normalized.edhBracket??'unset'}, not Bracket ${targetBracket}.`});continue;}
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
