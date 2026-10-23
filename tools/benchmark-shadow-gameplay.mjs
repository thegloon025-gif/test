/** Offline shadow experiment. Never invokes generation or writes local caches.
 * node tools/benchmark-shadow-gameplay.mjs CACHE_DIR OUTPUT_DIR [--screen-only] */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {oracleId,priceOf,legalFor,isLandSlot} from '../src/cards.mjs';
import {singletonName,exportCardName,validateCommanderSingleton} from '../src/deckValidation.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
import {investmentEvidence} from '../src/packageInvestment.mjs';
import {proposeShadowRepairs,createShadowEvaluator,shadowSeeds,SHADOW_POLICIES,compareShadowRuns,shadowVerdict,nativeCoverageIncomplete,diagnoseShadowCohort,archivedShadowCommitments} from '../src/gameplayShadow.mjs';
const [cache,output,mode]=process.argv.slice(2);if(!output)throw Error('Supply CACHE_DIR OUTPUT_DIR [--screen-only]');
const root=new URL('../',import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex'),read=p=>readFile(new URL(p,root)),json=async p=>JSON.parse(await read(p));
const write=async(p,v)=>writeFile(output+'/'+p,JSON.stringify(v,null,p.endsWith('-runs.json')?undefined:2)+'\n');
async function fingerprints(dir,prefix=''){const out={};for(const e of await readdir(dir,{withFileTypes:true})){const key=prefix+e.name;if(e.isDirectory())Object.assign(out,await fingerprints(dir+'/'+e.name,key+'/'));else out[key]=sha(await readFile(dir+'/'+e.name));}return out;}
const started=performance.now(),cacheSHA256=await fingerprints(cache),preserved={};
for(const dir of ['benchmarks/v12/stage1','benchmarks/v12/stage2'])preserved[dir]=await fingerprints(new URL(dir,root).pathname);
for(const file of ['benchmarks/v12/external-baseline-2026-10-22.json','start-windows.bat','package.json','src/generator.mjs','src/strategyFirst.mjs','src/strategyExecution.mjs'])preserved[file]=sha(await read(file));
const sourceSHA256={};for(const file of (await readdir(new URL('src',root))).filter(f=>f.endsWith('.mjs')))sourceSHA256['src/'+file]=sha(await read('src/'+file));sourceSHA256['tools/benchmark-shadow-gameplay.mjs']=sha(await read('tools/benchmark-shadow-gameplay.mjs'));
const archive=await json('benchmarks/v12/stage1/frozen-replay.json'),fresh=await json('benchmarks/v12/stage1/fresh-generation.json');
for(const [file,digest] of Object.entries(archive.metadata.inputs))assert.equal(cacheSHA256[file],digest,'Frozen input '+file);
const catalog=JSON.parse(await readFile(cache+'/cards.json')),byId=new Map(catalog.map(c=>[oracleId(c),c])),community=JSON.parse(await readFile(cache+'/community-decks.json')).decks,library=JSON.parse(await readFile(cache+'/combo-library.json'));
const seeds=shadowSeeds(),modelFingerprint=sha(JSON.stringify(sourceSHA256)),evaluator=createShadowEvaluator({modelFingerprint,maxEntries:128});
const metadata={sourceBaseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSHA256,modelFingerprint,cacheSHA256,preserved,seeds,policies:SHADOW_POLICIES,
 construction:'Fixed original complete candidates plus bounded atomic proposals. No fresh generation; no production ranking integration.',
 selection:'At most six mechanically safe distinct incoming bundles, round-robin sizes 1/2/3, before gameplay outcomes. Holdout never feeds proposal construction or scheduling.',
 coupling:'SHA256 independent priorities keyed by namespace, seed, canonical card identity and duplicate occurrence. Shared cards keep relative order, not fixed draw positions. No mulligans in paired experiments.',
 uncertainty:'Exploratory paired bootstrap 95% intervals (2000 resamples), conditional on this model and fixed pilot; no multiplicity correction, ties do not prove equivalence, unsupported outcomes unknown.',
 pricing:'Exact eligible selected-record Scryfall EUR; owned basics. Not verified Cardmarket EN NM.',rankingIntegration:false};
await mkdir(output,{recursive:true});await mkdir(output+'/proposals',{recursive:true});const results=[];
const deckText=(commander,cards)=>['1 '+exportCardName(commander)+' *CMDR*',...cards.map(c=>'1 '+exportCardName(c))].join('\n')+'\n';
function auditDeck(commander,cards){assert.equal(cards.length,99);assert.ok(cards.every(c=>legalFor(c,commander)));assert.ok(validateCommanderSingleton(commander,cards).valid);
 const total=Math.round([commander,...cards].reduce((s,c)=>s+priceOf(c),0)*100)/100;
 const audit=auditExportPricing(withSelectedCards({deck:deckText(commander,cards),price:total,budget:191},commander,cards),commander,catalog);
 assert.ok(audit.withinBudget&&audit.agreesWithGenerator&&audit.count===100&&!audit.anomalies.length);return {count:100,price:total,unused:Math.round((191-total)*100)/100,withinBudget:true,singleton:true,colorLegal:true,selectedPrintings:[commander,...cards].map(c=>({id:oracleId(c),name:c.name,price:priceOf(c),printing:c.printing}))};
}
function summaryRuns(commander,cards){const sets={};for(const partition of ['training','holdout'])sets[partition]=seeds[partition].flatMap(seed=>SHADOW_POLICIES.map(policy=>evaluator.evaluate({commander,cards,seed,policy}).summary));return sets;}
function diagnosticTotals(runs){const count={};const add=k=>count[k]=(count[k]||0)+1;for(const r of runs){for(const t of r.diagnostics){if(t.commander)add('commander:'+t.commander.diagnosis.kind);for(const h of t.hand){add('hand:'+h.diagnosis.kind);if(h.status==='paid'&&h.triggerCosts.length&&h.jointStatus!=='paid')add('optional-trigger-competes:'+h.jointStatus);}for(const e of t.engines)add('engine-ready:'+e.ready);}for(const e of r.postActionExhaustion)add(e.kind);for(const e of r.decisions)if(e.commanderPayable&&e.chosen!=='commander')add('pilot-setup-before-payable-commander');}return count;}
for(const deck of archive.rows){
 const start=performance.now(),selected=deck.audit.selectedPrintings.map(p=>{const c=byId.get(p.id);assert.ok(c);assert.deepEqual(c.printing,p.printing);assert.equal(priceOf(c),p.price);assert.equal(c.name,p.name);return c;}),[commander,...cards]=selected,originalAudit=auditDeck(commander,cards);assert.equal(originalAudit.price,deck.audit.price);
 const choice=fresh.rows.find(r=>r.slug===deck.slug).selectedCandidate,sourceKey=choice.startsWith('source:')?choice.slice(7):null,sourceDeck=sourceKey?community.find(d=>d.key===sourceKey):null;assert.ok(!sourceKey||sourceDeck);
 const source=sourceDeck?new Set(sourceDeck.mainboard.filter(x=>x.quantity>0).map(x=>x.id)):null;
 const variants=(library.entries||[]).find(e=>e.commanderId===oracleId(commander))?.variants||[];
 const prior=deck.slug.startsWith('ulalek')?await json('benchmarks/pod-combo/'+deck.slug+'-audit.json'):null;
 // Preserve every recorded commitment AND every complete known inventory
 // package, including actual archived template matches. No execution claim.
 const commitments=archivedShadowCommitments(prior?.comboPlan);
 const built={status:'ok',strategy:choice,cards,committedCombos:commitments};
 const screening=proposeShadowRepairs({built,pool:catalog,commander,budget:191,bracket:deck.bracket,source,comboViolation:next=>conservativeComboViolation(next,commander,variants,deck.bracket),maxEvaluations:40});
 const sourceFloor=source?Math.min(20,cards.filter(c=>!isLandSlot(c)&&source.has(oracleId(c))).length):0;
 const baseline=mode==='--screen-only'?null:summaryRuns(commander,cards),beforeEvidence=investmentEvidence(cards,commander);
 await writeFile(output+'/'+deck.slug+'-before.txt',deckText(commander,cards));await write(deck.slug+'-before-audit.json',originalAudit);
 if(baseline)await write(deck.slug+'-before-runs.json',baseline);
 const incoming=new Set(),chosen=[];
 // Round-robin bounded sizes; alternate incoming identities before permutations.
 const buckets=[1,2,3].map(n=>screening.proposals.filter(p=>p.eligible&&p.add.length===n));
 for(let pass=0;pass<2;pass++)for(const bucket of buckets){const p=bucket.find(p=>!incoming.has(p.add.map(singletonName).sort().join('|')));if(p){chosen.push(p);incoming.add(p.add.map(singletonName).sort().join('|'));}}
 const proposals=[];
 for(const p of screening.proposals){
  const audit=auditDeck(commander,p.cards),file='proposals/'+deck.slug+'-'+p.id+'.txt';await writeFile(output+'/'+file,deckText(commander,p.cards));
  const row={id:p.id,label:p.label,incoming:p.add.map(c=>({name:c.name,price:priceOf(c),id:oracleId(c)})),outgoing:p.remove.map(c=>({name:c.name,price:priceOf(c),id:oracleId(c)})),price:audit.price,unused:audit.unused,priceChange:Math.round((audit.price-originalAudit.price)*100)/100,
   productionReason:p.productionReason,shadowReasons:p.shadowReasons,status:!p.eligible?'rejected-safeguard':chosen.includes(p)?'accepted-for-shadow-evaluation':'not-evaluated-bounded-schedule',export:file,
   capabilitiesBefore:p.before,capabilitiesAfter:p.after,audit:{...audit,selectedPrintings:undefined}};
  // Full exact ledger is reconstructible from baseline minus these exact IDs
  // plus additions. Evaluated alternatives also receive a standalone ledger.
  if(chosen.includes(p)){
   await write(deck.slug+'-'+p.id+'-audit.json',audit);
   if(baseline){const after=summaryRuns(commander,p.cards);row.training=compareShadowRuns(baseline.training,after.training);row.holdout=compareShadowRuns(baseline.holdout,after.holdout);
    row.verdict=shadowVerdict(row.training,row.holdout,{nativeCoverageIncomplete:nativeCoverageIncomplete(commander)});row.diagnostics=diagnosticTotals([...after.training,...after.holdout]);
    row.coverage={before:baseline.training[0].coverage,after:after.training[0].coverage};await write(deck.slug+'-'+p.id+'-runs.json',after);
    const index=baseline.holdout.findIndex((r,i)=>JSON.stringify(r.metrics)!==JSON.stringify(after.holdout[i].metrics)),example=baseline.holdout[Math.max(0,index)];
    const beforeTrace=evaluator.evaluate({commander,cards,seed:example.seed,policy:example.policy,includeTrace:true}),afterTrace=evaluator.evaluate({commander,cards:p.cards,seed:example.seed,policy:example.policy,includeTrace:true});
    row.example={seed:example.seed,policy:example.policy,selection:index<0?'first holdout, no measured difference':'first holdout seed/pilot with any measured difference; illustrative, not representative',before:deck.slug+'-'+p.id+'-before-trace.json',after:deck.slug+'-'+p.id+'-after-trace.json'};
    await write(row.example.before,beforeTrace);await write(row.example.after,afterTrace);
   }
  }
  proposals.push(row);
 }
 const result={slug:deck.slug,bracket:deck.bracket,originalAudit: {...originalAudit,selectedPrintings:undefined},sourceKey,sourceFloor,commitments,knownVariants:variants.length,missingComboResearch:!variants.length,nativeCoverageIncomplete:nativeCoverageIncomplete(commander),protectedNative:screening.protectedNative,
  protectedPhysicalCards:screening.protectedPhysicalCards,discovery:screening.discovery,screening:screening.screening,limits:screening.limits,counts:{scheduled:proposals.length,safe:proposals.filter(p=>!p.shadowReasons.length).length,evaluated:baseline?chosen.length:0},beforeEvidence,diagnostics:baseline?diagnosticTotals([...baseline.training,...baseline.holdout]):null,
  bottlenecks:baseline?{training:diagnoseShadowCohort(baseline.training),holdout:diagnoseShadowCohort(baseline.holdout)}:null,proposals,runtimeMs:Math.round(performance.now()-start)};
 results.push(result);await write('comparison.json',{metadata,results,evaluator:evaluator.stats,runtimeMs:Math.round(performance.now()-started)});
 console.log(deck.slug,JSON.stringify(result.counts),'runtime',result.runtimeMs+'ms',proposals.filter(p=>p.verdict).map(p=>p.id+':'+p.verdict.status).join(', '));
}
assert.deepEqual(await fingerprints(cache),cacheSHA256,'Input cache changed');
for(const [file,digest]of Object.entries(preserved))if(typeof digest==='string')assert.equal(sha(await read(file)),digest);else assert.deepEqual(await fingerprints(new URL(file,root).pathname),digest);
await write('comparison.json',{metadata,results,evaluator:evaluator.stats,runtimeMs:Math.round(performance.now()-started),preservationChecks:'passed'});
console.log('Complete:',evaluator.stats,'all cache/archive, exact-printing, resource and zone audits passed');
