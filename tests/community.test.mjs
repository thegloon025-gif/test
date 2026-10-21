import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {parseArchidektUrl,normalizeArchidektDeck,importPublicDeck,communityInsights,clusterDecks,fetchArchidektDeck} from '../src/community.mjs';

const card=(name,id,type_line='Creature',ci=['W'])=>({id,name,type_line,legalities:{commander:'legal'},color_identity:ci});
const commander=card('Test Captain','cmd','Legendary Creature — Human Soldier');
const catalog=[commander,...Array.from({length:100},(_,i)=>card(`Spell ${String(i).padStart(3,'0')}`,`sp${i}`)),card('Side Card','side'),card('Mystery Card','may')];
function entry(name,category='Mainboard',qty=1){return {quantity:qty,card:{oracleCard:{name}},categories:[category]};}
function payload(id=135){return {id,name:'Realistic user brew',owner:{username:'somebrewer'},categories:[{name:'Commander',isPremier:true,includedInDeck:true},{name:'Mainboard',includedInDeck:true},{name:'Maybeboard',includedInDeck:false},{name:'Sideboard',includedInDeck:false}],cards:[entry('Test Captain','Commander'),...Array.from({length:99},(_,i)=>entry(`Spell ${String(i).padStart(3,'0')}`)),entry('Mystery Card','Maybeboard'),entry('Side Card','Sideboard')]};}

