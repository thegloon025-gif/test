import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,rm} from 'node:fs/promises';
import {discoverySearchUrl,normalizeSearchResults,discoverPublicDecks,importDiscoveredDecks} from '../src/discovery.mjs';
import {loadCommunity} from '../src/community.mjs';

const cmd={id:'cmd',name:'Aurelia, Test Captain',type_line:'Legendary Creature — Human',legalities:{commander:'legal'},color_identity:['W'],prices:{eur:'1'}};
const other={...cmd,id:'other',name:'Different Commander'};
const rest=Array.from({length:99},(_,i)=>({id:'sp'+i,name:`White Spell ${i}`,type_line:'Sorcery',legalities:{commander:'legal'},color_identity:['W']}));
const catalog=[cmd,other,...rest];
const fixture=(id,commanderName='Aurelia, Test Captain',size=99)=>({id:Number(id),name:`Deck ${id}`,owner:{username:'public_user'},categories:[{name:'Commander',isPremier:true,includedInDeck:true},{name:'Mainboard',includedInDeck:true}],cards:[{quantity:1,categories:['Commander'],card:{oracleCard:{name:commanderName}}},...rest.slice(0,size).map(c=>({quantity:1,categories:['Mainboard'],card:{oracleCard:{name:c.name}}}))]});
const response=data=>({status:200,ok:true,headers:new Map(),text:async()=>JSON.stringify(data)});

// Search source is Archidekt's undocumented deck-title listing. A card name in a
// title does not prove that it is the commander; import checks the actual deck.
test('bounded search URL uses one title filter and one page, not arbitrary URLs',()=>{
 const u=new URL(discoverySearchUrl(cmd.name));
 assert.equal(u.hostname,'archidekt.com');assert.equal(u.pathname,'/api/decks/v3/');
 assert.equal(u.searchParams.get('name'),cmd.name);assert.equal(u.searchParams.get('deckFormat'),'3');
 assert.equal(u.searchParams.get('page'),'1');assert.equal(u.searchParams.get('pageSize'),'20');
 assert.throws(()=>discoverySearchUrl(''),/Select a valid commander/);
});

test('search parser validates list, deduplicates IDs and caps previews',()=>{
 assert.throws(()=>normalizeSearchResults({}),/missing results/);
 const decks=Array.from({length:16},(_,i)=>({id:i+1,name:`Deck ${i}`,owner:{username:'brewer'}}));
 decks.push({id:1,name:'duplicate'}, {id:'../../etc',name:'bad'});
 const list=normalizeSearchResults({results:decks});
 assert.equal(list.length,12);assert.equal(list[0].url,'https://archidekt.com/decks/1');
 assert.equal(list[0].owner,'brewer');
});

test('search returns cached preview without re-contacting host; 429 fails closed',async()=>{
 let calls=0;
 const opts={minGapMs:0,fetcher:async(url,init)=>{calls++;assert.equal(init.redirect,'manual');return response({results:[{id:1138,name:'Aurelia commander'}]});}};
 const one=await discoverPublicDecks(cmd.name,opts);
 assert.equal(one.previews.length,1);assert.equal(one.fromCache,false);
 const two=await discoverPublicDecks(cmd.name,opts);
 assert.equal(two.fromCache,true);assert.equal(calls,1);
 await assert.rejects(discoverPublicDecks('Aurelia Limited',{minGapMs:0,fetcher:async()=>({status:429,ok:false,headers:new Map()})}),/rate limit/);
});

