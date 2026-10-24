/** v1.1 independent strategy-first deck construction.
 * Unlike the legacy constructor, candidates begin from a source-deck skeleton
 * or a local strategic archetype and independently select spells AND lands.
 * Source frequency is an observation, never a win-rate or power assertion.
 */
import {COLORS,castFaces,isLandSlot,isBasic,legalFor,priceOf,oracleId,landManaQuality,trueColorlessSource} from './cards.mjs';
import {planFor,analysis,synergy} from './mechanics.mjs';
import {manaRole,landAccess} from './deckQuality.mjs';
import {roleEvidence,dependencyEvidence} from './roleEvidence.mjs';
import {castabilityIssues,selectionLimits,createSelectionLimitChecker} from './selectionPolicy.mjs';
import {singletonName,validateCommanderSingleton} from './deckValidation.mjs';
import {independentCommunityDecks} from './communityKnowledge.mjs';
import {landScore} from './manaBaseOptimizer.mjs';
import {templatePredicate} from './comboTemplates.mjs';
import {normalizedName} from './combos.mjs';
import {sourceStructureEvidence} from './sourceQuality.mjs';
import {strategyExecution,executionDominates} from './strategyExecution.mjs';
import {refinePackageInvestments,selectInvestmentDeck,investmentEvidence,dominatesCandidateEvidence} from './packageInvestment.mjs';
import {tempoEvidence,drawAccess,sustainedEarlyMana} from './playabilityEvidence.mjs';

import {strategyRelations,distinctStrategy,refinementCohort,discoverStrategyPlans,guardNativeRefinement} from './strategyRelations.mjs';

const INVESTMENT_STARTS=Symbol('investment starting decks');
const basics={W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest',C:'Wastes'};
const round=n=>Math.round(n*100)/100;
const byName=(a,b)=>a.name.localeCompare(b.name);
const stable=(a,b)=>String(a).localeCompare(String(b));
const cost=c=>priceOf(c)??Infinity;
const hasType=(c,t)=>String(c.type_line||'').includes(t);
const pips=c=>{const tally={W:0,U:0,B:0,R:0,G:0};for(const face of castFaces(c).slice(0,1))for(const m of (face.mana_cost||c.mana_cost||'').matchAll(/\{([^}]+)\}/g))for(const x of m[1].split('/'))if(x in tally)tally[x]++;return tally;};
const sum=(items,key)=>items.reduce((n,c)=>n+(typeof key==='function'?key(c):c[key]||0),0);
const cardSignature=c=>singletonName(c);


/** Fail-closed bracket policy for *inventory-complete* known infinites.
 * The original proposal filter only prevented SELECTING compact packages;
 * source-template construction can incidentally collect both components.
 * This is not official bracket certification or an execution oracle.
 */
export function conservativeComboViolation(cards,commander,variants=[],bracket=3){
 if(Number(bracket)===4||!variants.length)return null;
 const pool=[commander,...cards],byName=new Map(pool.map(c=>[normalizedName(c.name),c]));
 for(const v of variants){
  if(!v?.isInfinite||v.spoiler||v.legalities?.commander===false)continue;
  const required=(v.uses||[]).reduce((n,u)=>n+(Number(u.quantity)||1),0)+(v.templateRequirements||[]).reduce((n,u)=>n+(Number(u.quantity)||1),0);
  if(Number(bracket)===3&&required>=3)continue;
  const reserved=new Set();let matching=true;
  for(const use of v.uses||[]){
   const c=byName.get(normalizedName(use.name));if(!c||Number(use.quantity)!==1){matching=false;break;}
   if(use.mustBeCommander&&oracleId(c)!==oracleId(commander)){matching=false;break;}
   reserved.add(oracleId(c));
  }
  if(!matching)continue;
  for(const req of v.templateRequirements||[]){
   const pred=templatePredicate(req);let count=0;
   if(!pred){matching=false;break;}
   for(const c of pool)if(!reserved.has(oracleId(c))&&pred(c)){count++;reserved.add(oracleId(c));if(count>=req.quantity)break;}
   if(count<req.quantity){matching=false;break;}
  }
  if(matching)return {id:v.id,rule:Number(bracket)===2?'B2 no recorded infinite inventory':'B3 no compact recorded infinite inventory'};
 }
 return null;
}

function dedupeCatalog(cards,commander){
 const table=new Map();
 for(const c of cards){if(!legalFor(c,commander)||!Number.isFinite(cost(c)))continue;
  const id=oracleId(c),existing=table.get(id);
  if(!existing||cost(c)<cost(existing))table.set(id,c);
 }
 return [...table.values()];
}
function cardFacts(card,plan){
 const a=analysis(card),s=synergy(card,plan,a),role=roleEvidence(card),mana=manaRole(card),cmc=Number(card.cmc)||0;
 return {card,a,s,role,mana,cmc,primary:s.impact>=4,
  earlyOutput:sustainedEarlyMana(card),ramp:mana.effective&&cmc<=3,efficientRamp:mana.effective&&cmc<=2,
  draw:role.draw==='positive'||role.draw==='engine-conditional',
  answer:role.removal==='broad'||role.removal==='conditional',
  broad:role.removal==='broad',shield:role.shield==='dedicated',
  late:cmc>=7};
}
const styles=[
 {id:'engine',label:'Engine and synergy',engine:1.5,curve:1.1,template:0.9,finish:0.7},
 {id:'tempo',label:'Efficient tempo',engine:1.0,curve:2.0,template:0.8,finish:0.45},
 {id:'resilience',label:'Card advantage and resilience',engine:1.1,curve:1.3,template:0.9,finish:0.5},
 {id:'threats',label:'High-impact threats',engine:1.35,curve:0.85,template:0.8,finish:1.1}
];

