import assert from 'node:assert/strict';
import test from 'node:test';
import {simulateArchitectDeck} from '../src/architectSimulation.mjs';
import {architectLab} from '../src/architectLab.mjs';
import {assessArchitectRevision} from '../src/architectRevisionEvidence.mjs';
import {allocateMana} from '../src/functionalGoldfish.mjs';
import {normalizeVariant} from '../src/combos.mjs';
import {indexDiscoveryCombos} from '../src/discoveryCombos.mjs';

function card(name,type_line,mana_cost='',oracle_text='',color_identity=[],eur=.1){
 return {id:name,name,type_line,mana_cost,oracle_text,color_identity,cmc:[...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n,[,x])=>n+(Number(x)||1),0),
  prices:{eur},legalities:{commander:'legal'},printing:{eligibleVersion:2}};
}
const commander=card('Zacama, Primal Calamity','Legendary Creature — Elder Dinosaur','{6}{R}{G}{W}',
 'Reach, vigilance, trample\nWhen Zacama enters, if you cast it, untap all lands you control.\n{2}{R}: Zacama deals 3 damage to target creature.', ['R','G','W']);
const forest=card('Forest','Basic Land — Forest','','{T}: Add {G}.',['G']);
const mountain=card('Mountain','Basic Land — Mountain','','{T}: Add {R}.',['R']);
const plains=card('Plains','Basic Land — Plains','','{T}: Add {W}.',['W']);
const growth=card('Wild Growth','Enchantment — Aura','{G}','Enchant land\nWhenever enchanted land is tapped for mana, its controller adds an additional {G}.',['G']);
const sprawl=card('Utopia Sprawl','Enchantment — Aura','{G}','Enchant Forest\nAs this Aura enters, choose a color.\nWhenever enchanted Forest is tapped for mana, its controller adds an additional one mana of the chosen color.',['G']);
const a=card('Line A','Artifact','{1}'),b=card('Line B','Artifact','{1}');
const expensive=card('Slow rock','Artifact','{3}','{T}: Add {C}.',[],1);
const cheap=card('Quick rock','Artifact','{1}','{T}: Add {C}.',[],.5);
const luxury=card('Premium rock','Artifact','{1}','{T}: Add {C}.',[],100);
const cultivate=card('Cultivate','Sorcery','{2}{G}','Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.',['G']);
const double=card('Mana Reflection','Enchantment','{4}{G}{G}','If you tap a permanent for mana, it produces twice as much of that mana instead.',['G']);
const filler=Array.from({length:54},(_,i)=>card('Filler '+i,'Sorcery','{3}'));
const lands=[...Array(17).fill(forest),...Array(10).fill(mountain),...Array(10).fill(plains)];
const cards=[...lands,growth,sprawl,cultivate,double,a,b,expensive,...filler.slice(0,55)];
assert.equal(cards.length,98);
cards.push(card('Additional card','Sorcery','{3}'));
const catalog=[...new Set([commander,...cards,cheap,luxury])];
const input={commander,cards};
const settings={trials:100,seed:'fixture-arch',bracket:4,budget:20};
const deckText=cards=>['1 '+commander.name+' *CMDR*',...cards.map(c=>'1 '+c.name)].join('\n');
const variant=(id,uses,other_prerequisites='')=>normalizeVariant({id,uses:uses.map(c=>({card:{name:c.name},quantity:1,zoneLocations:['B']})),
 other_prerequisites,produces:[{feature:{name:'Infinite damage to each opponent'}}]});

