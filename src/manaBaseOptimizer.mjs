/** Deterministic land optimization against the actual final spells, not just
 * a fixed generic rainbow-land ranking. Cheap bounded comparisons; no API. */
import {COLORS,isLandSlot,isBasic,landManaQuality,priceOf,oracleId,trueColorlessSource} from './cards.mjs';
import {landAccess} from './deckQuality.mjs';
import {singletonName} from './deckValidation.mjs';
import {castFaces} from './cards.mjs';
import {castabilityIssues} from './selectionPolicy.mjs';
const round=x=>Math.round(x*100)/100;
const sorted=(a,b)=>a.name.localeCompare(b.name);
function pips(cards){const out=Object.fromEntries(COLORS.map(c=>[c,0]));for(const c of cards.filter(x=>!isLandSlot(x)))for(const f of castFaces(c))for(const match of (f.mana_cost||'').matchAll(/\{([^}]+)\}/g))for(const color of COLORS)if(match[1].split('/').includes(color))out[color]++;
 return out;}
export function landScore(cards,{commander,plan}){
 const lands=cards.filter(isLandSlot),spells=cards.filter(c=>!isLandSlot(c));const demand=pips(cards);const colors=(commander.color_identity||[]).filter(x=>COLORS.includes(x));
 const sources=Object.fromEntries(COLORS.map(c=>[c,0]));let penalty=0,realC=0;
 for(const land of lands){
  const access=landAccess(land,{commander,plan,lands,spells}),m=landManaQuality(land);
  for(const c of colors){if(access.reliable.includes(c))sources[c]++;else if(access.conditional.includes(c))sources[c]+=.25;}
  if(trueColorlessSource(land))realC++;
  penalty+=access.reasons.length*4+(m.needsActivationPayment?5:0)+(m.consumable?3:0)+(m.entersTapped?2:0)+(m.unusable?30:0);
 }
 let quality=0;
 for(const c of colors){const target=Math.max(7,Math.min(15,7+Math.ceil((demand[c]||0)*.5)));
  quality+=22*Math.min(sources[c],target)/target-2*Math.max(0,target-sources[c]);}
 const need=plan.needsColorless?Math.min(8,Math.max(4,Math.ceil(lands.length*.18))):0;
 quality+=Math.min(realC,need)*3-Math.max(0,need-realC)*14;
 return {score:round(quality-penalty),sources,demand,realColorless:realC,penalty:round(penalty)};
}
export function optimizeManaBase({cards99,commander,plan,catalog=[],budget,commanderPrice=0,maxSwaps=3}){
 const original=cards99.slice(),allLands=catalog.filter(isLandSlot).filter(c=>priceOf(c)!==null).sort(sorted);
 const baseline=landScore(original,{commander,plan});let current=original.slice(),metrics=baseline;
 const swaps=[];const maxChanges=Math.min(4,Math.max(0,maxSwaps));
 // Filter broad candidates for responsiveness in very large Scryfall catalogs.
 const pool=allLands.filter(c=>isBasic(c)||landManaQuality(c).colors.length||trueColorlessSource(c));
 const candidateRank=c=>{const m=landManaQuality(c);return m.colors.length*10+(m.canC?4:0)-(m.restricted?8:0)-(m.needsActivationPayment?10:0)-(m.entersTapped?4:0)-(m.consumable?5:0)-(priceOf(c)||0)*2;};
 const candidates=pool.sort((a,b)=>candidateRank(b)-candidateRank(a)||sorted(a,b)).slice(0,24);
 for(let step=0;step<maxChanges;step++){
  const used=new Set(current.filter(c=>!isBasic(c)).map(singletonName));const ids=new Set(current.map(oracleId));
  const oldCost=commanderPrice+current.reduce((sum,c)=>sum+(priceOf(c)||0),0);
  let best=null;
  const indices=current.flatMap((c,i)=>isLandSlot(c)?[{c,i}]:[])
   .sort((a,b)=>candidateRank(a.c)-candidateRank(b.c)||a.c.name.localeCompare(b.c.name)).slice(0,16);
  for(const {c:out,i} of indices){
   for(const card of candidates){
    if(card===out||(!isBasic(card)&&(used.has(singletonName(card))||ids.has(oracleId(card)))))continue;
    if(oldCost-(priceOf(out)||0)+(priceOf(card)||0)>budget+1e-7)continue;
    const next=current.slice();next[i]=card;
    const nextLands=next.filter(isLandSlot);
    if(next.some(x=>!isLandSlot(x)&&castabilityIssues(x,nextLands).length))continue;
    const result=landScore(next,{commander,plan});
    if(plan.needsColorless&&result.realColorless<Math.min(baseline.realColorless,8))continue;
    // Never improve one demand color at the cost of severe new starvation.
    if(Object.entries(baseline.demand).some(([color,pips])=>pips>0&&result.sources[color]<Math.min(4,baseline.sources[color])))continue;
    const gain=result.score-metrics.score;
    if(gain<=.5)continue;
    if(!best||gain>best.gain+1e-7||Math.abs(gain-best.gain)<1e-7&&card.name.localeCompare(best.in.name)<0)best={i,out,in:card,gain,result};
   }
  }
  if(!best)break;
  current[best.i]=best.in;metrics=best.result;swaps.push({out:best.out.name,in:best.in.name,gain:round(best.gain)});
 }
 return {cards:current,report:{method:'Fixed-slot land swaps with colored-pip demand, conservative restricted fixing and colorless floor; not a casting simulator',baselineScore:baseline.score,selectedScore:metrics.score,swaps,originalSources:baseline.sources,sources:metrics.sources,realColorless:metrics.realColorless,externallyVerified:false}};
}
