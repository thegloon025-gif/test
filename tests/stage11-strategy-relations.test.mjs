import test from 'node:test';
import assert from 'node:assert/strict';
import {strategyRelations,distinctStrategy,refinementCohort,discoverStrategyPlans} from '../src/strategyRelations.mjs';
import {budgetPolicy,applyBudgetValuation,budgetUsage} from '../src/budgetPolicy.mjs';
import {priceOf} from '../src/cards.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {whyRows} from '../public/strategy.js';
const card=(name,type_line,oracle_text='',extra={})=>({id:name,name,type_line,oracle_text,cmc:2,prices:{eur:1},legalities:{commander:'legal'},color_identity:[],...extra});
const commander=card('Test Commander','Legendary Creature — Crab','Whenever another Crab you control dies, draw a card.');
const body=card('Material','Creature — Crab');
const outlet=card('Conversion','Creature — Crab','{1}, Sacrifice a creature: You gain 2 life.');
const payoff=card('Payoff','Enchantment','Whenever another nontoken creature you control dies, draw a card.');

test('general death engine records legal material, outlets and actual costs, not realized value',()=>{
 const r=strategyRelations([body,outlet,payoff],commander),row=r.relationships.find(x=>x.card==='Payoff');
 assert.equal(row.kind,'death:card-access');assert.equal(row.qualified,true);assert.ok(row.prerequisites.includes('Nontoken material required'));assert.deepEqual(row.outlets,['Conversion']);
 const sac=r.relationships.find(x=>x.card==='Conversion'&&x.kind==='sacrifice-outlet');assert.equal(sac.prerequisites[0],'{1}, ');
 assert.match(r.limitations,/no execution/);
});
test('unsupported guards and absent outlets remain conditional, not reliable access',()=>{
 const guarded=card('Conditional','Enchantment',"Whenever another creature you control dies, if you have three cards in hand, draw a card.");
 const row=strategyRelations([body,guarded],commander).relationships.find(x=>x.card==='Conditional');
 assert.equal(row.conditional,true);assert.equal(row.qualified,false);assert.deepEqual(row.outlets,[]);
 const r=strategyRelations([body,payoff],commander);assert.ok(!r.capabilities.includes('death:card-access'));
});
test('multi-role functions share a single permanent and material, not independent engines',()=>{
 const r=strategyRelations([body,outlet,payoff],commander);assert.ok(r.relationships.every(x=>Array.isArray(x.support)));
 const engine=card('Two functions','Creature — Crab','Sacrifice another creature: Scry 1.\nWhenever another creature you control dies, draw a card.');
 const two=strategyRelations([body,engine],commander).multiRole.find(x=>x.card===engine.name);
 assert.deepEqual(two.functions,['sacrifice-outlet','death:card-access']);assert.match(two.note,/share/);
});
test('death trigger text is not inferred from ETB or from unrelated card names',()=>{
 const fake=card('Deathly Payoff','Enchantment','When this enchantment enters, draw a card.');
 assert.ok(!strategyRelations([body,fake],commander).relationships.some(x=>x.card===fake.name));
 const unfamiliar={...commander,name:'Unseen Commander',id:'other'};assert.deepEqual(strategyRelations([body,outlet,payoff],unfamiliar).capabilities,strategyRelations([body,outlet,payoff],commander).capabilities);
});
const deck=(strategy,offset,kind='a',sourceKey=null)=>({strategy,sourceKey,cards:Array.from({length:20},(_,i)=>card('Body '+(i+offset),'Creature — Crab')),relations:{relationships:[{kind,card:'Engine '+kind,support:['Body'],qualified:true}]}});
test('cosmetic land or small spell changes cannot manufacture alternative strategies',()=>{
 assert.equal(distinctStrategy(deck('a',0),deck('b',5,'b')),false);
 assert.equal(distinctStrategy(deck('a',0),deck('b',15,'a')),false);
 assert.equal(distinctStrategy(deck('a',0),deck('b',15,'b')),true);
});
test('bounded refinement includes credible source candidates before redundant local role leaders',()=>{
 const chosen=deck('local:engine',0),local=deck('local:tempo',1),sources=[1,2,3].map(n=>deck('source:'+n,n*20,'source'+n,'source'+n));
 const cohort=refinementCohort([chosen,local,...sources],{preferred:chosen,commander});
 assert.equal(cohort.length,4);assert.ok(sources.every(x=>cohort.includes(x)));assert.ok(!cohort.includes(local));
});
test('mechanical discovery uses real catalog support without commander-specific labels or prices as quality',()=>{
 const engine=card('Observed engine','Enchantment','Whenever a creature you control enters, draw a card.');
 const creatures=Array.from({length:12},(_,i)=>card('Support '+i,'Creature — Crab'));
 const found=discoverStrategyPlans([engine,...creatures],commander,{budget:160});
 assert.equal(found.length,1);assert.equal(found[0].discovery.kind,'access-entry');assert.equal(found[0].anchors.size,3);
 assert.deepEqual(discoverStrategyPlans([engine],commander,{budget:160}),[]);
 assert.ok(found.every(x=>!x.label.includes('Crab archetype')));
});
test('strict budget and explicit four-euro tolerance share one hard maximum and usage reporting',()=>{
 assert.equal(budgetPolicy({budget:160}).effectiveMaximum,160);const p=budgetPolicy({budget:160,budgetTolerance:4});assert.equal(p.effectiveMaximum,164);
 assert.deepEqual([budgetUsage(p,162).unused,budgetUsage(p,162).overTarget],[2,2]);
 for(const input of [{budget:NaN},{budget:1},{budget:160.001},{budget:Infinity},{budgetTolerance:20},{budgetTolerance:'4'},{basicLandsOwned:'true'}])assert.throws(()=>budgetPolicy(input));
});
test('owned basics include Wastes while commander/nonbasics always count; original records unchanged',()=>{
 const wastes=card('Wastes','Basic Land','',{prices:{eur:0.5}}),nonbasic=card('Utility','Land','',{prices:{eur:2}});
 const original=[commander,wastes,nonbasic],owned=applyBudgetValuation(original,budgetPolicy({budget:160}));
 assert.deepEqual(owned.map(priceOf),[1,0,2]);
 const priced=applyBudgetValuation(original,budgetPolicy({budget:160,basicLandsOwned:false}));assert.deepEqual(priced.map(priceOf),[1,.5,2]);assert.equal(priceOf(original[1]),0);
 const d=withSelectedCards({deck:'1 Test Commander *CMDR*\n1 Wastes\n1 Utility',price:3.5,budget:164},priced[0],priced.slice(1));
 assert.equal(auditExportPricing(d,priced[0],priced).agreesWithGenerator,true);assert.equal(auditExportPricing(d,commander,original).agreesWithGenerator,false);
});
test('explanations disclose tradeoffs, prerequisite dependencies and unverified win conversion',()=>{
 const result={whyThisDeck:{selection:'Provisional, incomparable strategies',relations:strategyRelations([body,outlet,payoff],commander)},budgetPolicy:budgetUsage(budgetPolicy({budget:160,budgetTolerance:4}),102)};
 const text=whyRows(result).join('\n');assert.match(text,/hard maximum €164/);assert.match(text,/Payoff → death:card-access/);assert.match(text,/No win-conversion line is certified/);assert.match(text,/never determine these choices/);
});

