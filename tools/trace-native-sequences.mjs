/** Stipulated real-card lines, separate from sampled outcomes. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
import {oracleId,priceOf,legalFor} from '../src/cards.mjs';
import {exportCardName,validateCommanderSingleton} from '../src/deckValidation.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {commonIdentityOrder} from '../src/gameplayShadow.mjs';
const [cache,output]=process.argv.slice(2);if(!output)throw Error('Supply CACHE OUTPUT');const sha=x=>createHash('sha256').update(x).digest('hex'),raw=await readFile(cache+'/cards.json'),catalog=JSON.parse(raw),byId=new Map(catalog.map(c=>[oracleId(c),c]));
const archive=JSON.parse(await readFile('benchmarks/v12/stage1/frozen-replay.json'));assert.equal(sha(raw),archive.metadata.inputs['cards.json']);
const selected=archive.rows.find(r=>r.slug==='ulalek-b3').audit.selectedPrintings.map(p=>{const c=byId.get(p.id);assert.deepEqual(c.printing,p.printing);return c;}),[commander,...base]=selected;
const cast=(card,rest={})=>({type:'cast',card,...rest}),land=card=>({type:'land',card}),cmd=commander.name;
const baseActions={1:[land('Forest')],2:[land('Plains'),cast('Arcane Signet')],3:[land('Mountain'),cast('Mind Stone')],4:[land('Island')],5:[land('Wastes'),cast(cmd)],6:[land('Wastes'),cast('Spawn-Gang Commander',{requireOptional:true})],7:[cast('Drowner of Hope',{requireOptional:true})]};
const cases=[
 {id:'paid-copy-and-entry-resources',opening:['Forest','Plains','Mountain','Arcane Signet','Mind Stone','Spawn-Gang Commander','Drowner of Hope'],draws:['Island','Wastes','Wastes'],actions:baseActions},
 {id:'multiplied-trigger-sequence',opening:['Forest','Plains','Mountain','Arcane Signet','Mind Stone','Annie Joins Up','Spawn-Gang Commander'],draws:['Island','Wastes','Wastes'],actions:{...baseActions,4:[land('Island'),cast('Annie Joins Up')],7:[]}},
 {id:'true-C-shortfall',opening:['Forest','Plains','Mountain','Arcane Signet','Mind Stone','Endbringer','Spawn-Gang Commander'],draws:['Island','Forest','Mountain'],actions:{...baseActions,5:[land('Forest'),cast(cmd)],6:[land('Mountain'),cast('Endbringer')],7:[]}},
 {id:'native-cascade',opening:['Forest','Mountain','Plains','Sol Ring','Thran Dynamo','Zhulodok, Void Gorger','Devourer of Destiny'],draws:['Island','Wastes','Arcane Signet','Mind Stone'],actions:{1:[land('Forest'),cast('Sol Ring')],2:[land('Mountain'),cast('Thran Dynamo')],3:[land('Plains'),cast('Zhulodok, Void Gorger')],4:[land('Island'),cast('Devourer of Destiny')]}},
 {id:'generic-mana-instead-of-cascade',replace:['Zhulodok, Void Gorger','Worn Powerstone'],opening:['Forest','Mountain','Plains','Sol Ring','Thran Dynamo','Worn Powerstone','Devourer of Destiny'],draws:['Island','Wastes','Arcane Signet','Mind Stone'],actions:{1:[land('Forest'),cast('Sol Ring')],2:[land('Mountain'),cast('Thran Dynamo')],3:[land('Plains'),cast('Worn Powerstone')],4:[land('Island'),cast('Devourer of Destiny')]}},
 {id:'echoes-multiplied-cascade',opening:['Forest','Mountain','Plains','Sol Ring','Thran Dynamo','Echoes of Eternity','Zhulodok, Void Gorger'],draws:['Island','Wastes','Devourer of Destiny'],actions:{1:[land('Forest'),cast('Sol Ring')],2:[land('Mountain'),cast('Thran Dynamo')],3:[land('Plains'),cast('Echoes of Eternity')],4:[land('Island'),cast('Zhulodok, Void Gorger')],5:[land('Wastes'),cast('Devourer of Destiny')]}},
 {id:'tutor-copy-deployment',opening:['Forest','Mountain','Plains','Sol Ring','Thran Dynamo','Echoes of Eternity','Conduit of Ruin'],draws:['Island','Wastes','Endbringer'],actions:{1:[land('Forest'),cast('Sol Ring')],2:[land('Mountain'),cast('Thran Dynamo')],3:[land('Plains'),cast('Echoes of Eternity')],4:[land('Island'),cast(cmd)],5:[land('Wastes'),cast('Conduit of Ruin')],6:[cast('Devourer of Destiny')]}}
];
await mkdir(output,{recursive:true});const results=[];
for(const scenario of cases){const cards=base.slice();if(scenario.replace){const [cut,add]=scenario.replace,index=cards.findIndex(c=>c.name===cut),incoming=catalog.find(c=>c.name===add);assert.ok(index>=0&&incoming);cards[index]=incoming;}
 const price=Math.round([commander,...cards].reduce((n,c)=>n+priceOf(c),0)*100)/100,deck=['1 '+cmd+' *CMDR*',...cards.map(c=>'1 '+exportCardName(c))].join('\n')+'\n';
 const budget=auditExportPricing(withSelectedCards({deck,price,budget:191},commander,cards),commander,catalog);assert.ok(budget.withinBudget&&budget.agreesWithGenerator&&validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander)));
 const order=[],used=new Set();for(const name of [...scenario.opening,...scenario.draws]){const i=cards.findIndex((c,i)=>c.name===name&&!used.has(i));assert.ok(i>=0,'Stipulated card unavailable '+name);used.add(i);order.push(i);}for(let i=0;i<cards.length;i++)if(!used.has(i))order.push(i);
 const options={commander,cards,seed:'native-sequence-v1:'+scenario.id,order,script:scenario.actions,nativeExecution:true},run=evaluateGameplay(options),audit=auditGameplayTrace(run,commander,cards);assert.ok(audit.valid,JSON.stringify(audit));assert.deepEqual(evaluateGameplay(options),run);
 const failures=run.trace.filter(e=>e.event==='action-failed');assert.equal(failures.length,0,JSON.stringify(failures));
 await writeFile(output+'/'+scenario.id+'.json',JSON.stringify({scenario,price,selectedPrintings:[commander,...cards].map(c=>({id:oracleId(c),name:c.name,price:priceOf(c),printing:c.printing})),budget,audit,run},null,2)+'\n');await writeFile(output+'/'+scenario.id+'.txt',deck);
 results.push({id:scenario.id,price,commanderTurn:run.stats.commanderDeploymentTurn,native:run.stats.native,assumptions:run.assumptions,diagnosticCounterfactual:!!scenario.replace});console.log(scenario.id,run.stats.native);
}
// A fixed, previously observed access/commander tradeoff, not a newly selected winning seed.
for(const id of ['original','repair-03']){const source=id==='original'?'ulalek-b4-before-audit.json':'ulalek-b4-repair-03-audit.json',ledger=JSON.parse(await readFile('benchmarks/v12/stage3/'+source)),[commander,...cards]=ledger.selectedPrintings.map(p=>byId.get(p.id)),seed='gameplay-shadow-2026-10-22:holdout:9',options={commander,cards,seed,policy:'development',order:commonIdentityOrder(cards,seed),nativeExecution:true},run=evaluateGameplay(options),audit=auditGameplayTrace(run,commander,cards);assert.ok(audit.valid,JSON.stringify(audit));assert.deepEqual(evaluateGameplay(options),run);await writeFile(output+'/access-tradeoff-'+id+'.json',JSON.stringify({seed,policy:'development',audit,run},null,2)+'\n');}
await writeFile(output+'/sequences.json',JSON.stringify({catalogSHA256:sha(raw),sourceSHA256:sha(await readFile(new URL(import.meta.url))),interpretation:'Stipulated real-card lines and a previously fixed tradeoff seed. Not sampled reliability, earliest combo turns, or repaired deck recommendations. Generic-mana counterfactual deliberately removes protected infrastructure and is not an eligible production repair.',results},null,2)+'\n');
