/** Stage 6 shadow-only new complete-deck discovery and prospective execution.
 * node tools/benchmark-construction-gameplay.mjs CACHE OUTPUT discover|training|holdout
 * discover must precede training; holdout requires the frozen training report. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {discoverGameplayChallengers,challengerSignature} from '../src/gameplayChallengers.mjs';
import {summarizeExecution,compareExecutionCohorts} from '../src/gameplayComparison.mjs';
import {commonIdentityOrder,shadowSeeds,nativeCoverageIncomplete} from '../src/gameplayShadow.mjs';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {investmentEvidence} from '../src/packageInvestment.mjs';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
import {priceOf,oracleId,legalFor,isLandSlot} from '../src/cards.mjs';
import {validateCommanderSingleton,exportCardName} from '../src/deckValidation.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';
const [cache,output,phase]=process.argv.slice(2);if(!output||!['discover','training','holdout'].includes(phase))throw Error('Supply CACHE OUTPUT discover|training|holdout');
const start=performance.now(),sha=x=>createHash('sha256').update(x).digest('hex'),load=async p=>JSON.parse(await readFile(p)),save=(f,v)=>writeFile(output+'/'+f,JSON.stringify(v,null,2)+'\n');
const policies=['commander-first','development','native'],decisions=['conservative','resources-first'];
const seeds=shadowSeeds({training:8,holdout:48,namespace:'gameplay-construction-stage6-v1-2026-10-22'});
async function fingerprints(dir,prefix=''){const out={};for(const e of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const k=prefix+e.name;if(e.isDirectory())Object.assign(out,await fingerprints(dir+'/'+e.name,k+'/'));else out[k]=sha(await readFile(dir+'/'+e.name));}return out;}
async function absent(file){try{await access(file);throw Error('Refusing to overwrite frozen evidence: '+file);}catch(e){if(e.code!=='ENOENT')throw e;}}
const cacheSHA256=await fingerprints(cache),catalog=await load(cache+'/cards.json'),by=new Map(catalog.map(c=>[oracleId(c),c])),community=(await load(cache+'/community-decks.json')).decks,combos=(await load(cache+'/combo-library.json')).entries,stage3=await load('benchmarks/v12/stage3/comparison.json');
assert.deepEqual(cacheSHA256,(await load('benchmarks/v12/stage5/comparison.json')).metadata.cacheSHA256);
const sourceSHA256=await fingerprints('src','src/');sourceSHA256['tools/benchmark-construction-gameplay.mjs']=sha(await readFile(new URL(import.meta.url)));const protocolSHA256=sha(await readFile(output+'/PROTOCOL.md'));
const protectedFiles=['start-windows.bat','package.json','src/generator.mjs','src/deckSelection.mjs','src/strategyFirst.mjs','src/strategyExecution.mjs','benchmarks/v12/external-baseline-2026-10-22.json'];
async function preservation(){const v={};for(const stage of ['stage1','stage2','stage3','stage4','stage5'])v[stage]=await fingerprints('benchmarks/v12/'+stage);for(const f of protectedFiles)v[f]=sha(await readFile(f));return v;}
const preserved=await preservation();
const record=c=>({id:oracleId(c),name:c.name,price:priceOf(c),printing:c.printing||null});
const price=cards=>[...cards].reduce((n,c)=>n+Math.round(priceOf(c)*100),0)/100;
const original=async slug=>{const ledger=await load('benchmarks/v12/stage4/'+slug+'-original-audit.json'),[commander,...cards]=ledger.selectedPrintings.map(p=>{const c=by.get(p.id);assert.ok(c);assert.deepEqual(record(c),p);return c;});return {commander,cards};};
const diff=(a,b)=>{const remaining=b.map(oracleId);return a.filter(c=>{const i=remaining.indexOf(oracleId(c));if(i<0)return true;remaining.splice(i,1);return false;});};
function exactAudit(commander,cards){const text=[commander,...cards].map((c,i)=>'1 '+exportCardName(c)+(i===0?' *CMDR*':'')).join('\n')+'\n',total=price([commander,...cards]),audit=auditExportPricing(withSelectedCards({deck:text,price:total,budget:191},commander,cards),commander,catalog);assert.equal(cards.length,99);assert.ok(validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander)));assert.equal(audit.count,100);assert.equal(audit.total,total);assert.ok(audit.withinBudget&&audit.agreesWithGenerator&&!audit.anomalies.length);return {text,price:total,unused:Math.round((191-total)*100)/100,audit:{...audit,selectedPrintings:[commander,...cards].map(record)}};}
function compactProposal(p){return {family:p.family,round:p.round,add:p.add.map(c=>c.name),remove:p.remove.map(c=>c.name),price:p.price,productionReason:p.productionReason,shadowReasons:p.shadowReasons};}
let frozen;
if(phase==='discover'){
 await absent(output+'/discovery.json');await mkdir(output,{recursive:true});const decks=[],discovery=[];
 for(const slug of ['ulalek-b3','ulalek-b4','yuriko-b3','wilhelt-b3','zada-b3']){
  const {commander,cards}=await original(slug),prior=stage3.results.find(r=>r.slug===slug),bracket=prior.bracket,variants=combos.find(e=>e.commanderId===oracleId(commander))?.variants||[],source=community.find(d=>d.key===prior.sourceKey),sourceIds=new Set((source?.mainboard||[]).map(c=>c.id));
  const base={...exactAudit(commander,cards),name:slug+'-original',slug,kind:'original',bracket,commander:record(commander),cards:cards.map(record),sourceKey:prior.sourceKey,sourceFloor:prior.sourceFloor,commitments:prior.commitments,capabilities:investmentEvidence(cards,commander)};
  const {text,audit,...manifest}=base;decks.push(manifest);
  if(!slug.startsWith('ulalek'))continue;
  await writeFile(output+'/'+base.name+'.txt',text);await save(base.name+'-audit.json',audit);
  const began=performance.now(),found=discoverGameplayChallengers({built:{status:'ok',strategy:prior.sourceKey,cards,committedCombos:prior.commitments},pool:catalog,commander,bracket,budget:191,communityDecks:community,source:sourceIds,comboViolation:cs=>conservativeComboViolation(cs,commander,variants,bracket),maxCandidates:4});
  discovery.push({slug,runtimeMs:Math.round(performance.now()-began),cohort:found.cohort,frontier:found.discovered,limits:found.limits,protectedNames:found.protectedNames,screening:found.screening,accepted:found.accepted.map(compactProposal),rejected:found.rejected.map(compactProposal)});
  const oldSignatures=new Set();for(const p of prior.proposals||[]){if(p.cards)oldSignatures.add(challengerSignature(p.cards.map(c=>typeof c==='string'?by.get(c):c)));}
  // The archived Stage 4 ledgers are the actual twelve old repaired decks.
  const files=await readdir('benchmarks/v12/stage4');for(const f of files.filter(f=>f.startsWith(slug+'-')&&f.endsWith('-audit.json')&&!f.includes('-original-'))){const l=await load('benchmarks/v12/stage4/'+f);oldSignatures.add(challengerSignature(l.selectedPrintings.slice(1).map(p=>by.get(p.id))));}
  for(const [i,p]of found.candidates.entries()){
   assert.ok(!oldSignatures.has(challengerSignature(p.cards)),'Old repair is not a new challenger');assert.equal(conservativeComboViolation(p.cards,commander,variants,bracket),null);
   assert.ok(p.cards.filter(c=>!isLandSlot(c)&&sourceIds.has(oracleId(c))).length>=prior.sourceFloor);
   const a=exactAudit(commander,p.cards),name=slug+'-challenger-'+(i+1),item={name,slug,kind:'challenger',family:p.family,round:p.round,bracket,commander:record(commander),cards:p.cards.map(record),price:a.price,unused:a.unused,sourceKey:prior.sourceKey,sourceFloor:prior.sourceFloor,commitments:prior.commitments,add:diff(p.cards,cards).map(record),remove:diff(cards,p.cards).map(record),capabilities:investmentEvidence(p.cards,commander)};
   decks.push(item);await writeFile(output+'/'+name+'.txt',a.text);await save(name+'-audit.json',a.audit);
  }
  console.log(slug,found.candidates.length,'new safe complete challengers');
 }
 frozen={metadata:{sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSHA256,cacheSHA256,protocolSHA256,preserved,version:'1.1.5',productionSelectionChanged:false,seeds,policies,decisions},decks,discovery,runtimeMs:Math.round(performance.now()-start)};
 await save('discovery.json',frozen);
}else{
 await absent(output+'/'+phase+'.json');frozen=await load(output+'/discovery.json');assert.deepEqual(frozen.metadata.sourceSHA256,sourceSHA256,'Frozen implementation changed');assert.equal(frozen.metadata.protocolSHA256,protocolSHA256);assert.deepEqual(frozen.metadata.cacheSHA256,cacheSHA256);assert.deepEqual(frozen.metadata.preserved,preserved);
 if(phase==='holdout')await load(output+'/training.json');
 const vectors=[],samples=[],profile={simulationMs:0,auditMs:0,replayMs:0,summaryMs:0,comparisonMs:0,audits:0,replays:0};
 for(const deck of frozen.decks){const commander=by.get(deck.commander.id),cards=deck.cards.map(p=>{const c=by.get(p.id);assert.deepEqual(record(c),p);return c;});assert.deepEqual(record(commander),deck.commander);assert.equal(exactAudit(commander,cards).price,deck.price);
  for(const decision of deck.slug.startsWith('ulalek')?decisions:['conservative'])for(const seed of seeds[phase])for(const policy of policies){
   const pre=[],options={commander,cards,seed,policy,order:commonIdentityOrder(cards,seed),mulligan:'none',nativeExecution:true,nativeStage5:true,nativeDecisionPolicy:decision};
   let t=performance.now();const run=evaluateGameplay({...options,onPreAction:p=>pre.push(p)});profile.simulationMs+=performance.now()-t;
   t=performance.now();const audit=auditGameplayTrace(run,commander,cards);profile.auditMs+=performance.now()-t;assert.ok(audit.valid,JSON.stringify({deck:deck.name,seed,policy,decision,audit}));profile.audits++;
   t=performance.now();assert.deepEqual(evaluateGameplay(options),run,'Replay or diagnostic observer mutation');profile.replayMs+=performance.now()-t;profile.replays++;
   t=performance.now();const summary=summarizeExecution(run,{commander,cards,decision,pre});profile.summaryMs+=performance.now()-t;
   const followups=summary.followups.map(p=>({...p,hand:p.hand.map(h=>({card:h.card,status:h.status,reason:h.reason}))}));vectors.push({deck:deck.name,...summary,followups});
   if(phase==='training'&&seed===seeds.training[0]&&policy==='native'&&decision==='conservative'&&deck.slug.startsWith('ulalek')){const filename=deck.name+'-fixed-trace.json.gz';await writeFile(output+'/'+filename,gzipSync(JSON.stringify({run,audit}),{level:9}));samples.push({deck:deck.name,file:filename,sha256:sha(await readFile(output+'/'+filename))});}
  }
  console.log(phase,deck.name,'complete',vectors.length,'audited/replayed');
 }
 const t=performance.now(),comparisons=frozen.decks.filter(d=>d.kind==='challenger').map(d=>({deck:d.name,price:d.price,unused:d.unused,...compareExecutionCohorts(vectors.filter(r=>r.deck===d.slug+'-original'),vectors.filter(r=>r.deck===d.name))}));profile.comparisonMs=performance.now()-t;
 await writeFile(output+'/'+phase+'-vectors.json.gz',gzipSync(JSON.stringify(vectors),{level:9}));
 await save(phase+'.json',{discoverySHA256:sha(await readFile(output+'/discovery.json')),protocolSHA256,sourceSHA256,seeds:seeds[phase],policies,decisions,vectors:vectors.length,vectorsSHA256:sha(await readFile(output+'/'+phase+'-vectors.json.gz')),comparisons,samples,profile,runtimeMs:Math.round(performance.now()-start),abstentions:frozen.decks.filter(d=>!d.slug.startsWith('ulalek')).map(d=>({deck:d.name,nativeCoverageIncomplete:nativeCoverageIncomplete(by.get(d.commander.id)),reason:'Native combat/ninjutsu, death/sacrifice or target-copy execution remains incomplete; no candidate promotion/rejection'}))});
}
assert.deepEqual(await fingerprints(cache),cacheSHA256);assert.deepEqual(await preservation(),preserved);console.log(phase,'passed exact selected-printing, cache and historical preservation checks; runtime ms',Math.round(performance.now()-start));