function merit(f,style,context={}){
 const {card:c,cmc,s,role,mana}=f;
 const template=context.source?.has(oracleId(c))||context.source?.has(cardSignature(c));
 let value=style.engine*s.impact*3.0+style.template*(template?48:0);
 value-=Math.max(0,cmc-2)*style.curve*3.5;
 value-=Math.log1p(cost(c))*3.2;
 if(f.ramp)value+=cmc<=2?40:12;
 if(f.draw)value+=role.draw==='positive'?31:Math.round(14*drawAccess(c));
 if(f.broad)value+=32;
 if(f.answer&&!f.broad)value+=6;
 if(f.shield)value+=28;
 if(f.primary)value+=12;
 if(s.roles.includes('payoff'))value+=9;
 if(s.roles.includes('finisher'))value+=style.finish*11;
 if(f.late)value-=7;
 if(mana.kind==='powerstone'||mana.kind==='restricted')value-=18;
 // Situational 3-MV fixing / expensive card drawing is not counted as free value.
 if(f.ramp&&cmc>=3)value-=15;
 if(role.draw==='cantrip-or-conditional')value-=12;
 if(role.removal==='conditional'&&!f.primary)value-=12;
 if(!f.primary&&!f.ramp&&!f.draw&&!f.broad&&!f.shield)value-=18;
 if(context.style==='resilience'&&(f.draw||f.shield))value+=14;
 if(context.style==='tempo'&&cmc<=2)value+=8;
 if(context.style==='threats'&&f.s.roles.includes('finisher'))value+=10;
 return value;
}

/** Candidates from DISTINCT source lists, not merely the most frequent pair.
 * No foreign commander, unvalidated list, or mismatched bracket contributes.
 */
function candidatePlans(communityDecks,commander,bracket,enabled,requested,catalog=[]){
 const candidates=[];
 if(enabled){
  const cohort=independentCommunityDecks(communityDecks||[],{commanderId:oracleId(commander),bracket:Number(bracket)}).decks;
  const ownerCount=new Set(cohort.map(d=>String(d.owner||'').toLowerCase()).filter(Boolean)).size;
  if(cohort.length>=3&&ownerCount>=2){
   const ordered=cohort.slice().sort((a,b)=>sourceStructureEvidence(b,catalog).score-sourceStructureEvidence(a,catalog).score||stable(a.key,b.key));
   // Selected community archetype narrows the first source, but alternatives
   // remain available so a poor source is not forced into the final deck.
   const preferred=new Set(requested?.selected?.sourceDecks||[]);
   // Stable sort preserves structural ordering within each preference group.
   ordered.sort((a,b)=>Number(preferred.has(b.key))-Number(preferred.has(a.key)));
   const chosen=[];
   for(const deck of ordered){
    const bag=new Set((deck.mainboard||[]).filter(x=>Number(x.quantity)>0).map(x=>String(x.id)));
    const overlap=chosen.map(x=>{const intersection=[...bag].filter(id=>x.bag.has(id)).length;return intersection/Math.max(1,Math.min(bag.size,x.bag.size));});
    if(overlap.some(n=>n>.80))continue;
    chosen.push({deck,bag});if(chosen.length>=3)break;
   }
   for(const {deck,bag} of chosen)candidates.push({id:`source:${deck.key}`,label:`Adapt ${deck.title||deck.key}`,sourceKey:deck.key,source:bag,style:styles[0]});
  }
 }
 for(const style of styles)candidates.push({id:`local:${style.id}`,label:style.label,sourceKey:null,source:null,style});
 return candidates;
}

