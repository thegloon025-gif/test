import test from 'node:test';
import assert from 'node:assert/strict';
import {castHasSubtype,castHasType,playableLand,isLandSlot,legalFor,trueColorlessSource,compact,isCommander} from '../src/cards.mjs';
import {planFor,analysis,synergy} from '../src/mechanics.mjs';
import {generateDeck} from '../src/generator.mjs';
// Manually verified fixture facts. These expected values are NOT computed by engine classifiers.
const card=(name,opts={})=>({id:opts.id||name,name,layout:opts.layout||'normal',type_line:opts.type_line||'Creature — Test',oracle_text:opts.oracle_text||'',mana_cost:opts.mana_cost||'{1}',cmc:opts.cmc??1,color_identity:opts.color_identity||[],prices:{eur:opts.price??0.2},legalities:{commander:'legal'},edhrec_rank:opts.edhrec_rank??5000,card_faces:opts.card_faces,power:opts.power,game_changer:!!opts.game_changer,produced_mana:opts.produced_mana||[]});
const cryptolith=card('Cryptolith Fragment // Aurora of Emrakul',{layout:'transform',type_line:'Artifact // Creature — Eldrazi Reflection',card_faces:[{name:'Cryptolith Fragment',type_line:'Artifact',oracle_text:'{T}: Add {C}.'},{name:'Aurora of Emrakul',type_line:'Creature — Eldrazi Reflection',oracle_text:'Flying'}]});
const treasureMap=card('Treasure Map // Treasure Cove',{layout:'transform',type_line:'Artifact // Land',card_faces:[{name:'Treasure Map',type_line:'Artifact',oracle_text:'{1}, {T}: Scry 1.'},{name:'Treasure Cove',type_line:'Land',oracle_text:'{T}: Add {C}.'}]});
const balaGed=card('Bala Ged Recovery // Bala Ged Sanctuary',{layout:'modal_dfc',type_line:'Sorcery // Land',card_faces:[{name:'Bala Ged Recovery',type_line:'Sorcery',oracle_text:'Return target card from your graveyard to your hand.'},{name:'Bala Ged Sanctuary',type_line:'Land',oracle_text:'Bala Ged Sanctuary enters tapped. {T}: Add {G}.'}]});
const kindred=card("Kozilek's Command",{type_line:'Kindred Instant — Eldrazi',oracle_text:'Choose two — Draw X cards.',cmc:3});
const ulalek=card('Ulalek, Fused Atrocity',{type_line:'Legendary Creature — Eldrazi',oracle_text:'Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control, then copy all other activated and triggered abilities you control.',color_identity:['W','U','B','R','G'],price:0.5});
const yuriko=card("Yuriko, the Tiger's Shadow",{type_line:'Legendary Creature — Human Ninja',oracle_text:'Commander ninjutsu {U}{B} Whenever a Ninja you control deals combat damage to a player, reveal the top card of your library.' ,color_identity:['U','B']});
test('TDFC: back face never leaks into cast types or land drops',()=>{assert.equal(castHasSubtype(cryptolith,'Eldrazi'),false);assert.equal(castHasType(cryptolith,'Artifact'),true);assert.equal(playableLand(treasureMap),false);assert.equal(isLandSlot(treasureMap),false);assert.equal(trueColorlessSource(treasureMap),false);});
test('MDFC land and Kindred spell have action-appropriate types',()=>{assert.equal(playableLand(balaGed),true);assert.equal(castHasType(balaGed,'Sorcery'),true);assert.equal(castHasType(balaGed,'Land'),false);assert.equal(castHasSubtype(kindred,'Eldrazi'),true);});
test('Commander cast contract correctly excludes transformed backs',()=>{const p=planFor(ulalek);assert.equal(p.needs[0].kind,'typed-cast');assert.equal(p.needsColorless,2);assert.equal(synergy(cryptolith,p).roles.includes('engine'),false);assert.equal(synergy(kindred,p).roles.includes('engine'),true);});
test('Unblockable activation costs are not free early ninjutsu openers',()=>{const paid=card('Ghostly Pilferer',{type_line:'Creature — Spirit Rogue',cmc:2,oracle_text:'{1}{U}: Ghostly Pilferer can\'t be blocked this turn.'});const free=card('Test one-drop unblockable',{cmc:1,oracle_text:'Test one-drop unblockable can\'t be blocked.'});assert.equal(analysis(paid).cheapOpener,false);assert.equal(analysis(free).cheapOpener,true);assert.equal(synergy(paid,planFor(yuriko)).roles.includes('opener'),false);});
test('Bracket limits and never selects off-color cards',()=>{const off=card('Offcolor card',{color_identity:['R']});assert.equal(legalFor(off,yuriko),false);assert.equal(isCommander(ulalek),true);});

