import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
// Read caches without changing them. Output includes generated lists and public
// selected-printing metadata, never the full catalog or source account metadata.
// Usage: node tools/compare-budget-search.mjs CODE_ROOT OUTPUT_DIR [CACHE_DIR]
const root=process.argv[2],output=process.argv[3],cache=process.argv[4]||root+'/data';
if(!root||!output)throw Error('Supply code root and output directory.');
const {generateDeck}=await import(pathToFileURL(root+'/src/generator.mjs'));
const {auditExportPricing}=await import(pathToFileURL(root+'/src/pricing.mjs'));
const {readComboLibrary}=await import(pathToFileURL(root+'/src/comboLibrary.mjs'));
const {prepareCommunityConstruction}=await import(pathToFileURL(root+'/src/communityConstruction.mjs'));
const {selectedCards}=await import(pathToFileURL(root+'/src/deckSelection.mjs'));
const cards=JSON.parse(await readFile(cache+'/cards.json'));
const community=JSON.parse(await readFile(cache+'/community-decks.json'));
const decks=Array.isArray(community)?community:community.decks;
const library=await readComboLibrary(cache+'/combo-library.json');
const names=['Ulalek, Fused Atrocity',"Yuriko, the Tiger's Shadow",'Wilhelt, the Rotcleaver','Zada, Hedron Grinder'];
await mkdir(output,{recursive:true});
const rows=[];
for(const name of names)for(const bracket of [3,4]){
 const commander=cards.find(c=>c.name===name),began=Date.now();
 console.log('Starting',name,'B'+bracket);
 try{
 const communityBuild=prepareCommunityConstruction({decks,commander,bracket,catalog:cards});
 const variants=library.find(e=>e.commanderId===commander.id)?.variants||[];
 const d=generateDeck({cards,commander,bracket,budget:191,powerTarget:bracket===3?'high':'balanced',constructionMode:'strategy-first',communityBuild,communityDecks:decks,comboVariants:variants});
 const audit=auditExportPricing(d,commander,cards);
 const row={name,bracket,runtimeMs:Date.now()-began,price:d.price,totalCards:d.totalCards,audit:{count:audit.count,agrees:audit.agreesWithGenerator,withinBudget:audit.withinBudget,anomalies:audit.anomalies},engine:d.constructionEngine,investment:d.budgetInvestment,roles:d.roleAudit,tempo:d.qualityAudit,earlyAcceleration:d.earlyAcceleration,colorlessSources:d.colorlessSources,combo:{knownVariants:d.comboPlan.knownVariants,inventoryComplete:d.comboPlan.inventoryComplete,executionVerified:d.comboPlan.executionVerified},deck:d.deck,selected:selectedCards(d).map(c=>({name:c.name,price:c.prices?.eur,printing:c.printing}))};
 rows.push(row);console.log(name,bracket,d.price,row.runtimeMs,'ms',d.constructionEngine.selected,JSON.stringify(row.audit));
 await writeFile(output+'/results.json',JSON.stringify(rows,null,2));
 }catch(e){rows.push({name,bracket,error:e.stack,runtimeMs:Date.now()-began});console.log(name,bracket,e.message);await writeFile(output+'/results.json',JSON.stringify(rows,null,2));}
}
