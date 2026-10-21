import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseTemplateName,parseTemplateQuery,templatePredicate,satisfyTemplates} from '../src/comboTemplates.mjs';
import {normalizeVariant,annotateCombos,normalizeFindResponse} from '../src/combos.mjs';
import {recordSpellbookVariants,readComboLibrary} from '../src/comboLibrary.mjs';
import {generateDeck} from '../src/generator.mjs';
import {proposeComboPackages} from '../src/comboConstruction.mjs';
import {generateDeck as baseline} from '../benchmarks/generator-v081-reference.mjs';
import {planFor,analysis} from '../src/mechanics.mjs';
import {castHasSubtype,legalFor,oracleId} from '../src/cards.mjs';

// Synthetic test records, not Scryfall exports or claims about real prices.
const c=(name,type='Creature — Human',text='',mv=2,price=.2,ci=[],extra={})=>({id:name,name,type_line:type,oracle_text:text,cmc:mv,mana_cost:`{${mv}}`,color_identity:ci,legalities:{commander:'legal'},prices:{eur:price},edhrec_rank:3000,...extra});
const eldrazi=c('Eldrazi CMC 5','Creature — Eldrazi','When you cast this spell, draw a card.',5,1);
const eldrazi2=c('Eldrazi CMC 6','Creature — Eldrazi','When you cast this spell, draw a card.',6,.6);
const back=c('Reverse Artifact // Other Eldrazi','Artifact // Creature — Eldrazi','',5,.2,[],{layout:'transform',card_faces:[{name:'Reverse Artifact',type_line:'Artifact',oracle_text:'{T}: Add {C}.'},{name:'Other Eldrazi',type_line:'Creature — Eldrazi',oracle_text:'Flying'}]});
const modal=c('Modal Spell // Modal Eldrazi','Sorcery // Creature — Eldrazi','',5,.2,[],{layout:'modal_dfc',card_faces:[{name:'Modal Spell',type_line:'Sorcery',oracle_text:'Draw a card.'},{name:'Modal Eldrazi',type_line:'Creature — Eldrazi',oracle_text:'Flying'}]});

test('Spellbook template predicate is conservative, casting-face aware and mana-value exact',()=>{
 const p=parseTemplateName('An Eldrazi creature with mana value 4, 5, or 6');
 assert.ok(p);assert.equal(p(eldrazi),true);assert.equal(p(eldrazi2),true);
 assert.equal(p(c('Low Eldrazi','Creature — Eldrazi','',3)),false);
 assert.equal(p(c('High Eldrazi','Creature — Eldrazi','',7)),false);
 assert.equal(p(c('False Eldrazi','Creature — Human','Draw Eldrazi cards',5)),false);
 assert.equal(p(back),false);assert.equal(p(modal),true); // A modal creature face is actually castable.
 assert.equal(parseTemplateName('An Eldrazi creature you control that has haste'),null);
 assert.equal(parseTemplateQuery('t:creature t:eldrazi mv>=4 mv<=6')(eldrazi),true);
 assert.equal(parseTemplateQuery('t:creature t:eldrazi mv>=4 mv<=6')(back),false);
 assert.equal(parseTemplateQuery('t:creature o:untap'),null);
 assert.equal(templatePredicate({name:'An Eldrazi creature with mana value 4-6',scryfallQuery:'t:creature mv>=7'})(eldrazi),false);
 assert.equal(templatePredicate({name:'A creature',scryfallQuery:'o:"tap"'}),null);
});

test('two separate template slots require two distinct cards and never double count named components',()=>{
 const req=[{name:'An Eldrazi creature with mana value 4, 5, or 6',quantity:2}];
 assert.equal(satisfyTemplates(req,[eldrazi]).satisfied,false);
 assert.equal(satisfyTemplates(req,[eldrazi,eldrazi2]).satisfied,true);
 assert.equal(satisfyTemplates(req,[eldrazi,eldrazi2],{reservedIds:new Set([oracleId(eldrazi)])}).satisfied,false);
 assert.equal(satisfyTemplates([{name:'A creature you control with five counters'}],[eldrazi]).unresolved.length,1);
});