function buildOne({pool,commander,plan,bracket,budget,profile,entry,limits,commanderPrice,preferredCombos=[]}){
 const fitsSelectionLimits=createSelectionLimitChecker();
 const facts=pool.filter(c=>!isLandSlot(c)).map(c=>cardFacts(c,plan));
 const sorted=facts.map(f=>({...f,merit:merit(f,entry.style,{source:entry.source,style:entry.style.id})}))
   .sort((a,b)=>b.merit-a.merit||byName(a.card,b.card));
 const landPool=pool.filter(isLandSlot).sort(byName);
 const basicMap=new Map(landPool.filter(isBasic).map(c=>[c.name,c]));
 const colors=(commander.color_identity||[]).filter(c=>COLORS.includes(c));
 for(const name of (colors.length?colors:['C']).map(c=>basics[c]))if(!basicMap.has(name))return {status:'missing-basic',strategy:entry.id};
 if(plan.needsColorless&&!basicMap.has('Wastes'))return {status:'missing-wastes',strategy:entry.id};
 const landTarget=profile.lands+(colors.length>=4?1:0),spellTarget=99-landTarget;
 const usedNames=new Set([cardSignature(commander)]),selected=[],landSelected=[];
 let spent=commanderPrice,gc=commander.game_changer?1:0;
 const maxGc=profile.maxGameChangers;
 // The source is a COMPLETE structural template. The candidate uses its mainboard
 // for BOTH spells and lands; the downstream role gates still apply universally.
 const cardLimit=budget-commanderPrice;
 const availableToSpells=cardLimit-Math.max(1.0,Math.min(12,cardLimit*.12));
 const style=entry.style.id;
 const needed={ramp:bracket===4?11:bracket===3?10:8,draw:bracket===4?9:8,broad:bracket===4?8:7,shield:bracket===4?4:3};
 const primaryGoal=plan.needs.some(n=>n.kind==='typed-cast')?21:plan.needs.some(n=>n.kind==='death-tribal')?24:16;
 const count=(role)=>selected.filter(f=>role==='primary'?f.primary:f[role]).length;
 const highMV=()=>selected.filter(f=>f.cmc>=7).length;
 const threeRock=()=>selected.filter(f=>f.ramp&&f.cmc>=3).length;
 function canAdd(f){const c=f.card,name=cardSignature(c);if(usedNames.has(name))return false;
  if(c.game_changer&&gc>=maxGc)return false;
  if(f.late&&highMV()>=(style==='threats'?9:7))return false;
  if(f.ramp&&f.cmc>=3&&threeRock()>=2)return false;
  if(spent+cost(c)>commanderPrice+availableToSpells+1e-8)return false;
  if(!fitsSelectionLimits(c,selected.map(e=>e.card),limits))return false;
  // Avoid deliberate snow-mana dependence without a committed snow land plan.
  if(castabilityIssues(c,[]).length)return false;
  return true;
 }
 function add(f){if(!canAdd(f)||selected.length>=spellTarget)return false;selected.push(f);usedNames.add(cardSignature(f.card));spent+=cost(f.card);if(f.card.game_changer)gc++;return true;}
 function fill(predicate,target,minMerit=-Infinity){
  let guard=0;while(count(predicate===null?'primary':predicate)<target&&selected.length<spellTarget&&guard++<target+4){
   const next=sorted.find(f=>(predicate===null?f.primary:f[predicate])&&f.merit>=minMerit&&canAdd(f));
   if(!next||!add(next))break;
  }
 }
 // The whole-deck source skeleton gets genuine early priority for all *kinds*
 // of cards. Unlike v1.0, it can provide 30+ spell slots and the mana base.
 // Reserve functional scaffolding first so source popularity cannot eliminate
 // essential roles. The remaining template is weighted, not blindly copied.
 fill('ramp',needed.ramp);
 fill('draw',needed.draw);
 fill('broad',needed.broad);
 fill('shield',needed.shield);
 // Keep the existing Spellbook engine's *validated candidate inventory* available
 // to the new constructor. Each compact committed group is atomic and must
 // pass the new engine's independent budget/curve/name/selection guards.
 const committedCombos=[];
 const byCardName=new Map(facts.map(f=>[f.card.name,f]));
 for(const combo of preferredCombos.slice(0,4)){
  if(selected.length>=spellTarget-18)break;
  const names=[...new Set([...(combo.namedCards||[]).filter(x=>typeof x==='string'),
    ...(combo.added||[]),...(combo.templateMatches||[]).map(x=>x.card)].filter(Boolean))];
  const components=names.filter(x=>x!==commander.name).map(x=>byCardName.get(x));
  if(!components.length||components.some(x=>!x))continue;
  const neededParts=components.filter(f=>!usedNames.has(cardSignature(f.card)));
  if(!neededParts.length||neededParts.length>4||selected.length+neededParts.length>spellTarget-12)continue;
  if(gc+neededParts.filter(f=>f.card.game_changer).length>maxGc)continue;
  if(spent+sum(neededParts,f=>cost(f.card))>commanderPrice+availableToSpells+1e-8)continue;
  const before=selected.length,beforeSpent=spent,beforeGc=gc;
  let accepted=true;
  for(const f of neededParts){if(!add(f)){accepted=false;break;}}
  if(!accepted){for(const f of selected.splice(before))usedNames.delete(cardSignature(f.card));spent=beforeSpent;gc=beforeGc;continue;}
  committedCombos.push({id:combo.id,cards:components.map(f=>f.card.name),added:neededParts.map(f=>f.card.name)});
 }
 // Bounded evidence-derived engine hypotheses receive a genuine construction
 // opportunity after essential scaffolding, before generic tribal filling.
 if(entry.anchors)for(const f of sorted.filter(f=>entry.anchors.has(oracleId(f.card))))add(f);
 fill(null,primaryGoal);
 // Source-spine priority is bounded to avoid adopting unsupported filler en masse.
 if(entry.source){
  const strong=sorted.filter(f=>entry.source.has(oracleId(f.card))&&!f.late&&f.merit>0);
  for(const f of strong){if(selected.length>=Math.min(spellTarget-7,44))break;add(f);}
 }
 // Fill remaining spaces by complete-deck tactical profile (not role-quota spam).
 let guard=0;
 for(const f of sorted){if(selected.length>=spellTarget||guard++>=sorted.length)break;
  if(f.merit< -5)break;
  if(!f.primary&&!f.ramp&&!f.draw&&!f.broad&&!f.shield&&f.merit<7)continue;
  add(f);
 }
 // A sparse catalog is allowed to use less ideal filler, but never skip
 // singleton / price / snow / Game Changer checks to reach 99.
 if(selected.length<spellTarget){for(const f of sorted){if(selected.length===spellTarget)break;add(f);}}
 if(selected.length!==spellTarget)return {status:`only-${selected.length}-spells`,strategy:entry.id};
 const spells=selected.map(f=>f.card);
 // Joint mana construction: now choose lands for the actual selected spells.
 const pipTotals=Object.fromEntries(colors.map(x=>[x,sum(spells,c=>pips(c)[x])]));
 const requiredColors=new Set(colors.filter(x=>pipTotals[x]>0));
 const preferredColorCount=Math.max(8,colors.length>=4?8:10);
 const colourSources=Object.fromEntries(colors.map(x=>[x,0]));
 const remainingBudget=budget-spent;
 let landSpend=0;
 function pushLand(c){if(landSelected.length>=landTarget)return false;
  if(!isBasic(c)&&usedNames.has(cardSignature(c)))return false;
  if(landSpend+cost(c)>remainingBudget+1e-8)return false;
  if(!isBasic(c))usedNames.add(cardSignature(c));landSpend+=cost(c);
  landSelected.push(c);return true;}
 function availableLand(c){if(isBasic(c))return landSpend+cost(c)<=remainingBudget+1e-8;
  return !usedNames.has(cardSignature(c))&&landSpend+cost(c)<=remainingBudget+1e-8;}
 const landShortlist=landPool.filter(c=>!isBasic(c)).map(c=>{const m=landManaQuality(c);return {c,pre:m.colors.length*11+(m.canC?5:0)+(entry.source?.has(oracleId(c))?30:0)-(m.unusable?100:0)-(m.restricted?12:0)-(m.needsActivationPayment?12:0)-(m.entersTapped?4:0)-Math.log1p(cost(c))*3};}).sort((a,b)=>b.pre-a.pre||byName(a.c,b.c)).slice(0,170).map(x=>x.c);
 const lane=(c)=>{
  const q=landManaQuality(c);if(q.unusable)return -Infinity;
  const reliable=landAccess(c,{commander,plan,lands:landSelected,spells});
  if(reliable.reasons.length)return -100;
  let v=0;
  for(const x of colors)if(reliable.reliable.includes(x))v+=Math.max(0,preferredColorCount-colourSources[x])*(1+(pipTotals[x]||0)*.06);
  if(plan.needsColorless&&trueColorlessSource(c))v+=Math.max(0,8-landSelected.filter(trueColorlessSource).length)*1.9;
  if(entry.source?.has(oracleId(c)))v+=18;
  v-=q.entersTapped?6:0;v-=q.needsActivationPayment?17:0;v-=q.consumable?11:0;v-=q.restricted?16:0;
  v-=3*Math.log1p(cost(c));
  return v;
 };
 function insert(c){if(!pushLand(c))return false;
  const reliable=landAccess(c,{commander,plan,lands:landSelected,spells});
  for(const x of colors)if(reliable.reliable.includes(x))colourSources[x]++;
  return true;}
 // Baseline minimum playable basics, including actual {C} for Ulalek-like costs.
 if(plan.needsColorless)for(let i=0;i<(colors.length>=4?5:3);i++)insert(basicMap.get('Wastes'));
 for(const x of requiredColors)insert(basicMap.get(basics[x]));
 let landGuard=0;
 while(landSelected.length<landTarget&&landGuard++<landTarget){
  const nonBasics=landShortlist.filter(availableLand);
  const ranked=nonBasics.map(c=>({c,score:lane(c)})).sort((a,b)=>b.score-a.score||byName(a.c,b.c));
  const best=ranked[0];
  const pickNonbasic=best&&best.score>4&&landSelected.filter(c=>!isBasic(c)).length<(colors.length>=4?24:18)
   &&(!landManaQuality(best.c).entersTapped||landSelected.filter(c=>landManaQuality(c).entersTapped).length<8)
   &&(!landManaQuality(best.c).consumable||landSelected.filter(c=>landManaQuality(c).consumable).length<4);
  if(pickNonbasic&&insert(best.c))continue;
  const target=colors.slice().sort((a,b)=>(colourSources[a]-(pipTotals[a]||0)*.07)-(colourSources[b]-(pipTotals[b]||0)*.07)||stable(a,b))[0];
  if(!insert(basicMap.get(basics[target||'C'])))break;
 }
 if(landSelected.length!==landTarget)return {status:'incomplete-lands',strategy:entry.id};
 const deck=[...spells,...landSelected];
 if(entry.anchors&&![...entry.anchors].every(id=>deck.some(c=>oracleId(c)===id)))return {status:'engine-hypothesis-incomplete',strategy:entry.id};
 if(deck.some(c=>!isLandSlot(c)&&castabilityIssues(c,landSelected).length))return {status:'unsupported-casting',strategy:entry.id};
 const singleton=validateCommanderSingleton(commander,deck);
 if(!singleton.valid||spent+landSpend>budget+1e-6)return {status:'illegal-or-over-budget',strategy:entry.id};
 return {status:'ok',strategy:entry.id,label:entry.label,sourceKey:entry.sourceKey,strategyCommitments:entry.anchors?deck.filter(c=>entry.anchors.has(oracleId(c))).map(c=>c.name):[],
  cards:deck,price:round(spent+landSpend),sourceSpellCount:entry.source?spells.filter(c=>entry.source.has(oracleId(c))).length:0,
  sourceLandCount:entry.source?landSelected.filter(c=>entry.source.has(oracleId(c))).length:0,committedCombos};
}

