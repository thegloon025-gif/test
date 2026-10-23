import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const fixtureIndex=[];
import {evaluateGameplay} from '../src/gameplayState.mjs';import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';import {summarizeRecovery,removalEvidence} from '../src/gameplayRecovery.mjs';
const c=(name,cost,type,oracle_text='',rest={})=>({name,mana_cost:cost,type_line:type,oracle_text,...rest});
const cmd=c('Ulalek, Fused Atrocity','{C/W}{C/U}{C/B}{C/R}{C/G}','Legendary Creature — Eldrazi','Devoid\nWhenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control, then copy all other activated and triggered abilities you control. You may choose new targets for the copies.',{color_identity:['W','U','B','R','G']});
const wastes=c('Wastes','','Basic Land — Wastes','{T}: Add {C}.'),forest=c('Forest','','Basic Land — Forest','{T}: Add {G}.'),ring=c('Sol Ring','{1}','Artifact','{T}: Add {C}{C}.'),channeler=c("Kozilek's Channeler",'{5}','Creature — Eldrazi Processor','{T}: Add {C}{C}.');
const land=(name='Wastes')=>({type:'land',card:name}),cast=(card,origin)=>({type:'cast',card:card.name,...(origin?{origin}:{})}),event=(scope='commander',effect='exile',extra={})=>({id:'interrupt',turn:4,scope,effect,commanderDestination:'command',...extra});
function run(first,script,spec=event(),extra={}){const cards=[...first,...Array.from({length:24},()=>({...wastes}))],options={commander:cmd,cards,order:cards.map((_,i)=>i),script,nativeExecution:true,nativeStage5:true,nativeDecisionPolicy:'conservative',stage7:{tutorPolicy:'legacy',disruptions:spec?[spec]:[]},...extra},r=evaluateGameplay(options),audit=auditGameplayTrace(r,options.commander,cards);assert.ok(audit.valid,JSON.stringify(audit));assert.deepEqual(evaluateGameplay(options),r);if(process.env.STAGE7_FIXTURE_DIR){const dir=process.env.STAGE7_FIXTURE_DIR,file='fixture-'+String(fixtureIndex.length+1).padStart(2,'0')+'.json.gz';fs.mkdirSync(dir,{recursive:true});const raw=gzipSync(JSON.stringify({run:r,audit,commander:options.commander,cards,cardRefs:cards.map(c=>cards.indexOf(c))}),{level:9});fs.writeFileSync(dir+'/'+file,raw);fixtureIndex.push({file,sha256:createHash('sha256').update(raw).digest('hex'),script,spec:options.stage7,recovery:summarizeRecovery(r)});fs.writeFileSync(dir+'/index.json',JSON.stringify(fixtureIndex,null,2)+'\n');}return {r,cards,options};}
const opening=[ring,wastes,wastes,wastes,wastes,wastes,channeler];
const recastScript={1:[land(),cast(ring)],2:[land()],3:[land(),cast(cmd)],4:[land(),cast(cmd)],5:[land(),cast(cmd)],6:[land(),cast(channeler)]};
test('real commander removal, taxed recast and resumed native execution are separate receipts',()=>{
 const {r}=run(opening,recastScript);const casts=r.trace.filter(e=>e.event==='cast-paid'&&e.id==='commander');assert.deepEqual(casts.map(e=>[e.turn,e.cost,e.spent.length]),[[3,cmd.mana_cost,5],[5,cmd.mana_cost+'{2}',7]]);assert.ok(r.trace.some(e=>e.turn===4&&e.event==='action-failed'));
 const s=summarizeRecovery(r)[0];assert.equal(s.commanderRecast.turn,5);assert.equal(s.firstNativeOrAccess.turn,6);assert.ok(r.stats.native.paidTriggers>0);assert.equal(s.status,'applied');
});
test('compound modeled nonland mana loss takes longer than commander-only loss without target timing assumptions',()=>{
 const script={...recastScript,6:[land(),cast(cmd)],7:[land(),cast(cmd)],8:[land(),cast(channeler)]},a=run(opening,script,event('commander-and-mana')),s=summarizeRecovery(a.r)[0];assert.deepEqual(s.removed.map(r=>r.card).sort(),['Sol Ring',cmd.name].sort());assert.equal(s.commanderRecast.turn,7);assert.equal(s.firstNativeOrAccess.turn,8);assert.equal(s.beforeMana.generic,5);assert.equal(s.afterMana.generic,3);
});
test('command-zone choice is optional: a commander left exiled is not freely recast',()=>{
 const a=run(opening,recastScript,event('commander','exile',{commanderDestination:'remain'}));assert.equal(a.r.trace.filter(e=>e.event==='cast-paid'&&e.id==='commander').length,1);assert.equal(a.r.trace.some(e=>e.event==='commander-zone'),false);assert.equal(summarizeRecovery(a.r)[0].commanderRecast.status,'censored-by-t8');
});
test('destroy and exile retain type distinctions and intrinsic indestructibility',()=>{
 const myr=c('Darksteel Myr','{3}','Artifact Creature — Myr','Indestructible'),script={1:[land(),cast(ring)],2:[land(),cast(myr)],3:[land(),cast(cmd)]};
 const a=run([ring,myr,...opening.slice(2)],script,event('creatures','destroy')),b=run([ring,myr,...opening.slice(2)],script,event('creatures','exile'));
 assert.ok(a.r.trace.find(e=>e.event==='disruption-complete').survivors.some(s=>s.id==='deck-1'));assert.ok(b.r.trace.find(e=>e.event==='disruption-complete').removed.some(s=>s.card===myr.name));assert.ok(a.r.trace.find(e=>e.event==='turn-end'&&e.turn===4).board.some(s=>s.card===ring.name));
 const artifact=run([ring,myr,...opening.slice(2)],script,event('nonland-types','exile',{types:['Artifact']}));assert.equal(artifact.r.trace.find(e=>e.event==='disruption-complete').removed.some(s=>s.card===cmd.name),false);
});
test('death triggers and conditional protection suspend as unknown, not a recovery failure',()=>{
 const sifter=c('Sifter of Skulls','{3}{B}','Creature — Eldrazi','Devoid\nWhenever another nontoken creature you control dies, create a 1/1 colorless Eldrazi Scion creature token with "Sacrifice this token: Add {C}."'),swamp=c('Swamp','','Basic Land — Swamp','{T}: Add {B}.'),a=run([ring,swamp,sifter,...opening.slice(2)],{1:[land('Swamp'),cast(ring)],2:[land(),cast(sifter)],3:[land(),cast(cmd)]},event('creatures','destroy'));
 assert.ok(a.r.stage7.suspendedUnknown);assert.equal(a.r.trace.some(e=>e.event==='disruption-move'),false);assert.equal(summarizeRecovery(a.r)[0].firstNativeOrAccess.status,'unknown');
 const b=removalEvidence([{id:'commander',card:{...cmd,oracle_text:'Ward {2}'}}],event());assert.ok(b.unknown.length);
});
test('token cessation and grave/exile/command transitions are independently audited',()=>{
 const nest=c('Nest Invader','{1}{G}','Creature — Eldrazi Drone','When this creature enters, create a 0/1 colorless Eldrazi Spawn creature token with "Sacrifice this token: Add {C}."'),a=run([ring,forest,nest,...opening.slice(2)],{1:[land('Forest'),cast(ring)],2:[land(),cast(nest)],3:[land(),cast(cmd)]},event('creatures','exile',{turn:3}));
 assert.ok(a.r.trace.some(e=>e.event==='disruption-token-ceased'));for(const mutate of [x=>{x.trace.find(e=>e.event==='disruption-move').id='deck-99';},x=>{x.trace.find(e=>e.event==='cast-paid'&&e.id==='commander').cost+='{2}';}]){const bad=structuredClone(a.r);mutate(bad);assert.equal(auditGameplayTrace(bad,cmd,a.cards).valid,false);}
});
const empath=c('Fierce Empath','{2}{G}','Creature — Elf','When this creature enters, you may search your library for a creature card with mana value 6 or greater, reveal it, put it into your hand, then shuffle.'),conduit=c('Conduit of Ruin','{6}','Creature — Eldrazi','When you cast this spell, you may search your library for a colorless creature card with mana value 7 or greater, reveal it, then shuffle and put that card on top.\nThe first creature spell you cast each turn costs {2} less to cast.'),bane=c('Bane of Bala Ged','{7}','Creature — Eldrazi','Whenever this creature attacks, defending player exiles two permanents they control.'),zhul=c('Zhulodok, Void Gorger','{5}{C}','Legendary Creature — Eldrazi','Colorless spells you cast from your hand with mana value 7 or greater have "Cascade, cascade."'),archive=c('Hedron Archive','{4}','Artifact','{T}: Add {C}{C}.\n{2}, {T}, Sacrifice this artifact: Draw two cards.');
test('state-aware real-card tutor chooses a payable cascade follow-up instead of the cheapest six',()=>{
 const first=[forest,ring,wastes,archive,zhul,empath,wastes,wastes,wastes,wastes,wastes,conduit,bane,c('Mind Stone','{2}','Artifact','{T}: Add {C}.')],script={1:[land('Forest'),cast(ring)],2:[land(),cast(archive)],3:[land(),cast(zhul)],4:[land(),cast(empath)],5:[land(),cast(bane)]};
 const a=run(first,{...script,5:[land(),cast(conduit)]},null),b=run(first,script,null,{stage7:{tutorPolicy:'state-aware',disruptions:[]}});
 assert.equal(a.r.trace.find(e=>e.event==='native-tutor').found,'deck-11');assert.equal(b.r.trace.find(e=>e.event==='native-tutor').found,'deck-12');assert.ok(b.r.stats.native.cascades>a.r.stats.native.cascades);assert.ok(b.r.stats.native.castsFromCascade>0);assert.equal(b.r.trace.filter(e=>e.event==='native-tutor-choice').length,b.r.stats.native.tutors);
 const bad=structuredClone(b.r),choice=bad.trace.find(e=>e.event==='native-tutor-choice'),paid=choice.facts.flatMap(f=>[f.now,f.next,f.jointNow,f.jointNext]).find(p=>p.status==='paid');paid.receipts.find(r=>r.kind==='payment').spent[0].type='W';assert.equal(auditGameplayTrace(bad,cmd,b.cards).valid,false);
});
test('legacy defaults preserve prior trace bytes; explicit no-event legacy mode preserves all actual actions',()=>{
 const a=run(opening,recastScript,null),without=structuredClone(a.options);delete without.stage7;const b=evaluateGameplay(without);assert.deepEqual(a.r.stats,b.stats);assert.deepEqual(a.r.trace,b.trace);
 assert.throws(()=>evaluateGameplay({...without,stage7:{tutorPolicy:'bad',disruptions:[]}}));assert.throws(()=>evaluateGameplay({...without,stage7:{tutorPolicy:'legacy',disruptions:[event('nonland-types','exile',{types:['Land']})]}}));
});

