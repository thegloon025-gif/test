/** Explicit, bounded, one-click community research (not a crawler or a power grader).
 * Archidekt title search is noisy. Verify deck details before admission; select
 * diverse, budget-relevant legal examples AFTER screening, not top search results.
 */
import {discoverPublicDecks} from './discovery.mjs';
import {fetchArchidektDeck,normalizeArchidektDeck,loadCommunity,saveCommunity} from './community.mjs';
import {independentCommunityDecks} from './communityKnowledge.mjs';
import {isBasic,oracleId,priceOf} from './cards.mjs';
import {sourceStructureEvidence} from './sourceQuality.mjs';

export const AUTO_RESEARCH_LIMITS=Object.freeze({maxPreviews:36,maxDetails:24,maxNew:8});
const round=n=>Math.round(n*100)/100;
const normalizeOwner=d=>String(d.owner||'').trim().toLowerCase();
const cardsOf=d=>new Set((d.mainboard||[]).filter(x=>x.quantity>0).map(x=>x.id));
const overlap=(a,b)=>{const x=cardsOf(a),y=cardsOf(b);if(x.size<8||y.size<8)return 0;let hit=0;for(const id of x)if(y.has(id))hit++;return hit/(x.size+y.size-hit);};

export function researchEvidence(deck,catalog=[],budget=null){
 const map=new Map(catalog.map(c=>[oracleId(c),c]));
 let landCount=0,knownPrice=0,unpriced=0;
 for(const x of deck.mainboard||[]){const c=map.get(x.id);if(!c)continue;
  if(/\bLand\b/i.test(c.type_line||''))landCount+=x.quantity;
  if(isBasic(c))continue;
  const price=priceOf(c);
  if(price==null||!Number.isFinite(price))unpriced+=x.quantity;
  else knownPrice+=price*x.quantity;
 }
 const structural=sourceStructureEvidence(deck,catalog);
 const manaDeviation=landCount<33?33-landCount:landCount>40?landCount-40:0;
 const validBudget=Number.isFinite(budget)&&budget>0;
 // Rough utility for ranking *examples*, not EDH power or verified price.
 let relevance=80-4*manaDeviation;
 if(validBudget){
  const ratio=knownPrice/budget;
  if(ratio>1.5)relevance-=Math.min(38,Math.log2(ratio/1.5+1)*11);
 }
 relevance-=Math.min(20,unpriced*2);
 // A source must have a credible functional skeleton, not merely similar price and land count.
 relevance+=0.40*(structural.score-65);
 return {structural,landCount,estimatedEur:round(knownPrice),unpricedCards:unpriced,relevance:round(relevance),
  note:'Scryfall EUR and structural playability proxies; NOT a measured power rating.'};
}

export function chooseResearchDecks(candidates,existing,{limit=8,catalog=[],budget=null}={}){
 if(!Number.isInteger(limit)||limit<1||limit>AUTO_RESEARCH_LIMITS.maxNew)throw Error('Unsupported research import limit.');
 const knownKeys=new Set(existing.map(d=>d.key));
 const options=candidates.filter(d=>d?.validated&& !knownKeys.has(d.key)).map(deck=>({deck,evidence:researchEvidence(deck,catalog,budget)}));
 options.sort((a,b)=>b.evidence.relevance-a.evidence.relevance||a.deck.key.localeCompare(b.deck.key));
 const selected=[],skipped=[],represented=new Set(existing.map(normalizeOwner).filter(Boolean));
 const take=(allowRepeatedOwner)=>{
  for(const opt of options){
   if(selected.length>=limit)break;
   const d=opt.deck,owner=normalizeOwner(d);
   if(selected.some(s=>s.deck.key===d.key))continue;
   if(owner&&represented.has(owner)&&!allowRepeatedOwner)continue;
   if([...existing,...selected.map(s=>s.deck)].some(x=>x.commanderIds?.[0]===d.commanderIds?.[0]&&x.edhBracket===d.edhBracket&&overlap(x,d)>=0.96)){
    skipped.push({id:d.sourceId,reason:'Near-duplicate of an existing or chosen cardlist.'});continue;
   }
   selected.push(opt);if(owner)represented.add(owner);
  }
 };
 take(false);if(selected.length<limit)take(true);
 return {selected,skipped};
}

