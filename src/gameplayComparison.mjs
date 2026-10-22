/** Terminal-aware conditional-model evidence, never a deck-strength score or
 * estimated real-game win probability. Unseen future turns remain absent. */
import {pairedInterval,nativeCoverageIncomplete} from './gameplayShadow.mjs';
import {nativeModel} from './gameplayNative.mjs';
import {accessModel} from './gameplayAccess.mjs';
const unknown=s=>['search-unknown','unsupported-rule-unknown'].includes(s.status);
export function summarizeExecution(run,{commander,cards,decision='conservative',pre=[]}={}){
 if(run.turns!==8)throw Error('Eight-turn evaluation contract required');
 if(!run.stage5||!run.outlets)throw Error('Audited Stage 5 execution required');
 const nativeUnknown=run.trace.filter(e=>e.event==='native-unknown'),bounds=run.trace.filter(e=>['native-bound','action-bound'].includes(e.event));
 const searchUnknown=run.nativeExecution.boundedUnknown||run.stats.boundHits>0||run.stats.actionBoundHits>0;
 const status=searchUnknown?'search-unknown':nativeUnknown.length?'unsupported-rule-unknown':run.outlets.won?'conditional-lethal':run.lost?'model-loss':run.observations.at(-1)?.turn===run.turns?'completed-t8':'search-unknown';
 const endTurn=run.outlets.lethalTurn||run.trace.find(e=>e.event==='empty-draw'||e.event==='model-loss')?.turn||run.observations.at(-1)?.turn||0;
 const unknownFrom=searchUnknown?(run.stats.boundHits>0||run.stats.actionBoundHits>0?1:Math.min(...bounds.map(e=>e.turn),run.observations.at(-1)?.turn||1)):nativeUnknown[0]?.turn??null;
 const defs=new Map(cards.map((c,i)=>['deck-'+i,c]));defs.set('commander',commander);const copies=new Set(),objects=new Map(),copySource=new Map(),engineValue={},deployments=[];
 const use=(id,kind,n=1)=>{const name=defs.get(id)?.name||id,entry=engineValue[name]??={};entry[kind]=(entry[kind]||0)+n;};
 for(const e of run.trace){
  if(e.event==='copy-created'){defs.set(e.id,defs.get(e.original));copies.add(e.id);copySource.set(e.id,objects.get(e.by)?.source);}
  if(e.event==='token-created')defs.set(e.id,e.card);
  if(e.event==='stack-push')objects.set(e.id,e);
  if(e.event==='permanent-resolved'){const c=defs.get(e.id),m=nativeModel(c),a=accessModel(c);if(m.cascadeGrant||m.castCopy||m.multiplier.length||m.triggers.some(t=>t.kind==='tutor')||a.triggers.length||a.abilities.length||a.top)deployments.push({turn:e.turn,id:e.id,card:c.name,copy:copies.has(e.id)});}
  if(e.event==='access-draw')use(e.source,'draw');
  if(e.event==='native-tutor'&&e.found)use(e.source,e.destination==='hand'?'tutorToHand':'tutorToTop');
  if(e.event==='cast-paid'&&e.origin==='cascade'){const grant=objects.get(e.permission)?.effect?.grantSource;if(grant)use(grant,'cascadeCast');}
  if(e.event==='native-trigger-paid')use(e.source,'paidCopy');
  if(e.event==='outlet-damage')use(e.source,'damage',e.amount);
  const id=e.id||e.source;if(['permanent-resolved','copy-ceased','ritual-resolved'].includes(e.event)&&copies.has(id)&&copySource.get(id))use(copySource.get(id),'resolvedSpellCopy');
 }
 const landmarks={};for(const turn of [3,5,7]){
  const observation=run.observations.find(o=>o.turn===turn),observed=!!observation&&(!unknownFrom||unknownFrom>turn)&&(status==='completed-t8'||endTurn>turn);
  landmarks[turn]=observed?{observed:true,commander:Number(observation.commanderDeployed),netCards:observation.netAccessibleCards,draws:observation.effectDraws,hand:observation.handSize,paidCopies:run.trace.filter(e=>e.turn<=turn&&e.event==='native-trigger-paid').length,payableThreats:observation.threatsBeforeActions.filter(h=>h.status==='paid').length}: {observed:false,reason:status};
 }
 const costs=run.trace.filter(e=>['cast-paid','native-trigger-paid','activated-access-paid','outlet-paid'].includes(e.event));
 const completedT8=status==='completed-t8'?run.observations.at(-1):null;
 return {seed:run.seed,policy:run.policy,decision,status,endTurn,lethalTurn:run.outlets.won?run.outlets.lethalTurn:null,modelLoss:run.lost,unknownFrom,conditionalModelOnly:true,nativeCoverageIncomplete:nativeCoverageIncomplete(commander),
  coverage:{unparsedNativeCards:run.nativeExecution.unknown.length,unmodeledAccessClauses:run.coverage.unmodeledAccessClauses,runtimeUnknown:nativeUnknown.map(e=>({turn:e.turn,reason:e.reason})),paymentBounds:run.stats.boundHits,actionBounds:run.stats.actionBoundHits,nativeBound:run.nativeExecution.boundedUnknown},
  commanderTurn:run.stats.commanderDeploymentTurn,landmarks,
  t8:completedT8?{hand:completedT8.handSize,netCards:completedT8.netAccessibleCards,draws:completedT8.effectDraws,topCasts:completedT8.topCasts}:null,
  prefix:{draws:run.stats.effectDraws,topCasts:run.stats.topCasts,paidCopies:run.stats.native.paidTriggers,copyMana:run.trace.filter(e=>e.event==='native-trigger-paid').reduce((n,e)=>n+e.spent.length,0),actionMana:costs.reduce((n,e)=>n+e.spent.length,0),damage:run.outlets.totalDamage,resolvedCopies:run.stats.native.resolvedCopies,cascadeCasts:run.stats.native.castsFromCascade,tutorHand:run.stats.native.tutorCardsToHand,tutorTop:run.stats.native.tutorCardsToTop},
  deployments,engineValue,followups:run.trace.filter(e=>e.event==='native-followup-snapshot').map(e=>({turn:e.turn,phase:e.phase,hand:e.hand})),competition:pre.flatMap(p=>p.hand.filter(h=>h.status==='paid'&&h.triggerCosts.length&&h.jointStatus!=='paid').map(h=>({turn:p.turn,card:h.card,status:h.jointStatus}))) };
}
/** All unknown pairs remain interval-valued. Bootstrap both identification
 * endpoints with the same resamples; never impute unknown as a failed event. */
