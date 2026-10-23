import test from 'node:test';
import assert from 'node:assert/strict';
import {commonIdentityOrder,shadowSeeds,pairedInterval,diagnosePayment,createShadowEvaluator,compareShadowRuns,shadowVerdict,SHADOW_POLICIES,proposeShadowRepairs,nativeCoverageIncomplete,diagnoseShadowCohort,archivedShadowCommitments} from '../src/gameplayShadow.mjs';
import {refinePackageInvestments} from '../src/packageInvestment.mjs';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
const card=(name,type_line='Artifact',oracle_text='',cost='{2}',price=.1,rest={})=>({id:name,name,type_line,oracle_text,mana_cost:cost,cmc:Number(cost.match(/\d+/)?.[0]||0),prices:{eur:price},color_identity:[],legalities:{commander:'legal'},...rest});
const cmd=card('Commander','Legendary Creature — Eldrazi','','{4}',1);
const land=card('Wastes','Basic Land — Wastes','{T}: Add {C}.','',0);
const fillers=Array.from({length:62},(_,i)=>card('Filler '+i));
const cards=[...fillers,...Array(37).fill(land)];
const built={status:'ok',strategy:'fixture',cards,committedCombos:[]};
const ramp=card('Rock','Artifact','{T}: Add {C}{C}.','{2}',20),draw=card('Draw','Artifact','{T}: Draw a card.','{2}',10);
const names=(cs,seed)=>commonIdentityOrder(cs,seed).map(i=>cs[i].name);
test('common identities retain relative order despite insertion, deletion, position and printing changes',()=>{
 const old=['a','b','c','d'].map(n=>card(n)),changed=[card('extra'),{...old[2],id:'different-printing',prices:{eur:100}},old[0],old[3]];
 for(let i=0;i<40;i++)assert.deepEqual(names(old,'seed'+i).filter(n=>n!=='b'),names(changed,'seed'+i).filter(n=>n!=='extra'));
 assert.deepEqual(commonIdentityOrder(old,'s'),commonIdentityOrder(old,'s'));
 assert.ok(Array.from({length:10},(_,i)=>names(old,'s'+i)).some(order=>JSON.stringify(order)!==JSON.stringify(names(old,'s'))));
});
test('basic occurrences are distinct permutation entries and identities cannot be missing',()=>{
 const cs=[land,land,land,draw];const order=commonIdentityOrder(cs,'s');assert.equal(new Set(order).size,4);assert.deepEqual([...order].sort(),[0,1,2,3]);
 assert.throws(()=>commonIdentityOrder([{}],'s'),/identity/);
});
test('training/holdout namespaces are disjoint, reproducible and bounded',()=>{
 const s=shadowSeeds();assert.deepEqual(s,shadowSeeds());assert.equal(new Set([...s.training,...s.holdout]).size,24);assert.throws(()=>shadowSeeds({training:65}));
});
const source=(id,type)=>({id,modes:[{tap:true,outputs:[[type]]}],tapped:false,consumed:false,sick:false});
const context={kind:'spell',types:['Creature'],subtypes:['Eldrazi']};
test('diagnostic distinguishes color, true C, shortfall and unsupported without making a payment',()=>{
 const state={sources:[source('a','G'),source('b','G')],pool:[],life:40},copy=structuredClone(state);
 const probe={cost:'{1}{U}',reduction:0,context,status:'blocked'};
 assert.equal(diagnosePayment(state,probe).kind,'colored-payment-constraint');
 assert.equal(diagnosePayment(state,{...probe,cost:'{1}{C}'}).kind,'true-colorless-payment-constraint');
 assert.equal(diagnosePayment(state,{...probe,cost:'{3}'}).kind,'supported-mana-shortfall');
 assert.equal(diagnosePayment(state,{...probe,status:'unknown',reason:'unknown cost'}).kind,'coverage-unknown');assert.deepEqual(state,copy);
});
test('diagnostic restriction failures are not silently reclassified as exact colored mana',()=>{
 const state={sources:[{id:'restricted',modes:[{tap:true,outputs:[['C','C']],restriction:'abilities'}]}],pool:[],life:40};
 assert.equal(diagnosePayment(state,{cost:'{2}',reduction:0,context,status:'blocked'}).kind,'supported-mana-shortfall');
});
test('pre-action collection leaves Stage 2 trace/statistics byte-identical and receipts audited',()=>{
 const cs=[land,draw,...fillers.slice(0,18)],pre=[],options={commander:cmd,cards:cs,seed:'fixed',policy:'native'};
 const plain=evaluateGameplay(options),observed=evaluateGameplay({...options,onPreAction:p=>pre.push(p)});
 assert.deepEqual(observed,plain);assert.equal(pre.length,8);assert.ok(auditGameplayTrace(observed,cmd,cs).valid);
 pre[0].state.pool.push({type:'C'});assert.deepEqual(evaluateGameplay(options),plain);
});
test('cache includes exact card records/pricing/model, returns copies and bounds memory',()=>{
 const e=createShadowEvaluator({modelFingerprint:'a',maxEntries:1}),options={commander:cmd,cards:[land,...fillers.slice(0,15)],seed:'s',policy:'native'};
 const a=e.evaluate(options);a.summary.metrics.netAccess=999;const b=e.evaluate(options);assert.notEqual(b.summary.metrics.netAccess,999);assert.equal(e.stats.hits,1);
 const changed=e.evaluate({...options,cards:options.cards.map(c=>c===land?{...c,prices:{eur:10}}:c)});assert.notEqual(changed.key,b.key);assert.equal(e.stats.evictions,1);assert.equal(e.stats.audits,2);assert.equal(e.stats.replays,2);
 const f=createShadowEvaluator({modelFingerprint:'b'});assert.notEqual(f.evaluate(options).key,b.key);assert.throws(()=>createShadowEvaluator({}));
});
const fake=(policy,seed,commanderByT5,netAccess)=>({policy,seed,metrics:{modelSurvival:1,commanderByT5,commanderByT8:commanderByT5,commanderTempo:commanderByT5*4,netAccess,optionalPayments:0},unknown:[],boundHits:0,actionBoundHits:0});
const samples=(fn)=>SHADOW_POLICIES.flatMap(p=>Array.from({length:8},(_,i)=>fake(p,'s'+i,...fn(p,i))));
test('complete comparisons require all fixed pilots and exact seed/pilot pairing',()=>{
 const b=samples(()=>[0,0]),a=samples(()=>[1,2]);const c=compareShadowRuns(b,a);for(const p of SHADOW_POLICIES)assert.equal(c.byPolicy[p].netAccess.mean,2);
 assert.throws(()=>compareShadowRuns(b,a.slice(1)));assert.throws(()=>compareShadowRuns(b,a.map((r,i)=>i? r:{...r,seed:'other'})));
 assert.throws(()=>compareShadowRuns(b.slice(0,8),a.slice(0,8)),/pilot/);
});
test('a favorable pilot cannot hide another fixed pilot regression; holdout must agree',()=>{
 const b=samples(()=>[0,0]),a=samples(p=>p==='development'?[0,-2]:[1,2]);const mixed=compareShadowRuns(b,a),good=compareShadowRuns(b,samples(()=>[1,2]));
 assert.equal(shadowVerdict(good,mixed).status,'rejected-supported-regression');assert.equal(shadowVerdict(good,good).status,'supported-shadow-improvement');
 assert.equal(shadowVerdict(good,compareShadowRuns(b,b)).status,'inconclusive-tradeoffs');
});
test('unknown native execution protects unfamiliar strategies even against apparently favorable probes',()=>{
 for(const text of ['Commander ninjutsu {U}{B}.','Whenever a Zombie dies, draw a card.','Whenever you cast a spell that targets only this creature, copy it.'])assert.equal(nativeCoverageIncomplete({...cmd,oracle_text:text}),true);
 const b=samples(()=>[0,0]),c=compareShadowRuns(b,samples(()=>[1,2]));assert.equal(shadowVerdict(c,c,{nativeCoverageIncomplete:true}).status,'abstain-native-coverage');
});
test('unknown metrics remain unknown; all-tie intervals do not certify improvement',()=>{
 assert.equal(pairedInterval([NaN]).status,'unknown');assert.equal(pairedInterval([0,0]).allTies,true);const b=samples(()=>[0,0]),c=compareShadowRuns(b,b);assert.equal(shadowVerdict(c,c).status,'inconclusive-tradeoffs');
});
test('observer cannot select a production winner; affordable atomic packages and exact inputs preserved',()=>{
 const opts={built,pool:[ramp,draw],commander:cmd,budget:191,bracket:4,maxRounds:1,maxEvaluations:32},seen=[];
 const before=JSON.stringify(built),old=refinePackageInvestments(opts),observed=refinePackageInvestments({...opts,observeProposal:p=>{seen.push(p);return {cards:[]};}});
 assert.deepEqual(old,observed);assert.equal(JSON.stringify(built),before);assert.ok(seen.some(p=>p.add.length===2));assert.ok(seen.some(p=>p.shadowReasons.length===0));
});
test('shadow proposals retain commitments, native engines, access and hard budget',()=>{
 const castEngine=card('Cascade','Creature — Eldrazi','Cascade','{5}',1),access=draw;
 const base={...built,cards:[castEngine,access,...cards.slice(2)],committedCombos:[{cards:fillers.slice(2,7).map(c=>c.name)}]};
 const expensive={...ramp,name:'Too costly',id:'Too costly',prices:{eur:400}};
 const out=proposeShadowRepairs({built:base,pool:[ramp,draw,expensive],commander:cmd,budget:191,bracket:4,maxEvaluations:32});
 for(const p of out.proposals.filter(p=>p.eligible)){assert.ok(p.cards.includes(castEngine)&&p.cards.includes(access));assert.ok(fillers.slice(2,7).every(c=>p.cards.includes(c)));assert.ok(!p.cards.includes(expensive));assert.ok(p.price<=191);assert.equal(p.cards.length,99);}
 assert.equal(out.productionSelectionChanged,false);assert.ok(out.proposals.length>0);
});
test('source floors and bracket callback remain effective on coordinated shadow packages',()=>{
 const out=proposeShadowRepairs({built,pool:[ramp,draw],commander:cmd,budget:191,bracket:3,source:new Set(fillers.slice(0,20).map(c=>c.id)),comboViolation:cs=>cs.includes(ramp)&&cs.includes(draw)?'forbidden':null,maxEvaluations:32});
 for(const p of out.proposals.filter(p=>p.eligible)){assert.ok(!(p.cards.includes(ramp)&&p.cards.includes(draw)));assert.equal(p.cards.filter(c=>fillers.slice(0,20).includes(c)).length,20);}
 assert.ok(out.proposals.some(p=>p.shadowReasons.includes('source spine')||p.shadowReasons.includes('bracket combo inventory')));
});
test('conditional high-output sources and unsupported native triggers are protected before scheduling',()=>{
 const conditional=card('Conditional producer','Creature — Elf','{T}: Add {G}. If you control a creature with power 4 or greater, add {G}{G}{G}{G} instead.','{2}',15);
 const native=card('Native unknown draw','Creature — Eldrazi','Whenever an opponent plays a land, draw a card.','{6}',1);
 const base={...built,cards:[conditional,native,...cards.slice(2)]},out=proposeShadowRepairs({built:base,pool:[ramp,draw],commander:cmd,budget:191,bracket:4});
 assert.ok(out.protectedPhysicalCards.includes(conditional.name));assert.ok(out.protectedPhysicalCards.includes(native.name));
 for(const p of out.proposals.filter(p=>p.eligible))assert.ok(p.cards.includes(conditional)&&p.cards.includes(native));
});
test('shadow land packages remove one physical basic, preserve singleton and remain bounded',()=>{
 const rainbow=card('Rainbow','Land','{T}: Add one mana of any color.','',2);
 const colored={...cmd,color_identity:['G']},out=proposeShadowRepairs({built,pool:[rainbow,draw,ramp],commander:colored,budget:191,bracket:4,maxEvaluations:40});
 assert.ok(out.proposals.some(p=>p.add.includes(rainbow)));assert.ok(out.proposals.length<=40);
 for(const p of out.proposals){assert.equal(p.cards.length,99);if(p.add.includes(rainbow))assert.equal(p.cards.filter(c=>c.name==='Wastes').length,36);}
 assert.equal(built.cards.filter(c=>c===land).length,37,'original shared catalog references preserved');
});
test('actual complete decks expose a damaging mana substitution without any price reward',()=>{
 const good=card('Efficient rock','Artifact','{T}: Add {C}{C}.','{1}',.2),bad=card('Expensive weak rock','Artifact','{T}: Add {C}.','{5}',100);
 const bodies=Array.from({length:61},(_,i)=>card('Native '+i,'Creature — Eldrazi','','{3}',.1,{power:'3'}));
 const before=[good,...bodies,...Array(37).fill(land)],after=[bad,...before.slice(1)],e=createShadowEvaluator({modelFingerprint:'controlled-full-deck',replay:true,maxEntries:8});
 let tempo=0,budgetBonus=0;for(let i=0;i<16;i++)for(const policy of SHADOW_POLICIES){const options={commander:cmd,seed:'controlled-harm:'+i,policy};const b=e.evaluate({...options,cards:before}).summary,a=e.evaluate({...options,cards:after}).summary;tempo+=a.metrics.commanderTempo-b.metrics.commanderTempo;budgetBonus+=a.metrics.realizedDraws-b.metrics.realizedDraws;}
 assert.ok(tempo<0,'slower output is measured from actual plays, despite a higher price');assert.equal(budgetBonus,0);assert.equal(e.stats.audits,96);
});

