import test from 'node:test';
import assert from 'node:assert/strict';
import fixtures from './fixtures/win-condition-cards.json' with {type:'json'};
import {analyzeWinConditions,lostWinPath} from '../src/winConditions.mjs';
import {normalizeVariant} from '../src/combos.mjs';
import {architectLab} from '../src/architectLab.mjs';
import {validateArchitectResult} from '../src/aiArchitect.mjs';
import {indexDiscoveryCombos} from '../src/discoveryCombos.mjs';

const records=fixtures.map(c=>({...c,id:c.oracle_id,prices:{eur:1},legalities:{commander:'legal'},printing:{eligibleVersion:2}}));
const card=prefix=>records.find(c=>c.name.startsWith(prefix));
const basic=(name,color)=>({id:name,name,type_line:'Basic Land — '+name,oracle_text:'{T}: Add {'+color+'}.',
 color_identity:[color],legalities:{commander:'legal'},prices:{eur:.1},printing:{eligibleVersion:2}});
const lands={W:basic('Plains','W'),U:basic('Island','U'),B:basic('Swamp','B'),R:basic('Mountain','R'),G:basic('Forest','G')};
function deck(cmd,names,landCards){
 const commander=card(cmd),spells=names.map(n=>typeof n==='string'?card(n):n);
 const sources=landCards||commander.color_identity.map(c=>lands[c]);
 return {commander,cards:[...spells,...Array.from({length:99-spells.length},(_,i)=>sources[i%sources.length])]};
}
const groups=(report,state)=>report.groups.filter(g=>g.classification===state);
const physical=report=>report.groups.flatMap(g=>g.variants);
const fixtureVariant=(id,names,results,extra={})=>normalizeVariant({id,uses:names.map(name=>({card:{name},quantity:1,zoneLocations:['B']})),
 description:'Activate the listed ability. Resolve it and repeat.',produces:results,...extra});

test('Zacama needs 11 reusable land mana in the correct colors for group damage; 12 earns surplus',()=>{
 const input=deck('Zacama',['Temur','Impact','Purphoros']);
 const report=analyzeWinConditions(input);
 const [group]=groups(report,'DIRECT WIN');
 assert.equal(report.cardCount,100);
 assert.equal(groups(report,'DIRECT WIN').length,1);
 assert.equal(group.variants.length,2);
 for(const route of group.variants){
  assert.equal(route.pieceCount,3);
  assert.equal(route.commander,true);
  assert.match(route.mana,/11 total/);
  assert.match(route.prerequisites.join(' '),/from hand/);
  assert.match(route.steps.join(' '),/\{1\}\{G\}/);
  assert.match(route.steps.join(' '),/\{6\}\{R\}\{G\}\{W\}/);
  assert.match(route.url,/215-2226/);
 }
 const base=analyzeWinConditions(deck('Zacama',['Temur']));
 assert.equal(groups(base,'DIRECT WIN').length,0);
 assert.ok(groups(base,'NEEDS PAYOFF').length);
 const blank={name:'Blank',type_line:'Artifact',oracle_text:''};
 for(const payment of [[...Array(7).fill(lands.G),lands.R,lands.W,lands.G],Array(12).fill(lands.G)]){
  const low=analyzeWinConditions({...input,cards:[card('Temur'),card('Impact'),...payment,...Array(97-payment.length).fill(blank)]});
  assert.equal(groups(low,'DIRECT WIN').length,0);
  assert.match(physical(low).find(r=>r.cards.includes('Impact Tremors')&&r.commander).prerequisites.join(' '),/needs confirmation/);
 }
 const eleven=[...Array(9).fill(lands.G),lands.R,lands.W];
 assert.equal(groups(analyzeWinConditions({...input,cards:[card('Temur'),card('Impact'),...eleven,...Array(86).fill(blank)]}),'DIRECT WIN').length,1);
});

