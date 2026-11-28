import test from 'node:test';
import assert from 'node:assert/strict';
import {architectRequest,validateArchitectResult} from '../src/aiArchitect.mjs';
import {architectLab} from '../src/architectLab.mjs';
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

test('Bracket 3 repairs a €522.43 draft under €450 when it takes more than one cheaper substitution',()=>{
 const priceyRamp={...rock,prices:{eur:44.50}};
 const priceyDraw={...draw,prices:{eur:45.13}};
 const cheapRamp={...priceyRamp,id:'Alternate Ramp',name:'Alternate Ramp',prices:{eur:1.25}};
 const cheapDraw={...priceyDraw,id:'Alternate Draw',name:'Alternate Draw',prices:{eur:2.25}};
 const priced=catalog.map(c=>c===reservoir?{...c,prices:{eur:335.90}}:c);
 const draft=deck.replace('1 '+filler[56].name,'1 '+priceyRamp.name).replace('1 '+filler[57].name,'1 '+priceyDraw.name);
 const p={...params,budget:450};
 const results=[cheapRamp,cheapDraw];
 const verify=options=>validateArchitectResult(p,JSON.stringify({deck:draft,strategy:{engines:vault.name}}),
  [...priced,priceyRamp,priceyDraw,...options],[preserved],{optimizeBudget:true});
 const result=verify(results);
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.audit.count,100);
 assert.equal(result.budgetOptimization.initialEUR,522.43);
 assert.equal(result.price,436.3);
 assert.equal(result.budgetOptimization.accepted[0].steps.length,2);
 assert.ok(result.budgetOptimization.accepted.every(row=>row.priceEUR<=450));
 assert.match(result.deck,/Engine Reservoir/);
 assert.match(result.deck,/Damage Outlet/);
 assert.equal(result.cardQuality.comboRoutes,1);
 const blocked=verify([cheapRamp]);
 assert.equal(blocked.valid,false);
 assert.equal(blocked.deck,undefined);
 assert.match(blocked.issues[0],/€522.43 exceeds.*450\.00 ceiling/);
 assert.match(blocked.issues[0],/reached €479.18.*€29.18 over budget/);
});

// Prices are controlled fixtures. The two totals reproduce the reported overages.
test('B3 repairs €285.23 by exchanging same-color lands, and reports the tapped-entry tradeoff',()=>{
 const fast=card('Razorverge Thicket','Land','',0,
  'This land enters tapped unless you control two or fewer other lands.\n{T}: Add {G} or {W}.',15.55,['G','W']);
 const guildgate=card('Selesnya Guildgate','Land — Gate','',0,
  'This land enters tapped.\n{T}: Add {G} or {W}.',.32,['G','W']);
 const priced=catalog.map(c=>c===reservoir?{...c,prices:{eur:171.68}}:c);
 const draft=deck.replace('13 Forest\n13 Plains\n12 Mountain','9 Forest\n9 Plains\n19 Mountain\n1 '+fast.name);
 const verify=extras=>validateArchitectResult({...params,budget:270},JSON.stringify({deck:draft,strategy:{engines:vault.name}}),
  [...priced,fast,...extras],[preserved],{optimizeBudget:true});
 const repaired=verify([guildgate]);
 assert.equal(repaired.valid,true,JSON.stringify(repaired.issues));
 assert.equal(repaired.budgetOptimization.initialEUR,285.23);
 assert.equal(repaired.price,270);
 assert.equal(repaired.audit.count,100);
 assert.deepEqual(repaired.budgetOptimization.accepted[0].adds,[guildgate.name]);
 assert.match(repaired.budgetOptimization.accepted[0].reason,/enters tapped/i);
 assert.equal(repaired.cardQuality.comboRoutes,1);
 const missingWhite={...guildgate,id:'Green only',name:'Green only',oracle_text:'This land enters tapped.\n{T}: Add {G}.'};
 assert.equal(verify([missingWhite]).valid,false);
 const oneCentShort=verify([{...guildgate,prices:{eur:.33}}]);
 assert.equal(oneCentShort.valid,false);
 assert.equal(oneCentShort.deck,undefined);
 assert.match(oneCentShort.issues[0],/reached €270.01.*€0.01 over budget/);
});