/** Independent score uses whole-deck evidence, not the old card-rank sum. */
export function strategyScore(cards,commander,plan=planFor(commander)){
 const spells=cards.filter(c=>!isLandSlot(c));const fact=spells.map(c=>cardFacts(c,plan));
 const land=landScore(cards,{commander,plan});
 const n=key=>fact.filter(f=>f[key]).length;
 const wide=n('broad'),draw=n('draw'),mana=n('ramp'),shield=n('shield'),onPlan=n('primary');
 const three=spells.filter(c=>manaRole(c).effective&&c.cmc>=3).length;
 const late=spells.filter(c=>c.cmc>=7).length;
 const issue=spells.reduce((s,c)=>s+dependencyEvidence(c,cards).length,0);
 const tempo=tempoEvidence(cards);
 // Overprovision gives diminishing returns; avoid pathological seven-rock / 23-answer decks.
 const target=Math.max(18,plan.needs.some(n=>n.kind==='typed-cast')?21:16);
 let score=45*Math.min(onPlan,target)/target+30*Math.min(mana,10)/10+
  25*Math.min(draw,8)/8+24*Math.min(wide,8)/8+17*Math.min(shield,3)/3+
  land.score*.35;
 score-=Math.max(0,three-2)*6+Math.max(0,late-7)*5+issue*12;
 score-=Math.max(0,mana-13)*2+Math.max(0,wide-11)*3;
 // Reward efficient acceleration that supports expensive decks; the average CMC alone is not a defect.
 score+=Math.min(tempo.efficientRamp,10)*1.2+Math.min(tempo.weightedCardFlow,10)*1.2;
 score-=tempo.heavyCurveAccelerationGap*2.5;
 score-=Math.max(0,21-onPlan)*2;
 return {value:round(score),onPlan,mana,positiveOrConditionalDraw:draw,broadAnswers:wide,shields:shield,threeManaRocks:three,late,unsupported:issue,landScore:land.score,tempo};
}


