/** Deterministic, adversarial synthetic catalog only. No actual Scryfall
 * EUR values or EDHCheck/EDHPowerLevel measurements are synthesized here. */
import {generateDeck as baseline} from '../benchmarks/generator-v088-reference.mjs';
import {generateDeck as updated} from '../src/generator.mjs';
import {selectionTotals,castabilityIssues} from '../src/selectionPolicy.mjs';
const card=(name,type_line,oracle_text,cmc=2,mana_cost='{2}')=>({id:name,name,type_line,oracle_text,cmc,mana_cost,prices:{eur:.22},legalities:{commander:'legal'},color_identity:[],edhrec_rank:null});
const commander={...card('Synthetic Tribal Commander','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}.',5),color_identity:['W','U','B','R','G']};
const cards=[commander];
for(const [n,col] of [['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']])cards.push(card(n,`Basic Land — ${n}`,`{T}: Add {${col}}.`,0,''));
for(let i=0;i<90;i++)cards.push(card(`Eldrazi Strategy ${i}`,'Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn token.',3+i%4));
for(let i=0;i<40;i++)cards.push(card(`Repeatable Mana ${i}`,'Artifact','{T}: Add {C}.',2));
for(let i=0;i<45;i++)cards.push(card(`Ability Counter ${i}`,'Instant','Counter target activated or triggered ability.',1));
for(let i=0;i<40;i++)cards.push(card(`Tax Counter ${i}`,'Instant','Counter target spell unless its controller pays {1}.',2));
for(let i=0;i<40;i++)cards.push(card(`Hard Counter ${i}`,'Instant','Counter target spell.',2));
for(let i=0;i<30;i++)cards.push(card(`Removal ${i}`,'Instant','Exile target creature.',2));
for(let i=0;i<30;i++)cards.push(card(`Shield ${i}`,'Instant','Target creature gains hexproof until end of turn.',1));
for(let i=0;i<35;i++)cards.push(card(`Draw ${i}`,'Instant','Draw two cards.',2));
for(let i=0;i<150;i++)cards.push(card(`Offplan ${i}`,'Artifact','Scry 1.',2));
cards.push(card('AAA Snow-burdened Eldrazi','Creature — Eldrazi','When you cast this spell, create three Eldrazi Spawn creature tokens.',2,'{S}'));
const results=[];
for(const [bracket,target] of [[3,'high'],[4,'balanced']]){
 for(const [version,gen] of [['v0.8.8',baseline],['v0.8.9',updated]]){
  const d=gen({cards,commander,budget:191,bracket,powerTarget:target});
  const spells=d.sections.spells.map(n=>cards.find(c=>c.name===n));
  const audit=selectionTotals(spells);
  results.push({version,bracket,total:d.totalCards,lands:d.landCount,syntheticPriceEUR:d.price,
   typedSpellCount:d.needs.find(x=>x.label.includes('Eldrazi'))?.actual,
   ...audit,unsupportedSnow:spells.filter(c=>castabilityIssues(c,d.sections.lands.map(n=>cards.find(x=>x.name===n))).length).map(c=>c.name),
   effectiveInteraction:d.qualityAudit.interaction,commanderProtection:d.qualityAudit.protection,draw:d.qualityAudit.draw});
 }
}
console.log(JSON.stringify({disclaimer:'Artificial priced fixtures only: NOT real Scryfall EUR, external rating, gameplay simulation, or bracket certification.',results},null,2));