test('conditional reductions and reversible zero-MV records cannot seed unsupported engine plans',()=>{
 const conditional=card('Conditional reducer','Creature — Human','Noncreature spells you cast cost {1} less to cast as long as there are three or more Lesson cards in your graveyard.');
 const spells=Array.from({length:12},(_,i)=>card('Real spell '+i,'Sorcery','Draw two cards.',{cmc:4}));
 assert.ok(!strategyRelations([conditional,...spells],commander).capabilities.includes('native:costReduction'));
 assert.deepEqual(discoverStrategyPlans([conditional,...spells],commander,{budget:191}),[]);
 const slow=card('Huge // Huge','Creature — Crab','',{cmc:0,card_faces:[{name:'Huge',type_line:'Creature — Crab',mana_cost:'{12}',oracle_text:''}],layout:'reversible_card'});
 const engine=card('Entry engine','Enchantment','Whenever a creature you control enters, draw a card.');
 const bodies=Array.from({length:9},(_,i)=>card('Body '+i,'Creature — Crab'));
 const found=discoverStrategyPlans([engine,slow,...bodies],commander,{budget:191});assert.ok(found.every(x=>!x.discovery.anchors.includes(slow.name)));
});

test('fourth refinement slot reaches unexpanded source even when shared scaffolding hides early differences',()=>{
 const local=deck('local:engine',0),a=deck('source:a',1,'a','a'),b=deck('source:b',2,'a','b'),c=deck('source:c',3,'a','c'),resilience=deck('local:resilience',30,'b');
 const result=refinementCohort([a,b,c,local,resilience],{commander,preferred:a,coverageLeaders:[local,b],limit:4});
 assert.deepEqual(result,[a,local,b,c]);
});