test('B4 repairs €285.37 with an equivalent token spell and honors an explicit exclusion',()=>{
 const text='Create two 1/1 red Goblin creature tokens.';
 const tokens=card("Krenko's Command",'Sorcery','{1}{R}',2,text,15.68,['R']);
 const alternative=card('Dragon Fodder','Sorcery','{1}{R}',2,text,.31,['R']);
 const priced=catalog.map(c=>c===reservoir?{...c,prices:{eur:172.24}}:c);
 const draft=deck.replace('1 '+filler.at(-1).name,'1 '+tokens.name);
 // The spell also fills a generic Spellbook hand prerequisite. The named
 // combo pieces and the requirement must survive the exchange.
 const needsSorcery={...preserved,prerequisites:['You have a sorcery card in hand with the mana to cast it.']};
 const verify=excludedStrategies=>validateArchitectResult({...params,bracket:4,budget:270,excludedStrategies},
  JSON.stringify({deck:draft,strategy:{engines:vault.name}}),[...priced,tokens,alternative],[needsSorcery],{optimizeBudget:true});
 const repaired=verify('');
 assert.equal(repaired.valid,true,JSON.stringify(repaired.issues));
 assert.equal(repaired.budgetOptimization.initialEUR,285.37);
 assert.equal(repaired.price,270);
 assert.equal(repaired.audit.count,100);
 assert.equal(repaired.cardQuality.comboRoutes,1);
 assert.deepEqual(repaired.budgetOptimization.accepted[0].adds,[alternative.name]);
 const blocked=verify(alternative.name);
 assert.equal(blocked.valid,false);
 assert.equal(blocked.deck,undefined);
 assert.match(blocked.issues[0],/€15.37/);
});

test('Bracket 4 fills one missing slot with a priced legal card and leaves unresolved imports blocked',()=>{
 const draft=deck.replace('1 '+filler.at(-1).name,'');
 const p={...params,bracket:4,budget:100};
 const removal=card('Affordable Answer','Instant','{W}',1,'Exile target creature.',.28,['W']);
 const unpriced=card('Unpriced Answer','Instant','{G}',1,'Exile target permanent.',null,['G']);
 const illegal=card('Off-Color Answer','Instant','{B}',1,'Exile target permanent.',.01,['B']);
 const priced=[...catalog,removal,unpriced,illegal];
 const run=(text,opts)=>validateArchitectResult(p,text,priced,[preserved],opts);
 const result=run(draft,{optimizeBudget:true});
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.audit.count,100);
 assert.equal(result.budgetOptimization.initialCards,99);
 assert.equal(result.price,99.73);
 assert.deepEqual(result.budgetOptimization.accepted[0].adds,[removal.name]);
 assert.deepEqual(result.budgetOptimization.accepted[0].cuts,[]);
 assert.match(result.deck,/Engine Reservoir/);
 for(const text of [draft+'\n1 Unknown Card',draft.replace('1 '+filler[0].name,'1 '+unpriced.name),
  draft.replace('1 '+filler[0].name,'1 '+filler[1].name),draft+'\n1 '+illegal.name,
  draft.replace('1 '+filler[0].name,'')])assert.equal(run(text,{optimizeBudget:true}).valid,false);
 assert.match(run(draft).issues.join(' '),/Expected 100 cards, resolved 99/);
 assert.equal(run(draft,{optimizeBudget:false}).valid,false);
});

