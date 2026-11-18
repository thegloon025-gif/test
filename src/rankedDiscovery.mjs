import {faces,oracleId,priceOf} from './cards.mjs';
import {fetchArchidektDeck,normalizeArchidektDeck} from './community.mjs';
import {bracketMatches,discoverPublicDecks} from './discovery.mjs';
import {sourceStructureEvidence} from './sourceQuality.mjs';
import {landScore} from './manaBaseOptimizer.mjs';
import {analyzeDiscoveryCombos} from './discoveryCombos.mjs';
import {getSpellbookSnapshot} from './spellbookSnapshot.mjs';

const round=n=>Math.round(n*100)/100;
const sourceRecord=deck=>({id:deck.sourceId,title:deck.title,url:deck.url,owner:deck.owner,edhBracket:deck.edhBracket});
const cardlistKey=deck=>JSON.stringify([deck.commanderIds,deck.mainboard.map(({id,quantity})=>[id,quantity])]);

function sourcePrice(deck,pricedById,maximum){
 let known=0,unpricedCards=0;
 for(const {id,quantity} of [...deck.commanderIds.map(id=>({id,quantity:1})),...deck.mainboard]){
  const record=pricedById.get(id),price=record?priceOf(record):null;
  if(price===null||price<0)unpricedCards+=quantity;
  else known+=price*quantity;
 }
 const knownEur=round(known);
 const budgetStatus=knownEur>maximum?'over-budget':unpricedCards?'unconfirmed':'within-budget';
 return {estimatedEur:unpricedCards?null:knownEur,knownEur,unpricedCards,budgetStatus};
}

function evaluateDeck(deck,byOracle,pricedById,maximum,spellbook){
 const commander=byOracle.get(deck.commanderIds[0]);
 const records=[commander,...deck.mainboard.map(item=>byOracle.get(item.id))];
 const structure=sourceStructureEvidence(deck,records);
 const expanded=[commander,...deck.mainboard.flatMap(item=>Array(item.quantity).fill(byOracle.get(item.id)))];
 const needsColorless=expanded.some(card=>faces(card).some(face=>/\{C\}/.test(face.mana_cost||'')));
 const mana=landScore(expanded,{commander,plan:{needsColorless}});
 const coloredGaps=Object.entries(mana.demand).flatMap(([color,pips])=>{
  if(!pips)return [];
  const target=Math.min(15,7+Math.ceil(pips/2));
  return [Math.max(0,1-mana.sources[color]/target)];
 });
 const largestGap=Math.max(0,...coloredGaps);
 const manaPenalty=round(8*largestGap+(needsColorless?Math.max(0,4-mana.realColorless):0));
 const price=sourcePrice(deck,pricedById,maximum);
 const combo=spellbook.snapshot?analyzeDiscoveryCombos(deck,byOracle,spellbook.snapshot.index,structure):null;
 const comboStatus=!combo?'unavailable':
  spellbook.status==='stale'||spellbook.snapshot.skipped>0||combo.unresolvedTemplates>0||combo.unresolvedPrerequisites>0?'partial':'checked';
 const structurePoints=round(Math.max(0,0.78*structure.score-manaPenalty));
 const budgetPoints=price.budgetStatus==='within-budget'?round(2*(1-price.knownEur/maximum)):0;
 return {...sourceRecord(deck),commander:commander.name,cardCount:deck.totalCards,...price,
  structure,mana:{sources:mana.sources,realColorless:mana.realColorless,needsColorless,penalty:manaPenalty},
  score:round(structurePoints+budgetPoints+(combo?.scoring.points??0)),
  scoreBreakdown:{structure:structurePoints,budget:budgetPoints,combos:combo?.scoring.points??null},
  combo:combo?{status:comboStatus,...combo}:{status:comboStatus,counts:null,scoring:null,details:[]}};
}

/** Read-only ranked public search. The title list is bounded and each ranked
 * source must pass exact commander, bracket and inventory verification. */
export async function rankPublicDecks({commanderId,commanderName,bracket='3+4',startPage=1,
 catalog,pricedCatalog=catalog,budgetMaximum,pricingLabel,pricingWarning=null,onProgress=()=>{},
 search=discoverPublicDecks,fetchDeck=fetchArchidektDeck,snapshot=getSpellbookSnapshot,archidektOptions={}}){
 onProgress({phase:'search'});
 const listing=await search(commanderName,{bracket,startPage,...archidektOptions});
 const byOracle=new Map(catalog.map(card=>[oracleId(card),card]));
 const pricedById=new Map(pricedCatalog.map(card=>[oracleId(card),card]));
 const uniquePreviews=[...new Map(listing.previews.map(preview=>[preview.id,preview])).values()];
 const lists=new Map(),skipped=[];
 let checked=0,duplicateDecks=listing.previews.length-uniquePreviews.length,unconfirmedBracket=0;
 let stoppedEarly=false,pendingSnapshot;
 const getSnapshot=()=>Promise.resolve().then(snapshot).catch(err=>({
  status:'unavailable',error:String(err.message||err).slice(0,240)
 }));
 for(const preview of uniquePreviews){
  onProgress({phase:'verify',checked,total:uniquePreviews.length});
  checked++;
  let deck;
  try{
   const payload=await fetchDeck(preview.id,{...archidektOptions,reuseRecent:true});
   deck=normalizeArchidektDeck(payload,preview.url,catalog);
  }catch(err){
   const reason=String(err.message||err).slice(0,180);
   skipped.push({id:preview.id,reason});
   if(/rate limit|fetch failed|timed? ?out|timeout|HTTP 5\d\d/i.test(reason)){
    stoppedEarly=checked<uniquePreviews.length;
    break;
   }
   continue;
  }
  if(deck.edhBracket===null)unconfirmedBracket++;
  if(!bracketMatches(deck.edhBracket,listing.bracket)){
   skipped.push({id:preview.id,reason:deck.edhBracket===null?'Bracket missing from deck details.':'Declared bracket is outside the search.'});
   continue;
  }
  if(!deck.validated||deck.commanderIds[0]!==commanderId){
   skipped.push({id:preview.id,reason:deck.validated?'Different commander.':deck.issues.slice(0,2).join(' ')});
   continue;
  }
  const key=cardlistKey(deck),previous=lists.get(key);
  if(previous){
   duplicateDecks++;
   previous.sources.push(sourceRecord(deck));
   continue;
  }
  lists.set(key,{deck,sources:[sourceRecord(deck)]});
  pendingSnapshot??=getSnapshot();
 }
 if(pendingSnapshot)onProgress({phase:'spellbook'});
 const spellbook=pendingSnapshot?await pendingSnapshot:{status:'not-attempted'};
 const results=[];
 for(const {deck,sources} of lists.values()){
  onProgress({phase:'score',checked:results.length,total:lists.size});
  results.push({...evaluateDeck(deck,byOracle,pricedById,budgetMaximum,spellbook),sources});
 }
 results.sort((a,b)=>b.score-a.score||b.scoreBreakdown.structure-a.scoreBreakdown.structure||
  (a.estimatedEur??Infinity)-(b.estimatedEur??Infinity)||Number(a.id)-Number(b.id));
 return {...listing,results,checked,duplicateDecks,unconfirmedBracket,skipped,stoppedEarly,
  budgetMaximum,pricingLabel,pricingWarning,
  spellbook:{status:spellbook.status,source:spellbook.source??null,error:spellbook.error??null,
   cacheWarning:spellbook.cacheWarning??null,timestamp:spellbook.snapshot?.timestamp??null,
   variants:spellbook.snapshot?.variants.length??null,skipped:spellbook.snapshot?.skipped??null}};
}
