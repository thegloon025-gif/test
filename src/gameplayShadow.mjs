/** Stage 3 experiments only. Nothing in production imports this module. */
import {createHash} from 'node:crypto';
import {singletonName} from './deckValidation.mjs';
import {oracleId,priceOf,castOracle} from './cards.mjs';
import {planFor,analysis,synergy} from './mechanics.mjs';
import {refinePackageInvestments} from './packageInvestment.mjs';
import {evaluateGameplay} from './gameplayState.mjs';
import {auditGameplayTrace} from './gameplayZoneAudit.mjs';
import {planManaPayments,parseManaCost} from './gameplayMana.mjs';
import {GAMEPLAY_POLICIES} from './gameplayPilot.mjs';
import {strategyChannels} from './gameplayPilot.mjs';
import {cardModel,cardSubtypes} from './gameplayCards.mjs';
import {accessModel} from './gameplayAccess.mjs';
import {planTypes} from './engineSupport.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const stable=(a,b)=>a<b?-1:a>b?1:0;
export const SHADOW_SCHEMA='gameplay-shadow-v1';
export const SHADOW_POLICIES=Object.freeze([...GAMEPLAY_POLICIES]);
/** Archives contain both string and structured template matches. Fail closed
 * on an unknown shape instead of silently dropping a committed template. */
export function archivedShadowCommitments(comboPlan={}){
 const merged=new Map();
 for(const p of [...(comboPlan.selected||[]),...(comboPlan.inventoryCombinations||[])]){
  const templates=(p.templateMatches||[]).flatMap(t=>{if(typeof t==='string')return [t];if(typeof t?.card==='string')return [t.card];if(Array.isArray(t?.cards)&&t.cards.length)return t.cards;throw Error('Unknown archived combo commitment shape');});
  if([...(p.namedCards||[]),...templates].some(n=>typeof n!=='string'||!n.trim()))throw Error('Unknown archived combo commitment shape');
  const cards=merged.get(p.id)||new Set();for(const n of [...(p.namedCards||[]),...templates])cards.add(n);merged.set(p.id,cards);
 }
 return [...merged].map(([id,cards])=>({id,cards:[...cards]}));
}
/** Independent random priorities for physical identities, not deck positions.
 * Common cards retain relative order across decks; replacements are not forced
 * into the cut's slot. Identical copies are exchangeable occurrence labels. */
