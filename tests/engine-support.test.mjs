import test from 'node:test';
import assert from 'node:assert/strict';
import {engineContext,supportedCardAccess,strategyInfrastructure,engineManaValue} from '../src/engineSupport.mjs';
import {investmentEvidence,selectInvestmentDeck,refinePackageInvestments,dominatesEvidence} from '../src/packageInvestment.mjs';
const card=(name,type_line,oracle_text='',cmc=2,extra={})=>({id:name,name,type_line,oracle_text,cmc,prices:{eur:.1},color_identity:[],colors:[],legalities:{commander:'legal'},...extra});
const leader=card('Tribal leader','Legendary Creature — Zombie','Whenever another Zombie you control dies, create a token.',4);
const plan={needs:[{kind:'death-tribal',type:'Zombie'}]};
const zombies=Array.from({length:20},(_,i)=>card('Zombie '+i,'Creature — Zombie','When this creature enters, scry 1.',i<10?5:2,{power:i<10?'6':'2'}));
const spells=Array.from({length:20},(_,i)=>card('Spell '+i,'Sorcery','Scry 1.',2,{color_identity:['U'],colors:['U']}));
const land=card('Island','Basic Land — Island','{T}: Add {U}.',0);
const context=cards=>engineContext(cards,plan);
const discovery=card('Tribal entry engine','Enchantment','As this enchantment enters, choose a creature type.\nWhenever a creature you control of the chosen type enters or attacks, draw a card.',5);
const project=card('Unique entry engine','Enchantment',"Whenever a nontoken creature you control enters, if it doesn't have the same name as another creature you control or a creature card in your graveyard, draw a card.",4);
const beanstalk=card('Large cast engine','Enchantment','When this enchantment enters and whenever you cast a spell with mana value 5 or greater, draw a card.',2);
const forge=card('Top access engine','Artifact','You may look at the top card of your library any time.\nYou may cast artifact spells and colorless spells from the top of your library.\n{T}, Pay 1 life: Exile the top card of your library.',4);

test('chosen-type enter-or-attack engine uses the independently supported entry branch',()=>{
 const yes=supportedCardAccess(discovery,context(zombies));assert.equal(yes.supported,true);assert.equal(yes.triggers[0].support,20);
 assert.equal(supportedCardAccess(discovery,context(spells)).supported,false);
 assert.equal(supportedCardAccess({...discovery,oracle_text:'Whenever an Elf creature you control enters, draw a card.'},context(zombies)).supported,false);
 const combat={...discovery,oracle_text:'Whenever a creature you control of the chosen type attacks, draw a card.'};
 assert.equal(supportedCardAccess(combat,context(zombies)).supported,false);
});

test('unique nontoken entry engine uses singleton support, not creature tokens or repeated names',()=>{
 assert.equal(supportedCardAccess(project,context(zombies)).supported,true);
 assert.equal(supportedCardAccess(project,context(Array(20).fill(zombies[0]))).supported,false);
 const unsupported={...project,oracle_text:'Whenever a creature you control enters, if you control a Treasure, draw a card.'};
 assert.equal(supportedCardAccess(unsupported,context(zombies)).supported,false);
});

test('combined ETB/cast text filters eligible spells by mana value and does not treat its ETB as repeated draw',()=>{
 const access=supportedCardAccess(beanstalk,context(zombies));assert.equal(access.supported,true);assert.equal(access.triggers[0].support,10);
 assert.equal(supportedCardAccess(beanstalk,context(zombies.slice(10))).supported,false);
 assert.equal(supportedCardAccess({...beanstalk,oracle_text:'When this enchantment enters, draw a card.'},context(zombies)).supported,false);
});

test('top-library access counts only artifact or genuinely colorless spells and excludes lands',()=>{
 const artifacts=Array.from({length:8},(_,i)=>card('Artifact '+i,'Artifact','',2,{colors:['U'],color_identity:['U']}));
 const eligible=[...artifacts,...zombies.slice(0,8)];
 const access=supportedCardAccess(forge,context([...eligible,...spells,...Array(30).fill(land)]));
 assert.equal(access.topAccess,true);assert.equal(access.topSupport,16);
 assert.equal(supportedCardAccess(forge,context([...eligible.slice(1),...spells,...Array(40).fill(land)])).topAccess,false);
 assert.equal(supportedCardAccess({...forge,oracle_text:'You may cast creature spells from the top of your library.'},context(artifacts)).topAccess,false);
 assert.equal(supportedCardAccess({...forge,oracle_text:'Coven — As long as you control three creatures with different powers, you may cast creature spells from the top of your library.'},context(zombies)).topAccess,false);
 assert.equal(supportedCardAccess({...forge,oracle_text:'You may play lands from the top of your library.'},context(zombies)).topAccess,false);
 assert.equal(supportedCardAccess({...forge,oracle_text:'{3}{G}: Level 3\nYou may cast creature spells from the top of your library.'},context(zombies)).topAccess,false);
});