test('seeded 1,000-trial simulation is order-independent and returns a turn-by-turn London-mulligan sample',()=>{
 const one=simulateArchitectDeck(input,{trials:1000,seed:'reproducible'});
 const two=simulateArchitectDeck({...input,cards:[...cards].reverse()},{trials:1000,seed:'reproducible'});
 assert.deepEqual(one,two);
 assert.equal(one.turns.length,10);
 assert.ok(one.opening.averageMulligans>0&&one.opening.averageCardsKept<=7);
 assert.ok(one.commanderCastPct>0);
 assert.throws(()=>simulateArchitectDeck(input,{trials:101}),/Choose/);
});
test('Zacama untaps real paid lands and auras, land search and doublers change the supported deck model',()=>{
 const out=simulateArchitectDeck(input,settings);
 const baseline=simulateArchitectDeck({...input,commander:{...commander,oracle_text:''}},settings);
 assert.equal(out.supported.landAuras,2);
 assert.equal(out.supported.landSearch,1);
 assert.equal(out.supported.doublers,1);
 assert.equal(out.supported.castUntapsLands,true);
 assert.equal(out.commanderCastPct,baseline.commanderCastPct);
 assert.ok(out.averageManaAfterCommander>baseline.averageManaAfterCommander+3);
 assert.ok(out.unsupportedCards.includes(commander.name));
 assert.equal(allocateMana('{G}{R}',[{id:1,units:2,options:['G','R'],outputs:[['G','R']]}]).status,'supported');
 assert.equal(allocateMana('{C}',[{id:1,units:2,options:['G','R'],outputs:[['G','R']]}]).status,'unsupported');
});
test('comparison aligns identical seeds, true combo access, and unsupported ability prerequisites',()=>{
 const text=deckText(cards),variants=[variant('1',[a,b]),variant('2',[commander,a],'Commander must have haste before activating.')];
 const result=architectLab({...settings,text,comparison:text},{catalog,variants});
 assert.deepEqual(result.original.result,result.comparison.result);
 assert.equal(result.comparison.deltas.commanderCastPct,0);
 const direct=result.original.result.combo.find(line=>line.id==='1');
 assert.ok(direct.piecesSeenPct>0&&direct.startingStatePct>0);
 assert.equal(direct.kind,'Direct win');
 assert.equal(result.original.result.combo.find(line=>line.id==='2').startingStatePct,null);
 assert.throws(()=>architectLab({...settings,text,comparison:text.replace('1 Line B','1 Line A')},{catalog,variants}),/maximum 1/i);
});
test('comparison price audit blocks revisions over the deck ceiling and preserves published combos',()=>{
 const text=deckText(cards),variants=[variant('1',[a,b])];
 const result=architectLab({...settings,text,proposed:text.replace('1 Slow rock','1 Premium rock')},{catalog,variants});
 assert.equal(result.upgrade.eligible,false);
 assert.equal(result.upgrade.assessment.status,'blocked');
 assert.equal(result.upgrade.priceChange,99);
 const legal=architectLab({...settings,text,proposed:text.replace('1 Slow rock','1 Quick rock')},{catalog,variants});
 assert.ok(legal.upgrade.eligible);
 assert.equal(legal.upgrade.assessment.status,'supported');
 assert.ok(legal.upgrade.assessment.gains.length>0);
 assert.equal(legal.upgrade.deck.split('\n').length,100);
 assert.match(legal.upgrade.deck.split('\n')[0],/\*CMDR\*$/);
 const [{impact,...swap}]=legal.upgrade.swaps;
 assert.deepEqual(swap,{cut:'Slow rock',add:'Quick rock',priceChange:-.5});
 assert.deepEqual(impact,legal.upgrade.deltas);
 const paired=architectLab({...settings,text,proposed:text.replace('1 Slow rock','1 Quick rock').replace('1 Filler 0','1 Plains')},{catalog,variants});
 assert.equal(paired.upgrade.swaps.length,2);
 assert.ok(paired.upgrade.swaps.every(swap=>Number.isFinite(swap.impact.manaTurnFour)));
 const lost=architectLab({...settings,text,proposed:text.replace('1 Line B','1 Quick rock')},{catalog,variants});
 assert.deepEqual(lost.upgrade.lostCombos,['1']);
 assert.equal(lost.upgrade.eligible,false);
});

test('equivalent card replacements preserve paired draws and do not produce a recommendation',()=>{
 const former=filler[0];
 const equivalent={...former,id:'ZZZ Alternate Filler',name:'ZZZ Alternate Filler',prices:{eur:.05}};
 const text=deckText(cards),proposed=text.replace('1 '+former.name,'1 '+equivalent.name);
 const result=architectLab({...settings,text,proposed},{catalog:[...catalog,equivalent]});
 const upgrade=result.upgrade;
 assert.equal(upgrade.priceChange,-.05);
 assert.deepEqual(upgrade.result,result.original.result);
 assert.equal(upgrade.assessment.status,'inconclusive');
 assert.equal(upgrade.eligible,false);
 for(const key of ['rampPlayedByTurnThreePct','averageManaAfterCommander','keptTwoToFourLandsPct','averageMulligans'])
  assert.equal(upgrade.deltas[key],0);
});

test('a slower swap remains visible as a candidate while the original stays eligible to export',()=>{
 const text=deckText(cards).replace('1 Slow rock','1 Quick rock');
 const result=architectLab({...settings,text,proposed:deckText(cards)},{catalog});
 assert.equal(result.upgrade.assessment.status,'regression');
 assert.equal(result.upgrade.eligible,false);
 assert.ok(result.upgrade.assessment.regressions.some(signal=>signal.label==='Ramp played by turn 3'));
 assert.ok(result.upgrade.deltas.rampPlayedByTurnThreePct<0);
 assert.equal(result.original.deck,text);
});