test("B4 can replace one unavailable main-deck entry on line 42 with a validated catalog card",()=>{
 const lines=deck.split('\n'),unavailable="Kemba's Outfitter";
 lines[41]='1 '+unavailable;
 const text=lines.join('\n');
 const priced=[...catalog,card('Affordable Answer','Instant','{W}',1,'Exile target creature.',.28,['W'])];
 const p={...params,bracket:4,budget:100};
 const run=(draft,settings=p,opts={optimizeBudget:true,repairUnavailable:true})=>
  validateArchitectResult(settings,draft,priced,[preserved],opts);
 const result=run(text);
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.audit.count,100);
 assert.ok(result.price<=p.budget);
 assert.equal(result.cardQuality.comboRoutes,1);
 assert.ok(!result.deck.includes(unavailable));
 assert.deepEqual(result.budgetOptimization.unavailableCardReplacement,
  {line:42,name:unavailable,replacement:'Affordable Answer'});
 assert.ok(result.deck.includes('1 Affordable Answer'));
 const placeholder='Professional Face-Breaker Substitute Placeholder';
 const badOptions=[{name:'Digital answer',digital:true},{name:'Banned answer',legalities:{commander:'banned'}}]
  .map(extra=>({...priced.at(-1),...extra,id:extra.name,prices:{eur:0}}));
 const nextDraft=deck.split('\n');
 nextDraft[47]='1 '+placeholder;
 const repaired=validateArchitectResult(p,nextDraft.join('\n'),[...priced,...badOptions],[preserved],
  {optimizeBudget:true,repairUnavailable:true});
 assert.equal(repaired.valid,true,JSON.stringify(repaired.issues));
 assert.equal(repaired.audit.count,100);
 assert.deepEqual(repaired.budgetOptimization.unavailableCardReplacement,
  {line:48,name:placeholder,replacement:'Affordable Answer'});
 assert.ok(run(text,p,{}).issues.includes('Line 42: unresolved card: '+unavailable));
 assert.equal(run(text,{...p,preferences:'Keep '+unavailable}).valid,false);
 assert.equal(run(text,{...p,revisionRequest:'Keep my plan'}).valid,false);
 const ambiguous=[{id:'Split Alpha',name:'Split Alpha'},{id:'Split Beta',name:'Split Beta'}].map(c=>({
  ...priced.at(-1),...c,card_faces:[{name:unavailable,type_line:'Instant'}]}));
 assert.equal(validateArchitectResult(p,text,[...priced,...ambiguous],[preserved],
  {optimizeBudget:true,repairUnavailable:true}).valid,false);
 for(const bad of [text.replace('1 '+unavailable,'2 '+unavailable),
  text.replace('1 '+unavailable,'1 '+unavailable+' *CMDR*'),
  text.replace('1 '+unavailable,'Commander\n1 '+unavailable+'\nDeck'),
  text.replace('1 '+unavailable,'1 '+unavailable+' [Sideboard]'),
  text+'\n1 Another Unknown',text+'\n1 Forest',text+'\nMalformed row',
  text.replace('1 '+filler.at(-1).name,'1 '+filler[0].name)]){
  const rejected=run(bad);
  assert.equal(rejected.valid,false);
  assert.equal(rejected.deck,undefined);
 }
 const blocked=run(text,{...p,budget:5});
 assert.equal(blocked.valid,false);
 assert.ok(blocked.issues.includes('Line 42: unresolved card: '+unavailable));
});
test('Bracket 5 applies the range ceiling and supports a genuinely open price policy through analysis',()=>{
 const p={...params,bracket:5,budget:3000};
 const priced=catalog.map(c=>c===reservoir?{...c,prices:{eur:3511.98}}:c);
 assert.equal(validateArchitectResult(p,deck,priced,[preserved]).valid,false);
 const tier={...p,cedhBudgetTier:'4000'};
 const result=validateArchitectResult(tier,deck,priced,[preserved],{optimizeBudget:true});
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.ceiling,4000);
 assert.equal(result.price,3609.98);
 assert.equal(result.budgetOptimization.initialEUR,3609.98);
 assert.equal(result.budgetOptimization.remainingEUR,390.02);

 const open={...p,cedhBudgetTier:'open',budget:null};
 const highPrice=priced.map(c=>c===zacama?{...c,prices:{eur:120000}}:c);
 const uncapped=validateArchitectResult(open,deck,highPrice,[preserved],{optimizeBudget:true});
 assert.equal(uncapped.valid,true,JSON.stringify(uncapped.issues));
 assert.ok(uncapped.price>100000);
 assert.equal(uncapped.ceiling,null);
 assert.equal(uncapped.budgetOptimization.remainingEUR,null);
 assert.equal(uncapped.budgetOptimization.utilizationPercent,null);
 const request=architectRequest(open,highPrice,[preserved]);
 assert.match(request.prompt,/open budget/i);
 const lab=architectLab({...open,text:uncapped.deck,trials:100},{catalog:highPrice,variants:[preserved]});
 assert.equal(lab.original.withinBudget,true);
 assert.equal(lab.original.price,uncapped.price);
 assert.equal(lab.ceiling,null);
 assert.equal(validateArchitectResult({...open,bracket:4},deck,priced,[preserved]).valid,false);
});

test('at the exact ceiling a ready dual opens an actual one-drop while retaining colors, utility and the combo',()=>{
 const slow=card('Slow Practice Dual','Land','',0,'This land enters tapped.\n{T}: Add {G} or {W}.',1,['G','W']);
 const utility={...slow,id:'Utility',name:'Utility',oracle_text:slow.oracle_text+'\n{3}, {T}: Draw a card.'};
 const ready={...fastLand,prices:{eur:1}};
 const higher={...ready,id:'Expensive',name:'Expensive',prices:{eur:1.01}};
 const green=card('Practice Elf','Creature — Elf','{G}',1,'{T}: Add {G}.',.55,['G']);
 const text=deck.replace('13 Forest','11 Forest\n1 '+slow.name+'\n1 '+utility.name).replace(filler[0].name,green.name);
 const pool=[...catalog,slow,utility,green,higher];
 const strict=validateArchitectResult(params,text,pool,[preserved]);
 assert.equal(strict.valid,true);
 const p={...params,budget:strict.price};
 const run=extras=>validateArchitectResult(p,text,[...pool,...extras],[preserved],{optimizeBudget:true});
 assert.deepEqual(run([]).budgetOptimization.accepted,[]);
 const result=run([ready]);
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.price,strict.price);
 assert.equal(result.audit.count,100);
 assert.deepEqual(result.budgetOptimization.accepted.map(row=>row.cuts),[[slow.name]]);
 assert.deepEqual(result.budgetOptimization.accepted[0].adds,[ready.name]);
 assert.match(result.budgetOptimization.accepted[0].reason,/turn-1 payment/);
 assert.equal(result.cardQuality.comboRoutes,1);
 assert.ok(result.functionalReview.manaPolish.openingMana.forcedTappedPairFraction < strict.functionalReview.manaPolish.openingMana.forcedTappedPairFraction);
});