export function commonIdentityOrder(cards,seed){
 const counts=new Map();return cards.map((c,index)=>{const name=singletonName(c);if(!name)throw Error('Missing card identity');const occurrence=counts.get(name)||0;counts.set(name,occurrence+1);const identity=JSON.stringify([name,occurrence]);return {index,identity,priority:hash(JSON.stringify([SHADOW_SCHEMA,String(seed),identity]))};})
 .sort((a,b)=>stable(a.priority,b.priority)||stable(a.identity,b.identity)).map(x=>x.index);
}
export function shadowSeeds({training=8,holdout=16,namespace='gameplay-shadow-2026-10-22'}={}){
 if(!Number.isInteger(training)||!Number.isInteger(holdout)||training<2||holdout<2||training>64||holdout>64)throw Error('Shadow sample bound');
 return {training:Array.from({length:training},(_,i)=>namespace+':training:'+i),holdout:Array.from({length:holdout},(_,i)=>namespace+':holdout:'+i)};
}
export function pairedInterval(values){
 if(!values.length||values.some(v=>!Number.isFinite(v)))return {status:'unknown',n:values.length};
 let state=2718281;const means=[];for(let b=0;b<2000;b++){let sum=0;for(let i=0;i<values.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;sum+=values[Math.floor(state/4294967296*values.length)];}means.push(sum/values.length);}means.sort((a,b)=>a-b);
 return {status:'observed',n:values.length,mean:values.reduce((s,x)=>s+x,0)/values.length,lower:means[49],upper:means[1949],positive:values.filter(x=>x>0).length,negative:values.filter(x=>x<0).length,tied:values.filter(x=>x===0).length,allTies:values.every(x=>x===0)};
}
/** Relax cost pips only as a diagnostic counterfactual, never as a payment. */
export function diagnosePayment(state,probe){
 if(probe.status==='unknown')return {kind:'coverage-unknown',reason:probe.reason};
 if(probe.status==='paid')return {kind:'payable-before-actions'};
 const pips=parseManaCost(probe.cost,probe.reduction);if(!pips)return {kind:'coverage-unknown',reason:'unparsed cost'};
 const test=cost=>planManaPayments(state,[{label:'diagnostic-only',cost,context:probe.context}],{optimized:true,maxStates:4000}).status;
 // Keep C while relaxing colors, then keep colors while relaxing C. A
 // successful relaxation identifies a payment constraint, not a legal line.
 const relax=predicate=>pips.map(p=>p.includes('*')||predicate(p)?'{1}':'{'+p.join('/')+'}').join('');
 const colors=test(relax(p=>!p.includes('C'))),colorless=test(relax(p=>p.length===1&&p[0]==='C')),generic=test('{'+pips.length+'}');
 if([colors,colorless,generic].includes('unknown'))return {kind:'coverage-unknown',reason:'diagnostic payment search bound'};
 return {kind:colors==='paid'?'colored-payment-constraint':colorless==='paid'?'true-colorless-payment-constraint':generic==='paid'?'combined-pip-constraint':'supported-mana-shortfall',counterfactual:true};
}
export function summarizeShadowRun(run,pre,{commander,cards=[]}={}){
 const final=run.observations.at(-1),commanderTurn=run.stats.commanderDeploymentTurn;
 const diagnostics=pre.map(p=>({turn:p.turn,commander:p.commander?{...p.commander,diagnosis:diagnosePayment(p.state,p.commander)}:null,
  hand:p.hand.map(h=>({...h,diagnosis:diagnosePayment(p.state,h)})),engines:p.engines}));
 const lastByTurn=new Map(run.observations.map(o=>[o.turn,o]));
 const exhausted=[];for(const p of diagnostics)for(const h of [p.commander,...p.hand].filter(Boolean)){
  const end=lastByTurn.get(p.turn)?.missed.find(m=>m.id===h.id&&m.kind!=='activation');if(h.status==='paid'&&end?.status==='blocked')exhausted.push({turn:p.turn,card:h.card,kind:'post-action-resources-spent',commanderPayable:run.trace.some(e=>e.turn===p.turn&&e.event==='decision'&&e.commanderPayable)});
 }
 return {seed:run.seed,policy:run.policy,metrics:{modelSurvival:Number(!run.lost),commanderByT5:Number(commanderTurn!==null&&commanderTurn<=5),commanderByT8:Number(commanderTurn!==null),commanderTempo:commanderTurn===null?0:9-commanderTurn,
  netAccess:final?.netAccessibleCards??null,realizedDraws:run.stats.effectDraws,topCasts:run.stats.topCasts,
  optionalPayments:[commander,...cards].filter(Boolean).some(c=>cardModel(c,commander?.color_identity||[]).castPayment)?run.stats.optionalPayments.filter(p=>!p.copy).length:null,
  supportedEngineUses:run.stats.usedEngines.length,
  observedLargeNativeCasts:run.stats.casts.filter(c=>!c.commander&&run.observations.some(o=>o.turn===c.turn&&o.threatsBeforeActions.some(t=>t.card===c.card))).length},
  commanderTurn,coverage:run.coverage,unknown:run.unknown.filter(u=>u.access.length||u.other.length),boundHits:run.stats.boundHits,actionBoundHits:run.stats.actionBoundHits,lost:run.lost,
  diagnostics,postActionExhaustion:exhausted,decisions:run.trace.filter(e=>e.event==='decision'),
  turns:run.observations.map(o=>({turn:o.turn,commander:o.commanderDeployed,hand:o.handSize,netAccess:o.netAccessibleCards,draws:o.effectDraws,topCasts:o.topCasts,manaBefore:o.manaBeforeActions,manaAfter:o.manaRemaining,engines:o.engines,threats:o.threatsBeforeActions})),casts:run.stats.casts,optionalPayments:run.stats.optionalPayments};
}
/** Exact records, model fingerprint, seed and pilot all enter the bounded LRU.
 * The cache contains summaries, not mutable game state. Audit each miss and
 * replay deterministically; never store failed/unaudited traces. */