test('Generator creates exact 100-card list, uses genuine Eldrazi type, and obeys budget',()=>{
 const fixture=[ulalek,cryptolith,treasureMap,balaGed,kindred];
 // Synthetic fixtures are test-only: never presented as real Scryfall cards.
 for(const [color,name] of [['W','Plains'],['U','Island'],['B','Swamp'],['R','Mountain'],['G','Forest'],['C','Wastes']])fixture.push(card(name,{type_line:`Basic Land — ${name}`,oracle_text:color==='C'?'{T}: Add {C}.':`{T}: Add {${color}}.`,price:0}));
 for(let i=0;i<45;i++)fixture.push(card(`Eldrazi test ${i}`,{type_line:'Creature — Eldrazi Drone',oracle_text:i%3?'When this enters, create a 0/1 Eldrazi Spawn token.':'{T}: Add {C}.',cmc:i%8+1,price:.12}));
 for(let i=0;i<490;i++)fixture.push(card(`General utility ${i}`,{type_line:i%5===0?'Instant':i%5===1?'Artifact':'Creature — Human',oracle_text:i%5===0?'Destroy target creature.':i%5===1?'{T}: Add {C}.':'Draw a card.',cmc:i%4+1,price:.12+i%5*.04}));
 const d=generateDeck({cards:fixture,commander:ulalek,budget:191,bracket:3});
 assert.equal(d.totalCards,100);assert.ok(d.price<=191);assert.equal(d.landCount,37);assert.ok(d.deck.includes('1 Kozilek\'s Command'));assert.equal(d.deck.includes('Cryptolith Fragment')&&d.needs[0]?.actual>40,false);assert.ok(d.needs.find(n=>n.label.includes('Eldrazi'))?.actual>=21);assert.equal(d.sections.lands.includes('Treasure Map // Treasure Cove'),false);
 const b2=generateDeck({cards:fixture,commander:ulalek,budget:191,bracket:2});
 const b4=generateDeck({cards:fixture,commander:ulalek,budget:191,bracket:4});
 assert.equal(b2.totalCards,100);assert.equal(b4.totalCards,100);
 assert.equal(b2.landCount,38);assert.equal(b4.landCount,36);assert.notEqual(b2.deck,b4.deck);
});

test('Scryfall bulk JSONL parser reads genuine card-shaped objects and deduplicates by Oracle ID',async()=>{
 const {Readable}=await import('node:stream');
 const {parseBulkForTest}=await import('../src/scryfall.mjs');
 const a={object:'card',id:'print1',oracle_id:'oracle1',name:'Example card',type_line:'Artifact',layout:'normal',cmc:2,color_identity:[],legalities:{commander:'legal'},prices:{eur:'2.40'}};
 const b={...a,id:'print2',prices:{eur:'1.10'}};
 const data=[a,b,{...a,oracle_id:'illegal',legalities:{commander:'banned'}}];
 const {cards,progress}=await parseBulkForTest(Readable.from(data.map(x=>JSON.stringify(x)+'\n')),'jsonl');
 assert.equal(cards.length,1);assert.equal(cards[0].prices.eur,1.1);assert.equal(progress.parsed,2);
 const json=await parseBulkForTest(Readable.from(['[',JSON.stringify(a).slice(0,35),JSON.stringify(a).slice(35),',',JSON.stringify(b),']']),'json');
 assert.equal(json.cards.length,1);assert.equal(json.cards[0].prices.eur,1.1);
});

test('Mana colors are read from mana production, not from the costs of unrelated abilities', async()=>{
 const {coloredSources,landManaQuality}=await import('../src/cards.mjs');
 const misleading=card('Misleading cost',{type_line:'Land',oracle_text:'{W}, {T}: Add {C}.\n{U}, {T}: Target player mills a card.'});
 assert.deepEqual(coloredSources(misleading),[]);
 assert.equal(landManaQuality(misleading).canC,true);
 const correct=card('Any-color producer',{type_line:'Land',oracle_text:'{T}: Add one mana of any color.'});
 assert.deepEqual(new Set(coloredSources(correct)),new Set(['W','U','B','R','G']));
 const costly=card('Costly fixer',{type_line:'Land',oracle_text:'{1}, {T}: Add one mana of any color.'});
 assert.equal(landManaQuality(costly).needsActivationPayment,true);
 const restricted=card('Tribal-only',{type_line:'Land',oracle_text:'{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type.'});
 assert.equal(landManaQuality(restricted).restricted,true);
});

