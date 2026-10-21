import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,rm} from 'node:fs/promises';
import {normalizedName,normalizeVariant,normalizeFindResponse,spellbookRequest,annotateCombos,fetchSpellbookForDeck} from '../src/combos.mjs';
import {communityInsights} from '../src/community.mjs';
const base={type_line:'Sorcery',color_identity:['U'],legalities:{commander:'legal'},prices:{eur:1}};
const commander={...base,id:'commander',name:'Test Commander',type_line:'Legendary Creature — Wizard'};
const pool=Array.from({length:99},(_,i)=>({...base,id:'spell'+i,name:'Spell '+i,prices:{eur:i+1}}));
const alt={...base,id:'outside',name:'Missing Piece',prices:{eur:5.4}};
const illegal={...base,id:'other-color',name:'Red Combo Piece',color_identity:['R']};
const catalog=[commander,...pool,alt,illegal];
const deck={key:'archidekt:543',validated:true,commanderIds:['commander'],mainboard:pool.map(c=>({id:c.id,quantity:1})),totalCards:100};
const variant=(id,cards,extra={})=>({id,uses:cards.map(name=>({card:{name}})),other_prerequisites:'Have sufficient mana',description:'Cast and activate',produces:[{feature:{name:'Infinite damage'}}],...extra});
const fixture={results:{included:[variant('4-3',['Test Commander','Spell 0'])],almost_included:[variant('5-3',['Spell 0','Missing Piece']),variant('6-3',['Spell 0','Red Combo Piece'])]}};
const ok=value=>({status:200,ok:true,headers:new Map(),text:async()=>JSON.stringify(value)});

