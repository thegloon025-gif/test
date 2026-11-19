import {oracleId,priceOf} from './cards.mjs';
import {parseUpgradeDeck,upgradeDeck} from './deckUpgrader.mjs';
import {applyBudgetValuation,budgetPolicy} from './budgetPolicy.mjs';
import {exportCardName} from './deckValidation.mjs';
import {analyzeDiscoveryCombos,indexDiscoveryCombos} from './discoveryCombos.mjs';
import {sourceStructureEvidence} from './sourceQuality.mjs';
import {simulateArchitectDeck,simulationSettings} from './architectSimulation.mjs';

const cents=amount=>Math.round(amount*100);
function parsedDeck(text,catalog,commanderId){
 let parsed=parseUpgradeDeck(text,catalog);
 if(parsed.needsCommander&&commanderId)parsed=parseUpgradeDeck(text,catalog,{commanderId});
 if(parsed.errors.length||!parsed.commander)throw Error(parsed.errors.slice(0,10).join(' | ')||'Mark the commander with *CMDR*.');
 if(commanderId&&oracleId(parsed.commander)!==commanderId)throw Error('The deck commander differs from the selected commander.');
 return parsed;
}
function comboReport({commander,cards},variants,snapshot){
 const quantities=new Map();
 for(const card of cards){const id=oracleId(card);quantities.set(id,(quantities.get(id)||0)+1);}
 const deck={commanderIds:[oracleId(commander)],mainboard:[...quantities].map(([id,quantity])=>({id,quantity}))};
 const catalog=[commander,...cards],byOracle=new Map(catalog.map(card=>[oracleId(card),card]));
 const index=snapshot?.index||indexDiscoveryCombos(variants);
 const result=analyzeDiscoveryCombos(deck,byOracle,index,sourceStructureEvidence(deck,catalog));
 const inventory=new Set(catalog.map(card=>card.name.toLowerCase()));
 const incomplete=(snapshot?.variants||variants).filter(variant=>{
  const uses=variant.uses||[];
  const missing=uses.filter(use=>!inventory.has(use.name.toLowerCase()));
  return uses.length>=2&&missing.length===1&&uses.some(use=>use.name.toLowerCase()===commander.name.toLowerCase());
 }).slice(0,8).map(variant=>({id:variant.id,missing:variant.uses.filter(use=>!inventory.has(use.name.toLowerCase())).map(use=>use.name)}));
 return {...result,incomplete,coverage:snapshot?'Spellbook snapshot':'Saved variants only'};
}
const deckText=({commander,cards})=>['1 '+exportCardName(commander)+' *CMDR*',...cards.map(card=>'1 '+exportCardName(card))].join('\n');

function metrics(a,b){
 const diff=(x,y)=>x===null||y===null?null:Math.round((y-x)*100)/100;
 return {
  landsTurnFour:diff(a.turns[3].lands,b.turns[3].lands),manaTurnFour:diff(a.turns[3].mana,b.turns[3].mana),
  commanderCastPct:diff(a.commanderCastPct,b.commanderCastPct),averageCommanderTurn:diff(a.averageCommanderTurn,b.averageCommanderTurn),
  extraCardsDrawn:diff(a.averageExtraCardsDrawn,b.averageExtraCardsDrawn),interactionSeenTurnFivePct:diff(a.turns[4].interactionSeenPct,b.turns[4].interactionSeenPct),
  screwPct:diff(a.screwPct,b.screwPct),floodPct:diff(a.floodPct,b.floodPct),
  linesWithModeledStartingState:diff(a.combo.filter(row=>row.startingStatePct>0).length,b.combo.filter(row=>row.startingStatePct>0).length)
 };
}
function deckDiff(original,next){
 const remaining=next.cards.slice(),cuts=[];
 for(const card of original.cards){
  const i=remaining.findIndex(c=>oracleId(c)===oracleId(card));
  if(i<0)cuts.push(card);
  else remaining.splice(i,1);
 }
 return {swaps:cuts.map((card,i)=>{
  const add=remaining[i],a=priceOf(card),b=priceOf(add);
  return {cut:card.name,add:add.name,priceChange:a===null||b===null?null:(cents(b)-cents(a))/100};
 })};
}

