import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {accessModel,accessEffects,entryMatches} from '../src/gameplayAccess.mjs';
import {planManaPayments} from '../src/gameplayMana.mjs';
const c=(name,mana_cost,type_line,oracle_text='',rest={})=>({name,mana_cost,type_line,oracle_text,...rest});
const cmd=c('Test commander','{9}','Legendary Creature — Eldrazi');
const land=(name='Wastes',type='C')=>c(name,'','Land',`{T}: Add {${type}}.`);
const body=(name='Free',cost='{0}',type='Creature — Eldrazi')=>c(name,cost,type);
const fillers=(n=20)=>Array.from({length:n},(_,i)=>body('Filler '+i,'{20}','Creature — Bear'));
const cast=(card,rest={})=>({type:'cast',card,...rest}),play=card=>({type:'land',card}),activate=(card,abilityIndex=0)=>({type:'activate',card,abilityIndex});
function run(first,script,rest={}){const cards=[...first,...fillers()],r=evaluateGameplay({commander:cmd,cards,order:cards.map((_,i)=>i),script,turns:1,...rest});assert.deepEqual(auditGameplayTrace(r,rest.commander||cmd,cards).errors,[]);return r;}
const drawn=r=>r.trace.filter(e=>e.event==='access-draw');
test('direct draw resolves into the hand; the obtained spell can be cast later that turn',()=>{
 const first=[c('Draw two','{0}','Sorcery','Draw two cards.'),...fillers(6),body('Natural'),body('Obtained'),body('Other')];
 const r=run(first,{1:[cast('Draw two'),cast('Obtained')]});assert.equal(drawn(r).length,2);
 assert.ok(r.stats.casts.some(e=>e.card==='Obtained'));assert.ok(r.trace.findIndex(e=>e.event==='spell-resolved')<r.trace.findIndex(e=>e.event==='cast-paid'&&e.card==='Obtained'));
 assert.equal(r.observations[0].effectDraws,2);
});
test('draw then discard/top is actual selection, not extra net cards',()=>{
 const first=[c('Loot','{0}','Sorcery','Draw two cards, then discard a card.'),body('Expensive','{30}'),...fillers(5),body('Natural'),body('A'),body('B')];
 const r=run(first,{1:[cast('Loot')]});assert.equal(r.stats.effectDraws,2);assert.equal(r.stats.accessDiscards,1);assert.ok(r.trace.find(e=>e.event==='turn-end').graveyard.includes(r.trace.find(e=>e.event==='discard').id));
 const top=run([c('Conch','{0}','Artifact','{T}, Sacrifice this artifact: Draw two cards, then put a card from your hand on top of your library.'),...fillers(6),body('Natural'),body('A'),body('B')],{1:[cast('Conch'),activate('Conch')]});
 assert.equal(top.stats.returnedToTop,1);assert.equal(top.stats.accessSacrifices,1);assert.equal(top.trace.find(e=>e.event==='turn-end').library[0],top.trace.find(e=>e.event==='hand-to-top').id);
});
test('activated draw respects creature sickness, tap state and repeatable mana costs',()=>{
 const archivist=c('Archivist','{0}','Creature — Wizard','{T}: Draw a card.');
 const r=run([archivist,...fillers(6)],{1:[cast('Archivist'),activate('Archivist')],2:[activate('Archivist'),activate('Archivist')]},{turns:2});assert.equal(drawn(r).length,1);assert.equal(drawn(r)[0].turn,2);
 const repeat=run([land(),c('Sailor','{0}','Creature — Pirate','{1}: Draw a card.'),c('Ring','{0}','Artifact','{T}: Add {C}{C}.'),...fillers(4)],{1:[play('Wastes'),cast('Ring'),cast('Sailor'),activate('Sailor'),activate('Sailor'),activate('Sailor'),activate('Sailor')]});
 assert.equal(repeat.stats.activations,3);assert.equal(repeat.trace.filter(e=>e.event==='mana-activation'&&e.card==='Ring').length,1);
});
test('a tap-draw source cannot tap itself for its own mana fee',()=>{
 const source=c('Voidcraw','{0}','Creature — Eldrazi','{T}: Add {C}{C}.\n{3}{C}, {T}: Draw a card.');
 const r=run([source,land('A'),land('B'),land('C'),land('D'),...fillers(2)],{1:[play('A'),cast('Voidcraw')],2:[play('B')],3:[play('C'),activate('Voidcraw')],4:[play('D'),activate('Voidcraw')]},{turns:4});
 assert.equal(drawn(r).length,1);assert.equal(drawn(r)[0].turn,4);assert.ok(!r.trace.some(e=>e.event==='mana-activation'&&e.card==='Voidcraw'));
});
test('activation hand/power/once restrictions use the changing state',()=>{
 const seven=c('Seven','{0}','Artifact','{0}: Draw a card. Activate only if you have exactly seven cards in hand.');
 const r=run([seven,...fillers(6)],{1:[cast('Seven'),activate('Seven'),activate('Seven')]});assert.equal(r.stats.activations,1);
 const once=c('Once','{0}','Artifact','{0}: Draw a card. Activate only once each turn.');
 const o=run([once,...fillers(6)],{1:[cast('Once'),activate('Once'),activate('Once')],2:[activate('Once')]},{turns:2});assert.equal(o.stats.activations,2);
 const power=c('Enclave','{0}','Artifact','{T}: Draw a card. Activate only if you control a creature with power 4 or greater.');
 const p=run([power,body('Large','{0}'),...fillers(5)],{1:[cast('Enclave'),activate('Enclave'),cast('Large'),activate('Enclave')]});assert.equal(p.stats.activations,0);
 const modified=run([power,c('Modified','{0}','Creature — Beast','This creature enters with a -1/-1 counter on it.',{power:'4'}),...fillers(5)],{1:[cast('Enclave'),cast('Modified'),activate('Enclave')]});assert.equal(modified.stats.activations,0);assert.equal(modified.trace.find(e=>e.event==='action-failed').status,'unknown');
});
test('giving away a draw source removes it; it cannot draw for us again next turn',()=>{
 const def=c('Defector','{0}','Creature — Rogue','{T}: Draw two cards. Target opponent gains control of this creature. Activate only during your turn.');
 const r=run([def,...fillers(6)],{1:[cast('Defector')],2:[activate('Defector')],3:[activate('Defector')]},{turns:3});assert.equal(r.stats.effectDraws,2);assert.deepEqual(r.trace.find(e=>e.event==='turn-end'&&e.turn===3).opponents,['deck-0']);
});
test('Guardian Project and Kindred Discovery draw only for supported real entries',()=>{
 const project=c('Project','{0}','Enchantment',"Whenever a nontoken creature you control enters, if it doesn't have the same name as another creature you control or a creature card in your graveyard, draw a card.");
 const r=run([project,body('A'),body('B'),...fillers(4)],{1:[cast('Project'),cast('A'),cast('B')]});assert.equal(r.stats.effectDraws,2);
 const discover=c('Discovery','{0}','Enchantment','As this enchantment enters, choose a creature type.\nWhenever a creature you control of the chosen type enters or attacks, draw a card.');
 const d=run([discover,body('Drone'),body('Wizard','{0}','Creature — Wizard'),...fillers(4)],{1:[cast('Discovery'),cast('Wizard'),cast('Drone')]});assert.equal(d.stats.effectDraws,1);assert.equal(d.chosenType,'Eldrazi');
 const entrant={id:'new',card:body('A')};assert.equal(entryMatches({singleton:true},{id:'project'},entrant,{board:[entrant],graveyard:[{id:'old',card:body('A')}]}),false);
});
test('Beanstalk self-entry and supported MV cast draw are separate resolving triggers',()=>{
 const bean=c('Bean','{0}','Enchantment','When this enchantment enters and whenever you cast a spell with mana value 5 or greater, draw a card.');
 const ritual=c('Mana','{0}','Instant','Add {C}{C}{C}{C}{C}.');
 const r=run([bean,ritual,body('Big','{5}'),...fillers(4)],{1:[cast('Bean'),cast('Mana'),cast('Big')]});assert.equal(r.stats.effectDraws,2);
 const big=r.trace.findIndex(e=>e.event==='cast-paid'&&e.card==='Big'),entry=r.trace.findIndex(e=>e.event==='permanent-resolved'&&e.card==='Big');assert.ok(r.trace.slice(big,entry).some(e=>e.event==='access-draw'));
 const influence=accessModel(c('Influence','{0}','Enchantment',"Whenever you cast an Eldrazi creature spell with mana value 7 or greater, draw two cards."));assert.equal(influence.triggers.length,1);
});
test('Mystic Forge uses the actual top, pays its mana cost and cannot skip a land for free',()=>{
 const forge=c('Forge','{0}','Artifact','You may look at the top card of your library any time.\nYou may cast artifact spells and colorless spells from the top of your library.\n{T}, Pay 1 life: Exile the top card of your library.');
 const r=run([forge,...fillers(6),body('Natural'),land('Blocker'),c('Top','{0}','Artifact')],{1:[cast('Forge'),cast('Top',{origin:'library'}),activate('Forge'),cast('Top',{origin:'library'})]});assert.equal(r.stats.topCasts,1);assert.equal(r.stats.effectDraws,0);assert.equal(r.trace.find(e=>e.event==='turn-end').life,39);assert.ok(r.trace.some(e=>e.event==='top-exiled'&&e.card==='Blocker'));
 const expensive=run([forge,...fillers(6),body('Natural'),c('Top','{5}','Artifact')],{1:[cast('Forge'),cast('Top',{origin:'library'})]});assert.equal(expensive.stats.topCasts,0);
});
test('scry/surveil inspect only permitted cards and change the subsequent draw',()=>{
 const r=run([c('Select','{0}','Sorcery','Surveil 2, then draw a card.'),...fillers(6),body('Natural'),body('Too expensive','{30}'),body('Useful')],{1:[cast('Select')]});
 assert.equal(drawn(r)[0].card,'Useful');assert.ok(r.trace.find(e=>e.event==='selection').reject.includes('deck-8'));assert.equal(r.stats.effectDraws,1);
});
test('unsupported counters, combat, paid triggers, equipment grants and modal access remain unknown',()=>{
 for(const text of ['{T}: Put a burden counter on this artifact, then draw a card for each burden counter on it.','Whenever a creature you control deals combat damage to a player, draw a card.','Whenever you cast a creature spell, you may pay {2}. If you do, draw a card.','Equipped creature has "At the beginning of your upkeep, draw a card."','Choose one —\n• Draw two cards.\n• Destroy target creature.']){
  const m=accessModel(c('Unsupported','{0}','Artifact',text));assert.equal(m.direct,null);assert.equal(m.abilities.length+m.triggers.length,0);assert.ok(m.unknown.length);
 }
 assert.equal(accessEffects('Draw two cards unless an opponent pays {3}.'),null);
 const absent=run([c('No mana cost','','Sorcery','Draw three cards.'),...fillers(6)],{1:[cast('No mana cost')]});assert.equal(absent.stats.effectDraws,0);assert.equal(absent.trace.find(e=>e.event==='action-failed').status,'unknown');
});
test('commander-first and development policies reveal distinct deployment tradeoffs',()=>{
 const commander=c('Leader','{2}','Legendary Creature — Eldrazi'),cards=[land('A'),land('B'),land('C'),c('Rock','{2}','Artifact','{T}: Add {C}.'),...fillers()];
 const a=evaluateGameplay({commander,cards,order:cards.map((_,i)=>i),policy:'commander-first',turns:4}),b=evaluateGameplay({commander,cards,order:cards.map((_,i)=>i),policy:'development',turns:4});
 assert.equal(a.stats.casts.find(e=>e.commander).turn,2);assert.equal(b.stats.casts.find(e=>e.commander).turn,3);assert.ok(b.stats.casts.some(e=>e.card==='Rock'&&e.turn===2));
 assert.ok(auditGameplayTrace(a,commander,cards).valid&&auditGameplayTrace(b,commander,cards).valid);
});
test('repeatable draw/setup cannot repeatedly starve an already-payable commander',()=>{
 const commander=c('Leader','{2}','Legendary Creature — Eldrazi'),cards=[c('Draw engine','{0}','Artifact','{2}: Draw a card.'),land('A'),land('B'),land('C'),land('D'),body('A0'),body('B0'),...Array.from({length:20},(_,i)=>body('Next '+i))];
 const r=evaluateGameplay({commander,cards,order:cards.map((_,i)=>i),policy:'development',turns:4});
 assert.equal(r.stats.commanderDeploymentTurn,3);assert.equal(r.stats.setupBeforePayableCommander,1);assert.ok(r.trace.some(e=>e.event==='decision'&&e.reason==='take the payable commander after one setup action'));assert.ok(auditGameplayTrace(r,commander,cards).valid);
});
test('one free mulligan is deterministic, preserves inventory and makes no future-draw decision',()=>{
 const cards=[...fillers(7),...Array.from({length:12},(_,i)=>land('L'+i)),...fillers(8)];const before=structuredClone(cards),options={commander:cmd,cards,order:cards.map((_,i)=>i),mulligan:'one-free',seed:'mulligan-check',turns:2};
 const r=evaluateGameplay(options);assert.equal(r.stats.mulligans,1);assert.equal(r.trace.find(e=>e.event==='opening').hand.length,7);assert.equal(new Set(r.order).size,cards.length);assert.deepEqual(evaluateGameplay(options),r);assert.deepEqual(cards,before);assert.ok(auditGameplayTrace(r,cmd,cards).valid);
});
test('land policy uses an actually payable commander line instead of an irrelevant early land',()=>{
 const commander=c('Blue leader','{U}','Legendary Creature — Wizard'),cards=[land('Irrelevant','C'),land('Blue','U'),...fillers()];
 const r=evaluateGameplay({commander,cards,order:cards.map((_,i)=>i),turns:1,policy:'commander-first'});
 assert.equal(r.trace.find(e=>e.event==='land').card,'Blue');assert.equal(r.stats.commanderDeploymentTurn,1);assert.ok(auditGameplayTrace(r,commander,cards).valid);
});
test('a land obtained by access can use the still-available land drop that same turn',()=>{
 const cards=[c('Draw','{0}','Sorcery','Draw a card.'),body('Green','{G}'),...fillers(5),body('Natural','{20}'),land('Obtained Forest','G'),...fillers()];
 const r=evaluateGameplay({commander:cmd,cards,order:cards.map((_,i)=>i),turns:1,policy:'development'});
 assert.equal(r.trace.find(e=>e.event==='land').card,'Obtained Forest');assert.ok(r.stats.casts.some(s=>s.card==='Green'&&s.turn===1));assert.ok(auditGameplayTrace(r,cmd,cards).valid);
});
test('land planning preserves a real typed follow-up and its separately reserved true-colorless payment',()=>{
 const commander=c('Copy leader','{0}','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control.');
 const cards=[land('A','G'),land('B','G'),land('Surplus green','G'),land('Needed colorless','C'),c('Stone','{0}','Artifact','{T}: Add {C}.'),...fillers(4),body('Follow-up','{1}{G}'),...fillers()];
 const r=evaluateGameplay({commander,cards,order:cards.map((_,i)=>i),turns:3,policy:'native'});
 assert.equal(r.trace.find(e=>e.event==='land'&&e.turn===3).card,'Needed colorless');assert.equal(r.stats.optionalPayments.length,1);assert.equal(r.stats.optionalPayments[0].turn,3);assert.ok(auditGameplayTrace(r,commander,cards).valid);
});
test('empty-library draw is a model loss, not a successful engine or infinite advantage',()=>{
 const cards=[c('Draw','{0}','Sorcery','Draw two cards.'),...fillers(6),body('Last')],r=evaluateGameplay({commander:cmd,cards,order:cards.map((_,i)=>i),turns:1,script:{1:[cast('Draw')]}});
 assert.equal(r.decked,true);assert.equal(r.lost,true);assert.equal(r.stats.effectDraws,0);assert.ok(auditGameplayTrace(r,cmd,cards).valid);
});
test('zone/effect auditor rejects invented cards, skipped costs and unsupported trigger effects',()=>{
 const cards=[c('Draw','{0}','Sorcery','Draw a card.'),...fillers(6),body('Natural'),body('Obtained')],r=evaluateGameplay({commander:cmd,cards,order:cards.map((_,i)=>i),turns:1,script:{1:[cast('Draw')]}});
 assert.ok(auditGameplayTrace(r,cmd,cards).valid);
 const bad=structuredClone(r);bad.trace.find(e=>e.event==='access-draw').id='deck-9';assert.equal(auditGameplayTrace(bad,cmd,cards).valid,false);
 const unsupported=structuredClone(r);unsupported.trace.find(e=>e.event==='access-resolving').effects=[{kind:'draw',count:3}];assert.equal(auditGameplayTrace(unsupported,cmd,cards).valid,false);
 const fake=structuredClone(r);fake.trace.splice(1,0,{turn:1,event:'token-created',id:'token-900',card:c('Invented Spawn','','Token Creature — Eldrazi Spawn','Sacrifice this token: Add {C}.')});assert.equal(auditGameplayTrace(fake,cmd,cards).valid,false);
});
test('optimized payment search agrees with exhaustive small-source legacy searches',()=>{
 const colors=['C','G','U'],restrictions=['none','abilities','eldrazi'];
 for(let i=0;i<120;i++){
  const state={sources:Array.from({length:3},(_,j)=>({id:'s'+j,types:['Artifact'],modes:[{tap:true,cost:(i+j)%5===0?'{1}':'',restriction:restrictions[(i+j)%3],outputs:[[(colors[(i+j)%3])],['C','C']]}]}))};
  const payments=[{cost:['{2}{G}','{C}{C}','{G/U}{1}'][i%3],context:{kind:'spell',types:['Creature'],subtypes:['Eldrazi']}},...(i%2?[{cost:'{C}',context:{kind:'ability',abilityType:'triggered'}}]:[])];
  const a=planManaPayments(state,payments,{maxStates:100000}),b=planManaPayments(state,payments,{maxStates:100000,optimized:true});assert.notEqual(a.status,'unknown');assert.equal(b.status,a.status);
 }
});
test('optimized search retains activation fees, restricted mana and bounded-unknown semantics',()=>{
 const state={sources:[{id:'fee',modes:[{tap:true,outputs:[['C']]}]},{id:'signet',modes:[{tap:true,cost:'{1}',outputs:[['R','G']]}]},{id:'a',modes:[{tap:true,outputs:[['C']]}]},{id:'b',modes:[{tap:true,outputs:[['C']]}]}]};
 const payments=[{cost:'{R}{G}',context:{kind:'spell',types:['Creature']}},{cost:'{C}{C}',context:{kind:'ability',abilityType:'triggered'}}],before=structuredClone(state);
 const r=planManaPayments(state,payments,{optimized:true});assert.equal(r.status,'paid');const spent=r.receipts.flatMap(e=>e.spent).map(e=>e.id);assert.equal(spent.length,new Set(spent).size);
 assert.equal(planManaPayments(state,payments,{optimized:true,maxStates:1}).status,'unknown');assert.deepEqual(state,before);
 const restricted={sources:[{id:'jewel',modes:[{tap:true,outputs:[['C','C']],restriction:'abilities'}]}]};assert.equal(planManaPayments(restricted,[payments[1]],{optimized:true}).status,'blocked');
});
