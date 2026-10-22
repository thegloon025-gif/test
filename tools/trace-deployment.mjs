/** node tools/trace-deployment.mjs data DECK.txt TRACE.json [SEED] [SCRIPT.json]
 * SCRIPT: {opening:[7 names], draws:[names], actions:{1:[{type,card,...}]}}.
 * Scripted draws are stipulated, never evidence of reliability/earliest turn. */
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {evaluateDeployment} from '../src/gameplayDeployment.mjs';
import {auditDeploymentTrace} from '../src/gameplayAudit.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {legalFor, priceOf} from '../src/cards.mjs';
const [cache, file, output, seed = 'gameplay-stage1-2026-10-22:0', scriptFile] = process.argv.slice(2);
if (!output) throw Error('Supply CACHE_DIR DECK.txt OUTPUT.json [SEED] [SCRIPT.json]');
const raw = await readFile(cache + '/cards.json'), catalog = JSON.parse(raw), exported = await readFile(file, 'utf8');
const catalogSHA256 = createHash('sha256').update(raw).digest('hex');
let commander;
const selected = exported.trim().split(/\r?\n/).flatMap(line => {
  const marked = /\s+(?:\*CMDR\*|\[Commander\])$/.test(line);
  const match = line.replace(/\s+(?:\*CMDR\*|\[Commander\])$/, '').match(/^(\d+)x?\s+(.+)$/);
  assert.ok(match, 'Invalid export row: ' + line);
  const matches = catalog.filter(c => c.name === match[2]);
  assert.equal(matches.length, 1, 'Catalog name absent or ambiguous: ' + match[2]);
  if (marked) { assert.ok(!commander, 'Multiple commander rows'); assert.equal(+match[1],1); commander = matches[0]; }
  return Array.from({length: +match[1]}, () => matches[0]);
});
assert.ok(commander,'Export needs *CMDR* or [Commander] marker'); assert.equal(selected.length,100);
const cards = [...selected]; cards.splice(cards.indexOf(commander),1);
assert.ok(validateCommanderSingleton(commander,cards).valid); assert.ok(cards.every(c=>legalFor(c,commander)));
const script = scriptFile ? JSON.parse(await readFile(scriptFile,'utf8')) : null;
let order;
if (script) {
  assert.equal(script.opening.length,7); const remaining=new Set(cards.map((_,i)=>i)); order=[];
  for (const name of [...script.opening,...script.draws || []]) {
    const i=[...remaining].find(i=>cards[i].name===name); assert.ok(i!==undefined,'Stipulated card not in deck/quantity exceeded: '+name);
    order.push(i); remaining.delete(i);
  }
  order.push(...remaining);
}
const result=evaluateDeployment({commander,cards,seed,order,script:script?.actions});
const ledgerAudit=auditDeploymentTrace(result,commander,cards); assert.ok(ledgerAudit.valid,JSON.stringify(ledgerAudit));
assert.deepEqual(evaluateDeployment({commander,cards,seed,order,script:script?.actions}),result);
const prices=selected.map(c=>{assert.ok(priceOf(c)!==null);return {name:c.name,price:priceOf(c),printing:c.printing};});
const estimatedPrice=prices.reduce((n,c)=>n+Math.round(c.price*100),0)/100;
await writeFile(output,JSON.stringify({catalogSHA256,exportSHA256:createHash('sha256').update(exported).digest('hex'),estimatedPrice,
  pricing:'Selected catalog Scryfall EUR estimates, owned basics; not verified EN NM offers',stipulatedDraws:!!script,ledgerAudit,prices,...result},null,2)+'\n');
assert.equal(createHash('sha256').update(await readFile(cache+'/cards.json')).digest('hex'),catalogSHA256,'Catalog changed');
console.log(output,estimatedPrice,'EUR',result.stats.casts.length,'paid casts',result.stats.optionalPayments.length,'separate optional payments; not combo execution');
