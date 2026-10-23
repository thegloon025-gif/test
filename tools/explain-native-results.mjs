/** Read-only analysis of predeclared comparisons; no candidate selection. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const [output]=process.argv.slice(2);if(!output)throw Error('Supply OUTPUT');
const load=async p=>JSON.parse(await readFile(output+'/'+p)),report=await load('comparison.json'),sequences=await load('sequences/sequences.json');assert.equal(report.preservation,'passed');
const values=v=>v?.status==='observed'?`${v.mean.toFixed(3)} [${v.lower.toFixed(3)}, ${v.upper.toFixed(3)}]${v.allTies?' (ties)':''}`:'unknown / incomplete';
let lines='# Native shadow measurements\n\nSame fixed decks/prices, identity coupling and all three pilots. Training n=16, holdout n=32 per pilot. Values are after minus original, mean [nominal paired-bootstrap 95% interval]. Bounds and modeled losses are retained, never dropped for a favorable complete-case result. Native event deltas are explanatory observed events, not strength or win scores. No proposal is adopted.\n';
const metrics=[];
for(const deck of report.results){lines+=`\n## ${deck.slug}\n\n`;for(const row of deck.rows){const mode=row.modes.find(m=>m.mode==='stage4'),native=mode.native;
 lines+=`\n### ${row.id}: €${row.price.toFixed(2)}, unused €${row.unused.toFixed(2)}\n\n[Complete export](${deck.slug}-${row.id}.txt). Native run prefixes: ${native.training.boundRuns}/48 training and ${native.holdout.boundRuns}/96 holdout bounded; counters include definite effects before any halt, not imaginary T8 completion.\n`;
 if(row.verdict){lines+=`\n**${row.verdict.status}**: ${row.verdict.reason}. With the same larger cohort, Stage 3 mode remains **${row.stage3LargerSampleVerdict.status}**.\n\n| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net physical cards | Holdout net physical cards | Holdout original trigger payments | Holdout resolved spell-copy delta |\n| --- | --- | --- | --- | --- | --- | --- |\n`;
  for(const policy of report.metadata.policies){const t=row.training.byPolicy[policy],h=row.holdout.byPolicy[policy];lines+=`| ${policy} | ${values(t.commanderTempo)} | ${values(h.commanderTempo)} | ${values(t.netAccess)} | ${values(h.netAccess)} | ${values(h.optionalPayments)} | ${values(row.nativeEventDeltas[policy].resolvedCopies)} |\n`;}
 }
 for(const partition of ['training','holdout']){const data=JSON.parse(gunzipSync(await readFile(`${output}/${deck.slug}-${row.id}-stage4-runs.json.gz`)))[partition];
  metrics.push({slug:deck.slug,id:row.id,partition,runs:data.length,bounded:data.filter(r=>r.nativeExecution.boundedUnknown).length,modelLoss:data.filter(r=>r.lost).length,
   observedPrefix:Object.fromEntries(['spellCopies','resolvedCopies','triggerCopies','cascades','castsFromCascade','tutors','tutorCardsToHand','tutorCardsToTop','tokens','paidTriggers'].map(k=>[k,data.reduce((n,r)=>n+r.native[k],0)])),
   castingCascadeEngineRuns:data.filter(r=>r.casts.some(c=>c.card==='Zhulodok, Void Gorger')).length,unknownNativeClauseRecords:data[0].nativeExecution.unknown.length});
 }
}}
await writeFile(output+'/paired-measurements.md',lines);
let turns='# Real-card native sequence reviews\n\nStipulated opening/draw orders, separate from the larger seeded cohort. These demonstrate supported mechanics and pilot costs, not reliability or earliest combo turns. The mana-for-native-engine substitution is a diagnostic counterfactual that source/strategy protections would reject as an investment proposal. All scripts use 100 legal cards and exact printing audits.\n';
const reviewed=[];
for(const scenario of sequences.results){const saved=await load('sequences/'+scenario.id+'.json'),r=saved.run;
 turns+=`\n## ${scenario.id}\n\n[Full deck](sequences/${scenario.id}.txt), [complete stack/resource/zone receipts](sequences/${scenario.id}.json), exact estimated price €${scenario.price.toFixed(2)}. Commander turn ${r.stats.commanderDeploymentTurn??'not scripted'}; ${r.stats.native.spellCopies} spell copies created, ${r.stats.native.resolvedCopies} resolved, ${r.stats.native.castsFromCascade} actual cascade casts, ${r.stats.native.tokens} actual tokens. Bounds: ${r.stats.native.boundHits}.\n\n| Turn | Land and actual casts | Native resolutions / costs |\n| --- | --- | --- |\n`;
 const nativeHits=r.trace.filter(e=>e.event==='cast-paid'&&e.origin==='cascade').map(e=>e.card);reviewed.push({id:scenario.id,price:scenario.price,cascadeHits:nativeHits,commanderTurn:r.stats.commanderDeploymentTurn,native:r.stats.native,actions:r.stats.casts});
 for(let t=1;t<=8;t++){const e=r.trace.filter(e=>e.turn===t),plays=e.filter(e=>['land','cast-paid'].includes(e.event)).map(e=>`${e.event}: ${e.card}${e.origin==='cascade'?' (cast from cascade)':''}`).join('; ')||'No scripted/supported play';
  const tokens=e.filter(e=>e.event==='token-created'),description=[`${e.filter(e=>e.event==='native-trigger-paid').length} separate CC payments`,`${e.filter(e=>e.event==='permanent-resolved'&&e.id.startsWith('copy-')).length} copied permanents resolved`,...['Spawn','Scion'].map(type=>`${tokens.filter(e=>e.card.type_line.endsWith(type)).length} ${type} created`),...e.filter(e=>e.event==='native-tutor').map(e=>`tutor ${e.found||'no match'} → ${e.destination}`)];
  turns+=`| ${t} | ${plays} | ${description.join('; ')} |\n`;
 }
}
turns+='\n## Fixed access/commander tradeoff\n\nPreviously recorded Stage 3 holdout seed 9, development pilot for both B4 lists. This seed was fixed before Stage 4 comparison; it is not chosen to favor an alternative.\n\n';
for(const id of ['original','repair-03']){const {run}=await load('sequences/access-tradeoff-'+id+'.json');turns+=`- [${id} receipts](sequences/access-tradeoff-${id}.json): commander T${run.stats.commanderDeploymentTurn??'not by T8'}, effect draws ${run.stats.effectDraws}, paid original/copied triggers ${run.stats.native.paidTriggers}, native bound ${run.stats.native.boundHits}.\n`;}
await writeFile(output+'/sequence-reviews.md',turns);await writeFile(output+'/observations.json',JSON.stringify({sourceSHA256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),metrics,reviewed},null,2)+'\n');console.log('Explained all fixed original/proposal comparisons and',reviewed.length,'real-card controlled sequences');
