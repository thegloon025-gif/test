/** v0.8.10 — bounded, deterministic whole-deck candidate search.
 * This is an explainable HEURISTIC, not a game simulator or external power
 * rating. Portfolio construction never makes network requests.
 */
import {isLandSlot,oracleId,priceOf,trueColorlessSource,castHasType} from './cards.mjs';
import {analysis,synergy} from './mechanics.mjs';
import {functionalRoles,manaRole,supportProblems} from './deckQuality.mjs';
import {spellEfficiency} from './highPower.mjs';
import {selectionTotals,fitsSelectionLimits,castabilityIssues,cardAdvantage} from './selectionPolicy.mjs';
import {normalizedName} from './combos.mjs';
import {templatePredicate} from './comboTemplates.mjs';
import {singletonName} from './deckValidation.mjs';
import {roleEvidence,dependencyEvidence} from './roleEvidence.mjs';

const round=n=>Math.round(n*100)/100;
const mean=(v)=>v.reduce((a,b)=>a+b,0);
const over=(n,limit,penalty)=>Math.max(0,n-limit)*penalty;
const stable=(a,b)=>a.name.localeCompare(b.name);

/** Inventory only; distinct overlapping variants have diminishing marginal value. */
function comboCoverage(cards,commander,variants){
 const names=new Set(cards.map(c=>normalizedName(c.name)));
 names.add(normalizedName(commander.name));
 let complete=0,direct=0,compact=0;
 const componentNames=new Set();
 for(const v of variants.slice(0,300)){
  if(!v||!v.isInfinite||v.legalities?.commander===false||v.spoiler)continue;
  const uses=v.uses||[];
  if(!uses.length||uses.some(u=>!names.has(normalizedName(u.name))))continue;
  const named=new Set(uses.map(u=>normalizedName(u.name)));
  let valid=true;
  for(const r of v.templateRequirements||[]){
   const match=templatePredicate(r);
   if(!match||cards.filter(c=>!named.has(normalizedName(c.name))&&match(c)).length<(r.quantity||1)){valid=false;break;}
  }
  if(!valid)continue;
  complete++;
  if((v.results||[]).some(r=>/infinite damage|opponents lose the game|win the game/i.test(r)))direct++;
  if(uses.length+(v.templateRequirements||[]).reduce((n,r)=>n+(r.quantity||1),0)<=2)compact++;
  for(const u of uses)if(normalizedName(u.name)!==normalizedName(commander.name))componentNames.add(normalizedName(u.name));
 }
 return {complete,direct,compact,components:componentNames.size};
}

function makeInfo(c,plan,bracket){
 const a=analysis(c),s=synergy(c,plan,a),f=functionalRoles(c),e=spellEfficiency(c),mana=manaRole(c),evidence=roleEvidence(c),adv=evidence.draw==='positive';
 const typed=plan.needs.some(n=>n.kind==='typed-cast');
 const onPlan=s.impact>=4;
 const flexible=f.interaction||f.protection||adv||mana.effective;
 const value=Math.min(24,s.impact)*2.1+(onPlan?6:0)+(s.roles.includes('finisher')?4:0)+
  (mana.effective?(Number(c.cmc)<=2?13:8):0)+(adv?10:0)+(e.cheapDraw?4:0)+
  (e.directShield?12:0)+(e.spotRemoval?12:0)+(e.hardAnswer&&!e.spotRemoval?5:0)+
  (!onPlan&&!flexible?-12:0)+(e.softCounter?-10:0)+
  (evidence.draw==='cantrip-or-conditional'?-7:0)+(evidence.removal==='conditional'?-9:0)+
  (evidence.shield==='counterspell'?-5:0)+
  ((c.cmc||0)>=7?-5:0)+ (typed&&castHasType(c,'Instant')&&!onPlan?-2:0)-
  Math.min(8,(priceOf(c)||0)*.20);
 return {a,s,f,e,mana,adv,evidence,onPlan,value,cmc:Number(c.cmc)||0};
}
function totalsFor(cards,infos){
 const spells=cards.filter(c=>!isLandSlot(c));const records=spells.map(c=>infos.get(oracleId(c)));
 return {spells:spells.length,onPlan:records.filter(i=>i.onPlan).length,
  early:records.filter(i=>i.mana.effective).length,interaction:records.filter(i=>i.f.interaction).length,
  shielding:records.filter(i=>i.f.protection).length,draw:records.filter(i=>i.evidence.draw==='positive'||i.evidence.draw==='engine-conditional').length,
  realDraw:records.filter(i=>i.adv).length,positiveDraw:records.filter(i=>i.evidence.draw==='positive').length,
  broadAnswers:records.filter(i=>i.evidence.removal==='broad').length,
  dedicatedShields:records.filter(i=>i.evidence.shield==='dedicated').length,spotRemoval:records.filter(i=>i.e.spotRemoval).length,
  directShield:records.filter(i=>i.e.directShield).length,
  trueColorless:cards.filter(trueColorlessSource).length,
  sevenPlus:records.filter(i=>i.cmc>=7).length,
  instantCount:selectionTotals(spells).instants,
  narrowCount:selectionTotals(spells).narrow};
}

