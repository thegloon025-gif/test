/** Explicit, conditional benchmark example. Never used for ranking or policy.
 * This validates its selected cards and mana ledger, not a random draw rate,
 * earliest turn, full rules state or an independently verified infinite win. */
import assert from 'node:assert/strict';
import {payExecutionCost} from '../../src/strategyExecution.mjs';
export function ulalekTurnSixExample(commander,cards){
 const deck=[commander,...cards],byName=new Map(deck.map(c=>[c.name,c])),counts=new Map();
 for(const c of deck)counts.set(c.name,(counts.get(c.name)||0)+1);
 const names=['Forest','Plains','Mountain','Island','Wastes','Arcane Signet','Mind Stone','Annie Joins Up','Spawn-Gang Commander'];
 if(commander.name!=='Ulalek, Fused Atrocity'||names.some(n=>!byName.has(n))||(counts.get('Wastes')||0)<2)return {status:'unavailable in selected deck'};
 assert.match(byName.get('Arcane Signet').oracle_text,/\{T\}: Add one mana of any color in your commander/i);
 assert.match(byName.get('Mind Stone').oracle_text,/\{T\}: Add \{C\}/);
 assert.match(byName.get('Annie Joins Up').oracle_text,/triggered ability of a legendary creature.*additional time/i);
 const spawn=byName.get('Spawn-Gang Commander');
 assert.match(spawn.oracle_text,/When you cast this spell, create three/);
 assert.match(spawn.oracle_text,/\{1\}\{C\}, Sacrifice an Eldrazi/);
 const source=(name,color)=>({name,units:1,options:[color]});
 const F=source('Forest','G'),P=source('Plains','W'),M=source('Mountain','R'),I=source('Island','U');
 const W1=source('Wastes #1','C'),W2=source('Wastes #2','C'),stone=source('Mind Stone','C');
 const signet={name:'Arcane Signet',units:1,options:commander.color_identity};
 const payments=[];
 function pay(turn,name,sources,extra=''){
  const c=byName.get(name),cost=c.mana_cost;
  const rest=payExecutionCost(cost,sources,{extra});assert.notEqual(rest,null,`Turn ${turn}: ${name} + ${extra} cannot be paid`);
  payments.push({turn,card:name,cost,additionalUlalekPayment:extra||null,sources,remainingUnits:rest.length});
 }
 pay(2,'Arcane Signet',[F,P]);pay(3,'Mind Stone',[F,P]);
 pay(4,'Annie Joins Up',[F,P,M,I]);pay(5,commander.name,[F,M,I,W1,stone]);
 pay(6,spawn.name,[F,P,M,I,W1,W2,signet,stone],'{C}{C}');
 return {status:'conditional mana ledger checked',sourceCombo:'https://commanderspellbook.com/combo/5473-5657-5665/',
  conditionalTurn:6,earliestTurn:null,reliableTurn:null,executionVerified:false,policyClassification:null,
  assumptions:['No mulligan, no opponents interfering, no taxes or replacement effects.',
   'Opening seven: Forest, Plains, Mountain, Arcane Signet, Mind Stone, Annie Joins Up, Spawn-Gang Commander.',
   'Natural draws: Island on T1, Wastes on T2, a second Wastes on T3; subsequent draws unused. Commander starts in command zone.',
   'One land each turn: Forest, Plains, Mountain, Island, Wastes, Wastes. All enter untapped.',
   'Each turn sources untap normally; unused mana is not carried between steps/phases/turns.',
   'Annie and the commander remain on the battlefield. Reserve two actual {C} after paying for Spawn-Gang Commander.'],
  payments,loopReview:[
   'Annie doubles Ulalek’s cast trigger. Keep the other Ulalek trigger and the Spawn-Gang cast trigger on the stack.',
   'Pay the reserved {C}{C} for one Ulalek trigger; copy the spell and other relevant triggers.',
   'Resolve a copied Spawn-Gang cast trigger: create three Spawn. Sacrifice two for {C}{C} to pay a copied Ulalek trigger; retain the third Spawn.',
   'Repeat for an arbitrarily large finite number of iterations, retaining at least one Spawn per iteration. Sacrificing retained Spawn for mana consumes those tokens; do not count a token as both mana and outlet fuel.',
   'To finish, decline further optional payments and resolve the spell copies so Spawn-Gang exists on the battlefield. Partition retained Spawn between mana and outlet fuel.',
   'Each damage activation needs {1}{C} and a sacrificed Eldrazi. Two Spawn can supply the two mana, a third fuels the sacrifice; deal 2 to a legal target. No tap or attack cost: new creatures do not need haste for these abilities.'
  ],scope:'A specified draw/board and exact-payment example consistent with cached instructions. Not a measured probability, fastest line, pod-policy approval or full rules simulation.'};
}
