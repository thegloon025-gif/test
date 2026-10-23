import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {commanderVariantQuery,parseCommanderVariants,lookupCommanderVariants} from '../src/commanderComboResearch.mjs';
import {researchForGeneration} from '../src/researchFlow.mjs';
import {autoResearchArchidekt} from '../src/autoResearch.mjs';
import {saveCommunity} from '../src/community.mjs';

const variant=(id,commander)=>({id,uses:[{card:{name:commander}},{card:{name:"Ashnod's Altar"}}],results:[{name:'Infinite mana'}],legalities:{commander:'legal'}});
const fakeResponse=(results,count=results.length)=>({ok:true,status:200,headers:new Map(),text:async()=>JSON.stringify({count,results})});

test('safe exact commander Spellbook search and strict commander identity',()=>{
 assert.equal(commanderVariantQuery('Wilhelt, the Rotcleaver'),'card="Wilhelt, the Rotcleaver" legal:commander');
 assert.match(commanderVariantQuery('Henzie "Toolbox" Torre'),/\\"Toolbox\\"/);
 assert.throws(()=>commanderVariantQuery('bad\nname'),/valid commander/);
 const variants=parseCommanderVariants({count:2,results:[variant('111-22','Wilhelt, the Rotcleaver'),variant('222-33','Other Commander')]},'Wilhelt, the Rotcleaver');
 assert.deepEqual(variants.variants.map(v=>v.id),['111-22']);
 assert.throws(()=>parseCommanderVariants({results:0},'Wilhelt'),/changed response shape/);
});

test('bounded on-demand Spellbook GET is cached per commander and does not requery',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'co-stage10-')),seen=[];
 try{
  let now=2000000000;
  const fetcher=async url=>{seen.push(new URL(url));return fakeResponse([variant('111-22','Wilhelt, the Rotcleaver')]);};
  const req={commanderId:'wilhelt-oracle',commanderName:'Wilhelt, the Rotcleaver',cacheDir:dir,fetcher,minGapMs:0,now:()=>now};
  const first=await lookupCommanderVariants(req);
  assert.equal(first.fromCache,false);assert.equal(first.variants.length,1);assert.equal(seen.length,1);
  assert.equal(seen[0].searchParams.get('q'),commanderVariantQuery(req.commanderName));
  now+=1000;
  const second=await lookupCommanderVariants(req);
  assert.equal(second.fromCache,true);assert.equal(second.variants[0].id,'111-22');assert.equal(seen.length,1);
  const other=await lookupCommanderVariants({...req,commanderId:'other',commanderName:'Other Commander',fetcher:async()=>fakeResponse([variant('555-66','Other Commander')])});
  assert.equal(other.variants[0].id,'555-66');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Spellbook errors are unknown, not successful empty combo lists',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'co-stage10-error-'));
 try{
  await assert.rejects(lookupCommanderVariants({commanderId:'x',commanderName:'X',cacheDir:dir,minGapMs:0,fetcher:async()=>({status:429,ok:false})}),/rate limited/);
  await assert.rejects(lookupCommanderVariants({commanderId:'x',commanderName:'X',cacheDir:dir,minGapMs:0,fetcher:async()=>fakeResponse('invalid')}),/changed response shape/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('independent Spellbook lookup runs for commanders with zero Archidekt matches',async()=>{
 const calls=[];
 const args={commanderId:'cmr',commanderName:'Example Legend',bracket:3,budget:191,catalog:[],savedCommunity:[],
  discover:async()=>{calls.push('Archidekt');throw Error('Archidekt offline');},
  lookup:async()=>{calls.push('Spellbook');return {variants:[{id:'111-22'}],total:1,truncated:false,fromCache:false,pages:1};},
  record:async(_,response)=>{calls.push('save');assert.equal(response.near.length,1);},
  analyze:async()=>{throw Error('No source to inspect');}};
 const r=await researchForGeneration(args);
 assert.deepEqual(calls,['Archidekt','Spellbook','save']);
 assert.equal(r.report.discovery.status,'unavailable');
 assert.equal(r.report.commanderLookup.status,'checked');
 assert.equal(r.report.combos.status,'no-source');
 const failed=await researchForGeneration({...args,lookup:async()=>{throw Error('Spellbook offline');}});
 assert.equal(failed.report.commanderLookup.status,'unavailable');
});

test('bounded comma-shortened Archidekt fallback still validates actual commander and B3',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'co-stage10-arch-')),file=path.join(dir,'community.json');
 const commander={id:'cmr',name:'Wilhelt, the Rotcleaver',type_line:'Legendary Creature',color_identity:['U','B'],legalities:{commander:'legal'}};
 const catalog=[commander,...Array.from({length:99},(_,i)=>({id:'x'+i,name:'Card '+i,type_line:'Creature',color_identity:[],legalities:{commander:'legal'},prices:{eur:0.5}}))];
 const payload={id:11,name:'Zombie Power',edhBracket:3,owner:{username:'Player'},
  categories:[{name:'Commander',isPremier:true,includedInDeck:true},{name:'Mainboard',includedInDeck:true}],
  cards:[{quantity:1,card:{oracleCard:{name:commander.name}},categories:['Commander']},...Array.from({length:99},(_,i)=>({quantity:1,card:{oracleCard:{name:'Card '+i}},categories:['Mainboard']}))]};
 const seen=[];
 try{
  await saveCommunity([],file);
  const r=await autoResearchArchidekt({commanderId:'cmr',commanderName:commander.name,bracket:3,catalog,file,minGapMs:0,
   search:async name=>{seen.push(name);return {previews:name==='Wilhelt'?[{id:'11',url:'https://archidekt.com/decks/11'}]:[],pagesSearched:1};},
   fetchDeck:async()=>payload});
  assert.deepEqual(seen,['Wilhelt, the Rotcleaver','Wilhelt']);
  assert.equal(r.examined,1);assert.equal(r.added.length,1);
  assert.deepEqual(r.searchedNames,seen);
 }finally{await rm(dir,{recursive:true,force:true});}
});
