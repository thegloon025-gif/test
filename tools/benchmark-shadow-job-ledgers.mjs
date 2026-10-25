/** Analyze frozen completed lists, never generate/rank/modify a deck or cache.
 * node tools/benchmark-shadow-job-ledgers.mjs CATALOG LIBRARY PRIVATE_ANALYSIS NEW_OUT NEW_PRIVATE_OUT
 * Public ledgers use archived exact records; full personal ledgers stay private. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {buildCardJobLedger,compareJobLedgers} from '../src/jobLedger.mjs';
import {strategyExecution} from '../src/strategyExecution.mjs';
import {planFor} from '../src/mechanics.mjs';
import {isBasic,oracleId,priceOf,legalFor,isLandSlot} from '../src/cards.mjs';
import {singletonName,validateCommanderSingleton} from '../src/deckValidation.mjs';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
const startedTask=performance.now();
const[catalogFile,libraryFile,privateAnalysis,out,privateOut]=process.argv.slice(2);
if(!privateOut)throw Error('CATALOG LIBRARY PRIVATE_ANALYSIS NEW_OUT NEW_PRIVATE_OUT required');
const sha=b=>createHash('sha256').update(b).digest('hex'),raw=await readFile(catalogFile),catalog=JSON.parse(raw),byId=new Map(catalog.map(c=>[String(oracleId(c)),c]));
const archiveFile='benchmarks/stage11/printing-ledgers.json.gz',archiveRaw=await readFile(archiveFile),archive=JSON.parse(gunzipSync(archiveRaw));
const configurations=[
 ['yshtola-90','cast-correction/yshtola-b3-160-heldout-records.json',3],
 ['wilhelt-163','resource-history/wilhelt-b3-191-historical-records.json',3],
 ['wilhelt-102','baseline/wilhelt-b3-191-historical-records.json',3],
 ['wilhelt-source-136','candidates-before/source-archidekt-24423895-records.json',3],
 ['wilhelt-source-160','candidates-before/source-archidekt-3838228-records.json',3],
 ['wilhelt-source-186','candidates-before/source-archidekt-2298582-records.json',3],
 ['wilhelt-b4','resource-history/wilhelt-b4-191-historical-records.json',4],
 ['ulalek-b3','historical-final/ulalek-b3-191-historical-records.json',3],
 ['ulalek-b4','historical-final/ulalek-b4-191-historical-records.json',4],
 ['yuriko','references-checkpoint/yuriko-b3-191-heldout-records.json',3],
 ['zada','zada-final/zada-b3-191-heldout-records.json',3],
 ['henzie','references-checkpoint/henzie-b3-191-heldout-records.json',3]
];
const lr=JSON.parse(await readFile(libraryFile)),library=lr.entries||lr;
const decks={},measurements=[],mutations={},states=new Map();
function summarize(id,ledger,extra={}){
 const jobs=ledger.cards.flatMap(c=>c.jobs),states=xs=>Object.fromEntries(['supported','unsupported','unknown'].map(s=>[s,xs.filter(x=>x.status===s).length]));
 return {id,commander:ledger.commander,cards:ledger.totalCards,completeKnownInput:ledger.completeInput,jobs:states(jobs),obligations:states(ledger.obligations),observedDirections:ledger.plans.length,unknownClauses:jobs.filter(j=>j.kind==='unresolved:mechanics').length,...extra};
}
function auditCards(commander,cards,budget,bracket){
 assert.equal(cards.length,99);assert.ok(validateCommanderSingleton(commander,cards).valid);assert.ok(cards.every(c=>legalFor(c,commander)));
 assert.ok([commander,...cards].every(c=>c.printing?.eligibleVersion===2));
 assert.ok([commander,...cards].filter(c=>c.game_changer).length<=(bracket===3?3:bracket===2?0:100));
 assert.equal(conservativeComboViolation(cards,commander,library.find(e=>e.commanderId===oracleId(commander))?.variants||[],bracket),null);
 const value=[commander,...cards].reduce((n,c)=>n+Math.round(priceOf(c)*100),0)/100;assert.ok(value<=budget);return {price:value,budget,count:100,bracket};
}
for(const[id,key,bracket]of configurations){
 const entry=archive[key];assert.ok(entry,'Archive entry missing: '+key);assert.equal(sha(entry.content),entry.sha256);
 const receipt=JSON.parse(entry.content),selected=receipt.records.map(r=>{const c=byId.get(String(r.id));assert.ok(c);assert.equal(priceOf(c),r.price);assert.deepEqual(c.printing,r.printing);return c;}),[commander,...cards]=selected;
 const budget=receipt.budget||191,checked=auditCards(commander,cards,budget,bracket);assert.equal(checked.price,receipt.price);
 const before=JSON.stringify(selected),started=performance.now(),probe=strategyExecution(cards,commander,planFor(commander),{trials:16,seed:'shadow-job-ledger-v1',turns:8});
 const probeMs=performance.now()-started,ledgerStart=performance.now(),ledger=buildCardJobLedger({commander,cards,executionEvidence:probe}),ledgerMs=performance.now()-ledgerStart;assert.equal(JSON.stringify(selected),before,'Shadow mutated records');
 decks[id]={archiveKey:key,receiptSHA256:entry.sha256,...checked,ledger};states.set(id,{commander,cards,budget,bracket,ledger});
 measurements.push(summarize(id,ledger,{...checked,runtimeMs:Math.round((performance.now()-started)*1000)/1000,ledgerMs:Math.round(ledgerMs*1000)/1000,conditionalProbeMs:Math.round(probeMs*1000)/1000,probeTrials:16,probeIsConditionalOnly:true}));
}
function mutate(id,sourceId,remove,purpose,oneShot=false){
 const state=states.get(sourceId),owned=new Set([state.commander,...state.cards].map(singletonName)),cut=state.cards.filter(remove);assert.ok(cut.length,'No mutation opportunity: '+id);
 const basic=catalog.find(c=>isBasic(c)&&legalFor(c,state.commander)&&(state.commander.color_identity?.length?c.name===({W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest'})[state.commander.color_identity[0]]:c.name==='Wastes'));assert.ok(basic);
 let replacement=basic;
 if(oneShot){replacement=catalog.filter(c=>legalFor(c,state.commander)&&!owned.has(singletonName(c))&&/Instant|Sorcery/.test(c.type_line||'')&&/^Draw (?:two|three) cards\.\s*$/i.test(c.oracle_text||'')&&Number.isFinite(priceOf(c))&&priceOf(c)<=state.budget-[state.commander,...state.cards].reduce((n,c)=>n+priceOf(c),0)+priceOf(cut[0])).sort((a,b)=>a.name.localeCompare(b.name))[0];assert.ok(replacement,'No legal one-shot replacement');}
 const removed=new Set(cut),cards=state.cards.map(c=>removed.has(c)?replacement:c),checked=auditCards(state.commander,cards,state.budget,state.bracket),ledger=buildCardJobLedger({commander:state.commander,cards});
 mutations[id]={sourceId,purpose,cuts:cut.map(c=>c.name),adds:cut.map(()=>replacement.name),...checked,records:[state.commander,...cards].map(oracleId),ledger,delta:compareJobLedgers(state.ledger,ledger),candidateStatus:'destructive diagnostic only; not a production upgrade or preserved combo/source commitment claim'};
}
mutate('remove-forge','ulalek-b3',c=>c.name==='Mystic Forge','Remove a real top-access engine');
mutate('replace-forge-one-shot','ulalek-b3',c=>c.name==='Mystic Forge','Substitute one-shot draw for persistent library access',true);
mutate('remove-warren','wilhelt-163',c=>c.name==='Warren Soultrader','Remove life + creature → Treasure conversion');
mutate('remove-skullclamp','wilhelt-163',c=>c.name==='Skullclamp','Remove a conditional equipped-death access engine');
mutate('remove-known-sacrifice-outlets','wilhelt-163',c=>states.get('wilhelt-163').ledger.cards.some(r=>r.card===c.name&&r.jobs.some(j=>j.kind==='consume:sacrifice')),'Remove recognized voluntary sacrifice channels; other death causes remain unknown');
const yPlan=planFor(states.get('yshtola-90').commander);
const {matchesCastNeed}=await import('../src/engineSupport.mjs');
mutate('remove-qualified-casts','yshtola-90',c=>yPlan.needs.some(n=>matchesCastNeed(c,n)),'Destroy the actual noncreature/MV cast predicate support while keeping 100 cards');
// Full references are analysis only, never construction inputs or public lists.
const analysis=JSON.parse(await readFile(privateAnalysis)),paths=['confirmed-test2','current_upload/teval.txt','current_upload/Yuna_204_Updated_Preferred.txt','current_upload/Betor.txt','current_upload/Wilhelt_220_Budget_Preferred.txt',"previous_reference/Yshtola_NoStax_Delney_Preferred(1).txt",'current_upload/Zacama_Early_Game_100.txt'],references={},referenceSummary=[];
for(const p of paths){const r=analysis.rows.find(r=>r.path===p);assert.ok(r,'Missing private reference identity '+p);const commander=byId.get(String(r.commanderId));assert.ok(commander);
 const cards=r.selectedRecordIds.map(id=>byId.get(String(id)));assert.ok(cards.every(Boolean));for(const name of r.missing||[])cards.push({id:'missing:'+name,name,catalogMissing:true});assert.equal(cards.length,99,'Reference count/identity unresolved '+p);
 const ledger=buildCardJobLedger({commander,cards}),key=p==='confirmed-test2'?'ulalek-test2':p.split('/').at(-1).replace(/\.txt$/,'');references[key]={provenance:p,identityStatus:r.identityStatus,frozenValue:r.value??null,ledger};referenceSummary.push(summarize(key,ledger,{frozenValue:r.value??null,completeLegality:r.missing?.length?'unknown':r.singleton&&r.colorLegal?'known inventory checks passed':'needs review',unresolvedCatalogSlots:ledger.coverage.missingCatalogCards.length,privacy:'Full personal job/card ledger retained outside Git'}));}
const comparisons=Object.fromEntries([['wilhelt-102','wilhelt-163'],['wilhelt-source-136','wilhelt-163'],['wilhelt-source-160','wilhelt-163'],['wilhelt-source-186','wilhelt-163']].map(([a,b])=>[a+'--'+b,compareJobLedgers(decks[a].ledger,decks[b].ledger)]));
const inputs={catalogSHA256:sha(raw),archiveSHA256:sha(archiveRaw),librarySHA256:sha(await readFile(libraryFile)),privateAnalysisSHA256:sha(await readFile(privateAnalysis))},sourceHashes={};for(const file of ['src/jobLedger.mjs','src/generator.mjs','src/strategyRelations.mjs','src/engineSupport.mjs','src/strategyExecution.mjs','src/roleEvidence.mjs','src/strategyFirst.mjs','src/packageInvestment.mjs'])sourceHashes[file]=sha(await readFile(file));
await mkdir(out);await mkdir(privateOut,{mode:0o700});
await writeFile(path.join(out,'ledgers.json.gz'),gzipSync(JSON.stringify({schemaVersion:1,mode:'read-only shadow',inputs,sourceHashes,decks,mutations,comparisons})));await writeFile(path.join(out,'summary.json'),JSON.stringify({inputs,sourceHashes,measurements,referenceSummary,runtime:{elapsedMs:Math.round(performance.now()-startedTask),processPeakRSSKiB:process.resourceUsage().maxRSS,scope:'Serial frozen-list shadow analysis including conditional 16-trial probes; not generation or gameplay benchmarking'},comparisonKeys:Object.keys(comparisons),mutations:Object.entries(mutations).map(([id,m])=>({id,sourceId:m.sourceId,purpose:m.purpose,cuts:m.cuts,adds:m.adds,price:m.price,budget:m.budget,delta:m.delta})),scope:'Frozen complete-deck analysis only; no fresh generation, quality ranking or production decision'},null,2)+'\n');
await writeFile(path.join(privateOut,'reference-ledgers.json.gz'),gzipSync(JSON.stringify({inputs,references})),{mode:0o600});
assert.equal(sha(await readFile(catalogFile)),inputs.catalogSHA256);assert.equal(sha(await readFile(archiveFile)),inputs.archiveSHA256);assert.equal(sha(await readFile(privateAnalysis)),inputs.privateAnalysisSHA256);assert.equal(sha(await readFile(libraryFile)),inputs.librarySHA256);
console.log(JSON.stringify({decks:measurements.length,mutations:Object.keys(mutations).length,references:referenceSummary.length,analysisMilliseconds:measurements.reduce((n,r)=>n+r.runtimeMs,0),out,privateOut}));
