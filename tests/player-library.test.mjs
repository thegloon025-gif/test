import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {playerStore} from '../src/playerStore.mjs';
import {playerAction} from '../src/playerLibrary.mjs';
import {importCollection,collectionCatalog,purchaseEstimate} from '../src/playerCollection.mjs';
import {priceOf} from '../src/cards.mjs';
import {openingPractice,readPlayerDeck,inspectDeck,previewBracket} from '../src/playerDecks.mjs';
const card=(name,type,eur,extra={})=>({id:name,name,type_line:type,color_identity:[],oracle_text:'',prices:{eur},
  legalities:{commander:'legal'},mana_cost:'{1}',cmc:1,...extra});
const lead=card('Captain','Legendary Creature — Human',5),first=card('Plan, Original','Artifact',10,{game_changer:true}),
  swap=card('Upgrade','Artifact',3),other=card('Another','Artifact',4),land=card('Wastes','Basic Land — Wastes',0.1);
const cards=[lead,first,swap,other,land];
const original='1 Captain *CMDR*\n1 Plan, Original (TST) 123\n98 Wastes';
const revised=original.replace('Plan, Original (TST) 123','Upgrade');
const collection={enabled:true,rows:[]};
const ctx={catalog:cards,variants:[],snapshot:null,bracket:2,collection,ownedBasics:true};
test('CSV aggregates quoted names and reservations, preserves prices and charges partial quantities',()=>{
 const rows=importCollection('Name,Quantity,Reserved\r\n"Plan, Original",1,1\n"Plan, Original",1,0\nWastes,3,1',cards);
 const stock={enabled:true,rows};assert.equal(priceOf(collectionCatalog(cards,stock)[1]),0);
 assert.equal(priceOf(first),10);
 assert.equal(purchaseEstimate([land,land,land,first],stock,{ownedBasics:false}).cost,.1);
 assert.equal(purchaseEstimate([first,first],stock,{baseline:[first]}).cost,10);
 assert.throws(()=>importCollection('Name,Qty,Reserved\nUpgrade,1,2',cards),/row 2/);
 assert.throws(()=>importCollection('Name,Qty\nUnknown,1',cards),/Unrecognized/);
});
test('save, restart, branch, compare and enforce parent budget without charging sibling branches',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'player-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 let store=playerStore(dir);
 const call=(action,data)=>playerAction(action,{budget:3,bracket:2,locked:[],...data},{store,catalog:cards,context:async()=>({...ctx})});
 const root=await call('save',{name:'Original',text:original});
 store=playerStore(dir);assert.equal((await call('version',{id:root.id})).text,original);
 const branch=await call('save',{parentId:root.id,name:'Alternative',text:revised});
 assert.equal(branch.remaining,0);assert.equal(branch.spent,3);assert.equal((await call('version',{id:root.id})).remaining,3);
 await assert.rejects(call('save',{parentId:root.id,name:'Too expensive',text:revised.replace('Upgrade','Another')}),/exceeds/);
 await assert.rejects(call('save',{parentId:root.id,name:'Locked',text:revised,locked:[first.name]}),/locked/);
 const diff=await call('compare',{beforeId:root.id,text:revised});assert.deepEqual(diff.changes.map(c=>c.delta),[-1,1]);assert.equal(diff.purchase.cost,3);
 await Promise.all([call('save',{text:original,name:'Independent'}),call('collection',{csv:'Name,Qty\nAnother,1',enabled:true})]);
 const sibling=await call('save',{parentId:root.id,name:'Owned swap',text:revised.replace('Upgrade','Another')});
 assert.equal(sibling.remaining,3);assert.equal((await call('state',{})).versions.length,4);
});
test('bracket preview checks locks, costs, current allowance and leaves the input untouched',()=>{
 const deck=readPlayerDeck(original,cards),view=inspectDeck(deck,ctx);assert.equal(view.excess,1);
 assert.equal(inspectDeck(deck,{...ctx,bracket:3}).excess,0);
 assert.equal(previewBracket(deck,view,ctx,{budget:0}),null);assert.equal(previewBracket(deck,view,ctx,{locked:[first.name],budget:4}),null);
 const proposal=previewBracket(deck,view,ctx,{budget:3});
 assert.equal(proposal.excess,0);assert.equal(proposal.cut,first.name);assert.equal(proposal.diff.purchase.cost,3);
 assert.equal(deck.originalText,original);assert.equal(readPlayerDeck(proposal.text,cards).cards.length,99);
});
test('paired practice, manual paid London bottoms, deterministic seeds and legal land choices',()=>{
 const deck=readPlayerDeck(original,cards),alt=readPlayerDeck(revised,cards);
 const params={seed:'paired',attempt:2};
 const a=openingPractice(deck,params),b=openingPractice(alt,params,deck);
 assert.equal(a.opening.length,7);assert.deepEqual(a.opening.map(c=>c.name===first.name?swap.name:c.name),b.opening.map(c=>c.name));
 assert.throws(()=>openingPractice(deck,{...params,bottomIds:[]}),/required cards/);
 const selected=[a.opening[0].id];
 const kept=openingPractice(deck,{...params,bottomIds:selected});assert.deepEqual(kept.bottomed,selected);
 assert.equal(kept.turns.length,4);assert.ok(kept.landOdds>0.99);assert.ok(Math.abs(kept.fourthLandOdds-1)<1e-9);
 const passing=openingPractice(deck,{...params,firstCasts:['pass']});assert.ok(passing.turns[0].events.every(e=>e.kind!=='cast'));
 assert.throws(()=>openingPractice(deck,{...params,landChoices:['absent']}),/no longer in hand/);
 assert.deepEqual(openingPractice(deck,params),a);
});

test('removing the lethal outlet loses the direct route while the resource combo still explains its bracket conflict',async()=>{
 const {default:fixtures}=await import('./fixtures/win-condition-cards.json',{with:{type:'json'}});
 const {comparePlayerDecks}=await import('../src/playerDecks.mjs');
 const catalog=fixtures.map(c=>({...c,id:c.oracle_id,legalities:{commander:'legal'},prices:{eur:1}})).concat(land);
 const source='1 Zaxara, the Exemplary *CMDR*\n1 Freed from the Real\n1 Exsanguinate\n97 Wastes';
 const a=readPlayerDeck(source,catalog),b=readPlayerDeck(source.replace('1 Exsanguinate\n97','98'),catalog);
 const first=inspectDeck(a,{...ctx,catalog}),next=inspectDeck(b,{...ctx,catalog});
 assert.ok(next.conflicts.some(c=>c.cards.includes('Freed from the Real')));
 assert.ok(comparePlayerDecks(a,b,first,next,collection).lost.length>0);
 assert.ok(next.wins.groups.some(g=>g.classification==='NEEDS PAYOFF'));
});
