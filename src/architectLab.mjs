import {oracleId,priceOf} from './cards.mjs';
import {deckConstraintErrors,parseUpgradeDeck,upgradeDeck} from './deckUpgrader.mjs';
import {applyBudgetValuation,budgetPolicy} from './budgetPolicy.mjs';
import {exportCardName} from './deckValidation.mjs';
import {architectComboReport} from './architectComboReport.mjs';
import {analyzeWinConditions,assemblyQueries,lostWinPath} from './winConditions.mjs';
import {simulateArchitectSample,simulationSettings} from './architectSimulation.mjs';
import {assessArchitectRevision} from './architectRevisionEvidence.mjs';
import {architectManaEvidence} from './aiArchitect.mjs';

const cents=amount=>Math.round(amount*100);
function parsedDeck(text,catalog,commanderId){
 let parsed=parseUpgradeDeck(text,catalog);
 if(parsed.needsCommander&&commanderId)parsed=parseUpgradeDeck(text,catalog,{commanderId});
 if(parsed.errors.length||!parsed.commander)throw Error(parsed.errors.slice(0,10).join(' | ')||'Mark the commander with *CMDR*.');
 if(commanderId&&oracleId(parsed.commander)!==commanderId)throw Error('The deck commander differs from the selected commander.');
 return parsed;
}
const deckText=({commander,cards})=>['1 '+exportCardName(commander)+' *CMDR*',...cards.map(card=>'1 '+exportCardName(card))].join('\n');

