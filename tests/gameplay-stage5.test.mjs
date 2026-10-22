import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {CompactNativeStack,colorlessUpperBound} from '../src/gameplayNativeStack.mjs';
import {outletModel,safeOutletResource} from '../src/gameplayOutlets.mjs';
const c=(name,cost,type,text='',rest={})=>({name,mana_cost:cost,type_line:type,oracle_text:text,...rest});
const cmd=c('Ulalek','{C/W}{C/U}{C/B}{C/R}{C/G}','Legendary Creature — Eldrazi','Devoid\nWhenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control, then copy all other activated and triggered abilities you control. You may choose new targets for the copies.',{color_identity:['W','U','B','R','G']});
const battery=n=>c('Mana','{0}','Sorcery','Add '+'{C}'.repeat(n)+'.');
const body=c('Body','{0}','Creature — Eldrazi');
const fleshraker=c('Fleshraker','{0}','Creature — Eldrazi Drone','Whenever you cast a colorless spell, create a 0/1 colorless Eldrazi Spawn creature token with "Sacrifice this token: Add {C}."\nWhenever another colorless creature you control enters, this creature deals 1 damage to each opponent.');
const gang=c('Gang','{0}','Creature — Eldrazi Goblin','When you cast this spell, create three 0/1 colorless Eldrazi Spawn creature tokens with "Sacrifice this token: Add {C}."\n{1}{C}, Sacrifice an Eldrazi: This creature deals 2 damage to any target.');
const annie=c('Annie','{0}','Legendary Enchantment','If a triggered ability of a legendary creature you control triggers, that ability triggers an additional time.');
const spawn=c('Spawn','{3}','Creature — Eldrazi','When you cast this spell, create a 0/1 colorless Eldrazi Spawn creature token with "Sacrifice this token: Add {C}."');
const cast=card=>({type:'cast',card:card.name}),out=(sacrifice,target=0)=>({type:'outlet',card:gang.name,sacrifice,target});
function run(first,actions,options={}){const cards=[...first,...Array.from({length:30},(_,i)=>c('Held '+i,'{30}','Creature — Bear'))];const opts={commander:cmd,cards,turns:1,order:cards.map((_,i)=>i),script:{1:actions},nativeExecution:true,nativeStage5:true,...options},r=evaluateGameplay(opts);const audit=auditGameplayTrace(r,cmd,cards);assert.ok(audit.valid,JSON.stringify(audit));assert.deepEqual(evaluateGameplay(opts),r);return {r,cards};}
test('structural stack sharing preserves exact LIFO identities, source/cause and copy parents',()=>{
 const stack=new CompactNativeStack(),a={kind:'ability',source:{id:'s'},sourceZone:'battlefield',cause:{id:'c'},phase:'cast',effect:{type:'ulalek'}};
 for(let i=0;i<100;i++)stack.push({...a,id:'a'+i,copyOf:i?'a0':null});assert.equal(stack.storageSize,1);assert.equal(stack.length,100);
 assert.deepEqual(stack.slice().map(s=>s.id),Array.from({length:100},(_,i)=>'a'+i));assert.equal(stack.pop().id,'a99');assert.equal(stack.find(s=>s.id==='a1').copyOf,'a0');
 stack.push({...a,id:'b',cause:{id:'different'}});assert.equal(stack.storageSize,2);assert.equal(stack.pop().id,'b');assert.equal(stack.pop().id,'a98');
});
test('C upper bound overestimates restrictions/fees and never calls a bounded search impossible',()=>{
 const state={pool:[{type:'C',restriction:'eldrazi'}],sources:[{id:'a',sick:false,tapped:false,modes:[{cost:'{9}',outputs:[['C','C']],restriction:'powerstone'}]}]};
 assert.equal(colorlessUpperBound(state),3);state.sources[0].tapped=true;state.sources[0].modes[0].tap=true;assert.equal(colorlessUpperBound(state),1);
});
test('small exact expansion and compressed execution agree on zones, resources and effects',()=>{
 const first=[battery(12),annie,spawn],actions=[cast(first[0]),cast(annie),cast(cmd),cast(spawn)];
 const a=run(first,actions),b=run(first,actions,{nativeCompression:false});
 assert.deepEqual(a.r.trace.find(e=>e.event==='turn-end'),b.r.trace.find(e=>e.event==='turn-end'));
 for(const k of ['spellCopies','triggerCopies','resolvedCopies','tokens','paidTriggers','declinedTriggers'])assert.equal(a.r.stats.native[k],b.r.stats.native[k]);
 assert.ok(a.r.stats.native.storagePeak<=a.r.stats.native.logicalPeak);
 // Hand-checked: initial spare 4 C pays twice; two resolved Spawn fund a
 // third payment later. Five Spawn created, two spent, five bodies resolve.
 assert.equal(a.r.stats.native.paidTriggers,3);assert.equal(a.r.stats.native.spellCopies,4);assert.equal(a.r.stats.native.triggerCopies,6);assert.equal(a.r.stats.native.tokens,5);assert.equal(a.r.trace.filter(e=>e.event==='mana-activation'&&e.sacrifice).length,2);
});
test('continuation checkpoints preserve a small exact expansion without changing its outcome',()=>{
 const first=[battery(12),annie,spawn],actions=[cast(first[0]),cast(annie),cast(cmd),cast(spawn)];
 const a=run(first,actions,{maxNativeSteps:8}),b=run(first,actions,{maxNativeSteps:192});
 assert.ok(a.r.stats.native.continuations>0);assert.equal(a.r.nativeExecution.boundedUnknown,false);assert.deepEqual(a.r.trace.find(e=>e.event==='turn-end'),b.r.trace.find(e=>e.event==='turn-end'));
});
test('continuation/work exhaustion remains suspended unknown, never an inferred infinite',()=>{
 const {r}=run([battery(20),annie,spawn],[cast(battery(20)),cast(annie),cast(cmd),cast(spawn)],{maxNativeSteps:2,nativeContinuations:0});assert.ok(r.nativeExecution.boundedUnknown);assert.equal(r.outlets.won,false);
});
test('Fleshraker counts actual other colorless creature entries, not itself or casts alone',()=>{
 const {r}=run([fleshraker,body],[cast(fleshraker),cast(body)]);assert.equal(r.stats.native.tokens,1);assert.deepEqual(r.outlets.life,[38,38,38]);assert.equal(r.outlets.damageEvents,6);assert.equal(r.outlets.won,false);
});
test('conditional lethal requires resolved damage to all three explicitly live seats',()=>{
 const {r}=run([fleshraker,body],[cast(fleshraker),cast(body)],{opponentLife:[2,2,2]});assert.ok(r.outlets.won);assert.deepEqual(r.outlets.life,[0,0,0]);assert.equal(r.trace.filter(e=>e.event==='opponent-eliminated').length,3);assert.equal(r.lost,false);
});
test('Gang reserves its sacrifice before paying: three tokens can buy exactly one 1C shot',()=>{
 const {r}=run([gang],[cast(gang),out('token-0'),out('token-1')]);assert.deepEqual(r.outlets.life,[38,40,40]);assert.equal(r.trace.filter(e=>e.event==='outlet-sacrifice').length,1);assert.equal(r.trace.filter(e=>e.event==='mana-activation'&&e.sacrifice).length,2);assert.equal(r.trace.filter(e=>e.event==='action-failed').length,1);
});
test('a single Spawn cannot both pay the mana fee and satisfy the Eldrazi sacrifice',()=>{
 const one={...gang,oracle_text:gang.oracle_text.replace('three 0/1','a 0/1').replace('creature tokens','creature token')};
 const {r}=run([one],[cast(one),out('token-0')]);assert.equal(r.outlets.totalDamage,0);assert.ok(r.trace.some(e=>e.event==='action-failed'));assert.equal(r.trace.filter(e=>e.event==='mana-activation').length,0);
});
test('outlet sacrifice may be the source: its paid ability uses last-known identity',()=>{
 const mana=battery(2),{r}=run([mana,gang],[cast(mana),cast(gang),out('deck-1')]);assert.equal(r.outlets.totalDamage,2);assert.ok(r.trace.find(e=>e.event==='turn-end').graveyard.includes('deck-1'));
});
test('Gang fee requires true C and live opponent targets; colored mana is insufficient',()=>{
 const mana=c('Colors','{0}','Sorcery','Add {G}{G}.');const {r}=run([mana,gang],[cast(mana),cast(gang),out('token-0')]);
 // Other Spawn may legally supply C; remove them via a one-token cast clause.
 const one={...gang,oracle_text:gang.oracle_text.replace('three 0/1','a 0/1').replace('creature tokens','creature token')};const x=run([mana,one],[cast(mana),cast(one),out('token-0')]).r;assert.equal(x.outlets.totalDamage,0);
 const y=run([battery(4),gang],[cast(battery(4)),cast(gang),out('token-0',3)]).r;assert.equal(y.outlets.totalDamage,0);
});
test('conservative optional policy is explicit and declines copied Ulalek payments only',()=>{
 const first=[battery(20),annie,spawn],actions=[cast(first[0]),cast(annie),cast(cmd),cast(spawn)];
 const a=run(first,actions).r,b=run(first,actions,{nativeDecisionPolicy:'conservative'}).r;assert.ok(b.stats.native.paidTriggers<a.stats.native.paidTriggers);assert.ok(b.stats.native.paidTriggers>0);assert.equal(b.stage5.decisionPolicy,'conservative');
});
test('independent outlet/continuation audit rejects invented damage, targets, sacrifices and order',()=>{
 const {r,cards}=run([gang],[cast(gang),out('token-0')]);
 for(const mutate of [x=>{x.trace.find(e=>e.event==='outlet-damage').amount=9;},x=>{x.trace.find(e=>e.event==='outlet-damage').target=1;},x=>{x.trace.find(e=>e.event==='outlet-sacrifice').victim='token-1';},x=>{x.outlets.won=true;}]){const x=structuredClone(r);mutate(x);assert.equal(auditGameplayTrace(x,cmd,cards).valid,false);}
 const a=run([battery(12),annie,spawn],[cast(battery(12)),cast(annie),cast(cmd),cast(spawn)],{maxNativeSteps:8});const bad=structuredClone(a.r);bad.trace.find(e=>e.event==='native-continuation').stack.reverse();assert.equal(auditGameplayTrace(bad,cmd,a.cards).valid,false);
});
test('outlet grammar is exact and does not guess unsupported damage/prerequisites',()=>{
 assert.ok(outletModel(fleshraker).entryDamage);assert.equal(outletModel({...fleshraker,oracle_text:fleshraker.oracle_text.replace('1 damage','2 damage')}).entryDamage,false);assert.equal(outletModel({...gang,oracle_text:gang.oracle_text.replace('Sacrifice an Eldrazi','Sacrifice two Eldrazi')}).sacrificeDamage,null);
});
test('fixed follow-up policy casts a payable cascade threat before generic cheap native deployment',()=>{
 const mana=c('Eight mana','{0}','Artifact','{T}: Add {C}{C}{C}{C}{C}{C}{C}{C}.'),grant=c('Grant','{0}','Creature — Eldrazi','Colorless spells you cast from your hand with mana value 7 or greater have "Cascade, cascade."'),cheap=c('Cheap native','{2}','Creature — Eldrazi'),large=c('Large native','{7}','Creature — Eldrazi'),commander={...cmd,mana_cost:'{30}'},cards=[mana,grant,cheap,large,...Array.from({length:20},(_,i)=>c('Uncast '+i,'{30}','Artifact'))];
 const options={commander,cards,turns:1,order:cards.map((_,i)=>i),policy:'commander-first',nativeExecution:true,nativeStage5:true};
 const a=evaluateGameplay(options),b=evaluateGameplay({...options,nativeDecisionPolicy:'follow-up'});assert.ok(auditGameplayTrace(a,commander,cards).valid);assert.ok(auditGameplayTrace(b,commander,cards).valid);
 assert.equal(a.stats.casts.some(c=>c.card===large.name),false);assert.equal(b.stats.casts.some(c=>c.card===large.name),true);assert.equal(b.stats.native.cascades,2);assert.ok(b.trace.some(e=>e.event==='decision'&&e.reason.includes('follow-up')));
});
test('compressed no-op receipts are audited against actual stack and resource proofs',()=>{
 const second={...annie,name:'Second multiplier'},first=[battery(16),annie,{...body,mana_cost:'{3}'},second],actions=[cast(first[0]),cast(annie),cast(second),cast(cmd),cast(first[2])],a=run(first,actions),b=run(first,actions,{nativeCompression:false});
 assert.equal(a.r.nativeExecution.boundedUnknown,false);assert.deepEqual(a.r.trace.find(e=>e.event==='turn-end'),b.r.trace.find(e=>e.event==='turn-end'));assert.ok(a.r.stats.native.compressedDeclines>0);
 const bad=structuredClone(a.r);bad.trace.find(e=>e.event==='native-noop-group').ids.reverse();assert.equal(auditGameplayTrace(bad,cmd,a.cards).valid,false);
});
test('compressed spell entries retain separate permanent tokens and match exact expansion',()=>{
 const mana=battery(16),b={...body,mana_cost:'{3}'},a=run([mana,annie,b],[cast(mana),cast(annie),cast(cmd),cast(b)]);
 const copies=a.r.trace.filter(e=>e.event==='copy-created').map(e=>e.id),resolved=a.r.trace.filter(e=>e.event==='permanent-resolved'&&e.card===b.name).map(e=>e.id);assert.equal(new Set(copies).size,copies.length);assert.equal(resolved.length,copies.length+1);assert.ok(a.r.stats.native.storagePeak<a.r.stats.native.logicalPeak);
});
test('Fleshraker copies and Echoes multiply real entry damage without treating copies as casts',()=>{
 const echoes=c('Echoes','{0}','Enchantment','If a triggered ability of a colorless spell you control or another colorless permanent you control triggers, that ability triggers an additional time.\nWhenever you cast a colorless spell, copy it. You may choose new targets for the copy.');
 const {r}=run([echoes,fleshraker,body],[cast(echoes),cast(fleshraker),cast(body)]);assert.equal(r.stats.casts.length,3);assert.equal(r.stats.native.tokens,4);assert.equal(r.stats.native.spellCopies,2);assert.deepEqual(r.outlets.life,[14,14,14]);
});
test('one eliminated target is not a table win, and paid outlet activations respect remaining seats',()=>{
 const mana=battery(6),{r}=run([mana,gang],[cast(mana),cast(gang),out('token-0',0),out('token-1',0),out('token-1',1)],{opponentLife:[2,2,2]});assert.equal(r.outlets.won,false);assert.deepEqual(r.outlets.life,[0,0,2]);assert.equal(r.trace.filter(e=>e.event==='action-failed').length,1);
});
test('unsupported commander mechanics still force abstention under Stage 5',async()=>{
 const {nativeCoverageIncomplete,shadowVerdict}=await import('../src/gameplayShadow.mjs');
 for(const text of ['Commander ninjutsu {U}{B}','Whenever another Zombie you control dies, create a token.','Whenever you cast a spell that targets only this creature, copy it.']){const commander={...cmd,oracle_text:text};assert.ok(nativeCoverageIncomplete(commander));assert.equal(shadowVerdict({}, {}, {nativeCoverageIncomplete:true}).status,'abstain-native-coverage');}
});

test('automatic outlet ammunition protects copied native engines and requires Spawn/Scion tokens',()=>{
 assert.equal(safeOutletResource({card:fleshraker,token:true}),false);assert.equal(safeOutletResource({card:gang,token:true}),false);
 assert.equal(safeOutletResource({card:c('Resource','','Token Creature — Eldrazi Spawn'),token:true}),true);assert.equal(safeOutletResource({card:c('Scion','','Token Creature — Eldrazi Scion'),token:true}),true);assert.equal(safeOutletResource({card:c('Printed source','','Creature — Eldrazi Spawn')}),false);
});
