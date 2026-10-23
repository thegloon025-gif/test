/** Stage 5: fixed prospective comparisons and compact independently audited
 * evidence. node tools/benchmark-native-stage5.mjs CACHE OUTPUT [--diagnostics]
 * Does not construct decks, select winners, refresh caches or infer infinities. */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {createShadowEvaluator,commonIdentityOrder,compareShadowRuns,shadowVerdict,nativeCoverageIncomplete,shadowSeeds,pairedInterval,diagnosePayment} from '../src/gameplayShadow.mjs';
import {nativeModel} from '../src/gameplayNative.mjs';
import {isColorless} from '../src/gameplayCards.mjs';
import {printedManaValue} from '../src/gameplayAccess.mjs';
import {oracleId,priceOf,legalFor} from '../src/cards.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';
const [cache,output,mode]=process.argv.slice(2);if(!output)throw Error('Supply CACHE OUTPUT');
const started=performance.now(),sha=x=>createHash('sha256').update(x).digest('hex'),load=async p=>JSON.parse(await readFile(p));
const policies=['commander-first','development','native'],decisions=['copy-first','resources-first','conservative','follow-up'];
async function fingerprints(dir,prefix=''){const out={};for(const e of await readdir(dir,{withFileTypes:true})){const k=prefix+e.name;if(e.isDirectory())Object.assign(out,await fingerprints(dir+'/'+e.name,k+'/'));else out[k]=sha(await readFile(dir+'/'+e.name));}return out;}
await mkdir(output,{recursive:true});const save=(f,v)=>writeFile(output+'/'+f,JSON.stringify(v,null,2)+'\n');
const cacheSHA256=await fingerprints(cache),stage4=await load('benchmarks/v12/stage4/comparison.json');assert.deepEqual(cacheSHA256,stage4.metadata.cacheSHA256);
const preserved={};for(const d of ['stage1','stage2','stage3','stage4'])preserved[d]=await fingerprints('benchmarks/v12/'+d);
for(const f of ['start-windows.bat','package.json','src/generator.mjs','src/deckSelection.mjs','src/strategyFirst.mjs','src/packageInvestment.mjs','src/strategyExecution.mjs','benchmarks/v12/external-baseline-2026-10-22.json'])preserved[f]=sha(await readFile(f));
const sources=await fingerprints('src','src/');sources['tools/benchmark-native-stage5.mjs']=sha(await readFile(new URL(import.meta.url)));const modelFingerprint=sha(JSON.stringify(sources));
const catalog=await load(cache+'/cards.json'),by=new Map(catalog.map(c=>[oracleId(c),c])),decks=[];
for(const d of stage4.results)for(const row of d.rows){const name=d.slug+'-'+row.id,ledger=await load('benchmarks/v12/stage4/'+name+'-audit.json'),[commander,...cards]=ledger.selectedPrintings.map(p=>{const c=by.get(p.id);assert.ok(c);assert.deepEqual(c.printing,p.printing);assert.equal(priceOf(c),p.price);return c;}),text=await readFile('benchmarks/v12/stage4/'+name+'.txt','utf8');
 const budget=auditExportPricing(withSelectedCards({deck:text,price:row.price,budget:191},commander,cards),commander,catalog);assert.equal(cards.length,99);assert.ok(validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander))&&budget.withinBudget&&budget.agreesWithGenerator&&budget.count===100&&!budget.anomalies.length);
 decks.push({name,slug:d.slug,id:row.id,commander,cards,price:row.price,unused:row.unused,export:'../stage4/'+name+'.txt',audit:'../stage4/'+name+'-audit.json'});
}
const metadata={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSHA256:sources,cacheSHA256,preserved,protocolSHA256:sha(await readFile(output+'/PROTOCOL.md')),version:'1.1.5',productionSelectionChanged:false};
let audits=0,replays=0;function direct(deck,options){const r=evaluateGameplay({commander:deck.commander,cards:deck.cards,...options}),audit=auditGameplayTrace(r,deck.commander,deck.cards);assert.ok(audit.valid,JSON.stringify({deck:deck.name,options,audit}));audits++;assert.deepEqual(evaluateGameplay({commander:deck.commander,cards:deck.cards,...options,onPreAction:undefined}),r);replays++;return r;}
function brief(r){return {bounded:r.nativeExecution.boundedUnknown,lost:r.lost,conditionalLethal:r.outlets?.won||false,conditionalLethalTurn:r.outlets?.lethalTurn||null,commanderTurn:r.stats.commanderDeploymentTurn,paid:r.stats.native.paidTriggers,paidCopied:r.stats.optionalPayments.filter(p=>p.copy).length,resolvedCopies:r.stats.native.resolvedCopies,cascadeCasts:r.stats.native.castsFromCascade,draws:r.stats.effectDraws,damage:r.outlets?.totalDamage||0,life:r.outlets?.life,logicalPeak:r.stats.native.logicalPeak,residentPeak:r.stats.native.storagePeak,compressedDeclines:r.stats.native.compressedDeclines,compressedNoops:r.stats.native.compressedNoops,continuations:r.stats.native.continuations,traceEvents:r.trace.length};}
if(mode==='--diagnostics'){
 const cases=[],zhul=[];
 for(const deck of decks){const old=JSON.parse(gunzipSync(await readFile('benchmarks/v12/stage4/'+deck.name+'-stage4-runs.json.gz')));
  for(const [partition,runs]of Object.entries(old))for(const previous of runs){const {seed,policy}=previous,options={seed,policy,order:commonIdentityOrder(deck.cards,seed),nativeExecution:true};
   if(previous.nativeExecution.boundedUnknown||previous.lost){const oldRun=direct(deck,options),bound=oldRun.trace.find(e=>e.event==='native-bound'),objects=new Map(oldRun.trace.filter(e=>e.event==='stack-push').map(e=>[e.id,e])),categories={};for(const id of bound?.stack||[]){const o=objects.get(id),k=o.effect?.type||o.kind;categories[k]=(categories[k]||0)+1;}
    assert.deepEqual(oldRun.stats.native,previous.native);const results={};for(const decision of decisions)results[decision]=brief(direct(deck,{...options,nativeStage5:true,nativeDecisionPolicy:decision}));
    // Isolate compression/continuation from newly modeled outlets and choices.
    const controls={};for(const compression of [false,true])controls[compression?'shared':'expanded']=brief(direct(deck,{...options,nativeStage5:true,nativeOutlets:false,nativeCompression:compression,nativeDecisionPolicy:'copy-first'}));
    cases.push({deck:deck.name,partition,seed,pilot:policy,previous:previous.lost?'model-loss':'object-bound',categories,results,controls});
   }
   if(deck.id==='original'&&partition==='holdout'&&previous.casts.some(e=>e.card==='Zhulodok, Void Gorger')){
    const pre=[],r=direct(deck,{...options,onPreAction:p=>pre.push(p)}),engine=r.trace.find(e=>e.event==='permanent-resolved'&&e.card==='Zhulodok, Void Gorger'),min=7;
    const later=pre.filter(p=>engine&&p.turn>engine.turn),qualifies=id=>{const c=deck.cards[Number(id.replace('deck-',''))];return c&&isColorless(c)&&printedManaValue(c)>=min;};
    const followups=later.map(p=>({turn:p.turn,spells:p.hand.filter(h=>qualifies(h.id)).map(h=>({card:h.card,status:h.status,diagnosis:diagnosePayment(p.state,h)}))}));
    const has=followups.some(p=>p.spells.length),paid=followups.some(p=>p.spells.some(h=>h.status==='paid')),unknown=followups.some(p=>p.spells.some(h=>h.status==='unknown'));
    const category=!engine?'cast-not-resolved':engine.turn===8?'horizon':!later.length?'terminated-before-next-probe':!has?'no-qualifying-hand-spell':paid?'payable-before-actions-pilot-competition':unknown?'unsupported-or-search-unknown':'mana-payment-shortfall';
    zhul.push({deck:deck.name,seed,pilot:policy,castTurn:previous.casts.find(e=>e.card==='Zhulodok, Void Gorger').turn,deployedTurn:engine?.turn||null,category,followups,bounded:r.nativeExecution.boundedUnknown,lost:r.lost,cascadeCasts:r.stats.native.castsFromCascade,limitation:'Historical probes precede actions; same-turn mana immediately after deployment is not reconstructed. Categories explain later turns, not every missed legal line.'});
   }
  }
 }
 const data={metadata,cases,zhul,audits,replays,runtimeMs:Math.round(performance.now()-started)};assert.equal(cases.length,51);await save('diagnostics.json',data);console.log('diagnostics',cases.length,'zhul',zhul.length,'ms',data.runtimeMs);
}else{
 const seeds=shadowSeeds({training:8,holdout:16,namespace:'gameplay-native-stage5-v1-2026-10-22'}),evaluators=Object.fromEntries(decisions.map(nativeDecisionPolicy=>[nativeDecisionPolicy,createShadowEvaluator({modelFingerprint,nativeExecution:true,nativeStage5:true,nativeDecisionPolicy,maxEntries:16})]));
 const vectors=[],rows=[],cohorts=new Map();
 for(const deck of decks){const setsByDecision={};for(const decision of deck.slug.startsWith('ulalek')?decisions:['copy-first']){
   const sets={};for(const partition of ['training','holdout']){sets[partition]=[];for(const seed of seeds[partition])for(const policy of policies){
    const x=evaluators[decision].evaluate({commander:deck.commander,cards:deck.cards,seed,policy}),s=x.summary;sets[partition].push(s);
    const z=s.followup,grouped={noQualifying:0,payable:0,blocked:0,unknown:0};for(const p of z)if(!p.hand.length)grouped.noQualifying++;else for(const h of p.hand)grouped[h.status==='paid'?'payable':h.status==='blocked'?'blocked':'unknown']++;
    vectors.push({deck:deck.name,decision,partition,seed,policy,metrics:s.metrics,commanderTurn:s.commanderTurn,bounded:s.nativeExecution.boundedUnknown,paymentBound:s.boundHits-s.native.boundHits,actionBound:s.actionBoundHits,lost:s.lost,outlets:s.outlets,native:{paid:s.native.paidTriggers,copiedPayments:s.optionalPayments.filter(p=>p.copy).length,resolvedCopies:s.native.resolvedCopies,triggerCopies:s.native.triggerCopies,tokens:s.native.tokens,cascadeCasts:s.native.castsFromCascade,tutors:s.native.tutors,tutorCardsToHand:s.native.tutorCardsToHand,tutorCardsToTop:s.native.tutorCardsToTop,compressedDeclines:s.native.compressedDeclines,compressedNoops:s.native.compressedNoops,continuations:s.native.continuations,logicalPeak:s.native.logicalPeak,storagePeak:s.native.storagePeak},draws:s.turns.at(-1)?.draws??null,followup:grouped,grantsCast:s.casts.filter(c=>deck.cards.some(d=>d.name===c.card&&nativeModel(d).cascadeGrant)).map(c=>({turn:c.turn,card:c.card})),unknownMechanics:s.nativeExecution.unknown.length,unknownRuntime:s.native.unsupported.length,usedEngines:s.turns.at(-1)?.engines.filter(e=>e.used).map(e=>({card:e.card,kind:e.kind}))||[],threats:s.turns.flatMap(t=>t.threats.map(h=>({turn:t.turn,card:h.card,status:h.status})))});
   }}
   setsByDecision[decision]=sets;console.log(deck.name,decision,'complete');
  }
  cohorts.set(deck.name,setsByDecision);const row={deck:deck.name,price:deck.price,unused:deck.unused,export:deck.export,audit:deck.audit,nativeCoverageIncomplete:nativeCoverageIncomplete(deck.commander),comparisons:{}};
  if(deck.id!=='original')for(const decision of decisions){const b=cohorts.get(deck.slug+'-original')[decision],a=setsByDecision[decision],training=compareShadowRuns(b.training,a.training),holdout=compareShadowRuns(b.holdout,a.holdout);row.comparisons[decision]={training,holdout,verdict:shadowVerdict(training,holdout,{nativeCoverageIncomplete:nativeCoverageIncomplete(deck.commander)})};}
  rows.push(row);
  if(deck.id==='original'){const e=evaluators['copy-first'].evaluate({commander:deck.commander,cards:deck.cards,seed:seeds.training[0],policy:'native',includeTrace:true});await writeFile(output+'/'+deck.name+'-fixed-trace.json.gz',gzipSync(JSON.stringify({run:e.run,audit:e.audit}),{level:9}));}
 }
 const endpoints=['commanderTurn','draws','resolvedCopies','cascadeCasts','paid','damage','supportedLethal'];const execution=[];
 // Predeclared explanatory endpoints, not promotion scores. Require completed
 // pairs for T8 counts; no complete-case removal after seeing bounds or losses.
 for(const deck of decks.filter(d=>d.slug.startsWith('ulalek')&&d.id!=='original'))for(const decision of decisions)for(const partition of ['training','holdout'])for(const policy of policies){const before=vectors.filter(v=>v.deck===deck.slug+'-original'&&v.decision===decision&&v.partition===partition&&v.policy===policy),after=vectors.filter(v=>v.deck===deck.name&&v.decision===decision&&v.partition===partition&&v.policy===policy),complete=v=>!v.bounded&&!v.paymentBound&&!v.actionBound&&!v.lost&&!v.outlets.won;
   const value=(v,k)=>k==='supportedLethal'?v.outlets.won?1:v.bounded||v.paymentBound||v.actionBound?NaN:0:k==='commanderTurn'?v.commanderTurn??9:k==='damage'?v.outlets.totalDamage:k in v.native?v.native[k]:v[k];
   execution.push({deck:deck.name,decision,partition,policy,intervals:Object.fromEntries(endpoints.map(k=>[k,pairedInterval(after.map((a,i)=>k==='supportedLethal'||k==='commanderTurn'?(!a.bounded&&!before[i].bounded?value(a,k)-value(before[i],k):NaN):complete(a)&&complete(before[i])?value(a,k)-value(before[i],k):NaN))]))});
  }
 await writeFile(output+'/vectors.json.gz',gzipSync(JSON.stringify(vectors),{level:9}));
 await save('comparison.json',{metadata:{...metadata,seeds,decisions,policies},rows,execution,audits:Object.fromEntries(Object.entries(evaluators).map(([k,e])=>[k,e.stats])),vectors:vectors.length,vectorsSHA256:sha(await readFile(output+'/vectors.json.gz')),runtimeMs:Math.round(performance.now()-started)});
}
assert.deepEqual(await fingerprints(cache),cacheSHA256);for(const [f,v]of Object.entries(preserved))assert.deepEqual(typeof v==='string'?sha(await readFile(f)):await fingerprints('benchmarks/v12/'+f),v);
console.log('All audits, replays, exact prices and preservation passed');
