import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDeck} from '../src/generator.mjs';
import {rankPackageNetwork,completeNetworkPackages} from '../src/packageNetwork.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';

// Synthetic catalog and EUR prices for controlled algorithm regressions ONLY.
// Spellbook shapes are based on the saved real response, but none of these
// synthetic names/prices are claimed to be existing MTG cards.
function c(name,type_line,oracle_text='',cmc=2,eur=.2){return {id:name,name,type_line,oracle_text,cmc,prices:{eur},legalities:{commander:'legal'},color_identity:[],edhrec_rank:null};}
const commander={...c('Network Test Commander','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy that spell.',5,.5),color_identity:['W','U','B','R','G']};
function catalog(){
 const arr=[commander];
 for(const [name,color] of [['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']])arr.push(c(name,`Basic Land — ${name}`,`{T}: Add {${color}}.`,0,0));
 for(let i=0;i<75;i++)arr.push(c(`Generic Eldrazi ${i}`,'Creature — Eldrazi','When you cast this spell, create two 0/1 Eldrazi Spawn creature tokens.',2+i%5));
 for(let i=0;i<35;i++)arr.push(c(`Mana source ${i}`,'Artifact','{T}: Add {C}.',2));
 for(let i=0;i<25;i++)arr.push(c(`Counter ${i}`,'Instant','Counter target spell.',2));
 for(let i=0;i<20;i++)arr.push(c(`Permanent removal ${i}`,'Instant','Exile target creature.',2));
 for(let i=0;i<25;i++)arr.push(c(`Draw source ${i}`,'Instant','Draw two cards.',2));
 for(let i=0;i<20;i++)arr.push(c(`Protect ${i}`,'Instant','Target creature gains hexproof until end of turn.',1));
 for(let i=0;i<260;i++)arr.push(c(`Discard filler ${i}`,'Artifact','Scry 1.',3));
 return arr;
}
const fixtures=catalog();
const hub=c('Network Junction','Creature — Eldrazi','Whenever you cast an Eldrazi spell, create two 0/1 Eldrazi Spawn tokens.',4,.4);
const a=c('Network Arm A','Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn token.',4,.3);
const b=c('Network Arm B','Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn token.',5,.3);
const d=c('Network Arm C','Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn token.',6,.3);
const variants=[a,b,d].map((arm,i)=>({id:`network-${i}`,cards:[commander.name,hub.name,arm.name],uses:[commander,hub,arm].map(c=>({name:c.name,quantity:1,zoneLocations:['B']})),templateRequirements:[],identity:'WUBRG',legalities:{commander:true},isInfinite:true,results:[i===1?'Infinite damage':'Infinite creature tokens'],prerequisites:['A suitable Eldrazi spell and enough colorless mana'] }));

test('network score distinguishes noncommander links and incremental completed combinations',()=>{
 const chosen=[commander,hub];
 const p1={id:'A',memberIds:[commander.id,hub.id,a.id],added:[a],merit:30,results:['Infinite damage']};
 const p2={id:'B',memberIds:[commander.id,hub.id,b.id],added:[b],merit:30,results:['Infinite creature tokens']};
 const p3={id:'C',memberIds:[commander.id,d.id],added:[d],merit:30};
 const scored=rankPackageNetwork([p1,p2,p3],chosen,commander);
 assert.equal(scored[0].sharedLinks,1);
 assert.equal(scored.at(-1).sharedLinks,0,'sharing only the commander must not count as a link');
 assert.equal(completeNetworkPackages([p1,p2],chosen,commander).length,0);
 assert.equal(completeNetworkPackages([p1,p2],[...chosen,a],commander).length,1);
});

test('B4 optimized selects overlapping eligible Eldrazi engines while protecting legal deck requirements',()=>{
 const cards=[...fixtures,hub,a,b,d];
 const deck=generateDeck({cards,commander,bracket:4,budget:191,comboVariants:variants});
 assert.equal(deck.totalCards,100);assert.equal(deck.landCount,36);
 assert.ok(deck.price<=191);assert.equal(deck.gameChangers,0);
 assert.ok(deck.comboPlan.selected.length>=2,JSON.stringify(deck.comboPlan.network));
 assert.ok(deck.comboPlan.network.completeEligibleNetworks>=2,JSON.stringify(deck.comboPlan.network));
 assert.ok(deck.comboPlan.network.newCards<=8);
 assert.ok(deck.comboPlan.inventoryComplete>=2,JSON.stringify(deck.comboPlan));
 assert.ok(deck.qualityAudit.earlyMana>=8);
 assert.ok(deck.qualityAudit.interaction>=8);
 assert.ok(deck.needs.some(x=>x.label.includes('Eldrazi')&&x.actual>=21));
 assert.equal(deck.deck.split('\n').length,100);
 assert.equal(deck.deck,generateDeck({cards,commander,bracket:4,budget:191,comboVariants:variants}).deck,'offline deterministic');
 assert.ok(validateCommanderSingleton(commander,deck.sections.spells.map(n=>cards.find(c=>c.name===n)).concat(deck.sections.lands.map(n=>cards.find(c=>c.name===n)))).valid);
});

test('B3 conservatively excludes two-card infinity, B4 admits on-plan colorless-mana engine',()=>{
 const cards=[...fixtures];
 const engine=c('Generic Combo Rock','Artifact','{T}: Add {C}{C}{C}. {3}: Untap this artifact.',3,.4);
 const amplifier=c('Generic Colorless Mana Amplifier','Artifact','If you tap a permanent for {C}, add an additional {C}.',5,.5);
 cards.push(engine,amplifier);
 const variant={id:'two-card-colorless',cards:[engine.name,amplifier.name],uses:[engine,amplifier].map(c=>({name:c.name,quantity:1,zoneLocations:['B']})),identity:'C',templateRequirements:[],legalities:{commander:true},isInfinite:true,results:['Infinite colorless mana'],prerequisites:['Both artifacts on battlefield']};
 const b3=generateDeck({cards,commander,bracket:3,powerTarget:'high',budget:191,comboVariants:[variant]});
 const b4=generateDeck({cards,commander,bracket:4,budget:191,comboVariants:[variant]});
 assert.equal(b3.comboPlan.selected.length,0);
 assert.equal(b3.comboPlan.candidatePackages,0);
 assert.equal(b4.comboPlan.candidatePackages,1,JSON.stringify(b4.comboPlan));
 assert.ok(b4.comboPlan.selected.some(x=>x.id===variant.id),JSON.stringify(b4.comboPlan.network));
 assert.ok(b4.sections.spells.includes(engine.name)&&b4.sections.spells.includes(amplifier.name));
});

test('missing offline Spellbook data leaves package count zero; no fabricated variants',()=>{
 const deck=generateDeck({cards:fixtures,commander,bracket:4,budget:191});
 assert.equal(deck.comboPlan.knownVariants,0);
 assert.equal(deck.comboPlan.network.packagesCommitted,0);
 assert.equal(deck.comboPlan.inventoryComplete,0);
});
