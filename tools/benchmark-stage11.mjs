/** Frozen-input full generation. No network; no reference deck is read here.
 * node tools/benchmark-stage11.mjs ROOT CATALOG COMMUNITY LIBRARY JOBS OUT DEBUG
 * ROOT can point to an immutable worktree for historical reproduction.
 * JOBS is [{id,commander,budget,bracket,budgetTolerance?,basicLandsOwned?}]. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const[root,catalogFile,communityFile,libraryFile,jobsFile,out,debug]=process.argv.slice(2);
if(!debug)throw Error('ROOT CATALOG COMMUNITY LIBRARY JOBS OUT DEBUG required');
const load=async f=>JSON.parse(await readFile(f,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const mod=f=>import(pathToFileURL(path.resolve(root,'src',f)));
const {generateDeck}=await mod('generator.mjs'),{prepareCommunityConstruction}=await mod('communityConstruction.mjs'),{selectedCards}=await mod('deckSelection.mjs'),{auditExportPricing}=await mod('pricing.mjs'),{validateCommanderSingleton,exportCardName}=await mod('deckValidation.mjs'),{priceOf,legalFor,oracleId,isLandSlot}=await mod('cards.mjs'),{conservativeComboViolation}=await mod('strategyFirst.mjs');
const catalog=await load(catalogFile),ds=await load(communityFile),community=ds.decks||ds,ls=await load(libraryFile),library=ls.entries||ls;
const inputs={};for(const f of[catalogFile,communityFile,libraryFile])inputs[path.basename(f)]=sha(await readFile(f));
const sourceHashes={};for(const f of['generator.mjs','strategyFirst.mjs','packageInvestment.mjs','cards.mjs','strategyRelations.mjs','budgetPolicy.mjs']){try{sourceHashes[f]=sha(await readFile(path.join(root,'src',f)));}catch(e){if(e.code!=='ENOENT')throw e;}}
await mkdir(out,{recursive:true});await mkdir(debug,{recursive:true});const results=[];
for(const job of await load(jobsFile)){
 assert.match(job.id,/^[a-z0-9-]+$/);console.log('building',job.id);
 const started=performance.now(),commander=catalog.find(c=>c.name===job.commander);if(!commander){results.push({...job,status:'catalog-commander-absent'});continue;}
 const comboVariants=library.find(e=>e.commanderId===oracleId(commander))?.variants||[];
 try{
  const deck=generateDeck({...job,cards:catalog,commander,communityDecks:community,comboVariants,constructionMode:'strategy-first',powerTarget:job.bracket===3?'high':'balanced',communityBuild:prepareCommunityConstruction({decks:community,commander,bracket:job.bracket,catalog,mode:'auto'})});
  const chosen=selectedCards(deck),audit=auditExportPricing(deck,commander,catalog);
  assert.equal(chosen.length,100);assert.ok(validateCommanderSingleton(commander,chosen.slice(1)).valid);assert.ok(chosen.slice(1).every(c=>legalFor(c,commander)));
  assert.ok(audit.withinBudget&&audit.agreesWithGenerator&&!audit.anomalies.length);assert.equal(audit.count,100);assert.equal(conservativeComboViolation(chosen.slice(1),commander,comboVariants,job.bracket),null);
  const ledger=chosen.map(c=>({id:oracleId(c),name:exportCardName(c),price:priceOf(c),printing:c.printing}));
  const text='1x '+exportCardName(commander)+' [Commander]\n'+chosen.slice(1).map(c=>'1x '+exportCardName(c)).join('\n')+'\n';
  await writeFile(path.join(out,job.id+'.txt'),text);await writeFile(path.join(out,job.id+'-records.json'),JSON.stringify({price:deck.price,budget:deck.budget,budgetPolicy:deck.budgetPolicy,records:ledger},null,2)+'\n');
  await writeFile(path.join(debug,job.id+'.json'),JSON.stringify({...deck,selectedRecords:ledger,version:'1.1.5',pricingAudit:audit}));
  for(const [i,alt]of(deck.alternatives||[]).entries())if(!alt.recommended){assert.ok(alt.pricingAudit.withinBudget&&alt.pricingAudit.agreesWithGenerator);await writeFile(path.join(out,job.id+'-alternative-'+(i+1)+'.txt'),alt.deck+'\n');}
  results.push({...job,status:'ok',price:audit.total,effectiveMaximum:deck.budget,unused:Math.round((deck.budget-audit.total)*100)/100,selected:deck.constructionEngine.selected,export:job.id+'.txt',runtimeMs:Math.round(performance.now()-started),maxRSSKiB:process.resourceUsage().maxRSS,
   roleCounts:deck.roleAudit?.counts,earlyAcceleration:deck.earlyAcceleration,colorlessSources:deck.colorlessSources,landCount:deck.landCount,averageSpellMV:Math.round(chosen.slice(1).filter(c=>!isLandSlot(c)).reduce((n,c)=>n+Number(c.cmc||0),0)/(99-deck.landCount)*100)/100,
   discovered:deck.constructionEngine.discovered,refinement:deck.constructionEngine.packageExpansion,
   candidates:deck.constructionEngine.candidates.map(c=>({id:c.id,price:c.price,status:c.status,score:c.score,sourceSpells:c.sourceSpells,sourceLands:c.sourceLands,refined:deck.constructionEngine.packageExpansion?.expanded.includes(c.id)})),
   comparison:deck.constructionEngine.comparison?.map(c=>({id:c.id,selection:c.selection,capabilities:c.relations?.capabilities,engines:c.relations?.relationships.filter(x=>x.support.length&&x.qualified!==false).map(x=>({card:x.card,kind:x.kind,support:x.support.length,outlets:x.outlets})),vector:c.vector,dominatedBy:c.dominatedBy})),
   alternatives:(deck.alternatives||[]).map(a=>({id:a.id,price:a.price,explanation:a.explanation,capabilities:a.relations?.capabilities})),inventoryComplete:deck.comboPlan.inventoryComplete,inventoryExecutionVerified:false,warningCount:deck.warnings.length});
  console.log(job.id,deck.price,deck.constructionEngine.selected,'alternatives',deck.alternatives?.length||0,'ms',Math.round(performance.now()-started));
 }catch(e){results.push({...job,status:'failed',error:e.stack,runtimeMs:Math.round(performance.now()-started)});console.log('FAILED',job.id,e.message);}
 await writeFile(path.join(out,'measurements.json'),JSON.stringify({inputs,sourceHashes,node:process.version,results},null,2)+'\n');
}
for(const f of[catalogFile,communityFile,libraryFile])assert.equal(sha(await readFile(f)),inputs[path.basename(f)]);
