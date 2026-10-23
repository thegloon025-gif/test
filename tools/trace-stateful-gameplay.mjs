/** Exact frozen-deck trace; never infer an original printing from plain text.
 * node tools/trace-stateful-gameplay.mjs data ulalek-b3 trace.json [native|development|commander-first] [none|one-free] [seed] */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {oracleId,priceOf,legalFor} from '../src/cards.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
const [cache,slug,output,policy='native',mulligan='none',seed='gameplay-stage1-2026-10-22:0']=process.argv.slice(2);
if(!output)throw Error('Supply CACHE_DIR FROZEN_SLUG OUTPUT.json [POLICY] [MULLIGAN] [SEED]');
const archive=JSON.parse(await readFile(new URL('../benchmarks/v12/stage1/frozen-replay.json',import.meta.url))),row=archive.rows.find(r=>r.slug===slug);assert.ok(row,'Unknown frozen deck');
const raw=await readFile(cache+'/cards.json'),digest=createHash('sha256').update(raw).digest('hex');assert.equal(digest,archive.metadata.inputs['cards.json'],'Frozen comparison requires original catalog');
const catalog=JSON.parse(raw),byId=new Map(catalog.map(c=>[oracleId(c),c])),selected=row.audit.selectedPrintings.map(p=>{const c=byId.get(p.id);assert.ok(c);assert.deepEqual(c.printing,p.printing);assert.equal(priceOf(c),p.price);return c;}),[commander,...cards]=selected;
assert.equal(selected.length,100);assert.ok(validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander)));
const run=evaluateGameplay({commander,cards,seed,policy,mulligan}),audit=auditGameplayTrace(run,commander,cards);assert.ok(audit.valid,JSON.stringify(audit));assert.deepEqual(evaluateGameplay({commander,cards,seed,policy,mulligan}),run);
await writeFile(output,JSON.stringify({catalogSHA256:digest,exactPrintingPrice:row.price||row.audit.price,printingLedger:row.audit.selectedPrintings,audit,...run},null,2)+'\n');
console.log(output,run.stats.commanderDeploymentTurn,'commander turn;',run.stats.effectDraws,'resolved effect draws;',run.stats.topCasts,'paid top casts');
