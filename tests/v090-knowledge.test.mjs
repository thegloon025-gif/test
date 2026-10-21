import test from 'node:test';
import assert from 'node:assert/strict';
import {independentCommunityDecks,wilsonInterval,communityClusters,analyzeCommunityKnowledge} from '../src/communityKnowledge.mjs';
import {discoverPublicDecks,importDiscoveredDecks} from '../src/discovery.mjs';

const deck=(key,commander,bracket,ids,owner)=>({key,source:'Archidekt',sourceId:key.replace(/\D/g,''),validated:true,commanderIds:[commander],edhBracket:bracket,
 owner,title:key,url:'https://archidekt.com/decks/123',importedAt:'2026-10-20T00:00:00Z',mainboard:ids.map(id=>({id,quantity:1}))});

test('uncertainty is explicit even when every observed deck includes a card',()=>{
 assert.deepEqual(wilsonInterval(0,0),{lower:0,upper:1});
 assert.ok(wilsonInterval(3,3).lower<0.5);
 assert.ok(wilsonInterval(9,10).lower<0.9);
});

test('deduplication removes repeated source keys and same-bracket copied 99-card lists',()=>{
 const cards=Array.from({length:99},(_,i)=>'c'+i);
 const a=deck('archidekt:1','cmd',3,cards,'a'),b=deck('archidekt:2','cmd',3,[...cards.slice(0,98),'other'],'b');
 const repeated={...a}, differentBracket=deck('archidekt:3','cmd',4,cards,'c');
 const result=independentCommunityDecks([a,b,repeated,differentBracket],{commanderId:'cmd'});
 assert.equal(result.decks.length,2);assert.equal(result.ignored.length,2);
 assert.deepEqual(result.decks.map(x=>x.key).sort(),['archidekt:1','archidekt:3']);
});

test('same-bracket cross-commander reference suppresses generic staples but not specialized packages',()=>{
 const own=Array.from({length:10},(_,i)=>deck('archidekt:'+String(100+i),'ulalek',3,[
  'Sol Ring','Command Tower', ...(i<6?['Eldrazi Spawn','Eldrazi Multiplier','Eldrazi Payoff']:['Other Theme '+i]),'individual '+i,'support '+i
 ],'brewer'+i));
 const ref=Array.from({length:8},(_,i)=>deck('archidekt:'+String(200+i),i<4?'wilhelt':'yuriko',3,
  ['Sol Ring','Command Tower','generic '+i,'outside '+i], 'outside'+i));
 const b4=Array.from({length:5},(_,i)=>deck('archidekt:'+String(300+i),'ulalek',4,['other B4','B4 '+i]));
 const stats=analyzeCommunityKnowledge([...own,...ref,...b4],{commanderId:'ulalek',bracket:3});
 assert.equal(stats.sampleSize,10);assert.equal(stats.highConfidence,true);
 assert.equal(stats.baseline.available,true);assert.equal(stats.baseline.referenceDecks,8);
 assert.equal(stats.inclusion.find(x=>x.id==='Sol Ring')?.genericStaple,true);
 assert.ok(stats.packages.some(p=>p.cards.length===3&&p.cards.includes('Eldrazi Payoff')),JSON.stringify(stats.packages));
 assert.ok(stats.packages.every(p=>!p.cards.includes('Sol Ring')));
 assert.ok(stats.packages[0].supportingDecks.every(x=>/^archidekt:10[0-5]$/.test(x)));
 assert.equal(stats.provenance.length,10);
 assert.ok(stats.inclusion.every(x=>x.interval.lower<=x.rate+0.001));
});

