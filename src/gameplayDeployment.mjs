/** Bounded, observational single-main-phase deployment evaluator. Never imported
 * by the constructor/comparator. A paid cast is not a resolved combo or win. */
import {planManaPayments, parseManaCost} from './gameplayMana.mjs';
import {cardModel, cardTypes, cardSubtypes, isLand, isCreature, isColorless, castContext} from './gameplayCards.mjs';
function random(seed) {
  let x = 2166136261;
  for (const c of String(seed)) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => { x += 0x6D2B79F5; let t = Math.imul(x ^ x >>> 15, 1 | x); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function deploymentOrder(cards, seed) {
  const order = cards.map((_, i) => i), rng = random(seed);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}
export function evaluateDeployment({commander, cards, seed = 'deployment-stage1-v1', turns = 8, order,
  script, maxManaStates = 4000, commanderTax = 0, optimizeMana = false, onManaAttempt} = {}) {
  if (!commander || !Array.isArray(cards) || cards.length > 99 || !Number.isInteger(turns) || turns < 1 || turns > 8 || !Number.isInteger(commanderTax) || commanderTax < 0 || commanderTax > 10) throw Error('Invalid deployment inputs/bounds');
  order ??= deploymentOrder(cards, seed);
  if (order.length !== cards.length || new Set(order).size !== cards.length || order.some(i => !Number.isInteger(i) || i < 0 || i >= cards.length)) throw Error('Order must be an exact permutation of deck slots');
  const models = new Map(), modelFor = c => { if (!models.has(c)) models.set(c, cardModel(c, commander.color_identity || [])); return models.get(c); };
  const slots = cards.map((card, i) => ({id: 'deck-' + i, card, model: modelFor(card)}));
  const command = {id: 'commander', card: commander, model: modelFor(commander)};
  const library = order.map(i => slots[i]), hand = library.splice(0, 7), board = [], trace = [];
  let pool = [], life = 40, commanderCast = false, tokenId = 0, turn = 0, creatureCasts = 0, landPlayed = false;
  const stats = {casts: [], optionalPayments: [], manaSearches: 0, manaStates: 0, boundHits: 0};
  const emit = event => trace.push({turn, ...event});
  emit({event: 'opening', hand: hand.map(s => ({id: s.id, card: s.card.name}))});
  function sourceState() {
    const landCount = board.filter(s => !s.consumed && isLand(s.card)).length;
    return {pool, life, sources: board.map(s => ({id: s.id, types: cardTypes(s.card), subtypes: cardSubtypes(s.card),
      modes: s.model.modes.filter(m => !m.minLands || landCount >= m.minLands), tapped: s.tapped, consumed: s.consumed,
      sick: isCreature(s.card) && s.since === turn && !s.model.haste}))};
  }
  function payment(slot, reserveOptional) {
    const c = slot.card, m = slot.model;
    if (!m.permanent && !m.ritualMana || cardSubtypes(c).includes('Aura')) return {status: 'unknown', reason: 'nonpermanent/target legality and effects not evaluated', states: 0};
    if (board.some(s => !s.consumed && s.model.unknownTax)) return {status: 'unknown', reason: 'unmodeled battlefield cost increase', states: 0};
    if (m.extraCost || m.cost == null || !parseManaCost(m.cost)) return {status: 'unknown', reason: 'unsupported or missing casting cost', states: 0};
    const reduction = board.filter(s => !s.consumed).flatMap(s => s.model.reducers).reduce((n, r) => n + ((r.kind === 'colorless' && isColorless(c) || r.kind === 'creatures' && isCreature(c) || r.kind === 'firstCreature' && isCreature(c) && creatureCasts === 0) ? r.amount : 0), 0);
    const cost = m.cost + (slot === command && commanderTax ? `{${2 * commanderTax}}` : '');
    // Commander tax is an additional generic cost, then reductions apply.
    const payments = [{label: 'spell', cost, reduction, context: castContext(c, slot === command)}];
    const triggers = board.filter(s => !s.consumed && s.model.castPayment && cardSubtypes(c).includes(s.model.castPayment.subtype));
    if (reserveOptional) for (const s of triggers) payments.push({label: 'cast-trigger:' + s.id, cost: s.model.castPayment.cost, context: {kind: 'ability', abilityType: 'triggered', types: cardTypes(s.card)}});
    const state = sourceState(), result = planManaPayments(state, payments, {maxStates: maxManaStates, optimized: optimizeMana});
    onManaAttempt?.({state, payments, result, turn, card: c.name});
    stats.manaSearches++; stats.manaStates += result.states; if (result.status === 'unknown' && result.reason.includes('bound')) stats.boundHits++;
    return {...result, triggers};
  }
  function resolveSpawn(slot, phase) {
    for (const spawn of slot.model.spawn.filter(s => s.phase === phase)) {
      emit({event: 'trigger-resolved', source: slot.id, phase, effect: 'create ' + spawn.count + ' ' + spawn.subtype});
      for (let i = 0; i < spawn.count; i++) {
        const card = {name: 'Eldrazi ' + spawn.subtype, type_line: 'Token Creature — Eldrazi ' + spawn.subtype, mana_cost: '', oracle_text: 'Sacrifice this token: Add {C}.'};
        const token = {id: 'token-' + tokenId++, card, model: modelFor(card), since: turn, tapped: false};
        board.push(token); emit({event: 'token-created', id: token.id, card});
      }
    }
  }
  function cast(slot, requireOptional = false) {
    let result = payment(slot, true), declined;
    if (result.status !== 'paid' && !requireOptional) { declined = {status: result.status, reason: result.reason}; result = payment(slot, false); }
    if (result.status !== 'paid') return result;
    // Commit only after the complete payment plan has succeeded.
    pool = result.pool; life = result.life;
    for (const receipt of result.receipts) {
      if (receipt.kind === 'activation') {
        const s = board.find(s => s.id === receipt.source);
        if (receipt.tap) s.tapped = true;
        if (receipt.sacrifice) s.consumed = true;
        emit({event: 'mana-activation', card: s.card.name, ...receipt});
      } else if (receipt.label === 'spell') {
        emit({event: 'cast-paid', card: slot.card.name, id: slot.id, ...receipt});
        for (const s of result.triggers) emit({event: 'cast-trigger-pending', source: s.id, cost: s.model.castPayment.cost});
        for (const s of slot.model.spawn.filter(s => s.phase === 'cast')) emit({event: 'token-trigger-pending', source: slot.id, count: s.count, availableNow: false});
      } else {
        emit({event: 'optional-trigger-paid', card: slot.card.name, ...receipt, effect: 'unknown: copying effects not simulated'});
        stats.optionalPayments.push({turn, card: slot.card.name, cost: receipt.cost});
      }
    }
    if (declined) for (const s of result.triggers) emit({event: 'optional-trigger-declined', source: s.id, ...declined, policy: 'pay before resolving token triggers; no token credit in advance'});
    if (slot === command) commanderCast = true;
    else hand.splice(hand.indexOf(slot), 1);
    if (isCreature(slot.card)) creatureCasts++;
    stats.casts.push({turn, card: slot.card.name, commander: slot === command});
    // Explicit stack boundary: no cast/entry resources existed during payment.
    resolveSpawn(slot, 'cast');
    if (slot.model.ritualMana) {
      const produced = slot.model.ritualMana.map((type, n) => ({id: slot.id + ':ritual:' + n, source: slot.id, type, restriction: 'none'}));
      pool.push(...produced); emit({event: 'ritual-resolved', source: slot.id, produced});
    } else {
      board.push({...slot, since: turn, tapped: slot.model.tapped});
      emit({event: 'permanent-resolved', card: slot.card.name, id: slot.id, tapped: slot.model.tapped, effects: slot.model.unknown});
      resolveSpawn(slot, 'entry');
    }
    return result;
  }
  function land(slot) {
    if (landPlayed) return {status: 'blocked', reason: 'land drop already used'};
    if (!slot || !hand.includes(slot) || !isLand(slot.card)) return {status: 'blocked', reason: 'land not in hand/front face not land'};
    landPlayed = true; hand.splice(hand.indexOf(slot), 1);
    board.push({...slot, since: turn, tapped: slot.model.tapped});
    emit({event: 'land', card: slot.card.name, id: slot.id, tapped: slot.model.tapped, unknown: slot.model.conditionalEntry});
    resolveSpawn(slot, 'entry');
    return {status: 'played'};
  }
  for (turn = 1; turn <= turns; turn++) {
    pool = []; creatureCasts = 0; landPlayed = false;
    for (const s of board) if (!s.model.noNaturalUntap) s.tapped = false;
    emit({event: 'untap', sources: sourceState().sources});
    const draw = library.shift(); if (draw) { hand.push(draw); emit({event: 'draw', card: draw.card.name, id: draw.id}); }
    if (script) {
      for (const action of script[turn] || []) {
        const slot = action.card === commander.name && !commanderCast ? command : hand.find(s => s.card.name === action.card);
        const result = action.type === 'land' ? land(slot) : action.type === 'cast' && slot && !isLand(slot.card) ? cast(slot, !!action.requireOptional) : {status: 'unknown', reason: 'unsupported action/card unavailable'};
        if (!['paid','played'].includes(result.status)) emit({event: 'action-failed', action, status: result.status, reason: result.reason});
      }
    } else {
      const lands = hand.filter(s => isLand(s.card)).sort((a, b) => Number(a.model.tapped) - Number(b.model.tapped) || b.model.modes.length - a.model.modes.length || a.id.localeCompare(b.id));
      if (lands[0]) land(lands[0]);
      for (let action = 0; action < 16; action++) {
        const choices = [...hand.filter(s => !isLand(s.card) && (s.model.permanent || s.model.ritualMana)), ...(!commanderCast ? [command] : [])];
        const priority = s => s.model.modes.length ? 0 : s === command ? 1 : 2;
        choices.sort((a, b) => priority(a) - priority(b) || (parseManaCost(a.model.cost || '{X}')?.length ?? 99) - (parseManaCost(b.model.cost || '{X}')?.length ?? 99) || a.id.localeCompare(b.id));
        const choice = choices.find(s => payment(s, false).status === 'paid');
        if (!choice) break;
        cast(choice);
      }
    }
    for (const slot of [...hand.filter(s => !isLand(s.card)), ...(!commanderCast ? [command] : [])]) {
      const result = payment(slot, false);
      emit({event: 'remaining-card', card: slot.card.name, id: slot.id, status: result.status === 'paid' ? 'payable-but-not-selected' : result.status, reason: result.reason || 'script/action bound or policy', states: result.states,
        optional: result.triggers?.length ? (() => { const r = payment(slot, true); return {status: r.status, reason: r.reason}; })() : null});
    }
    emit({event: 'turn-end', hand: hand.map(s => s.card.name), board: board.filter(s => !s.consumed).map(s => ({id: s.id, card: s.card.name, tapped: s.tapped})), floatingExpires: pool, life});
  }
  return {schemaVersion: 1, evaluator: 'deployment-stage1-v1', seed, turns, order, commander: commander.name,
    assumptions: {opening: 7, mulligan: 'none', drawOnTurnOne: true, naturalDrawsPerTurn: 1, landDropsPerTurn: 1, phases: 'one precombat main phase; floating mana expires each turn', opponents: 'none', commanderTaxPriorCasts: commanderTax,
      policy: script ? 'explicit scripted schedule' : 'untapped land first; affordable ramp, commander, then cheapest permanent; not optimal play', optionalPayment: 'reserved before any cast/entry token trigger resolves', rankingIntegration: false},
    stats, unknown: [...models].map(([card, model]) => ({card: card.name, reasons: model.unknown})).filter(r => r.reasons.length), trace};
}
