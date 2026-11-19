import test from 'node:test';
import assert from 'node:assert/strict';
import {validateArchitectResult} from '../src/aiArchitect.mjs';
import {normalizeVariant} from '../src/combos.mjs';
import {indexDiscoveryCombos} from '../src/discoveryCombos.mjs';

const printing={eligibleVersion:2,set:'tst',language:'en',border:'black'};
function card(name,type_line,mana_cost,cmc,oracle_text,eur,color_identity=[],extra={}){
 return {id:name,name,type_line,mana_cost,cmc,oracle_text,prices:{eur},color_identity,
  legalities:{commander:'legal'},printing,...extra};
}
const zacama=card('Zacama, Primal Calamity','Legendary Creature — Elder Dinosaur','{6}{R}{G}{W}',9,
 'When Zacama enters, if you cast it, untap all lands you control.\n{2}{R}: Zacama deals 3 damage to target creature.',9.10,['R','G','W']);
const basic=(type,color)=>card(type,'Basic Land — '+type,'',0,'{T}: Add {'+color+'}.',.10,[color]);
const plains=basic('Plains','W'),forest=basic('Forest','G'),mountain=basic('Mountain','R');
const vault=card('Mana Vault','Artifact','{1}',1,
 "This artifact doesn't untap during your untap step.\n{T}: Add {C}{C}{C}.",55,[],{game_changer:true});
const reservoir=card('Engine Reservoir','Artifact','{4}',4,'{T}: Add {C}.',2);
const outlet=card('Damage Outlet','Artifact','{3}',3,'{X}: Damage Outlet deals X damage to each opponent.',2);
const filler=Array.from({length:58},(_,i)=>card('Fixture Creature '+String(i).padStart(2,'0'),'Creature — Human','{2}',2,'',.55));
const deck=[`1 ${zacama.name} *CMDR*`,'13 Forest','13 Plains','12 Mountain',
 ...[vault,reservoir,outlet,...filler].map(c=>'1 '+c.name)].join('\n');
const catalog=[zacama,plains,forest,mountain,vault,reservoir,outlet,...filler];
const params={mode:'builder',commanderName:zacama.name,budget:220,bracket:3};
const variant=(id,uses)=>normalizeVariant({id,uses:uses.map(c=>({card:{name:c.name}})),
 produces:['Infinite damage to each opponent.']});
const preserved=variant('900001',[zacama,reservoir,outlet]);
const raw=JSON.stringify({deck,strategy:{direction:'Land ramp and repeatable mana',engines:'Engine Reservoir and Damage Outlet'}});
const optimize=(p,extras,opts={})=>validateArchitectResult(p,raw,[...catalog,...extras],[preserved],{optimizeBudget:true,...opts});

const rock=card('Premium Ramp','Artifact','{1}',1,'{T}: Add {G}{G}.',32.01,['G']);
const slowRock=card('Three-Mana Rock','Artifact','{3}',3,'{T}: Add {G}.',.35,['G']);
const protection=card('Premium Shield','Instant','{2}{W}',3,'All permanents you control phase out.',26.50,['W']);
const draw=card('Premium Draw','Enchantment','{1}{G}',2,
 'At the beginning of your draw step, you may draw two additional cards.',23.95,['G']);
const fastLand=card('Premium Forest Plains','Land — Forest Plains','',0,
 "({T}: Add {G} or {W}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped.",11.50,['G','W']);
const fetch=card('Premium Fetch','Land','',0,
 '{T}, Pay 1 life, Sacrifice this land: Search your library for a Mountain or Forest card, put it onto the battlefield, then shuffle.',16.50);
const redirect=card('Premium Creature Access','Instant','{G}{W}',2,
 'Search your library for a creature card, reveal that card, put it into your hand, then shuffle.',17,['G','W']);
const vanity=card('Expensive Equivalent','Creature — Human','{2}',2,'',70);
const falseWin=card('Unsupported Alternate Win','Enchantment','{1}{W}',2,
 'At the beginning of your upkeep, if you have 200 or more cards in your library, you win the game.',5,['W']);
const falseLand=card('Unreliable Rainbow','Land','',0,
 "At the beginning of the end step, if you control no creatures, sacrifice this land.\n{T}: Add one mana of any color.",4);
const lateSearch=card('Delayed Land Search','Enchantment','{G}',1,
 "Landfall — Whenever a land enters under your control, put a quest counter on this enchantment.\nRemove three quest counters from this enchantment and sacrifice it: Search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.",8,['G']);