test('known artifact protection preserves a real top-access engine after a scoped destroy event',()=>{
 const mystic=c('Mystic Forge','{4}','Artifact','You may look at the top card of your library any time.\nYou may cast artifact spells and colorless spells from the top of your library.\n{T}, Pay 1 life: Exile the top card of your library.'),dynamo=c('Thran Dynamo','{4}','Artifact','{T}: Add {C}{C}{C}.'),shield=c('Darksteel Forge','{9}','Artifact','Artifacts you control have indestructible.'),monolith=c('Basalt Monolith','{3}','Artifact',"This artifact doesn't untap during your untap step.\n{T}: Add {C}{C}{C}.\n{3}: Untap this artifact."),powerstone=c('Worn Powerstone','{3}','Artifact','This artifact enters tapped.\n{T}: Add {C}{C}.');
 const first=[wastes,ring,dynamo,powerstone,shield,mystic,archive,wastes,wastes,wastes,wastes,wastes,channeler],script={1:[land(),cast(ring)],2:[land(),cast(dynamo),cast(powerstone)],3:[land(),cast(shield)],4:[land(),cast(mystic),cast(archive),cast(cmd)],5:[land(),cast(channeler,'library')]},spec=event('nonland-types','destroy',{turn:5,types:['Artifact']});
 const a=run(first,script,spec),b=run(first.map(x=>x===shield?monolith:x),{...script,3:[land(),cast(monolith)]},spec);
 assert.ok(a.r.trace.find(e=>e.event==='disruption-complete').survivors.length>=5);assert.equal(b.r.trace.find(e=>e.event==='disruption-complete').survivors.length,0);assert.ok(a.r.stats.topCasts>b.r.stats.topCasts);assert.ok(a.r.stats.native.paidTriggers>0);assert.equal(a.r.stage7.suspendedUnknown,false);
});
test('an absent selected engine is not a demonstrated failure and invalid commander transitions are rejected',()=>{
 const a=run(opening,recastScript,event('engine','exile',{card:'Mystic Forge'}));assert.equal(summarizeRecovery(a.r)[0].status,'not-applicable');
 const b=run(opening,recastScript);const bad=structuredClone(b.r);bad.trace.find(e=>e.event==='commander-zone').from='graveyard';assert.equal(auditGameplayTrace(bad,cmd,b.cards).valid,false);
});

