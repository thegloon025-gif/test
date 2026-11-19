import test from 'node:test';
import assert from 'node:assert/strict';
import {validateArchitectResult} from '../src/aiArchitect.mjs';
import {reviewArchitectCards} from '../src/architectInvestment.mjs';
import {normalizeVariant} from '../src/combos.mjs';
import {roleEvidence} from '../src/roleEvidence.mjs';

function card(name,type,cost,mv,text,price=0,colors=[],fields={}){
 return {id:name,name,type_line:type,mana_cost:cost,cmc:mv,oracle_text:text,
  colors,color_identity:colors,legalities:{commander:'legal'},prices:{eur:price},printing:{eligibleVersion:2},
  ...fields};
}
const basic=(name,color)=>card(name,'Basic Land — '+name,'',0,'{T}: Add {'+color+'}.',0,[],{color_identity:[color]});
const forest=basic('Forest','G'),plains=basic('Plains','W'),mountain=basic('Mountain','R');
const zacama=card('Zacama, Primal Calamity','Legendary Creature — Elder Dinosaur','{6}{R}{G}{W}',9,
 'When Zacama enters, if you cast it, untap all lands you control.',9.10,['R','G','W']);
const gaze=card('Gaze of Justice','Sorcery','{W}',1,
 'As an additional cost to cast this spell, tap three untapped white creatures you control.\nExile target creature.\nFlashback {5}{W}.',.07,['W']);
const crown=card('Mindstorm Crown','Artifact','{3}',3,
 'At the beginning of your upkeep, draw a card if you had no cards in hand at the beginning of this turn. If you had a card in hand, this artifact deals 1 damage to you.',.14);
const conviction=card('Test of Conviction','Sorcery','{1}{W}',2,
 'Choose one —\n• Battle Stations — Put a +1/+1 counter on each creature you control.\n• Begin Negotiations — Target opponent draws a card. You draw two cards.',.03,['W']);
const voice=card('Tormenting Voice','Sorcery','{1}{R}',2,
 'As an additional cost to cast this spell, discard a card.\nDraw two cards.',.04,['R']);
const rhythm=card('Biorhythm','Sorcery','{6}{G}{G}',8,"Each player's life total becomes the number of creatures they control.",10.29,['G'],{game_changer:true});
const replayCards=[gaze,crown,conviction,voice];
const greenWhiteIdentity=card('Green Mana Creature','Creature — Druid','{G}',1,
 '{T}: Add {G}.\n{W}: This creature gets +1/+1 until end of turn.',.15,['G'],{color_identity:['G','W']});
const gift=card('Gifted Troops','Sorcery','{1}{W}',2,
 'Target opponent creates three 1/1 white Spirit creature tokens. Draw a card.',.10,['W']);
const landEngine=card('Return Engine','Creature — Cat','{3}{G}',4,"{2}: Return another creature you control to its owner's hand.",1.25,['G']);
const damage=card('Repeatable Damage Payoff','Instant','{X}{R}{R}',2,'This spell deals X damage to each opponent.',2,['R']);
const lands=[...Array(13).fill(forest),...Array(13).fill(plains),...Array(12).fill(mountain)];
const fillers=Array.from({length:53},(_,i)=>card('Fixture artifact '+i,'Artifact','{3}',3,'',.50));
const main=[...lands,...replayCards,rhythm,greenWhiteIdentity,landEngine,damage,...fillers];
const catalog=[...new Set([zacama,...main])];
const deck=[`1 ${zacama.name} *CMDR*`,...main.map(c=>'1 '+c.name)].join('\n');
const total=[zacama,...main].reduce((n,c)=>n+Math.round(c.prices.eur*100),0)/100;
const params={mode:'builder',commanderName:zacama.name,budget:total,bracket:4,pricingMode:'scryfall_eur'};
const line=normalizeVariant({id:'900017',uses:[zacama,landEngine].map(c=>({card:{name:c.name}})),produces:['Infinite red mana.']});
const replacements=[
 card('Open Creature Removal','Instant','{W}',1,'Exile target creature.',.03,['W']),
 card('Limited Permanent Removal','Instant','{W}',1,'Exile target permanent with mana value 1.',.01,['W']),
 card('Steady Draw','Enchantment','{2}{G}',3,'At the beginning of your upkeep, draw a card.',.14,['G']),
 card('Direct Draw','Sorcery','{2}{R}',3,'Draw two cards.',.03,['R']),
 card('Efficient Draw','Sorcery','{1}{G}',2,'Draw two cards.',.02,['G']),
];

test('Zacama review distinguishes printed color from identity and catches the exact four Oracle costs or trade-offs',()=>{
 const audit=reviewArchitectCards({commander:zacama,cards:[...main.slice(0,-1),gift],variants:[line]});
 const entry=name=>audit.entries.find(row=>row.card===name);
 assert.equal(entry(gaze.name).status,'uncastable');
 assert.match(entry(gaze.name).reasons.join(' '),/tap 3 white creatures.*0 early and 1 total/i);
 assert.equal(entry(crown.name).status,'weak-synergy');
 assert.match(entry(crown.name).reasons.join(' '),/empty hand.*damage to you/i);
 assert.equal(entry(conviction.name).status,'weak-synergy');
 assert.match(entry(conviction.name).reasons.join(' '),/opponent a card.*few reliable targets/i);
 assert.equal(entry(voice.name).status,'weak-synergy');
 assert.match(entry(voice.name).reasons.join(' '),/only replaces.*graveyard payoff/i);
 assert.equal(entry(rhythm.name).status,'situational');
 assert.ok(entry(rhythm.name).jobs.includes('Win conversion'));
 assert.equal(audit.comboRoutes,1);
 assert.equal(audit.checked,100);
 assert.ok(audit.winConditions.includes(damage.name));
});