test('On-tribe big creature is recognized as a finisher; artifact with Eldrazi on transformed face is not',()=>{
 const p=planFor(ulalek);
 const big=card('Big on-tribe threat',{type_line:'Creature — Eldrazi',cmc:8,power:'8',oracle_text:'Annihilator 2'});
 const tiny=card('Vanilla Eldrazi',{type_line:'Creature — Eldrazi',cmc:2,power:'2',oracle_text:'Devoid'});
 assert.equal(synergy(big,p).roles.includes('finisher'),true);
 assert.equal(synergy(tiny,p).roles.includes('finisher'),false);
 assert.equal(synergy(cryptolith,p).roles.includes('finisher'),false);
});

test('Generated deck reports actual sources for every required color and preserves bracket identity',()=>{
 const fixture=[ulalek];
 for(const [color,name] of [['W','Plains'],['U','Island'],['B','Swamp'],['R','Mountain'],['G','Forest'],['C','Wastes']])fixture.push(card(name,{type_line:`Basic Land — ${name}`,oracle_text:color==='C'?'{T}: Add {C}.':`{T}: Add {${color}}.`,price:0}));
 const short=card('Shorten typed-cast filler',{type_line:'Creature — Eldrazi',cmc:2,oracle_text:'Devoid'});
 for(let i=0;i<48;i++)fixture.push({...short,id:`tribal${i}`,name:`Filler Eldrazi ${i}`});
 for(let i=0;i<20;i++)fixture.push(card(`Game ending Eldrazi ${i}`,{type_line:'Creature — Eldrazi',cmc:7,power:'7',oracle_text:'Annihilator 2',price:0.3}));
 for(let i=0;i<500;i++)fixture.push(card(`Real role ${i}`,{type_line:i%3===0?'Instant':i%3===1?'Artifact':'Creature — Human',oracle_text:i%3===0?'Destroy target creature.':i%3===1?'{T}: Add {C}.':'Draw a card.',price:.18}));
 const d=generateDeck({cards:fixture,commander:ulalek,budget:191,bracket:3});
 assert.equal(d.totalCards,100);
 assert.equal(d.landCount,37);
 assert.ok(d.sections.spells.filter(x=>x.startsWith('Game ending Eldrazi')).length>=4);
 assert.deepEqual(Object.keys(d.coloredMana.demand).sort(),['B','G','R','U','W']);
 assert.deepEqual(Object.keys(d.coloredMana.sources).sort(),['B','G','R','U','W']);
});