/** v1.1.5: use the remaining *ceiling* to seek stronger complete decks.
 * The first-pass constructor deliberately reserves money for lands. This
 * refinement runs AFTER lands are fixed and must never spend for its own sake.
 * A replacement needs independent strategic utility, not an expensive price.
 * Package commitments, Bracket 3 compact-combo policy, role floors, and the
 * actual printing-level final budget are independently checked on every swap.
 */
function investBudgetPath({built,pool,commander,plan=planFor(commander),bracket=3,budget,searchMode='quality',traceNames=[],
  limits=selectionLimits(plan,Number(bracket)),comboVariants=[],source=null,style=styles[0],maxSwaps=16}={}){
 if(!built||built.status!=='ok')return built;
 const fitsSelectionLimits=createSelectionLimitChecker();
 const before=cost(commander)+sum(built.cards,cost),lands=built.cards.filter(isLandSlot);
 bracket=Number(bracket);
 const spells=built.cards.filter(c=>!isLandSlot(c));
 const committed=new Set([...(built.committedCombos||[]).flatMap(p=>p.cards||[]),...(built.strategyCommitments||[])].map(x=>singletonName({name:x})));
 const cache=new Map();
 const fact=c=>{if(!cache.has(c))cache.set(c,cardFacts(c,plan));return cache.get(c);};
 // Price is deliberately NOT a card-quality bonus or penalty in this stage.
 // The source template is already represented in the chosen strategy; retaining
 // a minimum source spine is safer than making its 48-point prior immutable.
 const intrinsic=c=>merit(fact(c),style,{style:style.id})+3.2*Math.log1p(cost(c))+
  (fact(c).mana.kind==='burst'&&Number(c.cmc)<=2?9:0);
 const candidates=pool.filter(c=>!isLandSlot(c)&&oracleId(c)!==oracleId(commander)&&Number.isFinite(cost(c))&&
  cost(c)<=budget-cost(commander)&&legalFor(c,commander))
  .map(c=>({card:c,quality:intrinsic(c)}))
  .filter(x=>x.quality>0)
  .sort((a,b)=>b.quality-a.quality||stable(a.card.name,b.card.name)).slice(0,850);
 const sourceCount=()=>spells.filter(c=>source?.has(oracleId(c))).length;
 const sourceFloor=source?Math.min(20,sourceCount()):0;
 const floorKeys=['ramp','efficientRamp','draw','broad','shield','primary'];
 const targets={ramp:bracket===4?11:bracket===3?10:8,efficientRamp:10,draw:bracket===4?9:8,
  broad:bracket===4?8:7,shield:bracket===4?4:3,primary:21};
 const count=key=>spells.filter(c=>fact(c)[key]).length;
 // Don't make an unmet floor worse, or strip out stronger existing evidence.
 const preserved=Object.fromEntries(floorKeys.map(key=>[key,Math.min(count(key),targets[key])]));
 const existingPositive=spells.filter(c=>fact(c).role.draw==='positive').length;
 const completed=[],rejections={};
 const watched=new Map(traceNames.map(name=>[name,{card:name,reasons:{}}]));
 const rejected=(next,reason)=>{rejections[reason]=(rejections[reason]||0)+1;const w=watched.get(next.name);if(w)w.reasons[reason]=(w.reasons[reason]||0)+1;};
 let spent=before;
 let deckScore=strategyScore([...spells,...lands],commander,plan).value;
 let manaScore=landScore([...spells,...lands],{commander,plan}).score;
 for(let iteration=0;iteration<Math.max(0,Math.min(24,maxSwaps));iteration++){
  const owned=new Set([singletonName(commander),...spells.map(cardSignature),...lands.map(cardSignature)]);
  const current=Object.fromEntries(floorKeys.map(key=>[key,count(key)]));
  const currentPositive=spells.filter(c=>fact(c).role.draw==='positive').length;
  const currentGC=[...spells,...lands].filter(c=>c.game_changer).length+(commander.game_changer?1:0);
  const threeRock=spells.filter(c=>fact(c).ramp&&fact(c).cmc>=3).length;
  const lateCount=spells.filter(c=>fact(c).late).length;
  const shortlist=candidates.filter(x=>!owned.has(cardSignature(x.card))&&cost(x.card)<=budget-spent+Math.max(0,...spells.map(cost))+0.005);
  const proposals=[];
  for(let i=0;i<spells.length;i++){
   const old=spells[i],oldFact=fact(old),oldQuality=intrinsic(old);
   if(committed.has(cardSignature(old)))continue;
   const sourceRemoval=source?.has(oracleId(old))?1:0;

   const priceRoom=budget-spent+cost(old);
   const alternatives=[];
   for(const entry of shortlist){
    const next=entry.card,newFact=fact(next);
    if(sourceRemoval&&!source?.has(oracleId(next))&&sourceCount()<=sourceFloor){rejected(next,'source spine');continue;}
    const gain=entry.quality-oldQuality;
    if(gain<=1.5){for(const w of watched.values()){const candidate=shortlist.find(e=>e.card.name===w.card);if(candidate&&candidate.quality-oldQuality<=1.5){w.reasons['individual merit threshold']=(w.reasons['individual merit threshold']||0)+1;}}break;}
    // Protect exceptional cheap sustained acceleration even above role floors.
    if(oldFact.earlyOutput>=2&&newFact.earlyOutput<oldFact.earlyOutput){rejected(next,'high-output early mana');continue;}
    if(cost(next)>priceRoom+1e-7){rejected(next,'budget');continue;}
    if(next.game_changer&&!old.game_changer&&currentGC>=(bracket===2?0:bracket===3?3:99)){rejected(next,'game changers');continue;}
    if(newFact.late&&!oldFact.late&&lateCount>=7){rejected(next,'seven-plus spell cap');continue;}
    if(newFact.ramp&&newFact.cmc>=3&&!(oldFact.ramp&&oldFact.cmc>=3)&&threeRock>=2){rejected(next,'three-mana ramp cap');continue;}
    if(floorKeys.some(key=>oldFact[key]&&!newFact[key]&&current[key]<=preserved[key])){rejected(next,'role floor');continue;}
    if(oldFact.role.draw==='positive'&&newFact.role.draw!=='positive'&&currentPositive<=existingPositive){rejected(next,'positive draw floor');continue;}
    // Rank several options before the expensive complete-deck checks. Three
    // independent paths explore absolute utility and two investment levels.
    if(!newFact.primary&&!newFact.ramp&&!newFact.draw&&!newFact.broad&&!newFact.shield)continue;
    const extra=Math.max(0,cost(next)-cost(old));
    const utility=searchMode==='value'?gain/Math.max(1,extra):
      searchMode==='balanced'?gain/Math.sqrt(Math.max(1,extra)):gain;
    alternatives.push({index:i,old,next,gain,utility});
   }
   alternatives.sort((a,b)=>b.utility-a.utility||b.gain-a.gain||cost(a.next)-cost(b.next)||byName(a.next,b.next));
   proposals.push(...alternatives.slice(0,3));
  }
  proposals.sort((a,b)=>b.utility-a.utility||b.gain-a.gain||cost(a.next)-cost(b.next)||byName(a.next,b.next)||a.index-b.index);
  let best=null,valid=0;
  const oldCards=[...spells,...lands];
  const priorIssues=new Map(oldCards.map(c=>[c,dependencyEvidence(c,oldCards).length]));
  // Rejection belongs to a pair in this deck state, never to a card globally.
  for(const proposal of proposals){
   const {index,old,next}=proposal;
   if(castabilityIssues(next,lands).length||!fitsSelectionLimits(next,spells,limits,old)){rejected(next,'castability/response limits');continue;}
   const nextSpells=spells.slice();nextSpells[index]=next;
   const nextCards=[...nextSpells,...lands];
   if(conservativeComboViolation(nextCards,commander,comboVariants,bracket)||!validateCommanderSingleton(commander,nextCards).valid)continue;
   if(nextCards.some(c=>dependencyEvidence(c,nextCards).length>(priorIssues.get(c)??priorIssues.get(old))))continue;
   const nextPrice=cost(commander)+sum(nextCards,cost);
   if(nextPrice>budget+1e-7)continue;
   const nextMana=landScore(nextCards,{commander,plan}).score;
   if(nextMana<manaScore-1e-7){rejected(next,'fixed-land mana demand');continue;}
   const nextScore=strategyScore(nextCards,commander,plan).value;
   if(nextScore<deckScore-1e-7){rejected(next,'scalar deck score');continue;}
   const option={...proposal,nextScore,nextMana,nextPrice};
   if(!best||nextScore>best.nextScore||nextScore===best.nextScore&&proposal.utility>best.utility)best=option;
   if(++valid>=3)break;
  }
  if(!best)break;
  spells[best.index]=best.next;
  spent=best.nextPrice;deckScore=best.nextScore;manaScore=best.nextMana;
  completed.push({out:best.old.name,in:best.next.name,extraCost:round(cost(best.next)-cost(best.old)),qualityGain:round(best.gain)});
  // At the cap, cheaper or equal-cost improvements can still be useful.
 }
 const outcome={...built,cards:[...spells,...lands],price:round(spent),
  sourceSpellCount:source?spells.filter(c=>source.has(oracleId(c))).length:0,
  budgetInvestment:{startingPrice:round(before),finalPrice:round(spent),ceiling:round(budget),
   remaining:round(Math.max(0,budget-spent)),swaps:completed,
   searchMode,qualityGain:round(sum(completed,x=>x.qualityGain)),
   diagnostics:{pool:pool.length,shortlist:candidates.length,shortlistLimit:850,feasibleFinalistsPerRound:3,rejections,qualityShortlistTop:candidates.slice(0,12).map(x=>({card:x.card.name,price:cost(x.card),merit:x.quality})),deck:traceNames.length?spells.concat(lands).map(c=>c.name):undefined,watched:[...watched.values()].map(w=>({...w,inShortlist:candidates.some(e=>e.card.name===w.card),selected:spells.some(c=>c.name===w.card)}))},
   note:'Bounded positive-utility search; unused budget is allowed. Costs are estimates, not verified EN NM carts.'}};
 return outcome;
}