test('minor gains do not justify adoption and a meaningful loss outweighs a measured gain',()=>{
 const runs=Array.from({length:1000},(_,i)=>({
  seenByTurn:Array.from({length:5},()=>({mana:3,draw:i<700,interaction:i<689})),
  rampTurn:i<430?3:null,commanderTurn:i<167?8:null,postCastMana:10,drawn:Number(i<290),screw:i<30,
 }));
 const minor=runs.map((run,i)=>({
  ...run,seenByTurn:run.seenByTurn.map(turn=>({...turn,mana:turn.mana+Number(i<10),interaction:i<684})),
  rampTurn:i<416?3:null,commanderTurn:i<172?8:null,drawn:Number(i<280),
 }));
 assert.deepEqual(assessArchitectRevision(runs,minor),{status:'inconclusive',gains:[],regressions:[]});
 const mixed=minor.map(run=>({
  ...run,seenByTurn:run.seenByTurn.map(turn=>({...turn,mana:turn.mana+1})),
  postCastMana:9,
 }));
 const regression=assessArchitectRevision(runs,mixed);
 assert.equal(regression.status,'regression');
 assert.ok(regression.gains.some(signal=>signal.label==='Mana available on turn 4'));
 assert.ok(regression.regressions.some(signal=>signal.label==='Mana left after casting when both decks cast'));
});

test('Bracket 3 analysis reports a compact Spellbook combo and allows a revision that retains it',()=>{
 const variants=[variant('1',[a,b])];
 const snapshot={variants,index:indexDiscoveryCombos(variants)};
 const result=architectLab({...settings,bracket:3,text:deckText(cards),suggest:true},{catalog,variants,snapshot});
 assert.equal(result.original.bracketIssue,false);
 assert.equal(result.original.combos.twoCard,1);
 assert.equal(result.original.result.combo[0].outcomes[0],'Infinite damage to each opponent');
 assert.equal(result.upgrade?.eligible,true);
 assert.deepEqual(result.upgrade.completeLineIds,['1']);
});

test('Bracket 3 analysis and Builder validation enforce the three-Game Changer limit',async()=>{
 const {validateArchitectResult}=await import('../src/aiArchitect.mjs');
 const marked=new Set([a.id,b.id,expensive.id,filler[0].id]);
 const gameChangerCatalog=catalog.map(c=>marked.has(c.id)?{...c,game_changer:true}:c);
 const text=deckText(cards);
 const params={...settings,bracket:3,mode:'builder',commanderName:commander.name};
 assert.equal(architectLab({...params,text},{catalog:gameChangerCatalog}).original.bracketIssue,true);
 const result=validateArchitectResult(params,text,gameChangerCatalog);
 assert.equal(result.valid,false);
 assert.match(result.issues.join(' '),/Game Changer allowance exceeded/);
});

test('connected Architect protocol validates and exports mocked AI decks for Brackets 3, 4 and 5',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {createPlanOnly}=await import('../src/planOnly.mjs');
 const {architectRequest,validateArchitectResult}=await import('../src/aiArchitect.mjs');
 const dir=await mkdtemp(join(tmpdir(),'architect-simulation-ai-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const session={status:'connected',sharing:true,profileId:'local-fixture'};
 const sdk={signIn:async()=>session,getSession:async()=>session,
  listModels:async()=>[{slug:'fixture-model',displayName:'Fixture Model'}],
  streamResponse:async()=>({text:JSON.stringify({deck:deckText(cards),strategy:{direction:'Land ramp into Zacama'}})})};
 const architect=createPlanOnly({sdkFactory:async()=>sdk,historyFile:join(dir,'usage.json')});
 await architect.signIn({directUseAuthorized:true});
 await architect.discover();
 await architect.configure({enabled:true,directUseAuthorized:true,accountSettingsConfirmed:true,
  creditsSettingReviewed:true,weeklyLimitPercent:25,dailyLimit:3,model:'fixture-model'});
 const variants=[variant('1',[a,b])];
 for(const bracket of [3,4,5]){
  const params={...settings,bracket,budget:bracket===5?1500:settings.budget,mode:'builder',commanderName:commander.name};
  const {prompt}=architectRequest(params,catalog,variants);
  assert.equal(prompt.includes('Bracket 5 cEDH'),bracket===5);
  const result=await architect.run({prompt,maxRepairs:0,
   validate:raw=>validateArchitectResult(params,raw,catalog,variants)});
  assert.ok(result.valid,result.issues?.join(' | '));
  assert.equal(result.strategy.direction,'Land ramp into Zacama');
  assert.equal(result.audit.count,100);
  assert.ok(result.price<=settings.budget);
  const exported=validateArchitectResult(params,result.deck,catalog,variants);
  assert.equal(exported.valid,true);
  assert.equal(exported.deck,result.deck);
  if(bracket===5){
   assert.equal(result.ceiling,1500);
   const lab=architectLab({...params,text:result.deck,comparison:result.deck,comparisonBracket:4},{catalog,variants});
   assert.equal(lab.original.bracketIssue,false);
   assert.equal(lab.original.result.combo.length,1);
  }
 }
 assert.equal((await architect.status()).requestsToday,3);
});
