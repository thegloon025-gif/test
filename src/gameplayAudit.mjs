/** Independent receipt replay, not a complete rules/legality certification. */
import {parseManaCost, manaAllowed} from './gameplayMana.mjs';
import {cardModel, cardTypes, cardSubtypes, castContext, isCreature, isLand} from './gameplayCards.mjs';
export function auditDeploymentTrace(result, commander, cards) {
  const definitions = new Map(cards.map((c, i) => ['deck-' + i, c])); definitions.set('commander', commander);
  const board = new Map(), pool = new Map(), errors = [];
  let life = 40, turn = 0, pendingSpell;
  const error = (event, reason) => errors.push({turn, event, reason});
  function spend(units, cost, context, reduction = 0) {
    const pips = parseManaCost(cost, reduction), available = [];
    for (const u of units) {
      const actual = pool.get(u.id);
      if (!actual || actual.type !== u.type || actual.restriction !== u.restriction) error('payment', 'unit missing, changed or already spent: ' + u.id);
      else available.push(actual);
      pool.delete(u.id);
    }
    if (!pips || pips.length !== units.length) { error('payment', 'incorrect payment size/cost'); return; }
    const assignment = new Map();
    function match(i, seen) {
      for (let j = 0; j < available.length; j++) if (!seen.has(j) && manaAllowed(available[j], context) && (pips[i].includes('*') || pips[i].includes(available[j].type))) {
        seen.add(j);
        if (!assignment.has(j) || match(assignment.get(j), seen)) { assignment.set(j, i); return true; }
      }
      return false;
    }
    for (let i = 0; i < pips.length; i++) if (!match(i, new Set())) error('payment', 'pip/restriction not satisfied: ' + pips[i].join('/'));
  }
  for (const e of result.trace) {
    turn = e.turn;
    if (e.event === 'untap') {
      pool.clear();
      for (const s of board.values()) if (!s.model.noNaturalUntap) s.tapped = false;
    } else if (e.event === 'land' || e.event === 'permanent-resolved' || e.event === 'token-created') {
      const card = e.event === 'token-created' ? e.card : definitions.get(e.id);
      if (!card) { error(e.event, 'unknown card identity'); continue; }
      if (e.event === 'token-created') definitions.set(e.id, card);
      board.set(e.id, {card, model: cardModel(card, commander.color_identity || []), tapped: !!e.tapped, since: turn});
      if (e.event === 'permanent-resolved') pendingSpell = null;
    } else if (e.event === 'mana-activation') {
      const s = board.get(e.source), mode = e.ability;
      if (!s) { error(e.event, 'source not on battlefield'); continue; }
      if (!s.model.modes.some(m => JSON.stringify(m) === JSON.stringify(mode))) error(e.event, 'ability not supported by source');
      if (mode.tap && (s.tapped || isCreature(s.card) && s.since === turn && !s.model.haste)) error(e.event, 'source tapped or summoning sick');
      if (mode.minLands && [...board.values()].filter(b => isLand(b.card)).length < mode.minLands) error(e.event, 'land-count activation prerequisite missing');
      spend(e.spent, mode.cost || '', {kind: 'ability', abilityType: 'activated', types: cardTypes(s.card)});
      if (!mode.outputs.some(o => JSON.stringify(o) === JSON.stringify(e.produced.map(u => u.type)))) error(e.event, 'production not a supported fixed choice');
      for (const u of e.produced) {
        if (pool.has(u.id) || u.restriction !== (mode.restriction || 'none')) error(e.event, 'duplicate or incorrect production');
        pool.set(u.id, u);
      }
      life -= mode.life || 0; if (life <= 0) error(e.event, 'life payment lethal');
      if (mode.tap) s.tapped = true;
      if (mode.sacrifice) board.delete(e.source);
    } else if (e.event === 'cast-paid') {
      const card=definitions.get(e.id);
      if (!card) { error(e.event,'unknown spell identity'); continue; }
      pendingSpell=card;
      const context=castContext(card,e.id==='commander'), cost=cardModel(card).cost+(e.id==='commander'&&result.assumptions.commanderTaxPriorCasts?`{${2*result.assumptions.commanderTaxPriorCasts}}`:'');
      if (JSON.stringify(context)!==JSON.stringify(e.context) || e.cost!==cost) error(e.event,'spell context/printed cost differs');
      spend(e.spent,e.cost,context,e.reduction);
    } else if (e.event === 'optional-trigger-paid') {
      const source=board.get(e.label.replace(/^cast-trigger:/,''));
      const trigger=source?.model.castPayment, context={kind:'ability',abilityType:'triggered',types:source?cardTypes(source.card):[]};
      if (!pendingSpell || !trigger || !cardSubtypes(pendingSpell).includes(trigger.subtype) || e.cost!==trigger.cost || e.reduction!==0 || JSON.stringify(context)!==JSON.stringify(e.context)) error(e.event,'optional payment is not a supported pending triggered ability');
      spend(e.spent,e.cost,context,e.reduction);
    }
    else if (e.event === 'ritual-resolved') {
      const card = definitions.get(e.source), output = card && cardModel(card).ritualMana;
      if (JSON.stringify(output) !== JSON.stringify(e.produced.map(u => u.type))) error(e.event, 'ritual output differs');
      for (const u of e.produced) pool.set(u.id, u);
      pendingSpell=null;
    } else if (e.event === 'turn-end') {
      if (e.life !== life) error(e.event, 'life balance mismatch');
      if (JSON.stringify([...pool.keys()].sort()) !== JSON.stringify(e.floatingExpires.map(u => u.id).sort())) error(e.event, 'pool balance mismatch');
    }
  }
  return {valid: errors.length === 0, errors};
}
