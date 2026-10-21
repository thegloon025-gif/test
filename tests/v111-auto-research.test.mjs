import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {chooseResearchDecks,autoResearchArchidekt, AUTO_RESEARCH_LIMITS,researchEvidence} from '../src/autoResearch.mjs';
import {loadCommunity,saveCommunity} from '../src/community.mjs';
import {discoverPublicDecks} from '../src/discovery.mjs';

const commander={id:'cmr',name:'Example Legend',type_line:'Legendary Creature — Eldrazi',color_identity:['W','U','B','R','G'],legalities:{commander:'legal'},prices:{eur:1}};
const catalog=[commander,...Array.from({length:190},(_,i)=>({id:'c'+i,name:'Card '+i,type_line:i%3===0?'Land':'Artifact',color_identity:[],legalities:{commander:'legal'},prices:{eur:0.5}}))];
const entries=id=>[{quantity:1,card:{oracleCard:{name:commander.name}},categories:['Commander']},...Array.from({length:99},(_,i)=>({quantity:1,card:{oracleCard:{name:'Card '+(i+id*3)%190}},categories:['Mainboard']}))];
const categories=[{name:'Commander',isPremier:true,includedInDeck:true},{name:'Mainboard',includedInDeck:true}];
const payload=(id,opts={})=>({id,name:'Community '+id,edhBracket:opts.bracket??3,owner:{username:opts.owner||'creator'+id},categories,cards:entries(id).map((e,i)=>i===0&&opts.wrongCommander?{...e,card:{oracleCard:{name:'Card 0'}}}:e)});
const source=(id,owner,ids=Array.from({length:99},(_,i)=>'c'+((i+id*3)%190)))=>({key:'archidekt:'+id,sourceId:String(id),owner,commanderIds:['cmr'],edhBracket:3,validated:true,mainboard:ids.map(id=>({id,quantity:1}))});

test('automatic selection protects creator variety, duplicates and evidence-limited prices',()=>{
 const d1=source(1,'a'),d2=source(2,'a'),d3=source(3,'b');
 const result=chooseResearchDecks([d1,d2,d3],[],{catalog,limit:2,budget:100});
 assert.equal(result.selected.length,2);
 assert.equal(new Set(result.selected.map(x=>x.deck.owner)).size,2);
 assert.ok(result.selected.every(x=>Number.isFinite(x.evidence.estimatedEur)));
 const clone=source(4,'c',d1.mainboard.map(x=>x.id));
 assert.equal(chooseResearchDecks([d1,clone],[],{catalog,limit:2}).selected.length,1);
 const tooFewLands={...d1,mainboard:d1.mainboard.slice(0,70)};
 assert.ok(researchEvidence(d1,catalog).relevance>researchEvidence(tooFewLands,catalog).relevance);
});

test('one-click research verifies commander + bracket, avoids saved IDs and stores diverse sources',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'co-auto-research-')),file=path.join(dir,'community.json');
 let searchCalls=0,fetches=[];
 const previews=Array.from({length:11},(_,i)=>({id:String(i+1),url:'https://archidekt.com/decks/'+(i+1)}));
 const search=async()=>{searchCalls++;return {previews,pagesSearched:2};};
 const fetchDeck=async id=>{fetches.push(Number(id));return payload(Number(id),{wrongCommander:Number(id)===1,bracket:Number(id)===2?4:3,owner:Number(id)>3?'author'+id:'test'});};
 try{
  const prior=source(12,'saved');await saveCommunity([prior],file);
  const a=await autoResearchArchidekt({commanderId:'cmr',commanderName:'Example Legend',bracket:3,budget:125,catalog,file,search,fetchDeck,minGapMs:0});
  assert.equal(a.examined,11);assert.equal(a.added.length,8);
  assert.ok(a.skipped.some(s=>s.reason.includes('Failed deck validation')));
  assert.ok(a.skipped.some(s=>s.reason.includes('Incorrect or missing declared bracket')));
  assert.equal(a.distinctCreators>=4,true);
  assert.equal((await loadCommunity(file)).length,9);
  const b=await autoResearchArchidekt({commanderId:'cmr',commanderName:'Example Legend',bracket:3,catalog,file,search,fetchDeck,minGapMs:0});
  assert.equal(searchCalls,2);
  assert.equal(b.added.length,1);
  assert.ok(b.alreadyStored>=8);
  assert.ok(!b.skipped.some(s=>s.reason.includes('rate limit')));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('automatic discovery stops on rate limits while retaining verified partial results',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'co-auto-limit-')),file=path.join(dir,'decks.json');
 try{
  const result=await autoResearchArchidekt({commanderId:'cmr',commanderName:'Example Legend',bracket:4,catalog,file,
   search:async()=>({previews:[{id:'10',url:'https://archidekt.com/decks/10'},{id:'11',url:'https://archidekt.com/decks/11'},{id:'12',url:'https://archidekt.com/decks/12'}],pagesSearched:1}),
   fetchDeck:async id=>id==='11'?Promise.reject(Error('Archidekt rate limit reached')):payload(Number(id),{bracket:4})});
  assert.equal(result.rateLimited,true);assert.equal(result.added.length,1);assert.equal((await loadCommunity(file)).length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('bounded auto search previews can exceed manual preview size but never more than 36',async()=>{
 const name='Unique Auto Fixture Command 111';
 const pages=[];
 const mock=async url=>{const page=Number(new URL(url).searchParams.get('page'));pages.push(page);return {status:200,ok:true,headers:new Map(),text:async()=>JSON.stringify({results:Array.from({length:20},(_,i)=>({id:30000+page*20+i,edhBracket:3,name:'B3 Deck '+i}))})};};
 const result=await discoverPublicDecks(name,{bracket:3,maxPreviews:36,fetcher:mock,minGapMs:0});
 assert.equal(result.previews.length,36);assert.deepEqual(pages,[1,2]);
 await assert.rejects(discoverPublicDecks(name,{bracket:3,maxPreviews:37,fetcher:mock,minGapMs:0}),/between 1 and 36/);
 assert.equal(AUTO_RESEARCH_LIMITS.maxDetails,24);
});
