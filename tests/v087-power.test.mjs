import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDeck} from '../src/generator.mjs';
import {spellEfficiency,highPowerAudit} from '../src/highPower.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';

// Adversarial SYNTHETIC objects, including synthetic low EUR prices. These
// model mechanics only; they are not Scryfall records or a Deckcheck benchmark.
function card(name,type_line,oracle_text,cmc=2){return {name,id:name,cmc,type_line,oracle_text,prices:{eur:.24},legalities:{commander:'legal'},color_identity:[],edhrec_rank:null};}
const commander={...card('Test Eldrazi Commander','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}.',5),color_identity:['W','U','B','R','G']};
function catalog(){
 const cards=[commander];
 for(const [name,color] of [['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']])cards.push(card(name,`Basic Land — ${name}`,`{T}: Add {${color}}.`,0));
 for(let i=0;i<95;i++)cards.push(card(`Eldrazi synergy ${i}`,'Creature — Eldrazi',i%3?'Whenever you cast an Eldrazi spell, create a 0/1 Eldrazi Spawn creature token.':'When this enters, create two 0/1 Eldrazi Spawn creature tokens.',2+i%6));
 for(let i=0;i<45;i++)cards.push(card(`Slow rock ${i}`,'Artifact','{T}: Add {C}.',4));
 for(let i=0;i<40;i++)cards.push(card(`Fast rock ${i}`,'Artifact','{T}: Add {C}.',2));
 for(let i=0;i<34;i++)cards.push(card(`Tax counter ${i}`,'Instant','Counter target spell unless its controller pays {1}.',2));
 for(let i=0;i<30;i++)cards.push(card(`Hard counter ${i}`,'Instant','Counter target spell.',2));
 for(let i=0;i<30;i++)cards.push(card(`True spot removal ${i}`,'Instant','Exile target creature.',2));
 for(let i=0;i<18;i++)cards.push(card(`Cheap card draw ${i}`,'Instant','Draw two cards.',2));
 for(let i=0;i<20;i++)cards.push(card(`Shield ${i}`,'Instant','Target creature gains hexproof until end of turn.',1));
 for(let i=0;i<100;i++)cards.push(card(`Unrelated ${i}`,'Artifact','Tap: Scry 1.',2));
 return cards;
}
const data=catalog();
test('power target validation refuses nonsensical values and non-B3 high requests',()=>{
 assert.throws(()=>generateDeck({cards:data,commander,bracket:3,powerTarget:'magic',budget:191}),/power target/i);
 assert.throws(()=>generateDeck({cards:data,commander,bracket:2,powerTarget:'high',budget:191}),/only for Bracket 3/i);
});
test('soft permission counters are weaker than unconditional counters; dedicated shielding is different',()=>{
 const soft=spellEfficiency(card('Conditional counter','Instant','Counter target spell unless its controller pays {2}.'));
 const hard=spellEfficiency(card('Hard counter','Instant','Counter target spell.'));
 const shield=spellEfficiency(card('Hexproof shield','Instant','Target creature gains hexproof until end of turn.'));
 assert.equal(soft.softCounter,true);assert.ok(hard.score>soft.score);
 assert.equal(hard.directShield,false);assert.equal(shield.directShield,true);
});
test('High B3 keeps 100 cards, singleton, price, and actual commander engine with independent efficiency targets',()=>{
 const high=generateDeck({cards:data,commander,budget:191,bracket:3,powerTarget:'high'});
 assert.equal(high.totalCards,100);assert.equal(high.landCount,37);assert.ok(high.price<=191);
 assert.equal(high.powerTarget,'high');
 const a=high.highPowerAudit;
 assert.ok(a.directShield>=3,JSON.stringify(a));
 assert.ok(a.spotRemoval>=3,JSON.stringify(a));
 assert.ok(a.cheapDraw>=5,JSON.stringify(a));
 assert.ok(a.efficientMana>=7,JSON.stringify(a));
 assert.ok(high.needs.find(x=>/Eldrazi/.test(x.label)).actual>=21);
 assert.equal(high.deck.split('\n').length,100);
 assert.equal(high.deck.split('\n').filter(line=>/Sol Ring/.test(line)).length,0);
 assert.equal(new Set(high.deck.split('\n').filter(x=>!/Plains|Island|Swamp|Mountain|Forest|Wastes/.test(x))).size,high.deck.split('\n').filter(x=>!/Plains|Island|Swamp|Mountain|Forest|Wastes/.test(x)).length);
});
test('High mode improves dedicated protection and spot removal versus balanced on adversarial catalog',()=>{
 const balanced=generateDeck({cards:data,commander,budget:191,bracket:3,powerTarget:'balanced'});
 const high=generateDeck({cards:data,commander,budget:191,bracket:3,powerTarget:'high'});
 const oldAudit=highPowerAudit(balanced.sections.spells.map(name=>data.find(c=>c.name===name)));
 assert.ok(high.highPowerAudit.directShield>oldAudit.directShield);
 assert.ok(high.highPowerAudit.spotRemoval>oldAudit.spotRemoval);
 assert.equal(balanced.highPowerAudit,null);
 const h=high.highPowerAudit;
 assert.ok(h.directShield>=3);assert.ok(h.spotRemoval>=3);
 assert.ok(h.softCounters<=2,JSON.stringify(h));
 assert.equal(high.bracket,3);assert.equal(balanced.bracket,3);
});
test('high-power setting preserves local Spellbook input and combo reporting',()=>{
 const added=[card('Glaring Fleshraker','Creature — Eldrazi Drone','Whenever you cast a colorless spell, create a 0/1 Eldrazi Spawn creature token.',3),card('Echoes of Eternity','Kindred Enchantment — Eldrazi','If a colorless spell you control would cause an ability of a permanent you control to trigger, that ability triggers an additional time.',6)];
 const v={id:'regression-eldrazi-loop',cards:[commander.name,...added.map(x=>x.name)],uses:[commander,...added].map(c=>({name:c.name,quantity:1,zoneLocations:['B']})),templates:[],templateRequirements:[],identity:'WUBRG',legalities:{commander:true},isInfinite:true,results:['Infinite damage'],prerequisites:['Cast a suitable Eldrazi spell and pay {C}{C}.']};
 const r=generateDeck({cards:[...data,...added],commander,budget:191,bracket:3,powerTarget:'high',comboVariants:[v]});
 assert.equal(r.totalCards,100);assert.ok(r.price<=191);
 assert.equal(r.comboPlan.knownVariants,1);
 assert.equal(r.comboPlan.executionVerified,false);
 assert.ok(r.comboPlan.candidatePackages>=0);
});
