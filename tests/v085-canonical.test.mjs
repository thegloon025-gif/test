import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDeck} from '../src/generator.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';

const make=(name,opts={})=>({
 id:opts.id||name,oracle_id:opts.id||name,name,layout:opts.layout||'normal',
 card_faces:opts.card_faces,type_line:opts.type_line||'Creature — Human',
 oracle_text:opts.oracle_text||'',mana_cost:opts.mana_cost||'{2}',cmc:opts.cmc??2,
 color_identity:opts.color_identity||[],legalities:{commander:'legal'},
 prices:{eur:opts.eur??.2},edhrec_rank:opts.edhrec_rank??3000,
 game_changer:false,produced_mana:opts.produced_mana||[]
});
const cmd=make('Ulalek, Fused Atrocity',{type_line:'Legendary Creature — Eldrazi',oracle_text:'Whenever you cast an Eldrazi spell, you may pay {C}{C}.',color_identity:['W','U','B','R','G'],cmc:5});
const basics=['Plains','Island','Swamp','Mountain','Forest','Wastes'].map((n,i)=>make(n,{type_line:`Basic Land — ${n}`,oracle_text:`{T}: Add {${'WUBRGC'[i]}}.`,cmc:0}));
const ring1=make('Sol Ring',{id:'sol-normal',type_line:'Artifact',oracle_text:'{T}: Add {C}{C}.',cmc:1,edhrec_rank:1});
const ring2=make('Sol Ring // Sol Ring',{id:'sol-reversible',layout:'reversible_card',type_line:'Artifact // Artifact',card_faces:[{name:'Sol Ring',type_line:'Artifact',oracle_text:'{T}: Add {C}{C}.',mana_cost:'{1}'},{name:'Sol Ring',type_line:'Artifact',oracle_text:'{T}: Add {C}{C}.',mana_cost:'{1}'}],cmc:1,edhrec_rank:2});

test('singleton validation catches two internal names that export to the same Sol Ring',()=>{
 const result=validateCommanderSingleton(cmd,[ring1,ring2]);
 assert.equal(result.valid,false);
 assert.match(result.violations.join('; '),/Sol Ring: 2/i);
});
test('generator never exports two Sol Ring lines when catalog includes reversible duplicate-faced printing',()=>{
 const pool=[cmd,...basics,ring1,ring2];
 for(let i=0;i<80;i++)pool.push(make(`Eldrazi ${i}`,{type_line:'Creature — Eldrazi',oracle_text:'When you cast this spell, create two Eldrazi Spawn.',cmc:2+i%5,eur:.1}));
 for(let i=0;i<450;i++)pool.push(make(`Utility ${i}`,{type_line:i%3===0?'Instant':i%3===1?'Artifact':'Creature — Human',oracle_text:i%3===0?'Destroy target creature.':i%3===1?'{T}: Add {C}.':'Draw a card.',cmc:i%4+1,eur:.1}));
 const result=generateDeck({cards:pool,commander:cmd,budget:191,bracket:3});
 assert.equal(result.totalCards,100);
 const rings=result.deck.split('\n').filter(l=>l==='1 Sol Ring');
 assert.equal(rings.length,1);
});