test('Spellbook current camelCase details survive disk roundtrip with source provenance',async()=>{
 const raw={id:'100-2',uses:[{card:{name:'Kozilek\'s Unsealing'},quantity:1,zoneLocations:['B']}],requires:[{template:{name:'An Eldrazi creature with mana value 4, 5, or 6',scryfallQuery:'t:creature t:eldrazi mv>=4 mv<=6'},quantity:1,zoneLocations:['H']}],manaNeeded:'{C}{C}',manaValueNeeded:5,easyPrerequisites:'You control enough mana sources.',notablePrerequisites:'You can cast an Eldrazi creature.',description:'Cast an Eldrazi.',produces:[{feature:{name:'Infinite colorless mana'}}],legalities:{commander:true},bracketTag:'E'};
 const normalized=normalizeVariant(raw);
 assert.equal(normalized.templateRequirements[0].scryfallQuery,'t:creature t:eldrazi mv>=4 mv<=6');
 assert.equal(normalized.uses[0].zoneLocations[0],'B');
 assert.equal(normalized.manaNeeded,'{C}{C}');
 assert.equal(normalized.manaValueNeeded,5);
 assert.ok(normalized.prerequisites.some(x=>x.includes('cast an Eldrazi')));
 const tmp=await mkdtemp(path.join(os.tmpdir(),'combo-library-'));const file=path.join(tmp,'lib.json');
 try{
  await recordSpellbookVariants('cmd123',{included:[normalized],near:[]},{file,now:()=> '2026-10-20T12:00:00Z'});
  await recordSpellbookVariants('cmd123',{included:[normalized],near:[]},{file,now:()=> '2026-10-20T12:30:00Z'});
  const entries=await readComboLibrary(file);assert.equal(entries.length,1);assert.equal(entries[0].source,'Commander Spellbook');
  assert.equal(entries[0].variants.length,1);assert.equal(entries[0].variants[0].templateRequirements[0].zoneLocations[0],'H');
  assert.equal(entries[0].variants[0].isInfinite,true);
  assert.equal(JSON.parse(await readFile(file,'utf8')).schema,1);
 }finally{await rm(tmp,{recursive:true,force:true});}
});

test('inventory-complete differs from named completion and execution, including extra mana',()=>{
 const commander=c('Commander Elf','Legendary Creature — Elf','Whenever you cast an Eldrazi spell, draw a card.',3,1,['G']);
 const card=c('Named Combo Part','Artifact','Add {C}.',2,.5);
 const d={commanderIds:[commander.id],mainboard:[{id:card.id,quantity:1},{id:eldrazi.id,quantity:1}]};
 const raw=normalizeVariant({id:'101-2',uses:[{card:{name:'Named Combo Part'},quantity:1}],requires:[{template:{name:'An Eldrazi creature with mana value 4, 5, or 6',scryfallQuery:'t:creature t:eldrazi mv>=4 mv<=6'}}],manaNeeded:'{C}{C}',easyPrerequisites:'One creature in hand',produces:[{feature:{name:'Infinite mana'}}]});
 const v=annotateCombos({included:[raw],near:[],reportedIncluded:1,reportedNear:0},d,[commander,card,eldrazi]).complete[0];
 assert.equal(v.namedComplete,true);assert.equal(v.templateSatisfied,true);assert.equal(v.executionVerified,false);
 assert.equal(v.requiresReview,true);assert.equal(v.templateMatches[0],'Eldrazi CMC 5');
 assert.equal(annotateCombos({included:[raw],near:[],reportedIncluded:1,reportedNear:0},{...d,mainboard:[{id:card.id,quantity:1}]},[commander,card,eldrazi]).counts.complete,0);
});

