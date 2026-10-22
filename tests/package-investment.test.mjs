import test from 'node:test';
import assert from 'node:assert/strict';
import {refinePackageInvestments,investmentEvidence,selectInvestmentDeck,manaCapacity} from '../src/packageInvestment.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {withSelectedCards} from '../src/deckSelection.mjs';

const card=(name,type_line='Artifact',oracle_text='Scry 1.',cmc=2,price=.1,extra={})=>({id:name,name,type_line,oracle_text,cmc,prices:{eur:price},color_identity:[],legalities:{commander:'legal'},...extra});
const commander=card('Package Commander','Legendary Creature — Zombie','Whenever another Zombie you control dies, create a Zombie token.',4,1,{color_identity:['U','B','G']});
const land=card('Island','Basic Land — Island','{T}: Add {U}.',0,0);
const lands=Array(37).fill(land);
const filler=Array.from({length:62},(_,i)=>card('Filler '+i));
const built=(spells=filler)=>({status:'ok',strategy:'fixture',cards:[...spells,...lands],price:1+spells.reduce((n,c)=>n+c.prices.eur,0),committedCombos:[]});
const opts={commander,budget:191,bracket:4,maxRounds:2,beamWidth:2,maxEvaluations:32};
const ramp=card('Sustained two mana','Artifact','{T}: Add {C}{C}.',2,40);
const draw=card('Repeatable draw','Artifact','{T}: Draw a card.',2,35);

test('a weaker EUR108 deck cannot beat a functionally dominant EUR183 deck through the old scalar score',()=>{
 const weak=card('Costly filler','Artifact','Scry 1.',2,100.9);
 const cheap=built([weak,...filler.slice(1)]);assert.ok(Math.abs(cheap.price-108)<.001);
 const stronger={...cheap,cards:[cheap.cards[0],...cheap.cards.slice(3),ramp,draw],price:182.8,strategy:'stronger'};
 // Price comes from actual records: adjust the synthetic premium prices so
 // the stronger deck really costs EUR182.80 without changing its functions.
 const exact=1+stronger.cards.reduce((n,c)=>n+(c.prices.eur||0),0);assert.ok(Math.abs(exact-182.8)<.001);
 const selected=selectInvestmentDeck([cheap,stronger],{commander,score:cards=>cards.includes(ramp)?-100:1000});
 assert.equal(selected,stronger);
 const overpricedSame={...cheap,price:190,strategy:cheap.strategy};
 assert.equal(selectInvestmentDeck([cheap,overpricedSame],{commander}),cheap,'price alone earns no preference');
 assert.equal(selectInvestmentDeck([overpricedSame,cheap],{commander}),overpricedSame,'ties retain stable input order, not a cost preference');
});

test('accept a coordinated affordable investment, reconcile exact selected records, and remain deterministic',()=>{
 const input=built();const options={...opts,built:input,pool:[...filler,ramp,draw],score:cards=>cards.includes(ramp)?-100:100};
 const r=refinePackageInvestments(options);
 assert.ok(r.cards.includes(ramp)&&r.cards.includes(draw));
 assert.ok(r.packageInvestment.accepted.some(p=>p.adds.length===2));
 assert.equal(validateCommanderSingleton(commander,r.cards).valid,true);assert.equal(r.cards.length,99);
 const deck=withSelectedCards({deck:[commander,...r.cards].map(c=>'1 '+c.name).join('\n'),price:r.price,budget:191},commander,r.cards);
 const audit=auditExportPricing(deck,commander,[commander,land,...filler,ramp,draw]);
 assert.equal(audit.withinBudget,true);assert.equal(audit.agreesWithGenerator,true);assert.equal(audit.count,100);
 assert.deepEqual(refinePackageInvestments(options).cards,r.cards);assert.equal(input.cards.includes(ramp),false);
});

