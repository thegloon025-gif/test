/** Independently recheck selected-record budgets, source floors and preserved
 * implementation/input hashes. No network, score or simulated game claims. */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {priceOf,oracleId,legalFor,isLandSlot} from '../src/cards.mjs';
import {validateCommanderSingleton,exportCardName} from '../src/deckValidation.mjs';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
const[cache,scratch,out]=process.argv.slice(2),sha=x=>createHash('sha256').update(x).digest('hex'),load=async f=>JSON.parse(await readFile(f));
async function hashes(dir,prefix=''){const h={};for(const e of(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const k=prefix+e.name;if(e.isDirectory())Object.assign(h,await hashes(dir+'/'+e.name,k+'/'));else h[k]=sha(await readFile(dir+'/'+e.name));}return h;}
const report=await load(out+'/validation.json'),catalog=await load(cache+'/cards.json'),by=new Map(catalog.map(c=>[oracleId(c),c])),community=(await load(scratch+'/community.json')).decks,library=(await load(scratch+'/library.json')).entries;
assert.deepEqual(await hashes(cache),report.cacheSHA256);
assert.equal(JSON.parse(await readFile('package.json')).version,'1.1.5');
if(report.implementationCommit)for(const[p,h]of Object.entries(report.sourceSHA256))assert.equal(sha(execFileSync('git',['show',report.implementationCommit+':src/'+p])),h);
for(const p of ['start-windows.bat','package.json','src/generator.mjs','src/strategyFirst.mjs','src/packageInvestment.mjs','src/pricing.mjs','src/printingEligibility.mjs','src/deckSelection.mjs'])assert.equal(sha(await readFile(p)),sha(execFileSync('git',['show','0463260123c0f03f558fa8d3ca23d2590f02942c:'+p])));
let slots=0,decks=0,sourceChecks=0;const newlyKnownBeforeViolations=[],afterPolicyChecks=[];
for(const row of report.reports)for(const phase of ['before','after']){
 if(!row[phase])continue;
 const ledger=await load(out+'/'+row.slug+'-'+phase+'-records.json'),[commander,...cards]=ledger.records.map(r=>{const c=by.get(r.id);assert.ok(c);assert.equal(c.name,r.name);assert.equal(priceOf(c),r.price);assert.deepEqual(c.printing,r.printing);assert.equal(c.printing.eligibleVersion,2);slots++;return c;});
 assert.equal(cards.length,99);assert.ok(validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander)));
 assert.equal(ledger.records.reduce((n,r)=>n+Math.round(r.price*100),0),Math.round(ledger.price*100));assert.equal(ledger.price,row[phase].price);assert.ok(ledger.price<=191);
 assert.equal(await readFile(out+'/'+row[phase].export,'utf8'),'1x '+commander.name+' [Commander]\n'+cards.map(c=>'1x '+exportCardName(c)).join('\n')+'\n');
 if(ledger.source.startsWith('source:archidekt:')){const source=community.find(c=>c.key===ledger.source.slice(7));assert.ok(source?.validated&&source.commanderIds.length===1&&source.commanderIds[0]===oracleId(commander)&&source.edhBracket===row.bracket);const ids=new Set(source.mainboard.map(c=>c.id));assert.ok(cards.filter(c=>!isLandSlot(c)&&ids.has(oracleId(c))).length>=20);sourceChecks++;}
 const v=conservativeComboViolation(cards,commander,library.find(e=>e.commanderId===oracleId(commander))?.variants||[],row.bracket);
 if(phase==='after'){assert.equal(v,null,JSON.stringify({slug:row.slug,v}));afterPolicyChecks.push({slug:row.slug,passed:true});}else if(v)newlyKnownBeforeViolations.push({slug:row.slug,violation:v,note:'Retrospective new knowledge; old baseline used its original cached variants.'});
 decks++;
}
const audit={decks,selectedPrintingSlots:slots,sourceSpinesChecked:sourceChecks,afterStandardPolicyCheckedAgainstFinalLibrary:afterPolicyChecks,newlyKnownBeforeViolations,originalCacheHashesPreserved:true,constructionPricingBracketAndWindowsFilesUnchanged:true,version:'1.1.5',implementationCommit:report.implementationCommit||null,limitations:'Selected-record, source and inventory-policy checks do not prove gameplay, optimal strategy selection or official bracket compliance. Live research changes over time; exact live snapshots remain in the disposable local scratch cache, not redistributed with the user catalog.'};
await writeFile(out+'/independent-audit.json',JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit,null,2));