test('case and card-face display spellings canonicalized without merging different cards',()=>{
 assert.equal(normalizedName("Mistral’s Oath"),normalizedName("Mistral's Oath"));
 assert.notEqual(normalizedName('Delver of Secrets'),normalizedName('Spellstutter Sprite'));
});
test('strict response validation never reports zero combos for a changed schema',()=>{
 assert.throws(()=>normalizeFindResponse({results:{}}),/response format changed/);
 assert.equal(normalizeVariant({id:'../../hack',cards:['x']}),null);
 assert.equal(normalizeVariant(variant('12-3',['Spell 0'])).cards[0],'Spell 0');
});
test('deck request only accepts validated 100-card decks and preserves 99 mainboard names',()=>{
 const p=spellbookRequest(deck,catalog);assert.deepEqual(p.commanders,[{card:'Test Commander',quantity:1}]);assert.equal(p.main.length,99);assert.deepEqual(p.main[0],{card:'Spell 0',quantity:1});
 assert.throws(()=>spellbookRequest({...deck,totalCards:96},catalog),/validated 100-card/);
});
test('Spellbook request preserves grouped quantities and rejects misleading card counts',()=>{
 const grouped={...deck,mainboard:[{id:'spell0',quantity:2},...pool.slice(1,98).map(c=>({id:c.id,quantity:1}))]};
 const p=spellbookRequest(grouped,catalog);
 assert.equal(p.main.length,98);
 assert.deepEqual(p.main[0],{card:'Spell 0',quantity:2});
 assert.equal(p.main.reduce((sum,c)=>sum+c.quantity,0),99);
 assert.throws(()=>spellbookRequest({...deck,mainboard:[{id:'spell0',quantity:98}]},catalog),/99 mainboard cards/);
});
test('current camelCase groups and paged group envelopes are normalized',()=>{
 const response={results:{included:{count:1,variants:[variant('34-2',['Test Commander','Spell 0'])]},almostIncluded:{count:2,variants:[variant('35-2',['Spell 0','Missing Piece'])]}}};
 const parsed=normalizeFindResponse(response);
 assert.equal(parsed.included.length,1);
 assert.equal(parsed.near.length,1);
 assert.equal(parsed.reportedNear,2);
});
test('card complete and missing 1 are rechecked against exact deck identity and prices',()=>{
 const analysis=annotateCombos(normalizeFindResponse(fixture),deck,catalog);
 assert.equal(analysis.counts.complete,1);assert.equal(analysis.counts.oneAway,1);assert.equal(analysis.counts.infiniteComplete,1);assert.equal(analysis.counts.infiniteOneAway,1);
 assert.deepEqual(analysis.oneAway[0].missing,['Missing Piece']);
 assert.equal(analysis.oneAway[0].missingPriceEstimate,5.4);
 assert.equal(analysis.complete[0].requiresReview,true);
});
test('missing templates and unresolved cards are never called complete',()=>{
 const local={included:[normalizeVariant(variant('1-2',['Spell 0','Unknown card']))],near:[],reportedIncluded:1,reportedNear:0};
 assert.equal(annotateCombos(local,deck,catalog).counts.complete,0);
 const t={included:[normalizeVariant(variant('1-3',['Spell 0'],{templates:[{name:'A Creature'}]}))],near:[],reportedIncluded:1,reportedNear:0};
 assert.equal(annotateCombos(t,deck,catalog).counts.complete,1); // Commander creature supplies the separate template slot; execution still unverified.
 assert.equal(annotateCombos(t,deck,catalog).complete[0].executionVerified,false);
});
test('on-demand fetch uses fixed upstream endpoint, cache prevents duplicate requests',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'spellbook-test-'));let calls=0;
 try{
  const fetcher=async(url,init)=>{calls++;assert.equal(url,'https://backend.commanderspellbook.com/find-my-combos');assert.equal(init.method,'POST');const body=JSON.parse(init.body);assert.deepEqual(body.commanders,[{card:'Test Commander',quantity:1}]);assert.deepEqual(body.main[0],{card:'Spell 0',quantity:1});return ok(fixture);};
  const args={fetcher,minGapMs:0,cacheDir:temp};
  const a=await fetchSpellbookForDeck(deck,catalog,args);const b=await fetchSpellbookForDeck(deck,catalog,args);
  assert.equal(a.fromCache,false);assert.equal(b.fromCache,true);assert.equal(calls,1);
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('429 and upstream schema changes show errors instead of fabricated empty results',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'spellbook-error-'));
 try{
  await assert.rejects(fetchSpellbookForDeck(deck,catalog,{cacheDir:temp,minGapMs:0,fetcher:async()=>({status:429,ok:false,headers:new Map()})}),/rate-limiting/);
  await assert.rejects(fetchSpellbookForDeck(deck,catalog,{cacheDir:temp,minGapMs:0,fetcher:async()=>ok({results:[]})}),/response format changed/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('pair lift ignores universal staples and surfaces above-baseline pairs',()=>{
 const mk=(key,names)=>({key,validated:true,commanderIds:['commander'],edhBracket:3,mainboard:names.map(id=>({id,quantity:1}))});
 const decks=[mk('one',['staple','a','b']),mk('two',['staple','a','b']),mk('three',['staple','c']),mk('four',['staple','c'])];
 const stats=communityInsights(decks,{commanderId:'commander',bracket:3});
 assert.equal(stats.sampleSize,4);assert.equal(stats.uniqueCardCount,4);
 assert.equal(stats.pairings.find(x=>x.a==='a'&&x.b==='staple').lift,1);
 assert.ok(stats.distinctivePairings.some(x=>x.a==='a'&&x.b==='b'&&x.lift>1));
 assert.equal(stats.distinctivePairings.some(x=>x.a==='a'&&x.b==='staple'),false);
});

test('HTTP 400 surfaces bounded Spellbook field-validation feedback',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'spellbook-field-error-'));
 try{
  const response={status:400,ok:false,text:async()=>JSON.stringify({main:['Each entry must include card and quantity']})};
  await assert.rejects(fetchSpellbookForDeck(deck,catalog,{cacheDir:temp,minGapMs:0,fetcher:async()=>response}),/Each entry must include card and quantity/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
