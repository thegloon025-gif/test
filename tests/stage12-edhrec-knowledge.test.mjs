import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseEdhrecCommanderJson,importEdhrecCommanderJson,readEdhrecCommanderJson,edhrecCachePath} from '../src/edhrecKnowledge.mjs';

const commander='Wilhelt, the Rotcleaver';
const fixture={container:{json_dict:{card:{name:commander},cardlists:[
 {header:'High Synergy Cards',tag:'synergy',cardviews:[
  {name:'Gravecrawler',num_decks:75,potential_decks:100,synergy:0.24,inclusion:75},
  {name:'Cryptbreaker',num_decks:40,potential_decks:100,synergy:0.21},
  {name:commander,num_decks:100,potential_decks:100,synergy:1}]},
 {header:'Top Cards',tag:'topcards',cardviews:[
  {name:'Gravecrawler',num_decks:90,potential_decks:100,synergy:0.11},
  {name:'Relentless Dead',num_decks:12,potential_decks:0,synergy:null}]}]}}};

test('category cards are not double counted; num_decks is not automatically a percentage',()=>{
 const data=parseEdhrecCommanderJson(fixture,{commanderName:commander});
 assert.equal(data.cardCount,3);
 const grave=data.distinctCards.find(c=>c.name==='Gravecrawler');
 assert.equal(grave.stats,null);assert.equal(grave.conflictingStatistics,true);
 assert.deepEqual(grave.observations.map(v=>v.inclusionFraction),[0.75,0.9]);
 assert.deepEqual(grave.categories,['High Synergy Cards','Top Cards']);
 assert.equal(data.distinctCards[2].stats.inclusionFraction,null);
 assert.equal(data.omittedEntries,1);
});
test('reject wrong commander, malformed input and empty recommendations',()=>{
 assert.throws(()=>parseEdhrecCommanderJson(fixture,{commanderName:'Ulalek, Fused Atrocity'}),/Different commander/);
 assert.throws(()=>parseEdhrecCommanderJson({}, {commanderName:commander}),/identity/);
 assert.throws(()=>parseEdhrecCommanderJson({container:{json_dict:{card:{name:commander},cardlists:[{cardviews:[]}]}}},{commanderName:commander}),/no recognizable/);
});
test('bounded local import, safe commander identity cache and advisory-only report',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'co-stage12-'));
 try{
  const absent=await readEdhrecCommanderJson({commanderName:commander,directory:dir});
  assert.equal(absent.status,'not-imported');
  const result=await importEdhrecCommanderJson({commanderName:commander,payload:fixture,directory:dir,now:()=>new Date('2026-10-24T00:00:00Z').toISOString()});
  assert.equal(result.file,edhrecCachePath(commander,{directory:dir}));
  assert.equal(result.saved.provenance.source,'EDHREC-style user-provided file');
  assert.ok(!result.file.includes('Wilhelt'));
  const out=await readEdhrecCommanderJson({commanderName:commander,directory:dir,now:()=>Date.parse('2026-10-25T12:00:00Z')});
  assert.equal(out.status,'local-import');
  assert.equal(out.ageHours,36);
  assert.equal(out.cardCount,3);
  assert.equal(out.topCards[0].name,'Cryptbreaker');
  assert.equal(out.topCards.find(c=>c.name==='Gravecrawler').synergy,null);
  assert.equal(out.sourceRetrievedAt,null);assert.match(out.exampleOrdering,/not recommendation/);
  const persisted=JSON.parse(await readFile(result.file,'utf8'));
  assert.equal(persisted.source,'EDHREC user-supplied snapshot');
 }finally{await rm(dir,{recursive:true,force:true});}
});


test('round trips revalidate observations instead of trusting persisted derived recommendations',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'co stage12 spaces '));
 try{
  const {file,saved}=await importEdhrecCommanderJson({commanderName:commander,payload:fixture,directory,retrievedAt:'2026-10-01',now:()=> '2026-10-24'});
  saved.distinctCards[0]={name:'Forged top suggestion',stats:{synergy:1}};
  await writeFile(file,JSON.stringify(saved));
  const out=await readEdhrecCommanderJson({commanderName:commander,directory,now:()=>Date.parse('2026-10-25')});
  assert.ok(!out.topCards.some(c=>c.name==='Forged top suggestion'));
  assert.equal(out.sourceAgeHours,576);assert.equal(out.ageHours,24);
  for(const raw of ['{',JSON.stringify({...saved,commanderName:'Wrong commander'}),JSON.stringify({...saved,importedAt:'nonsense'}),' '.repeat(3_000_001)]){
   await writeFile(file,raw);await assert.rejects(readEdhrecCommanderJson({commanderName:commander,directory}));
  }
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('missing, invalid numeric values and category ordering never create a merged ranked cohort',()=>{
 const f=structuredClone(fixture);f.container.json_dict.cardlists.reverse();
 const a=parseEdhrecCommanderJson(f,{commanderName:commander});
 assert.deepEqual(a.distinctCards.map(c=>c.name),['Cryptbreaker','Gravecrawler','Relentless Dead']);
 assert.equal(a.distinctCards[1].stats,null);
 f.container.json_dict.cardlists=[{cardviews:[{name:'A',num_decks:'75',potential_decks:100,synergy:Infinity},{name:'B',num_decks:101,potential_decks:100,synergy:2},{name:'C',num_decks:-1,potential_decks:0,synergy:NaN}]}];
 const cards=parseEdhrecCommanderJson(f,{commanderName:commander}).distinctCards;
 assert.ok(cards.every(c=>c.stats.inclusionFraction===null&&c.stats.synergy===null));
 assert.throws(()=>edhrecCachePath('x'.repeat(161)),/Invalid/);
});
test('atomic concurrent imports preserve complete readable files and remove temporary files',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'co-stage12-atomic-'));
 try{
  await Promise.all(Array.from({length:8},()=>importEdhrecCommanderJson({commanderName:commander,payload:fixture,directory})));
  assert.equal((await readEdhrecCommanderJson({commanderName:commander,directory})).cardCount,3);
  assert.equal((await readdir(directory)).length,1);
  const bad=path.join(directory,'not a directory');await writeFile(bad,'keep');
  await assert.rejects(importEdhrecCommanderJson({commanderName:commander,payload:fixture,directory:bad}));
  assert.equal(await readFile(bad,'utf8'),'keep');
  await assert.rejects(importEdhrecCommanderJson({commanderName:commander,payload:fixture,directory,retrievedAt:'2099-01-01'}),/retrieval/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
