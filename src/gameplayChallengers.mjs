/** Bounded source/Oracle-backed challenger discovery. Shadow only. No simulator
 * calls, holdout input, price merit, production winner or commander-name rules. */
import {refinePackageInvestments,investmentEvidence,manaCapacity} from './packageInvestment.mjs';
import {proposeShadowRepairs} from './gameplayShadow.mjs';
import {cardModel} from './gameplayCards.mjs';
import {nativeModel} from './gameplayNative.mjs';
import {accessModel,printedManaValue} from './gameplayAccess.mjs';
import {isLandSlot,oracleId,legalFor,priceOf,castHasType,castHasSubtype,landManaQuality} from './cards.mjs';
import {singletonName} from './deckValidation.mjs';
import {roleEvidence} from './roleEvidence.mjs';
import {planFor,analysis,synergy} from './mechanics.mjs';
import {planTypes} from './engineSupport.mjs';
const stable=(a,b)=>String(a).localeCompare(String(b));
export const challengerSignature=cards=>cards.map(singletonName).sort(stable).join('|');
const combos=(xs,n)=>n===0?[[]]:xs.flatMap((x,i)=>combos(xs.slice(i+1),n-1).map(ys=>[x,...ys]));
export function discoverGameplayChallengers({built,pool,commander,bracket,budget,communityDecks=[],source=null,comboViolation=()=>null,maxCandidates=4,accessFamily='entry'}={}){
 if(!['entry','cast-draw'].includes(accessFamily))throw Error('Unsupported shadow access family');
 if(!Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>4)throw Error('Challenger bound 1..4');
 const plan=planFor(commander),types=planTypes(plan),id=oracleId(commander);
 const cohort=communityDecks.filter(d=>d.validated&&d.commanderIds?.length===1&&d.commanderIds[0]===id&&Number(d.edhBracket)===Number(bracket));
 const provenance=new Map();for(const d of cohort)for(const c of d.mainboard||[])if(c.quantity>0){if(!provenance.has(c.id))provenance.set(c.id,[]);provenance.get(c.id).push(d.key);}
 const base=investmentEvidence(built.cards,commander,plan),owned=new Set([commander,...built.cards].map(singletonName));
 // Canonical selected records, independent of entry order or list-price merit.
 const unique=new Map();for(const c of pool.filter(c=>legalFor(c,commander)&&priceOf(c)!==null)){
  const k=singletonName(c),old=unique.get(k);if(!old||priceOf(c)<priceOf(old)||priceOf(c)===priceOf(old)&&stable(c.name,old.name)<0)unique.set(k,c);
 }
 const newCards=[...unique.values()].filter(c=>!owned.has(singletonName(c))),available=newCards.filter(c=>!isLandSlot(c));
 const sourceCards=available.filter(c=>provenance.has(oracleId(c))),order=(a,b)=>printedManaValue(a)-printedManaValue(b)||stable(a.name,b.name);
 const native=c=>types.some(t=>castHasSubtype(c,t));
 const access=sourceCards.filter(c=>accessModel(c).triggers.some(t=>accessFamily==='entry'?t.phase==='entry'&&t.chosen:t.phase==='cast')).sort(order).slice(0,1);
 const castDraw=sourceCards.filter(c=>accessModel(c).triggers.some(t=>t.phase==='cast')).sort(order).slice(0,2);
 const ramp=sourceCards.filter(c=>manaCapacity(c).units>=2&&manaCapacity(c).colorless>=2).sort((a,b)=>manaCapacity(b).units-manaCapacity(a).units||order(a,b)).slice(0,2);
 const fixing=sourceCards.filter(c=>manaCapacity(c).fast&&manaCapacity(c).colorless>=1&&cardModel(c,commander.color_identity||[]).modes.some(m=>m.outputs.some(o=>o.some(t=>/[WUBRG]/.test(t))))).sort(order).slice(0,2);
 const threats=sourceCards.filter(c=>native(c)&&printedManaValue(c)>=7&&printedManaValue(c)<=9&&Number(c.power)>=7).sort(order).slice(0,2);
 // A catalog-supported tutor can supplement source packages. Its exact Oracle
 // and real legal targets are disclosed; zero community appearances stay zero.
 const tutors=available.filter(c=>nativeModel(c).triggers.some(t=>t.kind==='tutor'&&t.destination==='hand'&&built.cards.filter(d=>!isLandSlot(d)&&castHasType(d,'Creature')&&printedManaValue(d)>=(t.filter.minMV||0)).length>=8)).sort(order).slice(0,1);
 const reducers=sourceCards.filter(c=>/colorless spells you cast cost \{\d+\} less/i.test(c.oracle_text||'')).sort(order).slice(0,1);
 const responses=sourceCards.filter(c=>roleEvidence(c).removal==='broad'||roleEvidence(c).shield==='dedicated').sort(order).slice(0,2);
 const landFixes=newCards.filter(c=>isLandSlot(c)&&provenance.has(oracleId(c))).filter(c=>{const m=landManaQuality(c);return m.colors.length>=4&&!m.entersTapped&&!m.restricted&&!m.consumable&&!m.unusable&&!m.needsActivationPayment;}).sort((a,b)=>stable(a.name,b.name)).slice(0,2);
 const discovered={access,castDraw,ramp,fixing,threats,tutors,reducers,responses,landFixes};
 const protections=proposeShadowRepairs({built,pool:[],commander,budget,bracket,source,comboViolation,maxEvaluations:1}).protectedPhysicalCards;
 const protectedNames=new Set([...protections,...base.drawEngines.map(r=>r.card),...base.infrastructure.map(r=>r.card),...built.committedCombos.flatMap(p=>p.cards)].map(n=>singletonName({name:n})));
 // Preserve each native token production/tutor/copy channel, not only generic
 // role counts. Generic bodies remain candidates for coherent replacement.
 for(const c of built.cards){const m=nativeModel(c);if(m.ulalek||m.castCopy||m.multiplier.length||m.cascadeGrant||m.triggers.some(t=>['tokens','tutor','refill'].includes(t.kind)))protectedNames.add(singletonName(c));}
 const rejected=[],accepted=[],screening=[],seen=new Set([challengerSignature(built.cards)]);
 function search(state,family,bundles,round){
  const current=investmentEvidence(state.cards,commander,plan),stateProtected=new Set([...protectedNames,...current.drawEngines.map(r=>singletonName({name:r.card})),...current.infrastructure.map(r=>singletonName({name:r.card}))]);
  const landCuts=state.cards.filter(c=>isLandSlot(c)&&!stateProtected.has(singletonName(c))&&!landManaQuality(c).canC).sort((a,b)=>landManaQuality(a).colors.length-landManaQuality(b).colors.length||Number(landManaQuality(b).entersTapped)-Number(landManaQuality(a).entersTapped)||stable(a.name,b.name)).slice(0,3);
  const spellCuts=state.cards.filter(c=>!isLandSlot(c)&&!stateProtected.has(singletonName(c))).sort((a,b)=>{
   const sa=synergy(a,plan,analysis(a)),sb=synergy(b,plan,analysis(b));return sa.impact-sb.impact||printedManaValue(b)-printedManaValue(a)||stable(a.name,b.name);
  }).slice(0,14);
  const cuts=[...spellCuts,...landCuts];
  const requests=[];for(const bundle of bundles){const add=bundle.filter(c=>c&&!state.cards.some(x=>singletonName(x)===singletonName(c)));if(!add.length||add.length>3||new Set(add).size!==add.length)continue;
   // Incoming bundle gets multiple outgoing sets, but only cheap structural
   // checks pre-screen them. All complete-deck gates still run in investment.
   let n=0;for(const remove of combos(cuts,add.length)){
    const next=[...state.cards.filter(c=>!remove.includes(c)),...add];
    if(next.filter(isLandSlot).length!==state.cards.filter(isLandSlot).length)continue;
    if([commander,...next].reduce((n,c)=>n+priceOf(c),0)>budget+1e-7)continue;
    if(next.filter(c=>manaCapacity(c).units>0).length>Math.max(Number(bracket)===4?13:12,state.cards.filter(c=>manaCapacity(c).units>0).length))continue;
    const e=investmentEvidence(next,commander,plan);
    const targets={fastMana:8,flow:8,answers:7,shields:3,wideShields:1,threats:4,castAnswers:2};
    if(next.filter(isLandSlot).length!==state.cards.filter(isLandSlot).length||e.land.score<current.land.score-1e-7)continue;
    if(e.raw.trueColorless<base.raw.trueColorless||Object.entries(base.vector).some(([k,n])=>e.vector[k]<Math.min(n,targets[k]??n)))continue;
    if(next.filter(c=>manaCapacity(c).units>0).length>Math.max(Number(bracket)===4?13:12,state.cards.filter(c=>manaCapacity(c).units>0).length))continue;
    if([commander,...next].reduce((n,c)=>n+priceOf(c),0)>budget+1e-7)continue;
    requests.push({id:family+':'+round+':'+n,add,remove});if(++n>=8)break;
   }
  }
  if(!requests.length){screening.push({family,round,requests:0,reason:'no outgoing set preserves pre-screened functions/budget/source count'});return [];}
  const found=[];const measured=refinePackageInvestments({built:state,pool:[...built.cards,...Object.values(discovered).flat()],commander,plan,budget,bracket,source,protectionBaseline:built.cards,comboViolation,maxRounds:1,beamWidth:1,maxEvaluations:64,shadowOnly:true,shadowProtectedNames:state.cards.filter(c=>protectedNames.has(singletonName(c))).map(c=>c.name),shadowProposals:requests,
   observeProposal:p=>{const signature=challengerSignature(p.cards),row={family,round,add:p.add,remove:p.remove,cards:p.cards,price:p.price,shadowReasons:p.shadowReasons,productionReason:p.productionReason,before:p.before,after:p.after};
    if(p.shadowReasons.length){rejected.push(row);return;}if(!seen.has(signature)){seen.add(signature);found.push(row);accepted.push(row);}
   }});
  screening.push({family,round,requests:requests.length,evaluated:measured.packageInvestment.evaluated,rejected:measured.packageInvestment.rejected});return found;
 }
 const state={...built,cards:built.cards.map(c=>({...c}))}; // preserve physical slots
 const roots=[];
 roots.push(...search(state,'access-mana',[
  ...access.flatMap(d=>reducers.flatMap(r=>landFixes.map(l=>[d,r,l]))),
  ...access.flatMap(d=>ramp.flatMap(m=>landFixes.map(l=>[d,m,l]))),
  ...access.flatMap(d=>fixing.flatMap(f=>landFixes.map(l=>[d,f,l]))),
  ...access.flatMap(d=>landFixes.map(l=>[d,l]))].slice(0,8),1));
 roots.push(...search(state,'access-interaction',access.flatMap(d=>responses.flatMap(r=>landFixes.map(l=>[d,r,l]))).slice(0,4),1));
 roots.push(...search(state,'tutor-followup',[
  ...tutors.flatMap(t=>ramp.flatMap(m=>threats.map(h=>[t,m,h]))),
  ...tutors.flatMap(t=>reducers.flatMap(r=>landFixes.map(l=>[t,r,l])))].slice(0,6),1));
 // Keep distinct incoming bundles before further changes; stable, no gameplay
 // outcomes or price term determine this mechanical discovery frontier.
 const first=[];const bundles=new Set();for(const r of roots){const k=r.family+':'+r.add.map(singletonName).sort().join('|');if(bundles.has(k))continue;bundles.add(k);first.push(r);}
 for(const family of ['access-mana','tutor-followup']){
  const root=first.find(r=>r.family===family);if(!root)continue;
  const incoming=family==='access-mana'?tutors.flatMap(t=>reducers.flatMap(r=>threats.map(h=>[t,r,h]))):access.flatMap(a=>castDraw.map(d=>[a,d]));
  search({...built,cards:root.cards},family,incoming.slice(0,2),2);
 }
 const candidates=[];
 for(const family of ['access-mana','tutor-followup','access-interaction']){const r=accepted.find(r=>r.family===family&&r.round===2)||accepted.find(r=>r.family===family&&r.round===1);if(r&&!candidates.some(c=>challengerSignature(c.cards)===challengerSignature(r.cards)))candidates.push(r);}
 for(const family of ['access-mana','tutor-followup']){const r=accepted.find(r=>r.family===family&&r.round===1);if(r&&!candidates.some(c=>challengerSignature(c.cards)===challengerSignature(r.cards)))candidates.push(r);}
 return {candidates:candidates.slice(0,maxCandidates),discovered:Object.fromEntries(Object.entries(discovered).map(([k,cs])=>[k,cs.map(c=>({id:oracleId(c),name:c.name,price:priceOf(c),sources:provenance.get(oracleId(c))||[],basis:provenance.has(oracleId(c))?'cached same-commander/bracket source':'catalog Oracle tutor with legal deck targets'}))])),accepted,rejected,screening,protectedNames:[...protectedNames],cohort:cohort.map(d=>d.key),limits:{incomingPerPackage:3,rounds:2,requestsPerCall:64,rootBundles:18,finalCandidates:maxCandidates},productionSelectionChanged:false};
}
