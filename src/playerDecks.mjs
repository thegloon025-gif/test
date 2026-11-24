import {oracleId,legalFor,priceOf,isLandSlot} from './cards.mjs';
import {exportCardName,singletonName} from './deckValidation.mjs';
import {parseUpgradeDeck} from './deckUpgrader.mjs';
import {archidektTextExport} from './deckExport.mjs';
import {analysis} from './mechanics.mjs';
import {roleEvidence} from './roleEvidence.mjs';
import {architectComboReport} from './architectComboReport.mjs';
import {analyzeWinConditions,lostWinPath} from './winConditions.mjs';
import {purchaseEstimate,availableCopies} from './playerCollection.mjs';
import {goldfishTrial,sourceGrammar} from './functionalGoldfish.mjs';

export function readPlayerDeck(text,catalog,commanderId){
  const parsed=parseUpgradeDeck(text,catalog,{commanderId});
  if(parsed.errors.length||!parsed.commander)throw Error(parsed.errors.slice(0,6).join(' · ')||'Mark the commander with *CMDR*.');
  return parsed;
}
export const canonicalDeck=({commander,cards})=>['1 '+exportCardName(commander)+' *CMDR*',...cards.map(c=>'1 '+exportCardName(c))].join('\n');
const allCards=d=>[d.commander,...d.cards];
function roles(card){
  const evidence=roleEvidence(card),labels=[];
  if(isLandSlot(card))labels.push('Land');
  else if(sourceGrammar(card)||analysis(card).ramp)labels.push('Ramp');
  if(evidence.draw!=='none')labels.push('Draw');
  if(evidence.removal!=='none')labels.push('Interaction');
  if(evidence.shield!=='none')labels.push('Protection');
  return labels.length?labels:['Other'];
}
function quantities(deck){
  const result=new Map();
  for(const card of allCards(deck)){
    const id=oracleId(card),prior=result.get(id);
    result.set(id,{card,count:(prior?.count||0)+1});
  }
  return result;
}
export function inspectDeck(deck,{bracket,variants,snapshot,collection,asOf,ownedBasics=true}){
  if(![2,3,4,5].includes(bracket))throw Error('Choose a target bracket from 2 to 5.');
  const report=architectComboReport(deck,variants,snapshot),wins=analyzeWinConditions(deck,{report});
  const gameChangers=allCards(deck).filter(c=>c.game_changer).map(c=>c.name);
  const allowance=bracket===2?0:bracket===3?3:null;
  const conflicts=report.matched.filter(v=>(v.infinite||v.isInfinite)&&(bracket===2||bracket===3&&v.requiredCards<=2))
    .map(v=>({id:v.id,cards:[...new Set([...v.pieces.map(x=>x.name),...v.templateMatches])]}));
  const excess=allowance===null?0:Math.max(0,gameChangers.length-allowance);
  const text=canonicalDeck(deck);
  return {gameChangers,allowance,excess,conflicts,asOf,coverage:report.coverage,bracket,
    wins,purchase:purchaseEstimate(allCards(deck),collection,{ownedBasics}),text,archidekt:archidektTextExport(text)};
}
export function comparePlayerDecks(before,after,first,last,collection,ownedBasics=true,holdings={}){
  const a=quantities(before),b=quantities(after),stock=availableCopies(collection);
  const changes=[];
  for(const id of new Set([...a.keys(),...b.keys()])){
    const old=a.get(id),next=b.get(id),delta=(next?.count||0)-(old?.count||0);
    if(!delta)continue;
    const c=(next||old).card,groups=(delta>0?last:first).wins.groups;
    const paths=groups.filter(g=>['DIRECT WIN','CONDITIONAL FINISHER'].includes(g.classification)&&g.variants.some(v=>!v.setupGap&&v.cards.includes(c.name))).map(g=>g.name);
    const role=roles(c);
    if(paths.length)role.unshift('Win condition');
    const available=Math.max(0,(stock.get(id)||0)-(old?.count||0));
    changes.push({name:c.name,delta,roles:role,paths,reasons:roleEvidence(c).reason,text:c.oracle_text||'',unitPrice:priceOf(c),owned:Math.min(Math.max(0,delta),available)});
  }
  const lost=(x,y)=>x.wins.groups.filter(g=>lostWinPath({groups:[g]},y.wins)).map(g=>g.name);
  const avg=d=>{const spells=allCards(d).filter(c=>!isLandSlot(c));return spells.reduce((n,c)=>n+(c.cmc||0),0)/Math.max(1,spells.length);};
  const cost=purchaseEstimate(allCards(after),collection,{baseline:allCards(before),ownedBasics,holdings});
  return {changes,lost:lost(first,last),gained:lost(last,first),purchase:cost,curveDelta:Number((avg(after)-avg(before)).toFixed(2))};
}

