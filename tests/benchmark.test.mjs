import test from 'node:test';
import assert from 'node:assert/strict';
import {independentlyHasCastableEldrazi,independentlyPlayableLand,independentlyValidDeckCount} from '../src/benchmarkOracle.mjs';
const cryptolith={layout:'transform',card_faces:[{type_line:'Artifact'},{type_line:'Creature — Eldrazi Reflection'}]};
const treasure={layout:'transform',card_faces:[{type_line:'Artifact'},{type_line:'Land'}]};
const kindred={type_line:'Kindred Instant — Eldrazi'};
const mdfc={layout:'modal_dfc',card_faces:[{type_line:'Sorcery'},{type_line:'Land'}]};
test('independent benchmark verifies castable front face, unlike transformed backs',()=>{assert.equal(independentlyHasCastableEldrazi(cryptolith),false);assert.equal(independentlyPlayableLand(treasure),false);assert.equal(independentlyHasCastableEldrazi(kindred),true);assert.equal(independentlyPlayableLand(mdfc),true);});
test('independent deck count checks each line quantity',()=>{assert.equal(independentlyValidDeckCount('1 Commander *CMDR*\n9 Wastes\n90 Other'),100);assert.throws(()=>independentlyValidDeckCount('foo'));});