test('unknown bracket is not included in declared-bracket cohorts and baseline must not cross brackets',()=>{
 const list=[deck('one','cmd',null,['a','b']),deck('two','cmd',3,['a','c']),deck('three','cmd',4,['b','d'])];
 for(let i=0;i<6;i++)list.push(deck('other'+i,i<3?'a':'b',4,['Sol Ring','other'+i]));
 assert.equal(analyzeCommunityKnowledge(list,{commanderId:'cmd',bracket:3}).sampleSize,1);
 assert.equal(analyzeCommunityKnowledge(list,{commanderId:'cmd',bracket:3}).baseline.available,false);
 assert.equal(analyzeCommunityKnowledge(list,{commanderId:'cmd',bracket:4}).sampleSize,1);
 assert.equal(analyzeCommunityKnowledge(list,{commanderId:'cmd',bracket:4}).baseline.available,true);
 assert.equal(analyzeCommunityKnowledge(list,{commanderId:'cmd'}).sampleSize,3);
});

test('complete-link clustering does not chain unrelated archetypes through a bridge list',()=>{
 const list=[
  deck('a','cmd',3,['a','b','c','d']),
  deck('b','cmd',3,['a','b','c','d','e','f']),
  deck('c','cmd',3,['e','f','g','h']),
 ];
 const clusters=communityClusters(list,{threshold:0.3});
 assert.equal(clusters.length,1);
 assert.equal(clusters[0].size,2);
});

test('few community decks never create high-confidence recommendations even with perfect co-occurrence',()=>{
 const list=[deck('a','cmd',3,['x','y','z']),deck('b','cmd',3,['x','y','w'])];
 const stats=analyzeCommunityKnowledge(list,{commanderId:'cmd',bracket:3});
 assert.equal(stats.highConfidence,false);assert.equal(stats.reliable,false);
 assert.equal(stats.packages.length,0);
 assert.match(stats.warning,/Need at least 3/);
});

function jsonResponse(data){return {status:200,ok:true,headers:new Map(),text:async()=>JSON.stringify(data)};}

test('search page choice is bounded, independently cached and scoped to subsequent import',async()=>{
 const name='Page Scope Commander v090';const visited=[];
 const mock=async url=>{const p=Number(new URL(url).searchParams.get('page'));visited.push(p);return jsonResponse({results:[{id:1000+p,name:'A deck'}]});};
 const first=await discoverPublicDecks(name,{fetcher:mock,startPage:1,minGapMs:0});
 const second=await discoverPublicDecks(name,{fetcher:mock,startPage:2,minGapMs:0});
 assert.deepEqual(visited,[1,2]);assert.notDeepEqual(first.previews,second.previews);
 assert.equal((await discoverPublicDecks(name,{fetcher:mock,startPage:2,minGapMs:0})).fromCache,true);
 await assert.rejects(discoverPublicDecks(name,{fetcher:mock,startPage:4,minGapMs:0}),/page 1, 2 or 3/);
 await assert.rejects(importDiscoveredDecks({commanderId:'cmd',commanderName:name,ids:['1001'],startPage:2,catalog:[{id:'cmd'}],fetcher:mock,minGapMs:0}),/current search preview/);
});

test('Scryfall basic-land oracle identities do not enter community inclusion or packages',()=>{
 const d=Array.from({length:8},(_,i)=>deck('basic'+i,'cmd',3,
  ['uuid-forest', 'uuid-wastes', 'engine'+(i%2),'card'+i]));
 const stats=analyzeCommunityKnowledge(d,{commanderId:'cmd',bracket:3,basicIds:new Set(['uuid-forest','uuid-wastes'])});
 assert.ok(!stats.inclusion.some(x=>x.id==='uuid-forest'||x.id==='uuid-wastes'));
 assert.ok(!stats.packages.some(x=>x.cards.includes('uuid-wastes')));
});

test('single-known-creator collection remains exploratory even with eight distinct lists',()=>{
 const d=Array.from({length:8},(_,i)=>deck('oneauthor'+i,'cmd',3,['core','engine','card'+i,'filler'+i],'one brewer'));
 const stats=analyzeCommunityKnowledge(d,{commanderId:'cmd',bracket:3});
 assert.equal(stats.sampleSize,8);assert.equal(stats.highConfidence,false);
 assert.ok(stats.cautions.some(x=>/one known deck creator/i.test(x)));
 assert.ok(stats.packages.every(x=>x.evidence==='exploratory'));
});
