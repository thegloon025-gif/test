import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDeck} from '../src/generator.mjs';
import {maxNameCopies,validateCommanderSingleton} from '../src/deckValidation.mjs';
import {normalizeVariant} from '../src/combos.mjs';

// Synthetic fixtures model multiple database records with the same English
// name but distinct Scryfall/Oracle identifiers; they are not price evidence.
const make=(name,config={})=>({
 id:config.id||name,oracle_id:config.oracle_id||config.id||name,name,
 type_line:config.type_line||'Creature — Human',
 oracle_text:config.oracle_text||'',mana_cost:config.mana_cost||'{2}',
 cmc:config.cmc??2,color_identity:config.color_identity||[],
 legalities:{commander:'legal'},prices:{eur:config.eur??0.2},
 edhrec_rank:config.edhrec_rank??5000,game_changer:false,
 produced_mana:config.produced_mana||[],power:config.power,
});
const cmd=make('Ulalek, Fused Atrocity',{
 type_line:'Legendary Creature — Eldrazi',
 oracle_text:'Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control.',
 color_identity:['W','U','B','R','G'],cmc:5,eur:.5,
});
const basics=[['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']].map(([name,color])=>make(name,{type_line:`Basic Land — ${name}`,oracle_text:`{T}: Add {${color}}.`,cmc:0,eur:0}));

// Commander rules use card names (with Oracle-text exceptions), NOT Oracle IDs.
test('name-based singleton gate rejects the real-world double-Sol-Ring shape and commander-name duplicates',()=>{
 const s1=make('Sol Ring',{id:'different-oracle-id-1',type_line:'Artifact',oracle_text:'{T}: Add {C}{C}.'});
 const s2=make('Sol Ring',{id:'different-oracle-id-2',type_line:'Artifact',oracle_text:'{T}: Add {C}{C}.'});
 const wrongCommander=make('Ulalek, Fused Atrocity',{id:'unrelated-record',type_line:'Legendary Creature — Eldrazi'});
 const audit=validateCommanderSingleton(cmd,[s1,s2,wrongCommander,basics[0],basics[0]]);
 assert.equal(audit.valid,false);
 assert.ok(audit.violations.some(x=>x.includes('Sol Ring: 2')));
 assert.ok(audit.violations.some(x=>x.includes('Ulalek, Fused Atrocity: 2')));
 assert.ok(!audit.violations.some(x=>x.includes('Plains')),'basic lands may repeat');
});

test('only explicit matching English-name exception text allows extra nonbasics',()=>{
 const priest=make('Shadowborn Apostle',{oracle_text:'A deck can have any number of cards named Shadowborn Apostle.'});
 const nazgul=make('Nazgûl',{oracle_text:'A deck can have up to nine cards named Nazgûl.'});
 const fake=make('Fake Apostle',{oracle_text:'A deck can have any number of cards named Shadowborn Apostle.'});
 assert.equal(maxNameCopies(priest),Infinity);
 assert.equal(maxNameCopies(nazgul),9);
 assert.equal(maxNameCopies(fake),1);
 assert.equal(validateCommanderSingleton(cmd,[priest,priest,nazgul,nazgul]).valid,true);
 assert.equal(validateCommanderSingleton(cmd,Array(10).fill(nazgul)).valid,false);
});

test('full generator does not select the same nonbasic English name twice even with different Oracle IDs',()=>{
 const pool=[cmd,...basics];
 for(let i=0;i<50;i++)pool.push(make(`Synthetic Eldrazi ${i}`,{
  type_line:'Creature — Eldrazi',oracle_text:'When you cast this spell, create two 0/1 Eldrazi Spawn creature tokens.',
  cmc:2+i%5,eur:.12,power:'4'}));
 for(let i=0;i<480;i++)pool.push(make(`Synthetic utility ${i}`,{
  type_line:i%3===0?'Instant':i%3===1?'Artifact':'Creature — Human',
  oracle_text:i%3===0?'Destroy target creature.':i%3===1?'{T}: Add {C}.':'Draw a card.',
  cmc:i%4+1,eur:.17}));
 const solText='{T}: Add {C}{C}.';
 pool.push(make('Sol Ring',{id:'id-one',type_line:'Artifact',oracle_text:solText,cmc:1,eur:.05,edhrec_rank:1}));
 pool.push(make('Sol Ring',{id:'id-two',type_line:'Artifact',oracle_text:solText,cmc:1,eur:.06,edhrec_rank:2}));
 // A duplicated commander name with a different ID also cannot become a spell.
 pool.push(make('Ulalek, Fused Atrocity',{id:'wrong-commander-copy',type_line:'Legendary Creature — Eldrazi',oracle_text:'Whenever you cast an Eldrazi spell, create two Eldrazi tokens.',cmc:1,eur:.05}));
 const d=generateDeck({cards:pool,commander:cmd,budget:191,bracket:3});
 const entries=d.deck.split('\n').slice(1).map(x=>x.replace(/^1 /,''));
 assert.equal(entries.length,99);
 assert.equal(d.totalCards,100);
 assert.equal(d.landCount,37);
 assert.ok(d.price<=191);
 assert.equal(entries.filter(x=>x==='Sol Ring').length,1,'should pick exactly one best Sol Ring printing');
 assert.ok(!entries.includes('Ulalek, Fused Atrocity'),'commander name cannot appear in 99');
 const basicNames=new Set(['Plains','Island','Swamp','Mountain','Forest','Wastes']);
 const singletons=entries.filter(name=>!basicNames.has(name));
 assert.equal(new Set(singletons).size,singletons.length);
 // A synthetic inventory fixture checks that every covered combo gets a
 // report entry even when the conservative B3 optimizer does not add it.
 const example=normalizeVariant({id:'999-1000',uses:[{card:{name:'Ulalek, Fused Atrocity'}},{card:{name:'Sol Ring'}}],produces:[{feature:{name:'Infinite colorless mana'}}],legalities:{commander:true}});
 const withCombo=generateDeck({cards:pool,commander:cmd,budget:191,bracket:3,comboVariants:[example]});
 assert.ok(withCombo.comboPlan.inventoryComplete>=1);
 assert.ok(withCombo.comboPlan.inventoryCombinations.some(v=>v.id==='999-1000'));
 assert.ok(withCombo.comboPlan.inventoryCombinations.every(v=>v.executionVerified===false));
});
