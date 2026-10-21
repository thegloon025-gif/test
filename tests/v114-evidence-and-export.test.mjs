import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceStructureEvidence} from '../src/sourceQuality.mjs';
import {researchEvidence} from '../src/autoResearch.mjs';
import {tempoEvidence,drawAccess} from '../src/playabilityEvidence.mjs';
import {archidektTextExport} from '../src/deckExport.mjs';

const card=(name,type_line,text='',cmc=2)=>({name,id:name,type_line,oracle_text:text,cmc,prices:{eur:0.2},legalities:{commander:'legal'}});
const lands=Array.from({length:37},(_,i)=>card(`Land ${i}`,'Land','{T}: Add {C}.',0));
const ramp=Array.from({length:12},(_,i)=>card(`Rock ${i}`,'Artifact','{T}: Add {C}.',2));
const draw=Array.from({length:9},(_,i)=>card(`Draw ${i}`,'Sorcery','Draw two cards.',3));
const removal=Array.from({length:9},(_,i)=>card(`Removal ${i}`,'Instant','Exile target creature.',2));
const shields=Array.from({length:4},(_,i)=>card(`Shield ${i}`,'Instant','Target creature gains hexproof until end of turn.',1));
const creatures=Array.from({length:28},(_,i)=>card(`Eldrazi ${i}`,'Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn token.',5));
const healthy=[...lands,...ramp,...draw,...removal,...shields,...creatures];
const useless=Array.from({length:62},(_,i)=>card(`Unrelated ${i}`,'Artifact','Scry 1.',6));
const poor=[...lands,...useless];
const toDeck=cards=>({mainboard:cards.map(c=>({id:c.id,quantity:1}))});

test('source quality prefers playable spell structure over equal-count filler',()=>{
 const good=sourceStructureEvidence(toDeck(healthy),healthy);
 const bad=sourceStructureEvidence(toDeck(poor),poor);
 assert.equal(good.knownCards,99);
 assert.ok(good.earlyRamp>=10);
 assert.ok(good.positiveDraw>=8);
 assert.ok(good.score>bad.score+15,JSON.stringify({good,bad}));
 assert.ok(researchEvidence(toDeck(healthy),healthy,191).relevance>researchEvidence(toDeck(poor),poor,191).relevance);
});

test('timing model distinguishes expensive, contingent activated draw from direct draw',()=>{
 const costly=card('Slow Engine','Artifact','{4}, {T}: Draw a card.',4);
 const fast=card('Two Cards','Sorcery','Draw two cards.',2);
 const conditional=card('Gated Engine','Enchantment','Whenever an opponent casts a spell, draw a card.',6);
 assert.equal(drawAccess(fast),1);
 assert.ok(drawAccess(costly)<.5,`costly=${drawAccess(costly)}`);
 assert.ok(drawAccess(conditional)<.5);
 const a=tempoEvidence([...lands,...ramp,...draw,costly]);
 assert.equal(a.efficientRamp,12);
 assert.ok(a.weightedCardFlow>=9&&a.weightedCardFlow<10);
});

test('export marks commander category for Archidekt without altering original export',()=>{
 const original=['1 Ulalek, Fused Atrocity *CMDR*',...healthy.slice(0,99).map(c=>'1 '+c.name)].join('\n');
 const result=archidektTextExport(original);
 assert.equal(result.split('\n').length,100);
 assert.equal(result.split('\n')[0],'1x Ulalek, Fused Atrocity [Commander]');
 assert.equal(result.split('\n')[1],'1x Land 0');
 assert.equal(original.split('\n')[0],'1 Ulalek, Fused Atrocity *CMDR*');
 assert.throws(()=>archidektTextExport('1 Ulalek *CMDR*'),/100-card/);
});
