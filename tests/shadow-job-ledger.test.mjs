import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCardJobLedger,compareJobLedgers,printedCosts} from '../src/jobLedger.mjs';
const card=(name,type_line='Artifact',oracle_text='',extra={})=>({name,id:name,type_line,oracle_text,cmc:2,mana_cost:'{2}',color_identity:[],prices:{eur:.1},legalities:{commander:'legal'},...extra});
const cmd=card('Independent Commander','Legendary Creature — Zombie','Whenever another Zombie you control dies, create a 2/2 black Zombie creature token.',{color_identity:['B']});
const elf=card('Material Elf','Creature — Elf','Vigilance');
const blank=i=>card('Blank '+i,'Sorcery','Scry 1.');
const complete=extras=>[...extras,...Array.from({length:99-extras.length},(_,i)=>blank(i))];
const run=extras=>buildCardJobLedger({commander:cmd,cards:complete(extras)});
const jobs=l=>l.cards.flatMap(c=>c.jobs);
const freeze=o=>{Object.freeze(o);for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return o;};

test('complete deterministic ledgers are pure, price-free and cover every physical slot',()=>{
 const input=freeze({commander:cmd,cards:complete([elf])}),before=JSON.stringify(input),a=buildCardJobLedger(input);
 assert.equal(a.totalCards,100);assert.equal(a.cards.length,100);assert.equal(a.completeInput,true);
 assert.deepEqual(buildCardJobLedger(input),a);assert.equal(JSON.stringify(input),before);
 const premium={...elf,prices:{eur:999},edhrec_rank:1};assert.deepEqual(run([premium]),run([elf]));
 assert.ok(jobs(a).every(j=>['supported','unsupported','unknown'].includes(j.status)));
});
test('one real qualifying spell supports a conditional relationship without an eight-card quota',()=>{
 const engine=card('Elf cast access','Enchantment','Whenever you cast an Elf spell, draw a card.');
 const yes=run([engine,elf]),no=run([engine]);
 assert.equal(jobs(yes).find(j=>j.card===engine.name&&j.kind==='access:cast').status,'supported');
 assert.equal(jobs(no).find(j=>j.card===engine.name&&j.kind==='access:cast').status,'unsupported');
 const delta=compareJobLedgers(yes,no);assert.ok(delta.supportChanges.some(c=>c.afterStatus==='unsupported'&&c.removed.includes(elf.name)));
 assert.ok(yes.obligations.filter(o=>o.id.includes('|execution')).every(o=>o.status==='unknown'));
});
test('persistent access loss is detected even when replaced by a larger one-shot draw',()=>{
 const engine=card('Persistent access','Enchantment','Whenever you cast a creature spell, draw a card.'),one=card('One-time access','Sorcery','Draw three cards.');
 const delta=compareJobLedgers(run([engine,elf]),run([one,elf]));
 assert.ok(delta.lostPersistentAccess.some(j=>j.card===engine.name));assert.ok(delta.addedJobs.some(j=>j.kind==='access:one-shot'));
 assert.ok(delta.brokenBaselineObligations.length);assert.equal('winner' in delta,false);
});
test('unparsed zone conditions remain unknown rather than unsupported or reliable',()=>{
 const engine=card('Exile access','Enchantment','Whenever you cast a spell from exile, draw a card.');
 const j=jobs(run([engine])).find(j=>j.card===engine.name&&j.kind.startsWith('access:'));
 assert.equal(j.status,'unknown');assert.ok(j.unresolved.length);assert.equal(j.execution,'unknown; inventory evidence only');
});
test('cycling, consumed sources and counter-gated draw do not become reliable persistent engines',()=>{
 const cycling=card('Cycling spell','Instant','Cycling {2} ({2}, Discard this card: Draw a card.)');
 const tablet=card('Tablet of Compleation','Artifact','{T}: Draw a card. Activate only if this artifact has five or more oil counters on it.');
 const l=run([cycling,tablet]),cy=jobs(l).find(j=>j.card===cycling.name&&j.kind==='access:activated'),counter=jobs(l).find(j=>j.card===tablet.name&&j.kind==='access:activated');
 assert.equal(cy.consumesSource,true);assert.equal(cy.sourceIsPersistent,false);assert.equal(counter.status,'unknown');
 assert.equal(compareJobLedgers(l,run([tablet])).lostPersistentAccess.some(j=>j.card===cycling.name),false);
});
test('control transfer and unsacrificable artifacts are explicit dependencies, not free repeated engines',()=>{
 const rope=card('Hithlain Rope','Artifact',"This artifact can't be sacrificed.\n{2}, {T}: Draw a card. The player to your right gains control of this artifact.");
 const converter=card('Artifact outlet','Enchantment','Sacrifice an artifact: Create a Treasure token.');
 const l=run([rope,converter]),j=jobs(l).find(j=>j.card===rope.name&&j.kind==='access:activated');
 assert.equal(j.status,'unknown');assert.match(j.repeatability,/control transfer/);
 const conversion=jobs(l).find(j=>j.card===converter.name&&j.kind==='conversion:resource');
 assert.equal(l.obligations.find(o=>o.anchor===conversion.id&&o.id.endsWith('material')).status,'unsupported');
 const ordinary=run([converter,card('Ordinary material','Artifact','Scry 1.')]);
 assert.ok(ordinary.obligations.some(o=>o.id.endsWith('material')&&o.status==='supported'),'ordinary deployed artifact is a potential legal sacrifice');
});
test('parenthesized basic-land mana remains one printed source with a real tap cost',()=>{
 const island=card('Island','Basic Land — Island','({T}: Add {U}.)',{cmc:0,mana_cost:''}),l=run([island]);
 const j=jobs(l).find(j=>j.card==='Island'&&j.kind==='resource:mana');
 assert.equal(j.status,'supported');assert.deepEqual(j.provides[0].symbols,['U']);assert.equal(j.provides[0].trueColorless,false);assert.equal(j.cost.resources[0].kind,'tap-source');
});
test('a printed sacrifice-land recovery cost recognizes real lands instead of reporting missing material',()=>{
 const recovery=card('World Breaker','Creature — Eldrazi','{2}{C}, Sacrifice a land: Return this card from your graveyard to your hand.');
 const land=card('Wastes','Basic Land','{T}: Add {C}.',{cmc:0,mana_cost:''}),l=run([recovery,land]);
 assert.ok(l.obligations.filter(o=>o.anchor.includes('world breaker')&&o.id.endsWith('material')).every(o=>o.status==='supported'));
 assert.ok(l.obligations.some(o=>o.anchor.includes('world breaker')&&o.id.endsWith('zone-and-permission')&&o.status==='unknown'));
});
test('native end-step sacrifice is a scheduled paid choice, not free draw or a freely repeatable outlet',()=>{
 const commander=card('Wilhelt, the Rotcleaver','Legendary Creature — Zombie','At the beginning of your end step, you may sacrifice a Zombie. If you do, draw a card.');
 const l=buildCardJobLedger({commander,cards:complete([])}),j=jobs(l).find(j=>j.kind==='consume:end-step-choice');
 assert.equal(j.cost.phase,'optional end-step trigger choice');assert.equal(j.cost.resources[0].type,'Zombie');assert.equal(j.status,'unknown');assert.match(j.repeatability,/not a freely repeatable/);
 assert.ok(l.obligations.some(o=>o.anchor===j.id&&o.id.endsWith('material')&&o.status==='supported'),'the commander is potential legal material; replacement/execution remain unknown');
});
test('alternative casting faces and unknown printed clauses retain explicit coverage uncertainty',()=>{
 const c=card('Different Faces','Artifact // Sorcery','',{layout:'modal_dfc',card_faces:[{name:'Front',type_line:'Artifact',oracle_text:'{T}: Add {C}.',mana_cost:'{2}'},{name:'Back',type_line:'Sorcery',oracle_text:'Draw two cards.',mana_cost:'{3}{U}'}]});
 const l=run([c,elf]);assert.ok(jobs(l).filter(j=>j.card===c.name).every(j=>j.status==='unknown'));
 assert.ok(jobs(l).some(j=>j.card===elf.name&&j.kind==='unresolved:mechanics'&&j.oracle==='Vigilance'));
});
test('a source cannot fund its own casting cost or spend its tap twice',()=>{
 const rock=card('Two abilities','Artifact','{T}: Add {C}.\n{1}, {T}: Draw a card.');
 const l=run([rock]),mine=jobs(l).filter(j=>j.card===rock.name),mana=mine.find(j=>j.kind==='resource:mana');
 for(const j of mine.filter(j=>j.kind==='event:spell-cast'||j.kind==='access:activated'))assert.ok(j.resourceLinks.every(r=>!r.providers.includes(mana.id)));
});
test('a chosen creature type is an undeclared choice rather than a predetermined commander archetype',()=>{
 const engine=card('Kindred Discovery','Enchantment','As this enchantment enters, choose a creature type.\nWhenever a creature you control of the chosen type enters or attacks, draw a card.');
 const j=jobs(run([engine,elf])).find(j=>j.card===engine.name&&j.kind==='access:entry');
 assert.equal(j.status,'unknown');assert.ok(j.supportingCards.includes(elf.name));assert.match(j.unresolved.join(' '),/not declared/);
});
test('a compound life and sacrifice payment precedes Treasure and never grants true colorless',()=>{
 const converter=card('Warren Soultrader','Creature — Zombie','Pay 1 life, Sacrifice another creature: Create a Treasure token. (It\'s an artifact with "{T}, Sacrifice this token: Add one mana of any color.")');
 const l=run([converter,elf]),conversion=jobs(l).find(j=>j.card===converter.name&&j.kind==='conversion:resource');
 assert.deepEqual(conversion.cost.resources.map(r=>r.kind),['life','sacrifice']);assert.equal(conversion.provides[0].trueColorless,false);
 assert.equal(jobs(l).some(j=>j.card===converter.name&&j.kind==='resource:mana'),false,'quoted token ability is not the source ability');
 assert.ok(l.obligations.some(o=>o.anchor===conversion.id&&o.id.endsWith('cost-funding')&&o.status==='unknown'));
 assert.match(conversion.unresolved.join(' '),/after.*resolves|cannot.*sacrifice/i);
});
test('an effect cannot bootstrap its own sacrifice payment with a not-yet-created token',()=>{
 const converter=card('Elf conversion','Artifact','Sacrifice an Elf: Create a 1/1 green Elf creature token.');
 const before=run([converter,elf]),after=run([converter]);
 const anchor=l=>jobs(l).find(j=>j.kind==='conversion:resource');
 assert.equal(before.obligations.find(o=>o.anchor===anchor(before).id&&o.id.endsWith('|material')).status,'supported');
 assert.equal(after.obligations.find(o=>o.anchor===anchor(after).id&&o.id.endsWith('|material')).status,'unsupported');
});
test('death-payoff outlet removal identifies the lost voluntary path without declaring all deaths impossible',()=>{
 const drain=card('Vengeful Dead','Creature — Zombie','Whenever this creature or another Zombie dies, each opponent loses 1 life.');
 const outlet=card('Viscera Seer','Creature — Vampire Wizard','Sacrifice a creature: Scry 1.');
 const before=run([drain,outlet,elf]),after=run([drain,elf]),delta=compareJobLedgers(before,after);
 assert.ok(before.obligations.some(o=>o.id.endsWith('voluntary-death')&&o.status==='supported'));
 assert.ok(delta.obligationChanges.some(o=>/voluntary sacrifice/.test(o.question)&&o.beforeStatus==='supported'&&o.afterStatus==='unknown'));
 assert.ok(after.obligations.some(o=>o.question.includes('finish opponents')&&o.status==='unknown'));
});
test('one physical flexible mana source is not a certificate that both Ulalek payments are funded',()=>{
 const commander=card('Ulalek, Fused Atrocity','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control, then copy all other activated and triggered abilities you control.',{color_identity:['W','U','B','R','G']});
 const eldrazi=card('Printed Eldrazi','Creature — Eldrazi','When you cast this spell, draw a card.');
 const land=card('Wastes','Basic Land — Wastes','{T}: Add {C}.',{mana_cost:'',cmc:0});
 const l=buildCardJobLedger({commander,cards:complete([eldrazi,land])}),j=jobs(l).find(j=>j.card===commander.name&&j.kind==='native:infrastructure');
 assert.equal(j.cost.phase,'optional trigger-resolution payment');assert.deepEqual(j.cost.resources.map(r=>r.symbol),['C','C']);
 assert.equal(j.resourceLinks.length,2);assert.ok(j.resourceLinks.every(r=>r.status==='unknown'));
 assert.ok(l.obligations.some(o=>o.anchor===j.id&&o.id.endsWith('cost-funding')&&o.status==='unknown'));
});
test('Spawn/Scion subtype without a printed mana ability does not invent mana',()=>{
 const plain=card('Plain producer','Sorcery','Create a 1/1 colorless Eldrazi Scion creature token.');
 const verified=card('Printed producer','Sorcery','Create a 0/1 colorless Eldrazi Spawn creature token. It has "Sacrifice this creature: Add {C}."');
 const l=run([plain,verified]);
 assert.equal(jobs(l).find(j=>j.card===plain.name&&j.kind==='resource:token').provides[0].trueColorless,false);
 assert.equal(jobs(l).find(j=>j.card===verified.name&&j.kind==='resource:token').provides[0].trueColorless,true);
});
test('a native outlet retains exact sacrifice/mana costs and unknown win conversion',()=>{
 const outlet=card('Spawn-Gang Commander','Creature — Eldrazi','{1}{C}, Sacrifice an Eldrazi: This creature deals 2 damage to any target.');
 const l=run([outlet]),j=jobs(l).find(j=>j.card===outlet.name&&j.kind==='win:printed-outlet');
 assert.equal(j.status,'unknown');assert.deepEqual(j.cost.resources.filter(r=>r.kind==='mana').map(r=>r.symbol),['1','C']);
 assert.equal(j.cost.resources.find(r=>r.kind==='sacrifice').type,'Eldrazi');assert.equal(j.provides[0].amount,2);
 assert.ok(l.obligations.some(o=>o.anchor===j.id&&o.id.endsWith('win-conversion')&&o.status==='unknown'));
});
test('Y’shtola end-step throughput and win conversion remain unknown despite qualifying inventory',()=>{
 const commander=card("Y'shtola, Night's Blessed",'Legendary Creature — Cat Warlock',"At the beginning of each end step, if a player lost 4 or more life this turn, you draw a card.\nWhenever you cast a noncreature spell with mana value 3 or greater, Y'shtola deals 2 damage to each opponent and you gain 2 life.");
 const spell=card('Qualified draw','Sorcery','Draw two cards.',{cmc:3});
 const l=buildCardJobLedger({commander,cards:complete([spell])});
 const p=jobs(l).find(j=>j.kind==='payoff:cast-pressure');assert.ok(p.supportingCards.includes(spell.name));assert.equal(p.provides[0].amount,2);
 assert.ok(l.obligations.some(o=>o.id.endsWith('throughput')&&o.status==='unknown'));
 assert.ok(l.obligations.some(o=>o.id.endsWith('win-conversion')&&o.status==='unknown'));
});
test('missing catalog records and unsupported gameplay needs cannot become failed obligations',()=>{
 const l=buildCardJobLedger({commander:cmd,cards:complete([card('Unknown printing','', '',{catalogMissing:true})]),executionEvidence:{counts:{supportedEngineOnline:0},unmodeledNeeds:['combat','ninjutsu'],comparisonEligible:false}});
 assert.equal(l.completeInput,false);assert.equal(l.executionEvidence.absenceIsFailure,false);assert.equal(l.executionEvidence.comparisonUsed,false);
 assert.ok(jobs(l).find(j=>j.card==='Unknown printing').unresolved.length);assert.ok(l.obligations.filter(o=>o.id.endsWith('execution')).every(o=>o.status==='unknown'));
});
test('utility interaction does not require membership in a closed engine package',()=>{
 const answer=card('Independent answer','Instant','Exile target creature.'),l=run([answer]);
 const job=jobs(l).find(j=>j.card===answer.name&&j.kind==='utility:interaction');assert.equal(job.status,'supported');
 assert.equal(l.obligations.some(o=>o.anchor===job.id&&o.status==='unsupported'),false);
});
test('bounded clauses retain an explicit unknown coverage receipt',()=>{
 const long=card('Long rules','Enchantment',Array.from({length:34},()=>'{T}: Draw a card.').join('\n')),l=run([long]);
 assert.equal(l.coverage.omissions[0].clauses,2);assert.equal(l.coverage.omissions[0].status,'unknown');
 assert.throws(()=>buildCardJobLedger({commander:cmd,cards:Array(100).fill(long)}),/at most 99/);
 assert.equal(printedCosts('{T}, Pay 1 life, Remove a counter',long).unparsed,'Removeacounter');
});
