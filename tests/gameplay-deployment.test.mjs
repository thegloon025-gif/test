import test from 'node:test';
import assert from 'node:assert/strict';
import {planManaPayments, parseManaCost} from '../src/gameplayMana.mjs';
import {cardModel} from '../src/gameplayCards.mjs';
import {evaluateDeployment, deploymentOrder} from '../src/gameplayDeployment.mjs';
import {auditDeploymentTrace} from '../src/gameplayAudit.mjs';
const unit = (type, n = 0, restriction = 'none') => ({id: type + n, type, restriction});
const source = (id, outputs, rest = {}) => ({id, modes: [{tap: true, outputs, ...rest}]});
const spell = (cost, rest = {}) => ({cost, context: {kind: 'spell', types: ['Creature'], ...rest}});
const c = (name, mana_cost, type_line, oracle_text = '') => ({name, mana_cost, type_line, oracle_text, color_identity: []});
const commander = c('Commander', '{9}', 'Legendary Creature — Wizard');
const land = (name, color, tapped = false) => c(name, '', 'Land', `${tapped ? 'This land enters tapped.\n' : ''}{T}: Add {${color}}.`);
const filler = n => Array.from({length: n}, (_, i) => c('Unused ' + i, '{20}', 'Creature — Beast'));
const run = (cards, script, rest = {}) => evaluateDeployment({commander, cards, script, order: cards.map((_, i) => i), ...rest});
const costs = r => r.stats.casts.map(s => `${s.card}:${s.turn}`);
test('fixed mana pays exact pips, generic and hybrid; colors never replace true colorless', () => {
  assert.equal(planManaPayments({pool: [unit('G')]}, [spell('{C}')]).status, 'blocked');
  assert.equal(planManaPayments({pool: [unit('C'), unit('G'), unit('U')]}, [spell('{C/G}{U}{1}')]).status, 'paid');
  assert.equal(planManaPayments({pool: [unit('C'), unit('C', 1)]}, [spell('{G}{1}')]).status, 'blocked');
  for (const cost of ['{X}', '{S}', '{W/P}', '{2/W}', 'pay {1}', '{C/C/C}']) assert.equal(parseManaCost(cost), null);
  assert.equal(planManaPayments({}, [spell('{X}')]).status, 'unknown');
});
test('a multicolor activation makes one fixed choice and cannot be spent twice', () => {
  const state = {sources: [source('rainbow', [['G'], ['U']])]};
  assert.equal(planManaPayments(state, [spell('{G}{U}')]).status, 'blocked');
  const r = planManaPayments({sources: [source('double', [['C','C']])]}, [spell('{2}')]);
  assert.equal(r.status, 'paid'); assert.equal(r.receipts.filter(x => x.kind === 'activation').length, 1);
  assert.equal(new Set(r.receipts.at(-1).spent.map(x => x.id)).size, 2);
  assert.throws(() => planManaPayments({sources: [source('x', [['C']]), source('x', [['C']])]}, [spell('{1}')]), /Duplicate/);
});
test('Signet fees must be funded before its output; fee and final payment use distinct units', () => {
  const signet = source('signet', [['R','G']], {cost: '{1}'});
  assert.equal(planManaPayments({sources: [signet]}, [spell('{R}')]).status, 'blocked');
  const r = planManaPayments({sources: [source('land', [['C']]), signet]}, [spell('{R}{G}')]);
  assert.equal(r.status, 'paid');
  assert.deepEqual(r.receipts.filter(x => x.kind === 'activation').map(x => x.source), ['land','signet']);
  const spent = r.receipts.flatMap(x => x.spent || []).map(x => x.id);
  assert.equal(new Set(spent).size, spent.length);
  assert.equal(planManaPayments({sources: [source('filter', [['G']], {cost: '{U}'})]}, [spell('{G}')]).status, 'blocked');
});
test('restriction is per unit and per payment, including fees and Ulalek trigger abilities', () => {
  for (const [restriction, allowed, denied] of [
    ['powerstone', {kind: 'spell', types: ['Artifact']}, {kind: 'spell', types: ['Creature']}],
    ['abilities', {kind: 'ability', abilityType: 'activated'}, {kind: 'ability', abilityType: 'triggered'}],
    ['eldrazi', {kind: 'spell', subtypes: ['Eldrazi']}, {kind: 'ability'}],
    ['commander', {kind: 'spell', commander: true}, {kind: 'spell', commander: false}],
  ]) {
    const state = {pool: [unit('C', 0, restriction)]};
    assert.equal(planManaPayments(state, [{cost: '{C}', context: allowed}]).status, 'paid');
    assert.equal(planManaPayments(state, [{cost: '{C}', context: denied}]).status, 'blocked');
  }
  assert.equal(planManaPayments({pool: [unit('C', 0, 'powerstone')]}, [{cost: '{C}', context: {kind: 'ability'}}]).status, 'paid');
  assert.equal(planManaPayments({pool: [unit('C', 0, 'abilities'),unit('C', 1, 'abilities')]}, [{cost:'{C}{C}',context:{kind:'ability',abilityType:'triggered'}}]).status,'blocked');
  const fee=planManaPayments({pool:[unit('C',0,'abilities')],sources:[source('signet',[['R','G']],{cost:'{1}'})]},[spell('{R}{G}')]);
  assert.equal(fee.status,'paid');
});
test('joint payment search preserves scarce C for the separate optional payment', () => {
  const pool = [unit('C'), unit('C', 1), unit('G'), unit('R')];
  const r = planManaPayments({pool}, [spell('{2}'), {cost: '{C}{C}', label: 'trigger', context: {kind: 'ability'}}]);
  assert.equal(r.status, 'paid');
  assert.deepEqual(r.receipts.filter(x => x.kind === 'payment').map(x => x.spent.map(u => u.type)), [['G','R'], ['C','C']]);
  assert.deepEqual(pool, [unit('C'), unit('C', 1), unit('G'), unit('R')]);
});
test('generic reductions never remove pips; activation fees and additional payments are not discounted', () => {
  assert.equal(planManaPayments({pool: [unit('C')]}, [{...spell('{3}{G}'), reduction: 9}]).status, 'blocked');
  assert.equal(planManaPayments({pool: [unit('G')]}, [{...spell('{3}{G}'), reduction: 9}]).status, 'paid');
  assert.equal(planManaPayments({pool: [unit('G')]}, [{...spell('{3}{G}'), reduction: 3}, {cost: '{1}', context: {kind: 'ability'}}]).status, 'blocked');
});
test('a bounded search is unknown, deterministic and never mutates the input', () => {
  const state = {sources: [source('a', [['C']]), source('b', [['C']])]}, before = structuredClone(state);
  const r = planManaPayments(state, [spell('{2}')], {maxStates: 1});
  assert.equal(r.status, 'unknown'); assert.match(r.reason, /bound/); assert.deepEqual(state, before);
  assert.deepEqual(r, planManaPayments(state, [spell('{2}')], {maxStates: 1}));
});
test('tapped land waits until next turn, one land drop is enforced and failed casts consume nothing', () => {
  const cards = [land('Tapped', 'G', true), land('Second', 'G'), c('Elf', '{G}', 'Creature — Elf'), ...filler(5)];
  const r = run(cards, {1: [{type: 'land', card: 'Tapped'}, {type: 'land', card: 'Second'}, {type: 'cast', card: 'Elf'}], 2: [{type: 'cast', card: 'Elf'}]}, {turns: 2});
  assert.deepEqual(costs(r), ['Elf:2']);
  assert.match(r.trace.find(e => e.event === 'action-failed').reason, /land drop/);
});
test('mana creatures wait a turn; new untapped rocks can activate immediately', () => {
  const elf = c('Elf', '{G}', 'Creature — Elf', '{T}: Add {G}.'), rock = c('Rock', '{1}', 'Artifact', '{T}: Add {C}.');
  for (const [ramp, targetCost, sameTurn] of [[elf, '{G}', false], [rock, '{C}', true]]) {
    const r = run([land('Forest', 'G'), ramp, c('Target', targetCost, 'Creature — Beast'), ...filler(5)], {
      1: [{type: 'land', card: 'Forest'}, {type: 'cast', card: ramp.name}, {type: 'cast', card: 'Target'}], 2: [{type: 'cast', card: 'Target'}]
    }, {turns: 2});
    assert.ok(costs(r).includes('Target:' + (sameTurn ? 1 : 2)));
  }
});
test('tapped rocks, non-untapping rocks and summoning-sick tap+sacrifice sources cannot make free mana', () => {
  const cards = [land('Forest', 'G'), c('Monolith', '{1}', 'Artifact', "This artifact enters tapped.\nThis artifact doesn't untap during your untap step.\n{T}: Add {C}{C}{C}."), c('Target', '{3}', 'Creature — Beast'), ...filler(5)];
  const r = run(cards, {1: [{type: 'land', card: 'Forest'}, {type: 'cast', card: 'Monolith'}], 2: [{type: 'cast', card: 'Target'}]}, {turns: 2});
  assert.ok(!costs(r).some(s => s.startsWith('Target')));
  assert.equal(planManaPayments({sources: [{...source('s', [['C']], {sacrifice: true}), sick: true}]}, [spell('{1}')]).status, 'blocked');
});
test('Ulalek hybrid cast and subsequent Eldrazi plus CC are distinct payments with no source reused', () => {
  const ula = c('Ulalek', '{C/W}{C/U}{C/B}{C/R}{C/G}', 'Legendary Creature — Eldrazi', 'Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control.');
  const cards = [land('W1','C'), land('W2','C'), land('W3','C'), land('W4','C'), land('W5','C'), c('Drone','{3}','Creature — Eldrazi Drone'), ...filler(3)];
  const script = Object.fromEntries([1,2,3,4,5].map(n => [n, [{type: 'land', card: 'W'+n}]]));
  script[5].push({type: 'cast', card: 'Ulalek'}); script[6] = [{type: 'cast', card: 'Drone', requireOptional: true}];
  const r = run(cards, script, {commander: ula, turns: 6});
  assert.deepEqual(costs(r), ['Ulalek:5', 'Drone:6']); assert.equal(r.stats.optionalPayments.length, 1);
  const paid = r.trace.filter(e => e.turn === 6 && ['cast-paid','optional-trigger-paid'].includes(e.event)).flatMap(e => e.spent);
  assert.equal(paid.length, 5); assert.equal(new Set(paid.map(u => u.id)).size, 5);
  assert.equal(r.trace.filter(e => e.event === 'optional-trigger-paid')[0].spent.filter(u => u.type === 'C').length, 2);
  assert.equal(auditDeploymentTrace(r,ula,cards).valid,true);
  const altered=structuredClone(r);altered.trace.find(e=>e.event==='optional-trigger-paid').context.abilityType='activated';
  assert.equal(auditDeploymentTrace(altered,ula,cards).valid,false);
});
test('cast-trigger Spawn cannot fund their own spell or pre-resolution optional payment', () => {
  const ula = c('Ulalek', '{0}', 'Legendary Creature — Eldrazi', 'Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control.');
  const drone = c('Drone', '{1}', 'Creature — Eldrazi Drone', 'When you cast this spell, create three 0/1 colorless Eldrazi Spawn creature tokens with "Sacrifice this token: Add {C}."');
  const r = run([land('Wastes', 'C'), drone, c('After', '{3}', 'Artifact'), ...filler(5)], {1: [{type:'cast',card:'Ulalek'},{type:'cast',card:'Drone'},{type:'land',card:'Wastes'},{type:'cast',card:'Drone',requireOptional:true},{type:'cast',card:'Drone'},{type:'cast',card:'After'}]}, {commander: ula, turns:1});
  assert.deepEqual(costs(r), ['Ulalek:1','Drone:1','After:1']); assert.equal(r.stats.optionalPayments.length, 0);
  const resolved = r.trace.findIndex(e => e.event === 'trigger-resolved');
  assert.ok(resolved > r.trace.findIndex(e => e.event === 'cast-paid' && e.card === 'Drone'));
  assert.ok(r.trace.filter(e => e.event === 'mana-activation' && e.sacrifice).every(e => r.trace.indexOf(e) > resolved));
});
test('temporary ritual mana resolves after payment, expires next turn and is not repeatable ramp', () => {
  const ritual = c('Ritual', '{B}', 'Instant', 'Add {B}{B}{B}.');
  const r = run([land('Swamp','B'),ritual,c('Target','{3}','Artifact'),...filler(5)], {1:[{type:'land',card:'Swamp'},{type:'cast',card:'Ritual'}],2:[{type:'cast',card:'Target'}]}, {turns:2});
  assert.ok(!costs(r).includes('Target:2')); assert.equal(r.trace.find(e => e.event === 'turn-end').floatingExpires.length, 3);
  const second = run([land('Swamp','B'),ritual,c('Target','{3}','Artifact'),...filler(5)], {1:[{type:'land',card:'Swamp'},{type:'cast',card:'Ritual'},{type:'cast',card:'Target'}]}, {turns:1});
  assert.ok(costs(second).includes('Target:1'));
});
test('first-creature reduction is used once, only after reducer deployment; tax is paid as generic', () => {
  const reducer = c('Reducer','{0}','Artifact','The first creature spell you cast each turn costs {2} less to cast.');
  const r = run([land('Forest','G'),reducer,c('A','{2}{G}','Creature — Beast'),c('B','{2}','Creature — Beast'),...filler(4)], {1:[{type:'land',card:'Forest'},{type:'cast',card:'Reducer'},{type:'cast',card:'A'},{type:'cast',card:'B'}]}, {turns:1});
  assert.deepEqual(costs(r), ['Reducer:1','A:1']);
  const taxed = run([land('Forest','G'),...filler(7)], {1:[{type:'land',card:'Forest'},{type:'cast',card:'Commander'}]}, {commander:c('Commander','{G}','Legendary Creature — Wizard'),commanderTax:1,turns:1});
  assert.equal(taxed.stats.casts.length,0);
});
test('unmodeled source conditions, extra costs, energy and spell-dependent bonuses are unknown, never mana', () => {
  const cases = ['{T}: Add one mana of any color that a land an opponent controls could produce.', '{T}, Pay {E}: Add one mana of any color.', '{T}: Add {C} for each creature you control.', '{T}: Add {C}. Spend this mana only to cast a spell from your graveyard.'];
  for (const text of cases) { const m = cardModel(c('Unknown', '{1}', 'Artifact', text)); assert.equal(m.modes.length,0); assert.ok(m.unknown.some(s => /unsupported/.test(s))); }
  const m = cardModel(c('Transformer','{2}','Artifact','This artifact enters tapped.\n{T}: Add {C}.\n{T}, Pay {E}: Add one mana of any color.'));
  assert.equal(m.modes.length,1); assert.deepEqual(m.modes[0].outputs,[['C']]);
  const r = run([land('Forest','G'),c('Extra','{G}','Creature — Beast','As an additional cost to cast this spell, sacrifice a creature.'),...filler(6)],{1:[{type:'land',card:'Forest'},{type:'cast',card:'Extra'}]},{turns:1});
  assert.equal(r.stats.casts.length,0); assert.equal(r.trace.find(e=>e.event==='action-failed').status,'unknown');
  for (const text of ['When another creature enters, create two 0/1 colorless Eldrazi Spawn creature tokens with "Sacrifice this token: Add {C}."', 'When this creature enters, create two Treasure tokens and three 0/1 colorless Eldrazi Spawn creature tokens with "Sacrifice this token: Add {C}."']) assert.equal(cardModel(c('Dependent','{2}','Creature — Eldrazi',text)).spawn.length,0);
});
test('deterministic opening, draws, deployment and unknown mechanics across Yuriko, Wilhelt and Zada', () => {
  for (const [name, text] of [['Yuriko', 'Commander ninjutsu {U}{B}'], ['Wilhelt', 'Whenever another Zombie you control dies, create a 2/2 black Zombie creature token.'], ['Zada', 'Whenever you cast an instant or sorcery spell that targets only this creature, copy that spell.']]) {
    const cmd = c(name,'{1}','Legendary Creature — Wizard',text), cards = [...Array.from({length:8},(_,i)=>land('Land'+i,'C')),...filler(12)];
    const a = evaluateDeployment({commander:cmd,cards,seed:'replay-v1'}), b = evaluateDeployment({commander:cmd,cards,seed:'replay-v1'});
    assert.deepEqual(a,b); assert.equal(a.assumptions.rankingIntegration,false); assert.equal(a.stats.optionalPayments.length,0);
    assert.deepEqual(auditDeploymentTrace(a,cmd,cards), {valid:true, errors:[]});
    assert.equal(a.trace.filter(e=>e.event==='draw').length,8); assert.equal(a.trace[0].hand.length,7);
    assert.ok(a.unknown.some(r=>r.card===name));
    assert.notDeepEqual(deploymentOrder(cards,'other'),a.order);
  }
});
test('independent ledger audit catches reused mana, tapping twice and changed payment pips', () => {
  const cards = [land('Forest','G'),c('A','{G}','Artifact'),...filler(6)];
  const r = run(cards,{1:[{type:'land',card:'Forest'},{type:'cast',card:'A'}]},{turns:1});
  assert.equal(auditDeploymentTrace(r,commander,cards).valid,true);
  const duplicate = structuredClone(r), i = duplicate.trace.findIndex(e=>e.event==='mana-activation');
  duplicate.trace.splice(i+1,0,structuredClone(duplicate.trace[i]));
  assert.equal(auditDeploymentTrace(duplicate,commander,cards).valid,false);
  const changed = structuredClone(r); changed.trace.find(e=>e.event==='cast-paid').cost='{C}';
  assert.equal(auditDeploymentTrace(changed,commander,cards).valid,false);
  const alteredContext=structuredClone(r);alteredContext.trace.find(e=>e.event==='cast-paid').context={kind:'ability',abilityType:'activated'};
  assert.equal(auditDeploymentTrace(alteredContext,commander,cards).valid,false);
  const changedGeneric=structuredClone(r);changedGeneric.trace.find(e=>e.event==='cast-paid').cost='{1}';
  assert.equal(auditDeploymentTrace(changedGeneric,commander,cards).valid,false);
  const reused = structuredClone(r), j = reused.trace.findIndex(e=>e.event==='cast-paid');
  reused.trace.splice(j+1,0,structuredClone(reused.trace[j]));
  assert.equal(auditDeploymentTrace(reused,commander,cards).valid,false);
});
test('land thresholds, intrinsic basic types, restricted rocks and pain modes have explicit prerequisites', () => {
  const basic=cardModel(c('Not named Forest','','Basic Land — Forest'));
  assert.deepEqual(basic.modes[0].outputs,[['G']]);
  const temple = c('Temple','','Land','{T}: Add {C}{C}. Activate only if you control five or more lands.');
  const jewel = c('Jewel','{U}','Artifact','This artifact enters tapped.\n{T}: Add {C}{C}. Spend this mana only to activate abilities.');
  assert.equal(cardModel(temple).modes[0].minLands,5);
  assert.equal(cardModel(jewel).modes[0].restriction,'abilities');
  const pain = c('Pain','','Land','{T}: Add {C}.\n{T}: Add {G} or {U}. This land deals 1 damage to you.');
  const cards=[pain,c('Green','{G}','Creature — Beast'),...filler(6)];
  const r=run(cards,{1:[{type:'land',card:'Pain'},{type:'cast',card:'Green'}]},{turns:1});
  assert.deepEqual(costs(r),['Green:1']); assert.equal(r.trace.at(-1).life,39);
  assert.equal(auditDeploymentTrace(r,commander,cards).valid,true);
  const model=cardModel(c('Conditional','','Land','This land enters tapped unless you control a Forest.\n{T}: Add {G}.'));
  assert.equal(model.conditionalEntry,true); assert.equal(model.tapped,true);
  const thresholdCards=[temple,...[1,2,3,4].map(n=>land('L'+n,'C')),c('Six','{6}','Artifact'),...filler(3)];
  const script=Object.fromEntries([1,2,3,4,5].map(n=>[n,[{type:'land',card:n===1?'Temple':'L'+(n-1)},{type:'cast',card:'Six'}]]));
  const threshold=run(thresholdCards,script,{turns:5}); assert.deepEqual(costs(threshold),['Six:5']);
  assert.equal(auditDeploymentTrace(threshold,commander,thresholdCards).valid,true);
});