export function createShadowEvaluator({modelFingerprint,maxEntries=128,replay=true,nativeExecution=false,nativeStage5=false,nativeDecisionPolicy='copy-first'}={}){
 if(!modelFingerprint||!Number.isInteger(maxEntries)||maxEntries<1||maxEntries>1024)throw Error('Explicit model fingerprint and bounded cache required');
 const cache=new Map(),stats={evaluations:0,hits:0,evictions:0,audits:0,replays:0,runtimeMs:0,keyMs:0,simulationMs:0,auditMs:0,replayMs:0,summaryMs:0,maxEntriesObserved:0};
 function evaluate({commander,cards,seed,policy,includeTrace=false}){
  if(!SHADOW_POLICIES.includes(policy))throw Error('Fixed shadow policy required');
  const keyStart=performance.now();
  const record=c=>({id:oracleId(c),name:c.name,price:priceOf(c),record:c});
  const key=hash(JSON.stringify({schema:SHADOW_SCHEMA,modelFingerprint,commander:record(commander),cards:cards.map(record),seed,policy,mulligan:'none',...(nativeExecution?{nativeExecution:true}:{}),...(nativeStage5?{nativeStage5:true,nativeDecisionPolicy}:{})}));
  stats.keyMs+=performance.now()-keyStart;
  if(cache.has(key)&&!includeTrace){const value=cache.get(key);cache.delete(key);cache.set(key,value);stats.hits++;return structuredClone(value);}
  const start=performance.now(),pre=[],options={commander,cards,seed,policy,order:commonIdentityOrder(cards,seed),mulligan:'none',...(nativeExecution?{nativeExecution:true}:{}),...(nativeStage5?{nativeStage5:true,nativeDecisionPolicy}:{})};
  const simulationStart=performance.now(),run=evaluateGameplay({...options,onPreAction:p=>pre.push(p)});stats.simulationMs+=performance.now()-simulationStart;
  const auditStart=performance.now(),audit=auditGameplayTrace(run,commander,cards);stats.auditMs+=performance.now()-auditStart;if(!audit.valid)throw Error(JSON.stringify(audit));stats.audits++;
  if(replay){const replayStart=performance.now(),repeated=evaluateGameplay(options);if(JSON.stringify(repeated)!==JSON.stringify(run))throw Error('Diagnostic observation changed deterministic trace');stats.replayMs+=performance.now()-replayStart;stats.replays++;}
  const summaryStart=performance.now(),summary=summarizeShadowRun(run,pre,{commander,cards});
  if(nativeExecution){summary.native=run.stats.native;summary.nativeExecution=run.nativeExecution;summary.boundHits+=run.stats.native.boundHits;
   if(run.nativeExecution.boundedUnknown||run.lost)summary.metrics=Object.fromEntries(Object.keys(summary.metrics).map(k=>[k,k==='modelSurvival'&&run.lost?0:null]));
  }
  if(nativeStage5){summary.stage5=run.stage5;summary.outlets=run.outlets;summary.followup=run.trace.filter(e=>e.event==='native-followup-snapshot');
   if(run.outlets.won)summary.metrics=Object.fromEntries(Object.keys(summary.metrics).map(k=>[k,k==='modelSurvival'?1:null]));
  }
  const result={key,audit,summary};stats.summaryMs+=performance.now()-summaryStart;stats.evaluations++;stats.runtimeMs+=performance.now()-start;
  cache.set(key,result);if(cache.size>maxEntries){cache.delete(cache.keys().next().value);stats.evictions++;}stats.maxEntriesObserved=Math.max(stats.maxEntriesObserved,cache.size);return structuredClone({...result,...(includeTrace?{run}:{})});
 }
 return {evaluate,stats};
}
export function compareShadowRuns(before,after){
 if(before.length!==after.length||!before.length)throw Error('Unpaired samples');
 for(let i=0;i<before.length;i++)if(before[i].seed!==after[i].seed||before[i].policy!==after[i].policy)throw Error('Seed/pilot pairing mismatch');
 const byPolicy={};for(const policy of SHADOW_POLICIES){const pairs=before.map((b,i)=>({b,a:after[i]})).filter(p=>p.b.policy===policy);if(!pairs.length)throw Error('Every fixed pilot is required');
  byPolicy[policy]=Object.fromEntries(Object.keys(pairs[0].b.metrics).map(k=>[k,pairedInterval(pairs.map(({b,a})=>Number.isFinite(a.metrics[k])&&Number.isFinite(b.metrics[k])?a.metrics[k]-b.metrics[k]:NaN))]));
 }
 return {byPolicy,boundedUnknownRuns:{before:before.filter(r=>r.boundHits||r.actionBoundHits).length,after:after.filter(r=>r.boundHits||r.actionBoundHits).length},unknownRuns:{before:before.filter(r=>r.unknown.length||r.boundHits||r.actionBoundHits).length,after:after.filter(r=>r.unknown.length||r.boundHits||r.actionBoundHits).length},
  interpretation:'Paired conditional-model observations, not a power score; absent unsupported outcomes are unknown. No pilot maximization.'};
}
/** Supported pre-deployment evidence across pilots; these are repair
 * hypotheses, not strength ratings or proofs of an optimal line. */