test('multiple command-zone returns apply cumulative tax rather than one fixed surcharge',()=>{
 const options={stage7:{tutorPolicy:'legacy',disruptions:[event(),event('commander','exile',{id:'second',turn:6})]}},script={...recastScript,6:[land(),cast(cmd)],7:[land(),cast(cmd)],8:[land(),cast(channeler)]},a=run(opening,script,null,options);
 assert.deepEqual(a.r.trace.filter(e=>e.event==='cast-paid'&&e.id==='commander').map(e=>e.cost),[cmd.mana_cost,cmd.mana_cost+'{2}',cmd.mana_cost+'{4}']);assert.equal(summarizeRecovery(a.r)[0].firstNativeOrAccess.status,'censored-by-next-event');
});
test('top-destination planning cannot invent same-turn hand access or next-turn horizon',async()=>{
 const {chooseTutorTarget}=await import('../src/gameplayTutor.mjs'),eligible=[{id:'six',card:conduit},{id:'seven',card:bane}],blocked={status:'blocked'},paid={status:'paid'},choice=chooseTutorTarget(eligible,{turn:8,turns:8,board:[{card:zhul}],hand:[],nativeTypes:['Eldrazi'],preview:()=>({now:blocked,next:paid,jointNow:blocked,jointNext:paid})});assert.equal(choice.chosen,'six');assert.ok(choice.facts.every(f=>f.channel==='no-supported-payable-line'));
});
test('unmodeled granted targeting protection is unknown even when its source is not the selected commander',()=>{
 const shalai=c('Shalai, Voice of Plenty','{3}{W}','Legendary Creature — Angel','Flying\nYou, planeswalkers you control, and other creatures you control have hexproof.\n{4}{G}{G}: Put a +1/+1 counter on each creature you control.');
 const proof=removalEvidence([{id:'commander',card:cmd},{id:'other',card:shalai}],event());assert.ok(proof.unknown.some(r=>r.card===shalai.name));
});
test('an empty removal target set is known not-applicable despite unrelated unsupported recursion',()=>{
 const behemoth=c('Deathless Behemoth','{6}','Creature — Eldrazi','Sacrifice two Eldrazi Scions: Return this card from your graveyard to your hand.');const proof=removalEvidence([{id:'other',card:behemoth}],event('engine','exile',{card:'Mystic Forge'}));assert.equal(proof.targets.length,0);assert.deepEqual(proof.unknown,[]);
});
test('actual key-engine exile can resume access through a different supported channel',()=>{
 const mystic=c('Mystic Forge','{4}','Artifact','You may look at the top card of your library any time.\nYou may cast artifact spells and colorless spells from the top of your library.\n{T}, Pay 1 life: Exile the top card of your library.'),bean=c('Up the Beanstalk','{1}{G}','Enchantment','When this enchantment enters and whenever you cast a spell with mana value 5 or greater, draw a card.'),first=[ring,forest,wastes,mystic,bean,wastes,channeler],script={1:[land('Forest'),cast(ring)],2:[land(),cast(mystic)],3:[land(),cast(cmd)],4:[land(),cast(bean)],5:[land(),cast(channeler)]};
 const a=run(first,script,event('engine','exile',{turn:3,card:mystic.name})),s=summarizeRecovery(a.r)[0];assert.equal(s.status,'applied');assert.equal(s.removed[0].card,mystic.name);assert.equal(s.commanderRecast.status,'not-applicable');assert.equal(s.firstNativeOrAccess.turn,4);assert.ok(a.r.stats.native.resolvedCopies>0);assert.ok(a.r.trace.some(e=>e.event==='access-draw'&&e.source==='deck-4'));
});