test('supported trigger engines and top access are card flow, not independent unconditional draw',()=>{
 for(const engine of [discovery,project,beanstalk,forge]){
  const e=investmentEvidence([...zombies,...spells,engine],leader,plan);
  assert.equal(e.vector.flow,1,engine.name);assert.equal(e.vector.independentDraw,0,engine.name);
  assert.ok(e.drawEngines.some(x=>x.card===engine.name));
 }
});

test('unsupported payment, discard, Adventure, combat-only and narrow zone triggers remain conditional',()=>{
 for(const text of [
  'Whenever you cast a Zombie spell, you may pay {U}. If you do, draw a card.',
  'Whenever you cast a spell, discard a card, then draw a card.',
  'Whenever you cast a creature spell that has an Adventure, draw a card.',
  'Whenever a creature you control attacks, draw a card.',
  'Whenever you cast a spell from exile, draw a card.',
  'Whenever you cast a spell with a counter on it, draw a card.',
  'Whenever you cast a creature spell this turn, draw a card.',
  'Whenever another creature you control named Test Ritualist enters, draw a card.',
  '−6: You get an emblem with \"Whenever you cast a spell, draw a card.\"'
 ])assert.equal(supportedCardAccess(card('Unsupported','Enchantment',text),context(zombies)).supported,false,text);
});

const typedPlan={needs:[{kind:'typed-cast',types:['Zombie']}]};
const cascade=card('Native cascade','Creature — Zombie','Colorless spells you cast from your hand with mana value 5 or greater have "Cascade, cascade."',6);
const tutor=card('Native tutor','Creature — Zombie','When you cast this spell, you may search your library for a colorless creature card with mana value 5 or greater, reveal it, then shuffle and put that card on top.\nThe first creature spell you cast each turn costs {2} less to cast.',6);
const copy=card('Cast copier','Enchantment','If a triggered ability of a colorless spell you control triggers, that ability triggers an additional time.\nWhenever you cast a colorless spell, copy it.',6);

test('strategy infrastructure records supported cascade streams, real tutor targets and cast copying separately',()=>{
 const ctx=engineContext(zombies,typedPlan);
 const c=strategyInfrastructure(cascade,ctx).find(x=>x.kind==='cascade');assert.equal(c.units,2);assert.equal(c.support,10);
 const t=strategyInfrastructure(tutor,ctx).find(x=>x.kind==='tutor');assert.equal(t.support,10);
 const reduction=strategyInfrastructure(tutor,ctx).find(x=>x.kind==='costReduction');assert.equal(reduction.support,10);
 assert.ok(strategyInfrastructure(copy,ctx).some(x=>x.kind==='castCopy'));
 assert.deepEqual(strategyInfrastructure(tutor,engineContext(spells,typedPlan)),[]);
 assert.deepEqual(strategyInfrastructure(cascade,engineContext(spells,typedPlan)),[]);
});

test('generic role surplus cannot dominate away a native tutor, cascade or cast copier',()=>{
 const filler=Array.from({length:39},(_,i)=>card('Filler '+i,'Artifact','Scry 1.'));
 const base=[...zombies,...filler,...Array(37).fill(land)];
 const native={cards:[...base,cascade,tutor,copy],strategy:'native',price:180};
 const rocks=Array.from({length:3},(_,i)=>card('Rock '+i,'Artifact','{T}: Add {C}{C}{C}.'));
 const generic={cards:[...base,...rocks],strategy:'generic',price:108};
 const selected=selectInvestmentDeck([native,generic],{commander:leader,plan:typedPlan,score:cards=>cards.includes(copy)?100:90});
 assert.equal(selected,native);
 assert.equal(investmentEvidence(native.cards,leader,typedPlan).vector.strategy_cascade,2);
 assert.equal(selectInvestmentDeck([native,{...native,price:190}],{commander:leader,plan:typedPlan}),native,'price alone earns no preference');
});

test('bounded discovery reserves supported trigger and top-access places beside independent tap engines',()=>{
 const filler=Array.from({length:42},(_,i)=>card('Filler '+i,'Artifact','Scry 1.'));
 const cards=[...zombies,...filler,...Array(37).fill(land)];
 const taps=Array.from({length:10},(_,i)=>card('Tap engine '+i,'Artifact','{T}: Draw a card.'));
 const cheapEntries=Array.from({length:8},(_,i)=>card('Cheap entry '+i,'Creature — Wizard','Whenever a creature you control with power 5 or greater enters, draw a card.',1));
 const result=refinePackageInvestments({built:{status:'ok',strategy:'fixture',cards,price:10,committedCombos:[]},pool:[...taps,...cheapEntries,discovery,project,beanstalk,forge],commander:leader,plan,budget:191,bracket:4,maxRounds:1,maxEvaluations:40});
 const names=result.packageInvestment.discovery[0].draw.map(c=>c.card);
 for(const c of [discovery,project,beanstalk,forge])assert.ok(names.includes(c.name),c.name);
 assert.ok(names.filter(n=>n.startsWith('Tap engine')).length<=2);
 assert.ok(result.price<=191);assert.equal(result.cards.length,99);
});

