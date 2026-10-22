/** Read-only Stage 1 benchmark. Node 22+, no network or cache writes.
 * node tools/benchmark-gameplay.mjs CACHE_DIR OUTPUT_DIR [--generate]
 * --generate runs the unchanged strategy-first constructor for all five cases.
 * --resume-generation retains separately fingerprinted completed generations,
 * reaudits their exact records/traces, and generates any outstanding cases.
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
import {validateCommanderSingleton, exportCardName} from '../src/deckValidation.mjs';
import {oracleId, legalFor, priceOf} from '../src/cards.mjs';
const [cache, output, generate] = process.argv.slice(2);
if (!output || generate && !['--generate','--resume-generation'].includes(generate)) throw Error('Supply CACHE_DIR OUTPUT_DIR [--generate|--resume-generation]');
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
const previous = generate === '--resume-generation' ? JSON.parse(await readFile(output+'/fresh-generation.json')) : null;
if(previous) { assert.deepEqual(previous.metadata.inputs,inputs); for(const file of ['src/generator.mjs','src/strategyFirst.mjs']) assert.equal(previous.metadata.sourceSHA256[file],sourceSHA256[file]); }
function archivedRecord(row) {
  const matches=catalog.filter(c=>c.name===row.name&&(!row.id||oracleId(c)===row.id)&&JSON.stringify(c.printing)===JSON.stringify(row.printing));
  assert.equal(matches.length,1,'Archived record missing/ambiguous: '+row.name);
  assert.equal(row.id?priceOf(matches[0]):matches[0].prices?.eur,row.price,'Archived selected price changed: '+row.name);
  return matches[0];
}
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
  const archived = slug.startsWith('ulalek') ? JSON.parse(await readFile(new URL(path.replace('.txt','-audit.json'),root))).selectedPrintings
    : JSON.parse(await readFile(new URL('benchmarks/restoration-followup/generated-after.json',root))).find(r=>r.name===name&&r.bracket===bracket).selected;
  const selected=archived.map(archivedRecord), exported=parseDeck(beforeText), audit=auditSelection(selected,commander), start=performance.now();
  assert.deepEqual(exported.map(exportCardName),selected.map(exportCardName),'Frozen export/selected-record quantities or order differ');
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
    const prior=previous?.rows.find(r=>r.slug===slug);
    if(prior) {
      const records=prior.audit.selectedPrintings.map(archivedRecord); assert.deepEqual(auditSelection(records,commander),prior.audit);
      const saved=parseDeck(await readFile(`${output}/${slug}-generated.txt`,'utf8'));
      assert.deepEqual(saved.map(exportCardName),records.map(exportCardName));
      assert.deepEqual(records.map(exportCardName),archived.map(archivedRecord).map(exportCardName),'Resumed generation unexpectedly differs; rerun --generate');
      const replay=evaluateDeployment({commander,cards:records.slice(1),seed:seed+':0'});
      assert.ok(auditDeploymentTrace(replay,commander,records.slice(1)).valid);
      assert.equal(hash(JSON.stringify(replay)),row.runs[0].traceSHA256,'Resumed selected records replay differently');
      fresh.push({...prior,generationProvenance:{sourceBaseCommit:previous.metadata.sourceBaseCommit,sourceSHA256:previous.metadata.sourceSHA256},resumed:true});
      await writeFile(output+'/fresh-generation.json',JSON.stringify({metadata,rows:fresh},null,2)+'\n');
      console.log('Retained independently generated result',slug,prior.audit.price,prior.runtimeMs,'ms'); continue;
    }
    console.log('Generating',slug); const start = performance.now();
    const d = generateDeck({cards:catalog,commander,budget:191,bracket,powerTarget:bracket===3?'high':'balanced',constructionMode:'strategy-first',
      comboVariants:library.find(e=>e.commanderId===oracleId(commander))?.variants || [], communityBuild:prepareCommunityConstruction({decks:research,commander,bracket,catalog}),communityDecks:research});
    const selected = selectedCards(d), exact = auditExportPricing(d,commander,catalog), audit = auditSelection(selected,commander);
    assert.ok(exact.agreesWithGenerator && exact.withinBudget && !exact.anomalies.length && exact.count === 100);
    const names = a => {const map = new Map(); for(const c of a) {const name=exportCardName(c);map.set(name,(map.get(name)||0)+1);} return map;};
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
