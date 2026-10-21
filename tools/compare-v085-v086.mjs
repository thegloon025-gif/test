/** Purely synthetic, self-contained A/B stress fixture. NOT a live Scryfall
 * data benchmark or independent gameplay simulation; fixed € amounts are fake.
 */
import {generateDeck as previous} from '../benchmarks/generator-v085-reference.mjs';
import {generateDeck as updated} from '../src/generator.mjs';
import {deckQuality} from '../src/deckQuality.mjs';
import {planFor} from '../src/mechanics.mjs';
const card=(name,type_line,oracle_text,cmc=2,price=.2)=>({id:name,name,type_line,oracle_text,cmc,color_identity:[],prices:{eur:price},legalities:{commander:'legal'},edhrec_rank:1000});
const commander=card('Ulalek, Fused Atrocity','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}.',5,.5);
commander.color_identity=['W','U','B','R','G'];
const cards=[commander];
for(const [name,sym] of [['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']])cards.push(card(name,`Basic Land — ${name}`,`{T}: Add {${sym}}.`,0,0));
const badLands=[
 ['Avengers Tower','{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a Hero spell or to activate an ability of a Hero source.'],
 ['Turtle Lair','{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a Ninja or Turtle spell.'],
 ['Plaza of Harmony','When this land enters, if you control two or more Gates, you gain 3 life.\n{T}: Add {C}.\n{T}: Add one mana of any type that a Gate you control could produce.']
];
for(const [name,t] of badLands)cards.push(card(name,'Land',t,0,.2));
cards.push(card('Gond Gate','Land — Gate','Gates you control enter untapped.\n{T}: Add {C}.',0,.2));
cards.push(card('Forgotten Monument','Land — Cave','{T}: Add {C}.\nOther Caves you control have "{T}, Pay 1 life: Add one mana of any color."',0,.2));
for(let i=0;i<32;i++)cards.push(card(`Reliable rainbow ${i}`,'Land',"{T}: Add one mana of any color in your commander's color identity.",0,.35));
for(let i=0;i<70;i++)cards.push(card(`Eldrazi engine ${i}`,'Creature — Eldrazi','When you cast this spell, create two Eldrazi Spawn tokens.',2+i%6,.1));
for(let i=0;i<35;i++)cards.push(card(`Mana rock ${i}`,'Artifact','{T}: Add {C}.',1+i%3,.15));
for(let i=0;i<25;i++)cards.push(card(`Answer ${i}`,'Instant','Exile target creature.',2,.2));
for(let i=0;i<25;i++)cards.push(card(`Draw ${i}`,'Sorcery','Draw two cards.',2,.2));
for(let i=0;i<25;i++)cards.push(card(`Protect ${i}`,'Instant','Target creature gains hexproof until end of turn.',2,.2));
for(let i=0;i<400;i++)cards.push(card(`Filler ${i}`,'Artifact','{3}, {T}: Draw a card.',2+i%3,.15));
const out=[];
for(const [version,fn] of [['v0.8.5',previous],['v0.8.6',updated]]){
 const d=fn({cards,commander,budget:191,bracket:3});
 const selected=d.sections.lands.map(name=>cards.find(c=>c.name===name)).concat(d.sections.spells.map(name=>cards.find(c=>c.name===name)));
 const q=deckQuality({cards:selected,commander,plan:planFor(commander),bracket:3});
 out.push({version,cards:d.totalCards,lands:d.landCount,syntheticEUR:d.price,early:q.earlyMana,interaction:q.interaction,protection:q.protection,draw:q.draw,landIssues:q.landIssues.map(x=>x.card),unsupportedSpells:q.spellIssues.length,eldrazi:d.needs.find(n=>n.label.includes('Eldrazi'))?.actual??0,singleton:new Set(d.sections.spells).size===d.sections.spells.length});
}
console.log(JSON.stringify({disclaimer:'Synthetic catalog with arbitrary EUR amounts; NOT the user’s real Scryfall deck or a gameplay power measurement.',results:out},null,2));
