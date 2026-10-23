/** Explicit unanswered event hypotheses at an empty-stack checkpoint. No
 * opponent spell, payment, response window or complete rules engine inferred. */
import {cardTypes,cardText,cardModel,isCreature,isLand} from './gameplayCards.mjs';
import {deathModel} from './gameplayDeath.mjs';
import {withoutReminder} from './gameplayAccess.mjs';
export function validateStage7(options){
 if(!options)return null;
 if(!['legacy','state-aware'].includes(options.tutorPolicy)||!Array.isArray(options.disruptions)||options.disruptions.length>4)throw Error('Explicit bounded Stage 7 options required');
 const ids=new Set();for(const d of options.disruptions){if(!d.id||ids.has(d.id)||!Number.isInteger(d.turn)||d.turn<1||d.turn>8||!['commander','creatures','nonland-types','commander-and-mana','engine'].includes(d.scope)||!['destroy','exile'].includes(d.effect)||!['command','remain'].includes(d.commanderDestination)||d.scope==='engine'&&typeof d.card!=='string'||d.scope==='nonland-types'&&(!Array.isArray(d.types)||!d.types.length||d.types.some(t=>!['Artifact','Creature','Enchantment','Planeswalker'].includes(t))))throw Error('Unsupported disruption specification');ids.add(d.id);}
 return structuredClone(options);
}
export function disruptionTargets(board,spec){return board.filter(s=>{
 if(spec.scope==='commander')return s.id==='commander';if(spec.scope==='creatures')return isCreature(s.card);
 if(spec.scope==='nonland-types')return !isLand(s.card)&&cardTypes(s.card).some(t=>spec.types.includes(t));
 if(spec.scope==='engine')return s.card.name===spec.card;
 return s.id==='commander'||!isLand(s.card)&&(cardModel(s.card).modes.length||cardModel(s.card).reducers.length||/\bAdd\b|cost.*less to cast/.test(cardText(s.card)));
});}
export function removalEvidence(board,spec,{death=false}={}){
 const targets=disruptionTargets(board,spec),unknown=[],survivors=[],removed=[];if(!targets.length)return {targets,unknown,survivors,removed};const lines=s=>withoutReminder(cardText(s.card)).split('\n').map(l=>l.trim());
 const protectedArtifact=s=>cardTypes(s.card).includes('Artifact')&&board.some(b=>lines(b).includes('Artifacts you control have indestructible.'));
 const dying=spec.effect==='destroy'&&targets.some(s=>isCreature(s.card)&&!lines(s).includes('Indestructible')&&!protectedArtifact(s));
 for(const b of board)for(const l of lines(b)){
  if(death&&deathModel(b.card).recognized.includes(l))continue;
  if(/return.*graveyard|graveyard.*(?:cast|return)|leaves (?:the )?battlefield|would.*(?:die|graveyard|exil|leave)|regenerate|totem armor|shield counter|phases? out/i.test(l)||dying&&/\bdies\b|\bdie\b|put into.*graveyard|graveyard.*(?:shuffle|library)/i.test(l))unknown.push({card:b.card.name,clause:l});
  if(/indestructible/i.test(l)&&l!=='Indestructible'&&l!=='Artifacts you control have indestructible.')unknown.push({card:b.card.name,clause:l});
  if(['commander','engine'].includes(spec.scope)&&/hexproof|shroud|ward|protection from|can't be the target/i.test(l)&&(targets.includes(b)||/other .*creatures?|creatures? you control|equipped creature|enchanted creature/i.test(l)))unknown.push({card:b.card.name,clause:l});
 }
 for(const s of targets){const protectedByArtifact=protectedArtifact(s);
  if(spec.effect==='destroy'&&(lines(s).includes('Indestructible')||protectedByArtifact))survivors.push({id:s.id,reason:'indestructible'});else removed.push(s);
 }
 return {targets,removed,survivors,unknown};
}
/** Recovery times are distinct supported receipts, not a score or a claim that
 * command-zone recasting alone restores the strategy. */
export function summarizeRecovery(run){
 if(!run.stage7)throw Error('Stage 7 run required');
 return run.stage7.disruptions.map(spec=>{const cp=run.trace.find(e=>e.event==='disruption-checkpoint'&&e.spec.id===spec.id),done=run.trace.find(e=>e.event==='disruption-complete'&&e.id===spec.id),unknown=run.trace.find(e=>e.event==='disruption-unknown'&&e.id===spec.id),eventTurn=cp?.turn??spec.turn,allAfter=cp?run.trace.slice(run.trace.indexOf(cp)+1):[],next=allAfter.findIndex(e=>e.event==='disruption-checkpoint'),after=next>=0?allAfter.slice(0,next):allAfter;
  const native=after.find(e=>e.event==='native-trigger-paid'||e.event==='access-draw'||e.event==='cast-paid'&&e.origin==='cascade'||e.event==='native-tutor'&&e.found||e.event==='outlet-damage');
  const recast=done?.removed.some(r=>r.id==='commander')?after.find(e=>e.event==='permanent-resolved'&&e.id==='commander'):null,mana=run.stage7.checkpoints.filter(e=>e.turn>=eventTurn&&e.afterEvent===spec.id).find(e=>!cp?.mana.unknown&&!e.mana.unknown&&e.mana.generic>=cp?.mana.generic&&e.mana.C>=cp?.mana.C),outlet=after.find(e=>e.event==='outlet-damage');
  const timing=e=>unknown?{status:'unknown'}:!cp?{status:'not-reached'}:!done?.removed.length?{status:'not-applicable'}:e?{status:'observed',turn:e.turn,ownTurnsAfterEvent:e.turn-eventTurn}:{status:next>=0?'censored-by-next-event':run.outlets.won?'terminal-before-evidence':'censored-by-t8'};
  return {id:spec.id,spec,status:unknown?'unknown':!cp?'not-reached':!done?.removed.length?'not-applicable':'applied',unknown:unknown?.reasons||[],removed:done?.removed||[],survivors:done?.survivors||[],beforeMana:cp?.mana||null,afterMana:done?.mana||null,manaRestored:cp?.mana.unknown?{status:'unknown'}:timing(mana),commanderRecast:done&&!done.removed.some(r=>r.id==='commander')?{status:'not-applicable'}:timing(recast),firstNativeOrAccess:timing(native),firstExecutedOutlet:timing(outlet),conditionalLethal:run.outlets.won?{turn:run.outlets.lethalTurn}:null,obtained:after.filter(e=>e.event==='draw'||e.event==='access-draw'||e.event==='native-tutor').map(e=>({turn:e.turn,card:e.card||null,found:e.found||null,event:e.event})),limitations:'Unanswered injected event at after-draw/before-land. Mana restored = pre-action supported generic and C maxima both reach pre-event snapshot (independent maxima). Actual damage is a supported outlet event, not proof of an unavoidable win threat; combat/response outcomes unknown.'};
 });
}
