/** Fixed Stage 3 inputs, larger predeclared seeds, no construction/selection.
 * node tools/benchmark-native-gameplay.mjs CACHE OUTPUT */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {oracleId,priceOf,legalFor} from '../src/cards.mjs';
import {exportCardName,validateCommanderSingleton} from '../src/deckValidation.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {createShadowEvaluator,shadowSeeds,SHADOW_POLICIES,compareShadowRuns,shadowVerdict,nativeCoverageIncomplete,pairedInterval} from '../src/gameplayShadow.mjs';
const [cache,output]=process.argv.slice(2);if(!output)throw Error('Supply CACHE OUTPUT');
const start=performance.now(),sha=x=>createHash('sha256').update(x).digest('hex'),load=async p=>JSON.parse(await readFile(p)),seeds=shadowSeeds({training:16,holdout:32});
async function fingerprints(dir,prefix=''){const out={};for(const e of await readdir(dir,{withFileTypes:true})){const k=prefix+e.name;if(e.isDirectory())Object.assign(out,await fingerprints(dir+'/'+e.name,k+'/'));else out[k]=sha(await readFile(dir+'/'+e.name));}return out;}
const cacheSHA256=await fingerprints(cache),preserved={};for(const d of ['stage1','stage2','stage3'])preserved[d]=await fingerprints('benchmarks/v12/'+d);
for(const f of ['start-windows.bat','package.json','src/generator.mjs','src/strategyFirst.mjs','src/packageInvestment.mjs','src/strategyExecution.mjs','benchmarks/v12/external-baseline-2026-10-22.json'])preserved[f]=sha(await readFile(f));
const sources={};for(const f of (await readdir('src')).filter(f=>f.endsWith('.mjs')))sources['src/'+f]=sha(await readFile('src/'+f));sources['tools/benchmark-native-gameplay.mjs']=sha(await readFile(new URL(import.meta.url)));
const original=await load('benchmarks/v12/stage3/comparison.json');assert.deepEqual(cacheSHA256,original.metadata.cacheSHA256);
const catalog=JSON.parse(await readFile(cache+'/cards.json')),byId=new Map(catalog.map(c=>[oracleId(c),c])),modelFingerprint=sha(JSON.stringify(sources)),evaluators={stage3:createShadowEvaluator({modelFingerprint}),stage4:createShadowEvaluator({modelFingerprint,nativeExecution:true})};
const metadata={sourceBaseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSHA256:sources,modelFingerprint,protocolSHA256:sha(await readFile(output+'/PROTOCOL.md')),cacheSHA256,preserved,seeds,policies:SHADOW_POLICIES,construction:false,productionSelectionChanged:false,version:'1.1.5',nativeOrder:'copy-first',nativeStepsPerTurn:192};
await mkdir(output,{recursive:true});const results=[];let oldMetricsMatched=0;
const save=async(file,value)=>writeFile(output+'/'+file,JSON.stringify(value,null,2)+'\n');
const text=(commander,cards)=>['1 '+exportCardName(commander)+' *CMDR*',...cards.map(c=>'1 '+exportCardName(c))].join('\n')+'\n';
function nativeSummary(runs){return {runs:runs.length,boundRuns:runs.filter(r=>r.nativeExecution.boundedUnknown).length,unknownRuntimeRuns:runs.filter(r=>r.native.unsupported.length).length,observedPrefixCounts:Object.fromEntries(['spellCopies','triggerCopies','resolvedCopies','cascades','castsFromCascade','tutors','tokens','paidTriggers','multipliedTriggers'].map(k=>[k,runs.reduce((n,r)=>n+r.native[k],0)])),interpretation:'Observed supported event prefixes, including bounded runs; not complete T8 outcome counts or win estimates.'};}
for(const deck of original.results){
 const deckStart=performance.now(),ledger=await load('benchmarks/v12/stage3/'+deck.slug+'-before-audit.json'),selected=ledger.selectedPrintings.map(p=>{const c=byId.get(p.id);assert.ok(c);assert.deepEqual(c.printing,p.printing);assert.equal(priceOf(c),p.price);return c;}),[commander,...base]=selected;
 const alternatives=[{id:'original',cards:base,price:ledger.price},...(deck.slug.startsWith('ulalek')?deck.proposals.filter(p=>p.verdict).map(p=>{const cards=base.slice();for(const cut of p.outgoing){const i=cards.findIndex(c=>oracleId(c)===cut.id&&c.name===cut.name);assert.ok(i>=0);cards.splice(i,1);}for(const add of p.incoming)cards.push(byId.get(add.id));return {...p,cards};}):[])];
 const rows=[],saved=new Map();for(const candidate of alternatives){const cards=candidate.cards,exported=text(commander,cards),audit=auditExportPricing(withSelectedCards({deck:exported,price:candidate.price,budget:191},commander,cards),commander,catalog);
  assert.equal(cards.length,99);assert.ok(validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander)));assert.ok(audit.withinBudget&&audit.agreesWithGenerator&&audit.count===100&&!audit.anomalies.length);
  const name=deck.slug+'-'+candidate.id;await writeFile(output+'/'+name+'.txt',exported);await save(name+'-audit.json',{...audit,selectedPrintings:[commander,...cards].map(c=>({id:oracleId(c),name:c.name,price:priceOf(c),printing:c.printing}))});
  const modes=deck.slug.startsWith('ulalek')?['stage3','stage4']:['stage4'],modeRows=[];
  for(const mode of modes){const begin=performance.now(),sets={};for(const partition of ['training','holdout']){
   sets[partition]=[];for(const seed of seeds[partition])for(const policy of SHADOW_POLICIES){const evaluated=evaluators[mode].evaluate({commander,cards,seed,policy});sets[partition].push(evaluated.summary);}
  }
   await writeFile(output+'/'+name+'-'+mode+'-runs.json.gz',gzipSync(JSON.stringify(sets),{level:9}));saved.set(candidate.id+':'+mode,sets);
   modeRows.push({mode,runtimeMs:Math.round(performance.now()-begin),...(mode==='stage4'?{native:{training:nativeSummary(sets.training),holdout:nativeSummary(sets.holdout)}}:{})});
   if(mode==='stage3'){
    const file='benchmarks/v12/stage3/'+deck.slug+(candidate.id==='original'?'-before':'-'+candidate.id)+'-runs.json.gz';const {gunzipSync}=await import('node:zlib'),old=JSON.parse(gunzipSync(await readFile(file)));
    for(const partition of ['training','holdout'])for(const r of old[partition]){const current=sets[partition].find(x=>x.seed===r.seed&&x.policy===r.policy);assert.deepEqual(current.metrics,r.metrics);oldMetricsMatched++;}
   }
  }
  const native=saved.get(candidate.id+':stage4'),row={id:candidate.id,price:candidate.price,unused:Math.round((191-candidate.price)*100)/100,modes:modeRows};
  if(candidate.id!=='original'){const baseNative=saved.get('original:stage4');row.training=compareShadowRuns(baseNative.training,native.training);row.holdout=compareShadowRuns(baseNative.holdout,native.holdout);row.verdict=shadowVerdict(row.training,row.holdout,{nativeCoverageIncomplete:nativeCoverageIncomplete(commander)});
   const before=saved.get('original:stage3'),after=saved.get(candidate.id+':stage3');row.stage3LargerSampleVerdict=shadowVerdict(compareShadowRuns(before.training,after.training),compareShadowRuns(before.holdout,after.holdout));
   row.nativeEventDeltas={};for(const policy of SHADOW_POLICIES){const pairs=baseNative.holdout.map((b,i)=>({b,a:native.holdout[i]})).filter(p=>p.b.policy===policy);row.nativeEventDeltas[policy]=Object.fromEntries(['resolvedCopies','castsFromCascade','tutors','tokens','paidTriggers'].map(k=>[k,pairedInterval(pairs.map(({b,a})=>a.nativeExecution.boundedUnknown||b.nativeExecution.boundedUnknown?NaN:a.native[k]-b.native[k]))]));}
  }
  if(modes.includes('stage3'))row.modeComparison={training:compareShadowRuns(saved.get(candidate.id+':stage3').training,native.training),holdout:compareShadowRuns(saved.get(candidate.id+':stage3').holdout,native.holdout)};
  // Fixed first training seed for all candidates/modes; never choose a favorable trace.
  for(const mode of modes){const full=evaluators[mode].evaluate({commander,cards,seed:seeds.training[0],policy:'native',includeTrace:true});await save(name+'-'+mode+'-trace.json',full);}
  rows.push(row);console.log(name,row.price,row.verdict?.status||'original',JSON.stringify(modeRows.map(m=>({mode:m.mode,ms:m.runtimeMs,native:m.native?.holdout}))));
  await save('comparison.json',{metadata,results:results.concat([{slug:deck.slug,rows}]),oldMetricsMatched,evaluators:Object.fromEntries(Object.entries(evaluators).map(([k,e])=>[k,e.stats])),runtimeMs:Math.round(performance.now()-start)});
 }
 results.push({slug:deck.slug,nativeCoverageIncomplete:nativeCoverageIncomplete(commander),runtimeMs:Math.round(performance.now()-deckStart),rows});
}
assert.deepEqual(await fingerprints(cache),cacheSHA256);for(const d of ['stage1','stage2','stage3'])assert.deepEqual(await fingerprints('benchmarks/v12/'+d),preserved[d]);for(const [f,digest]of Object.entries(preserved))if(typeof digest==='string')assert.equal(sha(await readFile(f)),digest);
await save('comparison.json',{metadata,results,oldMetricsMatched,evaluators:Object.fromEntries(Object.entries(evaluators).map(([k,e])=>[k,e.stats])),runtimeMs:Math.round(performance.now()-start),preservation:'passed'});console.log('All fixed-input comparisons, resource/zone/stack audits, deterministic replays, exact prices and preservation checks passed');
