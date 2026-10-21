import test from 'node:test';
import assert from 'node:assert/strict';
import {landAccess,manaRole,functionalRoles,deckQuality,supportProblems} from '../src/deckQuality.mjs';
import {generateDeck} from '../src/generator.mjs';

// Fixed, human-read Oracle fixtures for the user-reported failures. Card facts
// here do not come from the heuristics under test. No invented card prices.
const land=(name,oracle_text,type_line='Land')=>({id:name,name,type_line,oracle_text,cmc:0,color_identity:[],legalities:{commander:'legal'},prices:{eur:.2}});
const spell=(name,type_line,oracle_text,cmc=2)=>({id:name,name,type_line,oracle_text,cmc,color_identity:[],legalities:{commander:'legal'},prices:{eur:.2}});
const plan={needs:[{kind:'typed-cast',types:['Eldrazi']}],needsColorless:2};
const tower=land('Avengers Tower','{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a Hero spell or to activate an ability of a Hero source.\n{4}, {T}: Look at the top three cards of your library.');
const lair=land('Turtle Lair','{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a Ninja or Turtle spell.\n{3}, {T}: Target Ninja or Turtle can\'t be blocked this turn.');
const plaza=land('Plaza of Harmony','When this land enters, if you control two or more Gates, you gain 3 life.\n{T}: Add {C}.\n{T}: Add one mana of any type that a Gate you control could produce.');
const gate=land('Gond Gate','Gates you control enter untapped.\n{T}: Add {C}.','Land — Gate');
const monument=land('Forgotten Monument','{T}: Add {C}.\nOther Caves you control have "{T}, Pay 1 life: Add one mana of any color."','Land — Cave');
const anotherCave=land('Barren Cave','{T}: Add {B}.','Land — Cave');
const command=land('Command Tower',"{T}: Add one mana of any color in your commander's color identity.");
const context={commander:{name:'Ulalek, Fused Atrocity'},plan,spells:[spell('Eldrazi Warrior','Creature — Eldrazi','')],lands:[plaza,gate,monument]};

test('wrong-tribe restricted lands are NOT five-color sources in Ulalek',()=>{
 for(const c of [tower,lair]){
  const result=landAccess(c,context);
  assert.deepEqual(result.reliable,[],c.name);assert.deepEqual(result.conditional,[],c.name);
  assert.equal(result.colorless,true);
  assert.match(result.reasons.join(' '),/restricted to unsupported/);
 }
 assert.deepEqual(landAccess(command,context).reliable.sort(),['B','G','R','U','W']);
});

test('Plaza requires actual Gate mana; life-gain two-Gate condition does not block its colorless ability',()=>{
 const a=landAccess(plaza,context);
 assert.deepEqual(a.reliable,[]);assert.deepEqual(a.conditional,[]);assert.equal(a.colorless,true);
 assert.match(a.reasons.join(' '),/Gates provide no colored mana/);
 const rainbowGate=land('Rainbow Gate','{T}: Add one mana of any color.','Land — Gate');
 const b=landAccess(plaza,{...context,lands:[plaza,rainbowGate]});
 assert.deepEqual(b.conditional.sort(),['B','G','R','U','W']);
});

test('Forgotten Monument grants mana to OTHER Caves only',()=>{
 const lone=landAccess(monument,context);
 assert.deepEqual(lone.reliable,[]);assert.deepEqual(lone.conditional,[]);
 const empowered=landAccess(anotherCave,{...context,lands:[monument,anotherCave]});
 assert.deepEqual(empowered.reliable,['B']);
 assert.deepEqual(empowered.conditional.sort(),['B','G','R','U','W']);
});

test('repeatable ramp is distinct from Spawn/Scion/Powerstone and ability-only mana',()=>{
 const rock=spell('Mana Rock','Artifact','{T}: Add {C}.',2);
 const spawn=spell('Spawn Maker','Creature — Eldrazi','When this enters, create two 0/1 Eldrazi Spawn creature tokens.',2);
 const powerstone=spell('Powerstone Maker','Sorcery','Create a tapped Powerstone token.',2);
 const abilityMana=spell('Ability Battery','Artifact','{T}: Add {C}. Spend this mana only to activate abilities.',2);
 const hasty=spell('Huge Rock','Artifact','{T}: Add {C}.',5);
 assert.equal(manaRole(rock).effective,true);
 for(const c of [spawn,powerstone,abilityMana,hasty])assert.equal(manaRole(c).effective,false,c.name);
 assert.equal(manaRole(spawn).kind,'burst');assert.equal(manaRole(powerstone).kind,'powerstone');
 assert.equal(manaRole(spell('Forest tutor','Sorcery','Search your library for a Forest card, put that card onto the battlefield, then shuffle.',2)).effective,true);
});

