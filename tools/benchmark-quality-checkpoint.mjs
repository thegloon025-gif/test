/** Stage 9: offline, shadow-only product checkpoint. Never imported by production.
 * node tools/benchmark-quality-checkpoint.mjs CACHE OUT discover|training|holdout */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {generateDeck} from '../src/generator.mjs';
import {selectedCards,withSelectedCards} from '../src/deckSelection.mjs';
import {investmentEvidence,refinePackageInvestments} from '../src/packageInvestment.mjs';
import {deathModel} from '../src/gameplayDeath.mjs';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
import {oracleId,priceOf,legalFor,isLandSlot} from '../src/cards.mjs';
import {validateCommanderSingleton,exportCardName} from '../src/deckValidation.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {commonIdentityOrder,shadowSeeds,pairedInterval} from '../src/gameplayShadow.mjs';
import {summarizeExecution,compareExecutionCohorts} from '../src/gameplayComparison.mjs';
import {opportunityPair,summarizeOpportunityPairs} from '../src/gameplayOpportunity.mjs';
import {summarizeRecovery} from '../src/gameplayRecovery.mjs';
const [cache,out,phase]=process.argv.slice(2);
if(!['discover','training','holdout'].includes(phase)||!out)throw Error('CACHE OUT discover|training|holdout required');
const started=performance.now(),sha=x=>createHash('sha256').update(x).digest('hex');
const load=async f=>JSON.parse(await readFile(f)),save=(f,v)=>writeFile(out+'/'+f,JSON.stringify(v,null,2)+'\n');
const packed=async(f,v)=>{const bytes=gzipSync(JSON.stringify(v),{level:9});await writeFile(out+'/'+f,bytes);return sha(bytes);};
async function hashes(dir,prefix=''){const result={};for(const e of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const key=prefix+e.name;if(e.isDirectory())Object.assign(result,await hashes(dir+'/'+e.name,key+'/'));else result[key]=sha(await readFile(dir+'/'+e.name));}return result;}
async function absent(f){try{await access(f);throw Error('Refuse to overwrite frozen evidence: '+f);}catch(e){if(e.code!=='ENOENT')throw e;}}
await absent(out+'/'+(phase==='discover'?'inputs':phase)+'.json');await mkdir(out,{recursive:true});
const protocol=await load(out+'/protocol.json'),prior=await load('benchmarks/v12/stage8/inputs.json');
const catalog=await load(cache+'/cards.json'),by=new Map(catalog.map(c=>[oracleId(c),c]));
const community=(await load(cache+'/community-decks.json')).decks,combos=(await load(cache+'/combo-library.json')).entries;
const record=c=>({id:oracleId(c),name:c.name,price:priceOf(c),printing:c.printing||null});
const price=cs=>cs.reduce((n,c)=>n+Math.round(priceOf(c)*100),0)/100;
const sourceHashes=await hashes('src');
const preserved={};for(let i=1;i<=8;i++)preserved['stage'+i]=sha(JSON.stringify(await hashes('benchmarks/v12/stage'+i)));
for(const f of ['start-windows.bat','package.json','server.mjs','public/app.js','src/generator.mjs','src/deckSelection.mjs','src/strategyFirst.mjs','src/packageInvestment.mjs','benchmarks/v12/external-baseline-2026-10-22.json','benchmarks/v12/stage7-human-observations-2026-10-23.json'])preserved[f]=sha(await readFile(f));
const metadata={cache:await hashes(cache),source:sourceHashes,runner:sha(await readFile(new URL(import.meta.url))),protocol:sha(await readFile(out+'/protocol.json')),preserved,version:'1.1.5',productionChanged:false};
assert.deepEqual(metadata.cache,prior.metadata.cache);
function records(d){const commander=by.get(d.commander.id),cards=d.cards.map(p=>{const c=by.get(p.id);assert.deepEqual(record(c),p);return c;});assert.deepEqual(record(commander),d.commander);return{commander,cards};}
function exact(d){const {commander,cards}=records(d);assert.equal(cards.length,99);assert.ok(validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander)));
 const text=[commander,...cards].map((c,i)=>'1 '+exportCardName(c)+(i===0?' *CMDR*':'')).join('\n')+'\n';
 const audit=auditExportPricing(withSelectedCards({deck:text,price:d.price,budget:191},commander,cards),commander,catalog);
 assert.equal(audit.count,100);assert.equal(audit.total,d.price);assert.ok(audit.withinBudget&&audit.agreesWithGenerator&&!audit.anomalies.length);
 const names=new Set([commander,...cards].map(c=>c.name));for(const combo of d.commitments)for(const n of combo.cards)assert.ok(names.has(n));
 if(d.sourceKey){const source=new Set(community.find(s=>s.key===d.sourceKey).mainboard.map(c=>c.id));assert.ok(cards.filter(c=>!isLandSlot(c)&&source.has(oracleId(c))).length>=d.sourceFloor);}
 assert.ok(!conservativeComboViolation(cards,commander,combos.find(e=>e.commanderId===oracleId(commander))?.variants||[],d.bracket));
 return{commander,cards,audit};}
