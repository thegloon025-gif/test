/** Bounded atomic investments in complete decks. Price is a constraint only.
 * The evidence vector describes supported functions, never a power rating.
 * A more expensive deck cannot win because of price, nor can the legacy
 * scalar score veto a strict functional improvement. No network or caches. */
import {castFaces,castHasType,castHasSubtype,isLandSlot,legalFor,oracleId,priceOf,landManaQuality} from './cards.mjs';
import {oracleText,roleEvidence,dependencyEvidence} from './roleEvidence.mjs';
import {planFor,analysis,synergy} from './mechanics.mjs';
import {landScore} from './manaBaseOptimizer.mjs';
import {singletonName,validateCommanderSingleton} from './deckValidation.mjs';
import {castabilityIssues,selectionLimits,selectionTotals} from './selectionPolicy.mjs';
import {engineContext,supportedCardAccess,strategyInfrastructure,engineManaValue} from './engineSupport.mjs';

const cost=c=>priceOf(c)??Infinity;
const sumCost=(cards,commander)=>cost(commander)+cards.reduce((n,c)=>n+cost(c),0);
const stable=(a,b)=>String(a).localeCompare(String(b));
const round=n=>Math.round(n*100)/100;
const signature=cards=>cards.map(c=>oracleId(c)).sort(stable).join('|');

/** Parse the object's own simple mana abilities, not quoted token abilities.
 * Counter/energy costs, conditional production, restricted spending and untap
 * limits cannot establish sustained output. One-shot untap-limited output is
 * recorded separately. This is capacity evidence, not a sequencing model. */
