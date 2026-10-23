import test from 'node:test';import assert from 'node:assert/strict';
import {refinePackageInvestments} from '../src/packageInvestment.mjs';
import {summarizeExecution,pairedEventInterval,compareExecutionCohorts} from '../src/gameplayComparison.mjs';
import {evaluateGameplay} from '../src/gameplayState.mjs';import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
const card=(name,text='',rest={})=>({id:name,name,type_line:'Artifact',oracle_text:text,mana_cost:'{2}',cmc:2,prices:{eur:.1},color_identity:[],legalities:{commander:'legal'},...rest});
const commander=card('Other commander','',{type_line:'Legendary Creature — Zombie',mana_cost:'{5}',cmc:5});
const fillers=Array.from({length:62},(_,i)=>card('Filler '+i));const land=card('Wastes','{T}: Add {C}.',{type_line:'Basic Land — Wastes',cmc:0,mana_cost:'',prices:{eur:0}});
const built={status:'ok',strategy:'fixture',cards:[...fillers,...Array.from({length:37},()=>({...land}))],committedCombos:[]};const ramp=card('Actual C ramp','{T}: Add {C}{C}.'),draw=card('Actual draw','{T}: Draw a card.');
function probe(add,remove,extra={}){const observed=[],r=refinePackageInvestments({built,pool:[...fillers,land,ramp,draw,...add],commander,budget:191,bracket:4,maxRounds:1,maxEvaluations:8,shadowOnly:true,shadowProposals:[{id:'specified',add,remove}],observeProposal:p=>observed.push(p),...extra});return {observed,r};}
test('declared coordinated packages use existing full-deck gates and preserve the input',()=>{
 const {observed}=probe([ramp,draw],fillers.slice(0,2));assert.equal(observed.length,1);assert.deepEqual(observed[0].shadowReasons,[]);assert.equal(observed[0].cards.length,99);assert.equal(built.cards.includes(ramp),false);
});
test('declared packages are inert in default production scheduling',()=>{
 const opts={built,pool:[...fillers,land,ramp,draw],commander,budget:191,bracket:4,maxRounds:1,maxEvaluations:8};
 assert.deepEqual(refinePackageInvestments(opts),refinePackageInvestments({...opts,shadowProposals:[{add:[ramp],remove:[fillers[0]]}]}));
});
test('explicit package cannot cut a source-native or reliable access commitment',()=>{
 const p=probe([ramp],[fillers[0]],{shadowProtectedNames:[fillers[0].name]});assert.ok(p.observed[0].shadowReasons.includes('protected native/access infrastructure'));
 const c={...built,committedCombos:[{cards:[fillers[0].name]}]};const q=probe([ramp],[fillers[0]],{built:c});assert.ok(q.observed[0].shadowReasons.includes('committed combo'));
});
test('explicit package rejects overbudget, duplicate and illegal incoming cards',()=>{
 const expensive=card('Too expensive','',{prices:{eur:200}});assert.equal(probe([expensive],[fillers[0]]).observed.length,0);
 assert.equal(probe([ramp,ramp],fillers.slice(0,2)).observed.length,0);
 const illegal=card('Illegal','',{legalities:{commander:'banned'}});assert.equal(probe([illegal],[fillers[0]]).observed.length,0);
 const x=probe([fillers[1]],[fillers[0]]);assert.ok(x.observed.length===0||x.observed[0].shadowReasons.includes('singleton/count'));
});
test('explicit package retains combo, source floor and functional restoration checks',()=>{
 assert.ok(probe([ramp],[fillers[0]],{comboViolation:()=>({id:'illegal combo'})}).observed[0].shadowReasons.includes('bracket combo inventory'));
 const source=new Set(fillers.slice(0,20).map(c=>c.id));assert.ok(probe([ramp],[fillers[0]],{source}).observed[0].shadowReasons.includes('source spine'));
});
const summary=(seed,status,extra={})=>({seed,policy:'native',decision:'conservative',status,lethalTurn:status==='conditional-lethal'?6:null,nativeCoverageIncomplete:false,landmarks:Object.fromEntries([3,5,7].map(t=>[t,{observed:status==='completed-t8',commander:1,netCards:0,draws:0,paidCopies:0,payableThreats:0}])),...extra});
test('event uncertainty keeps bounded or unsupported pairs interval-valued instead of zero',()=>{
 const b=[summary('a','completed-t8'),summary('b','search-unknown')],a=[summary('a','search-unknown'),summary('b','conditional-lethal')],r=pairedEventInterval(b,a,s=>s.status==='conditional-lethal');assert.equal(r.unknownPairs,2);assert.deepEqual(r.meanRange,[0,1]);assert.equal(r.lower,0);assert.equal(r.upper,1);
 const t=pairedEventInterval([summary('a','unsupported-rule-unknown')],[summary('a','completed-t8')],s=>s.status==='conditional-lethal');assert.deepEqual(t.meanRange,[-1,0]);
});
test('terminal-aware comparison separates early lethal, model loss and completed T8',()=>{
 const b=[summary('a','completed-t8'),summary('b','model-loss')],a=[summary('a','conditional-lethal'),summary('b','completed-t8')],r=compareExecutionCohorts(b,a).rows[0];assert.equal(r.after['conditional-lethal'],1);assert.equal(r.before['model-loss'],1);assert.equal(r.terminal.lethalBy8.meanRange[0],.5);assert.equal(r.terminal.modelLoss.meanRange[0],-.5);assert.equal(r.landmarks[5].n,0);assert.equal(r.landmarks[5].omitted.length,2);
});
test('paired event/landmark comparison rejects seed or pilot mixing',()=>{
 assert.throws(()=>pairedEventInterval([summary('a','completed-t8')],[summary('b','completed-t8')],()=>false));assert.throws(()=>compareExecutionCohorts([summary('a','completed-t8')],[{...summary('a','completed-t8'),decision:'other'}]));
});
test('early conditional lethal has no fabricated turn-eight hand or draw count',()=>{
 const f=card('Outlet','Whenever another colorless creature you control enters, this creature deals 1 damage to each opponent.',{mana_cost:'{0}',cmc:0,type_line:'Creature — Eldrazi'}),body=card('Entrant','',{mana_cost:'{0}',cmc:0,type_line:'Creature — Eldrazi'}),cards=[f,body,...fillers.slice(0,20)],r=evaluateGameplay({commander,cards,order:cards.map((_,i)=>i),nativeExecution:true,nativeStage5:true,opponentLife:[1,1,1],script:{1:[{type:'cast',card:f.name},{type:'cast',card:body.name}]}});assert.ok(auditGameplayTrace(r,commander,cards).valid);const s=summarizeExecution(r,{commander,cards});assert.equal(s.status,'conditional-lethal');assert.equal(s.lethalTurn,1);assert.equal(s.t8,null);assert.equal(s.landmarks[3].observed,false);assert.equal(s.prefix.damage,3);
});
test('ordinary eight-turn completion preserves observed T8 fields and partial-native abstention',()=>{
 const cards=built.cards,r=evaluateGameplay({commander,cards,nativeExecution:true,nativeStage5:true,script:{}}),s=summarizeExecution(r,{commander,cards});assert.equal(s.status,'completed-t8');assert.equal(s.t8.hand,r.observations.at(-1).handSize);
 for(const text of ['Commander ninjutsu {U}{B}.','Whenever another Zombie dies, create a token.','Whenever you cast a spell that targets only this creature, copy it.']){const c={...commander,oracle_text:text},s=summarizeExecution(r,{commander:c,cards});assert.equal(s.nativeCoverageIncomplete,true);assert.equal(compareExecutionCohorts([s],[s]).nativeAbstention,true);}
});

