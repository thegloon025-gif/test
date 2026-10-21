import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleOpeningHands} from '../src/handSampling.mjs';
const land={name:'Forest',type_line:'Basic Land — Forest',oracle_text:'{T}: Add {G}.'};
const spell={name:'Spell',type_line:'Creature — Human',oracle_text:'When this enters, you gain 1 life.',cmc:2};
const pool=(lands)=>Array.from({length:99},(_,i)=>({...i<lands?land:spell,id:String(i)}));
test('no-mulligan hand sampling deterministic for a fixed seed and catalog order',()=>{
 const a=sampleOpeningHands(pool(37),{seed:'benchmark',trials:500});
 assert.deepEqual(a,sampleOpeningHands(pool(37),{seed:'benchmark',trials:500}));
 assert.ok(a.openingTwoToFourLandsPct>0&&a.openingTwoToFourLandsPct<100);
 assert.match(a.assumptions,/No land sequencing/);
});
test('basic independent sanity: 0-land and all-land decks have 0/100 percent land results',()=>{
 const none=sampleOpeningHands(pool(0),{trials:100}),all=sampleOpeningHands(pool(99),{trials:100});
 assert.equal(none.openingTwoToFourLandsPct,0);assert.equal(none.threeLandsByTurnThreePct,0);
 assert.equal(all.openingTwoToFourLandsPct,0);assert.equal(all.threeLandsByTurnThreePct,100);
});