test('Zacama invests meaningful headroom in successive legal, supported upgrades at a €220 ceiling',()=>{
 const extras=[slowRock,rock,protection,draw,fastLand,fetch,redirect,vanity,falseWin,falseLand,lateSearch];
 const result=optimize(params,extras);
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 const report=result.budgetOptimization;
 assert.equal(report.initialEUR,100);
 assert.equal(report.ceilingEUR,220);
 assert.deepEqual(report.targetPercent,[85,100]);
 assert.equal(result.audit.count,100);
 assert.equal(result.audit.provenance,'exact-selected-cards');
 assert.equal(result.price,report.finalEUR);
 assert.ok(result.price>=187&&result.price<=220,JSON.stringify(report.accepted));
 let runningTotal=report.initialEUR;
 const names=new Set(report.accepted.flatMap(row=>row.adds));
 for(const card of [rock,protection,draw])assert.ok(names.has(card.name),JSON.stringify(report.accepted));
 assert.ok(names.has(fastLand.name)||names.has(fetch.name));
 for(const row of report.accepted){
  runningTotal=Math.round((runningTotal+row.changeEUR)*100)/100;
  assert.equal(row.priceEUR,runningTotal);
  assert.equal(row.remainingEUR,Math.round((220-runningTotal)*100)/100);
  assert.match(row.reason,/Improves/);
  assert.ok(report.considered.some(candidate=>candidate.round===row.round&&candidate.status==='accepted'));
 }
 assert.equal(report.remainingEUR,Math.round((220-result.price)*100)/100);
 assert.ok(report.considered.some(row=>row.status==='rejected'&&row.reason.length));
 for(const card of [vault,reservoir,outlet])assert.ok(result.deck.includes('1 '+card.name));
 for(const card of [vanity,falseWin,falseLand,lateSearch])assert.ok(!result.deck.includes('1 '+card.name),card.name);
 assert.deepEqual(optimize(params,extras).budgetOptimization,report);
});

test('budget is enforced on each proposal and ordinary validation and AI revisions preserve the draft',()=>{
 const extras=[rock,protection,draw,fastLand,fetch,redirect];
 const result=optimize({...params,budget:130},extras);
 assert.equal(result.valid,true);
 assert.ok(result.price>100&&result.price<=130);
 assert.ok(result.budgetOptimization.considered.some(row=>row.status==='rejected'&&/ceiling/i.test(row.reason)));
 const original=validateArchitectResult(params,raw,[...catalog,...extras],[preserved]);
 const revision=optimize({...params,revisionRequest:'Review the existing plan.'},extras);
 assert.equal(original.price,100);
 assert.equal(revision.price,100);
 assert.equal(revision.deck,original.deck);
 assert.equal(original.budgetOptimization,undefined);
 assert.equal(revision.budgetOptimization,undefined);
 assert.equal(optimize(params,extras).valid,true);
 const repriced=optimize({...params,budget:99},extras);
 assert.equal(repriced.valid,true);
 assert.ok(repriced.price<=99);
 assert.equal(repriced.audit.count,100);
 assert.equal(optimize({...params,budget:10},extras).valid,false);
});

test('headroom remains available when the catalog offers no supported improvement',()=>{
 const result=optimize(params,[vanity,falseWin,falseLand]);
 assert.equal(result.valid,true);
 assert.equal(result.price,100);
 assert.equal(result.budgetOptimization.remainingEUR,120);
 assert.equal(result.budgetOptimization.accepted.length,0);
 assert.ok(result.budgetOptimization.rounds>0);
 assert.match(result.budgetOptimization.stopReason,/No meaningful upgrade/);
});

test('a low absolute ceiling still gets a review when most of the budget is available',()=>{
 const lowBudgetCatalog=catalog.map(c=>({...c,prices:{eur:Math.round(c.prices.eur*4)/100}}));
 const cheapUpgrade={...rock,prices:{eur:1.35}};
 const result=validateArchitectResult({...params,budget:8},raw,[...lowBudgetCatalog,cheapUpgrade],[preserved],{optimizeBudget:true});
 assert.equal(result.valid,true);
 assert.ok(result.budgetOptimization.initialEUR<4);
 assert.ok(result.budgetOptimization.remainingEUR>0);
 assert.ok(result.deck.includes(cheapUpgrade.name));
});

test('Bracket 3 and 4 budget review can complete a published combo and honors explicit exclusions',()=>{
 const missing=card('Combo Completion','Creature — Human','{3}',3,
  "{2}: Return another creature you control to its owner's hand.",10);
 const line=variant('900002',[zacama,missing]);
 const snapshot={variants:[line],index:indexDiscoveryCombos([line])};
 for(const bracket of [3,4]){
  const result=optimize({...params,bracket},[missing],{snapshot});
  assert.equal(result.valid,true);
  assert.equal(result.audit.count,100);
  assert.ok(result.deck.includes(missing.name));
  assert.match(result.budgetOptimization.accepted[0].reason,/published Commander Spellbook route/);
 }
 const excluded=optimize({...params,excludedStrategies:'No infinite combos'},[missing],{snapshot});
 assert.equal(excluded.valid,true);
 assert.ok(!excluded.deck.includes(missing.name));
});