test('source-backed discovery finds a new complete tutor/mana/follow-up deck deterministically',async()=>{
 const {discoverGameplayChallengers,challengerSignature}=await import('../src/gameplayChallengers.mjs');
 const tribalCommander={...commander,oracle_text:'Whenever you cast a Zombie spell, draw a card.'};
 const creatures=Array.from({length:10},(_,i)=>card('Native six '+i,'',{mana_cost:'{6}',cmc:6,type_line:'Creature — Zombie',power:'4',toughness:'4'}));
 const input={...built,cards:[...creatures,...fillers.slice(10),...built.cards.filter(c=>c.type_line.startsWith('Basic'))]},saved=JSON.stringify(input);
 const tutor=card('Catalog tutor','When this creature enters, you may search your library for a creature card with mana value 6 or greater, reveal it, put it into your hand, then shuffle.',{type_line:'Creature — Elf',mana_cost:'{3}',cmc:3,power:'1',toughness:'1'});
 const threat=card('Native seven','',{type_line:'Creature — Zombie',mana_cost:'{7}',cmc:7,power:'7',toughness:'7'}),mana=card('Source double C','{T}: Add {C}{C}.');
 const source=new Set([...input.cards.filter(c=>!c.type_line.startsWith('Basic')).map(c=>c.id),mana.id,threat.id]),communityDecks=[{key:'fixture-source',validated:true,commanderIds:[commander.id],edhBracket:4,mainboard:[...source].map(id=>({id,quantity:1}))}],opts={built:input,pool:[...input.cards,tutor,threat,mana],commander:tribalCommander,bracket:4,budget:191,communityDecks,source,maxCandidates:2};
 const a=discoverGameplayChallengers(opts),b=discoverGameplayChallengers({...opts,pool:opts.pool.slice().reverse()});assert.ok(a.candidates.length>0,JSON.stringify({discovered:a.discovered,screening:a.screening,rejected:a.rejected.map(p=>p.shadowReasons)}));assert.deepEqual(a.candidates.map(c=>challengerSignature(c.cards)),b.candidates.map(c=>challengerSignature(c.cards)));assert.equal(JSON.stringify(input),saved);
 assert.equal(a.discovered.tutors[0].name,tutor.name);assert.deepEqual(a.discovered.tutors[0].sources,[]);assert.ok(a.candidates.every(c=>c.cards.length===99&&c.shadowReasons.length===0));assert.equal(a.productionSelectionChanged,false);
 assert.throws(()=>discoverGameplayChallengers({...opts,maxCandidates:5}));
});
test('payment bounds without a trace receipt conservatively withhold earlier landmarks',()=>{
 const cards=built.cards,r=evaluateGameplay({commander,cards,nativeExecution:true,nativeStage5:true,script:{}});r.stats.boundHits=1;const s=summarizeExecution(r,{commander,cards});assert.equal(s.status,'search-unknown');assert.equal(s.t8,null);assert.equal(s.unknownFrom,1);assert.equal(s.landmarks[3].observed,false);
 assert.throws(()=>summarizeExecution({...r,turns:4},{commander,cards}));
});