function syntheticCatalog(commander){
 const arr=[commander];
 const colors=[['W','Plains'],['U','Island'],['B','Swamp'],['R','Mountain'],['G','Forest'],['C','Wastes']];
 for(const [color,name] of colors)arr.push(c(name,`Basic Land — ${name}`,`{T}: Add {${color}}.`,0,0,[],{produced_mana:[color]}));
 const type=commander.name.startsWith('Ulalek')?'Eldrazi':commander.name.startsWith('Yuriko')?'Ninja':commander.name.startsWith('Wilhelt')?'Zombie':'Human';
 for(let i=0;i<65;i++)arr.push(c(`Strategy-${type}-${i}`,`Creature — ${type}`,i%3===0?'Whenever you cast a spell, create an Eldrazi Spawn token.':i%3===1?'When this enters, draw a card.':'Whenever a creature you control dies, draw a card.',i%8+1,.12,[],{power:String(i%8+2)}));
 for(let i=0;i<450;i++)arr.push(c(`Utility-${i}`,i%4===0?'Instant':i%4===1?'Artifact':'Creature — Human',i%4===0?'Destroy target creature.':i%4===1?'{T}: Add {C}.':'Draw a card.',i%4+1,.12+(i%9)/100));
 return arr;
}
const ulalek=c('Ulalek, Fused Atrocity','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control.',5,.3,['W','U','B','R','G']);
const yuriko=c("Yuriko, the Tiger's Shadow",'Legendary Creature — Human Ninja','Commander ninjutsu {U}{B}. Whenever a Ninja you control deals combat damage to a player, reveal the top card of your library.',3,.6,['U','B']);
const wilhelt=c('Wilhelt, the Rotcleaver','Legendary Creature — Zombie Warrior','Whenever another Zombie you control dies, create a Zombie token.',4,.5,['U','B']);
const lightpaws=c("Light-Paws, Emperor's Voice",'Legendary Creature — Fox Advisor','Whenever an Aura enters the battlefield under your control, search your library for an Aura.',2,.6,['W']);

test('compare old/new 191 EUR bracket 3 Ulalek fixture; inspect physical slots and optional package choice',()=>{
 const pool=syntheticCatalog(ulalek);
 const special=c("Kozilek's Unsealing",'Enchantment','Whenever you cast an Eldrazi creature spell, create two Eldrazi Spawn tokens.',3,1);
 const required=c('Eldrazi combo partner','Creature — Eldrazi','When you cast this spell, add {C}{C}.',4,1);
 const template=c('Eldrazi candidate MV5','Creature — Eldrazi','When you cast this spell, draw a card.',5,.5);
 pool.push(special,required,template);
 const variant=normalizeVariant({id:'123-456',uses:[{card:{name:'Ulalek, Fused Atrocity'}},{card:{name:"Kozilek's Unsealing"}},{card:{name:'Eldrazi combo partner'}}],requires:[{template:{name:'An Eldrazi creature with mana value 4, 5, or 6',scryfallQuery:'t:creature t:eldrazi mv>=4 mv<=6'}}],produces:[{feature:{name:'Infinite colorless mana'}}],manaNeeded:'{C}{C}',easyPrerequisites:'Ulalek on battlefield'});
 const old=baseline({cards:pool,commander:ulalek,budget:191,bracket:3});
 const next=generateDeck({cards:pool,commander:ulalek,budget:191,bracket:3,comboVariants:[variant]});
 for(const deck of [old,next]){
  assert.equal(deck.totalCards,100);assert.equal(deck.landCount,37);assert.ok(deck.price<=191);
  const lines=deck.deck.split('\n');assert.equal(lines.length,100);
  const names=lines.map(x=>x.replace(/^1 /,'').replace(/ \*CMDR\*$/,''));
  assert.equal(new Set(names.filter(x=>!['Wastes','Plains','Island','Swamp','Mountain','Forest'].includes(x))).size,names.filter(x=>!['Wastes','Plains','Island','Swamp','Mountain','Forest'].includes(x)).length);
  assert.ok(deck.earlyAcceleration>=6);assert.ok(deck.needs[0].actual>=20);
 }
 const offline=generateDeck({cards:pool,commander:ulalek,budget:191,bracket:3});
 assert.equal(offline.deck,generateDeck({cards:pool,commander:ulalek,budget:191,bracket:3}).deck,'offline v0.8.6 construction must remain deterministic');
 assert.equal(offline.comboPlan.knownVariants,0,'no recorded combos must not fabricate variants');
 assert.equal(next.comboPlan.knownVariants,1);
 assert.equal(next.comboPlan.selected.length,1,'verified source package fitting strategy should be selected');
 assert.equal(next.comboPlan.inventoryComplete,1,'inventory complete with an independent Eldrazi creature template');
 assert.ok(next.comboPlan.selected[0].templateMatches.some(x=>{const match=pool.find(c=>c.name===x.card);return match&&castHasSubtype(match,'Eldrazi')&&match.cmc>=4&&match.cmc<=6;}),'a matching 4-6 MV Eldrazi in the fixture must satisfy the template');
 assert.ok(next.comboPlan.selected[0].added.includes("Kozilek's Unsealing"));
 assert.ok(next.earlyAcceleration>=10,'combo did not erode early ramp below requested bracket quota');
 assert.ok(next.comboPlan.inventoryComplete>=0);
 assert.ok(next.sections.spells.every(name=>{const card=pool.find(c=>c.name===name);return card&&legalFor(card,ulalek);}));
 // Package is OPTIONAL. Assert its constraints, not that a made-up combo must be forced.
 if(next.comboPlan.selected.length){
  for(const added of next.comboPlan.selected[0].added)assert.ok(next.sections.spells.includes(added));
  assert.ok(next.comboPlan.selected[0].missingCostEstimate<=191*.2);
 }
 assert.ok(Array.isArray(next.comboPlan.selected));
});

