import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCommunityConstruction,communityStrategySummary} from '../src/communityConstruction.mjs';
import {generateDeck} from '../src/generator.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';

// All names, community observations and EUR prices in these tests are synthetic.
const card=(name,type_line,oracle_text='',cmc=2,eur=.2,extra={})=>({id:name,name,type_line,oracle_text,cmc,prices:{eur},legalities:{commander:'legal'},color_identity:[],...extra});
const commander={...card('Research Commander','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy that spell.',5,.4),color_identity:['W','U','B','R','G']};
const basics=[['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']].map(([name,symbol])=>card(name,`Basic Land — ${name}`,`{T}: Add {${symbol}}.`,0,0));
const packageCards=[
 card('Community Eldrazi Alpha','Creature — Eldrazi','When you cast this spell, create two 0/1 Eldrazi Spawn creature tokens.',4,.3),
 card('Community Eldrazi Beta','Creature — Eldrazi','Whenever you cast an Eldrazi spell, create a 0/1 Eldrazi Spawn creature token.',4,.4),
 card('Community Eldrazi Gamma','Creature — Eldrazi','When you cast this spell, draw two cards.',5,.3)
];
const otherCards=[
 ...Array.from({length:80},(_,i)=>card(`Fallback Eldrazi ${i}`,'Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn creature token.',2+i%5,.1)),
 ...Array.from({length:38},(_,i)=>card(`Research Mana ${i}`,'Artifact','{T}: Add {C}.',2,.1)),
 ...Array.from({length:30},(_,i)=>card(`Research Interaction ${i}`,'Instant','Exile target creature.',2,.1)),
 ...Array.from({length:28},(_,i)=>card(`Research Draw ${i}`,'Sorcery','Draw two cards.',2,.1)),
 ...Array.from({length:25},(_,i)=>card(`Research Protect ${i}`,'Instant','Target creature gains hexproof until end of turn.',1,.1)),
 ...Array.from({length:300},(_,i)=>card(`Research Filler ${i}`,'Artifact','Scry 1.',3,.1))
];
const catalog=[commander,...basics,...packageCards,...otherCards];
function deck(id,bracket,packagePresent=true){
 const ids=packagePresent?packageCards.map(c=>c.id):[];
 // Nonidentical source lists, with coherent package present in four of eight.
 ids.push(...otherCards.slice(225+id*12,225+id*12+12).map(c=>c.id),...otherCards.slice(0,20).map(c=>c.id));
 return {key:`archidekt:${4000+id}`,validated:true,commanderIds:[commander.id],edhBracket:bracket,
  owner:`brewer${id}`,title:'Synthetic public-list fixture',mainboard:ids.map(id=>({id,quantity:1}))};
}
const research=[...Array.from({length:8},(_,i)=>deck(i,3,i<5)),deck(8,4,true)];

function chosenIds(report){return report.deck.split('\n').slice(1).map(line=>line.slice(2));}

test('v1.0 derives bracket-matched, source-attributed packages without treating other-bracket data as evidence',()=>{
 const prepared=prepareCommunityConstruction({decks:research,commander,bracket:3,catalog});
 assert.equal(prepared.status,'ready',prepared.reason);
 assert.equal(prepared.sampleSize,8);
 assert.ok(prepared.candidates.some(c=>c.packages.some(p=>p.ids.length>=2)),JSON.stringify(prepared.candidates));
 assert.ok(prepared.selected.sourceDecks.every(k=>k!=='archidekt:4008'));
 const summary=communityStrategySummary(prepared);
 assert.equal(summary.status,'ready');
 assert.ok(!('cardIndex' in summary),'do not expose catalog maps in API');
 assert.ok(summary.candidates.length>=1);
 assert.equal(prepareCommunityConstruction({decks:research,commander,bracket:2,catalog}).status,'insufficient');
 assert.equal(prepareCommunityConstruction({decks:research,commander,bracket:3,catalog,mode:'off'}).status,'disabled');
});

test('v1.0 community path builds legal, bounded, source-attributed deck; local-only A/B works',()=>{
 const prepared=prepareCommunityConstruction({decks:research,commander,bracket:3,catalog});
 const shared={cards:catalog,commander,budget:191,bracket:3,powerTarget:'high'};
 const a=generateDeck({...shared,communityBuild:prepared});
 const b=generateDeck({...shared,communityBuild:{status:'disabled',reason:'local A/B baseline'}});
 assert.notEqual(a.deck,b.deck,'source-supported strategy must influence construction rather than just diagnostics');
 assert.equal(a.communityConstruction.mode,'community-informed');
 assert.equal(b.communityConstruction.mode,'local-only');
 assert.equal(a.totalCards,100);
 assert.equal(a.landCount,37);
 assert.ok(a.price<=191);
 assert.equal(a.deck.split('\n').length,100);
 assert.equal(validateCommanderSingleton(commander,chosenIds(a).map(name=>catalog.find(c=>c.name===name))).valid,true);
 assert.ok(a.communityConstruction.committedPackages.length>0,JSON.stringify(a.communityConstruction));
 for(const pack of a.communityConstruction.committedPackages){
  for(const name of pack.cards)assert.ok(chosenIds(a).includes(name),`committed member ${name} must survive optimizer`);
  assert.ok(pack.sourceDecks.length>=2);
 }
 assert.equal(a.deck,generateDeck({...shared,communityBuild:prepared}).deck,'deterministic community build');
});

test('atomic community package skips over-quota combined game changers without interrupting generation',()=>{
 const gcs=[card('Expensive synergy A','Creature — Eldrazi','Whenever you cast an Eldrazi spell, draw a card.',3,.2,{game_changer:true}),
  card('Expensive synergy B','Creature — Eldrazi','Whenever you cast an Eldrazi spell, draw a card.',3,.2,{game_changer:true})];
 const ids=gcs.map(c=>c.id),sourceDecks=['archidekt:1','archidekt:2','archidekt:3'];
 const communityBuild={status:'ready',sampleSize:8,highConfidence:false,maxSeedCards:3,selected:{id:'forced',label:'Atomic GC boundary',sourceDecks,packages:[{ids,sourceDecks,support:3}],cardIds:ids}};
 const a=generateDeck({cards:[...catalog,...gcs],commander,budget:191,bracket:2,communityBuild});
 assert.equal(a.totalCards,100);
 assert.ok(a.communityConstruction.skipped.some(x=>/Game Changer/.test(x.reason)),JSON.stringify(a.communityConstruction));
 assert.ok(!a.communityConstruction.added.some(name=>ids.includes(name)));
});
