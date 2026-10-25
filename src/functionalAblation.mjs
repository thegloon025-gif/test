/** Shared dependency analysis is structural; potential paths aren't funded execution. */
import {runGoldfish} from './functionalGoldfish.mjs';
export function dependencyAnalysis(ledger){
 const jobs=ledger.cards.flatMap(c=>c.jobs),byId=new Map(jobs.map(j=>[j.id,j])),byName=new Map();
 for(const j of jobs){const xs=byName.get(j.card)||[];xs.push(j.sharedDependency);byName.set(j.card,xs);}
 const obligations=ledger.obligations.map(o=>{
  const groups=(o.satisfiedBy||[]).map(id=>byId.has(id)?[byId.get(id).sharedDependency]:byName.get(id)||[]).filter(x=>x.length);
  const dependencies=[...new Set(groups.flat())];return {id:o.id,status:o.status,possiblePhysicalProviders:dependencies,nominalLinks:groups.length,distinctPhysicalProviders:dependencies.length,independence:'unknown: shared mana, material, targets and timing not discharged'};
 });
 const shared=ledger.cards.filter(c=>obligations.filter(o=>o.possiblePhysicalProviders.includes(c.slot)).length>1).map(c=>({slot:c.slot,obligations:obligations.filter(o=>o.possiblePhysicalProviders.includes(c.slot)).map(o=>o.id)}));
 return {obligations,shared,warning:'Counts collapse shared physical cards, not prove independent finishing lines. No required quota.'};
}
export function pairedAblation(input,{disabled=[],...protocol}={}){
 const before=runGoldfish(input,protocol),after=runGoldfish(input,{...protocol,disabled});
 const endpoints=r=>({commanderByHorizon:Number(r.commanderTurn!==null),draw:r.observations.reduce((n,t)=>n+t.immediateDraw,0),casts:r.observations.reduce((n,t)=>n+t.throughput,0),missedLand:r.observations.filter(t=>!t.landDrop).length});
 const differences=before.runs.map((r,i)=>Object.fromEntries(Object.entries(endpoints(r)).map(([key,value])=>[key,endpoints(after.runs[i])[key]-value])));
 const summary=Object.fromEntries(Object.keys(differences[0]).map(k=>{const xs=differences.map(d=>d[k]),mean=xs.reduce((a,b)=>a+b,0)/xs.length,se=xs.length>1?Math.sqrt(xs.reduce((n,x)=>n+(x-mean)**2,0)/(xs.length-1)/xs.length):null;return [k,{meanDelta:mean,approximate95:se===null||se===0?null:[mean-1.96*se,mean+1.96*se],nonzeroPairs:xs.filter(x=>x!==0).length}];}));
 return {disabled,protocol,summary,before,after,interpretation:'Identical physical deck and card-identity shuffle coupling. Disabled effects are counterfactual, not legal Oracle changes or replacements. No detected difference is not proof of uselessness. Approximate intervals describe sampled model/pilot only.'};
}
/** Disable graph edges, not physical cards/Oracle. This is a causal diagnostic,
 * not an approved deck edit. Unresolved execution is never promoted to failure. */
export function ablateRelationships(ledger,disabledJobIds){
 const ids=new Set(disabledJobIds),jobs=ledger.cards.flatMap(c=>c.jobs),known=new Set(jobs.map(j=>j.id));
 if([...ids].some(id=>!known.has(id)))throw Error('Unknown relationship id');
 const disabled=jobs.filter(j=>ids.has(j.id)),names=new Set(disabled.map(j=>j.card));
 return {mode:'counterfactual relationship ablation',disabled:disabled.map(j=>({id:j.id,card:j.card,kind:j.kind,provides:j.provides})),obligations:ledger.obligations.filter(o=>ids.has(o.anchor)||(o.satisfiedBy||[]).some(id=>ids.has(id)||names.has(id))).map(o=>({id:o.id,originalStatus:o.status,executionStatus:'unknown',removedAnchor:ids.has(o.anchor),removedPotentialInputs:(o.satisfiedBy||[]).filter(id=>ids.has(id)||names.has(id)),remainingPotentialInputs:(o.satisfiedBy||[]).filter(id=>!ids.has(id)&&!names.has(id))})),interpretation:'Specific printed function removed; remaining links may still share resources. Unknown funding or execution remains unknown.'};
}