export function pairedEventInterval(before,after,event){
 if(before.length!==after.length||!before.length)throw Error('Paired event sample required');
 const bounds=s=>unknown(s)?[0,1]:[Number(event(s)),Number(event(s))];
 const lo=[],hi=[];let uncertain=0;for(let i=0;i<before.length;i++){
  if(before[i].seed!==after[i].seed||before[i].policy!==after[i].policy||before[i].decision!==after[i].decision)throw Error('Event identity pairing mismatch');
  const [bl,bh]=bounds(before[i]),[al,ah]=bounds(after[i]);lo.push(al-bh);hi.push(ah-bl);if(unknown(before[i])||unknown(after[i]))uncertain++;
 }
 const l=pairedInterval(lo),h=pairedInterval(hi);return {n:before.length,unknownPairs:uncertain,meanRange:[l.mean,h.mean],lower:l.lower,upper:h.upper,interpretation:'Paired conditional-model event incidence, not a real-game win probability; unknown pairs retain full identification bounds'};
}
export function compareExecutionCohorts(before,after){
 if(before.length!==after.length||!before.length)throw Error('Paired execution sample required');
 const keys=[...new Set(before.map(r=>r.decision+'|'+r.policy))],rows=[];
 for(const key of keys){const [decision,policy]=key.split('|'),b=before.filter(r=>r.decision===decision&&r.policy===policy),a=after.filter(r=>r.decision===decision&&r.policy===policy);
  const counts=xs=>Object.fromEntries(['completed-t8','conditional-lethal','model-loss','search-unknown','unsupported-rule-unknown'].map(k=>[k,xs.filter(s=>s.status===k).length]));
  const terminal={lethalBy6:pairedEventInterval(b,a,s=>s.status==='conditional-lethal'&&s.lethalTurn<=6),lethalBy8:pairedEventInterval(b,a,s=>s.status==='conditional-lethal'),modelLoss:pairedEventInterval(b,a,s=>s.status==='model-loss')};
  const landmarks={};for(const turn of [3,5,7]){const pairs=b.map((x,i)=>[x,a[i]]),complete=pairs.filter(([x,y])=>x.landmarks[turn].observed&&y.landmarks[turn].observed),omitted=pairs.filter(([x,y])=>!x.landmarks[turn].observed||!y.landmarks[turn].observed);
   landmarks[turn]={n:complete.length,total:b.length,omitted:omitted.map(([x,y])=>({seed:x.seed,before:x.status,after:y.status})),conditionalSubset:true,intervals:Object.fromEntries(['commander','netCards','draws','paidCopies','payableThreats'].map(k=>[k,pairedInterval(complete.map(([x,y])=>y.landmarks[turn][k]-x.landmarks[turn][k]))]))};
  }
  rows.push({decision,policy,before:counts(b),after:counts(a),terminal,landmarks});
 }
 return {rows,nativeAbstention:before.concat(after).some(r=>r.nativeCoverageIncomplete),interpretation:'Terminal events use every pair with explicit uncertainty. Nonterminal landmark contrasts are prespecified conditional subsets with disclosed denominators, not complete-deck causal strength estimates.'};
}
