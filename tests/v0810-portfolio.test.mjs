import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizeWholeDeck,scoreWholeDeck} from '../src/wholeDeckOptimizer.mjs';
import {planFor} from '../src/mechanics.mjs';
import {selectionLimits} from '../src/selectionPolicy.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {priceOf,isLandSlot,oracleId} from '../src/cards.mjs';

// Adversarial constructed starting deck: tests the portfolio algorithm in
// isolation, not alleged real cards, prices, opening hands or game results.
const c=(name,type_line,oracle_text,cmc=2,eur=.3)=>({id:name,name,type_line,oracle_text,cmc,mana_cost:`{${cmc}}`,prices:{eur},legalities:{commander:'legal'},color_identity:[],edhrec_rank:null});
const commander={...c('Test Five-color Commander','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy that spell.',5),color_identity:['W','U','B','R','G']};
const basics=[['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']].map(([name,color])=>c(name,`Basic Land — ${name}`,`{T}: Add {${color}}.`,0,0));
const original=[];
for(const x of basics)for(let i=0;i<6;i++)original.push(x);
for(let i=0;i<23;i++)original.push(c(`Tribal engine ${i}`,'Creature — Eldrazi','When you cast this, create two 0/1 Eldrazi Spawn creature tokens.',3));
for(let i=0;i<10;i++)original.push(c(`Accelerator ${i}`,'Artifact','{T}: Add {C}.',2));
for(let i=0;i<8;i++)original.push(c(`Removal ${i}`,'Instant','Exile target creature.',2));
for(let i=0;i<7;i++)original.push(c(`Advantage ${i}`,'Sorcery','Draw two cards.',3));
for(let i=0;i<3;i++)original.push(c(`Protection ${i}`,'Instant','Target creature gains hexproof until end of turn.',1));
for(let i=0;i<12;i++)original.push(c(`Underpowered filler ${i}`,'Artifact','Scry 1.',3));
const replacements=Array.from({length:16},(_,i)=>c(`Better tribal spell ${i}`,'Creature — Eldrazi','When you cast this, create two 0/1 Eldrazi Spawn creature tokens.',2,.4));
const catalog=[...original,...replacements];
const plan=planFor(commander);
const args=bracket=>({cards99:original,commander,plan,bracket,limits:selectionLimits(plan,bracket,bracket===3?'high':'balanced'),
 catalog,budget:191,commanderPrice:priceOf(commander),maxGameChangers:bracket===3?3:99,requiredRoles:[{role:'engine',target:21}]});

test('v0.8.10 portfolios replace weak filler without sacrificing the completed 99 or required functions',()=>{
 assert.equal(original.length,99);
 for(const bracket of [3,4]){
  const input=args(bracket),result=optimizeWholeDeck(input);
  assert.equal(result.cards.length,99);
  assert.ok(result.report.candidates.length===4);
  assert.ok(result.report.gain>0,JSON.stringify(result.report));
  assert.ok(result.cards.some(c=>c.name.startsWith('Better tribal')));
  assert.equal(result.cards.filter(isLandSlot).length,36);
  assert.ok(validateCommanderSingleton(commander,result.cards).valid);
  assert.ok(priceOf(commander)+result.cards.reduce((n,c)=>n+priceOf(c),0)<=191);
  const result2=optimizeWholeDeck(input);
  assert.deepEqual(result.cards.map(c=>c.name),result2.cards.map(c=>c.name));
  assert.ok(result.report.selectedScore>=result.report.baselineScore);
 }
});

test('locked engine parts cannot be removed by whole-deck refinements',()=>{
 const locked=original.find(c=>c.name==='Tribal engine 0');
 const out=optimizeWholeDeck({...args(4),lockedIds:new Set([oracleId(locked)])});
 assert.ok(out.cards.some(c=>oracleId(c)===oracleId(locked)));
});

test('independent whole-deck scorer gives diminishing returns to overlapping combos',()=>{
 const base=[...original];
 const known=[0,1,2,3,4].map(i=>({id:`overlap-${i}`,isInfinite:true,uses:[{name:commander.name},{name:'Tribal engine 0'},{name:`Tribal engine ${i+1}`}],legalities:{commander:true},results:['Infinite creature tokens']}));
 const constraints={commander,plan,bracket:4,limits:selectionLimits(plan,4),variants:known};
 const score=scoreWholeDeck(base,constraints);
 assert.equal(score.combo.complete,5);
 assert.ok(score.parts.networks>0);
 assert.ok(score.combo.components<known.length*3,'shared commander and component should not be treated as independent engines');
});