test('a package can enable an engine whose support is below threshold before the atomic change',()=>{
 const zombies=Array.from({length:7},(_,i)=>card('Zombie '+i,'Creature — Zombie','Menace',2,.1));
 const input=built([...zombies,...filler.slice(7)]);
 const engine=card('Tribal draw','Enchantment','Whenever a creature you control of the chosen type enters, draw a card.',3,20);
 const newCreature=card('Support Zombie','Creature — Zombie','Flying',2,25);
 const r=refinePackageInvestments({...opts,built:input,pool:[...zombies,...filler,engine,newCreature],packages:[{id:'tribal-engine',cards:[engine.name,newCreature.name]}]});
 assert.ok(r.cards.includes(engine)&&r.cards.includes(newCreature));
 assert.ok(r.packageInvestment.after.vector.supportedEngines>r.packageInvestment.before.vector.supportedEngines);
});

test('hard ceiling, committed pieces, combo restrictions and singleton remain gates on entire packages',()=>{
 const input={...built(),committedCombos:[{cards:filler.slice(0,4).map(c=>c.name)}]};
 const expensive={...draw,id:'Beyond cap',name:'Beyond cap',prices:{eur:200}};
 const r=refinePackageInvestments({...opts,built:input,pool:[ramp,draw,expensive],comboViolation:cards=>cards.includes(ramp)&&cards.includes(draw)?{id:'forbidden'}:null});
 assert.ok(!(r.cards.includes(ramp)&&r.cards.includes(draw)));assert.ok(!r.cards.includes(expensive));
 assert.ok(filler.slice(0,4).every(c=>r.cards.includes(c)));assert.ok(r.price<=191);
 assert.equal(validateCommanderSingleton(commander,r.cards).valid,true);
});

test('do not substitute quoted token mana, resource-limited mana or unsupported draw for reliable functions',()=>{
 const token=card('Token factory','Artifact','{3}, {T}: Create a token with "{T}: Add {C}{C}{C}."',2,1);
 const counter=card('Counter rock','Artifact','{T}, Remove a charge counter from this artifact: Add {C}{C}.',2,1);
 const conditional=card('Enchantment dependent','Creature — Merfolk','Whenever you cast your first enchantment spell each turn, draw a card.',3,1);
 const wrongTribe=card('Elf dependent','Creature — Elf','Whenever you cast an Elf spell, you may pay {G}. If you do, draw a card.',2,1);
 const loot=card('Loot dependent','Enchantment','Whenever you cast a noncreature spell, you may discard a card. If you do, draw a card.',2,1);
 const treasure=card('Treasure dependent','Creature — Human','Whenever you cast a spell, if mana from a Treasure was spent to cast it, draw a card.',3,1);
 const adventure=card('Adventure dependent','Creature — Human','Whenever you cast a creature spell that has an Adventure, draw a card.',1,1);
 const temporary=card('Temporary engine','Sorcery','Whenever you cast a creature spell this turn, draw a card.',1,1);
 const restrictive=card('Restrictive engine','Enchantment',"You can't cast more than one spell each turn.\nWhenever you cast a spell, draw a card.",3,1);
 const counters=card('Counter dependent','Creature — Human','Whenever you cast a spell that targets this creature, put a counter on it.\n{T}, Remove two counters from this creature: Draw a card.',2,1);
 assert.equal(manaCapacity(card('Delayed rock','Artifact','Suspend 3—{0}\n{T}: Add one mana of any color.',0,1)).fast,0);
 assert.equal(manaCapacity(card('Legend dependent','Artifact','{T}: Add one mana of any color among legendary creatures and planeswalkers you control.',0,1)).fast,0);
 assert.equal(manaCapacity(card('Mill rock','Creature — Human','{T}, Mill a card: Add {C}. (Activate only as an instant. To mill a card, put the top card of your library into your graveyard.)',2,1)).colorless,1);
 assert.equal(manaCapacity(token).units,0);assert.equal(manaCapacity(counter).units,0);
 for(const c of [conditional,counters,wrongTribe,loot,treasure,adventure,temporary,restrictive])assert.equal(investmentEvidence([c,...filler,...lands],commander).vector.supportedEngines,0);
 const input=built(),out=refinePackageInvestments({...opts,built:input,pool:[token,counter,conditional,counters]});
 assert.deepEqual(out.cards,input.cards);assert.ok(Math.abs(out.price-input.price)<.000001);
});