export function diagnoseShadowCohort(runs){
 const seeds=[...new Set(runs.map(r=>r.seed))],crossPilot=[],pilotSensitive=[],coverageUnknown=[],threats={};
 for(const seed of seeds){const group=SHADOW_POLICIES.map(policy=>runs.find(r=>r.seed===seed&&r.policy===policy));if(group.some(r=>!r))throw Error('Incomplete diagnostic pilot cohort');
  const delayed=group.filter(r=>r.commanderTurn===null||r.commanderTurn>5);
  const probes=group.map(r=>r.diagnostics.find(t=>t.turn===5)?.commander);
  if(probes.some(p=>p?.status==='unknown')||group.some(r=>r.boundHits||r.actionBoundHits))coverageUnknown.push(seed);
  else if(delayed.length===SHADOW_POLICIES.length&&probes.every(p=>p?.status==='blocked'))crossPilot.push({seed,kinds:probes.map(p=>p.diagnosis.kind)});
  else if(delayed.length&&delayed.length<SHADOW_POLICIES.length)pilotSensitive.push({seed,turns:group.map(r=>({policy:r.policy,turn:r.commanderTurn}))});
 }
 let noRealizedAccess=0,triggerCompetition=0,blockedEngineSnapshots=0,postActionSpent=0;
 for(const r of runs){if(r.metrics.realizedDraws===0&&r.metrics.topCasts===0)noRealizedAccess++;postActionSpent+=r.postActionExhaustion.length;
  for(const t of r.diagnostics){for(const h of t.hand)if(h.status==='paid'&&h.triggerCosts.length&&h.jointStatus==='blocked')triggerCompetition++;
   blockedEngineSnapshots+=t.engines.filter(e=>e.supported&&e.ready==='blocked').length;}
  for(const t of r.turns)for(const h of t.threats){const row=threats[h.card]??={seen:0,paid:0,blocked:0,unknown:0};row.seen++;row[h.status]=(row[h.status]||0)+1;}
 }
 return {seedCount:seeds.length,runCount:runs.length,crossPilotT5ResourceBottlenecks:crossPilot,pilotSensitiveDelays:pilotSensitive,coverageUnknownSeeds:coverageUnknown,
  noRealizedSupportedAccessRuns:noRealizedAccess,triggerCompetitionSnapshots:triggerCompetition,blockedSupportedEngineSnapshots:blockedEngineSnapshots,postActionSpentSnapshots:postActionSpent,largeNativeThreats:threats,
  interpretation:'T5 cross-pilot blocked payments support a resource-repair hypothesis within this model. Pilot-sensitive delays are separate. Zero realized supported access does not prove the real deck lacks draw; unsupported native effects remain unknown. End-of-action exhaustion is not a construction penalty.'};
}
/** No new score: a conservative Pareto statement on measured supported
 * endpoints, across every pilot and both predeclared seed partitions. */
