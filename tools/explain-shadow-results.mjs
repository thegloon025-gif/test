/** Readable decisions and deliberately illustrative, audited mechanism traces.
 * node tools/explain-shadow-results.mjs CACHE OUTPUT */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createShadowEvaluator,pairedInterval} from '../src/gameplayShadow.mjs';
import {oracleId} from '../src/cards.mjs';
const [cache,output]=process.argv.slice(2);if(!output)throw Error('Supply CACHE OUTPUT');
const read=async file=>JSON.parse(await readFile(output+'/'+file));
async function runs(file){try{return await read(file);}catch(e){if(e.code!=='ENOENT')throw e;return JSON.parse(gunzipSync(await readFile(output+'/'+file+'.gz')));}}
const report=await read('comparison.json'),sha=x=>createHash('sha256').update(x).digest('hex');
const raw=await readFile(cache+'/cards.json');assert.equal(sha(raw),report.metadata.cacheSHA256['cards.json']);assert.equal(sha(await readFile('src/gameplayShadow.mjs')),report.metadata.sourceSHA256['src/gameplayShadow.mjs']);
const catalog=JSON.parse(raw),byId=new Map(catalog.map(c=>[oracleId(c),c])),evaluator=createShadowEvaluator({modelFingerprint:report.metadata.modelFingerprint}),examples=[];
const show=n=>typeof n==='number'?n.toFixed(3).replace(/\.?0+$/,''):'unknown';
const interval=v=>v?.status==='observed'?`${show(v.mean)} [${show(v.lower)}, ${show(v.upper)}]${v.allTies?' (all ties)':''}`:'unknown / not applicable';
let decisions='# Every scheduled full-deck repair\n\nAll exports have 100 Commander-legal cards and an exact selected-record EUR audit. Rejected functional/mana safeguards remain rejected; these files are analysis artifacts, not recommended replacements. Preliminary combinatorial budget/ramp failures are counted in comparison.json; the rows below are the 40 scheduled complete proposals per deck.\n\nAccepted for shadow means mechanically safe and selected by the predeclared bounded schedule, before gameplay outcomes. It does not mean approved for production. Capability deltas are descriptive existing function counts, not gameplay or power scores.\n';
let measurements='# Paired complete-deck measurements\n\nThree fixed pilots per proposal; no favorable-pilot maximization. Values are after minus before, mean [nominal paired-bootstrap 95% interval]. Training n=8, holdout n=16 per pilot. Commander tempo is 9 minus deployment turn within the eight-turn horizon, zero if not deployed by T8; it is a censored timing observation, not a deck score. Optional payments are original paid cast triggers, with copying/execution unknown. Intervals are exploratory and conditional on model coverage, not external power or win probabilities.\n';
let turnMeasurements='# Paired holdout turn observations\n\nAll three fixed pilots, n=16 paired seeds each. Mean after-minus-before [bootstrap 95% interval]. Generic and C mana are independent pre-action maxima, not additive or simultaneous resources. Unknown queries remain unknown. Ready engines below means unique permanents with a ready supported native channel; unmodeled strategy execution remains unknown. JSON also includes independent W/U/B/R/G queries and the large-native-body proxy. No observation is a deck-quality score.\n';
const turnRows=[];
for(const deck of report.results){decisions+=`\n## ${deck.slug}\n\nOriginal [full deck](${deck.slug}-before.txt): €${deck.originalAudit.price.toFixed(2)}; unused €${deck.originalAudit.unused.toFixed(2)}.\n\n| Export | Price / unused / change | Incoming | Outgoing | Descriptive capability changes | Decision |\n| --- | --- | --- | --- | --- | --- |\n`;
 const baselineRuns=await runs(deck.slug+'-before-runs.json');
 for(const p of deck.proposals){const delta=Object.keys(p.capabilitiesBefore.vector).filter(k=>p.capabilitiesBefore.vector[k]!==p.capabilitiesAfter.vector[k]).map(k=>k+': '+show(p.capabilitiesAfter.vector[k]-p.capabilitiesBefore.vector[k]));
  const reason=p.shadowReasons.length?'Rejected safeguards: '+p.shadowReasons.join('; '):p.verdict?'Accepted for shadow; '+p.verdict.status+' ('+p.verdict.reason+')':'Safe but not evaluated: six-bundle size schedule exhausted';
  decisions+=`| [${p.id}](${p.export}) | €${p.price.toFixed(2)} / €${p.unused.toFixed(2)} / ${p.priceChange>=0?'+':''}€${p.priceChange.toFixed(2)} | ${p.incoming.map(c=>c.name).join('; ')} | ${p.outgoing.map(c=>c.name).join('; ')} | ${delta.join('; ')||'No vector change'}; land demand score Δ ${show(p.capabilitiesAfter.land.score-p.capabilitiesBefore.land.score)} | ${reason} |\n`;
  if(!p.verdict)continue;
  measurements+=`\n## ${deck.slug} ${p.id}\n\n[After export](${p.export}); €${p.price.toFixed(2)}, unused €${p.unused.toFixed(2)}, Δ€${p.priceChange.toFixed(2)}. **${p.verdict.status}**: ${p.verdict.reason}. Raw [paired data](comparison.json); [all run vectors](${deck.slug}-${p.id}-runs.json.gz).\n\n| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |\n| --- | --- | --- | --- | --- | --- |\n`;
  for(const policy of report.metadata.policies){const t=p.training.byPolicy[policy],h=p.holdout.byPolicy[policy];measurements+=`| ${policy} | ${interval(t.commanderTempo)} | ${interval(h.commanderTempo)} | ${interval(t.netAccess)} | ${interval(h.netAccess)} | ${interval(h.optionalPayments)} |\n`;}
  measurements+=`\nIdentified access coverage before → after: supported records ${p.coverage.before.cardsWithSupportedAccess} → ${p.coverage.after.cardsWithSupportedAccess}; unmodeled records ${p.coverage.before.cardsWithUnmodeledAccess} → ${p.coverage.after.cardsWithUnmodeledAccess}; unmodeled clauses ${p.coverage.before.unmodeledAccessClauses} → ${p.coverage.after.unmodeledAccessClauses}. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.\n`;
  const afterRuns=await runs(deck.slug+'-'+p.id+'-runs.json');
  for(const policy of report.metadata.policies){turnMeasurements+=`\n## ${deck.slug} ${p.id} / ${policy}\n\n| Turn | Generic mana Δ | True C Δ | Hand Δ | Net cards Δ | Ready supported native engines Δ |\n| --- | --- | --- | --- | --- | --- |\n`;
   const pairs=baselineRuns.holdout.map((b,i)=>({b,a:afterRuns.holdout[i]})).filter(pair=>pair.b.policy===policy);
   for(let turn=1;turn<=8;turn++){const getters={hand:t=>t?.hand,netCards:t=>t?.netAccess,
    readySupportedNative:t=>!t||t.engines.some(e=>e.native&&e.supported&&e.readyNow==='unknown')?null:new Set(t.engines.filter(e=>e.native&&e.supported&&e.readyNow==='ready').map(e=>e.id)).size,
    largeNativeBodiesPayable:t=>!t||t.threats.some(h=>h.status==='unknown')?null:t.threats.filter(h=>h.status==='paid').length};
    for(const type of ['generic','W','U','B','R','G','C'])getters['mana_'+type]=t=>t?.manaBefore.max[type].unknown?null:t?.manaBefore.max[type].payableAtLeast;
    const metrics=Object.fromEntries(Object.entries(getters).map(([key,get])=>[key,pairedInterval(pairs.map(({b,a})=>{const x=get(b.turns.find(t=>t.turn===turn)),y=get(a.turns.find(t=>t.turn===turn));return Number.isFinite(x)&&Number.isFinite(y)?y-x:NaN;}))]));
    turnRows.push({slug:deck.slug,id:p.id,policy,partition:'holdout',turn,metrics});turnMeasurements+=`| ${turn} | ${interval(metrics.mana_generic)} | ${interval(metrics.mana_C)} | ${interval(metrics.hand)} | ${interval(metrics.netCards)} | ${interval(metrics.readySupportedNative)} |\n`;
   }
  }
 }
}
let traces='# Hand-review mechanism examples\n\nThese cases are deliberately illustrative: fixed native pilot for both decks, first holdout satisfying a declared mechanism/counterexample condition. They do not select a candidate/pilot or estimate typical performance. Common retained cards share relative random order; absolute draw positions can move. Aggregate conclusions remain the paired full-cohort results.\n';
for(const [slug,id,kind]of [['ulalek-b3','repair-03','realized-access'],['ulalek-b4','repair-03','realized-access'],['ulalek-b4','repair-04','timing-regression']]){
 const deck=report.results.find(d=>d.slug===slug),proposal=deck.proposals.find(p=>p.id===id),b=await runs(slug+'-before-runs.json'),a=await runs(slug+'-'+id+'-runs.json');
 const index=a.holdout.findIndex((r,i)=>r.policy==='native'&&(kind==='realized-access'?r.casts.some(c=>c.card==='Up the Beanstalk')&&r.metrics.realizedDraws>b.holdout[i].metrics.realizedDraws:(r.commanderTurn??9)>(b.holdout[i].commanderTurn??9)));assert.ok(index>=0);
 const observed=a.holdout[index],ledger=await read(slug+'-before-audit.json'),[commander,...before]=ledger.selectedPrintings.map(p=>byId.get(p.id)),after=before.slice();
 for(const c of proposal.outgoing){const i=after.findIndex(x=>oracleId(x)===c.id&&x.name===c.name);assert.ok(i>=0);after.splice(i,1);}for(const c of proposal.incoming)after.push(byId.get(c.id));
 const pair=[];for(const [label,cards]of [['before',before],['after',after]]){const result=evaluator.evaluate({commander,cards,seed:observed.seed,policy:'native',includeTrace:true});assert.deepEqual(result.summary.metrics,(label==='before'?b:a).holdout[index].metrics);
  const file=`${slug}-${id}-${kind}-${label}.json`;await writeFile(output+'/'+file,JSON.stringify(result,null,2)+'\n');pair.push({label,file,result});}
 examples.push({slug,id,kind,seed:observed.seed,policy:'native',selection:'First holdout with a resolved added access engine and extra draws, or first later-commander counterexample; illustrative only',files:pair.map(p=>p.file),metrics:pair.map(p=>p.result.summary.metrics)});
 traces+=`\n## ${slug} ${id}: ${kind}\n\nSeed \`${observed.seed}\`, native pilot for both. [Before receipts](${pair[0].file}), [after receipts](${pair[1].file}). Commander turn ${pair[0].result.summary.commanderTurn??'not by T8'} → ${pair[1].result.summary.commanderTurn??'not by T8'}; effect draws ${pair[0].result.summary.metrics.realizedDraws} → ${pair[1].result.summary.metrics.realizedDraws}; net cards ${pair[0].result.summary.metrics.netAccess} → ${pair[1].result.summary.metrics.netAccess}.\n\n| Turn | Before plays / resolved access | After plays / resolved access |\n| --- | --- | --- |\n`;
 const events=r=>r.trace.filter(e=>['land','cast-paid','access-draw','optional-trigger-paid','optional-trigger-declined'].includes(e.event));
 for(let turn=1;turn<=8;turn++){const text=r=>events(r).filter(e=>e.turn===turn).map(e=>e.event+': '+(e.card||e.source)).join('; ')||'No supported deployment/access';traces+=`| ${turn} | ${text(pair[0].result.run)} | ${text(pair[1].result.run)} |\n`;}
}
await writeFile(output+'/decisions.md',decisions);await writeFile(output+'/paired-measurements.md',measurements);await writeFile(output+'/mechanism-traces.md',traces);
await writeFile(output+'/turn-measurements.md',turnMeasurements);await writeFile(output+'/turn-measurements.json',JSON.stringify(turnRows,null,2)+'\n');
await writeFile(output+'/explanations.json',JSON.stringify({toolSHA256:sha(await readFile(new URL(import.meta.url))),modelFingerprint:report.metadata.modelFingerprint,examples,evaluator:evaluator.stats},null,2)+'\n');console.log('Explained',report.results.reduce((n,d)=>n+d.proposals.length,0),'complete proposals;',examples.length,'illustrative paired traces independently audited and replayed');
