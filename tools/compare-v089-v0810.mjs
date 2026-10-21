/** v0.8.9 frozen generator vs v0.8.10 on independent synthetic cards.
 * No external scores, real card prices, or gameplay wins are asserted. */
import {generateDeck as old} from '../benchmarks/generator-v089-reference.mjs';
import {generateDeck as next} from '../src/generator.mjs';
import {scoreWholeDeck} from '../src/wholeDeckOptimizer.mjs';
import {selectionLimits,selectionTotals} from '../src/selectionPolicy.mjs';
import {planFor} from '../src/mechanics.mjs';
const c=(name,type_line,oracle_text,cmc=2,eur=.32)=>({id:name,name,type_line,oracle_text,cmc,prices:{eur},legalities:{commander:'legal'},color_identity:[],edhrec_rank:null});
const commander={...c('Unfamiliar Synthetic Eldrazi Commander','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy that spell.',5),color_identity:['W','U','B','R','G']};
const cards=[commander];
for(const [n,col] of [['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']])cards.push(c(n,`Basic Land — ${n}`,`{T}: Add {${col}}.`,0,0));
for(let i=0;i<100;i++)cards.push(c(`Eldrazi ${i}`,'Creature — Eldrazi','When you cast this spell, create two Eldrazi Spawn tokens.',2+i%6));
for(let i=0;i<40;i++)cards.push(c(`Rock ${i}`,'Artifact','{T}: Add {C}.',2));
for(let i=0;i<35;i++)cards.push(c(`Counter ${i}`,'Instant','Counter target spell.',2));
for(let i=0;i<35;i++)cards.push(c(`Removal ${i}`,'Instant','Exile target creature.',2));
for(let i=0;i<35;i++)cards.push(c(`Shield ${i}`,'Instant','Target creature gains hexproof until end of turn.',1));
for(let i=0;i<35;i++)cards.push(c(`Draw ${i}`,'Sorcery','Draw two cards.',2));
for(let i=0;i<150;i++)cards.push(c(`Filler ${i}`,'Artifact','Scry 1.',2));
// These generic late-added strategies ensure the catalog offers whole-deck
// alternatives without hardcoding an existing Magic card or commander.
for(let i=0;i<12;i++)cards.push(c(`Cast reward ${i}`,'Kindred Enchantment — Eldrazi','Whenever you cast an Eldrazi spell, draw a card.',3,.60));
const comparison=[];
for(const [bracket,powerTarget] of [[3,'high'],[4,'balanced']]){
 const previous=old({cards,commander,budget:191,bracket,powerTarget});
 const updated=next({cards,commander,budget:191,bracket,powerTarget});
 const score=d=>scoreWholeDeck(d.sections.spells.map(name=>cards.find(c=>c.name===name)).concat(d.sections.lands.map(name=>cards.find(c=>c.name===name))),{commander,plan:planFor(commander),bracket,limits:selectionLimits(planFor(commander),bracket,powerTarget)}).score;
 for(const [version,deck] of [['0.8.9',previous],['0.8.10',updated]]){
  const selected=deck.sections.spells.map(name=>cards.find(c=>c.name===name));
  comparison.push({version,bracket,powerTarget,score:score(deck),total:deck.totalCards,lands:deck.landCount,
   estimatedSyntheticPrice:deck.price,onPlan:deck.needs.find(x=>x.label.includes('Eldrazi'))?.actual,
   instants:selectionTotals(selected).instants,portfolios:deck.wholeDeckOptimization?.candidates?.length||1,
   refinementSwaps:deck.wholeDeckOptimization?.swaps.length||0,scoreGain:deck.wholeDeckOptimization?.gain||0});
 }
}
console.log(JSON.stringify({source:'Artificial test fixture. Values are INTERNAL heuristic only (not EDHCheck, EDHPowerLevel, actual Scryfall prices, or verified gameplay).',comparison},null,2));
