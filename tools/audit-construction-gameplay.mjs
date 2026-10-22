/** Persisted Stage 6 export, pairing, terminal and receipt audit. No selection.
 * node tools/audit-construction-gameplay.mjs CACHE OUTPUT */
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {oracleId,priceOf,legalFor,isLandSlot} from '../src/cards.mjs';
import {singletonName,exportCardName,validateCommanderSingleton} from '../src/deckValidation.mjs';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
import {investmentEvidence,manaCapacity} from '../src/packageInvestment.mjs';
import {summarizeExecution,compareExecutionCohorts} from '../src/gameplayComparison.mjs';
import {commonIdentityOrder} from '../src/gameplayShadow.mjs';
import {evaluateGameplay} from '../src/gameplayState.mjs';
import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';
const [cache,out]=process.argv.slice(2);if(!out)throw Error('Supply CACHE OUTPUT');const started=performance.now(),sha=x=>createHash('sha256').update(x).digest('hex'),load=async p=>JSON.parse(await readFile(p)),frozen=await load(out+'/discovery.json');
async function fingerprints(dir,prefix=''){const out={};for(const e of await readdir(dir,{withFileTypes:true})){const k=prefix+e.name;if(e.isDirectory())Object.assign(out,await fingerprints(dir+'/'+e.name,k+'/'));else out[k]=sha(await readFile(dir+'/'+e.name));}return out;}
assert.deepEqual(await fingerprints(cache),frozen.metadata.cacheSHA256);for(const [f,h]of Object.entries(frozen.metadata.sourceSHA256))assert.equal(sha(await readFile(f)),h);assert.equal(sha(await readFile(out+'/PROTOCOL.md')),frozen.metadata.protocolSHA256);
for(const [f,h]of Object.entries(frozen.metadata.preserved))assert.deepEqual(typeof h==='string'?sha(await readFile(f)):await fingerprints('benchmarks/v12/'+f),h);
const catalog=await load(cache+'/cards.json'),by=new Map(catalog.map(c=>[oracleId(c),c])),community=(await load(cache+'/community-decks.json')).decks,combos=(await load(cache+'/combo-library.json')).entries,selected=new Map();
let printingChecks=0,exports=0,safeguards=0,traces=0;
for(const deck of frozen.decks){const list=[deck.commander,...deck.cards].map(p=>{const c=by.get(p.id);assert.ok(c);assert.equal(c.name,p.name);assert.equal(priceOf(c),p.price);assert.deepEqual(c.printing,p.printing);assert.equal(c.printing.eligibleVersion,2);assert.notEqual(c.printing.border,'gold');printingChecks++;return c;}),[commander,...cards]=list,names=new Set(list.map(singletonName));selected.set(deck.name,list);
 assert.equal(cards.length,99);assert.ok(validateCommanderSingleton(commander,cards).valid&&cards.every(c=>legalFor(c,commander)));assert.equal(list.reduce((n,c)=>n+Math.round(priceOf(c)*100),0),Math.round(deck.price*100));assert.ok(deck.price<=191);assert.equal(Math.round((191-deck.price)*100),Math.round(deck.unused*100));
 for(const p of deck.commitments)for(const n of p.cards)assert.ok(names.has(singletonName({name:n})),n);
 const variants=combos.find(c=>c.commanderId===oracleId(commander))?.variants||[];assert.ok(!conservativeComboViolation(cards,commander,variants,deck.bracket));
 if(deck.sourceKey){const ids=new Set(community.find(s=>s.key===deck.sourceKey).mainboard.map(c=>c.id));assert.ok(cards.filter(c=>!isLandSlot(c)&&ids.has(oracleId(c))).length>=deck.sourceFloor);}
 if(deck.slug.startsWith('ulalek')){const lines=(await readFile(out+'/'+deck.name+'.txt','utf8')).trim().split(/\r?\n/);assert.equal(lines.length,100);assert.deepEqual(lines,list.map((c,i)=>'1 '+exportCardName(c)+(i===0?' *CMDR*':'')));const ledger=await load(out+'/'+deck.name+'-audit.json');assert.deepEqual(ledger.selectedPrintings,[deck.commander,...deck.cards]);assert.equal(ledger.total,deck.price);assert.ok(ledger.withinBudget&&!ledger.anomalies.length);exports++;}
 if(deck.kind==='challenger'){
  const original=frozen.decks.find(d=>d.name===deck.slug+'-original'),originalCards=original.cards.map(p=>by.get(p.id)),e=investmentEvidence(cards,commander),b=investmentEvidence(originalCards,commander),discovery=frozen.discovery.find(d=>d.slug===deck.slug),targets={fastMana:8,flow:8,answers:7,shields:3,wideShields:1,threats:4,castAnswers:2};
  assert.equal(cards.filter(isLandSlot).length,originalCards.filter(isLandSlot).length);assert.ok(e.raw.trueColorless>=b.raw.trueColorless&&e.land.realColorless>=b.land.realColorless&&e.land.score>=b.land.score-1e-7);for(const [k,n]of Object.entries(b.vector))assert.ok(e.vector[k]>=Math.min(n,targets[k]??n),k);
  for(const n of discovery.protectedNames)assert.ok(names.has(n),n);assert.ok(cards.filter(c=>c.game_changer).length+Number(!!commander.game_changer)<=(deck.bracket===3?3:Infinity));
  for(const c of originalCards.filter(c=>{const m=manaCapacity(c);return m.fast&&m.units>=2;})){const m=manaCapacity(c);assert.ok(cards.filter(x=>{const n=manaCapacity(x);return n.fast&&n.units>=m.units;}).length>=originalCards.filter(x=>{const n=manaCapacity(x);return n.fast&&n.units>=m.units;}).length);}
  assert.ok(deck.add.length>0&&deck.add.length===deck.remove.length&&deck.add.length<=6);safeguards++;
 }
}
const counts={},allVectors=[];let total=0,audits=0,replays=0;
for(const partition of ['training','holdout']){
 const report=await load(out+'/'+partition+'.json'),bytes=await readFile(out+'/'+partition+'-vectors.json.gz'),vectors=JSON.parse(gunzipSync(bytes)),seen=new Set();assert.equal(sha(bytes),report.vectorsSHA256);assert.equal(sha(await readFile(out+'/discovery.json')),report.discoverySHA256);assert.equal(vectors.length,report.vectors);counts[partition]={};
 for(const v of vectors){assert.ok(selected.has(v.deck)&&frozen.metadata.seeds[partition].includes(v.seed)&&frozen.metadata.policies.includes(v.policy));assert.ok((v.deck.startsWith('ulalek')?frozen.metadata.decisions:['conservative']).includes(v.decision));const key=[v.deck,v.seed,v.policy,v.decision].join('|');assert.ok(!seen.has(key));seen.add(key);counts[partition][v.status]=(counts[partition][v.status]||0)+1;
  assert.ok(v.conditionalModelOnly);if(v.status==='completed-t8'){assert.equal(v.endTurn,8);assert.ok(v.t8);assert.equal(v.lethalTurn,null);}else assert.equal(v.t8,null);
  if(v.status==='conditional-lethal')assert.ok(v.lethalTurn>=1&&v.lethalTurn<=8&&!v.modelLoss);if(v.status.endsWith('unknown'))assert.ok(v.unknownFrom>=1&&v.unknownFrom<=8);
  assert.equal(v.prefix.copyMana,2*v.prefix.paidCopies);assert.ok(v.prefix.copyMana<=v.prefix.actionMana);assert.ok(v.prefix.damage>=0);
  for(const [t,l]of Object.entries(v.landmarks))if(l.observed){assert.ok(v.endTurn>Number(t)||v.status==='completed-t8');assert.ok(!v.unknownFrom||v.unknownFrom>Number(t));}
 }
 for(const deck of frozen.decks)for(const decision of deck.slug.startsWith('ulalek')?frozen.metadata.decisions:['conservative'])for(const policy of frozen.metadata.policies)assert.equal(vectors.filter(v=>v.deck===deck.name&&v.decision===decision&&v.policy===policy).length,report.seeds.length);
 for(const d of frozen.decks.filter(d=>d.kind==='challenger')){const got=report.comparisons.find(r=>r.deck===d.name),expected=compareExecutionCohorts(vectors.filter(v=>v.deck===d.slug+'-original'),vectors.filter(v=>v.deck===d.name));assert.deepEqual(got,{deck:d.name,price:d.price,unused:d.unused,...expected});}
 for(const sample of report.samples){const raw=await readFile(out+'/'+sample.file);assert.equal(sha(raw),sample.sha256);const stored=JSON.parse(gunzipSync(raw)),[commander,...cards]=selected.get(sample.deck),run=stored.run,proof=auditGameplayTrace(run,commander,cards);assert.ok(proof.valid,JSON.stringify(proof));assert.deepEqual(proof,stored.audit);
  const pre=[],replayed=evaluateGameplay({commander,cards,seed:run.seed,policy:run.policy,mulligan:'none',order:commonIdentityOrder(cards,run.seed),nativeExecution:true,nativeStage5:true,nativeDecisionPolicy:'conservative',onPreAction:p=>pre.push(p)});assert.deepEqual(JSON.parse(JSON.stringify(replayed)),run);
  const vector=vectors.find(v=>v.deck===sample.deck&&v.seed===run.seed&&v.policy===run.policy&&v.decision==='conservative'),summary=summarizeExecution(run,{commander,cards,decision:'conservative',pre});assert.deepEqual(vector,{deck:sample.deck,...summary,followups:summary.followups.map(p=>({...p,hand:p.hand.map(h=>({card:h.card,status:h.status,reason:h.reason}))}))});traces++;
 }
 assert.equal(report.profile.audits,vectors.length);assert.equal(report.profile.replays,vectors.length);audits+=report.profile.audits;replays+=report.profile.replays;total+=vectors.length;allVectors.push(...vectors);
}
assert.equal(new Set(frozen.metadata.seeds.training.concat(frozen.metadata.seeds.holdout)).size,56);
const historical=JSON.parse(gunzipSync(await readFile('benchmarks/v12/stage5/vectors.json.gz')));assert.ok(allVectors.every(v=>!historical.some(h=>h.seed===v.seed)));
const result={auditorSHA256:sha(await readFile(new URL(import.meta.url))),exact100CardExports:exports,selectedPrintingChecks:printingChecks,challengerSafeguardAudits:safeguards,persistedVectors:total,inRunResourceZoneStackOutletAudits:audits,inRunDeterministicReplays:replays,representativeReceiptsReauditedAndReplayed:traces,terminalCounts:counts,pairedComparisonsRecomputed:12,allFixedPoliciesPresent:true,seedsDisjointFromStage5:true,cachesUnchanged:true,stage1Through5ArchivesUnchanged:true,productionSelectionAndLauncherUnchanged:true,runtimeMs:Math.round(performance.now()-started)};
await writeFile(out+'/independent-audit.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
