// Run from any directory with Node 22+. This refreshes the bundled MTGJSON snapshot.
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const source = 'https://mtgjson.com/api/v5';
async function download(path) {
  const response = await fetch(source + path, {signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw Error(path + ' returned ' + response.status);
  return response.json();
}

export function compilePrecon(entry, deck) {
  if (deck.name !== entry.name || deck.code !== entry.code || deck.type !== 'Commander Deck') {
    throw Error('Unexpected product in ' + entry.fileName);
  }
  const commanders = [];
  const secretLair = new Set();
  const lines = [];
  let count = 0;
  function add(card, commander) {
    const faces = card.name.split(' // ');
    const name = faces.every(face => face === faces[0]) ? faces[0] : card.name;
    if (!name || /[\r\n]/.test(name) || !Number.isInteger(card.count) || card.count < 1 ||
        !/^[A-Z0-9]+$/i.test(card.setCode) || !/^[A-Z0-9★-]+$/i.test(card.number)) {
      throw Error('Invalid card in ' + entry.fileName);
    }
    if (commander) commanders.push(name);
    if (card.setCode === 'SLD') secretLair.add(name);
    const printing = '(' + card.setCode + ') ' + card.number + (card.isFoil ? ' *F*' : '');
    lines.push(card.count + ' ' + name + ' ' + printing + (commander ? ' *CMDR*' : ''));
    count += card.count;
  }
  for (const card of deck.commander) add(card, true);
  for (const card of deck.mainBoard) add(card, false);
  if (!commanders.length || count !== 100) throw Error('Invalid deck size or command zone in ' + entry.fileName);
  return {name: entry.name, code: entry.code, released: entry.releaseDate, fileName: entry.fileName,
    commanders, secretLair: [...secretLair], text: lines.join('\n')};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = await download('/DeckList.json');
  const decks = [];
  for (const entry of index.data.filter(entry => entry.type === 'Commander Deck')) {
    const product = await download('/decks/' + encodeURIComponent(entry.fileName) + '.json');
    decks.push(compilePrecon(entry, product.data));
  }
  const output = new URL('../public/commander-precons.json', import.meta.url);
  await writeFile(output, JSON.stringify({asOf: index.meta.date, decks}, null, 2) + '\n');
}