/** Compare completed investment paths using the existing deck evidence, then
 * accumulated price-neutral card merit. Cost never earns a quality bonus.
 * Keep the unchanged deck as an explicit fallback; this is bounded search,
 * not a proof of global optimality or measured gameplay strength. */
export function investRemainingBudget(options={}){
 const {built,commander}=options;
 if(!built||built.status!=='ok')return built;
 const plan=options.plan||planFor(commander);
 const paths=['quality','balanced','value'].map(searchMode=>investBudgetPath({...options,plan,searchMode}));
 const baseline=investBudgetPath({...options,plan,searchMode:'unchanged',maxSwaps:0});
 const outcomes=[baseline,...paths].map(deck=>({deck,score:strategyScore(deck.cards,commander,plan).value}));
 outcomes.sort((a,b)=>b.score-a.score||b.deck.budgetInvestment.qualityGain-a.deck.budgetInvestment.qualityGain||a.deck.price-b.deck.price);
 const selected=outcomes[0].deck;
 selected.budgetInvestment.candidates=outcomes.map(({deck,score})=>({mode:deck.budgetInvestment.searchMode,
  price:deck.price,score,qualityGain:deck.budgetInvestment.qualityGain,swaps:deck.budgetInvestment.swaps.length,diagnostics:deck.budgetInvestment.diagnostics}));
 if(options.deferPackages){Object.defineProperty(selected,INVESTMENT_STARTS,{value:paths.concat(baseline)});return selected;}
 return finishPackageInvestments(options,selected,paths.concat(baseline),plan);
}
function finishPackageInvestments(options,selected,starts,plan){
 const commander=options.commander;
 let refined=refinePackageInvestments({...options,plan,built:selected,startingDecks:starts,protectionBaseline:starts.find(x=>x.budgetInvestment?.searchMode==='unchanged')?.cards||options.built?.cards||selected.cards,
  comboViolation:cards=>conservativeComboViolation(cards,commander,options.comboVariants||[],options.bracket??3),
  score:cards=>strategyScore(cards,commander,plan).value});
 const guarded=guardNativeRefinement(selected,refined,commander,plan);
 if(guarded.lost.length){
  const proposal=refined.packageInvestment;
  refined={...selected,packageInvestment:{...proposal,proposedPrice:refined.price,proposedPackages:proposal.accepted,accepted:[],finalPrice:selected.price,after:investmentEvidence(selected.cards,commander,plan),abstainedForNativeResources:guarded.lost,
   abstention:'Retained legal input: simple generic evidence cannot certify replacement of an unmodeled native life/sacrifice/Treasure engine.'}};
 }
 refined.budgetInvestment={...(refined.budgetInvestment||selected.budgetInvestment),candidates:selected.budgetInvestment.candidates,finalPrice:refined.price,remaining:round(Math.max(0,options.budget-refined.price)),packages:refined.packageInvestment.accepted};
 refined.sourceSpellCount=options.source?refined.cards.filter(c=>!isLandSlot(c)&&options.source.has(oracleId(c))).length:0;
 refined.sourceLandCount=options.source?refined.cards.filter(c=>isLandSlot(c)&&options.source.has(oracleId(c))).length:0;
 return refined;
}

