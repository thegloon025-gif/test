import test from 'node:test';
import assert from 'node:assert/strict';
import {investRemainingBudget,conservativeComboViolation} from '../src/strategyFirst.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {priceOf} from '../src/cards.mjs';
import {roleEvidence} from '../src/roleEvidence.mjs';

// Controlled fixtures: invented prices/text, never marketplace or gameplay evidence.
const card=(name,type_line='Artifact',oracle_text='Scry 1.',cmc=2,price=.1,extra={})=>
 ({id:name,name,type_line,oracle_text,cmc,prices:{eur:price},color_identity:[],legalities:{commander:'legal'},...extra});
const commander=card('Independent Zombie Commander','Legendary Creature — Zombie',
 'Whenever another Zombie you control dies, create a 2/2 black Zombie creature token.',4,1,{color_identity:['U','B']});
const island=card('Island','Basic Land — Island','{T}: Add {U}.',0,0);
const swamp=card('Swamp','Basic Land — Swamp','{T}: Add {B}.',0,0);
const lands=Array.from({length:37},(_,i)=>i%2?island:swamp);
const filler=Array.from({length:62},(_,i)=>card(`Filler ${i}`));
const makeBuilt=(spells=filler,committedCombos=[])=>({status:'ok',strategy:'fixture',cards:[...spells,...lands],
 price:priceOf(commander)+spells.reduce((n,c)=>n+priceOf(c),0),committedCombos});
const draw=(name,cmc,price)=>card(name,'Creature — Zombie','When this creature enters, draw two cards.',cmc,price);
const run=(built,pool,extra={})=>investRemainingBudget({built,pool,commander,bracket:4,budget:110,...extra});

test('portfolio compares complete affordable decks rather than consuming the cap on the first premium',()=>{
 const premium=draw('Premium',1,100),mediumA=draw('Moderate A',3,48),mediumB=draw('Moderate B',3,48);
 const built=makeBuilt(),pool=[...filler,premium,mediumA,mediumB];
 const result=run(built,pool,{maxSwaps:2});
 assert.ok(result.cards.includes(mediumA)&&result.cards.includes(mediumB));
 assert.ok(!result.cards.includes(premium));
 assert.equal(result.budgetInvestment.candidates.length,4);
 const quality=result.budgetInvestment.candidates.find(x=>x.mode==='quality');
 assert.ok(result.budgetInvestment.candidates[0].score>quality.score);
 assert.deepEqual(run(built,pool,{maxSwaps:2}),result);
 assert.deepEqual(built.cards,[...filler,...lands]);
});

test('cheaper positive upgrades can release budget; weak overpriced copies never earn a bonus',()=>{
 const costly=card('Costly filler','Artifact','Scry 1.',2,30);
 const spells=[costly,...filler.slice(1)],built=makeBuilt(spells,[{cards:filler.slice(1).map(c=>c.name)}]);
 const useful=draw('Affordable advantage',2,5);
 const overpriced=card('Overpriced filler','Artifact','Scry 1.',2,100);
 const result=run(built,[useful,overpriced],{budget:built.price});
 assert.ok(result.cards.includes(useful));assert.ok(!result.cards.includes(costly));
 assert.ok(!result.cards.includes(overpriced));assert.ok(result.price<built.price);
 assert.ok(result.budgetInvestment.swaps[0].extraCost<0);
});

test('reject a forbidden pair without globally discarding a card that can replace the other combo piece',()=>{
 const piece=card('Existing piece','Creature — Zombie','',4,.1);
 const built=makeBuilt([piece,...filler.slice(1)]),next=draw('New piece',2,4);
 const variant={id:'pair',isInfinite:true,uses:[piece,next].map(c=>({name:c.name,quantity:1})),templateRequirements:[]};
 const result=run(built,[next],{bracket:3,comboVariants:[variant]});
 assert.ok(result.cards.includes(next));assert.ok(!result.cards.includes(piece));
 assert.equal(conservativeComboViolation(result.cards,commander,[variant],3),null);
});

test('preserve committed pieces, singleton, legality and exact selected-printing pricing',()=>{
 const useful=draw('Selected advantage',2,40),tooMuch=draw('Over ceiling',1,400);
 const illegal=draw('Off color',1,1);illegal.color_identity=['R'];
 const committed=[{cards:[filler[0].name]}];
 const result=run(makeBuilt(filler,committed),[useful,tooMuch,illegal]);
 assert.ok(result.cards.includes(filler[0]));assert.ok(result.cards.includes(useful));
 assert.ok(!result.cards.includes(tooMuch)&&!result.cards.includes(illegal));
 assert.equal(validateCommanderSingleton(commander,result.cards).valid,true);
 const deck=withSelectedCards({price:result.price,budget:110,
  deck:[commander,...result.cards].map(c=>`1 ${c.name}`).join('\n')},commander,result.cards);
 const audit=auditExportPricing(deck,commander,[commander,...filler,island,swamp,useful,tooMuch,illegal]);
 assert.equal(audit.count,100);assert.equal(audit.agreesWithGenerator,true);
 assert.equal(audit.withinBudget,true);assert.deepEqual(audit.anomalies,[]);
});

test('do not break another card\'s support when replacing an independently weak artifact',()=>{
 const engine=card('Artifact engine','Enchantment','Whenever another artifact enters, draw a card.',2,.1);
 const artifacts=filler.slice(0,10),other=Array.from({length:51},(_,i)=>card(`Locked ${i}`,'Creature — Zombie','',3,.1));
 const spells=[engine,...artifacts,...other];
 const built=makeBuilt(spells,[{cards:[engine,...other].map(c=>c.name)}]);
 const result=run(built,[draw('Unsupported upgrade',2,2)]);
 assert.equal(result.budgetInvestment.swaps.length,0,'all ten artifacts support the locked draw engine');
});

test('fixed mana base rejects an upgrade introducing unsupported colored demand',()=>{
 const red=draw('Triple red advantage',1,2);red.mana_cost='{R}{R}{R}';red.color_identity=['R'];
 const redCommander={...commander,color_identity:['U','B','R']};
 const result=run(makeBuilt(),[red],{commander:redCommander});
 assert.ok(!result.cards.includes(red));
});

// Oracle-shaped counterexamples found while reviewing actual catalog deltas.
test('a draw-step damage trigger is not card advantage; restricted creature exile is not broad interaction',()=>{
 const vault=card('Draw-step mana rock','Artifact',"At the beginning of your draw step, if this artifact is tapped, it deals 1 damage to you.\n{T}: Add {C}{C}{C}.",1,5);
 assert.equal(roleEvidence(vault).draw,'none');
 const narrow=card('Restricted exile','Instant','Exile target creature with power or toughness 1 or less.\nCounter target sorcery spell.');
 assert.equal(roleEvidence(narrow).removal,'conditional');
 const broad=card('Unrestricted exile','Instant','Exile target creature. Its controller gains life equal to its power.');
 assert.equal(roleEvidence(broad).removal,'broad');
 const engine=card('Upkeep advantage','Enchantment','At the beginning of your upkeep, draw a card.');
 assert.equal(roleEvidence(engine).draw,'engine-conditional');
});