test('Zaxara generates mana; an actual affordable lethal outlet changes the classification',()=>{
 const report=analyzeWinConditions(deck('Zaxara',['Freed']));
 assert.equal(groups(report,'DIRECT WIN').length,0);
 const engine=groups(report,'NEEDS PAYOFF')[0].variants[0];
 assert.match(engine.prerequisites.join(' '),/summoning sickness/);
 assert.equal(engine.pieceCount,2);
 assert.match(report.findings.join(' '),/Missing conversion/);
 const outlet=analyzeWinConditions(deck('Zaxara',['Freed','Exsanguinate']));
 const win=groups(outlet,'DIRECT WIN')[0].variants[0];
 assert.deepEqual(win.cards,[card('Zaxara').name,'Freed from the Real','Exsanguinate']);
 assert.match(win.setup.join(' '),/Exsanguinate · Hand/);
 assert.match(win.steps.join(' '),/highest opposing life total/);
 const ballista=analyzeWinConditions(deck('Zaxara',['Freed','Walking Ballista']));
 assert.match(groups(ballista,'DIRECT WIN')[0].variants[0].steps.join(' '),/combined opposing life totals/);
 const trap={...card('Exsanguinate'),mana_cost:'{X}{C}',name:'True colorless outlet'};
 assert.equal(groups(analyzeWinConditions(deck('Zaxara',['Freed',trap])),'DIRECT WIN').length,0);
 for(const oracle_text of ['{3}: This artifact deals 1 damage to target creature.','{2}, {T}: This artifact deals 1 damage to any target.','{2}: This artifact deals 1 damage to any target. Activate only once each turn.']){
  const blocked={...trap,type_line:'Artifact',oracle_text};
  assert.equal(groups(analyzeWinConditions(deck('Zaxara',['Freed',blocked])),'DIRECT WIN').length,0);
 }
});

test('Repercussion damages the creature’s controller, including the player casting Blasphemous Act',()=>{
 const r=analyzeWinConditions(deck('Judith',['Blasphemous','Repercussion']));
 assert.equal(groups(r,'DIRECT WIN').length,0);
 const line=physical(r).find(r=>r.variantId==='2484-4083');
 assert.equal(line.classification,'CONDITIONAL FINISHER');
 assert.match(line.mana,/minus the number of creatures/);
 assert.match(line.steps.join(' '),/per creature actually dealt damage/i);
 assert.match(line.outcome,/lethal damage to you/);
 assert.equal(line.commander,false);
});

