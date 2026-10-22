/** Read-only Stage 1 benchmark. Node 22+, no network or cache writes.
 * node tools/benchmark-gameplay.mjs CACHE_DIR OUTPUT_DIR [--generate]
 * --generate runs the unchanged strategy-first constructor for all five cases.
 * Frozen replay and fresh generation results are always separate artifacts. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {evaluateDeployment} from '../src/gameplayDeployment.mjs';
import {auditDeploymentTrace} from '../src/gameplayAudit.mjs';
import {generateDeck} from '../src/generator.mjs';
import {selectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {readComboLibrary} from '../src/comboLibrary.mjs';
import {prepareCommunityConstruction} from '../src/communityConstruction.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {oracleId, legalFor, priceOf} from '../src/cards.mjs';
const [cache, output, generate] = process.argv.slice(2);
if (!output || generate && generate !== '--generate') throw Error('Supply CACHE_DIR OUTPUT_DIR [--generate]');
const root = new URL('../', import.meta.url), hash = x => createHash('sha256').update(x).digest('hex');
const inputs = {};
for (const file of ['cards.json','community-decks.json','combo-library.json']) inputs[file] = hash(await readFile(cache + '/' + file));
const catalog = JSON.parse(await readFile(cache + '/cards.json')), saved = JSON.parse(await readFile(cache + '/community-decks.json'));
const research = Array.isArray(saved) ? saved : saved.decks, library = await readComboLibrary(cache + '/combo-library.json');
const frozenBaseline = hash(await readFile(new URL('benchmarks/v12/external-baseline-2026-10-22.json', root)));
const trials = 32, seed = 'gameplay-stage1-2026-10-22', cases = [
  ['ulalek-b3', 'Ulalek, Fused Atrocity', 3, 'benchmarks/pod-combo/ulalek-b3.txt'],
  ['ulalek-b4', 'Ulalek, Fused Atrocity', 4, 'benchmarks/pod-combo/ulalek-b4.txt'],
  ['yuriko-b3', "Yuriko, the Tiger's Shadow", 3, 'benchmarks/restoration-followup/yuriko-after.txt'],
  ['wilhelt-b3', 'Wilhelt, the Rotcleaver', 3, 'benchmarks/restoration-followup/wilhelt-after.txt'],
  ['zada-b3', 'Zada, Hedron Grinder', 3, 'benchmarks/restoration-followup/zada-after.txt']
];
await mkdir(output, {recursive: true});
const sourceSHA256 = {};
for (const path of ['src/gameplayMana.mjs','src/gameplayCards.mjs','src/gameplayDeployment.mjs','src/gameplayAudit.mjs','tools/benchmark-gameplay.mjs','src/generator.mjs','src/strategyFirst.mjs']) sourceSHA256[path] = hash(await readFile(new URL(path, root)));
const metadata = {sourceBaseCommit: execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim(), sourceSHA256, inputs, frozenBaselineSHA256: frozenBaseline, trials, seed,
  pricing: 'Exact selected eligible Scryfall EUR records; owned basics; not verified English NM offers', rankingIntegration: false};
const rows = [], fresh = [];
function parseDeck(text) {
  return text.trim().split(/\r?\n/).flatMap(line => {
    const m = line.replace(/\s+(?:\*CMDR\*|\[Commander\])$/, '').match(/^(\d+)x?\s+(.+)$/);
    assert.ok(m, 'Invalid export line: ' + line);
    const matches = catalog.filter(c => c.name === m[2]); assert.equal(matches.length, 1, 'Catalog card absent or ambiguous: ' + m[2]);
    const c = matches[0];
    return Array.from({length: +m[1]}, () => c);
  });
}
function auditSelection(selected, commander) {
  assert.equal(selected.length, 100); assert.equal(selected[0], commander);
  assert.ok(validateCommanderSingleton(commander, selected.slice(1)).valid);
  assert.ok(selected.slice(1).every(c => legalFor(c, commander)));
  const cents = selected.reduce((n,c) => {assert.ok(priceOf(c) !== null); return n + Math.round(priceOf(c) * 100);}, 0);
  assert.ok(cents <= 19100);
  return {count: 100, singleton: true, colorIdentityLegal: true, price: cents / 100, withinBudget: true,
    selectedPrintings: selected.map(c => ({id: oracleId(c), name: c.name, price: priceOf(c), printing: c.printing}))};
}
for (const [slug, name, bracket, path] of cases) {
  const commander = catalog.find(c => c.name === name), beforeText = await readFile(new URL(path, root), 'utf8');
  const selected = parseDeck(beforeText), audit = auditSelection(selected, commander), start = performance.now();
  const archived = slug.startsWith('ulalek') ? JSON.parse(await readFile(new URL(path.replace('.txt','-audit.json'),root))).selectedPrintings
    : JSON.parse(await readFile(new URL('benchmarks/restoration-followup/generated-after.json',root))).find(r=>r.name===name&&r.bracket===bracket).selected;
  assert.equal(archived.length,selected.length);
  for(let i=0;i<selected.length;i++) {
    assert.equal(selected[i].name,archived[i].name,'Frozen export/printing order differs');
    assert.deepEqual(selected[i].printing,archived[i].printing,'Selected printing changed since frozen experiment');
    if(archived[i].id) assert.equal(oracleId(selected[i]),archived[i].id);
    else assert.equal(selected[i].prices?.eur,archived[i].price,'Catalog price changed since frozen experiment');
  }
  const runs = [];
  for (let trial = 0; trial < trials; trial++) {
    const options = {commander, cards: selected.slice(1), seed: seed + ':' + trial};
    const run = evaluateDeployment(options), ledgerAudit = auditDeploymentTrace(run, commander, selected.slice(1));
    assert.ok(ledgerAudit.valid, JSON.stringify(ledgerAudit));
    assert.deepEqual(evaluateDeployment(options), run, 'Deterministic replay differs');
    if (trial === 0) await writeFile(`${output}/${slug}-trace.json`, JSON.stringify({...run, ledgerAudit}, null, 2) + '\n');
    runs.push({seed: run.seed, stats: run.stats, traceSHA256: hash(JSON.stringify(run)), ledgerAudit: ledgerAudit.valid});
  }
  const row = {slug, name, bracket, inputExport: path, inputExportSHA256: hash(beforeText), audit,
    runtimeMsIncludingReplay: Math.round(performance.now() - start), runs,
    summary: {commanderPaidByTurn8: runs.filter(r => r.stats.casts.some(c => c.commander)).length,
      optionalTriggerPaidRuns: runs.filter(r => r.stats.optionalPayments.length).length,
      optionalPayments: runs.reduce((n,r) => n + r.stats.optionalPayments.length,0), boundHits: runs.reduce((n,r) => n + r.stats.boundHits,0), boundHitRuns:runs.filter(r=>r.stats.boundHits>0).length},
    interpretation: 'Observed under a bounded simple policy, no mulligans or extra draw. Not a win rate, combo timing estimate, ranking score or optimal-play probability.'};
  rows.push(row); console.log('Replay',slug,row.audit.price,row.summary,row.runtimeMsIncludingReplay,'ms');
  await writeFile(output + '/frozen-replay.json', JSON.stringify({metadata, rows}, null, 2) + '\n');
  if (generate) {
    console.log('Generating',slug); const start = performance.now();
    const d = generateDeck({cards:catalog,commander,budget:191,bracket,powerTarget:bracket===3?'high':'balanced',constructionMode:'strategy-first',
      comboVariants:library.find(e=>e.commanderId===oracleId(commander))?.variants || [], communityBuild:prepareCommunityConstruction({decks:research,commander,bracket,catalog}),communityDecks:research});
    const selected = selectedCards(d), exact = auditExportPricing(d,commander,catalog), audit = auditSelection(selected,commander);
    assert.ok(exact.agreesWithGenerator && exact.withinBudget && !exact.anomalies.length && exact.count === 100);
    const names = a => {const map = new Map(); for(const c of a) map.set(c.name,(map.get(c.name)||0)+1); return map;};
    const before=names(parseDeck(beforeText)), after=names(selected), differences=[];
    for(const name of new Set([...before.keys(),...after.keys()])) if(before.get(name)!==after.get(name)) differences.push({card:name,before:before.get(name)||0,after:after.get(name)||0});
    const freshRun = evaluateDeployment({commander,cards:selected.slice(1),seed:seed+':0'}), ledgerAudit=auditDeploymentTrace(freshRun,commander,selected.slice(1)); assert.ok(ledgerAudit.valid);
    fresh.push({slug,runtimeMs:Math.round(performance.now()-start),audit,selectedCandidate:d.constructionEngine.selected,differences,exactPricingAudit:{agrees:true,count:100,withinBudget:true,anomalies:[]},
      fixedReplayEquivalent: hash(JSON.stringify(freshRun))===rows.at(-1).runs[0].traceSHA256, originalExport:path});
    await writeFile(`${output}/${slug}-generated.txt`,d.deck+'\n');
    await writeFile(output+'/fresh-generation.json',JSON.stringify({metadata,rows:fresh},null,2)+'\n');
    console.log('Generated',slug,audit.price,fresh.at(-1).runtimeMs,'ms',differences.length,'card differences');
  }
}
for (const [file, fingerprint] of Object.entries(inputs)) assert.equal(hash(await readFile(cache+'/'+file)), fingerprint, 'Cache changed');
assert.equal(hash(await readFile(new URL('benchmarks/v12/external-baseline-2026-10-22.json', root))),frozenBaseline);