export function shadowVerdict(training,holdout,{nativeCoverageIncomplete=false}={}){
 if(nativeCoverageIncomplete)return {status:'abstain-native-coverage',reason:'Native execution is incomplete; partial probes cannot reject or endorse this strategy'};
 if([training,holdout].some(c=>c.boundedUnknownRuns?.before||c.boundedUnknownRuns?.after))return {status:'abstain-search-bound',reason:'Payment or action bound leaves paired outcomes unresolved'};
 const endpoints=['modelSurvival','commanderByT5','commanderByT8','commanderTempo','netAccess','optionalPayments'];
 const rows=[training,holdout].flatMap(c=>SHADOW_POLICIES.flatMap(p=>endpoints.map(k=>c.byPolicy[p][k])));
 if(rows.some(r=>r.status!=='observed'))return {status:'abstain-unknown',reason:'Missing supported measurements'};
 if(rows.some(r=>r.upper<0))return {status:'rejected-supported-regression',reason:'At least one fixed pilot/partition has an adverse paired interval'};
 const strict=SHADOW_POLICIES.every(p=>endpoints.some(k=>training.byPolicy[p][k].lower>0&&holdout.byPolicy[p][k].lower>0));
 if(strict&&rows.every(r=>r.lower>=0))return {status:'supported-shadow-improvement',reason:'Supported endpoints improve in both partitions for every pilot, with no observed interval loss; unknown mechanics still limit interpretation'};
 return {status:'inconclusive-tradeoffs',reason:'Intervals, pilot disagreements or ties do not support a robust complete-deck improvement'};
}
export function nativeCoverageIncomplete(commander){return /ninjutsu|combat damage|\bdies\b|sacrifice|targets? only|targets? only a single|targets? only (?:this|that)/i.test(castOracle(commander));}
/** Uses the existing proposal schedule/gates, never the returned winner. */
export function proposeShadowRepairs({built,pool,commander,budget,bracket,source=null,comboViolation=()=>null,maxEvaluations=40}={}){
 const proposals=[],plan=planFor(commander),protectUnknown=nativeCoverageIncomplete(commander);
 // The historical proposer removes object references, so repeated basics
 // sharing one catalog object need separate physical slots in shadow input.
 // This adapter does not change the production proposer or any card record.
 const refs=new Set();built={...built,cards:built.cards.map(c=>{if(refs.has(c))return {...c};refs.add(c);return c;})};
 const protectedNative=new Set(protectUnknown?built.cards.filter(c=>synergy(c,plan,analysis(c)).impact>=4).map(singletonName):[]);
 const nativeTypes=planTypes(plan);if(!nativeTypes.length)nativeTypes.push(...cardSubtypes(commander));
 const nativeEngines=new Set(built.cards.filter(card=>strategyChannels({card,model:cardModel(card,commander.color_identity||[]),access:accessModel(card)},nativeTypes).some(c=>c.native)).map(singletonName));
 // Incomplete parsing must not make a conditional four-mana producer or an
 // unsupported native trigger look like expendable filler. Preserve it;
 // estimating how often its condition works is a separate future task.
 const highOutput=new Set(built.cards.filter(c=>cardModel(c,commander.color_identity||[]).modes.some(m=>m.outputs.some(o=>o.length>=2))||castOracle(c).split('\n').some(line=>/\{T\}[^:]*:\s*Add/i.test(line)&&(/add (?:\{[WUBRGC]\}){2,}|add (?:two|three|four|five)|for each|instead/i.test(line)))).map(singletonName));
 const unknownNativeEngines=new Set(built.cards.filter(c=>cardSubtypes(c).some(t=>nativeTypes.includes(t))&&/whenever|at the beginning|search your library|\bcascade\b/i.test(castOracle(c))).map(singletonName));
 const shadowProtectedNames=built.cards.filter(c=>[protectedNative,nativeEngines,highOutput,unknownNativeEngines].some(s=>s.has(singletonName(c)))).map(c=>c.name);
 const result=refinePackageInvestments({built,pool,commander,budget,bracket,source,comboViolation,maxRounds:1,beamWidth:1,maxEvaluations,shadowOnly:true,shadowProtectedNames,
  observeProposal:p=>{const reasons=[...p.shadowReasons];if(p.remove.some(c=>protectedNative.has(singletonName(c))))reasons.push('unmodeled native strategy support');
   if(p.remove.some(c=>nativeEngines.has(singletonName(c))))reasons.push('distinct native deployment engine');
   if(p.remove.some(c=>highOutput.has(singletonName(c))))reasons.push('high-output mana capability (including conditional)');
   if(p.remove.some(c=>unknownNativeEngines.has(singletonName(c))))reasons.push('native trigger/tutor coverage protection');
   proposals.push({...p,id:'repair-'+String(proposals.length+1).padStart(2,'0'),shadowReasons:[...new Set(reasons)],eligible:reasons.length===0});}});
 return {proposals,discovery:result.packageInvestment.discovery,screening:result.packageInvestment.rejected,limits:result.packageInvestment.limits,protectedNative:[...protectedNative],protectedPhysicalCards:shadowProtectedNames,productionSelectionChanged:false};
}
