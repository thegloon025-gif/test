import test from 'node:test';
import assert from 'node:assert/strict';
import {roleEvidence,dependencyEvidence,evidenceAudit} from '../src/roleEvidence.mjs';
import {landScore,optimizeManaBase} from '../src/manaBaseOptimizer.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {priceOf,isLandSlot} from '../src/cards.mjs';
const card=(name,type_line,oracle_text,cmc=2,eur=.5)=>({id:name,name,type_line,oracle_text,cmc,mana_cost:`{${cmc}}`,prices:{eur},legalities:{commander:'legal'},color_identity:[]});
const land=(name,text,kind='Land',eur=.25)=>card(name,kind,text,0,eur);
const plan={needs:[{kind:'typed-cast',types:['Eldrazi']}],needsColorless:2};
const commander={...card('Commander','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}.',5),color_identity:['W','U','B','R','G']};
const genericDraw=card('One-off cantrip','Instant','Draw a card.');
const directDraw=card('Two cards','Sorcery','Draw two cards.');
const filter=card('Loot spell','Instant','Draw two cards, then discard two cards.');
const delayed=card('Conditional draw engine','Artifact','Whenever you cast or copy an instant or sorcery spell, put a book counter on this. {3}, {T}, Remove three book counters: Draw a card.');
const broad=card('General removal','Instant','Exile target creature.');
const narrow=card('Artifact remover','Instant','Destroy target artifact.');
const shield=card('General shielding','Instant','Target creature gains hexproof until end of turn.');

test('strict draw evidence never treats cantrip, filtering or slow spell-driven draw as guaranteed card advantage',()=>{
 assert.equal(roleEvidence(genericDraw).draw,'cantrip-or-conditional');
 assert.equal(roleEvidence(filter).draw,'cantrip-or-conditional');
 assert.equal(roleEvidence(delayed).draw,'engine-conditional');
 assert.equal(roleEvidence(directDraw).draw,'positive');
 const audit=evidenceAudit([genericDraw,filter,delayed,directDraw]);
 assert.equal(audit.counts.positiveDraw,1);
});
test('conditional removal and dedicated shields remain separately identifiable',()=>{
 assert.equal(roleEvidence(broad).removal,'broad');
 assert.equal(roleEvidence(narrow).removal,'conditional');
 assert.equal(roleEvidence(shield).shield,'dedicated');
});
test('cyling and instant/sorcery payoffs require whole-deck support, not one Oracle phrase',()=>{
 const cycle=card('Cycling payoff','Enchantment','Whenever you cycle a card, draw a card.');
 const count=card('Cycle 1','Instant','Cycling {1}. Draw a card.');
 assert.match(dependencyEvidence(cycle,[cycle,count])[0],/only 1 cycling cards/);
 assert.match(dependencyEvidence(delayed,[delayed,directDraw])[0],/spell-cast payoff/);
});
test('land optimizer repairs wrong-tribe false fixing without breaking singleton, budget or colorless mana',()=>{
 const bad=land('Restricted Spire','{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a Ninja spell.');
 const good=land('Reliable Spire','{T}: Add one mana of any color.', 'Land',.6);
 const colorless=Array.from({length:5},(_,i)=>land(`True Colorless ${i}`,'{T}: Add {C}.'));
 const basic=[['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G']].map(([n,x])=>land(n,`{T}: Add {${x}}.`,`Basic Land — ${n}`,0));
 const spells=Array.from({length:63},(_,i)=>card(`Eldrazi ${i}`,'Creature — Eldrazi','When you cast this spell, create an Eldrazi Spawn.',2,.1));
 const start=[bad,...colorless,...basic.flatMap(l=>Array(6).fill(l)),...spells];
 assert.equal(start.length,99);
 const before=landScore(start,{commander,plan});
 const args={cards99:start,commander,plan,catalog:[bad,good,...colorless,...basic],budget:191,commanderPrice:1,maxSwaps:2};
 const out=optimizeManaBase(args);
 assert.ok(out.report.selectedScore>out.report.baselineScore);
 assert.ok(out.cards.some(x=>x.name==='Reliable Spire'));
 assert.equal(out.cards.filter(isLandSlot).length,36);
 assert.ok(out.report.realColorless>=before.realColorless);
 assert.ok(validateCommanderSingleton(commander,out.cards).valid);
 assert.ok(out.cards.reduce((n,x)=>n+priceOf(x),1)<=191);
 assert.deepEqual(out.cards.map(c=>c.name),optimizeManaBase(args).cards.map(c=>c.name));
});
test('land optimization cannot trade away the final snow mana source for a nominally better rainbow land',()=>{
 const snowLand=land('Snowland','{T}: Add {C}.','Snow Land');
 const rainbow=land('Superior Rainbow','{T}: Add one mana of any color.');
 const other=land('Plain Colorless','{T}: Add {C}.');
 const snowSpell={...card('Snow Spell','Instant','Draw two cards.',1,.5),mana_cost:'{S}'};
 const spells=[snowSpell,...Array.from({length:62},(_,i)=>card(`Other spell ${i}`,'Creature — Eldrazi','When you cast this spell, create an Eldrazi Spawn.',2,.3))];
 const basics=[['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G']].map(([n,x])=>land(n,`{T}: Add {${x}}.`,`Basic Land — ${n}`,0));
 const start=[snowLand,other,...basics.flatMap(l=>Array(6).fill(l)).slice(0,34),...spells];
 const r=optimizeManaBase({cards99:start,commander,plan,catalog:[snowLand,rainbow,other,...basics],budget:191,commanderPrice:1});
 assert.ok(r.cards.some(x=>x.name==='Snowland'));
});