export async function autoResearchArchidekt({commanderId,commanderName,bracket,budget=null,
 catalog=[],file,fetcher=fetch,now=()=>Date.now(),minGapMs=2000,
 search=discoverPublicDecks,fetchDeck=fetchArchidektDeck}={}){
 if(![2,3,4].includes(Number(bracket)))throw Error('Automatic research requires Bracket 2, 3 or 4.');
 const targetBracket=Number(bracket);
 if(!catalog.some(c=>oracleId(c)===commanderId))throw Error('Commander must exist in the downloaded Scryfall catalog.');
 if(budget!==null&&(!Number.isFinite(Number(budget))||Number(budget)<=0))throw Error('Choose a valid EUR budget.');
 const saved=await loadCommunity(file);
 const preview=await search(commanderName,{bracket:targetBracket,startPage:1,maxPreviews:AUTO_RESEARCH_LIMITS.maxPreviews,fetcher,now,minGapMs});
 const existingKeys=new Set(saved.map(d=>d.key)),candidates=[],skipped=[];
 let examined=0,alreadyStored=0,rateLimited=false;
 // Read only a bounded subset per deliberate click; do not harvest unseen pages.
 for(const p of (preview.previews||[]).slice(0,AUTO_RESEARCH_LIMITS.maxDetails)){
  if(existingKeys.has(`archidekt:${p.id}`)){alreadyStored++;continue;}
  examined++;
  try{
   const payload=await fetchDeck(p.id,{fetcher,now,minGapMs});
   const d=normalizeArchidektDeck(payload,p.url,catalog);
   if(!d.validated){skipped.push({id:p.id,reason:'Failed deck validation: '+d.issues.slice(0,2).join(' | ')});continue;}
   if(d.edhBracket!==targetBracket){skipped.push({id:p.id,reason:'Incorrect or missing declared bracket.'});continue;}
   if(d.commanderIds.length!==1||d.commanderIds[0]!==commanderId){skipped.push({id:p.id,reason:'Deck actually uses a different commander.'});continue;}
   candidates.push(d);
  }catch(err){
   skipped.push({id:p.id,reason:String(err.message).slice(0,180)});
   if(/rate limit|HTTP 429|HTTP 403|HTTP 401/i.test(String(err.message))){rateLimited=true;break;}
  }
 }
 const pick=chooseResearchDecks(candidates,saved,{catalog,budget:Number(budget)||null,limit:AUTO_RESEARCH_LIMITS.maxNew});
 skipped.push(...pick.skipped);
 const additions=pick.selected.map(x=>({...x.deck,research:{mode:'one-click',screen:'commander+bracket+legality+diversity+budget relevance',...x.evidence}}));
 if(additions.length)await saveCommunity([...saved,...additions],file);
 const cohort=independentCommunityDecks([...saved,...additions],{commanderId,bracket:targetBracket});
 return {added:additions.map(d=>({id:d.sourceId,title:d.title,url:d.url,owner:d.owner,landCount:d.research.landCount,estimatedEur:d.research.estimatedEur,relevance:d.research.relevance,structureScore:d.research.structural.score,earlyRamp:d.research.structural.earlyRamp})),
  examined,eligible:candidates.length,alreadyStored,skipped:skipped.slice(0,30),skippedCount:skipped.length,
  previews:preview.previews?.length||0,pagesSearched:preview.pagesSearched||0,rateLimited,
  distinctValidated:cohort.decks.length,distinctCreators:new Set(cohort.decks.map(normalizeOwner).filter(Boolean)).size,
  note:'Search is based on deck TITLES and declared Archidekt brackets. Validation and relevance screening are not EDH power checks. A matching budget estimate is not a price guarantee.'};
}