test('each infrastructure family independently prevents false generic-role dominance',()=>{
 const taps=Array.from({length:4},(_,i)=>card('Saturated draw '+i,'Artifact','{T}: Draw a card.'));
 const copiers=Array.from({length:2},(_,i)=>card('Saturated copy '+i,'Artifact','{2}, {T}: Copy target triggered ability you control.'));
 const filler=Array.from({length:35},(_,i)=>card('Saturated filler '+i,'Artifact','Scry 1.'));
 const background=[...zombies,...taps,...copiers,...filler,...Array(37).fill(land)];
 const mana=card('Generic acceleration','Artifact','{T}: Add {C}{C}{C}.');
 const oldView=e=>({vector:Object.fromEntries(Object.entries(e.vector).filter(([key])=>!key.startsWith('strategy_')))});
 for(const engine of [cascade,tutor,copy]){
  const nativeCards=[...background,engine],genericCards=[...background,mana];assert.equal(nativeCards.length,99);
  const native=investmentEvidence(nativeCards,leader,typedPlan),generic=investmentEvidence(genericCards,leader,typedPlan);
  assert.equal(dominatesEvidence(oldView(generic),oldView(native)),true,'saturated old role counts wrongly discard '+engine.name);
  assert.equal(dominatesEvidence(generic,native),false,'separate infrastructure retains the tradeoff for '+engine.name);
  const winner=selectInvestmentDeck([{cards:nativeCards,strategy:'native'},{cards:genericCards,strategy:'generic'}],{commander:leader,plan:typedPlan,score:cards=>cards.includes(engine)?10:0});
  assert.ok(winner.cards.includes(engine),engine.name);
 }
 assert.deepEqual(strategyInfrastructure(tutor,engineContext([mana],typedPlan)),[]);
});

test('qualifiers after draw, forced hand discard and reversible zero-MV records do not crowd supported engines',()=>{
 const conditional=card('Power entry','Enchantment','Whenever a creature you control enters, draw a card if its power is 3 or greater. Otherwise, put two counters on it.',3);
 assert.equal(supportedCardAccess(conditional,context(zombies)).triggers[0].support,10);
 assert.equal(supportedCardAccess({...conditional,oracle_text:'Whenever a creature you control enters, draw a card if you control a Treasure.'},context(zombies)).supported,false);
 const song=card('Forced discard','Enchantment','Whenever you cast a spell, draw two cards.\nAt the beginning of your end step, discard your hand.',4);
 assert.equal(supportedCardAccess(song,context(zombies)).supported,false);
 const reversible=card('Reversible engine','Creature — Wizard','Whenever you cast a creature spell, draw a card.',0,{mana_cost:'{2}{G}{W}{U}'});
 assert.equal(engineManaValue(reversible),5);
 assert.equal(engineManaValue(card('Free spell','Sorcery','',0,{mana_cost:'{X}'})),0);
 const aura=card('Conditional aura','Enchantment — Aura','Enchant creature\nWhen enchanted creature dies, draw two cards.',1);
 assert.equal(investmentEvidence([aura,...zombies],leader,plan).vector.flow,0);
 for(const text of ['As an additional cost to cast this spell, tap four untapped creatures you control. Draw three cards.', 'Draw a card. If a graveyard has twenty or more cards in it, draw three cards instead.'])assert.equal(investmentEvidence([card('Conditional spell','Sorcery',text),...zombies],leader,plan).vector.flow,0);
 for(const text of ['Draw four cards, then choose X cards in your hand and discard the rest.', '{1}, {T}, Discard a legendary card with the same name as a legendary permanent you control: Draw two cards.'])assert.equal(investmentEvidence([card('Resource draw','Artifact',text),...zombies],leader,plan).vector.flow,0);
});


test('surplus generic mana does not prune an independently constructed strategy, but a deficit improvement can',()=>{
 const rocks=Array.from({length:9},(_,i)=>card('Covered source '+i,'Artifact','{T}: Add {C}.'));
 const filler=Array.from({length:33},(_,i)=>card('Coverage filler '+i,'Artifact','Scry 1.'));
 const first={strategy:'source-a',cards:[...zombies,...rocks,...filler,...Array(37).fill(land)],price:170};
 const surplus={strategy:'source-b',cards:[...first.cards.filter(c=>c!==filler[0]),card('Surplus source','Artifact','{T}: Add {C}{C}.')],price:177};
 assert.equal(first.cards.length,99);assert.equal(surplus.cards.length,99);
 assert.equal(selectInvestmentDeck([first,surplus],{commander:leader,plan,score:cards=>cards===first.cards?100:0}),first);
 const deficient={strategy:'source-c',cards:zombies,price:100};
 assert.equal(selectInvestmentDeck([deficient,first],{commander:leader,plan,score:cards=>cards===first.cards?0:100}),first);
 const sameSeed={...surplus,strategy:first.strategy};
 assert.equal(selectInvestmentDeck([first,sameSeed],{commander:leader,plan,score:cards=>cards===first.cards?100:0}),sameSeed,'safe within-seed mana improvements remain available');
});