test('Archidekt deck ID parser accepts only fixed, public HTTPS origin',()=>{
 assert.deepEqual(parseArchidektUrl('https://archidekt.com/decks/135/example?tab=1'),{id:'135',url:'https://archidekt.com/decks/135'});
 assert.deepEqual(parseArchidektUrl('https://www.archidekt.com/api/decks/135/'),{id:'135',url:'https://archidekt.com/decks/135'});
 for(const bad of ['http://archidekt.com/decks/135','https://archidekt.com.evil.com/decks/135','https://localhost/decks/135','https://archidekt.com/api/decks/v3/','https://archidekt.com/decks/1@x','file:///etc/passwd'])assert.throws(()=>parseArchidektUrl(bad));
});
test('normalize commander, 99 mainboard, exclude sideboard and maybeboard',()=>{
 const normalized=normalizeArchidektDeck(payload(),'https://archidekt.com/decks/135/',catalog);
 assert.equal(normalized.validated,true,JSON.stringify(normalized.issues));
 assert.equal(normalized.totalCards,100);
 assert.deepEqual(normalized.commanderIds,['cmd']);
 assert.equal(normalized.mainboard.length,99);
 assert.equal(normalized.excludedCount,2);
 assert.equal(normalized.mainboard.some(c=>c.id==='may'||c.id==='side'),false);
 assert.equal(normalized.owner,'somebrewer');
});
test('incomplete/unmatched cards do not silently become valid community statistics',()=>{
 const x=payload();x.cards=x.cards.filter(e=>e.card.oracleCard.name!=='Spell 001');x.cards.push(entry('Madeup Card'));
 const normalized=normalizeArchidektDeck(x,'https://archidekt.com/decks/135',catalog);
 assert.equal(normalized.validated,false);assert.equal(normalized.unmatched.length,1);assert.ok(normalized.issues.some(s=>s.includes('expected 100')));
 assert.equal(communityInsights([normalized],{commanderId:'cmd'}).sampleSize,0);
});
test('archidekt safe rate-limit/404 handling, no automatic redirects',async()=>{
 await assert.rejects(fetchArchidektDeck('999',{minGapMs:0,fetcher:async(url,options)=>{
  assert.equal(url,'https://archidekt.com/api/decks/999/');assert.equal(options.redirect,'manual');return {status:404,ok:false,headers:new Map()};
 }}),/not public/);
 await assert.rejects(fetchArchidektDeck('999',{minGapMs:0,fetcher:async()=>({status:429,ok:false,headers:new Map()})}),/rate limit/);
});
test('user-chosen read-only fetch persists local file and cached second import',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'commander-community-'));
 const file=path.join(dir,'community.json');let calls=0;
 try{
  const opts={file,catalog,fetcher:async()=>{calls++;return {status:200,ok:true,headers:new Map(),text:async()=>JSON.stringify(payload())};}};
  const first=await importPublicDeck('https://archidekt.com/decks/135/title',opts);
  assert.equal(first.deck.validated,true);assert.equal(calls,1);
  const second=await importPublicDeck('https://archidekt.com/decks/135/title',opts);
  assert.equal(second.fromCache,true);assert.equal(calls,1);
  const doc=JSON.parse(await readFile(file,'utf8'));assert.equal(doc.decks.length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
const d=(key,ids)=>({key,validated:true,commanderIds:['atraxa'],mainboard:ids.map(id=>({id,quantity:1}))});
test('co-occurrence is per deck, not quantities, and separates distinct themes',()=>{
 const sample=[
  d('poison1',['Sol Ring','Command Tower','Poison A','Poison B','Poison C','Poison D']),
  d('poison2',['Sol Ring','Command Tower','Poison A','Poison B','Poison C','Poison E']),
  d('poison3',['Sol Ring','Command Tower','Poison A','Poison B','Poison D','Poison E']),
  d('counter1',['Sol Ring','Command Tower','Counter A','Counter B','Counter C','Counter D']),
  d('counter2',['Sol Ring','Command Tower','Counter A','Counter B','Counter C','Counter E']),
  d('counter3',['Sol Ring','Command Tower','Counter A','Counter B','Counter D','Counter E']),
 ];
 const insights=communityInsights(sample,{commanderId:'atraxa'});
 assert.equal(insights.sampleSize,6);assert.equal(insights.reliable,true);
 assert.equal(insights.inclusion.find(x=>x.id==='Poison A').count,3);
 assert.equal(insights.pairings.find(x=>x.a==='Poison A'&&x.b==='Poison B')?.count,3);
 assert.equal(insights.archetypes.length,2);
 assert.deepEqual(insights.archetypes.map(x=>x.size),[3,3]);
 // Shared staples do not merge the two incompatible strategy groups.
 assert.equal(insights.archetypes[0].signature.some(x=>x.id==='Sol Ring'),false);
});
test('small samples flagged as exploratory, other commanders excluded',()=>{
 const result=communityInsights([d('one',['a','b']),d('two',['a','c']),{...d('bad',['a','b']),key:'bad',validated:false}],{commanderId:'atraxa'});
 assert.equal(result.sampleSize,2);assert.equal(result.reliable,false);assert.match(result.warning,/Need at least 3/);
 const separate=communityInsights([d('one',['a','b'])],{commanderId:'wilhelt'});assert.equal(separate.sampleSize,0);
});
test('throws on changed or malformed Archidekt response instead of inventing matches',()=>{
 assert.throws(()=>normalizeArchidektDeck({},'https://archidekt.com/decks/135',catalog),/deck card list/);
 assert.throws(()=>normalizeArchidektDeck(payload(),'https://archidekt.com/decks/136',catalog),/different deck ID/);
});


test('included primary category is not displaced by a secondary out-of-deck label',()=>{
 const x=payload(135);
 // Real Archidekt decks can tag included cards with additional non-deck categories.
 // The first category is the primary placement.
 for(let i=1;i<=4;i++)x.cards[i].categories=['Mainboard','Maybeboard'];
 const normalized=normalizeArchidektDeck(x,'https://archidekt.com/decks/135/test',catalog);
 assert.equal(normalized.totalCards,100);
 assert.equal(normalized.sourceIncludedCards,100);
 assert.equal(normalized.validated,true,JSON.stringify(normalized.issues));
 assert.equal(normalized.unmatched.length,0);
});

test('user-defined Tokens category is part of the deck when Archidekt marks it included',()=>{
 const x=payload(135);
 x.categories.push({name:'Tokens',includedInDeck:true});
 const named=['Chittering Dispatcher','Glaring Fleshraker','Writhing Chrysalis','Spawn-Gang Commander'];
 const additional=named.map((name,i)=>card(name,'eldrazi'+i,'Creature — Eldrazi',['W']));
 for(let i=0;i<4;i++)x.cards[i+1]=entry(named[i],'Tokens');
 const result=normalizeArchidektDeck(x,'https://archidekt.com/decks/135/test',[...catalog,...additional]);
 assert.equal(result.sourceIncludedCards,100);
 assert.equal(result.totalCards,100);
 assert.equal(result.excludedCount,2); // only true sideboard and maybeboard
 assert.equal(result.validated,true,JSON.stringify(result.issues));
 for(const c of additional)assert.ok(result.mainboard.some(x=>x.id===c.id),c.name);
});

test('explicit category inclusion wins over misleading user-defined zone-like name',()=>{
 const x=payload(135);
 x.categories.push({name:'Tokens',includedInDeck:false});
 x.cards[1]=entry('Spell 000','Tokens');
 const rejected=normalizeArchidektDeck(x,'https://archidekt.com/decks/135/test',catalog);
 assert.equal(rejected.totalCards,99);
 assert.ok(rejected.excluded.some(x=>x.name==='Spell 000'));
 x.categories[x.categories.length-1].includedInDeck=true;
 const accepted=normalizeArchidektDeck(x,'https://archidekt.com/decks/135/test',catalog);
 assert.equal(accepted.totalCards,100);
 assert.equal(accepted.validated,true,JSON.stringify(accepted.issues));
});

test('unknown sideboard-like category without inclusion metadata remains excluded',()=>{
 const x=payload(135);
 x.categories.push({name:'Tokens'});
 x.cards[1]=entry('Spell 000','Tokens');
 const result=normalizeArchidektDeck(x,'https://archidekt.com/decks/135/test',catalog);
 assert.equal(result.totalCards,99);
 assert.ok(result.excluded.some(x=>x.name==='Spell 000'));
});

test('unmatched card diagnostics identify name, quantity, and primary category',()=>{
 const x=payload(135);x.cards[6]=entry('Unknown Real Printing','Mainboard',1);
 const normalized=normalizeArchidektDeck(x,'https://archidekt.com/decks/135/test',catalog);
 assert.equal(normalized.sourceIncludedCards,100);
 assert.equal(normalized.totalCards,99);
 assert.equal(normalized.unmatched.length,1);
 assert.equal(normalized.unmatched[0].name,'Unknown Real Printing');
 assert.equal(normalized.unmatched[0].primary,'Mainboard');
});

test('explicit recheck bypasses 24-hour import cache and updates stored entry',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'commander-recheck-'));
 const file=path.join(dir,'community.json');let calls=0;
 try{
  const opts={file,catalog,fetcher:async()=>{calls++;const x=payload();if(calls===1)x.cards=x.cards.slice(0,-5);return {status:200,ok:true,headers:new Map(),text:async()=>JSON.stringify(x)};}};
  const first=await importPublicDeck('https://archidekt.com/decks/135/test',opts);
  assert.equal(first.deck.validated,false);
  const cached=await importPublicDeck('https://archidekt.com/decks/135/test',opts);
  assert.equal(cached.fromCache,true);assert.equal(calls,1);
  const updated=await importPublicDeck('https://archidekt.com/decks/135/test',{...opts,forceRefresh:true});
  assert.equal(updated.fromCache,false);assert.equal(calls,2);
  assert.equal(updated.deck.validated,true);assert.equal(updated.deck.totalCards,100);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('community insight samples do not mix B3, B4 and unlabeled imported decks',()=>{
 const p3={...payload(135),edhBracket:3};
 const p4={...payload(136),edhBracket:4};
 const px=payload(137);
 const decks=[p3,p4,px].map(p=>normalizeArchidektDeck(p,`https://archidekt.com/decks/${p.id}`,catalog));
 assert.deepEqual(decks.map(d=>d.edhBracket),[3,4,null]);
 assert.equal(communityInsights(decks,{commanderId:'cmd'}).sampleSize,3);
 assert.equal(communityInsights(decks,{commanderId:'cmd',bracket:3}).sampleSize,1);
 assert.equal(communityInsights(decks,{commanderId:'cmd',bracket:4}).sampleSize,1);
 assert.throws(()=>communityInsights(decks,{commanderId:'cmd',bracket:7}),/Invalid community bracket/);
});
