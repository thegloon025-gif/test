/** Independent persisted evidence/receipt checks; no pilot or payment search
 * is used to approve resource, event or zone receipts. Replays are separate. */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {oracleId,priceOf,legalFor,isLandSlot} from '../src/cards.mjs';
import {validateCommanderSingleton,exportCardName} from '../src/deckValidation.mjs';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
import {compareExecutionCohorts} from '../src/gameplayComparison.mjs';
import {opportunityPair,summarizeOpportunityPairs} from '../src/gameplayOpportunity.mjs';
import {shadowSeeds,pairedInterval,commonIdentityOrder} from '../src/gameplayShadow.mjs';
import {readOpportunityJSON} from './opportunity-evidence.mjs';
const [cache,out]=process.argv.slice(2),started=performance.now();
const sha=x=>createHash('sha256').update(x).digest('hex'),load=readOpportunityJSON,plain=x=>JSON.parse(JSON.stringify(x));
async function hashes(dir,prefix=''){const h={};for(const e of(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const k=prefix+e.name;if(e.isDirectory())Object.assign(h,await hashes(dir+'/'+e.name,k+'/'));else h[k]=sha(await readFile(dir+'/'+e.name));}return h;}
const f=await load(out+'/inputs.json'),protocol=await load(out+'/protocol.json'),seeds=shadowSeeds(protocol.samples);
assert.deepEqual(await hashes(cache),f.metadata.cache);assert.deepEqual(await hashes('src'),f.metadata.source);assert.equal(sha(await readFile(out+'/protocol.json')),f.metadata.protocol);assert.equal(sha(await readFile('tools/benchmark-quality-checkpoint.mjs')),f.metadata.runner);
for(const[p,h]of Object.entries(f.metadata.preserved))assert.equal(p.startsWith('stage')&&!p.includes('.')?sha(JSON.stringify(await hashes('benchmarks/v12/'+p))):sha(await readFile(p)),h);
const catalog=await load(cache+'/cards.json'),by=new Map(catalog.map(c=>[oracleId(c),c])),community=(await load(cache+'/community-decks.json')).decks,combos=(await load(cache+'/combo-library.json')).entries,selected=new Map();let slots=0;
for(const d of f.decks){
 const[commander,...cards]=[d.commander,...d.cards].map(p=>{const c=by.get(p.id);assert.equal(c.name,p.name);assert.equal(priceOf(c),p.price);assert.deepEqual(c.printing,p.printing);assert.equal(c.printing.eligibleVersion,2);slots++;return c;});selected.set(d.name,{commander,cards});
 assert.equal(cards.length,99);assert.ok(validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander)));assert.equal([commander,...cards].reduce((n,c)=>n+Math.round(priceOf(c)*100),0),Math.round(d.price*100));assert.ok(d.price<=191);
 const names=new Set([commander,...cards].map(c=>c.name));for(const combo of d.commitments)for(const n of combo.cards)assert.ok(names.has(n));if(d.sourceKey){const ids=new Set(community.find(c=>c.key===d.sourceKey).mainboard.map(c=>c.id));assert.ok(cards.filter(c=>!isLandSlot(c)&&ids.has(oracleId(c))).length>=d.sourceFloor);}
 assert.ok(!conservativeComboViolation(cards,commander,combos.find(e=>e.commanderId===oracleId(commander))?.variants||[],d.bracket));
 const audit=await load(out+'/'+d.name+'-audit.json');assert.equal(audit.total,d.price);assert.equal(audit.count,100);assert.ok(audit.withinBudget&&audit.agreesWithGenerator&&!audit.anomalies.length);assert.deepEqual(audit.selectedPrintings,[d.commander,...d.cards]);
 assert.equal(await readFile(out+'/'+d.name+'.txt','utf8'),'1x '+commander.name+' [Commander]\n'+cards.map(c=>'1x '+exportCardName(c)).join('\n')+'\n');
}
let total=0,samples=0,fixtures=0,realCardFixtures=0,tables=0,panels=0;const statuses={},opportunities={};
for(const phase of ['training','holdout']){
 const report=await load(out+'/'+phase+'.json'),raw=await readFile(out+'/'+phase+'-vectors.json.gz');assert.equal(sha(raw),report.vectorSHA256);assert.equal(sha(await readFile(out+'/inputs.json')),report.inputsSHA256);
 const{vectors,pairs}=JSON.parse(gunzipSync(raw)),seen=new Set();assert.equal(vectors.length,report.runs);assert.equal(report.runs,report.audited);assert.equal(report.runs,report.replayed);statuses[phase]={};opportunities[phase]={};
 for(const v of vectors){const k=[v.deck,v.seed,v.policy,v.scenario].join('|');assert.ok(!seen.has(k));seen.add(k);assert.ok(seeds[phase].includes(v.seed)&&protocol.policies.includes(v.policy));statuses[phase][v.status]=(statuses[phase][v.status]||0)+1;assert.equal(v.prefix.copyMana,2*v.prefix.paidCopies);if(!v.deck.startsWith('ulalek'))assert.ok(v.nativeCoverageIncomplete);if(v.status!=='completed-t8')assert.equal(v.t8,null);}
 for(const d of f.decks)for(const policy of protocol.policies)for(const scenario of d.slug==='wilhelt-b3'?protocol.scenarios:['control'])assert.equal(vectors.filter(v=>v.deck===d.name&&v.policy===policy&&v.scenario===scenario).length,seeds[phase].length);
 for(const c of report.comparisons){const d=f.decks.find(d=>d.name===c.deck),select=n=>vectors.filter(v=>v.deck===n&&v.scenario===c.scenario),b=select(d.slug+'-original'),a=select(c.deck),expected=compareExecutionCohorts(b,a);assert.deepEqual(c.rows,expected.rows);assert.equal(c.nativeAbstention,expected.nativeAbstention);for(const p of c.nativeObservedPrefixes){const bb=b.filter(v=>v.policy===p.policy),aa=a.filter(v=>v.policy===p.policy);for(const[k,i]of Object.entries(p.intervals))assert.deepEqual(i,pairedInterval(bb.map((v,j)=>aa[j].native[k]-v.native[k])));}tables++;}
 for(const p of report.opportunities){const expected=summarizeOpportunityPairs(pairs.filter(x=>x.deck===p.deck&&x.policy===p.policy&&x.scenario===p.scenario));for(const[k,v]of Object.entries(expected))assert.deepEqual(p[k],v);panels++;}
 for(const p of pairs){opportunities[phase][p.status]=(opportunities[phase][p.status]||0)+1;if(p.status==='applied')assert.ok(p.removed.length);if(p.followup)assert.ok(p.turn+2<=8);}
 for(const s of report.samples){const raw=await readFile(out+'/'+s.file);assert.equal(sha(raw),s.sha256);const stored=JSON.parse(gunzipSync(raw)),{commander,cards}=selected.get(s.deck);assert.ok(auditGameplayTrace(stored.run,commander,cards).valid);assert.deepEqual(plain(evaluateGameplay({...stored.options,commander,cards})),stored.run);
  if(s.scenario!=='control'){const control=evaluateGameplay({...stored.options,commander,cards,stage7:{tutorPolicy:'state-aware',disruptions:[]},stage8:{conditioned:true,requirements:{}}});assert.ok(auditGameplayTrace(control,commander,cards).valid);const expected=opportunityPair(control,stored.run),p=pairs.find(p=>p.deck===s.deck&&p.seed===s.seed&&p.policy===s.policy&&p.scenario===s.scenario);for(const[k,v]of Object.entries(expected))assert.deepEqual(p[k],v);}samples++;
 }total+=vectors.length;
}
for(const e of await load(out+'/fixtures/index.json')){
 const raw=await readFile(out+'/fixtures/'+e.file);assert.equal(sha(raw),e.sha256);const s=JSON.parse(gunzipSync(raw)),cards=s.cards.map((_,i)=>s.cards[s.cardRefs[i]]);assert.ok(auditGameplayTrace(s.run,s.commander,cards).valid);assert.deepEqual(plain(evaluateGameplay({...s.options,commander:s.commander,cards})),s.run);fixtures++;
 // Replay controlled scripts against actual cached Oracle records as well as
 // minimal unit fixtures. This is still scripted evidence, not natural timing.
 const unique=s.cards.map(c=>catalog.find(x=>x.name===c.name)),realCards=s.cardRefs.map(i=>unique[i]),commander=catalog.find(c=>c.name===s.commander.name);assert.ok(commander&&realCards.every(Boolean));
 const real=evaluateGameplay({...s.options,commander,cards:realCards});assert.ok(auditGameplayTrace(real,commander,realCards).valid);
 // Intrinsic basic-land modes omit optional zero/default fields compared with
 // explicit unit Oracle text. Compare resolved economic/zone receipts, not
 // representation bytes, after independently auditing each actual payment.
 const outcomes=r=>r.trace.filter(e=>/^(creature-sacrifice-|access-draw|life-gain|life-loss|token-created|end-step-sacrifice|turn-end)/.test(e.event)).map(e=>Object.fromEntries(['turn','event','source','victim','id','count','life','hand','graveyard'].filter(k=>k in e).map(k=>[k,e[k]])));
 assert.deepEqual(plain(outcomes(real)),outcomes(s.run));assert.equal(real.stats.effectDraws,s.run.stats.effectDraws);assert.equal(real.lost,s.run.lost);realCardFixtures++;
}
let oldReplays=0;for(const file of(await readdir('benchmarks/v12/stage6')).filter(f=>f.endsWith('-fixed-trace.json.gz'))){const s=JSON.parse(gunzipSync(await readFile('benchmarks/v12/stage6/'+file))),ledger=await load('benchmarks/v12/stage6/'+file.replace('-fixed-trace.json.gz','-audit.json')),[commander,...cards]=ledger.selectedPrintings.map(p=>by.get(p.id)),r=s.run;assert.deepEqual(plain(evaluateGameplay({commander,cards,seed:r.seed,order:r.order,policy:r.policy,nativeExecution:true,nativeStage5:true,nativeDecisionPolicy:'conservative'})),r);assert.ok(auditGameplayTrace(r,commander,cards).valid);oldReplays++;}
// Same-input opt-in preservation check, not another performance cohort.
let ulalekOptInTraceMatches=0;
for(const d of f.decks.filter(d=>d.slug.startsWith('ulalek')))for(const policy of protocol.policies)for(const seed of seeds.training.slice(0,2)){
 const{commander,cards}=selected.get(d.name),opts={commander,cards,seed,policy,order:commonIdentityOrder(cards,seed),nativeExecution:true,nativeStage5:true,nativeDecisionPolicy:'conservative',stage7:{tutorPolicy:'state-aware',disruptions:[]},stage8:{conditioned:true,requirements:{}}};
 const old=evaluateGameplay(opts),current=evaluateGameplay({...opts,stage9:true});assert.deepEqual(current.trace,old.trace);assert.ok(auditGameplayTrace(current,commander,cards).valid&&auditGameplayTrace(old,commander,cards).valid);ulalekOptInTraceMatches++;
}
const result={auditorSHA256:sha(await readFile(new URL(import.meta.url))),completeDecks:f.decks.length,selectedPrintingSlots:slots,auditedAndReplayedVectors:total,pairedTablesRecomputed:tables,opportunityPanelsRecomputed:panels,firstOpportunitySamplesReauditedAndReplayed:samples,controlledFixturesReauditedAndReplayed:fixtures,controlledActualCatalogOutcomeMatches:realCardFixtures,archivedStage6DefaultTracesMatched:oldReplays,ulalekOptInTraceMatches,terminalStatuses:statuses,opportunityStatuses:opportunities,preservedArchivesCachesProductionAndLauncher:true,unknownNativeStrategiesAbstain:true,limitations:'Grammar is shared; independent resource/zone/stack/death/life receipts are not a full rules proof or optimal pilot proof. Every cohort run is audited/replayed by the hashed runner; saved first receipts are separately reaudited here.',runtimeMs:Math.round(performance.now()-started)};
await writeFile(out+'/independent-audit.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