/** Score ALL 99 simultaneously, including redundancy, resources, plan and combos. */
export function scoreWholeDeck(cards,{commander,plan,bracket,limits,variants=[],infoCache=new Map(),landIssues=[]}){
 const infos=infoCache;
 for(const c of cards)if(!isLandSlot(c)&&!infos.has(oracleId(c)))infos.set(oracleId(c),makeInfo(c,plan,bracket));
 const spells=cards.filter(c=>!isLandSlot(c)),t=totalsFor(cards,infos);
 const combo=comboCoverage(spells,commander,variants);
 const typed=limits.typed;
 let synergy=0,resources=0,resilience=0,tempo=0;
 for(const c of spells){const i=infos.get(oracleId(c));
  synergy+=i.value;
  if(i.mana.effective)resources+=i.cmc<=2?8:4;
  if(i.adv)resources+=7;
  if(i.e.directShield)resilience+=7;
  if(i.e.spotRemoval)resilience+=6;
  if(i.cmc<=3&&i.onPlan)tempo+=5;
  if(i.cmc>=7)tempo-=2;
  // These are checked against the *whole* list, not isolated Oracle words.
  const issues=supportProblems(c,cards,plan);synergy-=issues.length*16;
  synergy-=dependencyEvidence(c,cards).length*22;
  if(i.evidence.removal==='conditional')resilience-=6;
  if(i.evidence.draw==='cantrip-or-conditional')resources-=4;
 }
 resources-=over(t.early,bracket===4?14:12,3);resources-=over(t.realDraw,bracket===4?13:11,4);
 resilience-=over(t.interaction,bracket===4?13:11,5);
 resilience-=over(t.shielding,bracket===4?7:6,5);
 synergy-=over(t.narrowCount,1,9);
 if(typed){
  synergy-=over(t.instantCount,bracket===4?13:12,8);
  synergy-=over(spells.length-t.onPlan,bracket===4?19:17,7);
  tempo-=over(t.sevenPlus,bracket===4?6:7,4);
 }
 // Diminishing returns: a cluster of 11 near-identical loops is NOT 11
 // independent winning lines. Shared parts still contribute strategically.
 const networks=12*Math.min(3,combo.complete)+4*Math.sqrt(Math.max(0,combo.complete-3))+
   5*Math.min(3,combo.direct)+1.8*Math.min(12,combo.components);
 const weights=bracket===4?{synergy:1.0,resources:1.2,resilience:.8,tempo:1.3,networks:1.25}:
                        {synergy:1.15,resources:1.12,resilience:1.12,tempo:.85,networks:.9};
 const final=synergy*weights.synergy+resources*weights.resources+resilience*weights.resilience+
  tempo*weights.tempo+networks*weights.networks-landIssues.length*10;
 return {score:round(final),parts:{synergy:round(synergy),resources:round(resources),resilience:round(resilience),tempo:round(tempo),networks:round(networks)},counts:t,combo};
}

