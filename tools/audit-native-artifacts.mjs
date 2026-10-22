/** Independent persisted-export, selected-record and representative trace audit.
 * node tools/audit-native-artifacts.mjs CACHE OUTPUT [SEQUENCE_DIR] */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {oracleId,priceOf,legalFor,isLandSlot} from '../src/cards.mjs';
import {singletonName,exportCardName,validateCommanderSingleton} from '../src/deckValidation.mjs';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {evaluateDeployment} from '../src/gameplayDeployment.mjs';
const [cache,output,sequences]=process.argv.slice(2);if(!output)throw Error('Supply CACHE OUTPUT [SEQUENCE_DIR]');
const started=performance.now(),sha=x=>createHash('sha256').update(x).digest('hex'),load=async p=>JSON.parse(await readFile(p)),report=await load(output+'/comparison.json');assert.equal(report.preservation,'passed');
async function fingerprints(dir,prefix=''){const out={};for(const e of await readdir(dir,{withFileTypes:true})){const k=prefix+e.name;if(e.isDirectory())Object.assign(out,await fingerprints(dir+'/'+e.name,k+'/'));else out[k]=sha(await readFile(dir+'/'+e.name));}return out;}
assert.deepEqual(await fingerprints(cache),report.metadata.cacheSHA256);for(const [file,digest]of Object.entries(report.metadata.sourceSHA256))assert.equal(sha(await readFile(file)),digest,file);
for(const d of ['stage1','stage2','stage3'])assert.deepEqual(await fingerprints('benchmarks/v12/'+d),report.metadata.preserved[d]);for(const [f,h]of Object.entries(report.metadata.preserved))if(typeof h==='string')assert.equal(sha(await readFile(f)),h);
const catalog=JSON.parse(await readFile(cache+'/cards.json')),byId=new Map(catalog.map(c=>[oracleId(c),c])),community=(await load(cache+'/community-decks.json')).decks,combos=(await load(cache+'/combo-library.json')).entries,prior=await load('benchmarks/v12/stage3/comparison.json');
let exports=0,printingChecks=0,traceAudits=0,vectors=0,bounded=0,losses=0,oldStage1=0,oldStage2=0;const runSHA256={};
function records(ledger){return ledger.map(p=>{const c=byId.get(p.id);assert.ok(c);assert.equal(c.name,p.name);assert.equal(priceOf(c),p.price);assert.deepEqual(c.printing,p.printing);assert.equal(c.printing.eligibleVersion,2);assert.notEqual(c.printing.border,'gold');printingChecks++;return c;});}
function checkList(text,selected,price){const lines=text.trim().split(/\r?\n/);assert.equal(lines.length,100);assert.equal(lines.filter(l=>l.endsWith(' *CMDR*')).length,1);assert.equal(lines[0],'1 '+exportCardName(selected[0])+' *CMDR*');assert.deepEqual(lines.slice(1),selected.slice(1).map(c=>'1 '+exportCardName(c)));assert.equal(selected.reduce((s,c)=>s+Math.round(priceOf(c)*100),0),Math.round(price*100));assert.ok(price<=191);assert.ok(validateCommanderSingleton(selected[0],selected.slice(1)).valid&&selected.slice(1).every(c=>legalFor(c,selected[0])));exports++;}
for(const deck of report.results){const previous=prior.results.find(d=>d.slug===deck.slug);
 for(const row of deck.rows){const prefix=output+'/'+deck.slug+'-'+row.id,audit=await load(prefix+'-audit.json'),selected=records(audit.selectedPrintings),[commander,...cards]=selected;
  checkList(await readFile(prefix+'.txt','utf8'),selected,row.price);const variants=combos.find(c=>c.commanderId===oracleId(commander))?.variants||[];assert.ok(!conservativeComboViolation(cards,commander,variants,previous.bracket));
  const names=new Set(selected.map(singletonName));for(const pkg of previous.commitments)for(const n of pkg.cards)assert.ok(names.has(singletonName({name:n})));
  for(const n of previous.protectedPhysicalCards)assert.ok(names.has(singletonName({name:n})));
  if(previous.sourceKey){const ids=new Set(community.find(d=>d.key===previous.sourceKey).mainboard.map(c=>c.id));assert.ok(cards.filter(c=>!isLandSlot(c)&&ids.has(oracleId(c))).length>=previous.sourceFloor);}
  for(const mode of row.modes){const saved=await load(prefix+'-'+mode.mode+'-trace.json'),proof=auditGameplayTrace(saved.run,commander,cards);assert.ok(proof.valid,JSON.stringify(proof));assert.deepEqual(proof,saved.audit);traceAudits++;
   const file=prefix+'-'+mode.mode+'-runs.json.gz',raw=gunzipSync(await readFile(file)),sets=JSON.parse(raw);runSHA256[file.slice(output.length+1)]=sha(raw);
   for(const part of ['training','holdout']){assert.equal(sets[part].length,report.metadata.seeds[part].length*3);assert.equal(new Set(sets[part].map(r=>r.seed+':'+r.policy)).size,sets[part].length);for(const r of sets[part]){vectors++;assert.ok(report.metadata.seeds[part].includes(r.seed)&&report.metadata.policies.includes(r.policy));if(mode.mode==='stage4'){
     if(r.nativeExecution.boundedUnknown){bounded++;assert.ok(Object.values(r.metrics).every(v=>v===null));}
     else if(r.lost){losses++;assert.equal(r.metrics.modelSurvival,0);assert.ok(Object.entries(r.metrics).filter(([k])=>k!=='modelSurvival').every(([,v])=>v===null));}
    }}
   }
  }
 }
}
if(sequences){const index=await load(sequences+'/sequences.json');for(const example of index.results){const stored=await load(sequences+'/'+example.id+'.json'),selected=records(stored.selectedPrintings);checkList(await readFile(sequences+'/'+example.id+'.txt','utf8'),selected,example.price);const proof=auditGameplayTrace(stored.run,selected[0],selected.slice(1));assert.ok(proof.valid,JSON.stringify(proof));assert.deepEqual(proof,stored.audit);traceAudits++;}
 for(const id of ['original','repair-03']){const p=await load('benchmarks/v12/stage3/ulalek-b4-'+(id==='original'?'before':id)+'-audit.json'),selected=records(p.selectedPrintings),stored=await load(sequences+'/access-tradeoff-'+id+'.json');assert.ok(auditGameplayTrace(stored.run,selected[0],selected.slice(1)).valid);traceAudits++;}
}
const archive=await load('benchmarks/v12/stage1/frozen-replay.json');for(const deck of archive.rows){const selected=records(deck.audit.selectedPrintings),[commander,...cards]=selected;
 for(let i=0;i<32;i++){const run=evaluateDeployment({commander,cards,seed:archive.metadata.seed+':'+i});assert.equal(sha(JSON.stringify(run)),deck.runs[i].traceSHA256);oldStage1++;}
 for(const policy of report.metadata.policies){const {audit,...saved}=await load('benchmarks/v12/stage2/'+deck.slug+'-'+policy+'-trace.json'),actual=evaluateGameplay({commander,cards,seed:saved.seed,policy});assert.deepEqual(JSON.parse(JSON.stringify(actual)),saved);oldStage2++;}
}
const results={auditorSHA256:sha(await readFile(new URL(import.meta.url))),sourceBaseCommit:report.metadata.sourceBaseCommit,exact100CardExports:exports,exactSelectedPrintingChecks:printingChecks,representativeResourceZoneStackAudits:traceAudits,serializedCohortVectors:vectors,nativeBoundedVectors:bounded,nativeModelLossVectors:losses,oldStage1HashesMatched:oldStage1,oldStage2SampleTracesMatched:oldStage2,oldStage3MetricVectorsMatched:report.oldMetricsMatched,archivesAndCachesUnchanged:true,productionSelectionUnchanged:true,runSHA256,runtimeMs:Math.round(performance.now()-started)};
await writeFile(output+'/independent-audit.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({...results,runSHA256:undefined},null,2));
