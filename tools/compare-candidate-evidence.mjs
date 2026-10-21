/** Replay selection over the exact completed candidates from a saved benchmark.
 * node tools/compare-candidate-evidence.mjs CODE_ROOT CACHE_DIR RESULTS_JSON OUTPUT_JSON
 * Reads caches only. Useful to isolate selection from construction changes. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [root,cache,input,output]=process.argv.slice(2);
if(!output)throw Error('Supply CODE_ROOT CACHE_DIR RESULTS_JSON OUTPUT_JSON');
const {investmentEvidence,dominatesEvidence,dominatesCandidateEvidence,selectInvestmentDeck}=await import(pathToFileURL(root+'/src/packageInvestment.mjs'));
const {strategyScore}=await import(pathToFileURL(root+'/src/strategyFirst.mjs'));
const {planFor}=await import(pathToFileURL(root+'/src/mechanics.mjs'));
const {priceOf,castFaces}=await import(pathToFileURL(root+'/src/cards.mjs'));
const {validateCommanderSingleton}=await import(pathToFileURL(root+'/src/deckValidation.mjs'));
const raw=await readFile(cache+'/cards.json','utf8'),catalog=JSON.parse(raw),byName=new Map(catalog.map(c=>[c.name,c]));
const reports=[];
for(const row of JSON.parse(await readFile(input))){
 const commander=byName.get(row.name),plan=planFor(commander);
 const decks=row.engine.candidates.filter(c=>c.status==='ok').map(candidate=>{
  const mode=candidate.packageInvestment?.originPath||candidate.investment.searchMode;
  const path=candidate.investment.candidates.find(p=>p.mode===mode);
  const names=[...(path?.diagnostics?.deck||candidate.investment.diagnostics.deck)];
  for(const change of candidate.packageInvestment?.accepted||[]){for(const name of change.cuts){const i=names.indexOf(name);assert.ok(i>=0);names.splice(i,1);}names.push(...change.adds);}
  const cards=names.map(name=>byName.get(name));assert.ok(cards.every(Boolean));assert.equal(cards.length,99);
  assert.ok(validateCommanderSingleton(commander,cards).valid);
  const price=priceOf(commander)+cards.reduce((n,c)=>n+priceOf(c),0);
  assert.ok(Math.abs(price-candidate.price)<.005,`${candidate.id}: reconstructed price differs`);
  const protection=candidate.packageInvestment;
  const pathProtection=protection?candidate.investment.candidates.map(path=>{
   const pathCards=path.diagnostics.deck.map(name=>byName.get(name));const e=investmentEvidence(pathCards,commander,plan);
   const deficits=Object.entries(protection.protectedInput.vector).filter(([key,n])=>e.vector[key]<n).map(([key,n])=>({field:key,required:n,actual:e.vector[key]}));
   for(const [role,n] of Object.entries(protection.strategyFloors||{}))if((e.raw.strategyRoles[role]||0)<n)deficits.push({field:'role:'+role,required:n,actual:e.raw.strategyRoles[role]||0});
   if(plan.needsColorless||(candidate.investment.candidates.find(p=>p.mode==='unchanged')?.diagnostics.deck||names).some(name=>castFaces(byName.get(name)).some(f=>/\{C\}/.test(f.mana_cost||byName.get(name).mana_cost||'')))){
    if(e.raw.trueColorless<protection.protectedInput.raw.trueColorless)deficits.push({field:'raw.trueColorless',required:protection.protectedInput.raw.trueColorless,actual:e.raw.trueColorless});
    if(e.land.realColorless<protection.protectedInput.land.realColorless)deficits.push({field:'land.realColorless',required:protection.protectedInput.land.realColorless,actual:e.land.realColorless});
   }
   return {mode:path.mode,price:path.price,protectedInputSatisfied:deficits.length===0,deficits};
  }):undefined;
  return {strategy:candidate.id,cards,price:candidate.price,evidence:investmentEvidence(cards,commander,plan),pathProtection};
 });
 const evidenceFor=cards=>decks.find(d=>d.cards===cards).evidence;
 const winner=selectInvestmentDeck(decks,{commander,plan,score:cards=>strategyScore(cards,commander,plan).value,evidenceFor});
 reports.push({commander:row.name,bracket:row.bracket,catalogSHA256:createHash('sha256').update(raw).digest('hex'),originalSelected:row.engine.selected,replayedSelected:winner.strategy,
  candidates:decks.map(d=>({id:d.strategy,price:d.price,pathProtection:d.pathProtection,score:strategyScore(d.cards,commander,plan).value,vector:d.evidence.vector,
   infrastructure:d.evidence.infrastructure?.map(({card,kind,units,support})=>({card,kind,units,support})),
   drawEngines:d.evidence.drawEngines?.map(({card,trigger,topAccess,independent,support})=>({card,trigger,topAccess,independent,support})),
   dominatedBy:decks.filter(x=>x!==d&&(dominatesCandidateEvidence||dominatesEvidence)(x.evidence,d.evidence)).map(x=>x.strategy),cards:d.cards.map(c=>c.name)}))});
}
await writeFile(output,JSON.stringify(reports,null,2)+'\n');
console.log(reports.map(r=>({commander:r.commander,original:r.originalSelected,replayed:r.replayedSelected})));
