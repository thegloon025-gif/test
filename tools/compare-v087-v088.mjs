/** Synthetic A/B fixture. This is NOT a real Scryfall catalog, Cardmarket
 * pricing, EDHCheck score, or EDHPowerLevel score. */
import {generateDeck as oldGenerator} from '../benchmarks/generator-v087-reference.mjs';
import {generateDeck as newGenerator} from '../src/generator.mjs';
const c=(name,type_line,oracle_text='',cmc=2)=>({id:name,name,type_line,oracle_text,cmc,prices:{eur:.22},legalities:{commander:'legal'},color_identity:[],edhrec_rank:null});
const commander={...c('Synthetic Ulalek','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}.',5),color_identity:['W','U','B','R','G']};
const cards=[commander];
for(const [name,col] of [['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']])cards.push({...c(name,`Basic Land — ${name}`,`{T}: Add {${col}}.`,0),prices:{eur:0}});
for(let i=0;i<85;i++)cards.push(c(`Eldrazi ${i}`,'Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn token.',2+i%5));
for(let i=0;i<45;i++)cards.push(c(`Rock ${i}`,'Artifact','{T}: Add {C}.',2));
for(let i=0;i<30;i++)cards.push(c(`Disruption ${i}`,'Instant','Counter target spell.',2));
for(let i=0;i<25;i++)cards.push(c(`Shield ${i}`,'Instant','Target creature gains hexproof until end of turn.',2));
for(let i=0;i<30;i++)cards.push(c(`Removal ${i}`,'Instant','Exile target creature.',2));
for(let i=0;i<25;i++)cards.push(c(`Draw ${i}`,'Instant','Draw two cards.',2));
for(let i=0;i<180;i++)cards.push(c(`Filler ${i}`,'Artifact','Scry 1.',3));
const hub=c('Overlapping Eldrazi Center','Creature — Eldrazi','When you cast an Eldrazi spell, create two 0/1 Eldrazi Spawn creature tokens.',4);
cards.push(hub);
const arms=Array.from({length:4},(_,i)=>c(`Engine Arm ${i}`,'Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn creature token.',4+i%3));
cards.push(...arms);
const comboVariants=arms.map((arm,i)=>({id:`fixture-${i}`,uses:[commander,hub,arm].map(c=>({name:c.name,quantity:1,zoneLocations:['B']})),cards:[commander.name,hub.name,arm.name],identity:'WUBRG',legalities:{commander:true},templateRequirements:[],isInfinite:true,results:[i%2?'Infinite damage':'Infinite creature tokens'],prerequisites:['Sufficient mana and game-state setup']}));
const results=[];
for(const [bracket,target] of [[3,'high'],[4,'balanced']])for(const [version,gen] of [['v0.8.7',oldGenerator],['v0.8.8',newGenerator]]){
 const d=gen({cards,commander,budget:191,bracket,powerTarget:target,comboVariants});
 results.push({version,bracket,syntheticEUR:d.price,cards:d.totalCards,lands:d.landCount,complete:d.comboPlan.inventoryComplete,planned:d.comboPlan.selected.length,newComboCards:d.comboPlan.selected.reduce((n,p)=>n+p.added.length,0),earlyMana:d.qualityAudit.earlyMana,interaction:d.qualityAudit.interaction,draw:d.qualityAudit.draw,protection:d.qualityAudit.protection,retainsCommanderPlan:d.needs[0]?.actual>=21});
}
console.log(JSON.stringify({disclaimer:'Synthetic fixture only; not live Scryfall prices, real-game strength, EDHCheck or EDHPowerLevel scores.',results},null,2));