/** Candidate portfolios have different priorities, but share all hard gates. */
export function optimizeWholeDeck({cards99,commander,plan,bracket,limits,variants=[],catalog=[],budget,
 commanderPrice=0,lockedIds=new Set(),maxGameChangers=99,minOnPlan=0,requiredRoles=[]}){
 const initial=[...cards99],infoCache=new Map();
 const all=[...catalog.filter(c=>!isLandSlot(c)),...initial.filter(c=>!isLandSlot(c))];
 for(const c of all)if(!infoCache.has(oracleId(c)))infoCache.set(oracleId(c),makeInfo(c,plan,bracket));
 const selectedLands=initial.filter(isLandSlot);
 const baseline=scoreWholeDeck(initial,{commander,plan,bracket,limits,variants,infoCache});
 const floor=baseline.counts;
 const min=(n,goal)=>Math.min(n,goal);
 const required={early:min(floor.early,bracket===4?10:8),interaction:min(floor.interaction,8),
  shielding:min(floor.shielding,3),realDraw:min(floor.realDraw,bracket===4?8:7),
  spotRemoval:min(floor.spotRemoval,3),directShield:min(floor.directShield,3),
  onPlan:Math.max(minOnPlan,min(floor.onPlan,plan.needs.some(n=>n.kind==='typed-cast')?21:10)),
  trueColorless:min(floor.trueColorless,plan.needsColorless?8:0),
  positiveDraw:min(floor.positiveDraw,7),broadAnswers:min(floor.broadAnswers,6),
  dedicatedShields:min(floor.dedicatedShields,3)};
 const baselineCompact=baseline.combo.compact;
 const roleRequirements=requiredRoles.map(({role,target})=>({role,minimum:Math.min(target,initial.filter(c=>!isLandSlot(c)&&infoCache.get(oracleId(c)).s.roles.includes(role)).length)}));
 const modeNames=['cohesion','tempo','resilience'];
 const portfolios=[{name:'original',cards:initial,metrics:baseline,swaps:[]}];
 const weight=(i,mode)=>i.value+(mode==='cohesion'?(i.onPlan?14:0)+(i.s.roles.includes('engine')?5:0):
  mode==='tempo'?(i.mana.effective&&i.cmc<=2?16:0)+(i.onPlan&&i.cmc<=3?9:0)-Math.max(0,i.cmc-4)*3:
  (i.e.directShield?15:0)+(i.e.spotRemoval?14:0)+(i.adv?9:0));
 const poolByMode=new Map(modeNames.map(mode=>[mode,all.filter(c=>!selectedLands.includes(c)&&priceOf(c)!==null)
  .sort((a,b)=>weight(infoCache.get(oracleId(b)),mode)-weight(infoCache.get(oracleId(a)),mode)||stable(a,b)).slice(0,75)]));
 for(const mode of modeNames){
  let current=[...initial],currentMetric=baseline;const swaps=[];
  // One-for-one hill climbs generate multiple DISTINCT complete portfolios.
  // Every swap is evaluated in the context of all 99 cards.
  for(let step=0;step<3;step++){
   const removed=current.map((c,index)=>({c,index})).filter(({c})=>!isLandSlot(c)&&!lockedIds.has(oracleId(c)))
    .sort((a,b)=>weight(infoCache.get(oracleId(a.c)),mode)-weight(infoCache.get(oracleId(b.c)),mode)||stable(a.c,b.c)).slice(0,12);
   const names=new Set(current.map(singletonName)),currentIds=new Set(current.map(oracleId));
   const currentCost=commanderPrice+mean(current.map(priceOf));
   const currentGameChangers=(commander.game_changer?1:0)+current.filter(c=>c.game_changer).length;
   // Rank cheap approximations first. Complete-deck scoring is intentionally
   // limited to the best prospects, never the cartesian product of a catalog.
   const rough=[];
   for(const {c:old,index} of removed){
    const oldInfo=infoCache.get(oracleId(old));
    for(const candidate of poolByMode.get(mode)){
     if(currentIds.has(oracleId(candidate)))continue;
     if(names.has(singletonName(candidate))&&singletonName(candidate)!==singletonName(old))continue;
     if(singletonName(candidate)===singletonName(commander))continue;
     if(currentCost-priceOf(old)+priceOf(candidate)>budget+1e-7)continue;
     if(currentGameChangers+(candidate.game_changer?1:0)-(old.game_changer?1:0)>maxGameChangers)continue;
     const nextInfo=infoCache.get(oracleId(candidate));
     const predicted=nextInfo.value-oldInfo.value+
      (nextInfo.onPlan&&!oldInfo.onPlan?13:0)+
      (oldInfo.f.interaction&&!nextInfo.f.interaction&&floor.interaction>11?6:0)+
      (nextInfo.adv&&!oldInfo.adv?8:0)+
      (nextInfo.e.spotRemoval&&!oldInfo.e.spotRemoval?6:0)+
      (nextInfo.mana.effective&&!oldInfo.mana.effective?6:0)+
      .18*(weight(nextInfo,mode)-weight(oldInfo,mode));
     rough.push({old,index,candidate,predicted});
    }
   }
   rough.sort((a,b)=>b.predicted-a.predicted||a.candidate.name.localeCompare(b.candidate.name)||a.old.name.localeCompare(b.old.name));
   let best=null;
   for(const option of rough.slice(0,28)){
    const {old,index,candidate}=option;
    if(castabilityIssues(candidate,selectedLands).length)continue;
    if(!fitsSelectionLimits(candidate,current,limits,old))continue;
    const next=current.slice();next[index]=candidate;
    const counts=totalsFor(next,infoCache);
    if(Object.entries(required).some(([k,n])=>counts[k]<n))continue;
    if(roleRequirements.some(({role,minimum})=>next.filter(c=>!isLandSlot(c)&&infoCache.get(oracleId(c)).s.roles.includes(role)).length<minimum))continue;
    const score=scoreWholeDeck(next,{commander,plan,bracket,limits,variants,infoCache});
    if(bracket===3&&score.combo.compact>baselineCompact)continue;
    if(bracket===2&&score.combo.complete>baseline.combo.complete)continue;
    const gain=score.score-currentMetric.score;
    if(gain<.5)continue;
    if(!best||gain>best.gain+1e-7||Math.abs(gain-best.gain)<1e-7&&candidate.name.localeCompare(best.next.name)<0)
     best={index,old,next:candidate,score,gain};
   }
   if(!best)break;
   current[best.index]=best.next;currentMetric=best.score;
   swaps.push({out:best.old.name,in:best.next.name,scoreGain:round(best.gain)});
  }
  portfolios.push({name:mode,cards:current,metrics:currentMetric,swaps});
 }
 portfolios.sort((a,b)=>b.metrics.score-a.metrics.score||a.name.localeCompare(b.name));
 const winner=portfolios[0];
 return {cards:winner.cards,report:{method:'Deterministic local whole-deck portfolio comparison with bounded constrained swaps; heuristic only, NOT a gameplay score',
  selected:winner.name,distinctCandidates:new Set(portfolios.map(x=>x.cards.map(oracleId).join("|"))).size,baselineScore:baseline.score,selectedScore:winner.metrics.score,
  gain:round(winner.metrics.score-baseline.score),swaps:winner.swaps,
  candidates:portfolios.map(x=>({name:x.name,score:x.metrics.score,swaps:x.swaps.length,onPlan:x.metrics.counts.onPlan,inventoryComplete:x.metrics.combo.complete})),
  scoreParts:winner.metrics.parts,weights:bracket===4?'optimized: tempo and usable combo networks':'upgraded: synergy and resilience',
  externallyVerified:false}};
}