export function manaCapacity(c){
 const none={units:0,fast:0,colorless:0,fixing:0,burst:0};
 if(isLandSlot(c)||Number(c.cmc)>4)return none;
 const t=castFaces(c)[0]?.oracle_text||c.oracle_text||'';
 if(/spend this mana only|use this mana only|can't be spent|\bsuspend\b/i.test(t))return none;
 let units=0,colorless=0,fixing=0;
 for(const line of t.split('\n')){
  const manaLine=line.replace(/, Mill (?:a|one) card(?=\s*:)/i,'').replace(/:\s*Mill (?:a|one) card\.\s*Add/i,': Add');
  const m=manaLine.match(/^\s*((?:\{[^}]+\},?\s*)*\{T\})\s*:\s*Add\s+((?:\{[WUBRGC]\})+|one mana of any colou?r|two mana of any colou?r|three mana of any colou?r)([\s\S]*)/i);
  if(!m||/\bif\b|for each|equal to|only|unless|among|that a|you control|chosen/i.test(m[3].replace(/activate only as an instant\.?/ig,'')))continue;
  const payments=[...m[1].matchAll(/\{([^}]+)\}/g)].map(x=>x[1]).filter(x=>x!=='T');
  if(payments.some(x=>!/^\d+$/.test(x)))continue;
  const paid=payments.reduce((n,x)=>n+Number(x),0);
  const amount=m[2].startsWith('{')?(m[2].match(/\{/g)||[]).length:/^three/i.test(m[2])?3:/^two/i.test(m[2])?2:1;
  units=Math.max(units,amount-paid);
  colorless=Math.max(colorless,(m[2].match(/\{C\}/g)||[]).length-paid);
  if(/any colou?r/i.test(m[2]))fixing=Math.max(fixing,amount-paid);
 }
 if(/doesn't untap|does not untap/i.test(t))return {...none,burst:Math.max(0,units)};
 return {units:Math.max(0,units),fast:Number(units>0&&Number(c.cmc)<=2),colorless:Math.max(0,colorless),fixing:Math.max(0,fixing),burst:0};
}

function contextFor(cards,plan,commander){return {...engineContext(cards,plan),commander};}
function profile(c,cards,plan,context=contextFor(cards,plan)){
 const t=oracleText(c),role=roleEvidence(c),mana=manaCapacity(c);
 const {spells,creatures,relevant,tribal}=context;
 const access=supportedCardAccess(c,context);
 const support=Math.max(access.topSupport,...access.triggers.map(t=>t.support),0);
 let engine=access.supported;
 const noExtraResources=!/sacrifice|remove [^.\n]*counter|discard|only if|for each [^.\n]*you control/i.test(t);
 const drawAbilities=[];
 for(const line of t.split('\n')){
  const at=line.indexOf(':');if(at<0)continue;
  const payment=line.slice(0,at),body=line.slice(at+1).trim();
  if(!/\{T\}/.test(payment)||payment.replace(/\{(?:[0-9]+|[WUBRGCT])\}/g,'').replace(/[,\s]/g,'')!=='')continue;
  const manaPaid=[...payment.matchAll(/\{([0-9]+|[WUBRGC])\}/g)].reduce((n,m)=>n+(/^\d+$/.test(m[1])?Number(m[1]):1),0);
  if(manaPaid>2||/\bif\b|only|unless|whenever|sacrifice|discard|exile|put [^.]*on top of/i.test(body))continue;
  const selfCounter=/^put (?:a|one) \w+ counter on [^.]*, then draw [^.]*for each/i.test(body)&&
   (/counter on this (?:artifact|creature|permanent)/i.test(body)||body.toLowerCase().includes('counter on '+String(c.name).split(' // ')[0].toLowerCase()));
  if(/^draw (?:a|one|two|three|[1-9]) cards?\b/i.test(body)||selfCounter)drawAbilities.push({manaPaid,scalable:selfCounter});
 }
 const activated=drawAbilities.length>0;
 // Self-generated counters (put a burden counter, then draw) are not an
 // inventory dependency. Life/upkeep risk remains disclosed, not simulated.
 if(activated&&noExtraResources&&!/\{[3-9]\}[^\n]*:\s*draw/i.test(t))engine=true;
 if(t.split('\n').some(line=>/at the beginning of your upkeep[^.\n]*draw (?:a|one) card/i.test(line)&&!/\bif\b|unless|pay/i.test(line))&&noExtraResources)engine=true;
 const persistent=/Creature|Artifact|Enchantment|Planeswalker|Battle/.test(castFaces(c)[0]?.type_line||c.type_line||'');
 const restrictive=/you can't cast more than one spell|you can cast no more than|you can't draw more than|skip your draw step/i.test(t);
 if(!persistent||restrictive)engine=false;
 const issue=dependencyEvidence(c,cards).length;
 if(issue)engine=false;
 const independent=Number(engine&&activated&&noExtraResources);
 const freeDraw=Number(independent&&drawAbilities.some(a=>a.manaPaid===0));
 const scalable=Number(independent&&drawAbilities.some(a=>a.scalable));
 const positive=role.draw==='positive'&&noExtraResources&&(castHasType(c,'Instant')||castHasType(c,'Sorcery')||activated)&&!/\bif\b|\bunless\b|discard|when(?:ever)?|at the beginning|as an additional cost|draw X|draw that many|you and target opponent/i.test(t)&&!issue;
 const topAccess=access.topAccess;
 const reducer=persistent&&!restrictive&&/spells you cast cost[^.\n]*less|spells of the chosen type cost[^.\n]*less|creature spell you cast each turn costs[^.\n]*less/i.test(t)&&
  (relevant.some(type=>new RegExp('\\b'+type+'\\b','i').test(t))||/colorless spells|creature spell you cast each turn/i.test(t))&&tribal.length>=12;
 const copy=Number(persistent&&!restrictive&&plan.needs.some(n=>['typed-cast','target-copy'].includes(n.kind))&&/copy target triggered ability|triggered abilit[^\n]*triggers? (?:an|one) additional time|whenever you cast a colorless spell[^\n]*copy/i.test(t));
 const cascade=Number(persistent&&!restrictive&&/spells you cast with mana value (\d+) or greater have cascade/i.test(t)&&spells.filter(x=>Number(x.cmc)>=Number(t.match(/mana value (\d+) or greater have cascade/i)?.[1]||99)).length>=8);
 const delayedRemoval=/[−-]\d+:.*(?:exile|destroy)/i.test(t);
 const removal=role.removal==='broad'&&!delayedRemoval;
 const temporary=/until end of turn/i.test(t)&&!castFaces(c).some(f=>/Instant/.test(f.type_line||'')&&/hexproof|indestructible|phase/i.test(f.oracle_text||''));
 const shield=role.shield==='dedicated'&&!temporary&&!/Planeswalker/.test(c.type_line||'');
 const wideShield=/creatures you control|permanents you control/i.test(t)&&/indestructible|phase out|phases out/i.test(t);
 const threat=relevant.some(type=>castHasSubtype(c,type))&&Number(c.cmc)>=5&&/annihilator|trample|flying|when you cast|when this [^.\n]*enters|when this [^.\n]*attacks/i.test(t);
 const annihilator=threat?Math.max(0,...[...t.matchAll(/annihilator (\d+)/gi)].map(m=>Number(m[1]))):0;
 const power=threat&&Number.isFinite(Number(c.power))?Math.max(0,Number(c.power)):0;
 const protectedThreat=Number(threat&&t.split('\n').some(line=>/^\s*(?:indestructible|hexproof|ward \{[0-9]+\})(?:$|[,.])/i.test(line)));
 const castAnswer=threat&&/when you cast[^\n]*?(?:exile|destroy) (?:target|up to)/i.test(t);
 return {power,protectedThreat,independent,freeDraw,scalable,topAccess,triggerDraw:access.supported,access,copy,reducer:Number(reducer),annihilator,castAnswer:Number(castAnswer),mana,flow:Number(positive||engine||topAccess),engine:Number(engine||topAccess||reducer||cascade||copy),support,removal:Number(removal),shield:Number(shield),wideShield:Number(wideShield),threat:Number(threat),issue};
}

export function investmentEvidence(cards,commander,plan=planFor(commander),strategyFor=c=>synergy(c,plan,analysis(c))){
 const context=contextFor(cards,plan,commander),spells=context.spells,rows=spells.map(c=>profile(c,cards,plan,context));
 const total=fn=>rows.reduce((n,r)=>n+fn(r),0);
 const strategyRoles={};for(const c of spells)for(const role of strategyFor(c).roles)strategyRoles[role]=(strategyRoles[role]||0)+1;
 const infrastructure=cards.flatMap(c=>strategyInfrastructure(c,context).map(entry=>({card:c.name,...entry})));
 const strategyChannels=Object.fromEntries(['cascade','castCopy','passiveTriggerCopy','activatedTriggerCopy','costReduction','tutor'].map(kind=>['strategy_'+kind,infrastructure.filter(e=>e.kind===kind).reduce((n,e)=>n+e.units,0)]));
 const land=landScore(cards,{commander,plan});
 const vector={...strategyChannels,topAccessEngines:total(r=>Number(r.topAccess)),threatPower:rows.map(r=>r.power).sort((a,b)=>b-a).slice(0,8).reduce((n,p)=>n+p,0),threatProtection:Math.min(4,total(r=>r.protectedThreat)),independentDraw:Math.min(4,total(r=>r.independent)),freeDraw:Math.min(3,total(r=>r.freeDraw)),scalableDraw:Math.min(2,total(r=>r.scalable)),fastMana:Math.min(10,total(r=>r.mana.fast)),repeatableMana:Math.min(22,total(r=>r.mana.units)),
  fixing:Math.min(Math.max(1,(commander.color_identity||[]).length)*2,total(r=>r.mana.fixing)),
  trueColorless:plan.needsColorless?Math.min(10,total(r=>r.mana.colorless)):0,
  burstMana:Math.min(4,total(r=>r.mana.burst)),flow:Math.min(10,total(r=>r.flow)),
  supportedEngines:Math.min(6,total(r=>r.engine)),copySupport:Math.min(2,total(r=>r.copy)),answers:Math.min(8,total(r=>r.removal)),
  shields:Math.min(3,total(r=>r.shield)),wideShields:Math.min(2,total(r=>r.wideShield)),threats:Math.min(8,total(r=>r.threat)),annihilator:Math.min(16,total(r=>r.annihilator)),castAnswers:Math.min(4,total(r=>r.castAnswer))};
 return {vector,land,drawEngines:rows.map((r,i)=>({card:spells[i].name,trigger:r.triggerDraw,topAccess:r.topAccess,independent:r.independent,support:r.support,...r.access})).filter(r=>r.trigger||r.topAccess||r.independent),infrastructure,raw:{strategyRoles,repeatableMana:total(r=>r.mana.units),trueColorless:total(r=>r.mana.colorless),reducers:total(r=>r.reducer),highSpellMana:spells.filter(c=>Number(c.cmc)>=7).reduce((n,c)=>n+Number(c.cmc),0)},unsupported:rows.filter(r=>r.issue).length,
  method:'Supported function and explicit mana capacity; capped coverage, no price term, no gameplay rating or sequencing simulation'};
}
export const dominatesEvidence=(a,b)=>Object.keys(b.vector).every(k=>a.vector[k]>=b.vector[k])&&Object.keys(b.vector).some(k=>a.vector[k]>b.vector[k]);
// Across independent strategies, surplus generic coverage alone is not a
// sufficient certificate to discard a whole deck. Preserve the alternative
// for the existing scorer. This is a pruning guard, not a new merit score.
export function dominatesCandidateEvidence(a,b){
 if(!dominatesEvidence(a,b))return false;
 const capabilities=['topAccessEngines','threatPower','threatProtection','independentDraw','freeDraw','scalableDraw','annihilator','castAnswers',...Object.keys(b.vector).filter(k=>k.startsWith('strategy_'))];
 if(capabilities.some(k=>a.vector[k]>b.vector[k]))return true;
 return Object.entries({fastMana:8,flow:8,answers:7,shields:3,threats:4}).some(([key,target])=>Math.min(a.vector[key],target)>Math.min(b.vector[key],target));
}
export const functionallyBetter=dominatesCandidateEvidence;

/** Only full functional dominance overrides the existing scorer. A core-role
 * surplus alone cannot erase threats, support or another essential function.
 * Incomparable tradeoffs retain the existing scorer; cost never earns merit. */
export function selectInvestmentDeck(decks,{commander,plan=planFor(commander),score=()=>0,evidenceFor=cards=>investmentEvidence(cards,commander,plan)}={}){
 const rows=decks.map(deck=>({deck,evidence:evidenceFor(deck.cards)}));
 const frontier=rows.filter(a=>!rows.some(b=>b!==a&&(b.deck.strategy===a.deck.strategy?dominatesEvidence(b.evidence,a.evidence):dominatesCandidateEvidence(b.evidence,a.evidence))));
 frontier.sort((a,b)=>score(b.deck.cards)-score(a.deck.cards)||stable(a.deck.strategy,b.deck.strategy));
 return frontier[0]?.deck||null;
}

function combinations(items,n){if(n===0)return [[]];return items.flatMap((x,i)=>combinations(items.slice(i+1),n-1).map(xs=>[x,...xs]));}
const gained=(next,old)=>Object.fromEntries(Object.keys(old.vector).filter(k=>next.vector[k]!==old.vector[k]).map(k=>[k,next.vector[k]-old.vector[k]]));

export function refinePackageInvestments({built,pool,commander,plan=planFor(commander),budget,bracket=3,limits=selectionLimits(plan,Number(bracket)),
 source=null,startingDecks=[],protectionBaseline=built?.cards,comboViolation=()=>null,score=()=>0,packages=[],traceNames=[],maxRounds=3,beamWidth=2,maxEvaluations=40}={}){
 if(!built||built.status!=='ok')return built;
 const memo=new WeakMap(),scoreMemo=new WeakMap(),strategyMemo=new WeakMap(),manaMemo=new WeakMap();
 const manaFor=c=>{if(!manaMemo.has(c))manaMemo.set(c,manaCapacity(c));return manaMemo.get(c);};
 const strategyFor=c=>{if(!strategyMemo.has(c))strategyMemo.set(c,synergy(c,plan,analysis(c)));return strategyMemo.get(c);};
 const evidenceFor=cards=>{if(!memo.has(cards))memo.set(cards,investmentEvidence(cards,commander,plan,strategyFor));return memo.get(cards);};
 const scalar=cards=>{if(!scoreMemo.has(cards))scoreMemo.set(cards,score(cards));return scoreMemo.get(cards);};
 const original=evidenceFor(protectionBaseline||built.cards),baseCost=sumCost(built.cards,commander);
 const requireColorless=!!plan.needsColorless||(protectionBaseline||built.cards).some(c=>castFaces(c).some(f=>/\{C\}/.test(f.mana_cost||c.mana_cost||'')));
 const strategyTargets={engine:plan.needs.some(n=>n.kind==='typed-cast')?21:13,fodder:plan.needs.some(n=>n.kind==='death-tribal')?24:18,opener:10,finisher:4,payoff:8,enabler:8,outlet:6,recursion:6};
 const strategyFloors=Object.fromEntries(Object.entries(original.raw.strategyRoles).map(([role,n])=>[role,Math.min(n,strategyTargets[role]??n)]));
 const preservesStrategy=e=>Object.entries(strategyFloors).every(([role,n])=>(e.raw.strategyRoles[role]||0)>=n);
 const preservesInput=cards=>{const e=evidenceFor(cards);return preservesStrategy(e)&&Object.keys(original.vector).every(k=>e.vector[k]>=original.vector[k])&&(!requireColorless||(e.raw.trueColorless>=original.raw.trueColorless&&e.land.realColorless>=original.land.realColorless));};
 const committed=new Set((built.committedCombos||[]).flatMap(p=>p.cards||[]).map(name=>singletonName({name})));
 const sourceFloor=source?Math.min(20,built.cards.filter(c=>source.has(oracleId(c))&&!isLandSlot(c)).length):0;
 const maxGC=Number(bracket)===2?0:Number(bracket)===3?3:99;
 const report={method:'Atomic two/three-card investments plus single-card probes; Pareto functional improvements, price is only a ceiling',
  startingPrice:round(baseCost),finalPrice:round(baseCost),before:original,after:original,strategyFloors,accepted:[],evaluated:0,rejected:{},
  discovery:[],limits:{maxRounds:Math.min(4,maxRounds),beamWidth:Math.min(3,beamWidth),maxEvaluations:Math.min(64,maxEvaluations)},watch:[]};
 const reject=reason=>{report.rejected[reason]=(report.rejected[reason]||0)+1;return reason;};
 // Canonical singleton names define physical deck slots. Alternate records
 // must not consume several frontier places or buy the same function at a
 // premium solely because a reversible name sorts first.
 const named=new Map();
 for(const c of pool){if(!legalFor(c,commander)||!Number.isFinite(cost(c))||cost(c)>budget-cost(commander))continue;
  const name=singletonName(c),old=named.get(name);if(!old||cost(c)<cost(old)||cost(c)===cost(old)&&stable(c.name,old.name)<0)named.set(name,c);
 }
 const candidates=[...named.values()];
 const watch=new Map(traceNames.map(name=>[name,{card:name,price:cost(candidates.find(c=>c.name===name)||{}),reasons:{},considered:0}]));
 const record=(adds,reason)=>{reject(reason);for(const c of adds){const w=watch.get(c.name);if(w){w.reasons[reason]=(w.reasons[reason]||0)+1;}}};
 let beam=[...new Map([built,...startingDecks].map(deck=>[signature(deck.cards),{...deck,price:round(sumCost(deck.cards,commander)),originPrice:round(sumCost(deck.cards,commander)),originCards:deck.cards,atomic:[]}])).values()];
 let all=beam.slice();const seen=new Set(beam.map(deck=>signature(deck.cards)));
 for(let roundIndex=0;roundIndex<report.limits.maxRounds;roundIndex++){
  const expanded=[];
  for(const state of beam){
   const current=evidenceFor(state.cards),owned=new Set([singletonName(commander),...state.cards.map(singletonName)]);
   const context=contextFor(state.cards,plan);
   const available=candidates.filter(c=>!isLandSlot(c)&&!owned.has(singletonName(c))).map(card=>({card,p:profile(card,state.cards,plan,context)}));
   const profiles=new Map(available.map(x=>[x.card,x.p]));
   const order=(a,b)=>b.p.freeDraw-a.p.freeDraw||b.p.scalable-a.p.scalable||b.p.independent-a.p.independent||b.p.engine-a.p.engine||b.p.flow-a.p.flow||b.p.support-a.p.support||Number(a.card.cmc)-Number(b.card.cmc)||stable(a.card.name,b.card.name);
   const manaOptions=available.filter(x=>x.p.mana.units||x.p.mana.burst);
   const manaOrder=(a,b)=>b.p.mana.units-a.p.mana.units||b.p.mana.fast-a.p.mana.fast||Number(a.card.cmc)-Number(b.card.cmc)||stable(a.card.name,b.card.name);
   const mana=[...new Map([
    ...manaOptions.slice().sort(manaOrder).slice(0,3),
    ...manaOptions.filter(x=>x.p.mana.fast).sort((a,b)=>b.p.mana.fixing-a.p.mana.fixing||manaOrder(a,b)).slice(0,2),
    ...manaOptions.filter(x=>x.p.mana.fixing).sort((a,b)=>b.p.mana.fixing-a.p.mana.fixing||manaOrder(a,b)).slice(0,2),
    ...manaOptions.filter(x=>x.p.mana.burst).sort((a,b)=>b.p.mana.burst-a.p.mana.burst||Number(a.card.cmc)-Number(b.card.cmc)||stable(a.card.name,b.card.name)).slice(0,1)
   ].map(x=>[x.card,x])).values()];
   // Reserve places for supported triggers and top-library access; free tap
   // abilities must not consume every draw slot. Feasible colored engines
   // receive a probe as well as alternatives needing a land-repair package.
   const drawOrder=(a,b)=>engineManaValue(a.card)-engineManaValue(b.card)||b.p.support-a.p.support||stable(a.card.name,b.card.name);
   const draw=[...new Map([
    ...available.filter(x=>x.p.independent).sort(order).slice(0,2),
    ...available.filter(x=>x.p.triggerDraw&&x.p.access.triggers.some(t=>t.kind==='cast')).sort((a,b)=>b.p.support-a.p.support||drawOrder(a,b)).slice(0,1),
    ...available.filter(x=>x.p.triggerDraw&&x.p.access.triggers.some(t=>t.kind==='cast')).sort(drawOrder).slice(0,1),
    ...available.filter(x=>x.p.triggerDraw&&x.p.access.triggers.some(t=>t.kind==='entry'&&t.tribal)).sort((a,b)=>b.p.support-a.p.support||drawOrder(a,b)).slice(0,1),
    ...available.filter(x=>x.p.triggerDraw&&x.p.access.triggers.some(t=>t.kind==='entry'&&!t.tribal)).sort((a,b)=>b.p.support-a.p.support||drawOrder(a,b)).slice(0,1),
    ...available.filter(x=>x.p.topAccess).sort(drawOrder).slice(0,2),
    ...available.filter(x=>x.p.flow&&!castabilityIssues(x.card,state.cards.filter(isLandSlot)).length).sort(drawOrder).slice(0,2)
   ].map(x=>[singletonName(x.card),x])).values()];
   report.discovery.push({round:roundIndex+1,origin:state.budgetInvestment?.searchMode||state.strategy,price:state.price,
    draw:draw.map(x=>({card:x.card.name,price:cost(x.card),support:x.p.support,trigger:x.p.triggerDraw,topAccess:x.p.topAccess,independent:x.p.independent,castability:castabilityIssues(x.card,state.cards.filter(isLandSlot))}))});
   const support=available.filter(x=>x.p.engine||x.p.threat).sort((a,b)=>b.p.annihilator-a.p.annihilator||b.p.castAnswer-a.p.castAnswer||order(a,b)).slice(0,4);
   const additions=[...new Map([...mana,...draw,...support].map(x=>[singletonName(x.card),x.card])).values()];
   for(const w of watch.values())if(!owned.has(singletonName({name:w.card}))&&!additions.some(c=>c.name===w.card))w.reasons['outside functional frontier']=(w.reasons['outside functional frontier']||0)+1;
   const rankedCuts=state.cards.filter(c=>!isLandSlot(c)&&!committed.has(singletonName(c))).map(card=>({card,p:profile(card,state.cards,plan,context),impact:synergy(card,plan,analysis(card)).impact}))
    .sort((a,b)=>Number(b.p.issue)-Number(a.p.issue)||
     (a.p.mana.units+a.p.flow+a.p.engine+a.p.removal+a.p.shield+a.p.threat)-(b.p.mana.units+b.p.flow+b.p.engine+b.p.removal+b.p.shield+b.p.threat)||
     a.impact-b.impact||Number(b.card.cmc)-Number(a.card.cmc)||stable(a.card.name,b.card.name)).map(x=>x.card);
   const cuts=[...new Set([...rankedCuts.slice(0,4),...rankedCuts.slice().sort((a,b)=>cost(b)-cost(a)||stable(a.name,b.name)).slice(0,2),...rankedCuts.slice(4,6)])];
   const landAdds=candidates.filter(c=>isLandSlot(c)&&!owned.has(singletonName(c))).filter(c=>{const m=landManaQuality(c);return !m.restricted&&!m.needsActivationPayment&&!m.unusable&&!m.consumable;}).sort((a,b)=>landManaQuality(b).colors.length-landManaQuality(a).colors.length||Number(landManaQuality(a).entersTapped)-Number(landManaQuality(b).entersTapped)||stable(a.name,b.name)).slice(0,3);
   const sortedLandCuts=state.cards.filter(isLandSlot).sort((a,b)=>landManaQuality(a).colors.length-landManaQuality(b).colors.length||Number(landManaQuality(b).entersTapped)-Number(landManaQuality(a).entersTapped)||stable(a.name,b.name));
   const landCuts=[...new Set([sortedLandCuts[0],sortedLandCuts.find(c=>!landManaQuality(c).canC)])].filter(Boolean);
   const proposals=[];
   function propose(add,remove,label='functional complement'){
    if(add.length!==remove.length||new Set(add.map(singletonName)).size!==add.length)return;
    const price=sumCost(state.cards,commander)+add.reduce((n,c)=>n+cost(c),0)-remove.reduce((n,c)=>n+cost(c),0);
    if(price>budget+1e-7){record(add,'budget');return;}
    const removal=new Set(remove),cards=[...state.cards.filter(c=>!removal.has(c)),...add];
    // Reject cheap, certain failures before limiting outgoing alternatives per
    // incoming bundle. Otherwise two invalid cuts can hide a valid third cut.
    if(requireColorless&&cards.reduce((n,c)=>n+manaFor(c).colorless,0)<original.raw.trueColorless){record(add,'mana base/demand');return;}
    const sourceLimit=Math.max(Number(bracket)===4?13:Number(bracket)===3?12:10,state.cards.filter(c=>manaFor(c).units>0).length);
    if(cards.filter(c=>manaFor(c).units>0).length>sourceLimit){record(add,'ramp overprovision');return;}
    const key=signature(cards);if(seen.has(key))return;
    // Cheap ranking schedules promising complete packages, not per-card merit.
    const approx=add.map(c=>profiles.get(c)||profile(c,state.cards,plan,context));
    const rough=approx.reduce((n,p)=>n+p.mana.units+p.flow+p.engine+p.threat+p.annihilator+p.castAnswer,0);
    proposals.push({add,remove,cards,key,price,label,rough});
   }
   for(const add of additions)for(const cut of cuts)propose([add],[cut]);
   for(const pair of combinations(additions,2))for(const pairCuts of combinations(cuts.slice(0,6),2))propose(pair,pairCuts);
   const tripleAdds=[...new Set([mana[0]?.card,mana[1]?.card,...mana.filter(x=>x.p.mana.fast).slice(0,2).map(x=>x.card),draw[0]?.card,draw[1]?.card,support[0]?.card].filter(Boolean))];
   for(const triple of combinations(tripleAdds,3))for(const tripleCuts of combinations(cuts.slice(0,5),3))propose(triple,tripleCuts);
   for(const m of mana.slice(0,3))for(const d of draw.slice(0,3)){if(m.card===d.card)continue;for(const remove of combinations(cuts.slice(0,6),2))for(const land of landAdds)for(const cutLand of landCuts)propose([m.card,d.card,land],[...remove,cutLand],'spell/mana-base package');}
   const byName=new Map(candidates.map(c=>[c.name,c]));
   for(const pkg of packages.slice(0,8)){
    const add=(pkg.cards||[]).map(c=>typeof c==='string'?byName.get(c):c).filter(c=>c&&!owned.has(singletonName(c)));
    if(add.length<2||add.length>3)continue;
    for(const remove of combinations(cuts.slice(0,6),add.length))propose(add,remove,pkg.id||'source package');
   }
   proposals.sort((a,b)=>b.rough-a.rough||stable(a.add.map(c=>c.name).join('|'),b.add.map(c=>c.name).join('|')));
   // Keep different incoming packages instead of spending every evaluation on
   // many outgoing permutations of one high-ranked bundle.
   const scheduled=[],perBundle=new Map(),buckets=new Map();
   for(const p of proposals){
    const key=p.add.map(singletonName).sort(stable).join('|'),n=perBundle.get(key)||0;if(n>=2)continue;
    perBundle.set(key,n+1);const kind=p.label+':'+p.add.length;
    if(!buckets.has(kind))buckets.set(kind,[]);buckets.get(kind).push(p);
   }
   const singles=buckets.get('functional complement:1')||[];
   const singleSeen=new Set();for(let i=0;i<singles.length&&scheduled.length<report.limits.maxEvaluations;i++){const p=singles[i],name=singletonName(p.add[0]);if(singleSeen.has(name))continue;singleSeen.add(name);scheduled.push(p);singles.splice(i--,1);}
   while(scheduled.length<report.limits.maxEvaluations){let changed=false;for(const bucket of buckets.values()){
    if(bucket.length){scheduled.push(bucket.shift());changed=true;if(scheduled.length>=report.limits.maxEvaluations)break;}
   }if(!changed)break;}
   const prior=new Map(state.cards.map(c=>[c,dependencyEvidence(c,state.cards)]));
   for(const p of scheduled){
    report.evaluated++;seen.add(p.key);for(const c of p.add){const w=watch.get(c.name);if(w)w.considered++;}
    const fail=reason=>record(p.add,reason),lands=p.cards.filter(isLandSlot);
    if(p.remove.some(c=>{const m=manaFor(c);return m.fast&&m.units>=2&&p.cards.filter(x=>{const n=manaFor(x);return n.fast&&n.units>=m.units;}).length<state.cards.filter(x=>{const n=manaFor(x);return n.fast&&n.units>=m.units;}).length;})){fail('high-output early mana');continue;}
    const maxSources=Math.max(Number(bracket)===4?13:Number(bracket)===3?12:10,state.cards.filter(c=>manaFor(c).units>0).length);
    if(p.cards.filter(c=>manaFor(c).units>0).length>maxSources){fail('ramp overprovision');continue;}
    if(p.remove.some(c=>committed.has(singletonName(c)))){fail('committed combo');continue;}
    if(p.cards.length!==99||!validateCommanderSingleton(commander,p.cards).valid){fail('singleton/count');continue;}
    if(p.cards.filter(c=>c.game_changer).length+Number(!!commander.game_changer)>maxGC){fail('game changers');continue;}
    if(p.add.some(c=>!legalFor(c,commander)||castabilityIssues(c,lands).length)){fail('legality/castability');continue;}
    if(source&&p.cards.filter(c=>!isLandSlot(c)&&source.has(oracleId(c))).length<sourceFloor){fail('source spine');continue;}
    const totals=selectionTotals(p.cards);
    if(totals.instants>limits.maxInstants||totals.counters>limits.maxCounters||totals.narrow>limits.maxNarrow){fail('response limits');continue;}
    if(comboViolation(p.cards,commander)){fail('bracket combo inventory');continue;}
    if(p.cards.some(c=>{const issues=dependencyEvidence(c,p.cards),old=prior.get(c)||[];return issues.length>old.length||issues.some((s,i)=>{const n=s.match(/\d+/),b=old[i]?.match(/\d+/);return n&&b&&Number(n[0])<Number(b[0]);});})){fail('support dependency');continue;}
    const evidence=evidenceFor(p.cards);
    if(!preservesStrategy(evidence)){fail('commander strategy role floor');continue;}
    const progress=e=>({vector:{...e.vector,fastMana:Math.min(e.vector.fastMana,original.vector.fastMana)}});
    if(requireColorless&&(evidence.land.realColorless<original.land.realColorless||evidence.raw.trueColorless<original.raw.trueColorless)||evidence.land.score<current.land.score-1e-7){fail('mana base/demand');continue;}
    if(evidence.raw.highSpellMana>current.raw.highSpellMana&&evidence.raw.repeatableMana<=current.raw.repeatableMana&&evidence.raw.reducers<=current.raw.reducers){fail('high-curve investment needs mana partner');continue;}
    if(!dominatesEvidence(progress(evidence),progress(current))){fail('no complete functional dominance');continue;}
    const entry={label:p.label,cuts:p.remove.map(c=>c.name),adds:p.add.map(c=>c.name),extraCost:round(p.price-sumCost(state.cards,commander)),changes:gained(evidence,current)};
    expanded.push({...state,cards:p.cards,price:round(p.price),atomic:[...state.atomic,entry]});
    for(const c of p.add){const w=watch.get(c.name);if(w){w.reasons.accepted=(w.reasons.accepted||0)+1;}}
   }
  }
  if(!expanded.length)break;
  all.push(...expanded);
  const frontier=expanded.filter(a=>!expanded.some(b=>a!==b&&dominatesEvidence(evidenceFor(b.cards),evidenceFor(a.cards))));
  frontier.sort((a,b)=>scalar(b.cards)-scalar(a.cards)||stable(signature(a.cards),signature(b.cards)));
  const champions=[
   frontier.slice().sort((a,b)=>evidenceFor(b.cards).vector.flow-evidenceFor(a.cards).vector.flow||scalar(b.cards)-scalar(a.cards))[0],
   frontier.slice().sort((a,b)=>evidenceFor(b.cards).vector.repeatableMana-evidenceFor(a.cards).vector.repeatableMana||scalar(b.cards)-scalar(a.cards))[0],
   selectInvestmentDeck(frontier,{commander,plan,score:scalar,evidenceFor})
  ].filter(Boolean);
  beam=[...new Map(champions.concat(frontier).map(deck=>[signature(deck.cards),deck])).values()].slice(0,report.limits.beamWidth);
 }
 const selected=selectInvestmentDeck(all.filter(deck=>preservesInput(deck.cards)),{commander,plan,score:scalar,evidenceFor});
 report.finalPrice=selected.price;report.after=evidenceFor(selected.cards);report.originPrice=selected.originPrice;report.startingPrice=selected.originPrice;report.before=evidenceFor(selected.originCards);report.protectedInput=original;report.originPath=selected.budgetInvestment?.searchMode||selected.strategy;report.accepted=selected.atomic;
 report.watch=[...watch.values()].map(w=>({...w,selected:selected.cards.some(c=>c.name===w.card)}));
 const {atomic,originPrice,originCards,...deck}=selected;return {...deck,packageInvestment:report};
}
