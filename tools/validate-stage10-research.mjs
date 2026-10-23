/** Explicit bounded live research + cached-input generation validation.
 * NODE_USE_ENV_PROXY=1 node tools/validate-stage10-research.mjs CACHE SCRATCH OUT
 * NODE_USE_ENV_PROXY is needed only on this Node 24 cloud host's normal proxy.
 * Original inputs are read-only. External data and cache writes go to SCRATCH. */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {researchForGeneration} from '../src/researchFlow.mjs';
import {lookupCommanderVariants,lookupColorVariants} from '../src/commanderComboResearch.mjs';
import {autoResearchArchidekt} from '../src/autoResearch.mjs';
import {loadCommunity,saveCommunity} from '../src/community.mjs';
import {fetchSpellbookForDeck} from '../src/combos.mjs';
import {readComboLibrary,recordSpellbookVariants,repairComboLibraryFromCache} from '../src/comboLibrary.mjs';
import {generateDeck} from '../src/generator.mjs';
import {prepareCommunityConstruction} from '../src/communityConstruction.mjs';
import {selectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {validateCommanderSingleton,exportCardName} from '../src/deckValidation.mjs';
import {legalFor,priceOf,oracleId} from '../src/cards.mjs';
const[cache,scratch,out]=process.argv.slice(2);if(!out||scratch===cache)throw Error('Separate CACHE SCRATCH OUT required');
const sha=x=>createHash('sha256').update(x).digest('hex'),load=async f=>JSON.parse(await readFile(f)),save=(f,v)=>writeFile(out+'/'+f,JSON.stringify(v,null,2)+'\n');
async function hashes(dir,prefix=''){const h={};for(const e of(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const key=prefix+e.name;if(e.isDirectory())Object.assign(h,await hashes(dir+'/'+e.name,key+'/'));else h[key]=sha(await readFile(dir+'/'+e.name));}return h;}
await mkdir(scratch,{recursive:true});await mkdir(out,{recursive:true});
const originalHashes=await hashes(cache),catalog=await load(cache+'/cards.json'),originalCommunity=(await load(cache+'/community-decks.json')).decks,originalCombos=(await load(cache+'/combo-library.json')).entries;
const communityFile=scratch+'/community.json',libraryFile=scratch+'/library.json';
await saveCommunity(originalCommunity,communityFile);await copyFile(cache+'/combo-library.json',libraryFile);
const repaired=await repairComboLibraryFromCache(originalCommunity,catalog,{file:libraryFile,cacheDir:cache+'/spellbook-cache'}),baselineCombos=await readComboLibrary(libraryFile);
const requests=[],network=async(url,opts)=>{const t=performance.now();try{const r=await fetch(url,opts);requests.push({url:String(url),method:opts?.method||'GET',status:r.status,ms:Math.round(performance.now()-t)});return r;}catch(e){requests.push({url:String(url),method:opts?.method||'GET',error:e.message,ms:Math.round(performance.now()-t)});throw e;}};
const names=['Ulalek, Fused Atrocity','Wilhelt, the Rotcleaver','Yuriko, the Tiger\'s Shadow','Zada, Hedron Grinder','Henzie "Toolbox" Torre'],reports=[];
let community=originalCommunity;
for(const name of names){
 const commander=catalog.find(c=>c.name===name);assert.ok(commander,name);
 for(const bracket of [3,4]){
  const started=performance.now(),slug=name.split(/[, ]/)[0].toLowerCase()+'-b'+bracket;
  // Full live Archidekt discovery validation for Wilhelt. Other commanders retain
  // frozen source cohorts while independently validating both live GET scopes.
  const research=await researchForGeneration({commanderId:oracleId(commander),commanderName:name,bracket,budget:191,catalog,savedCommunity:community,reuseDiscovery:name!==names[1],
   discover:args=>autoResearchArchidekt({...args,file:communityFile,fetcher:network}),
   reload:()=>loadCommunity(communityFile),
   lookup:args=>lookupCommanderVariants({...args,cacheDir:scratch+'/queries',fetcher:network}),
   lookupColors:args=>lookupColorVariants({...args,cacheDir:scratch+'/queries',fetcher:network}),
   record:(id,r,options={})=>recordSpellbookVariants(id,r,{...options,file:libraryFile}),
   analyze:(deck,cs,options)=>fetchSpellbookForDeck(deck,cs,{...options,cacheDir:scratch+'/decks',fetcher:network})
  });community=research.community;
  const current=(await readComboLibrary(libraryFile)).find(e=>e.commanderId===oracleId(commander));
  const row={slug,commander:name,bracket,budget:191,research:research.report,knownVariantsBefore:baselineCombos.find(e=>e.commanderId===oracleId(commander))?.variants.length||0,knownVariantsAfter:current?.variants.length||0,provenance:current?.research||[],researchMs:Math.round(performance.now()-started)};
  for(const phase of (name===names[0]||name===names[1]?['before','after']:['after'])){
   console.log('building',slug,phase);
   const t=performance.now(),decks=phase==='before'?originalCommunity:community,communityBuild=prepareCommunityConstruction({decks,commander,bracket,catalog,mode:'auto'}),d=generateDeck({cards:catalog,commander,budget:191,bracket,powerTarget:bracket===3?'high':'balanced',communityBuild,constructionMode:'strategy-first',communityDecks:phase==='before'?originalCommunity:community,comboVariants:phase==='before'?baselineCombos.find(e=>e.commanderId===oracleId(commander))?.variants||[]:current?.variants||[]});
   const chosen=selectedCards(d),audit=auditExportPricing(d,commander,catalog);
   assert.equal(chosen.length,100);assert.ok(validateCommanderSingleton(commander,chosen.slice(1)).valid&&chosen.slice(1).every(c=>legalFor(c,commander)));
   assert.ok(audit.withinBudget&&audit.agreesWithGenerator&&!audit.missing.length&&!audit.anomalies.length);assert.equal(audit.count,100);
   const records=chosen.map(c=>({id:oracleId(c),name:c.name,price:priceOf(c),printing:c.printing})),file=slug+'-'+phase+'.txt';
   await writeFile(out+'/'+file,'1x '+commander.name+' [Commander]\n'+chosen.slice(1).map(c=>'1x '+exportCardName(c)).join('\n')+'\n');
   await save(slug+'-'+phase+'-records.json',{commanderId:oracleId(commander),records,price:audit.total,count:audit.count,withinBudget:true,provenance:audit.provenance,source:d.constructionEngine.selected,sourceSpells:d.constructionEngine.adaptedSourceSpells,sourceLands:d.constructionEngine.adaptedSourceLands,comboExecutionVerified:false});
   await writeFile(scratch+'/'+slug+'-'+phase+'-browser.json',JSON.stringify({...d,version:'1.1.5',pricingAudit:audit,automaticResearch:research.report}));
   row[phase]={price:audit.total,unused:Math.round((191-audit.total)*100)/100,selected:d.constructionEngine.selected,comboCandidates:d.comboPlan.knownVariants,inventoryComplete:d.comboPlan.inventoryComplete,earlyAcceleration:d.earlyAcceleration,roles:d.roleAudit?.counts,export:file,records:records.map(r=>r.name),runtimeMs:Math.round(performance.now()-t)};
  }
  const diff=(a,b)=>{const available=b.slice();return a.filter(n=>{const i=available.indexOf(n);if(i<0)return true;available.splice(i,1);return false;});};
  if(row.before){row.added=diff(row.after.records,row.before.records);row.cut=diff(row.before.records,row.after.records);delete row.before.records;}else{row.comparison='After-only legality/budget regression, no before/after improvement inference';}delete row.after.records;
  reports.push(row);await save('validation.json',{date:'2026-10-24',node:process.version,cacheSHA256:originalHashes,sourceSHA256:await hashes('src'),runnerSHA256:sha(await readFile(new URL(import.meta.url))),startupRepair:repaired,requests,reports,limitations:'Live queries are time-varying, bounded and partial; frozen original catalog/price records unchanged. Only Wilhelt refreshes Archidekt; other source cohorts are cached, explicitly reused. No real-game power, native Windows or interactive browser certification.'});
  console.log(slug,row.research.commanderLookup.status,row.research.commanderLookup.variants,row.research.colorLookup.status,row.before?.price??'not paired','->',row.after.price,row.added?.length??'not paired','changed');
 }
}
assert.deepEqual(await hashes(cache),originalHashes);
console.log('All original cache hashes preserved');