let frozen;
if(phase==='discover'){
 const decks=structuredClone(prior.decks),base=decks.find(d=>d.name==='wilhelt-b3-original'),{commander,cards}=records(base);
 const variants=combos.find(e=>e.commanderId===oracleId(commander))?.variants||[];
 const protectedNames=[...new Set([...base.capabilities.infrastructure.map(x=>x.card),...base.capabilities.drawEngines.map(x=>x.card),...cards.filter(c=>{const m=deathModel(c,{additional:true});return m.triggers.length||m.endStep;}).map(c=>c.name),'Gutless Ghoul'])];
 const discovery=[];
 for(const recipe of protocol.recipes){
  const add=recipe.add.map(n=>catalog.find(c=>c.name===n)),remove=recipe.remove.map(n=>cards.find(c=>c.name===n));assert.ok([...add,...remove].every(Boolean));let observed;
  refinePackageInvestments({built:{status:'ok',strategy:'frozen',cards,committedCombos:base.commitments},pool:[...cards,...add],commander,budget:191,bracket:3,source:null,comboViolation:cs=>conservativeComboViolation(cs,commander,variants,3),shadowOnly:true,shadowProtectedNames:protectedNames,maxRounds:1,maxEvaluations:4,beamWidth:1,shadowProposals:[{id:recipe.id,add,remove}],observeProposal:p=>{observed=p;}});
  assert.ok(observed,'Declared package was not evaluated');assert.deepEqual(observed.shadowReasons,[]);
  const d={...base,name:'wilhelt-b3-'+recipe.id,kind:'challenger',family:recipe.id,cards:observed.cards.map(record),add:add.map(record),remove:remove.map(record),price:price([commander,...observed.cards]),capabilities:investmentEvidence(observed.cards,commander)};d.unused=Math.round((191-d.price)*100)/100;decks.push(d);
  discovery.push({id:recipe.id,add:d.add,remove:d.remove,productionReason:observed.productionReason,shadowReasons:observed.shadowReasons,protectedNames,rationale:recipe.rationale});
 }
 const t=performance.now(),generated=generateDeck({cards:catalog,commander,budget:191,bracket:3,powerTarget:'high',constructionMode:'strategy-first',communityDecks:community,comboVariants:variants,investmentTrace:protocol.watch});
 const generationMs=Math.round(performance.now()-t),selected=selectedCards(generated),selectedMain=selected.slice(1);
 const diagnostic={generationMs,price:generated.price,selectedCandidate:generated.constructionEngine.selected,constructionEngine:generated.constructionEngine,budgetInvestment:generated.budgetInvestment,packageInvestment:generated.packageInvestment,roles:generated.roleAudit,selected:selected.map(record),sameFrozenList:JSON.stringify(selectedMain.map(oracleId).sort())===JSON.stringify(cards.map(oracleId).sort()),matchingCommunity:community.filter(s=>s.commanderIds?.includes(oracleId(commander))).length,spellbookVariants:variants.length,originalCapabilities:base.capabilities};
 const genAudit=auditExportPricing(generated,commander,catalog);assert.ok(genAudit.withinBudget&&genAudit.agreesWithGenerator&&genAudit.count===100&&!genAudit.anomalies.length);
 const diagnosticSHA256=await packed('generation.json.gz',diagnostic);
 frozen={metadata,decks,discovery,generation:{price:generated.price,selected:generated.constructionEngine.selected,sameFrozenList:diagnostic.sameFrozenList,generationMs,diagnosticSHA256},runtimeMs:Math.round(performance.now()-started)};
 for(const d of decks){const{commander,cards,audit}=exact(d);await writeFile(out+'/'+d.name+'.txt','1x '+commander.name+' [Commander]\n'+cards.map(c=>'1x '+exportCardName(c)).join('\n')+'\n');await save(d.name+'-audit.json',{...audit,selectedPrintings:[commander,...cards].map(record)});}
 await save('inputs.json',frozen);console.log('discover',frozen.generation,decks.map(d=>[d.name,d.price]));
}else{
 frozen=await load(out+'/inputs.json');assert.deepEqual(metadata,frozen.metadata);if(phase==='holdout')await load(out+'/training.json');
 const seeds=shadowSeeds(protocol.samples)[phase],vectors=[],pairs=[],samples=[],sampleKeys=new Set(),profile={simulateMs:0,auditMs:0,replayMs:0};let runs=0;
 for(const deck of frozen.decks){const{commander,cards}=exact(deck),wilhelt=deck.slug==='wilhelt-b3',scenarios=wilhelt?protocol.scenarios:['control'];
  for(const policy of protocol.policies)for(const seed of seeds){let control;
   for(const scenario of scenarios){const spec=scenario==='control'?null:{id:scenario,turn:1,scope:scenario==='wipe'?'creatures':scenario==='engine'?'engine':'commander',effect:scenario==='wipe'?'destroy':'exile',commanderDestination:'command',...(scenario==='engine'?{card:'Undead Augur'}:{})};
    const opts={commander,cards,seed,order:commonIdentityOrder(cards,seed),policy,nativeExecution:true,nativeStage5:true,nativeDecisionPolicy:'conservative',stage7:{tutorPolicy:'state-aware',disruptions:spec?[spec]:[]},stage8:{conditioned:true,requirements:scenario==='wipe'?{wipe:'commander'}:{}},stage9:true};
    let t=performance.now();const run=evaluateGameplay(opts);profile.simulateMs+=performance.now()-t;t=performance.now();const audit=auditGameplayTrace(run,commander,cards);profile.auditMs+=performance.now()-t;assert.ok(audit.valid,JSON.stringify({deck:deck.name,seed,policy,scenario,audit}));t=performance.now();assert.deepEqual(evaluateGameplay(opts),run);profile.replayMs+=performance.now()-t;runs++;
    const summary=summarizeExecution(run,{commander,cards});delete summary.followups;delete summary.competition;
    const native={sacrifices:run.stage9.creatureSacrifices.length,deathTriggers:run.trace.filter(e=>e.event==='native-triggered'&&e.phase==='death').length,tokens:run.trace.filter(e=>e.event==='token-created').length,endStepSacrifices:run.trace.filter(e=>e.event==='end-step-sacrifice').length,lifeGained:run.trace.filter(e=>e.event==='life-gain').reduce((n,e)=>n+e.count,0),effectDraws:run.stats.effectDraws};
    vectors.push({deck:deck.name,scenario,...summary,native,recovery:summarizeRecovery(run)});
    if(scenario==='control')control=run;else pairs.push({deck:deck.name,seed,policy,scenario,...opportunityPair(control,run)});
    const interesting=run.trace.some(e=>e.event==='creature-sacrifice-cost')?'sacrifice':scenario==='wipe'&&run.trace.some(e=>e.event==='native-triggered'&&e.phase==='death')?'wipe-death':scenario==='engine'&&run.trace.some(e=>e.event==='disruption-complete')?'engine':null,key=deck.name+'|'+interesting;
    if(interesting&&!sampleKeys.has(key)){sampleKeys.add(key);const file=phase+'-sample-'+samples.length+'.json.gz',sha256=await packed(file,{run,audit,deck:deck.name,options:{...opts,commander:undefined,cards:undefined}});samples.push({file,sha256,deck:deck.name,seed,policy,scenario,kind:interesting});}
   }
  }console.log(phase,deck.name,runs,'audited/replayed');
 }
 const comparisons=[];for(const d of frozen.decks.filter(d=>d.kind==='challenger'))for(const scenario of d.slug==='wilhelt-b3'?protocol.scenarios:['control']){
  const select=name=>vectors.filter(v=>v.deck===name&&v.scenario===scenario);
  const before=select(d.slug+'-original'),after=select(d.name);
  comparisons.push({deck:d.name,scenario,...compareExecutionCohorts(before,after),nativeObservedPrefixes:protocol.policies.map(policy=>{const b=before.filter(v=>v.policy===policy),a=after.filter(v=>v.policy===policy);return{policy,warning:'Observed prefix counts include censored/unknown trajectories, not complete strategy outcomes',intervals:Object.fromEntries(Object.keys(b[0].native).map(k=>[k,pairedInterval(b.map((v,i)=>a[i].native[k]-v.native[k]))]))};})});
 }
 const opportunities=[];for(const d of frozen.decks.filter(d=>d.slug==='wilhelt-b3'))for(const policy of protocol.policies)for(const scenario of protocol.scenarios.filter(s=>s!=='control'))opportunities.push({deck:d.name,policy,scenario,...summarizeOpportunityPairs(pairs.filter(p=>p.deck===d.name&&p.policy===policy&&p.scenario===scenario))});
 const vectorSHA256=await packed(phase+'-vectors.json.gz',{vectors,pairs});await save(phase+'.json',{inputsSHA256:sha(await readFile(out+'/inputs.json')),vectorSHA256,runs,audited:runs,replayed:runs,profile,comparisons,opportunities,samples,runtimeMs:Math.round(performance.now()-started)});
 console.log(phase,runs,Math.round(performance.now()-started),'ms');
}
assert.deepEqual(await hashes(cache),metadata.cache);assert.deepEqual(await hashes('src'),sourceHashes);
for(const [f,h]of Object.entries(preserved))assert.equal(f.startsWith('stage')&&!f.includes('.')?sha(JSON.stringify(await hashes('benchmarks/v12/'+f))):sha(await readFile(f)),h);
