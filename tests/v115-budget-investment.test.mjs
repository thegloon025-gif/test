import test from 'node:test';
import assert from 'node:assert/strict';
import {investRemainingBudget,constructStrategyDeck,conservativeComboViolation} from '../src/strategyFirst.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {priceOf,isLandSlot} from '../src/cards.mjs';

const make=(name,type_line,oracle_text='',cmc=2,eur=0.1,more={})=>({id:name,name,type_line,oracle_text,cmc,
 prices:{eur},color_identity:[],legalities:{commander:'legal'},...more});
const commander=make('Benchmark Tribal Commander','Legendary Creature — Eldrazi',
 'Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy that spell.',5,.4,
 {color_identity:['W','U','B','R','G']});
const basics=[['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']]
 .map(([n,col])=>make(n,`Basic Land — ${n}`,`{T}: Add {${col}}`,0,0));
const filler=Array.from({length:62},(_,i)=>make(`Weak Utility ${i}`,'Artifact','Scry 1.',2,0.12));
const premium=make('Powerful Eldrazi Value','Creature — Eldrazi','Whenever you cast an Eldrazi spell, draw two cards.',3,75);
const overCap=make('Very Expensive Value','Creature — Eldrazi','Whenever you cast an Eldrazi spell, draw two cards.',3,240);
const basicsDeck=[...Array.from({length:5},()=>basics[5]),...basics.slice(0,5),
 ...Array.from({length:27},()=>basics[0])];
const first={status:'ok',strategy:'test',cards:[...filler,...basicsDeck],price:Math.round((.4+62*.12)*100)/100,
 committedCombos:[]};

test('v1.1.5 spends unused headroom on a positive-quality upgrade, not on expensive filler',()=>{
 const opts={built:first,pool:[...filler,...basics,premium,overCap],commander,bracket:4,budget:90};
 const build=investRemainingBudget(opts);
 assert.ok(build.budgetInvestment.swaps.length>0,JSON.stringify(build.budgetInvestment));
 assert.ok(build.cards.some(c=>c.name===premium.name));
 assert.ok(!build.cards.some(c=>c.name===overCap.name));
 assert.ok(build.price>first.price+50);
 assert.ok(build.price<=90);
 assert.equal(build.cards.length,99);
 assert.equal(build.cards.filter(isLandSlot).length,37);
 assert.equal(validateCommanderSingleton(commander,build.cards).valid,true);
 assert.equal(first.cards.includes(premium),false,'the source deck must remain unchanged');
 const repeated=investRemainingBudget(opts);
 assert.deepEqual(build.budgetInvestment,repeated.budgetInvestment,'deterministic upgrade decisions');
});

test('v1.1.5 does not force spending or bypass a narrow budget',()=>{
 const noUseful=investRemainingBudget({built:first,pool:[...filler,...basics,overCap],commander,bracket:3,budget:90});
 assert.equal(noUseful.price,first.price);
 assert.equal(noUseful.budgetInvestment.swaps.length,0);
 assert.ok(noUseful.budgetInvestment.remaining>0);
});

test('v1.1.5 protects committed combo components from being swapped out',()=>{
 const committed={...first,committedCombos:[{id:'test',cards:[filler[0].name],added:[filler[0].name]}]};
 const improved=investRemainingBudget({built:committed,pool:[...filler,...basics,premium],commander,bracket:4,budget:90});
 assert.ok(improved.cards.some(c=>c.name===filler[0].name));
 assert.ok(improved.budgetInvestment.swaps.every(s=>s.out!==filler[0].name));
});

test('v1.1.5 never buys a recorded compact infinite into a B3 deck',()=>{
 const variant={id:'benchmark-pair',isInfinite:true,uses:[{name:filler[0].name,quantity:1},{name:premium.name,quantity:1}],templateRequirements:[]};
 const built=investRemainingBudget({built:first,pool:[...filler,...basics,premium],commander,bracket:3,budget:90,comboVariants:[variant]});
 assert.equal(conservativeComboViolation(built.cards,commander,[variant],3),null);
 assert.ok(!(built.cards.some(c=>c.name===premium.name)&&built.cards.some(c=>c.name===filler[0].name)),
  'if the expensive component is bought, the other compact-combo component must be absent');
});
