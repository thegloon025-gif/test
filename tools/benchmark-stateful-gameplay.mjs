/** Read-only frozen-deck comparison. No construction/ranking or network calls.
 * node tools/benchmark-stateful-gameplay.mjs CACHE_DIR OUTPUT_DIR */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {evaluateDeployment} from '../src/gameplayDeployment.mjs';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditDeploymentTrace} from '../src/gameplayAudit.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {planManaPayments} from '../src/gameplayMana.mjs';
import {legalFor,priceOf,oracleId} from '../src/cards.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
const [cache,output]=process.argv.slice(2);if(!output)throw Error('Supply CACHE_DIR OUTPUT_DIR');
const root=new URL('../',import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex'),read=path=>readFile(new URL(path,root)),trials=32;
async function fingerprints(dir,prefix=''){const out={};for(const entry of await readdir(dir,{withFileTypes:true})){const key=prefix+entry.name;if(entry.isDirectory())Object.assign(out,await fingerprints(dir+'/'+entry.name,key+'/'));else out[key]=sha(await readFile(dir+'/'+entry.name));}return out;}
const cacheSHA256=await fingerprints(cache),historicalSHA256={};
for(const file of ['benchmarks/v12/external-baseline-2026-10-22.json','start-windows.bat','package.json'])historicalSHA256[file]=sha(await read(file));
const stage1SHA256=await fingerprints(new URL('benchmarks/v12/stage1',root).pathname);
const sourceSHA256={};for(const file of (await readdir(new URL('src',root))).filter(f=>f.endsWith('.mjs')))sourceSHA256['src/'+file]=sha(await read('src/'+file));sourceSHA256['tools/benchmark-stateful-gameplay.mjs']=sha(await read('tools/benchmark-stateful-gameplay.mjs'));
const archive=JSON.parse(await read('benchmarks/v12/stage1/frozen-replay.json')),catalog=JSON.parse(await readFile(cache+'/cards.json')),byId=new Map(catalog.map(c=>[oracleId(c),c]));
assert.equal(cacheSHA256['cards.json'],archive.metadata.inputs['cards.json']);for(const file of ['community-decks.json','combo-library.json'])assert.equal(cacheSHA256[file],archive.metadata.inputs[file]);
const metadata={sourceBaseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSHA256,cacheSHA256,historicalSHA256,stage1SHA256,seed:archive.metadata.seed,trials,
  uncertainty:'Nominal Wilson 95% intervals for sampled model proportions. Bootstrap intervals use 2000 deterministic resamples; policy differences pair common seeds. Exploratory, no multiple-comparison correction. Only conditional model/pilot sampling uncertainty, not external power or win probabilities.',
  pricing:'Frozen exact selected Scryfall EUR printings, owned basics, not verified EN NM offers',rankingIntegration:false};
const scenarios=[{id:'stage1',stage:1},{id:'stage1-optimized',stage:1,optimizeMana:true},
 {id:'native-no-access',policy:'native',access:false,mulligan:'none'},
 ...['commander-first','development','native'].flatMap(policy=>[{id:policy,policy,mulligan:'none'},{id:policy+'-mulligan',policy,mulligan:'one-free'}])];
function wilson(k,n){const z=1.95996398454,p=k/n,d=1+z*z/n,mid=(p+z*z/(2*n))/d,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return {count:k,n,lower:Math.max(0,mid-half),upper:Math.min(1,mid+half)};}
function paired(values){let state=2718281;const means=[];for(let b=0;b<2000;b++){let sum=0;for(let i=0;i<values.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;sum+=values[Math.floor(state/4294967296*values.length)];}means.push(sum/values.length);}means.sort((a,b)=>a-b);return {mean:values.reduce((n,x)=>n+x,0)/values.length,lower:means[49],upper:means[1949],positive:values.filter(v=>v>0).length,negative:values.filter(v=>v<0).length,tied:values.filter(v=>v===0).length};}
const tally=values=>{const m={};for(const x of values)m[x]=(m[x]||0)+1;return m;};
function summarizeRun(run,stage){
 const commanderTurn=stage===1?run.trace.find(e=>e.event==='permanent-resolved'&&e.id==='commander')?.turn??null:run.stats.commanderDeploymentTurn;
 const turns=stage===1?run.trace.filter(e=>e.event==='turn-end').map(e=>({turn:e.turn,hand:e.hand.length,creditedDraws:0,netAccessibleCards:e.hand.length+e.board.filter(s=>s.id!=='commander'&&!s.id.startsWith('token-')).length-7-e.turn,topCasts:0,nativeEngineReady:null,missed:tally(run.trace.filter(x=>x.turn===e.turn&&x.event==='remaining-card').map(x=>x.status+':'+x.reason))})):run.observations.map(o=>({turn:o.turn,hand:o.handSize,creditedDraws:o.effectDraws,netAccessibleCards:o.netAccessibleCards,topCasts:o.topCasts,effectDiscards:o.effectDiscards,cleanupDiscards:o.cleanupDiscards,returnedToTop:o.returnedToTop,accessSpells:o.accessSpells,accessSacrifices:o.accessSacrifices,
   independentMana:Object.fromEntries(Object.entries(o.manaBeforeActions.max).map(([k,v])=>[k,v.unknown?null:v.payableAtLeast])),triggerCC:o.manaBeforeActions.separateTriggeredCC,nativeEnginesDeployed:o.engines.filter(e=>e.native).length,nativeEngineReady:o.engines.filter(e=>e.native&&e.readyNow==='ready').length,nativeEnginesUsed:o.engines.filter(e=>e.native&&e.used).length,unmodeledNativeChannels:o.engines.filter(e=>e.native&&!e.supported).map(e=>e.kind),largeNativeBodiesPayable:o.threatsBeforeActions.filter(t=>t.status==='paid').length,missed:tally(o.missed.map(x=>x.status+':'+x.reason))}));
 return {seed:run.seed,commanderTurn,setupBeforePayableCommander:run.stats.setupBeforePayableCommander??null,lost:run.lost||false,creditedDraws:run.stats.effectDraws||0,topCasts:run.stats.topCasts||0,boundHits:run.stats.boundHits,actionBoundHits:run.stats.actionBoundHits||0,mulligans:run.stats.mulligans||0,
  usedEngines:run.stats.usedEngines||[],casts:run.stats.casts.map(c=>({turn:c.turn,card:c.card})),turns,coverage:run.coverage||{access:'unmodeled in Stage 1'},unknownTriggerEvents:run.trace.filter(e=>e.event==='access-trigger-unknown').length};
}
function summarize(runs){return {commanderByT5:wilson(runs.filter(r=>r.commanderTurn!==null&&r.commanderTurn<=5).length,runs.length),commanderByT8:wilson(runs.filter(r=>r.commanderTurn!==null).length,runs.length),
 creditedDrawsTotal:runs.reduce((n,r)=>n+r.creditedDraws,0),meanCreditedDraws:runs.reduce((n,r)=>n+r.creditedDraws,0)/runs.length,topCasts:runs.reduce((n,r)=>n+r.topCasts,0),boundHits:runs.reduce((n,r)=>n+r.boundHits,0),boundRuns:runs.filter(r=>r.boundHits).length,actionBoundHits:runs.reduce((n,r)=>n+r.actionBoundHits,0),mulliganRuns:runs.filter(r=>r.mulligans).length,lost:runs.filter(r=>r.lost).length,
 turns:Array.from({length:8},(_,i)=>{const rows=runs.map(r=>r.turns.find(t=>t.turn===i+1)).filter(Boolean),flow=paired(rows.map(r=>r.netAccessibleCards));return {turn:i+1,observed:rows.length,commanderDeployed:wilson(runs.filter(r=>r.commanderTurn!==null&&r.commanderTurn<=i+1).length,runs.length),meanHand:rows.reduce((n,r)=>n+r.hand,0)/rows.length,meanDraws:rows.reduce((n,r)=>n+r.creditedDraws,0)/rows.length,netAccessibleCards:{mean:flow.mean,lower:flow.lower,upper:flow.upper},readyNativeRuns:rows.filter(r=>r.nativeEngineReady>0).length};})};}
await mkdir(output,{recursive:true});const results=[],boundCases=[],examples=[];
for(const deck of archive.rows){
 const selected=deck.audit.selectedPrintings.map(p=>{const c=byId.get(p.id);assert.ok(c);assert.equal(c.name,p.name);assert.equal(priceOf(c),p.price);assert.deepEqual(c.printing,p.printing);return c;}),[commander,...cards]=selected;
 assert.equal(selected.length,100);assert.ok(validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander)));
 const exported=await read(deck.inputExport),exact=auditExportPricing(withSelectedCards({deck:exported.toString(),price:deck.audit.price,budget:191},commander,cards),commander,catalog);
 assert.ok(exact.withinBudget&&exact.agreesWithGenerator&&exact.count===100&&!exact.anomalies.length);assert.equal(exact.total,deck.audit.price);
 const row={slug:deck.slug,price:exact.total,unused:Math.round((191-exact.total)*100)/100,exactPrintingAudit:{count:100,price:exact.total,budget:191,withinBudget:true,agrees:true,singleton:true,legal:true},scenarios:[],comparisons:[]};
 const saved=new Map();
 for(const scenario of scenarios){
  const start=performance.now(),runs=[];
  for(let trial=0;trial<trials;trial++){
   const seed=metadata.seed+':'+trial,options={commander,cards,seed,...scenario};
   const run=scenario.stage===1?evaluateDeployment({...options,onManaAttempt:scenario.id==='stage1'?x=>{if(x.result.status==='unknown'&&x.result.reason.includes('bound'))boundCases.push({slug:deck.slug,trial,card:x.card,turn:x.turn,state:structuredClone(x.state),payments:x.payments,old:x.result});}:undefined}):evaluateGameplay(options);
   const audit=scenario.stage===1?auditDeploymentTrace(run,commander,cards):auditGameplayTrace(run,commander,cards);assert.ok(audit.valid,JSON.stringify({deck:deck.slug,trial,scenario:scenario.id,audit}));
   if(scenario.id==='stage1')assert.equal(sha(JSON.stringify(run)),deck.runs[trial].traceSHA256,'Stage 1 deterministic replay changed');
   const replay=scenario.stage===1?evaluateDeployment(options):evaluateGameplay(options);assert.deepEqual(replay,run,'Replay is not deterministic');
   runs.push(summarizeRun(run,scenario.stage));
   if(trial===0&&scenario.stage!==1&&scenario.access!==false&&scenario.mulligan==='none')await writeFile(`${output}/${deck.slug}-${scenario.id}-trace.json`,JSON.stringify({audit,...run},null,2)+'\n');
   if(['native','native-no-access','commander-first','development'].includes(scenario.id))saved.set(scenario.id+':'+trial,{run,audit});
  }
  const scenarioRow={id:scenario.id,options:scenario,runtimeMs:Math.round(performance.now()-start),summary:summarize(runs),runs};row.scenarios.push(scenarioRow);console.log(deck.slug,scenario.id,scenarioRow.runtimeMs+'ms',JSON.stringify(scenarioRow.summary).slice(0,320));
 }
 for(const [a,b,label]of [['stage1','stage1-optimized','payment-only'],['native-no-access','native','stateful-access'],['commander-first','development','pilot-development'],['commander-first','native','pilot-native'],['native','native-mulligan','mulligan']]){
  const left=row.scenarios.find(s=>s.id===a).runs,right=row.scenarios.find(s=>s.id===b).runs;
  row.comparisons.push({label,before:a,after:b,commanderByT5:paired(left.map((r,i)=>Number(right[i].commanderTurn!==null&&right[i].commanderTurn<=5)-Number(r.commanderTurn!==null&&r.commanderTurn<=5))),creditedDraws:paired(left.map((r,i)=>right[i].creditedDraws-r.creditedDraws))});
 }
 for(const [left,right,kind]of [['native-no-access','native','access'],['commander-first','development','pilot']]){
  const trial=Array.from({length:trials},(_,i)=>i).find(i=>{const a=saved.get(left+':'+i).run,b=saved.get(right+':'+i).run;return kind==='access'?b.stats.effectDraws>a.stats.effectDraws||b.stats.topCasts>a.stats.topCasts:a.stats.commanderDeploymentTurn!==b.stats.commanderDeploymentTurn;});
  if(trial!==undefined){const a=saved.get(left+':'+trial),b=saved.get(right+':'+trial),prefix=deck.slug+'-'+kind+'-example';
   await writeFile(`${output}/${prefix}-before.json`,JSON.stringify(a,null,2)+'\n');await writeFile(`${output}/${prefix}-after.json`,JSON.stringify(b,null,2)+'\n');
   examples.push({slug:deck.slug,kind,trial,seed:b.run.seed,selection:'first seed with an observed model difference; illustrative, not representative reliability',before:left,after:right,commanderTurns:[a.run.stats.commanderDeploymentTurn,b.run.stats.commanderDeploymentTurn],draws:[a.run.stats.effectDraws,b.run.stats.effectDraws],topCasts:[a.run.stats.topCasts,b.run.stats.topCasts],newAccessEvents:b.run.trace.filter(e=>['access-draw','selection','top-exiled'].includes(e.event)).map(e=>({turn:e.turn,event:e.event,card:e.card,source:e.source})),castSequenceBefore:a.run.stats.casts,castSequenceAfter:b.run.stats.casts});
  }
 }
 results.push(row);await writeFile(`${output}/${deck.slug}-runs.json`,JSON.stringify(row.scenarios.map(s=>({id:s.id,runs:s.runs})))+'\n');
 await writeFile(output+'/comparison.json',JSON.stringify({metadata,scenarios,results:results.map(r=>({...r,scenarios:r.scenarios.map(({runs,...s})=>s)}))},null,2)+'\n');await writeFile(output+'/examples.json',JSON.stringify(examples,null,2)+'\n');
}
for(const c of boundCases){const start=performance.now();c.optimized=planManaPayments(c.state,c.payments,{optimized:true,maxStates:4000});c.runtimeMs=performance.now()-start;c.legacyExtended=planManaPayments(c.state,c.payments,{maxStates:100000});if(c.legacyExtended.status!=='unknown')assert.equal(c.optimized.status,c.legacyExtended.status);}
await writeFile(output+'/payment-search.json',JSON.stringify({fixedInputs:true,originalBound:4000,legacyCrossCheckBound:100000,cases:boundCases,summary:tally(boundCases.map(c=>c.optimized.status))},null,2)+'\n');
assert.deepEqual(await fingerprints(cache),cacheSHA256);assert.deepEqual(await fingerprints(new URL('benchmarks/v12/stage1',root).pathname),stage1SHA256);for(const [file,digest]of Object.entries(historicalSHA256))assert.equal(sha(await read(file)),digest);
console.log('Complete',results.length,'decks',scenarios.length*trials*results.length,'paired deterministic runs; all audits passed; frozen files unchanged');
