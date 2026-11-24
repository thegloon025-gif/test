import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compilePrecon} from '../tools/build-precon-catalog.mjs';
import {parseUpgradeDeck} from '../src/deckUpgrader.mjs';

const {decks} = JSON.parse(readFileSync(new URL('../public/commander-precons.json', import.meta.url)));
test('stock lists retain 100 main and commander cards, their quantities and designated commanders', () => {
  assert.ok(decks.length > 100);
  assert.equal(new Set(decks.map(d => d.fileName)).size, decks.length);
  for (const deck of decks) {
    const lines = deck.text.split('\n');
    assert.equal(lines.reduce((sum, line) => sum + Number(line.split(' ')[0]), 0), 100, deck.name);
    assert.equal(lines.filter(line => line.endsWith(' *CMDR*')).length, deck.commanders.length);
  }
  assert.equal(decks.find(d => d.name === 'Food and Fellowship').commanders.length, 2);
});

test('Miku stock import resolves the canonical commander and preserves the original printing reference', () => {
  const deck = decks.find(d => d.name === 'Hatsune Miku');
  const trostani = "Trostani, Selesnya's Voice";
  assert.deepEqual(deck.commanders, [trostani]);
  assert.ok(deck.text.startsWith('1 ' + trostani + ' (SLD) 2429 *F* *CMDR*\n'));
  assert.ok(deck.secretLair.includes(trostani));
  const sldNames = deck.text.split('\n').filter(line => line.includes(' (SLD)'))
    .map(line => line.slice(line.indexOf(' ') + 1, line.indexOf(' (SLD)')));
  assert.deepEqual(deck.secretLair, [...new Set(sldNames)]);
  const catalog = deck.text.split('\n').map(line => {
    const name = line.slice(line.indexOf(' ') + 1, line.lastIndexOf(' ('));
    return {id: name, name, type_line: name === trostani ? 'Legendary Creature' : 'Basic Land',
      legalities: {commander: 'legal'}, color_identity: []};
  });
  const parsed = parseUpgradeDeck(deck.text, catalog);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.commander.name, trostani);
  assert.equal(parsed.cards.length, 99);
});

test('snapshot builder excludes extras, preserves split names and rejects incomplete products', () => {
  const card = {name: 'Fire // Ice', number: '1', count: 1, setCode: 'APC'};
  const entry = {name: 'Example', code: 'SLD', fileName: 'Example_SLD'};
  const product = {...entry, type: 'Commander Deck', commander: [{...card, name: 'X // X', setCode: 'SLD'}],
    mainBoard: [{...card, count: 99}], displayCommander: [card], tokens: [card], sideBoard: [card]};
  const compiled = compilePrecon(entry, product);
  assert.equal(compiled.text, '1 X (SLD) 1 *CMDR*\n99 Fire // Ice (APC) 1');
  assert.deepEqual(compiled.secretLair, ['X']);
  assert.throws(() => compilePrecon(entry, {...product, mainBoard: []}), /deck size/);
});
