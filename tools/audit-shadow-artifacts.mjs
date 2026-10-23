/** Separate export/receipt audit; optional lossless compression of generated
 * run logs only. node tools/audit-shadow-artifacts.mjs CACHE OUTPUT [--compress-runs] */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {oracleId,priceOf,legalFor,isLandSlot} from '../src/cards.mjs';
import {singletonName,exportCardName,validateCommanderSingleton} from '../src/deckValidation.mjs';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {evaluateDeployment} from '../src/gameplayDeployment.mjs';
import {evaluateGameplay} from '../src/gameplayState.mjs';
const [cache,output,option]=process.argv.slice(2);if(!output||resolve(cache)===resolve(output))throw Error('Supply distinct CACHE and generated OUTPUT directories');
const started=performance.now(),sha=x=>createHash('sha256').update(x).digest('hex'),load=async p=>JSON.parse(await readFile(p)),catalogRaw=await readFile(cache+'/cards.json'),catalog=JSON.parse(catalogRaw),byId=new Map(catalog.map(c=>[oracleId(c),c]));
const report=await load(output+'/comparison.json');assert.equal(sha(catalogRaw),report.metadata.cacheSHA256['cards.json']);
const archive=await load('benchmarks/v12/stage1/frozen-replay.json'),library=await load(cache+'/combo-library.json'),community=(await load(cache+'/community-decks.json')).decks;
let exports=0,receipts=0,ledgerChecks=0,oldStage1=0,oldStage2=0,runVectors=0;const prices=[];
const previous=await load(output+'/independent-audit.json').catch(e=>{if(e.code!=='ENOENT')throw e;return null;}),compression=previous?.compression||[];
const count=names=>{const map={};for(const n of names)map[n]=(map[n]||0)+1;return map;};
function records(ledger){return ledger.map(p=>{const c=byId.get(p.id);assert.ok(c);assert.equal(c.name,p.name);assert.equal(priceOf(c),p.price);assert.deepEqual(c.printing,p.printing);assert.equal(c.printing.eligibleVersion,2);assert.notEqual(c.printing.border,'gold');ledgerChecks++;return c;});}
async function checkExport(path,selected,price,bracket,variants){
 const lines=(await readFile(output+'/'+path,'utf8')).trim().split(/\r?\n/).map(l=>{const m=l.match(/^1 (.+?)( \*CMDR\*)?$/);assert.ok(m,'Non-unit export line');return {name:m[1],commander:!!m[2]};});
 assert.equal(lines.length,100);assert.equal(lines.filter(l=>l.commander).length,1);assert.equal(lines[0].commander,true);
 assert.deepEqual(count(lines.map(l=>singletonName({name:l.name}))),count(selected.map(singletonName)));
 const [commander,...cards]=selected;assert.ok(validateCommanderSingleton(commander,cards).valid);assert.ok(cards.every(c=>legalFor(c,commander)));
 assert.equal(lines[0].name,exportCardName(commander));assert.equal(selected.reduce((s,c)=>s+Math.round(priceOf(c)*100),0),Math.round(price*100),'Independent integer-cent reconciliation');assert.ok(price<=191);
 assert.ok(!conservativeComboViolation(cards,commander,variants,bracket));assert.ok(cards.filter(c=>c.game_changer).length+Number(!!commander.game_changer)<=(bracket===3?3:99));exports++;prices.push(price);
}
for(const row of report.results){
 const ledger=await load(output+'/'+row.slug+'-before-audit.json'),selected=records(ledger.selectedPrintings),[commander,...base]=selected,variants=library.entries.find(e=>e.commanderId===oracleId(commander))?.variants||[];
 await checkExport(row.slug+'-before.txt',selected,ledger.price,row.bracket,variants);
 for(const p of row.proposals){const cards=base.slice();for(const outgoing of p.outgoing){const i=cards.findIndex(c=>oracleId(c)===outgoing.id&&c.name===outgoing.name);assert.ok(i>=0);assert.equal(priceOf(cards[i]),outgoing.price);cards.splice(i,1);}for(const incoming of p.incoming){const c=byId.get(incoming.id);assert.ok(c);assert.equal(c.name,incoming.name);assert.equal(priceOf(c),incoming.price);cards.push(c);}
  await checkExport(p.export,[commander,...cards],p.price,row.bracket,variants);
  if(p.status==='accepted-for-shadow-evaluation'){
   assert.equal(p.shadowReasons.length,0);const names=new Set([commander,...cards].map(singletonName));
   for(const pkg of row.commitments)for(const name of pkg.cards)assert.ok(names.has(singletonName({name})),name);
   for(const name of row.protectedPhysicalCards)assert.ok(names.has(singletonName({name})),name);
   if(row.sourceKey){const ids=new Set(community.find(d=>d.key===row.sourceKey).mainboard.map(c=>c.id));assert.ok(cards.filter(c=>!isLandSlot(c)&&ids.has(oracleId(c))).length>=row.sourceFloor);}
   const exact=records((await load(output+'/'+row.slug+'-'+p.id+'-audit.json')).selectedPrintings);assert.deepEqual(exact,[commander,...cards]);
   for(const [file,deck]of [[p.example.before,base],[p.example.after,cards]]){const saved=await load(output+'/'+file),audit=auditGameplayTrace(saved.run,commander,deck);assert.ok(audit.valid,JSON.stringify(audit));assert.deepEqual(audit,saved.audit);receipts++;}
  }
 }
 const frozen=archive.rows.find(r=>r.slug===row.slug),original=records(frozen.audit.selectedPrintings),[oldCommander,...oldCards]=original;
 for(let i=0;i<32;i++){const run=evaluateDeployment({commander:oldCommander,cards:oldCards,seed:archive.metadata.seed+':'+i});assert.equal(sha(JSON.stringify(run)),frozen.runs[i].traceSHA256);oldStage1++;}
 for(const policy of report.metadata.policies){const saved=await load('benchmarks/v12/stage2/'+row.slug+'-'+policy+'-trace.json'),{audit,...run}=saved;
  assert.deepEqual(JSON.parse(JSON.stringify(evaluateGameplay({commander:oldCommander,cards:oldCards,seed:run.seed,policy,mulligan:'none'}))),run);oldStage2++;}
}
const explanations=await load(output+'/explanations.json').catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
for(const example of explanations?.examples||[]){const row=report.results.find(r=>r.slug===example.slug),p=row.proposals.find(p=>p.id===example.id),ledger=await load(output+'/'+row.slug+'-before-audit.json'),[commander,...base]=ledger.selectedPrintings.map(p=>byId.get(p.id)),after=base.slice();
 for(const c of p.outgoing){const i=after.findIndex(x=>oracleId(x)===c.id&&x.name===c.name);assert.ok(i>=0);after.splice(i,1);}for(const c of p.incoming)after.push(byId.get(c.id));
 for(let i=0;i<2;i++){const saved=await load(output+'/'+example.files[i]),audit=auditGameplayTrace(saved.run,commander,i?after:base);assert.ok(audit.valid,JSON.stringify(audit));assert.deepEqual(audit,saved.audit);receipts++;}
}
if(option==='--compress-runs')for(const file of (await readdir(output)).filter(f=>f.endsWith('-runs.json'))){const raw=await readFile(output+'/'+file),gz=gzipSync(raw,{level:9});assert.deepEqual(gunzipSync(gz),raw);await writeFile(output+'/'+file+'.gz',gz);await unlink(output+'/'+file);compression.push({file:file+'.gz',originalSHA256:sha(raw),gzipSHA256:sha(gz),originalBytes:raw.length,gzipBytes:gz.length});}
for(const entry of compression){const gz=await readFile(output+'/'+entry.file),raw=gunzipSync(gz);assert.equal(sha(gz),entry.gzipSHA256);assert.equal(sha(raw),entry.originalSHA256);const runs=JSON.parse(raw);
 for(const partition of ['training','holdout']){assert.equal(runs[partition].length,report.metadata.seeds[partition].length*report.metadata.policies.length);runVectors+=runs[partition].length;}}
const result={sourceBaseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),auditorSHA256:sha(await readFile(new URL(import.meta.url))),catalogSHA256:sha(catalogRaw),exactExportAudits:exports,selectedPrintingRecordChecks:ledgerChecks,representativeResourceAndZoneAudits:receipts,compressedRunVectorsAudited:runVectors,originalStage1TraceHashesMatched:oldStage1,originalStage2SampleTracesMatched:oldStage2,minimumPrice:Math.min(...prices),maximumPrice:Math.max(...prices),allWithin191:true,all100SingletonLegal:true,allBracketInventoryGatesPassed:true,compression,runtimeMs:Math.round(performance.now()-started)};
await writeFile(output+'/independent-audit.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,compressionFiles:compression.length,compression:undefined},null,2));