test('Yuriko / Wilhelt / unfamiliar Light-Paws decks maintain legality, sizing and budgets',()=>{
 for(const commander of [yuriko,wilhelt,lightpaws]){
  const pool=syntheticCatalog(commander);
  for(const bracket of [2,3,4]){
   const d=generateDeck({cards:pool,commander,budget:191,bracket});
   assert.equal(d.totalCards,100,commander.name);assert.ok(d.price<=191,commander.name);
   assert.equal(d.bracket,bracket);assert.equal(d.deck.split('\n').length,100,commander.name);
   assert.ok(d.sections.spells.every(name=>{const found=pool.find(c=>c.name===name);return found&&legalFor(found,commander);}),commander.name);
   assert.equal(d.comboPlan.knownVariants,0);
   assert.equal(d.comboPlan.selected.length,0);
  }
 }
});

test('off-color, two-card B3 infinites, expensive and foreign package are rejected before choosing cards',()=>{
 const cmd=ulalek;const cardset=syntheticCatalog(cmd);
 const named=c('Onplan piece','Creature — Eldrazi','When you cast this, draw a card.',4,.5);
 const off=c('Off-color piece','Creature — Eldrazi','When you cast this, draw a card.',4,1,['X']);
 cardset.push(named,off);
 const raw=(id,names)=>normalizeVariant({id,uses:names.map(name=>({card:{name}})),produces:[{feature:{name:'Infinite mana'}}]});
 const p=proposeComboPackages({variants:[raw('10-2',['Ulalek, Fused Atrocity','Onplan piece']),raw('11-2',['Off-color piece','Onplan piece','Ulalek, Fused Atrocity'])],cards:cardset,commander:cmd,chosen:[],plan:planFor(cmd),bracket:3,budget:191});
 assert.equal(p.candidates.length,0);assert.ok(p.rejected.some(x=>x.reason.includes('compact infinite')));
 assert.ok(p.rejected.some(x=>x.reason==='unavailable, illegal or unsupported named requirement'||x.reason==='color identity'));
});