export function architectLab(p,{catalog,variants=[],snapshot=null}={}){
 const {trials,seed}=simulationSettings(p);
 const options={trials,seed};
 const policy=budgetPolicy(p);
 if(![3,4,5].includes(Number(p.bracket)))throw Error('Choose Bracket 3, 4 or 5 for the deck under review.');
 if(!policy.basicLandsOwned&&p.pricingMode&&p.pricingMode!=='scryfall_eur')throw Error('Count unowned basic lands with Scryfall EUR pricing.');
 const priced=applyBudgetValuation(catalog,policy);
 function analyze(parsed,bracket=Number(p.bracket)){
  const all=[parsed.commander,...parsed.cards];
  const prices=all.map(priceOf);
  const price=prices.every(value=>value!==null)?prices.reduce((total,value)=>total+cents(value),0)/100:null;
  const combos=comboReport(parsed,variants,snapshot);
  const bracketIssue=bracket===3&&all.filter(card=>card.game_changer).length>3;
  return {deck:deckText(parsed),price,withinBudget:price!==null&&price<=policy.effectiveMaximum,
   pricedCards:prices.filter(value=>value!==null).length,bracketIssue,combos:combos.counts,independentRoutes:combos.scoring.independent,
   comboCoverage:combos.coverage,incomplete:combos.incomplete,unmodeledComboRequirements:combos.unresolvedTemplates+combos.unresolvedPrerequisites,
   completeLineIds:combos.completeLineIds,result:simulateArchitectDeck({...parsed,combos:combos.details},options)};
 }
 const parsed=parsedDeck(p.text,priced,p.commanderId),original=analyze(parsed);
 const result={original,comparison:null,upgrade:null,ceiling:policy.open?null:policy.effectiveMaximum};
 if(p.comparison){
  const comparisonBracket=Number(p.comparisonBracket??p.bracket);
  if(![3,4,5].includes(comparisonBracket))throw Error('Choose a valid comparison bracket.');
  const comparison=analyze(parsedDeck(p.comparison,priced),comparisonBracket);
  result.comparison={...comparison,deltas:metrics(original.result,comparison.result)};
 }
 const recommendation=original.result;
 result.observations=[
  recommendation.screwPct>=15&&'Land drops are frequently missed in the model. Review land count and cheap land search.',
  recommendation.floodPct>=15&&'Land-heavy draws are common. Review repeatable draw and lands with useful late-game effects.',
  recommendation.rampPlayedByTurnThreePct<35&&'Early ramp is rarely deployed. Review ramp cost, fixing, and entry timing.',
  recommendation.commanderCastPct<70&&'Commander deployment is inconsistent in the modeled games. Review colored pips and acceleration.',
  recommendation.turns[4].drawSeenPct<70&&'Draw options are scarce by turn five.',
  recommendation.turns[4].interactionSeenPct<65&&'Recognized interaction is scarce by turn five.',
  recommendation.manaCurve['7+']>=8&&'The deck has at least eight spells costing seven or more mana.',
  original.unmodeledComboRequirements>0&&'Review the combo lines with unsupported setup or wildcard requirements.'
 ].filter(Boolean);
 let proposed=null,reason=null;
 if(p.proposed){
  proposed=parsedDeck(p.proposed,priced,oracleId(parsed.commander));
  reason='Architect revision guided by the prior simulation. Review any strategy trade-offs before using it.';
 }else if(p.suggest&&original.withinBudget&&!original.bracketIssue){
  const params={text:original.deck,commanderId:oracleId(parsed.commander),bracket:Number(p.bracket),budget:policy.open?100000:policy.effectiveMaximum};
  const builderPolicy={allowCompactCombosInBracket3:true};
  const review=upgradeDeck(params,priced,variants,builderPolicy);
  for(const suggestion of (review.proposals||[]).slice(0,4)){
   const proposedReview=upgradeDeck({...params,accepted:[suggestion.id]},priced,variants,builderPolicy);
   if(!proposedReview.canExport||proposedReview.proposed.value>policy.effectiveMaximum)continue;
   const candidate=parsedDeck(proposedReview.proposed.deck,priced,params.commanderId);
   const combos=comboReport(candidate,variants,snapshot);
   if(original.completeLineIds.some(id=>!combos.completeLineIds.includes(id)))continue;
   proposed=candidate;reason=suggestion.reason||'Earlier deployment of a supported mana source.';
   break;
  }
 }
 if(proposed){
  const next=analyze(proposed);
  const lostCombos=original.completeLineIds.filter(id=>!next.completeLineIds.includes(id));
  const priceChange=original.price===null||next.price===null?null:(cents(next.price)-cents(original.price))/100;
  const changes=deckDiff(parsed,proposed);
  if(p.proposed&&changes.swaps.length>3)throw Error('Review requires at most three swaps.');
  for(const swap of changes.swaps){
   if(changes.swaps.length===1){
    swap.impact=metrics(original.result,next.result);
    continue;
   }
   const cards=parsed.cards.slice();
   const cut=cards.findIndex(card=>card.name===swap.cut),add=proposed.cards.find(card=>card.name===swap.add);
   cards[cut]=add;
   const isolated=analyze({commander:parsed.commander,cards});
   swap.impact=metrics(original.result,isolated.result);
  }
  result.upgrade={...next,...changes,reason,priceChange,lostCombos,deltas:metrics(original.result,next.result),
   eligible:next.withinBudget&&!next.bracketIssue&&!lostCombos.length&&changes.swaps.length>0};
 }
 return result;
}