// Pricing expectations are independent hand-authored offers, not recalculated
// from the filter under test.
test('Cardmarket EN NM import filters actual language, grade, stock and cheapest eligible offer',async()=>{
 const {importCardmarketOffers,applyCardmarketPrices,PRICING_CM}=await import('../src/pricing.mjs');
 const alpha=card('Alpha Spell',{id:'oracle-alpha',price:1.5});
 alpha.cardmarketIds=['1101'];
 const beta=card('Beta Spell',{id:'oracle-beta',price:9.99});
 const basic=card('Island',{type_line:'Basic Land — Island',price:0});
 const csv='cardmarket_id,card_name,language,condition,price_eur,quantity\n'+
  '1101,Alpha Spell,English,NM,2.50,1\n'+
  '1101,Alpha Spell,English,EX,0.40,1\n'+
  '1101,Alpha Spell,German,NM,0.20,1\n'+
  '1101,Alpha Spell,English,NM,0.10,0\n'+
  '1101,Alpha Spell,English,Mint,2.25,1\n'+
  '9999,Beta Spell,EN,NM,1.80,1\n';
 const offers=importCardmarketOffers(csv,[alpha,beta,basic],{timestamp:'2026-10-19T00:00:00Z'});
 assert.equal(offers.matchedCards,2);
 assert.equal(offers.counters.accepted,3);
 assert.equal(offers.counters.ignoredLanguage,1);
 assert.equal(offers.counters.ignoredCondition,1);
 assert.equal(offers.counters.ignoredStock,1);
 assert.equal(offers.byOracle['oracle-alpha'].price,2.25);
 assert.equal(offers.byOracle['oracle-beta'].price,1.8);
 const actual=applyCardmarketPrices([alpha,beta,basic],offers);
 assert.equal(actual.find(c=>c.id==='oracle-alpha').prices.eur,2.25);
 assert.equal(actual.find(c=>c.id==='oracle-beta').prices.eur,1.8);
 assert.equal(actual.find(c=>c.name==='Island').prices.eur,0);
 assert.equal(PRICING_CM,'cardmarket_en_nm');
});
test('Missing Cardmarket offer never silently substitutes Scryfall price',async()=>{
 const {importCardmarketOffers,applyCardmarketPrices}=await import('../src/pricing.mjs');
 const alpha=card('Alpha Spell',{id:'oracle-alpha',price:0.01});
 const beta=card('Beta Spell',{id:'oracle-beta',price:0.02});
 const offers=importCardmarketOffers('card_name;language;condition;price_eur\nAlpha Spell;english;NM;3,45',[alpha,beta]);
 assert.equal(offers.byOracle['oracle-alpha'].price,3.45);
 assert.equal(offers.byOracle['oracle-beta'],undefined);
 assert.deepEqual(applyCardmarketPrices([alpha,beta],offers).map(x=>x.name),['Alpha Spell']);
 assert.throws(()=>applyCardmarketPrices([alpha,beta],null),/no Cardmarket offer data/);
});
test('Import rejects missing condition/language fields instead of guessing NM',async()=>{
 const {importCardmarketOffers}=await import('../src/pricing.mjs');
 const alpha=card('Alpha Spell',{id:'oracle-alpha'});
 assert.throws(()=>importCardmarketOffers('card_name,price_eur\nAlpha Spell,1.00',[alpha]),/Missing required CSV column/);
 assert.throws(()=>importCardmarketOffers('card_name,language,condition,price_eur\nAlpha Spell,German,EX,1.00',[alpha]),/No matching English NM/);
});
test('Scryfall Cardmarket printing ID is retained when compacting a card',()=>{
 const a=compact({id:'print-one',oracle_id:'oracle-abc',cardmarket_id:778899,name:'Actual Card',type_line:'Artifact',legalities:{commander:'legal'},prices:{eur:'1.00'}});
 assert.deepEqual(a.cardmarketIds,['778899']);
});

test('Draft-only mana colors are unavailable in ordinary Commander; a dead draft land is not selected',async()=>{
 const {coloredSources,landManaQuality}=await import('../src/cards.mjs');
 const draftLand=card('Draft-dependent land',{type_line:'Legendary Land',oracle_text:'Reveal this card as you draft it. {T}: Add one mana of any color chosen as you drafted cards named Draft-dependent land.',price:.25});
 assert.deepEqual(coloredSources(draftLand),[]);
 assert.equal(landManaQuality(draftLand).unusable,true);
 assert.equal(landManaQuality(draftLand).canC,false);
});

test('An expensive typed-cast strategy still reserves early mana and caps costly top end',()=>{
 const fixture=[ulalek];
 for(const [color,name] of [['W','Plains'],['U','Island'],['B','Swamp'],['R','Mountain'],['G','Forest'],['C','Wastes']])fixture.push(card(name,{type_line:`Basic Land — ${name}`,oracle_text:color==='C'?'{T}: Add {C}.':`{T}: Add {${color}}.`,price:0}));
 const draftLand=card('Draft-dependent land',{type_line:'Legendary Land',oracle_text:'Reveal this card as you draft it. {T}: Add one mana of any color chosen as you drafted cards named Draft-dependent land.'});
 fixture.push(draftLand);
 for(let i=0;i<35;i++)fixture.push(card(`Huge Eldrazi ${i}`,{type_line:'Creature — Eldrazi',oracle_text:'Annihilator 2. When you cast this spell, draw a card.',cmc:i%2?7:9,power:'8',price:.1}));
 for(let i=0;i<35;i++)fixture.push(card(`Small Eldrazi ${i}`,{type_line:'Creature — Eldrazi',oracle_text:'When this enters, create a 0/1 Eldrazi Spawn creature token.',cmc:2,power:'2',price:.1}));
 for(let i=0;i<40;i++)fixture.push(card(`Cheap rock ${i}`,{type_line:'Artifact',oracle_text:'{T}: Add {C}.',cmc:2,price:.1}));
 fixture.push(card('Two-mana one-drop',{type_line:'Artifact',oracle_text:'{T}: Add {C}{C}.',cmc:1,price:.1}));
 for(let i=0;i<450;i++)fixture.push(card(`Control spell ${i}`,{type_line:i%3?'Instant':'Artifact',oracle_text:i%3?'Destroy target creature.':'Draw a card.',cmc:1+i%4,price:.1}));
 const d=generateDeck({cards:fixture,commander:ulalek,bracket:3,budget:191});
 assert.equal(d.totalCards,100);
 assert.ok(d.earlyAcceleration>=6,`early mana: ${d.earlyAcceleration}`);
 assert.ok(d.highManaValueSpells<=16,`five-plus MV: ${d.highManaValueSpells}`);
 assert.ok(d.sevenPlusSpells<=7,`seven-plus MV: ${d.sevenPlusSpells}`);
 assert.ok(d.sections.spells.includes('Two-mana one-drop'),'missed an efficient early accelerator');
 assert.ok(!d.sections.lands.includes('Draft-dependent land'),'draft-only land has no mana in Commander');
});

