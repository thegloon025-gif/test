/** Shadow-only opportunity-conditioned observations. No card insertion, hand
 * scripting, deck score or production selection. Conditioning is on state
 * before intervention, never on a favorable outcome. */
import {createHash} from 'node:crypto';
import {pairedInterval} from './gameplayShadow.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function opportunityPair(control,intervention){
 if(!control.stage8||!intervention.stage8||control.seed!==intervention.seed||control.policy!==intervention.policy||hash(control.order)!==hash(intervention.order))throw Error('Common complete-deck state inputs required');
 const cp=intervention.trace.findIndex(e=>e.event==='disruption-checkpoint');
 if(cp<0)return {status:intervention.stage7.suspendedUnknown?'unknown':'no-opportunity-before-horizon',turn:null,followup:null};
 if(hash(control.trace.slice(0,cp))!==hash(intervention.trace.slice(0,cp)))throw Error('Intervention changed the pre-opportunity trajectory');
 const event=intervention.trace[cp],done=intervention.trace.find(e=>e.event==='disruption-complete'&&e.id===event.spec.id),unknown=intervention.trace.find(e=>e.event==='disruption-unknown');
 const targetTurn=event.turn+2,valid=(run,t)=>!run.trace.some(e=>e.turn<=t&&['native-unknown','disruption-unknown','native-bound','action-bound','empty-draw','model-loss','opponent-eliminated'].includes(e.event));
 const a=control.observations.find(o=>o.turn===targetTurn),b=intervention.observations.find(o=>o.turn===targetTurn),followup=a&&b&&valid(control,targetTurn)&&valid(intervention,targetTurn)?{turn:targetTurn,commander:Number(b.commanderDeployed)-Number(a.commanderDeployed),netCards:b.netAccessibleCards-a.netAccessibleCards,draws:b.effectDraws-a.effectDraws}:null;
 return {status:unknown?'unknown':!done?.removed.length?'protected-no-removal':'applied',turn:event.turn,prefixSHA256:hash(control.trace.slice(0,cp)),removed:done?.removed||[],survivors:done?.survivors||[],followup,censoring:followup?null:targetTurn>8?'two-turn-window-exceeds-t8':'unknown-or-terminal-or-incomplete-window'};
}
export function summarizeOpportunityPairs(pairs){
 const usable=pairs.filter(p=>p.followup),n=pairs.length,k=pairs.filter(p=>p.turn!==null).length;
 // Wilson interval describes this sampled pilot/model opportunity incidence,
 // not a tabletop probability. Seeds, not policies/scenarios, are sampling units.
 const z=1.96,den=1+z*z/n,center=(k/n+z*z/(2*n))/den,half=z*Math.sqrt(k/n*(1-k/n)/n+z*z/(4*n*n))/den;
 return {n,opportunities:k,opportunityInterval:n?[Math.max(0,center-half),Math.min(1,center+half)]:null,statuses:Object.fromEntries([...new Set(pairs.map(p=>p.status))].map(s=>[s,pairs.filter(p=>p.status===s).length])),conditionalTwoTurnPairs:usable.length,conditionalDifferences:Object.fromEntries(['commander','netCards','draws'].map(key=>[key,pairedInterval(usable.map(p=>p.followup[key]))])),limitations:'Opportunity incidence and conditional response are separate; paired conditional differences omit explicitly censored/unknown windows. Policies share seeds: do not pool as independent games. No real-game or full-strategy claim.'};
}