test('different deck contexts justify the same spell, token costs, optional costs and graveyard filtering',()=>{
 const tokenCommander=card('Token Commander','Legendary Creature — Human','{R}{W}',2,
 'When this creature enters, create two 1/1 white Soldier creature tokens.',2,['R','W']);
 const tokens=card('Reinforcements','Sorcery','{1}{W}',2,'Create three 1/1 white Soldier creature tokens.',.20,['W']);
 const optional=card('Ally Response','Instant','{2}{W}',3,
  "You may sacrifice a nontoken white creature rather than pay this spell's mana cost.\nExile target creature.",.20,['W']);
 const engine=card('Creature Dependent Artifact','Artifact','{1}',1,'Tap three untapped red creatures you control: Draw two cards.');
 const duplicate=card('Duplicate Dependent Artifact','Artifact','{1}',1,
  "{2}, {T}: Target creature can't be blocked this turn.\n{1}, {T}, Discard a legendary card with the same name as a legendary permanent you control: Draw two cards.");
 const looter=card('Recurring Filter','Creature — Human','{1}{R}',2,
  'At the beginning of your upkeep, discard up to two cards, then draw that many cards.',.20,['R']);
 const graveyard=[1,2,3,4].map(i=>card('Discard Payoff '+i,'Instant','{2}{R}',3,
  'Madness {R} (If you discard this card, discard it into exile.)',0,['R']));
 const rows=reviewArchitectCards({commander:tokenCommander,cards:[plains,mountain,gaze,conviction,voice,tokens,optional,engine,duplicate,looter,...graveyard]}).entries;
 const entry=name=>rows.find(row=>row.card===name);
 assert.notEqual(entry(gaze.name).status,'uncastable');
 assert.match(entry(gaze.name).casting[0],/6 early and 6 total/);
 assert.equal(entry(conviction.name).status,'situational');
 assert.match(entry(conviction.name).reasons[0],/supports the team mode/);
 assert.equal(entry(voice.name).status,'situational');
 assert.match(entry(voice.name).reasons[0],/synergies give the exchange a purpose/);
 assert.equal(entry(optional.name).status,'situational');
 assert.match(entry(optional.name).casting.at(-1),/Optional alternative cost/);
 assert.equal(entry(engine.name).status,'weak-synergy');
 assert.match(entry(engine.name).activation[0],/tap 3 red creatures/);
 assert.match(entry(duplicate.name).activation[0],/needs matching card names.*no qualifying duplicates/i);
 assert.match(entry(looter.name).reasons[0],/replaces the discarded cards/);
 const offColor=reviewArchitectCards({commander:tokenCommander,cards:[plains,rhythm]}).entries.at(-1);
 assert.equal(offColor.status,'illegal');
});

test('connected Builder at its exact ceiling uses findings to replace all four cards and protects the combo',()=>{
 const result=validateArchitectResult(params,deck,[...catalog,...replacements],[line],{optimizeBudget:true});
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.audit.count,100);
 assert.equal(result.cardQuality.checked,100);
 assert.equal(result.cardQuality.corrected,4,JSON.stringify(result.cardQuality.initialFindings));
 assert.ok(result.price<=total);
 assert.equal(result.cardQuality.counts.illegal+result.cardQuality.counts.uncastable+result.cardQuality.counts['weak-synergy'],0);
 assert.equal(result.cardQuality.comboRoutes,1);
 assert.match(result.deck,new RegExp(landEngine.name));
 assert.match(result.deck,new RegExp(damage.name));
 assert.match(result.deck,/Biorhythm/);
 assert.equal(result.cardQuality.entries.reduce((n,row)=>n+row.quantity,0),100);
 assert.deepEqual(new Set(result.budgetOptimization.accepted.flatMap(row=>row.cuts)),new Set(replayCards.map(c=>c.name)));
 assert.equal(roleEvidence(replacements[1]).removal,'conditional');
 assert.equal(roleEvidence(replacements[0]).removal,'broad');
 for(const [oracle,removal] of [
  ["Exile target creature that's attacking you or a planeswalker you control.",'conditional'],
  ['Exile target creature you own, then return it to the battlefield under your control.','none'],
  ['Exile target nonland permanent. For as long as that card remains exiled, its owner may play it.','conditional'],
  ['Counter target spell that targets you.','conditional'],
 ])assert.equal(roleEvidence(card('Answer Fixture','Instant','{W}',1,oracle)).removal,removal);
 assert.match(result.deck,/Open Creature Removal/);
 assert.doesNotMatch(result.deck,/Limited Permanent Removal/);

 const manual=validateArchitectResult(params,deck,[...catalog,...replacements],[line]);
 assert.equal(manual.valid,true);
 assert.match(manual.deck,/Gaze of Justice/);
 assert.equal(manual.cardQuality.counts.uncastable,1);
});

test('Biorhythm keeps its catalog legality and counts toward Bracket 3 Game Changers',()=>{
 const pricey=fillers.slice(0,3).map(c=>({...c,game_changer:true}));
 const pricedCatalog=catalog.map(c=>pricey.find(p=>p.id===c.id)||c);
 for(const bracket of [3,4]){
  const result=validateArchitectResult({...params,bracket},deck,pricedCatalog,[line]);
  assert.equal(result.valid,bracket===4,JSON.stringify(result.issues));
  if(result.valid)assert.match(result.deck,/Biorhythm/);
  else assert.match(result.issues.join(' '),/Game Changer/i);
 }
});