test('cohort diagnosis separates shared resource evidence, pilot delays, coverage and spent mana',()=>{
 const runs=samples(()=>[0,0]).map(r=>({...r,commanderTurn:6,diagnostics:[{turn:5,commander:{status:'blocked',diagnosis:{kind:'colored-payment-constraint'}},hand:[],engines:[]}],postActionExhaustion:[{}],turns:[]}));
 let d=diagnoseShadowCohort(runs);assert.equal(d.crossPilotT5ResourceBottlenecks.length,8);assert.equal(d.postActionSpentSnapshots,24);
 runs[0].commanderTurn=4;d=diagnoseShadowCohort(runs);assert.equal(d.pilotSensitiveDelays.length,1);assert.equal(d.crossPilotT5ResourceBottlenecks.length,7);
 runs[1].diagnostics[0].commander.status='unknown';d=diagnoseShadowCohort(runs);assert.ok(d.coverageUnknownSeeds.includes('s1'));
 const b=samples(()=>[0,0]),a=samples(()=>[1,2]);a[0].boundHits=1;const c=compareShadowRuns(b,a);assert.equal(shadowVerdict(c,c).status,'abstain-search-bound');
});

test('archive template commitments normalize strings and structured matches without dropping pieces',()=>{
 const result=archivedShadowCommitments({selected:[{id:'loop',namedCards:['Commander','A'],templateMatches:[{card:'B'}]}],inventoryCombinations:[{id:'loop',namedCards:['A'],templateMatches:['C',{cards:['D','E']}]}]});
 assert.deepEqual(result,[{id:'loop',cards:['Commander','A','B','C','D','E']}]);assert.throws(()=>archivedShadowCommitments({selected:[{id:'bad',templateMatches:[{unrecognized:'piece'}]}]}),/shape/);
});