test('observed noncreature cast prerequisites match actual nonland spells and printed MV threshold',async()=>{
 const {planFor,synergy}=await import('../src/mechanics.mjs'),{engineContext,matchesCastNeed}=await import('../src/engineSupport.mjs');
 const cmd=card('Previously unseen commander','Legendary Creature — Wizard','Whenever you cast a noncreature spell with mana value 3 or greater, this creature deals 2 damage to each opponent.');
 const plan=planFor(cmd),need=plan.needs[0];assert.deepEqual(need,{kind:'typed-cast',types:['noncreature'],minManaValue:3});
 const yes=card('Qualifying','Sorcery','Draw two cards.',{cmc:3}),small=card('Too small','Instant','Draw a card.',{cmc:2}),creature=card('Creature','Creature — Wizard','',{cmc:5}),land=card('Land','Land','',{cmc:5});
 assert.equal(matchesCastNeed(yes,need),true);assert.ok(synergy(yes,plan).roles.includes('engine'));
 for(const no of[small,creature,land]){assert.equal(matchesCastNeed(no,need),false);assert.ok(!synergy(no,plan).roles.includes('engine'));}
 assert.deepEqual(engineContext([yes,small,creature,land],plan).native.map(c=>c.name),['Qualifying']);
 const reversed=card('Spell // Spell','Sorcery','',{cmc:0,layout:'reversible_card',card_faces:[{name:'Spell',type_line:'Sorcery',mana_cost:'{3}{U}'}]});assert.equal(matchesCastNeed(reversed,need),true);
});

test('standard lowercase spell descriptors and colorless match without granting creature or land casts',async()=>{
 const {matchesCastNeed}=await import('../src/engineSupport.mjs');
 const instant=card('Instant','Instant','',{cmc:3}),creature=card('Creature','Creature — Wizard','',{cmc:3});
 assert.equal(matchesCastNeed(instant,{kind:'typed-cast',types:['instant','sorcery']}),true);
 assert.equal(matchesCastNeed(creature,{kind:'typed-cast',types:['instant','sorcery']}),false);
 assert.equal(matchesCastNeed({...instant,colors:[]},{kind:'typed-cast',types:['colorless']}),true);
 assert.equal(matchesCastNeed({...instant,colors:['U']},{kind:'typed-cast',types:['colorless']}),false);
});
test('supported commander cast-pressure explanation includes exact support and never certifies a win',()=>{
 const cmd=card('Another unseen commander','Legendary Creature — Wizard','Whenever you cast a noncreature spell with mana value 3 or greater, this creature deals 2 damage to each opponent.');
 const yes=card('Qualifies','Sorcery','Draw two cards.',{cmc:3}),small=card('Small','Instant','',{cmc:2});
 const row=strategyRelations([yes,small],cmd).relationships.find(x=>x.kind==='cast:life-pressure');
 assert.deepEqual(row.support,['Qualifies']);assert.match(row.prerequisites.join(';'),/copies are not casts/);assert.match(row.prerequisites.join(';'),/lethal conversion unverified/);
});
