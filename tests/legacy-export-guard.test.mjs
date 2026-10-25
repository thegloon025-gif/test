import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDeck,generateLegacyDeck} from '../src/generator.mjs';
const commander={id:'guard-cmd',name:'Guard Commander',type_line:'Legendary Creature — Eldrazi',oracle_text:'Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy that spell.',mana_cost:'{2}',cmc:2,color_identity:[],prices:{eur:.1},legalities:{commander:'legal'}};
const land={id:'wastes',name:'Wastes',type_line:'Basic Land — Wastes',oracle_text:'{T}: Add {C}.',cmc:0,prices:{eur:0},color_identity:[],legalities:{commander:'legal'}};
// More than 400 catalog records, but no legal snow-producing land. The old
// constructor can reserve lands yet cannot fill its spell slots legitimately.
const cards=[commander,land,...Array.from({length:410},(_,i)=>({id:'snow-'+i,name:'Snow spell '+i,type_line:'Snow Artifact',oracle_text:'Draw a card.',mana_cost:'{S}',cmc:1,color_identity:[],prices:{eur:.1},legalities:{commander:'legal'}}))];
test('direct legacy construction refuses partial output instead of returning an incomplete deck',()=>{
 assert.throws(()=>generateLegacyDeck({cards,commander,budget:191,bracket:3}),/Legacy generation is incomplete.*refusing export/);
});
test('both API construction modes fail closed when no complete fallback exists',()=>{
 for(const constructionMode of ['legacy','strategy-first'])assert.throws(()=>generateDeck({cards,commander,budget:191,bracket:3,constructionMode}),/incomplete.*refusing export/);
});