test('Breach has finite fuel, legal escape sequencing and a delayed mill conversion; Vivi counts casts',()=>{
 const r=analyzeWinConditions(deck('Vivi',['Underworld',"Lion's",'Brain Freeze']));
 const loop=physical(r).find(v=>v.variantId==='1368-3518-4856'&&!v.commander);
 assert.equal(loop.classification,'CONDITIONAL FINISHER');
 assert.match(loop.prerequisites.join(' '),/six expendable/);
 assert.match(loop.setup.join(' '),/Brain Freeze · Graveyard/);
 assert.match(loop.steps.join(' '),/exiling three/);
 assert.match(loop.outcome,/draw from an empty library/);
 const vivi=physical(r).find(v=>v.variantId===loop.variantId&&v.commander);
 assert.match(vivi.steps.join(' '),/Storm copies are not casts/);
 assert.equal(groups(r,'DIRECT WIN').length,0);
 const partial=analyzeWinConditions(deck('Vivi',['Underworld','Brain Freeze']));
 assert.equal(groups(partial,'DIRECT WIN').length,0);
 assert.match(groups(partial,'INCOMPLETE').map(g=>g.variants[0].missing.join(' ')).join(' '),/Lion's Eye Diamond/);
});

test('Spellbook quantity, templates, commander role and missing execution evidence fail closed',()=>{
 const names=['Freed from the Real',card('Zaxara').name];
 const lethal=['Infinite damage to each opponent'];
 for(const extra of [{description:''},{requires:[{template:{name:'Unrecognized object'}}]},
  {uses:names.map((name,i)=>({card:{name},zoneLocations:['B'],quantity:i?1:2}))},
  {uses:names.map((name,i)=>({card:{name},zoneLocations:['B'],quantity:1,mustBeCommander:!i}))}]){
  const v=fixtureVariant('900-901',names,lethal,extra);
  const r=analyzeWinConditions(deck('Zaxara',['Freed']),{variants:[v]});
  assert.equal(groups(r,'DIRECT WIN').length,0);
  assert.ok(groups(r,'INCOMPLETE').some(g=>g.variants[0].variantId===v.id));
 }
});

test('Snapshot variants, value engines, independent finishers and shared essential pieces',()=>{
 const names=['Repercussion','Blasphemous Act'],a=fixtureVariant('100-101',names,['Recurring card advantage']);
 const b={...a,id:'100-102'};
 const snapshot={variants:[a,b],index:indexDiscoveryCombos([a,b])};
 const input=deck('Judith',['Blasphemous','Repercussion','Tendrils','Blood Artist']);
 const r=analyzeWinConditions(input,{snapshot});
 assert.equal(groups(r,'VALUE ENGINE').length,1);
 assert.equal(groups(r,'VALUE ENGINE')[0].variants.length,2);
 assert.ok(r.independent.some(n=>n.includes('Tendrils')));
 assert.ok(r.independent.some(n=>n.includes('Repercussion')));
 assert.ok(physical(analyzeWinConditions(deck('Zacama',['Craterhoof','Purphoros','Temur','Impact']))).some(r=>r.name.includes('Combat finisher')));
 assert.ok(physical(analyzeWinConditions(deck('Vivi',['Laboratory']))).some(r=>r.name.includes('Alternate victory')));
 const empty=analyzeWinConditions(deck('Zaxara',[]));
 assert.match(empty.findings.join(' '),/No credible finish/);
});

test('validated plain text and Architect JSON get the same final-deck analysis; seeded simulation reports assembly only',()=>{
 const input=deck('Zaxara',['Freed','Exsanguinate']),catalog=[...new Set([input.commander,...input.cards])];
 const text=['1 '+input.commander.name+' *CMDR*',...input.cards.map(c=>'1 '+c.name)].join('\n');
 const params={commanderName:input.commander.name,commanderId:input.commander.id,mode:'builder',budget:12,bracket:4};
 for(const raw of [text,JSON.stringify({deck:text,strategy:{direction:'Mana into lifedrain'}})]){
  const result=validateArchitectResult(params,raw,catalog);
  assert.ok(result.valid,result.issues?.join(' '));
  assert.equal(result.audit.count,100);
  assert.ok(result.price<=params.budget);
  assert.equal(groups(result.winConditions,'DIRECT WIN').length,1);
 }
 const lab=architectLab({...params,text,trials:100,seed:'win-assembly'},{catalog});
 const win=groups(lab.original.winConditions,'DIRECT WIN')[0];
 assert.ok(Number.isFinite(win.simulation.piecesSeenPct));
 assert.equal(win.simulation.execution,'Not modeled');
 assert.equal(win.simulation.startingStatePct,null);
 const base=groups(lab.original.winConditions,'NEEDS PAYOFF')[0];
 assert.ok(base.simulation.piecesSeenPct>=win.simulation.piecesSeenPct);
 assert.equal(win.simulation.trials,100);
});

test('generic lethal loops, ETB/sacrifice/cast payoffs, tutor targets and finite resource lookalikes',()=>{
 const engine=card('Laboratory'),part=card('Brain Freeze');
 const v=fixtureVariant('903-904',[engine.name,part.name],['Infinite damage to each opponent']);
 const pay={name:'Witness',type_line:'Enchantment',mana_cost:'{1}',oracle_text:'Whenever you sacrifice a creature, each opponent loses 1 life.'};
 const tut={name:'Find Witness',type_line:'Sorcery',oracle_text:'Search your library for an enchantment card, reveal it, then put it into your hand.'};
 const excluded={...tut,name:'Limited search',oracle_text:'Search your library for an enchantment card with mana value 4, reveal it, then put it into your hand.'};
 const input=deck('Vivi',[engine,part,pay,tut,excluded]);
 const analyze=variant=>analyzeWinConditions(input,{variants:[variant]});
 const lethal=analyze(v);
 assert.ok(groups(lethal,'DIRECT WIN').length);
 const unpayable=analyze({...v,manaNeeded:'{C}{C}'});
 assert.equal(groups(unpayable,'DIRECT WIN').length,0);
 assert.match(physical(unpayable).find(r=>r.variantId===v.id).missing.join(' '),/mana/);
 const sacrifice=analyze({...v,results:['Infinite creature sacrifice triggers']});
 const converted=physical(sacrifice).find(r=>r.cards.includes(pay.name)&&r.variantId===v.id);
 assert.ok(converted);
 assert.match(converted.guidance.join(' '),/Find Witness can search for Witness/);
 assert.doesNotMatch(converted.guidance.join(' '),/Limited search/);
 const finite=analyze({...v,results:['Near-infinite colored mana','Infinite damage to creatures']});
 assert.equal(groups(finite,'DIRECT WIN').length,0);
});

test('revision protection preserves interchangeable outlets and rejects loss of lethal conversion',()=>{
 const build=names=>analyzeWinConditions(deck('Zacama',['Temur',...names]));
 const original=build(['Impact','Warleader']);
 assert.equal(lostWinPath(original,build(['Warleader'])),undefined);
 assert.ok(lostWinPath(original,build([])));
 const suit={name:'Combat harness',type_line:'Artifact — Equipment',mana_cost:'{2}',
  oracle_text:'Equipped creature gets +3/+0.\nEquip {2}'};
 const voltron=analyzeWinConditions(deck('Zaxara',[suit]));
 const line=physical(voltron).find(v=>v.cards.includes(suit.name));
 assert.equal(line.classification,'CONDITIONAL FINISHER');
 assert.match(line.mana,/Equip \{2\}/);
 assert.match(line.outcome,/21 cumulative combat damage/);
 const attacker={name:'Infect attacker',type_line:'Artifact Creature',power:'11',mana_cost:'{12}',keywords:['Infect','Trample'],oracle_text:'Trample, infect'};
 const combat=physical(analyzeWinConditions(deck('Zaxara',[attacker]))).find(v=>v.cards.includes(attacker.name));
 assert.equal(combat.classification,'CONDITIONAL FINISHER');
 assert.match(combat.outcome,/ten poison counters/);
});

test('Zacama uses reusable land production and records the mana support needed in the starting state',()=>{
 const reflection={name:'Mana Reflection',type_line:'Enchantment',mana_cost:'{4}{G}{G}',oracle_text:'If you tap a permanent for mana, it produces twice as much of that mana instead.'};
 const inert=Array.from({length:99},(_,i)=>({name:'Blank '+i,type_line:'Artifact',oracle_text:''}));
 function withBoard(landCards,helpers){
  const cards=[card('Temur'),card('Impact'),...landCards,...helpers];
  return analyzeWinConditions({commander:card('Zacama'),cards:[...cards,...inert.slice(cards.length)]});
 }
 const six=[lands.G,lands.G,lands.R,lands.R,lands.W,lands.W];
 const out=withBoard(six,[reflection]),win=groups(out,'DIRECT WIN')[0].variants[0];
 assert.equal(win.pieceCount,4);
 assert.ok(win.setup.includes('Mana Reflection · Battlefield'));
 assert.doesNotMatch(out.findings.join(' '),/Missing conversion/);
 assert.equal(groups(withBoard(six,[]),'DIRECT WIN').length,0);
 assert.equal(groups(withBoard(Array(6).fill(lands.G),[reflection]),'DIRECT WIN').length,0);
 assert.equal(groups(withBoard(six.slice(1),[reflection]),'DIRECT WIN').length,0);
 assert.equal(groups(withBoard([...six,...six],[reflection]),'DIRECT WIN')[0].variants[0].pieceCount,3);
 const aura={name:'Wild Growth',type_line:'Enchantment — Aura',oracle_text:'Enchant land\nWhenever enchanted land is tapped for mana, its controller adds an additional {G}.'};
 assert.match(groups(withBoard([...six,...six.slice(0,4)],[aura]),'DIRECT WIN')[0].variants[0].setup.join(' '),/Wild Growth · Battlefield, enchanting/);
});

test('alternate payoffs remain visible while quality control asks for a way to reach the condition',()=>{
 const bare=analyzeWinConditions(deck('Zaxara',['Laboratory']));
 assert.equal(physical(bare).find(v=>v.cards.includes('Laboratory Maniac')&&v.setupGap).classification,'CONDITIONAL FINISHER');
 assert.match(bare.findings[0],/empty your own library/);
 assert.match(bare.findings.join(' '),/No credible finish/);
 assert.doesNotMatch(bare.findings.join(' '),/Prioritize protection/);
 assert.deepEqual(bare.independent,[]);
 const opponentMill={name:'Enemy mill',type_line:'Sorcery',oracle_text:'Target opponent mills their entire library.'};
 assert.match(analyzeWinConditions(deck('Zaxara',['Laboratory',opponentMill])).findings[0],/empty your own library/);
 const leveler={name:'Leveler',type_line:'Artifact Creature',oracle_text:'When this creature enters, exile all cards from your library.'};
 const supported=analyzeWinConditions(deck('Zaxara',['Laboratory',leveler]));
 const route=physical(supported).find(v=>v.cards.includes('Laboratory Maniac')&&v.cards.includes('Leveler'));
 assert.equal(route.classification,'CONDITIONAL FINISHER');
 assert.match(route.guidance.join(' '),/next draw attempt/);
 assert.doesNotMatch(supported.findings.join(' '),/No credible finish|First identify/);
 assert.ok(lostWinPath(supported,bare));
});

test('Repercussion shows each player’s lethal threshold and rejects incomplete scenario inputs',async()=>{
 const {repercussionDamage}=await import('../public/win-conditions.js');
 const line=physical(analyzeWinConditions(deck('Judith',['Blasphemous','Repercussion']))).find(v=>v.variantId==='2484-4083');
 assert.deepEqual(repercussionDamage(40,3,line.damagePerCreature),{damage:39,remaining:1,lethalAt:4});
 assert.deepEqual(repercussionDamage(40,4,line.damagePerCreature),{damage:52,remaining:-12,lethalAt:4});
 assert.deepEqual(repercussionDamage(26,2,line.damagePerCreature),{damage:26,remaining:0,lethalAt:2});
 assert.deepEqual(repercussionDamage(1,0,line.damagePerCreature),{damage:0,remaining:1,lethalAt:1});
 for(const [life,count] of [[NaN,2],[40,-1],[40,0.5]])assert.equal(repercussionDamage(life,count,13),null);
});