test('a core-role surplus cannot erase losses in other complete-deck functions',()=>{
 const weak=built();
 const engine=card('Native engine','Creature — Zombie','Flying',6,30,{power:'8'});
 const threatDeck={...weak,cards:[...weak.cards.slice(1),engine],strategy:'native'};
 const drawDeck={...weak,cards:[...weak.cards.slice(1),draw],strategy:'flow'};
 // These are incomparable, so retain the existing scorer rather than
 // silently assigning draw precedence over the native threat strategy.
 assert.equal(selectInvestmentDeck([threatDeck,drawDeck],{commander,score:cards=>cards.includes(engine)?100:0}),threatDeck);
});

test('an additional expensive threat requires a mana partner in the complete investment',()=>{
 const threat=card('Huge Zombie','Creature — Zombie','Annihilator 4',10,70);
 const input=built();
 const alone=refinePackageInvestments({...opts,built:input,pool:[threat]});
 assert.ok(!alone.cards.includes(threat));
 const together=refinePackageInvestments({...opts,built:input,pool:[threat,ramp]});
 assert.ok(together.cards.includes(threat)&&together.cards.includes(ramp));
});

test('preserve a required true-colorless producer when other slots are committed',()=>{
 const source=card('Required colorless','Artifact','{T}: Add {C}.',2,1);
 const required=card('Colorless cost','Artifact','Scry 1.',3,.1,{mana_cost:'{2}{C}'});
 const spells=[source,required,...filler.slice(2)],input={...built(spells),committedCombos:[{cards:spells.slice(1).map(c=>c.name)}]};
 const rainbow=card('Rainbow alternative','Artifact','{T}: Add one mana of any color.',2,10);
 const r=refinePackageInvestments({...opts,built:input,pool:[rainbow]});
 assert.ok(r.cards.includes(source));assert.ok(!r.cards.includes(rainbow));
});

test('printed threat quality can improve after threat-count quotas are full without a price bonus',()=>{
 const threats=Array.from({length:8},(_,i)=>card('Threat '+i,'Creature — Zombie','Annihilator 1',5,1,{power:'5'}));
 const cheap=built([...threats,...filler.slice(8)]);
 const premium=card('Protected threat','Creature — Zombie','Indestructible\nAnnihilator 1',5,75,{power:'10'});
 const stronger={...cheap,cards:[premium,...cheap.cards.slice(1)],strategy:'stronger'};
 assert.equal(selectInvestmentDeck([cheap,stronger],{commander,score:cards=>cards.includes(premium)?-10:100}),stronger);
});

test('self-replacing and consumed draw artifacts are not independent card-advantage engines',()=>{
 for(const text of [
  "{T}: Draw a card, then put this artifact on top of its owner's library.",
  '{1}, {T}, Exile this artifact: Exile all cards from all graveyards, then draw a card.',
  '{T}: Reveal the top card of your library. If it is an artifact card, draw a card.',
  '{T}: Target creature gains trample and "Whenever this creature deals combat damage to a player, draw a card."'
 ]){const e=investmentEvidence([card('Replacement artifact','Artifact',text),...filler,...lands],commander);
  assert.equal(e.vector.independentDraw,0);assert.equal(e.vector.flow,0);}
 const free=card('Free growing draw','Artifact','{T}: Put a charge counter on this artifact, then draw a card for each charge counter on it.',4,80);
 assert.equal(investmentEvidence([free,...filler,...lands],commander).vector.freeDraw,1);
});

test('alternate records of one playable name cannot crowd other upgrades out of the frontier',()=>{
 const bird=card('Fixing Dork','Creature — Bird','{T}: Add one mana of any color.',1,3);
 const alternate={...bird,id:'alternate',name:'Fixing Dork // Fixing Dork',prices:{eur:55}};
 const signet=card('Fixing Rock','Artifact','{T}: Add one mana of any color.',2,.38);
 const input=built(),out=refinePackageInvestments({...opts,built:input,pool:[bird,alternate,signet],traceNames:[signet.name]});
 assert.ok(out.cards.includes(bird)&&out.cards.includes(signet));assert.ok(!out.cards.includes(alternate));
 assert.ok(out.packageInvestment.watch[0].considered>0);assert.ok(out.price<input.price+4);
});

