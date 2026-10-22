/** Read-only fixed-cache B3/B4 generation and execution-requirements export.
 * node tools/benchmark-ulalek-combos.mjs CACHE_DIR OUTPUT_DIR */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {generateDeck} from '../src/generator.mjs';
import {selectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {readComboLibrary} from '../src/comboLibrary.mjs';
import {prepareCommunityConstruction} from '../src/communityConstruction.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {oracleId,isLandSlot,legalFor,priceOf} from '../src/cards.mjs';
import {planFor} from '../src/mechanics.mjs';
import {engineManaValue} from '../src/engineSupport.mjs';
import {investmentEvidence} from '../src/packageInvestment.mjs';
import {tempoEvidence} from '../src/playabilityEvidence.mjs';
import {archidektTextExport} from '../src/deckExport.mjs';
import {ulalekTurnSixExample} from './lib/ulalek-turn-six-example.mjs';
const [cache,output]=process.argv.slice(2);if(!output)throw Error('Supply CACHE_DIR OUTPUT_DIR');
const fingerprints={};for(const name of ['cards.json','community-decks.json','combo-library.json'])fingerprints[name]=createHash('sha256').update(await readFile(cache+'/'+name)).digest('hex');
const cards=JSON.parse(await readFile(cache+'/cards.json'));const saved=JSON.parse(await readFile(cache+'/community-decks.json'));const decks=Array.isArray(saved)?saved:saved.decks;
const commander=cards.find(c=>c.name==='Ulalek, Fused Atrocity'),plan=planFor(commander);
const variants=(await readComboLibrary(cache+'/combo-library.json')).find(e=>e.commanderId===oracleId(commander))?.variants||[];
const sourceFilesSHA256={};for(const name of ['src/generator.mjs','src/comboExecutionEvidence.mjs','tools/benchmark-ulalek-combos.mjs','tools/lib/ulalek-turn-six-example.mjs'])sourceFilesSHA256[name]=createHash('sha256').update(await readFile(new URL('../'+name,import.meta.url))).digest('hex');
await mkdir(output,{recursive:true});const rows=[];
for(const bracket of [3,4]){
 const slug='ulalek-b'+bracket,start=Date.now();console.log('Generating',slug,'EUR191',variants.length,'cached variants');
 const d=generateDeck({cards,commander,budget:191,bracket,powerTarget:bracket===3?'high':'balanced',constructionMode:'strategy-first',comboVariants:variants,
  communityBuild:prepareCommunityConstruction({decks,commander,bracket,catalog:cards}),communityDecks:decks});
 const selected=selectedCards(d),main=selected.slice(1),audit=auditExportPricing(d,commander,cards);
 assert.equal(audit.count,100);assert.equal(d.totalCards,100);assert.ok(audit.agreesWithGenerator&&audit.withinBudget&&!audit.anomalies.length);
 assert.ok(validateCommanderSingleton(commander,main).valid);assert.ok(main.every(c=>legalFor(c,commander)));
 const spells=main.filter(c=>!isLandSlot(c)),evidence=investmentEvidence(main,commander,plan);
 const row={name:commander.name,bracket,powerTarget:bracket===3?'High':'Optimized (B4 built-in profile)',comboPolicy:'existing conservative',budget:191,price:d.price,unused:Math.round((191-d.price)*100)/100,
  runtimeMs:Date.now()-start,sourceFilesSHA256,sourceBaseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),inputSHA256:fingerprints,
  audit:{count:audit.count,total:audit.total,agrees:audit.agreesWithGenerator,withinBudget:audit.withinBudget,anomalies:audit.anomalies,singleton:true,colorIdentityLegal:true},
  averageManaValue:{all99:main.reduce((n,c)=>n+engineManaValue(c),0)/99,nonlands:spells.reduce((n,c)=>n+engineManaValue(c),0)/spells.length},
  lands:main.length-spells.length,gameChangers:d.gameChangers,roles:d.roleAudit,tempo:tempoEvidence(main),functionalEvidence:evidence,
  selectedCandidate:d.constructionEngine.selected,candidates:d.constructionEngine.comparison,comboPlan:d.comboPlan,
  turnSixExample:ulalekTurnSixExample(commander,main),deck:d.deck,
  selectedPrintings:selected.map(c=>({id:oracleId(c),name:c.name,price:priceOf(c),printing:c.printing}))};
 rows.push(row);await writeFile(output+'/'+slug+'.txt',d.deck+'\n');await writeFile(output+'/'+slug+'-archidekt.txt',archidektTextExport(d.deck)+'\n');
 await writeFile(output+'/'+slug+'-audit.json',JSON.stringify(row,null,2)+'\n');
 console.log(slug,row.price,row.unused,row.runtimeMs,'ms',row.selectedCandidate,JSON.stringify(row.audit));
}
// Verify that read-only benchmarking did not alter any frozen inputs.
for(const [file,hash] of Object.entries(fingerprints))assert.equal(createHash('sha256').update(await readFile(cache+'/'+file)).digest('hex'),hash);
const [b3,b4]=rows;const quantities=row=>{const m=new Map();for(const c of row.selectedPrintings)m.set(c.name,(m.get(c.name)||0)+1);return m;};
const x=quantities(b3),y=quantities(b4),changes=[];for(const name of new Set([...x.keys(),...y.keys()])){const delta=(y.get(name)||0)-(x.get(name)||0);if(delta)changes.push({card:name,b4MinusB3:delta});}
await writeFile(output+'/comparison.json',JSON.stringify({inputs:fingerprints,podProfile:{implemented:false,target:'v1.2',reason:'No validated combo timing/reliability engine; do not replace that evidence with card count.'},
 decks:rows.map(({deck,selectedPrintings,candidates,comboPlan,...rest})=>({...rest,inventoryInfinite:comboPlan.inventoryInfinite,committedPackages:comboPlan.selected,comboIds:comboPlan.executionAudit.combinations.filter(v=>v.inventoryComplete).map(v=>v.id)})),cardDifferences:changes},null,2)+'\n');
