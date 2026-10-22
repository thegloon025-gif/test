/** Explicit conditional craft/untap example, not an earliest/reliable turn.
 * node tools/verify-b4-craft-example.mjs CACHE_DIR DECK_TXT OUTPUT_JSON */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {payExecutionCost} from '../src/strategyExecution.mjs';
import {isLandSlot,faces} from '../src/cards.mjs';
const [cache,deckFile,output]=process.argv.slice(2);if(!output)throw Error('Supply CACHE_DIR DECK_TXT OUTPUT_JSON');
const catalog=JSON.parse(await readFile(cache+'/cards.json')),byName=new Map(catalog.map(c=>[c.name,c]));
const names=(await readFile(deckFile,'utf8')).trim().split('\n').map(l=>l.replace(/^1 /,'').replace(/ \*CMDR\*$/,''));
assert.equal(names.length,100);const required=['Island','Wastes','Mountain','Forest','Plains','The Enigma Jewel // Locus of Enlightenment','Sol Ring','Mind Stone','Arcane Signet','Talisman of Curiosity','Basalt Monolith'];
assert.ok(required.every(n=>names.includes(n)));assert.ok(names.filter(n=>n==='Wastes').length>=2);
const jewel=byName.get(required[5]),[front,back]=faces(jewel);
assert.equal(jewel.layout,'transform');assert.match(front.oracle_text,/Craft with four or more nonlands with activated abilities \{8\}\{U\}/);
assert.match(front.oracle_text,/Spend this mana only to activate abilities/);
assert.match(back.oracle_text,/Whenever you activate an ability that isn't a mana ability, copy it/);
const fuel=['Sol Ring','Mind Stone','Arcane Signet','Talisman of Curiosity'];
for(const n of fuel){assert.ok(!isLandSlot(byName.get(n)));assert.match(byName.get(n).oracle_text,/\{T\}[^\n]*:/);}
assert.match(byName.get('Basalt Monolith').oracle_text,/\{3\}: Untap/);
const unit=(name,...options)=>({name,units:1,options}),I=unit('Island','U'),W1=unit('Wastes #1','C'),M=unit('Mountain','R'),F=unit('Forest','G');
const ring={name:'Sol Ring',units:2,options:['C']},stone=unit('Mind Stone','C'),signet=unit('Arcane Signet','W','U','B','R','G'),talisman=unit('Talisman of Curiosity','C');
let ledger=[];
function pay(turn,card,sources,cost=byName.get(card).mana_cost,kind='spell'){
 const rest=payExecutionCost(cost,sources);assert.notEqual(rest,null,`Cannot pay ${card} on turn ${turn}`);ledger.push({turn,card,kind,cost,sources,remaining:rest});return rest;
}
pay(1,jewel.name,[I],front.mana_cost);
let pool=pay(2,'Sol Ring',[I,W1]);pool.push(ring);pay(2,'Mind Stone',pool);
pool=pay(3,'Arcane Signet',[I,W1,M,ring,stone]);pay(3,'Talisman of Curiosity',pool);
pay(4,'Basalt Monolith',[I,W1,M,F,ring,stone,signet,talisman]);
const jewelMana={name:'Enigma Jewel (activated abilities only)',units:2,options:['C']};
pay(6,'Craft into Locus of Enlightenment',[I,W1,ring,stone,signet,talisman,jewelMana],'{8}{U}','activated ability (restricted Jewel mana permitted)');
// A second ledger deliberately demonstrates why a later possible line
// cannot establish a pod timing floor. These draws also permit faster setup.
const laterLedger=ledger;ledger=[];
pay(1,jewel.name,[I],front.mana_cost);
pool=pay(2,'Sol Ring',[I,W1]);pool.push(ring);pool=pay(2,'Mind Stone',pool);pool.push(stone);pay(2,'Arcane Signet',pool);
pool=pay(3,'Talisman of Curiosity',[I,W1,M,ring,stone,signet]);pay(3,'Basalt Monolith',pool);
pay(4,'Craft into Locus of Enlightenment',[I,W1,ring,stone,signet,talisman,jewelMana],'{8}{U}','activated ability');
const earlierConditionalLedger=ledger;ledger=laterLedger;
const report={status:'conditional exact-payment and declared setup ledger checked',conditionalTurn:6,earlierConditionalExample:{turn:4,ledger:earlierConditionalLedger,note:'Same stipulated favorable draws, more aggressive use of immediate artifact mana. This is not an earliest or reliable turn.'},earliestTurn:null,reliableTurn:null,executionVerified:false,podClassification:null,
 verifierSHA256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),combo:'https://commanderspellbook.com/combo/74-4131/',
 assumptions:['No interaction, taxes, replacement effects or disrupted sources; the stipulated cards are drawn in the stated order.',
  'Opening seven: Island, Wastes, Mountain, The Enigma Jewel, Sol Ring, Mind Stone, Arcane Signet.',
  'Draw T1 Talisman of Curiosity, T2 Forest, T3 Basalt Monolith, T4 Plains, T5 a second Wastes; T6 draw unused.',
  'Play lands T1 Island, T2 Wastes, T3 Mountain, T4 Forest, T5 Plains, T6 Wastes. Untap normally; do not carry mana between turns.',
  'Enigma Jewel enters tapped on T1. Its restricted mana is used ONLY for the T6 craft activated ability, never for a spell.',
  'Basalt Monolith is cast T4 and kept untapped; it is NOT used as craft fuel or to pay the craft activation.'],ledger,
 craftResources:{cost:'{8}{U}',exileSelf:front.name,additionalNonlandsWithActivatedAbilities:fuel,
  note:'Tap these four resources for mana before paying craft, then exile them as part of its cost. They are consumed, not retained mana sources. Return the Jewel transformed; craft only as a sorcery.'},
 loop:['With Locus on the battlefield and the separate Basalt untapped, tap Basalt for {C}{C}{C}.',
  'Pay {3} for Basalt’s own untap ability. Locus triggers to copy this nonmana ability.',
  'Resolve the copy to untap Basalt. Tap it for {C}{C}{C} before resolving the original untap ability, then resolve that original to untap Basalt again.',
  'Repeat: the external Basalt ability is not a Locus-inherited once-per-turn ability. Mana abilities are not copied. Net output is three {C} per repetition.'],
 conversion:{status:'not verified',directWin:false,note:'The two-card loop produces mana only. Craft consumed four support cards. Extra creatures/tokens, colored mana and an available outlet are not supplied for free; this example proves no winning line.'},
 scope:'A deliberately stipulated T6 example, including four additional consumed nonlands. It may have earlier possible setups; no earliest or reliable turn and no pod-policy eligibility are inferred.'};
await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(report.status);