export function constructStrategyDeck({cards,commander,bracket,budget,powerTarget='balanced',communityBuild=null,communityDecks=[],preferredCombos=[],comboVariants=[],investmentTrace=[],referenceDeck=null}={}){
 const profile={2:{lands:37,maxGameChangers:0},3:{lands:36,maxGameChangers:3},4:{lands:35,maxGameChangers:99}}[Number(bracket)];
 if(!profile)throw Error('Choose bracket 2, 3 or 4.');
 const plan=planFor(commander),pool=dedupeCatalog(cards,commander),commanderPrice=cost(commander);
 const limits=selectionLimits(plan,Number(bracket),powerTarget);
 const entries=candidatePlans(communityDecks,commander,bracket,communityBuild?.status==='ready',communityBuild,pool);
 for(const hypothesis of discoverStrategyPlans(pool,commander,{budget:Number(budget)}))entries.push({...hypothesis,style:styles[0]});
 const results=entries.map(entry=>{const built=buildOne({pool,commander,plan,bracket:Number(bracket),budget:Number(budget),profile,entry,limits,commanderPrice,preferredCombos});
  if(built.status!=='ok')return built;
  const violation=conservativeComboViolation(built.cards,commander,comboVariants,bracket);
  if(violation)return {status:'recorded-bracket-combo-policy',strategy:entry.id,violation};
  const invested=investRemainingBudget({built,pool,commander,plan,bracket:Number(bracket),budget:Number(budget),
   deferPackages:true,limits,comboVariants,source:entry.source,style:entry.style,traceNames:Array.isArray(investmentTrace)?investmentTrace:[],
   packages:preferredCombos.map(c=>({id:c.id,cards:c.namedCards||c.added||[]}))});
  return invested;
 });
 if(referenceDeck){results.push(investRemainingBudget({built:referenceDeck,pool,commander,plan,bracket:Number(bracket),budget:Number(budget),deferPackages:true,limits,comboVariants,traceNames:Array.isArray(investmentTrace)?investmentTrace:[]}));}
 const complete=results.filter(x=>x.status==='ok');
 const preferred=selectInvestmentDeck(complete,{commander,plan,score:cards=>strategyScore(cards,commander,plan).value});
 const preliminary=new Map(complete.map(d=>[d,investmentEvidence(d.cards,commander,plan)]));
 const leader=key=>complete.slice().sort((a,b)=>preliminary.get(b).vector[key]-preliminary.get(a).vector[key]||stable(a.strategy,b.strategy))[0];
 const expanded=refinementCohort(complete,{preferred,commander,coverageLeaders:[leader('flow'),leader('repeatableMana')],limit:4});
 for(const built of expanded){
  const entry=entries.find(e=>e.id===built.strategy);
  const improved=finishPackageInvestments({pool,commander,budget:Number(budget),bracket:Number(bracket),limits,comboVariants,source:entry?.source||null,
   traceNames:Array.isArray(investmentTrace)?investmentTrace:[],packages:preferredCombos.map(c=>({id:c.id,cards:c.namedCards||c.added||[]}))},built,built[INVESTMENT_STARTS]||[],plan);
  results[results.indexOf(built)]=improved;
 }
 const successful=results.filter(x=>x.status==='ok');
 for(const r of successful)r.score=strategyScore(r.cards,commander,plan);
 // Compare complete-deck evidence first; spending more is not evidence.
 const executionMemo=new Map();
 const executionFor=cards=>{if(!executionMemo.has(cards))executionMemo.set(cards,strategyExecution(cards,commander,plan));return executionMemo.get(cards);};
 const relationMemo=new Map();
 const relationsFor=cards=>{if(!relationMemo.has(cards))relationMemo.set(cards,strategyRelations(cards,commander,{plan}));return relationMemo.get(cards);};
 const evidenceMemo=new Map(successful.map(d=>[d.cards,investmentEvidence(d.cards,commander,plan)]));
 const relationEvidence=new Map(successful.map(d=>[evidenceMemo.get(d.cards),relationsFor(d.cards)]));
 const candidateDominates=(a,b)=>dominatesCandidateEvidence(a,b)&&relationEvidence.get(b).capabilities.every(k=>relationEvidence.get(a).capabilities.includes(k))&&relationEvidence.get(b).unverifiedNativeResources.every(r=>relationEvidence.get(a).unverifiedNativeResources.some(x=>x.id===r.id));
 const functionalChoice=selectInvestmentDeck(successful,{commander,plan,score:cards=>strategyScore(cards,commander,plan).value,evidenceFor:cards=>evidenceMemo.get(cards),candidateDominates,executionFor,executionDominates});
 successful.sort((a,b)=>b.score.value-a.score.value||stable(a.strategy,b.strategy));
 if(functionalChoice){successful.splice(successful.indexOf(functionalChoice),1);successful.unshift(functionalChoice);}
 // A user-picked community archetype is an explicit choice, not a loose bonus.
 // Prefer its valid source representatives; fall back only when no such source
 // constructs a complete and legal candidate. Automatic mode remains scored.
 if(communityBuild?.userSelected&&communityBuild?.status==='ready'){
  const preferred=new Set(communityBuild.selected?.sourceDecks||[]);
  const selected=successful.find(x=>x.sourceKey&&preferred.has(x.sourceKey));
  if(selected){successful.splice(successful.indexOf(selected),1);successful.unshift(selected);}
 }
 const distinct=new Set(successful.map(x=>x.cards.map(c=>oracleId(c)).sort(stable).join('|'))).size;
 const compared=successful.map(deck=>({deck,evidence:evidenceMemo.get(deck.cards)}));
 const functionalFrontier=compared.filter(x=>!compared.some(y=>x!==y&&candidateDominates(y.evidence,x.evidence)));
 const selectedEvidence=compared.find(x=>x.deck===successful[0]);
 const comparison=compared.map(({deck,evidence})=>{
  const dominatedBy=compared.filter(other=>other.deck!==deck&&candidateDominates(other.evidence,evidence)).map(other=>other.deck.strategy);
  const executionDominatedBy=functionalFrontier.filter(x=>x.deck!==deck&&executionDominates(executionFor(x.deck.cards),executionFor(deck.cards))).map(x=>x.deck.strategy);
  return {id:deck.strategy,relations:relationsFor(deck.cards),price:deck.price,score:deck.score.value,vector:evidence.vector,execution:executionFor(deck.cards),
   selection:{reason:deck===successful[0]?'selected':dominatedBy.length?'functional frontier elimination':executionDominatedBy.length?'paired deployment frontier elimination':'incomparable surviving strategies; legacy scalar tie-break',
    selectedGains:Object.keys(evidence.vector).filter(k=>selectedEvidence.evidence.vector[k]>evidence.vector[k]),
    selectedLosses:Object.keys(evidence.vector).filter(k=>selectedEvidence.evidence.vector[k]<evidence.vector[k]),
    selectedScore:successful[0].score.value,executionDominatedBy},
   infrastructure:evidence.infrastructure.map(({card,kind,units,support})=>({card,kind,units,support})),
   drawEngines:evidence.drawEngines.map(({card,trigger,topAccess,independent,support})=>({card,trigger,topAccess,independent,support})),dominatedBy};
 });
 const alternatives=[];
 for(const deck of [successful[0],...functionalFrontier.map(x=>x.deck)].filter(Boolean)){
  const row={...deck,relations:relationsFor(deck.cards)};
  if(!alternatives.length||alternatives.every(x=>distinctStrategy(row,x)))alternatives.push(row);
  if(alternatives.length===4)break;
 }
 return {selected:successful[0]||null,successful,alternatives,report:{mode:'strategy-first',comparison,discovered:entries.filter(e=>e.discovery).map(e=>({id:e.id,...e.discovery})),packageExpansion:{limit:4,expanded:expanded.map(x=>x.strategy),reason:'Preserve previous preferred/flow/mana starts, then add a distinct source/local plan; remaining candidates retain single-card results'},generated:results.length,complete:successful.length,distinct,
  candidates:results.map(x=>({id:x.strategy,label:x.label||x.strategy,status:x.status,score:x.score?.value??null,
   sourceSpells:x.sourceSpellCount||0,sourceLands:x.sourceLandCount||0,price:x.price??null,
   budgetSwaps:x.budgetInvestment?.swaps.length||0,investment:x.budgetInvestment,packageInvestment:x.packageInvestment})),
  selected:successful[0]?.strategy||null,method:'Independent source-template + local-strategy 99-card construction, plus guarded improvement-only budget reinvestment. Functional frontier, paired deployment probes, then existing scalar for incomparable strategies. No spending merit or certified gameplay performance.'}};
}
