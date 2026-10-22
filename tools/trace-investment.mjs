/** Read-only, fixed-catalog investment replay of an exported deck.
 * node tools/trace-investment.mjs CACHE_DIR DECK_FILE OUTPUT_DIR [cached|empty]
 * Output includes generated exports, public printing ledger and bounded traces.
 * It never updates research, catalogs, prices, or third-party evaluator scores. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {investRemainingBudget,strategyScore} from '../src/strategyFirst.mjs';
import {planFor} from '../src/mechanics.mjs';
import {investmentEvidence} from '../src/packageInvestment.mjs';
import {isCommander,legalFor,priceOf} from '../src/cards.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {validateCommanderSingleton,exportCardName} from '../src/deckValidation.mjs';
import {readComboLibrary} from '../src/comboLibrary.mjs';
const [cache,deckFile,output,research='empty']=process.argv.slice(2);
if(!cache||!deckFile||!output||!['cached','empty'].includes(research))throw Error('Usage: node tools/trace-investment.mjs CACHE_DIR DECK_FILE OUTPUT_DIR [cached|empty]');
const raw=await readFile(path.join(cache,'cards.json'),'utf8'),cards=JSON.parse(raw);
const metadata=JSON.parse(await readFile(path.join(cache,'metadata.json'),'utf8'));
assert.ok(metadata.printingEligibilityVersion>=2,'Refresh the input catalog through the normal eligible-printing import first');
const names=(await readFile(deckFile,'utf8')).trim().split(/\r?\n/).map(l=>l.replace(/^1x?\s+/,'').replace(/\s+(?:\*CMDR\*|\[Commander\])$/i,''));
assert.equal(names.length,100,'Expected commander first, then exactly 99 cards');
const [commander,...main]=names.map(name=>cards.find(c=>c.name===name));
assert.ok(commander&&isCommander(commander));assert.ok(main.every(c=>c&&legalFor(c,commander)));assert.ok(validateCommanderSingleton(commander,main).valid);
const price=Number((priceOf(commander)+main.reduce((n,c)=>n+priceOf(c),0)).toFixed(2)),budget=191;
const plan=planFor(commander),variants=research==='cached'?(await readComboLibrary(path.join(cache,'combo-library.json'))).find(x=>x.commanderId===commander.id)?.variants||[]:[];
const traceNames=['Arcane Signet','Sol Ring','Thran Dynamo','Worn Powerstone','Hedron Archive','The One Ring','Rhystic Study','Kindred Discovery','Guardian Project','Mystic Forge','Up the Beanstalk','Ulamog, the Infinite Gyre'];
const began=Date.now(),result=investRemainingBudget({built:{status:'ok',strategy:'reported-list',cards:main,price,committedCombos:[]},pool:cards,commander,plan,bracket:3,budget,comboVariants:variants,traceNames});
const deck='1 '+exportCardName(commander)+' *CMDR*\n'+result.cards.map(c=>'1 '+exportCardName(c)).join('\n');
const audit=auditExportPricing(withSelectedCards({deck,price:result.price,budget},commander,result.cards),commander,cards);
assert.equal(audit.count,100);assert.equal(audit.withinBudget,true);assert.equal(audit.agreesWithGenerator,true);assert.deepEqual(audit.anomalies,[]);assert.ok(validateCommanderSingleton(commander,result.cards).valid);
await mkdir(output,{recursive:true});await writeFile(path.join(output,'before.txt'),names.map((n,i)=>'1 '+n+(i===0?' *CMDR*':'')).join('\n')+'\n');await writeFile(path.join(output,'after.txt'),deck+'\n');
const report={commander:commander.name,budget,research,knownVariants:variants.length,priceMode:'Cached Scryfall eligible-printing EUR estimate, basics owned, shipping excluded; not verified EN NM',catalogSHA256:createHash('sha256').update(raw).digest('hex'),metadata,elapsedMs:Date.now()-began,
 before:{price,unused:Number((budget-price).toFixed(2)),score:strategyScore(main,commander,plan),evidence:investmentEvidence(main,commander,plan)},
 after:{price:result.price,unused:Number((budget-result.price).toFixed(2)),score:strategyScore(result.cards,commander,plan),evidence:investmentEvidence(result.cards,commander,plan)},
 singleCardPaths:result.budgetInvestment.candidates,selectedOrigin:result.packageInvestment.originPath,packages:result.packageInvestment,audit,
 limitations:['Imported text has no recorded generator combo commitments; recorded compact-combo policy is applied only in cached mode. Standard generation preserves its actual recorded commitments.','Capacity and support evidence are conservative static approximations, not gameplay or official bracket certification.']};
await writeFile(path.join(output,'trace.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({before:price,after:result.price,unused:report.after.unused,packages:result.packageInvestment.accepted,ms:report.elapsedMs}));
