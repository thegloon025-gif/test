import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {nativeModel,triggerMultipliers} from '../src/gameplayNative.mjs';
const c=(name,cost,type,text='',rest={})=>({name,mana_cost:cost,type_line:type,oracle_text:text,...rest});
const ulalek=c('Ulalek, Fused Atrocity','{C/W}{C/U}{C/B}{C/R}{C/G}','Legendary Creature — Eldrazi','Devoid\nWhenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control, then copy all other activated and triggered abilities you control. You may choose new targets for the copies.',{color_identity:['W','U','B','R','G']});
const battery=(n=16,type='C')=>c('Test mana source','{0}','Sorcery','Add '+(type==='C'?'{C}'.repeat(n):'{W}{U}{B}{R}{G}'+'{G}'.repeat(n-5))+'.');
const body=c('Native body','{3}','Creature — Eldrazi');
const gang=c('Spawn-Gang Commander','{3}{R}{R}','Creature — Eldrazi','Devoid\nWhen you cast this spell, create three 0/1 colorless Eldrazi Spawn creature tokens with "Sacrifice this token: Add {C}."');
const spawn=c('Repurposer','{3}','Creature — Eldrazi','When you cast this spell and when this creature dies, create a 0/1 colorless Eldrazi Spawn creature token with "Sacrifice this token: Add {C}."');
const annie=c('Annie','{0}','Legendary Enchantment','If a triggered ability of a legendary creature you control triggers, that ability triggers an additional time.');
const throne=c('Throne','{0}','Artifact Creature — Golem','As this creature enters, choose a creature type.\nThis creature is the chosen type in addition to its other types.\nIf a triggered ability of another creature you control of the chosen type triggers, it triggers an additional time.');
const echoes=c('Echoes','{0}','Enchantment','If a triggered ability of a colorless spell you control or another colorless permanent you control triggers, that ability triggers an additional time.\nWhenever you cast a colorless spell, copy it. You may choose new targets for the copy.');
const cast=(card,rest={})=>({type:'cast',card:typeof card==='string'?card:card.name,...rest});
const fillers=()=>Array.from({length:30},(_,i)=>c('Filler '+i,'{20}','Creature — Bear'));
function run(first,actions,options={}){const cards=[...first,...fillers()],r=evaluateGameplay({commander:ulalek,cards,turns:1,order:cards.map((_,i)=>i),script:{1:actions},nativeExecution:true,...options});const audit=auditGameplayTrace(r,ulalek,cards);assert.ok(audit.valid,JSON.stringify(audit));return {r,cards};}
test('Ulalek pays C C on resolution and copies the actual spell without casting the copy',()=>{
 const {r}=run([battery(),body], [cast('Test mana source'),cast(ulalek),cast(body)]);
 assert.equal(r.stats.native.paidTriggers,1);assert.equal(r.stats.native.spellCopies,1);assert.equal(r.stats.casts.length,3);assert.equal(r.trace.filter(e=>e.event==='permanent-resolved'&&e.card===body.name).length,2);
 const payment=r.trace.findIndex(e=>e.event==='native-trigger-paid'),copy=r.trace.findIndex(e=>e.event==='copy-created');assert.ok(payment<copy);
});
test('colored mana can pay hybrid commander but cannot pay separate true C trigger',()=>{
 const {r}=run([battery(16,'G'),body],[cast('Test mana source'),cast(ulalek),cast(body)]);assert.equal(r.stats.commanderDeploymentTurn,1);assert.equal(r.stats.native.paidTriggers,0);assert.equal(r.stats.native.spellCopies,0);assert.equal(r.stats.native.declinedTriggers,1);
});
test('resolved Spawn trigger copies create actual resources; spell copies do not retrigger casts',()=>{
 const {r}=run([battery(),spawn],[cast('Test mana source'),cast(ulalek),cast(spawn)]);assert.equal(r.stats.native.tokens,2);assert.equal(r.stats.native.triggerCopies,1);assert.equal(r.stats.casts.filter(e=>e.card===spawn.name).length,1);
});
test('multipliers add one each and distinguish permanent abilities from spell abilities',()=>{
 const source={id:'u',card:ulalek},board=[{id:'a',card:annie},{id:'t',card:throne},{id:'e',card:echoes}];assert.equal(triggerMultipliers(source,'battlefield',board,'Eldrazi').length,3);assert.equal(triggerMultipliers(source,'stack',board,'Eldrazi').length,1);
 assert.equal(triggerMultipliers(board[1],'battlefield',board,'Eldrazi').length,1,'throne never multiplies itself');
});
test('multiplied Ulalek triggers consume separate mana and legend copies cannot remain twice',()=>{
 const {r}=run([battery(12),annie,body],[cast('Test mana source'),cast(annie),cast(ulalek),cast(body)]);assert.equal(r.stats.native.multipliedTriggers,1);assert.ok(r.stats.native.declinedTriggers>0);assert.equal(r.stats.native.paidTriggers,2);
});
test('Echoes copies spells, doubles colorless spell triggers, and copied Echoes obey legend distinctions',()=>{
 const {r}=run([battery(20),echoes,spawn],[cast('Test mana source'),cast(echoes),cast(spawn)]);assert.equal(r.stats.native.tokens,2);assert.equal(r.stats.native.spellCopies,1);assert.equal(r.stats.casts.filter(e=>e.card===spawn.name).length,1);
});
test('cascade reveals real cards, casts only eligible card for free, and bottoms other exile',()=>{
 const cascade=c('Cascade body','{0}','Creature — Eldrazi','Cascade');
 // MV zero cannot hit: a separate seven-MV spell is needed.
 const large={...cascade,name:'Large cascade',mana_cost:'{7}'},small=c('Hit','{2}','Artifact'),land=c('Land','','Land','{T}: Add {C}.');
 const first=[battery(),large,...Array.from({length:5},(_,i)=>c('Held '+i,'{20}','Creature — Bear')),land,land,small];
 const {r}=run(first,[cast('Test mana source'),cast(large)]);assert.equal(r.stats.native.cascades,1);assert.equal(r.stats.native.castsFromCascade,1);const free=r.trace.find(e=>e.event==='cast-paid'&&e.origin==='cascade');assert.equal(free.card,'Hit');assert.equal(free.cost,'');assert.equal(free.spent.length,0);
});
test('cascade grant is hand-only and copied spells do not cascade again',()=>{
 const grant=c('Grant','{0}','Creature — Eldrazi','Colorless spells you cast from your hand with mana value 7 or greater have "Cascade, cascade."');assert.deepEqual(nativeModel(grant).cascadeGrant,{minMV:7,count:2});
 const large=c('Seven','{7}','Creature — Eldrazi'),hit=c('Hit','{2}','Artifact');const first=[battery(20),grant,large,echoes,...Array.from({length:3},(_,i)=>c('Held '+i,'{20}','Creature — Bear')),hit,...Array.from({length:8},(_,i)=>c('Hit '+i,'{2}','Artifact'))];
 const {r}=run(first,[cast('Test mana source'),cast(grant),cast(echoes),cast(large)]);assert.equal(r.stats.casts.filter(e=>e.card==='Seven').length,1);assert.equal(r.stats.native.cascades,4,'two granted abilities each additionally trigger via Echoes');
});
test('cast tutor goes to actual library top; entry tutor goes to actual hand',()=>{
 const tutor=c('Conduit','{6}','Creature — Eldrazi','When you cast this spell, you may search your library for a colorless creature card with mana value 7 or greater, reveal it, then shuffle and put that card on top.\nThe first creature spell you cast each turn costs {2} less to cast.');
 const empath=c('Empath','{3}','Creature — Elf','When this creature enters, you may search your library for a creature card with mana value 6 or greater, reveal it, put it into your hand, then shuffle.');
 const first=[battery(20),tutor,empath,...Array.from({length:5},(_,i)=>c('Held '+i,'{20}','Artifact')),c('Real threat','{7}','Creature — Eldrazi')];
 const {r}=run(first,[cast('Test mana source'),cast(tutor),cast(empath)]);const tutors=r.trace.filter(e=>e.event==='native-tutor');assert.equal(tutors.length,2);assert.equal(tutors[0].found,'deck-8');assert.equal(tutors[0].destination,'top');assert.equal(tutors[1].destination,'hand');assert.ok(r.trace.find(e=>e.event==='turn-end').hand.includes('Real threat'));
});
test('resources cannot fund a trigger before resolution, while alternate legal ordering can fund it',()=>{
 const options=[battery(8),spawn],actions=[cast('Test mana source'),cast(ulalek),cast(spawn)];
 const a=run(options,actions).r,b=run(options,actions,{nativeTriggerOrder:'resources-first'}).r;assert.equal(a.stats.native.paidTriggers,0);assert.equal(b.stats.native.paidTriggers,0,'one Spawn cannot fund two C');
 const two={...spawn,name:'Two Spawn',oracle_text:'When you cast this spell, create two 0/1 colorless Eldrazi Spawn creature tokens with "Sacrifice this token: Add {C}."'};
 const x=run([battery(8),two],[cast('Test mana source'),cast(ulalek),cast(two)],{nativeTriggerOrder:'resources-first'}).r;assert.equal(x.stats.native.paidTriggers,1);
});
test('recursive multiplied triggers stop at a declared unknown bound, never claim a win',()=>{
 const {r}=run([battery(20),annie,spawn],[cast('Test mana source'),cast(annie),cast(ulalek),cast(spawn)],{maxNativeSteps:16});assert.equal(r.nativeExecution.boundedUnknown,true);assert.equal(r.stats.native.boundHits,1);assert.equal(r.win,undefined);
});
test('native replay is deterministic and independent audit rejects unpaid copies and invented token/zone events',()=>{
 const {r,cards}=run([battery(),spawn],[cast('Test mana source'),cast(ulalek),cast(spawn)]);assert.deepEqual(evaluateGameplay({commander:ulalek,cards,turns:1,order:cards.map((_,i)=>i),script:{1:[cast('Test mana source'),cast(ulalek),cast(spawn)]},nativeExecution:true}),r);
 for(const mutate of [x=>{x.stats.native.spellCopies++;},x=>x.trace.splice(x.trace.findIndex(e=>e.event==='native-trigger-paid'),1),x=>{x.trace.find(e=>e.event==='token-created').card.power='9';},x=>{x.trace.find(e=>e.event==='stack-resolve-start').id='fake';}]){const tampered=structuredClone(r);mutate(tampered);assert.equal(auditGameplayTrace(tampered,ulalek,cards).valid,false);}
});
test('a copied legendary permanent resolves as a token, then obeys the legend rule',()=>{
 const legend=c('Legend body','{3}','Legendary Creature — Eldrazi');const {r}=run([battery(20),echoes,legend],[cast('Test mana source'),cast(echoes),cast(legend)]);
 assert.equal(r.trace.filter(e=>e.event==='permanent-resolved'&&e.card===legend.name).length,2);assert.equal(r.trace.filter(e=>e.event==='native-legend-rule').length,1);assert.equal(r.trace.find(e=>e.event==='turn-end').board.filter(s=>s.card===legend.name).length,1);
});
test('copying an entry-triggered creature produces real Scions without extra casts',()=>{
 const drowner=c('Drowner','{6}','Creature — Eldrazi','When this creature enters, create two 1/1 colorless Eldrazi Scion creature tokens. They have "Sacrifice this token: Add {C}."');
 const {r}=run([battery(20),echoes,drowner],[cast('Test mana source'),cast(echoes),cast(drowner)]);assert.equal(r.stats.native.tokens,8,'each of two entries has one extra trigger from Echoes');assert.equal(r.stats.casts.filter(e=>e.card==='Drowner').length,1);
});
test('first-creature reductions apply to casts only and never reduce true-colorless costs',()=>{
 const reducer=c('Reducer','{0}','Artifact','The first creature spell you cast each turn costs {2} less to cast.'),bodyC=c('Pipped','{2}{C}','Creature — Eldrazi');
 const {r}=run([battery(20),reducer,bodyC],[cast('Test mana source'),cast(reducer),cast(bodyC),cast(ulalek)]);assert.equal(r.trace.find(e=>e.event==='cast-paid'&&e.card==='Pipped').spent.length,1);assert.equal(r.trace.find(e=>e.event==='cast-paid'&&e.id==='commander').reduction,0);
});
test('unsupported cascade hits are declined without skipping to a nicer known hit',()=>{
 const large=c('Large','{7}','Creature — Eldrazi','Cascade'),unknown=c('Unknown modal','{2}','Sorcery','Choose one —\n• Draw three cards.\n• Destroy target land.');
 const first=[battery(20),large,...Array.from({length:6},(_,i)=>c('Held '+i,'{20}','Artifact')),unknown,c('Known hit','{1}','Artifact')];
 const {r}=run(first,[cast('Test mana source'),cast(large)]);assert.equal(r.stats.native.castsFromCascade,0);assert.ok(r.stats.native.unsupported.length>0);assert.equal(r.trace.filter(e=>e.event==='cascade-reveal').length,1);
});
test('non-Ulalek native strategy coverage guards remain mandatory',async()=>{
 const {nativeCoverageIncomplete,shadowVerdict}=await import('../src/gameplayShadow.mjs');
 for(const oracle_text of ['Commander ninjutsu {U}{B}.','Whenever a Zombie dies, draw a card.','Whenever you cast a spell that targets only this creature, copy it.']){
  assert.ok(nativeCoverageIncomplete({...ulalek,oracle_text}));assert.equal(shadowVerdict({}, {}, {nativeCoverageIncomplete:true}).status,'abstain-native-coverage');
 }
});
test('object bound suspends a partially copied ability without falsely completing it',()=>{
 const {r}=run([battery(20),annie,spawn],[cast('Test mana source'),cast(annie),cast(ulalek),cast(spawn)],{maxNativeObjects:4});assert.ok(r.nativeExecution.boundedUnknown);assert.ok(r.trace.some(e=>e.event==='stack-resolve-suspended'));assert.equal(r.stats.native.boundHits,1);
});
test('copied mandatory draws can lose to an empty library; interrupted spells are not completed value',()=>{
 const second={...echoes,name:'Second copy engine'},draw=c('Draw three','{0}','Sorcery','Draw three cards.');
 const {r}=run([battery(20),echoes,second,draw],[cast('Test mana source'),cast(echoes),cast(second),cast(draw)]);
 assert.ok(r.lost&&r.decked);assert.ok(r.trace.some(e=>e.event==='stack-resolve-aborted-loss'));assert.ok(r.trace.some(e=>e.event==='access-aborted-loss'));assert.equal(r.stats.cleanupDiscards,0);
});
test('copied supported life-loss effects can end the model with independent life evidence',()=>{
 const second={...echoes,name:'Second copy engine'},draw=c('Risky draw','{0}','Sorcery','Draw a card. You lose 4 life.');
 const {r}=run([battery(20),echoes,second,draw],[cast('Test mana source'),cast(echoes),cast(second),cast(draw)]);assert.ok(r.lost);assert.equal(r.decked,false);assert.equal(r.trace.find(e=>e.event==='turn-end').life,0);
});