test('selected result batch imports only a real, validated matching commander and respects caching',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'commander-discover-'));const file=path.join(dir,'decks.json');
 try{
  const indexed=[{id:2201,name:'Aurelia 1'},{id:2202,name:'Aurelia wrong'},{id:2203,name:'Aurelia incomplete'}];
  const calls=[];
  const mock=async(url)=>{
   calls.push(url);const parsed=new URL(url);
   if(parsed.pathname==='/api/decks/v3/')return response({results:indexed});
   const id=Number(parsed.pathname.match(/decks\/(\d+)/)?.[1]);
   return response(fixture(id,id===2202?other.name:cmd.name,id===2203?97:99));
  };
  await discoverPublicDecks(cmd.name,{minGapMs:0,fetcher:mock,forceRefresh:true});
  const result=await importDiscoveredDecks({commanderId:'cmd',commanderName:cmd.name,ids:['2201','2202','2203'],catalog,file,minGapMs:0,fetcher:mock});
  assert.equal(result.importedCount,1);assert.equal(result.skipped.length,2);
  assert.match(result.skipped.find(d=>d.id==='2202').reason,/Different commander/);
  assert.match(result.skipped.find(d=>d.id==='2203').reason,/Deck failed validation/);
  const stored=await loadCommunity(file);assert.equal(stored.length,1);assert.equal(stored[0].totalCards,100);
  const second=await importDiscoveredDecks({commanderId:'cmd',commanderName:cmd.name,ids:['2201'],catalog,file,minGapMs:0,fetcher:mock});
  assert.equal(second.importedCount,0);assert.match(second.skipped[0].reason,/Already imported/);
  await assert.rejects(importDiscoveredDecks({commanderId:'cmd',commanderName:cmd.name,ids:['9999'],catalog,file,minGapMs:0,fetcher:mock}),/current search preview/);
  await assert.rejects(importDiscoveredDecks({commanderId:'cmd',commanderName:cmd.name,ids:['2201','2201'],catalog,file,minGapMs:0,fetcher:mock}),/unique/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('bracket-specific previews trust creator-declared edhBracket, not title hints',()=>{
 const candidates=[
  {id:1001,name:'Ulalek B3 in title but declared B4',edhBracket:4},
  {id:1002,name:'Eldrazi strategy',edhBracket:3},
  {id:1003,name:'Ulalek Bracket 3 no metadata',edhBracket:null},
  {id:1004,name:'Another Ulalek',edhBracket:2},
 ];
 const b3=normalizeSearchResults({results:candidates},{bracket:3});
 assert.deepEqual(b3.map(d=>d.id),['1002']);
 assert.equal(b3[0].edhBracket,3);
 assert.equal(normalizeSearchResults({results:candidates},{bracket:4})[0].id,'1001');
 assert.equal(normalizeSearchResults({results:candidates}).length,4);
 assert.throws(()=>normalizeSearchResults({results:candidates},{bracket:7}),/Choose bracket/);
 assert.throws(()=>discoverySearchUrl('Ulalek',{page:4}),/bounded/);
});

test('bracket search checks at most three pages and separates cached B3/B4 results',async()=>{
 const name='Test Commander Named Beta';
 const requests=[];
 const mock=async url=>{
  const u=new URL(url), page=Number(u.searchParams.get('page'));
  requests.push(page);
  // Ensure full pages so the bounded three-page search is tested.
  const results=Array.from({length:20},(_,idx)=>({id:page*1000+idx+1,name:`Deck ${page}/${idx}`,edhBracket:(idx%2===0?3:4)}));
  return response({results});
 };
 const b3=await discoverPublicDecks(name,{bracket:3,fetcher:mock,minGapMs:0});
 assert.equal(b3.previews.length,12);
 assert.ok(b3.previews.every(d=>d.edhBracket===3));
 assert.deepEqual(requests,[1,2]);
 const again=await discoverPublicDecks(name,{bracket:3,fetcher:mock,minGapMs:0});
 assert.equal(again.fromCache,true);assert.deepEqual(requests,[1,2]);
 const b4=await discoverPublicDecks(name,{bracket:4,fetcher:mock,minGapMs:0});
 assert.equal(b4.previews.length,12);
 assert.ok(b4.previews.every(d=>d.edhBracket===4));
 assert.deepEqual(requests,[1,2,1,2]);
});

test('detail bracket is reverified on import; mismatched metadata cannot enter B3 cohort',async()=>{
 const name='Search Captain Gamma';
 const id='53453';
 const dir=await mkdtemp(path.join(os.tmpdir(),'commander-b3-'));const file=path.join(dir,'saved.json');
 const mock=async(url)=>{
  if(new URL(url).pathname.endsWith('/v3/'))return response({results:[{id:Number(id),name:'B3 deck',edhBracket:3}]});
  return response({...fixture(id),edhBracket:4});
 };
 try{
  await discoverPublicDecks(name,{bracket:3,fetcher:mock,minGapMs:0,forceRefresh:true});
  const result=await importDiscoveredDecks({commanderId:'cmd',commanderName:name,bracket:3,ids:[id],catalog,file,fetcher:mock,minGapMs:0});
  assert.equal(result.importedCount,0);
  assert.match(result.skipped[0].reason,/not Bracket 3/);
  assert.equal((await loadCommunity(file)).length,0);
  await assert.rejects(importDiscoveredDecks({commanderId:'cmd',commanderName:name,bracket:4,ids:[id],catalog,file,fetcher:mock,minGapMs:0}),/Search for public decks first/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