function metrics(a,b){
 const diff=(x,y)=>x===null||y===null?null:Math.round((y-x)*100)/100;
 return {
  landsTurnFour:diff(a.turns[3].lands,b.turns[3].lands),manaTurnFour:diff(a.turns[3].mana,b.turns[3].mana),
  commanderCastPct:diff(a.commanderCastPct,b.commanderCastPct),averageCommanderTurn:diff(a.averageCommanderTurn,b.averageCommanderTurn),
  averageManaAfterCommander:diff(a.averageManaAfterCommander,b.averageManaAfterCommander),
  extraCardsDrawn:diff(a.averageExtraCardsDrawn,b.averageExtraCardsDrawn),drawSeenTurnFivePct:diff(a.turns[4].drawSeenPct,b.turns[4].drawSeenPct),
  interactionSeenTurnFivePct:diff(a.turns[4].interactionSeenPct,b.turns[4].interactionSeenPct),
  rampPlayedByTurnThreePct:diff(a.rampPlayedByTurnThreePct,b.rampPlayedByTurnThreePct),
  keptTwoToFourLandsPct:diff(a.opening.twoToFourLandsPct,b.opening.twoToFourLandsPct),
  averageKeptLands:diff(a.opening.averageLands,b.opening.averageLands),averageMulligans:diff(a.opening.averageMulligans,b.opening.averageMulligans),
  screwPct:diff(a.screwPct,b.screwPct),floodPct:diff(a.floodPct,b.floodPct),
  linesWithModeledStartingState:diff(a.combo.filter(row=>row.startingStatePct>0).length,b.combo.filter(row=>row.startingStatePct>0).length),
  highManaValueSpells:diff(a.manaCurve['7+'],b.manaCurve['7+'])
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
 const bracket=Number(p.bracket);
 const policy=budgetPolicy(p);
 if(![3,4,5].includes(bracket))throw Error('Choose Bracket 3, 4 or 5 for the deck under review.');
 if(!policy.basicLandsOwned&&p.pricingMode&&p.pricingMode!=='scryfall_eur')throw Error('Count unowned basic lands with Scryfall EUR pricing.');
 const priced=applyBudgetValuation(catalog,policy);
 function analyze(parsed,targetBracket=bracket,referenceCards){
  const all=[parsed.commander,...parsed.cards];
  const prices=all.map(priceOf);
  const price=prices.every(value=>value!==null)?prices.reduce((total,value)=>total+cents(value),0)/100:null;
  const combos=architectComboReport(parsed,variants,snapshot);
  const winConditions=analyzeWinConditions(parsed,{report:combos});
  const queries=assemblyQueries(winConditions,parsed);
  const baseLines=new Map();
  for(const group of winConditions.groups)for(const variant of group.variants){
   if(variant.variantId&&variant.source==='Commander Spellbook'&&!variant.family?.startsWith('conversion:'))
    baseLines.set(variant.variantId,variant.classification);
  }
  const classified=combos.details.map(line=>({...line,classification:baseLines.get(line.id)}));
  const bracketIssue=targetBracket===3&&all.filter(card=>card.game_changer).length>3;
  const {result,runs}=simulateArchitectSample({...parsed,combos:classified,assembly:queries.map(q=>q.choices)},{trials,seed,referenceCards});
  queries.forEach(({group},i)=>{
   const row=group.variants.length===1&&result.combo.find(c=>c.id===group.variants[0].variantId&&
    c.pieces.length===group.variants[0].cards.length&&c.pieces.every(n=>group.variants[0].cards.includes(n)));
   group.simulation={trials,turn:result.turnLimit,piecesSeenPct:result.assemblyPct[i],startingStatePct:row?.startingStatePct??null,execution:'Not modeled'};
  });
  return {runs,view:{winConditions,deck:deckText(parsed),price,withinBudget:price!==null&&price<=policy.effectiveMaximum,
   pricedCards:prices.filter(value=>value!==null).length,bracketIssue,combos:{...combos.counts,
    documentedDirectOutcomes:combos.counts.directWins,directWins:winConditions.groups.filter(g=>g.classification==='DIRECT WIN').length},
   independentRoutes:winConditions.independent.length,
   comboCoverage:combos.coverage,incomplete:combos.incomplete,unmodeledComboRequirements:combos.unresolvedTemplates+combos.unresolvedPrerequisites,
   completeLineIds:combos.completeLineIds,result}};
 }
 const parsed=parsedDeck(p.text,priced,p.commanderId);
 const {view:original,runs:originalRuns}=analyze(parsed);
 const result={original,comparison:null,upgrade:null,ceiling:policy.open?null:policy.effectiveMaximum};
 if(p.comparison){
  const comparisonBracket=Number(p.comparisonBracket??p.bracket);
  if(![3,4,5].includes(comparisonBracket))throw Error('Choose a valid comparison bracket.');
  const {view:comparison}=analyze(parsedDeck(p.comparison,priced),comparisonBracket,parsed.cards);
  result.comparison={...comparison,deltas:metrics(original.result,comparison.result)};
 }
 const recommendation=original.result;
 result.observations=[
  ...original.winConditions.findings,
  recommendation.screwPct>=15&&'Land drops are frequently missed in the model. Review land count and cheap land search.',
  recommendation.floodPct>=15&&'Land-heavy draws are common. Review repeatable draw and lands with useful late-game effects.',
  recommendation.rampPlayedByTurnThreePct<35&&'Early ramp is rarely deployed. Review ramp cost, fixing, and entry timing.',
  recommendation.commanderCastPct<70&&'Commander deployment is inconsistent in the modeled games. Review colored pips and acceleration.',
  recommendation.turns[4].drawSeenPct<70&&'Draw options are scarce by turn five.',
  recommendation.turns[4].interactionSeenPct<65&&'Recognized interaction is scarce by turn five.',
  recommendation.manaCurve['7+']>=8&&'The deck has at least eight spells costing seven or more mana.',
  original.unmodeledComboRequirements>0&&'Review the combo lines with unsupported setup or wildcard requirements.'
 ].filter(Boolean);
 const builderPolicy={allowCompactCombosInBracket3:true};
 function preview(proposed,reason){
  const changes=deckDiff(parsed,proposed);
  if(changes.swaps.length>3)throw Error('Review requires at most three swaps.');
  const {view:next,runs}=analyze(proposed,bracket,parsed.cards);
  const lostCombos=original.completeLineIds.filter(id=>!next.completeLineIds.includes(id));
  const priceChange=original.price===null||next.price===null?null:(cents(next.price)-cents(original.price))/100;
  const assessment=assessArchitectRevision(originalRuns,runs);
  const issues=deckConstraintErrors(proposed.commander,proposed.cards,{bracket,catalog:priced,variants,...builderPolicy});
  if(!next.withinBudget)issues.push('The candidate needs a fully priced list within the selected budget.');
  const lostFinish=lostWinPath(original.winConditions,next.winConditions);
  if(lostFinish)issues.push('The candidate loses a recognized finish: '+lostFinish.name+'.');
  if(lostCombos.length)issues.push('The candidate loses a documented combo already in the deck.');
  if(!changes.swaps.length)issues.push('The candidate has the same cards as the original.');
  if(!issues.length&&assessment.status==='supported'){
   const payment=architectManaEvidence(proposed.commander,proposed.cards);
   if(payment.commanderPayment!=='supported'||payment.extraCopyPayment?.status==='unknown')
    issues.push('The candidate lacks a verified commander payment or follow-up mana channel.');
  }
  return {...next,...changes,reason,priceChange,lostCombos,deltas:metrics(original.result,next.result),
   assessment:{...assessment,issues,status:issues.length?'blocked':assessment.status},
   eligible:!issues.length&&assessment.status==='supported'};
 }
 let proposed;
 if(p.proposed){
  proposed=parsedDeck(p.proposed,priced,oracleId(parsed.commander));
  result.upgrade=preview(proposed,'Architect revision guided by the prior simulation.');
 }else if(p.suggest&&original.withinBudget&&!original.bracketIssue){
  const params={text:original.deck,commanderId:oracleId(parsed.commander),bracket,budget:policy.open?100000:policy.effectiveMaximum};
  const review=upgradeDeck(params,priced,variants,builderPolicy);
  for(const suggestion of (review.proposals||[]).slice(0,4)){
   const proposedReview=upgradeDeck({...params,accepted:[suggestion.id]},priced,variants,builderPolicy);
   if(!proposedReview.canExport||proposedReview.proposed.value>policy.effectiveMaximum)continue;
   const candidate=parsedDeck(proposedReview.proposed.deck,priced,params.commanderId);
   const upgrade=preview(candidate,suggestion.reason||'Earlier deployment of a supported mana source.');
   if(upgrade.eligible){
    proposed=candidate;
    result.upgrade=upgrade;
    break;
   }
  }
  if(!result.upgrade)result.revisionNotice='Kept the original deck. The local search found no clear upgrade in this sample.';
 }
 if(result.upgrade){
  const {swaps,deltas}=result.upgrade;
  for(const swap of swaps){
   if(swaps.length===1){swap.impact=deltas;continue;}
   const cards=parsed.cards.slice();
   const cut=cards.findIndex(card=>card.name===swap.cut),add=proposed.cards.find(card=>card.name===swap.add);
   cards[cut]=add;
   const {view:isolated}=analyze({commander:parsed.commander,cards},bracket,parsed.cards);
   swap.impact=metrics(original.result,isolated.result);
  }
 }
 return result;
}
