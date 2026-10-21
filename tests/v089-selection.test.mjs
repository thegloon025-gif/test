import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDeck} from '../src/generator.mjs';
import {castabilityIssues,responseProfile,selectionTotals,cardAdvantage,snowManaSource} from '../src/selectionPolicy.mjs';
import {synergy,planFor} from '../src/mechanics.mjs';

// Independent, explicitly synthetic priced corpus. Mana texts model supplied
// Scryfall Oracle language; no actual price or third-party rating is claimed.
const make=(name,type_line,oracle_text,cmc=2,mana_cost='{2}')=>({
 id:name,name,type_line,oracle_text,cmc,mana_cost,prices:{eur:.24},legalities:{commander:'legal'},
 color_identity:[],edhrec_rank:null
});
const commander={...make('Generic Eldrazi Caster','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy that spell.',5),color_identity:['W','U','B','R','G']};
const types=[['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']];
function fixture(){
 const cards=[commander,...types.map(([name,color])=>make(name,`Basic Land — ${name}`,`{T}: Add {${color}}.`,0,''))];
 for(let i=0;i<95;i++)cards.push(make(`Strategy card ${i}`,'Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn creature token.',2+i%5));
 for(let i=0;i<35;i++)cards.push(make(`Early Rock ${i}`,'Artifact','{T}: Add {C}.',2));
 for(let i=0;i<45;i++)cards.push(make(`Narrow Response ${i}`,'Instant','Counter target activated ability.',1));
 for(let i=0;i<35;i++)cards.push(make(`Soft Permission ${i}`,'Instant','Counter target spell unless its controller pays {1}.',2));
 for(let i=0;i<35;i++)cards.push(make(`Broad Permission ${i}`,'Instant','Counter target spell.',2));
 for(let i=0;i<35;i++)cards.push(make(`Permanent Answer ${i}`,'Instant','Exile target creature.',2));
 for(let i=0;i<35;i++)cards.push(make(`Commander Shield ${i}`,'Instant','Target creature gains hexproof until end of turn.',1));
 for(let i=0;i<35;i++)cards.push(make(`Advantage ${i}`,'Sorcery','Draw two cards.',2));
 for(let i=0;i<35;i++)cards.push(make(`Cantrip ${i}`,'Instant','Draw a card.',1));
 for(let i=0;i<90;i++)cards.push(make(`Filler ${i}`,'Artifact','Scry 1.',2));
 cards.push(make('Snow-only engine','Snow Artifact','When this enters, draw a card.',1,'{S}'));
 return cards;
}

test('snow symbols require an actual snow-producing land; colorless mana alone cannot pay {S}',()=>{
 const astrolabe=make("Arcum's Astrolabe",'Snow Artifact','When this artifact enters, draw a card.',1,'{S}');
 const wastes=make('Wastes','Basic Land — Wastes','{T}: Add {C}.',0,'');
 const snow=make('Snow-Covered Island','Basic Snow Land — Island','{T}: Add {U}.',0,'');
 const snowCreature=make('Snow creature without mana','Snow Creature — Elk','Vigilance.',2,'{1}{G}');
 assert.deepEqual(castabilityIssues(astrolabe,[wastes]),['requires {S} but the selected mana base has no snow-producing land']);
 assert.deepEqual(castabilityIssues(astrolabe,[wastes,snow]),[]);
 assert.equal(snowManaSource(snow),true);
 assert.equal(snowManaSource(snowCreature),false);
});

test('narrow ability counters and soft permission are not full hard answers; one-card cantrips do not generate advantage',()=>{
 assert.equal(responseProfile(make('Counter ability','Instant','Counter target activated or triggered ability.')).narrow,true);
 assert.equal(responseProfile(make('Counter spell','Instant','Counter target spell.')).narrow,false);
 assert.equal(responseProfile(make('Tax','Instant','Counter target spell unless its controller pays {1}.')).narrow,true);
 assert.equal(cardAdvantage(make('Cantrip','Instant','Draw a card.')),false);
 assert.equal(cardAdvantage(make('Divination','Sorcery','Draw two cards.')),true);
});

test('an independent type-matching engine is rewarded without requiring a commander-specific card name',()=>{
 const plan=planFor(commander);
 const payoff=make('Generic Tribal Payoff','Enchantment','Whenever you cast an Eldrazi spell, draw a card.',3);
 assert.ok(synergy(payoff,plan).impact>=8,JSON.stringify(synergy(payoff,plan)));
});

test('actual final B3 High and B4 exports exclude unsupported snow and bound reactive overflow',()=>{
 const cards=fixture();
 for(const [bracket,powerTarget] of [[3,'high'],[4,'balanced']]){
  const deck=generateDeck({cards,commander,bracket,powerTarget,budget:191});
  const spells=deck.sections.spells.map(name=>cards.find(c=>c.name===name));
  const totals=selectionTotals(spells);
  assert.equal(deck.totalCards,100);assert.ok(deck.price<=191);
  assert.ok(deck.needs.find(x=>/Eldrazi/.test(x.label)).actual>=21,JSON.stringify(deck.needs));
  assert.ok(totals.instants<=20,JSON.stringify(totals));
  assert.ok(totals.counters<=5,JSON.stringify(totals));
  assert.ok(totals.narrow<=2,JSON.stringify(totals));
  assert.equal(totals.snowDependent,0,'unpayable snow mana reached exported deck');
  assert.ok(deck.qualityAudit.interaction>=8,JSON.stringify(deck.qualityAudit));
  assert.ok(deck.qualityAudit.protection>=3,JSON.stringify(deck.qualityAudit));
  assert.ok(deck.selectionAudit.castabilityIssues.length===0);
  assert.equal(deck.deck,generateDeck({cards,commander,bracket,powerTarget,budget:191}).deck,'must remain deterministic');
 }
});

test('combo-network knowledge cannot force snow-cost cards into a manabase without snow',()=>{
 const cards=fixture(),snow=cards.find(c=>c.name==='Snow-only engine');
 const onplan=cards.find(c=>c.name==='Strategy card 1');
 const v={id:'hypothetical-snow-network',cards:[commander.name,snow.name,onplan.name],
  uses:[commander,snow,onplan].map(c=>({name:c.name,quantity:1,zoneLocations:['B']})),
  templateRequirements:[],legalities:{commander:true},identity:'WUBRG',isInfinite:true,
  results:['Infinite creature tokens'],prerequisites:['All three cards must be usable']};
 const d=generateDeck({cards,commander,budget:191,bracket:4,comboVariants:[v]});
 assert.ok(!d.sections.spells.includes(snow.name));
 assert.ok(!d.comboPlan.selected.some(x=>x.id===v.id));
 assert.equal(d.totalCards,100);
});
