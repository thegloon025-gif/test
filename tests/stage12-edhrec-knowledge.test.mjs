import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
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
 assert.equal(data.distinctCards[0].stats.inclusionFraction,0.75);
 assert.equal(data.distinctCards[0].stats.synergy,0.24);
 assert.deepEqual(data.distinctCards[0].categories,['High Synergy Cards','Top Cards']);
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
  assert.equal(out.topCards[0].name,'Gravecrawler');
  assert.equal(out.topCards[0].synergy,0.24);
  const persisted=JSON.parse(await readFile(result.file,'utf8'));
  assert.equal(persisted.source,'EDHREC user-supplied snapshot');
 }finally{await rm(dir,{recursive:true,force:true});}
});
