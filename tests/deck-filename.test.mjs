import test from 'node:test';
import assert from 'node:assert/strict';
import {deckTxtFilename} from '../public/deck-filename.js';

test('deck downloads preserve the commander name and use the exported bracket', () => {
  const deck = "1 Trostani, Selesnya's Voice *CMDR*\r\n1 Forest";
  for (const bracket of [2, 3, 4, 5]) {
    assert.equal(deckTxtFilename(deck, bracket), "Trostani, Selesnya's Voice - Bracket " + bracket + '.txt');
  }
  assert.equal(deckTxtFilename('1 Esika, God of the Tree // The Prismatic Bridge *CMDR*', '3'),
    'Esika, God of the Tree - The Prismatic Bridge - Bracket 3.txt');
});