test('an unrelated upgrade cannot strip the unblockable opener package of a ninjutsu commander',()=>{
 const ninjaCommander=card('Ninjutsu Commander','Legendary Creature — Ninja','Commander ninjutsu {U}{B}.',3,1,{color_identity:['U','B']});
 const openers=Array.from({length:10},(_,i)=>card('Opener '+i,'Creature — Rogue',"This creature can't be blocked.",1,.1));
 const rest=filler.slice(10),input={...built([...openers,...rest]),committedCombos:[{cards:rest.map(c=>c.name)}]};
 const r=refinePackageInvestments({...opts,commander:ninjaCommander,built:input,pool:[ramp,draw]});
 assert.ok(openers.every(c=>r.cards.includes(c)));assert.equal(r.packageInvestment.strategyFloors.opener,10);
});

test('restore fixing and wide protection together around a valuable native package, with all final gates',()=>{
 const zombies=Array.from({length:8},(_,i)=>card('Large Zombie '+i,'Creature — Zombie','Trample',7,1,{power:'6'}));
 const fixing=card('Necessary fixer','Artifact','{T}: Add one mana of any color.',2,3);
 const shield=card('Wide shield','Instant','Creatures you control gain indestructible until end of turn.',2,6);
 const base=built([...zombies,fixing,shield,...filler.slice(10)]);
 const cascade=card('Native cascade','Artifact','Spells you cast with mana value 5 or greater have cascade, cascade.',5,80);
 const tutor=card('Native tutor','Artifact','When this artifact enters, search your library for a creature card with mana value 7 or greater, reveal it, then put it into your hand.',3,80);
 const native={...base,cards:base.cards.map(c=>c===fixing?cascade:c===shield?tutor:c),strategy:'native'};
 const options={...opts,built:native,startingDecks:[base],protectionBaseline:base.cards,pool:[fixing,shield],score:cards=>cards.includes(cascade)?100:0};
 const result=refinePackageInvestments(options);
 assert.ok(result.cards.includes(cascade)&&result.cards.includes(tutor));
 assert.ok(result.cards.includes(fixing)&&result.cards.includes(shield));
 assert.ok(result.packageInvestment.accepted.some(p=>p.label==='functional restoration'&&p.adds.length===2));
 assert.ok(result.price>170&&result.price<191);assert.equal(result.cards.length,99);
 assert.ok(result.packageInvestment.after.vector.fixing>=result.packageInvestment.functionalFloors.fixing);
 assert.ok(result.packageInvestment.after.vector.wideShields>=1);
 const over=refinePackageInvestments({...options,budget:170});assert.ok(over.price<=170);assert.ok(!over.cards.includes(cascade));
 const forbidden=refinePackageInvestments({...options,comboViolation:cards=>cards.includes(cascade)&&cards.includes(fixing)?'forbidden':null});
 assert.ok(!forbidden.cards.includes(cascade));
});

test('separate general pumps from conditional token protection and paid mana levels',()=>{
 const misleading=card('Token champion','Legendary Creature — Zombie','{W}{U}{B}{R}{G}: Creatures you control get +X/+X until end of turn. Tokens you control gain indestructible until end of turn.',3);
 const limited=card('Limited shield','Artifact','{3}, {T}: Up to X target creatures you control gain indestructible until end of turn.',3);
 const kicked=card('Kicked shield','Instant','Target creature gains indestructible. If this spell was kicked, instead creatures you control gain indestructible.',1);
 for(const shield of [misleading,limited,kicked])assert.equal(investmentEvidence([shield,...filler,...lands],commander).vector.wideShields,0);
 const real=card('True wide shield','Instant','Creatures you control gain indestructible until end of turn.',2);
 assert.equal(investmentEvidence([real,...filler,...lands],commander).vector.wideShields,1);
 const phased=card('Wide phasing','Instant','All permanents you control phase out.',3);
 assert.equal(investmentEvidence([phased,...filler,...lands],commander).vector.wideShields,1);
 const level=card('Level mana','Creature — Elf','Level up {1}{G}\nLEVEL 1-4\n{T}: Add {G}{G}.',1);
 assert.equal(manaCapacity(level).units,0);
});
