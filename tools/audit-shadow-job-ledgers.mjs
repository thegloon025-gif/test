/** Independent static receipt/graph audit; deliberately does not import the
 * shadow implementation or its role/relationship classifiers.
 * node tools/audit-shadow-job-ledgers.mjs CATALOG LIBRARY BUNDLE NEW_REPORT [PRIVATE_REFERENCE_BUNDLE] */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
const[catalogFile,libraryFile,bundleFile,output,privateFile]=process.argv.slice(2);
if(!output)throw Error('CATALOG LIBRARY BUNDLE NEW_REPORT [PRIVATE_REFERENCE_BUNDLE] required');
const sha=b=>createHash('sha256').update(b).digest('hex'),raw=await readFile(catalogFile),catalog=JSON.parse(raw),byId=new Map(catalog.map(c=>[String(c.oracle_id||c.id),c]));
const bundle=JSON.parse(gunzipSync(await readFile(bundleFile))),archiveRaw=await readFile('benchmarks/stage11/printing-ledgers.json.gz'),archive=JSON.parse(gunzipSync(archiveRaw)),libraryRaw=await readFile(libraryFile),lr=JSON.parse(libraryRaw),library=lr.entries||lr;
assert.equal(sha(raw),bundle.inputs.catalogSHA256);assert.equal(sha(archiveRaw),bundle.inputs.archiveSHA256);assert.equal(sha(libraryRaw),bundle.inputs.librarySHA256);
const normalize=s=>s.normalize('NFKC').trim().toLowerCase();
function cardName(c){const parts=c.name.split(/\s*\/\/\s*/);return parts.length===2&&normalize(parts[0])===normalize(parts[1])?parts[0]:c.name;}
const basic=c=>/^Basic\b/.test(c.card_faces?.[0]?.type_line||c.type_line||'');
const cents=c=>basic(c)?0:Math.round(c.prices.eur*100);
let slots=0,jobsChecked=0,obligationsChecked=0,costReceipts=0,sourceLinks=0;
function validate(ledger,records,price,budget,bracket){
 assert.equal(records.length,100);assert.equal(ledger.cards.length,100);const commander=records[0],names=new Map();
 for(let i=0;i<records.length;i++){const c=records[i],row=ledger.cards[i];assert.equal(String(c.oracle_id||c.id),String(row.oracleId));assert.equal(c.name,row.card);assert.equal(c.printing.eligibleVersion,2);assert.equal(c.legalities.commander,'legal');assert.ok(c.color_identity.every(x=>commander.color_identity.includes(x)));const k=normalize(cardName(c));names.set(k,(names.get(k)||0)+1);if(!basic(c))assert.equal(names.get(k),1);slots++;}
 const total=records.reduce((n,c)=>n+cents(c),0);assert.equal(total,Math.round(price*100));assert.ok(total<=Math.round(budget*100));assert.ok(records.filter(c=>c.game_changer).length<=(bracket===3?3:bracket===2?0:100));
 assert.equal(conservativeComboViolation(records.slice(1),commander,library.find(e=>e.commanderId===(commander.oracle_id||commander.id))?.variants||[],bracket),null);
 validateGraph(ledger,records);
}
function validateGraph(ledger,records){
 const jobList=ledger.cards.flatMap(c=>c.jobs),jobIds=new Set(jobList.map(j=>j.id)),slotsById=new Map(ledger.cards.map(c=>[c.slot,c])),cardNames=new Set(records.map(c=>c.name));assert.equal(jobIds.size,jobList.length);
 for(const job of jobList){jobsChecked++;assert.ok(slotsById.has(job.slot));assert.equal(job.sharedDependency,job.slot);assert.equal(job.card,slotsById.get(job.slot).card);assert.ok(['supported','unsupported','unknown'].includes(job.status));assert.equal(job.execution,'unknown; inventory evidence only');for(const name of job.supportingCards)assert.ok(cardNames.has(name),name);for(const id of job.beneficiaries)assert.ok(jobIds.has(id));
  if(job.cost){costReceipts++;const printed=job.cost.printed;const symbols=[...printed.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]);assert.deepEqual(job.cost.resources.filter(r=>r.symbol!=null).map(r=>r.symbol),symbols);for(const r of job.cost.resources.filter(r=>r.symbol!=null))assert.equal(r.amount,/^\d+$/.test(r.symbol)?Number(r.symbol):/^[WUBRGCTQ](?:\/[WUBRGC])?$/.test(r.symbol)?1:null);const source=records.find(c=>c.name===job.card),texts=[source.oracle_text||'',...(source.card_faces||[]).map(f=>f.oracle_text||'')].join('\n'),castCosts=[source.mana_cost,...(source.card_faces||[]).map(f=>f.mana_cost)].filter(Boolean);assert.ok(!printed||texts.includes(printed)||castCosts.includes(printed),'Cost not in actual source '+job.card);}
  for(const link of job.resourceLinks||[]){sourceLinks++;assert.equal(link.status,'unknown');for(const id of link.providers){assert.ok(jobIds.has(id));if(job.kind==='event:spell-cast')assert.notEqual(jobList.find(j=>j.id===id).slot,job.slot,'Unresolved permanent funds its own cast');}}
 }
 const obligationIds=new Set(ledger.obligations.map(o=>o.id));assert.equal(obligationIds.size,ledger.obligations.length);
 for(const o of ledger.obligations){obligationsChecked++;assert.ok(jobIds.has(o.anchor));assert.ok(['supported','unsupported','unknown'].includes(o.status));for(const ref of [...(o.satisfiedBy||[]),...(o.candidates||[]),...(o.material||[])])assert.ok(jobIds.has(ref)||cardNames.has(ref),'Dangling prerequisite '+ref);if(/\|execution$|\|cost-funding$|\|win-conversion$|\|throughput$/.test(o.id))assert.equal(o.status,'unknown');}
 for(const p of ledger.plans){assert.ok(jobIds.has(p.id));for(const ref of p.obligations)assert.ok(obligationIds.has(ref));}
 assert.equal(ledger.executionEvidence.comparisonUsed,false);assert.equal(ledger.executionEvidence.absenceIsFailure,false);
}
for(const d of Object.values(bundle.decks)){const receipt=archive[d.archiveKey];assert.equal(sha(receipt.content),d.receiptSHA256);const original=JSON.parse(receipt.content);assert.equal(original.price,d.price);const cards=original.records.map(r=>{const c=byId.get(String(r.id));assert.ok(c);assert.deepEqual(c.printing,r.printing);assert.equal(cents(c),Math.round(r.price*100));return c;});validate(d.ledger,cards,d.price,d.budget,d.bracket);}
for(const d of Object.values(bundle.mutations)){const cards=d.records.map(id=>byId.get(String(id)));assert.ok(cards.every(Boolean));validate(d.ledger,cards,d.price,d.budget,d.bracket);assert.match(d.candidateStatus,/diagnostic/);for(const loss of d.delta.brokenBaselineObligations){assert.equal(loss.anchorStatus,'unsupported');if(loss.beforeStatus==='unknown')assert.equal(loss.status,'unknown');}}
let privateReferences=0,privateReferenceRecords=0,privateUnknownCards=0;
if(privateFile){const r=JSON.parse(gunzipSync(await readFile(privateFile)));assert.deepEqual(r.inputs,bundle.inputs);for(const d of Object.values(r.references)){const l=d.ledger,records=l.cards.map(row=>row.catalogMissing?{id:row.oracleId,name:row.card}:byId.get(String(row.oracleId)));assert.equal(records.length,100);assert.ok(records.every(Boolean));for(let i=0;i<records.length;i++){assert.equal(records[i].name,l.cards[i].card);if(l.cards[i].catalogMissing){privateUnknownCards++;assert.ok(l.cards[i].jobs.every(j=>j.status==='unknown'));}else assert.equal(records[i].printing.eligibleVersion,2);}validateGraph(l,records);privateReferences++;privateReferenceRecords+=records.length;}}
const report={privateReferences,privateReferenceRecords,privateUnknownCards,privateScope:'Graph/cost receipts and known-record identities; no complete legality/price certification for unresolved references, no personal card lists in this public report',originalDecks:Object.keys(bundle.decks).length,controlledMutations:Object.keys(bundle.mutations).length,selectedPrintingSlots:slots,jobsChecked,obligationsChecked,costReceipts,potentialSourceLinks:sourceLinks,failures:[],sourceSHA256:bundle.sourceHashes,bundleSHA256:sha(await readFile(bundleFile)),scope:'Independent static identity/printing/cents and graph/cost receipts; no simulated zone movement, resource spending or gameplay proof. Existing standard compact-inventory helper reused explicitly.'};
await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(report);