export function previewBracket(deck,initial,ctx,{locked=[],budget}){
  const stock=availableCopies(ctx.collection);
  const blocked=new Set(locked.map(n=>singletonName({name:n})));
  const used=new Set(allCards(deck).map(singletonName));
  const cuts=deck.cards.filter(c=>!blocked.has(singletonName(c))&&(initial.excess&&c.game_changer||initial.conflicts.some(line=>line.cards.includes(c.name))));
  // Review one change at a time. Verify the entire resulting list and all matched lines.
  for(const cut of cuts){
    const job=roles(cut),candidates=ctx.catalog.filter(c=>!c.game_changer&&legalFor(c,deck.commander)&&!used.has(singletonName(c))&&priceOf(c)!==null&&isLandSlot(c)===isLandSlot(cut));
    const options=candidates.map(c=>({c,shared:roles(c).filter(r=>job.includes(r)&&r!=='Other').length,
      cost:stock.get(oracleId(c))>0?0:priceOf(c)}))
      .filter(o=>o.cost<=budget&&(o.shared||o.c.type_line===cut.type_line))
      .sort((a,b)=>b.shared-a.shared||Math.abs(a.c.cmc-cut.cmc)-Math.abs(b.c.cmc-cut.cmc)||a.cost-b.cost||a.c.name.localeCompare(b.c.name));
    for(const {c} of options.slice(0,3)){
      const cards=deck.cards.slice();cards[cards.indexOf(cut)]=c;
      const next={commander:deck.commander,cards},view=inspectDeck(next,ctx);
      if(view.excess+view.conflicts.length>=initial.excess+initial.conflicts.length)continue;
      const rows=deck.originalText.split(/\r?\n/);
      const index=rows.findIndex(row=>{const m=row.trim().match(/^1\s*x?\s+(.+)$/i);return m&&[cut.name,exportCardName(cut)].some(n=>m[1]===n||m[1].startsWith(n+' ('));});
      if(index<0)continue;
      rows[index]='1 '+exportCardName(c);
      return {cut:cut.name,add:c.name,text:rows.join('\n'),excess:view.excess,conflicts:view.conflicts.length,
        diff:comparePlayerDecks(deck,next,initial,view,ctx.collection,ctx.ownedBasics)};
    }
  }
  return null;
}
export function openingPractice(deck,params,reference){
  const {seed='practice',attempt=0,bottomIds=null,landChoices=[],firstCasts=[]}=params;
  if(typeof seed!=='string'||!seed.length||seed.length>100||!Array.isArray(landChoices)||landChoices.length>4||!Array.isArray(firstCasts)||firstCasts.length>4)throw Error('Invalid practice controls.');
  const run=goldfishTrial({...deck,seed,openingAttempt:attempt,bottomIds,landChoices,firstCasts,turns:4,referenceCards:reference?.cards});
  // Unconditional chance in a random seven before any keep decision.
  const landCount=deck.cards.filter(isLandSlot).length;
  const names=new Map(deck.cards.map(c=>[c.name,c]));
  const openingLands=run.openingSeven.filter(c=>isLandSlot(names.get(c.name)));
  const keptLandCount=openingLands.filter(c=>!run.bottomed.includes(c.id)).length;
  const choose=(n,k)=>{
    if(k<0||k>n)return 0;
    let total=1;for(let i=1;i<=k;i++)total=total*(n-i+1)/i;
    return total;
  };
  const remainingLands=landCount-openingLands.length;
  let fourthLandOdds=0;
  for(let hits=Math.max(0,4-keptLandCount);hits<=4;hits++)
    fourthLandOdds+=choose(remainingLands,hits)*choose(92-remainingLands,4-hits)/choose(92,4);
  const probability=(hits)=>1-Array.from({length:7},(_,i)=>(99-hits-i)/(99-i)).reduce((a,b)=>a*Math.max(0,b),1);
  return {opening:run.openingSeven,bottomed:run.bottomed,turns:run.observations.map(o=>({turn:o.turn,lands:o.landChoices,casts:o.castChoices,
    events:run.events.filter(e=>e.turn===o.turn).map(e=>({kind:e.kind,card:e.card})),
    mana:o.startMana.reduce((sum,s)=>sum+s.units,0)})),
    fourthLandOdds,landOdds:probability(landCount),
    rampOdds:probability(deck.cards.filter(c=>roles(c).includes('Ramp')).length)};
}