// Deliberately independent fixtures: the premium removal's printed role and
// EDHREC rank are controlled directly, not inferred using generator helpers.
test('Unused budget upgrades a weaker selected answer without losing ramp or Eldrazi support',()=>{
 const fixture=[ulalek];
 for(const [color,name] of [['W','Plains'],['U','Island'],['B','Swamp'],['R','Mountain'],['G','Forest'],['C','Wastes']])
  fixture.push(card(name,{type_line:`Basic Land — ${name}`,oracle_text:color==='C'?'{T}: Add {C}.':`{T}: Add {${color}}.`,price:0}));
 for(let i=0;i<45;i++)fixture.push(card(`Core Eldrazi ${i}`,{type_line:'Creature — Eldrazi',oracle_text:'When this enters, create a 0/1 Eldrazi Spawn creature token.',cmc:2,price:.1}));
 for(let i=0;i<30;i++)fixture.push(card(`Early rock ${i}`,{type_line:'Artifact',oracle_text:'{T}: Add {C}.',cmc:2,price:.1}));
 for(let i=0;i<500;i++)fixture.push(card(`Cheap answer ${i}`,{type_line:'Instant',oracle_text:'Destroy target creature.',cmc:1,price:.1,edhrec_rank:5000}));
 fixture.push(card('Premium removal',{type_line:'Instant',oracle_text:'Destroy target creature.',cmc:1,price:25,edhrec_rank:1}));
 const result=generateDeck({cards:fixture,commander:ulalek,bracket:3,budget:191});
 assert.equal(result.totalCards,100);
 assert.equal(result.landCount,37);
 assert.ok(result.price<=191);
 assert.ok(result.earlyAcceleration>=6);
 assert.ok(result.needs.find(n=>n.label.includes('Eldrazi')).actual>=21);
 assert.ok(result.reinvestment.swaps.some(s=>s.in==='Premium removal'),JSON.stringify(result.reinvestment));
 assert.ok(result.sections.spells.includes('Premium removal'));
});

test('Budget reinvestment never invents spend past the EUR cap',()=>{
 const fixture=[ulalek];
 for(const [color,name] of [['W','Plains'],['U','Island'],['B','Swamp'],['R','Mountain'],['G','Forest'],['C','Wastes']])fixture.push(card(name,{type_line:`Basic Land — ${name}`,oracle_text:`{T}: Add {${color}}.`,price:0}));
 for(let i=0;i<30;i++)fixture.push(card(`Eldrazi ${i}`,{type_line:'Creature — Eldrazi',oracle_text:'When this enters, create a 0/1 Eldrazi Spawn creature token.',cmc:2,price:.1}));
 for(let i=0;i<30;i++)fixture.push(card(`Rock ${i}`,{type_line:'Artifact',oracle_text:'{T}: Add {C}.',cmc:1,price:.1}));
 for(let i=0;i<500;i++)fixture.push(card(`Answer ${i}`,{type_line:'Instant',oracle_text:'Destroy target creature.',cmc:1,price:.1}));
 fixture.push(card('Unaffordable premium',{type_line:'Instant',oracle_text:'Destroy target creature.',cmc:1,price:99,edhrec_rank:1}));
 const result=generateDeck({cards:fixture,commander:ulalek,bracket:3,budget:15});
 assert.ok(result.price<=15,`spent ${result.price}`);
 assert.ok(!result.sections.spells.includes('Unaffordable premium'));
 assert.ok(result.reinvestment.swaps.every(s=>s.meritGain>1.5));
});