test('protection requires defending other permanents, not self-hexproof',()=>{
 const self=spell('Self-protected Eldrazi','Creature — Eldrazi','Hexproof. Ward {2}.',4);
 const boots=spell('Protection Equipment','Artifact — Equipment','Equipped creature has hexproof and haste. Equip {1}.',2);
 const counter=spell('Shield Counterspell','Instant','Counter target spell.',2);
 const draw=spell('Card Drawer','Instant','Draw two cards.',2);
 assert.equal(functionalRoles(self).protection,false);
 assert.equal(functionalRoles(boots).protection,true);
 assert.equal(functionalRoles(counter).interaction,true);
 assert.equal(functionalRoles(counter).protection,true);
 assert.equal(functionalRoles(draw).draw,true);
});

test('dependency audit catches unsupported spell-type and Powerstone generators',()=>{
 const decks=[spell('Powerstone factory','Sorcery','Create two tapped Powerstone tokens.'),spell('Satchel engine','Artifact','Whenever you cast or copy an instant or sorcery spell, put a counter on this artifact. Draw a card.')];
 assert.match(supportProblems(decks[0],decks,plan).join(' '),/Powerstone mana cannot cast nonartifact/);
 assert.match(supportProblems(decks[1],decks,plan).join(' '),/instant\/sorcery engine/);
});

test('quality audit does not inflate repeatable ramp with token producers',()=>{
 const cards=[tower,lair,plaza,gate,monument,command];
 for(let i=0;i<35;i++)cards.push(spell(`Spawnmaker ${i}`,'Creature — Eldrazi','When this enters, create two 0/1 Eldrazi Spawn creature tokens.',3));
 for(let i=0;i<7;i++)cards.push(spell(`Answer ${i}`,'Instant','Destroy target creature.',2));
 const q=deckQuality({cards,commander:context.commander,plan,bracket:3});
 assert.equal(q.earlyMana,0);assert.equal(q.burstMana,35);
 assert.equal(q.landSources.W,1,'only Command Tower provides reliable white');
 assert.equal(q.interaction,7);
 assert.ok(q.warnings.some(x=>x.includes('Repeatable early mana')));
 assert.ok(q.landIssues.some(x=>x.card==='Turtle Lair'));
});

// Use a deliberately adversarial but reproducible synthetic card catalog:
// compare roles from the generated deck to independent minimums, not only the
// generator's own chosen score. These are NOT real Scryfall-priced card lists.
test('Bracket 3 reserves independently recognizable answers, draw and shielding',()=>{
 const cmd=spell('Ulalek, Fused Atrocity','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}.',5);
 cmd.color_identity=['W','U','B','R','G'];
 const fixture=[cmd];for(const [name,color] of [['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']])fixture.push(land(name,`{T}: Add {${color}}.`,`Basic Land — ${name}`));
 for(let i=0;i<90;i++)fixture.push(spell(`Eldrazi engine ${i}`,'Creature — Eldrazi','Whenever you cast an Eldrazi spell, create a 0/1 Eldrazi Spawn creature token.',2+i%4));
 for(let i=0;i<30;i++)fixture.push(spell(`Early mana rock ${i}`,'Artifact','{T}: Add {C}.',2));
 for(let i=0;i<25;i++)fixture.push(spell(`Answer ${i}`,'Instant','Destroy target creature.',2));
 for(let i=0;i<25;i++)fixture.push(spell(`Draw ${i}`,'Sorcery','Draw two cards.',2));
 for(let i=0;i<20;i++)fixture.push(spell(`Shield ${i}`,'Instant','Target creature gains hexproof until end of turn.',2));
 for(let i=0;i<300;i++)fixture.push(spell(`Unrelated ${i}`,'Artifact','{T}: Add {C}.',4));
 const r=generateDeck({cards:fixture,commander:cmd,bracket:3,budget:191});
 assert.equal(r.totalCards,100);assert.ok(r.price<=191);
 assert.ok(r.qualityAudit.interaction>=8,r.qualityAudit.interaction);
 assert.ok(r.qualityAudit.draw>=7,r.qualityAudit.draw);
 assert.ok(r.qualityAudit.protection>=3,r.qualityAudit.protection);
 assert.ok(r.qualityAudit.earlyMana>=8,r.qualityAudit.earlyMana);
 assert.ok(r.needs.find(x=>x.label.includes('Eldrazi')).actual>=21);
});
