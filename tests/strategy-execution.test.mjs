import test from 'node:test';
import assert from 'node:assert/strict';
import {payExecutionCost,strategyExecution,executionDominates} from '../src/strategyExecution.mjs';
import {selectInvestmentDeck} from '../src/packageInvestment.mjs';
const c=(name,type_line,oracle_text,mana_cost,extra={})=>({id:name,name,type_line,oracle_text,mana_cost,cmc:2,color_identity:[],prices:{eur:1},...extra});
const commander=c('Probe Commander','Legendary Creature — Zombie','Whenever you cast a Zombie spell, you may pay {C}{C}. If you do, copy that spell.','{C/U}{C/B}',{color_identity:['U','B']});
const unit=options=>({units:1,options});
test('joint exact payment keeps two true-colorless mana after colored and hybrid casting',()=>{
 assert.equal(payExecutionCost('{U}{B}',[unit(['U','B']),unit(['C']),unit(['C'])],{extra:'{C}{C}'}),null);
 assert.notEqual(payExecutionCost('{U}{B}',[unit(['U']),unit(['B']),unit(['C']),unit(['C'])],{extra:'{C}{C}'}),null);
 assert.notEqual(payExecutionCost('{C/U}{C/B}',[unit(['C']),unit(['C'])]),null);
 assert.equal(payExecutionCost('{C}',[unit(['U','B'])]),null);
 assert.equal(payExecutionCost('{S}',[unit(['C'])]),null);
 assert.equal(payExecutionCost('{X}',[unit(['C'])]),null);
 assert.equal(payExecutionCost('{2}{U}',[unit(['C']),unit(['C'])],{reduction:2}),null);
});
test('deployment probes are deterministic and cannot use arbitrary uncastable engines or fictional mana',()=>{
 const land=c('True source','Basic Land','{T}: Add {C}.','',{cmc:0});
 const spells=Array.from({length:62},(_,i)=>c('Zombie '+i,'Creature — Zombie','Trample','{2}'));
 const engine=c('Supported stream','Enchantment','Whenever you cast a creature spell, draw a card.','{U}{U}{U}');
 const cards=[...Array(36).fill(land),...spells,engine];
 const result=strategyExecution(cards,commander,undefined,{trials:32});
 assert.deepEqual(strategyExecution(cards,commander,undefined,{trials:32}),result);
 assert.equal(result.counts.repeatableAccessOnline,0);
 assert.equal(result.counts.supportedEngineOnline,0);
 assert.ok(result.counts.commanderFollowupWithPayment>0);
 const restricted=c('Restricted mana','Artifact','{T}: Add {U}{U}{U}. Spend this mana only to cast artifact spells.','{0}');
 const bad=strategyExecution(cards.map(x=>x===land?restricted:x),commander,undefined,{trials:32});
 assert.equal(bad.counts.commanderDeployed,0);assert.equal(bad.counts.repeatableAccessOnline,0);
});
test('execution comparison needs paired, significant improvement with no endpoint loss; price has no vote',()=>{
 const result=bits=>({trials:32,turns:8,seed:'paired',counts:{engine:[...bits].filter(x=>x==='1').length,commander:32},samples:{engine:bits,commander:'1'.repeat(32)}});
 const a=result('1'.repeat(32)),b=result('0'.repeat(32));
 assert.equal(executionDominates(a,b),true);assert.equal(executionDominates(b,a),false);
 assert.equal(executionDominates(result('1'.repeat(17)+'0'.repeat(15)),result('1'.repeat(16)+'0'.repeat(16))),false);
 const weak={strategy:'weak',cards:[],price:108},strong={strategy:'strong',cards:[{}],price:180};
 const selected=selectInvestmentDeck([weak,strong],{commander,score:cards=>cards.length?-100:100,evidenceFor:()=>({vector:{same:1}}),executionFor:cards=>cards.length?a:b,executionDominates});
 assert.equal(selected,strong);
 const loss={...a,counts:{...a.counts,commander:31}};assert.equal(executionDominates(loss,b),false);
});

test('per-kind execution cannot equate a generic access engine with a lost cascade stream',()=>{
 const land=c('Source','Basic Land','{T}: Add {C}.','',{cmc:0});
 const creatures=Array.from({length:60},(_,i)=>c('Body '+i,'Creature — Zombie','Trample','{2}'));
 const cascade=c('Cascade stream','Artifact','Spells you cast with mana value 2 or greater have cascade, cascade.','{2}');
 const stream=c('Draw stream','Artifact','Whenever you cast a creature spell, draw a card.','{2}');
 const base=[...Array(37).fill(land),...creatures];
 const native=strategyExecution([...base,cascade,c('Padding','Artifact','Scry 1.','{2}')],commander,undefined,{trials:32});
 const access=strategyExecution([...base,stream,c('More padding','Artifact','Scry 1.','{2}')],commander,undefined,{trials:32});
 assert.ok(native.counts.cascadeOnline>0);assert.equal(access.counts.cascadeOnline,0);
 assert.equal(executionDominates(access,native),false);
 const expensive=base.map(x=>({...x,prices:{eur:100}}));
 assert.deepEqual(strategyExecution([...expensive,cascade,c('Padding','Artifact','Scry 1.','{2}')],commander,undefined,{trials:32}),native);
});

test('unmodeled commander mechanics keep probe diagnostics but cannot prune a strategy',()=>{
 const fast={trials:32,turns:8,seed:'fixed',comparisonEligible:false,counts:{commander:32},samples:{commander:'1'.repeat(32)}};
 const slow={...fast,counts:{commander:0},samples:{commander:'0'.repeat(32)}};
 assert.equal(executionDominates(fast,slow),false);
 const ninja=c('Ninja Commander','Legendary Creature — Ninja','Commander ninjutsu {U}{B}.','{1}{U}{B}',{color_identity:['U','B']});
 const lands=Array(37).fill(c('Island','Basic Land — Island','{T}: Add {U}.','',{cmc:0}));
 const result=strategyExecution([...lands,...Array.from({length:62},(_,i)=>c('Rogue '+i,'Creature — Rogue',"This creature can't be blocked.",'{U}'))],ninja,undefined,{trials:8});
 assert.equal(result.comparisonEligible,false);assert.ok(result.unmodeledNeeds.includes('ninjutsu'));
});
