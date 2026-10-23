/** Independent receipt replay, not a complete rules/legality certification. */
import {parseManaCost, manaAllowed} from './gameplayMana.mjs';
import {cardModel, cardTypes, cardSubtypes, castContext, isCreature, isLand} from './gameplayCards.mjs';
import {accessModel} from './gameplayAccess.mjs';
import {outletModel} from './gameplayOutlets.mjs';
import {nativeModel} from './gameplayNative.mjs';
import {creatureSacrificeModel} from './gameplaySacrifice.mjs';
import {auditTutorPlans} from './gameplayTutorAudit.mjs';
export function auditDeploymentTrace(result, commander, cards) {
  const definitions = new Map(cards.map((c, i) => ['deck-' + i, c])); definitions.set('commander', commander);
  const board = new Map(), pool = new Map(), errors = [];
  let life = 40, turn = 0, pendingSpell, commanderCasts=0,creatureCasts=0;
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
    if(e.event==='native-tutor-choice'){for(const reason of auditTutorPlans(e,{board,pool,life,turn,definitions,commander,creatureCasts}))error(e.event,reason);}
    else if(e.event==='end-step-sacrifice'){if(!result.stage8||!board.has(e.victim))error(e.event,'unavailable sacrifice');board.delete(e.victim);}
    else if(e.event==='creature-sacrifice-paid'){
      const source=board.get(e.source),victim=board.get(e.victim),ability=source&&creatureSacrificeModel(source.card)[e.abilityIndex],context={kind:'ability',abilityType:'activated',types:source?cardTypes(source.card):[]};
      if(!result.stage9||!ability||!victim||!isCreature(victim.card)||e.victim==='commander'||e.cost!==ability.cost||e.reduction!==0||JSON.stringify(e.context)!==JSON.stringify(context)||e.spent.some(u=>u.source===e.victim))error(e.event,'illegal creature sacrifice payment/reserved victim');
      spend(e.spent,e.cost,context,e.reduction);
    }else if(e.event==='creature-sacrifice-cost'){if(!result.stage9||!board.has(e.victim))error(e.event,'creature already spent');board.delete(e.victim);}
    else if(e.event==='disruption-move'){if(!result.stage7||!board.has(e.id))error(e.event,'unavailable disruption source');board.delete(e.id);}
    else if(e.event==='copy-created'&&result.schemaVersion===4){const card=definitions.get(e.original);if(!card||definitions.has(e.id))error(e.event,'invalid copy definition');else definitions.set(e.id,card);
    }else if(e.event==='native-legend-rule'&&result.schemaVersion===4)board.delete(e.id);
    else if (e.event === 'untap') {
      pool.clear();creatureCasts=0;
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
      const context=castContext(card,e.id==='commander'), cost=cardModel(card).cost+(e.id==='commander'&&(result.stage7?commanderCasts:result.assumptions.commanderTaxPriorCasts)?`{${2*(result.stage7?commanderCasts:result.assumptions.commanderTaxPriorCasts)}}`:'');
      if(e.id==='commander')commanderCasts++;if(isCreature(card))creatureCasts++;
      if (JSON.stringify(context)!==JSON.stringify(e.context) || e.cost!==(result.schemaVersion===4&&e.freeCast?'':cost)) error(e.event,'spell context/printed cost differs');
      spend(e.spent,e.cost,context,e.reduction);
    } else if(e.event==='native-trigger-paid'&&result.schemaVersion===4){
      const card=definitions.get(e.source),cause=definitions.get(e.causedBy),context={kind:'ability',abilityType:'triggered',types:card?cardTypes(card):[]};
      if(!card||!nativeModel(card).ulalek||!cause||!cardSubtypes(cause).includes('Eldrazi')||e.cost!=='{C}{C}'||e.reduction!==0||JSON.stringify(context)!==JSON.stringify(e.context))error(e.event,'invalid native optional payment');
      spend(e.spent,e.cost,context,e.reduction);
    } else if(e.event==='native-noop-group'&&result.stage5&&e.reason==='C-upper-bound'){
      // Independent upper bound: ignore fees and restrictions, overestimating C.
      let upper=[...pool.values()].filter(u=>u.type==='C').length;
      for(const s of board.values())upper+=Math.max(0,...s.model.modes.filter(m=>(!m.minLands||[...board.values()].filter(b=>isLand(b.card)).length>=m.minLands)&&!(m.tap&&(s.tapped||isCreature(s.card)&&s.since===turn&&!s.model.haste))).flatMap(m=>m.outputs.map(o=>o.filter(t=>t==='C').length)));
      if(upper>=2||e.colorlessUpperBound!==upper)error(e.event,'no proof that C C is impossible');
    } else if(e.event==='outlet-paid'&&result.stage5){
      const s=board.get(e.source),victim=board.get(e.victim),a=s&&outletModel(s.card).sacrificeDamage,context={kind:'ability',abilityType:'activated',types:s?cardTypes(s.card):[]};
      if(!a||!victim||!cardSubtypes(victim.card).includes('Eldrazi')||e.cost!==a.cost||e.reduction!==0||JSON.stringify(context)!==JSON.stringify(e.context))error(e.event,'outlet fee/source/reserved victim invalid');
      if(e.spent.some(u=>u.source===e.victim))error(e.event,'sacrifice also paid mana');
      spend(e.spent,e.cost,context,e.reduction);
    } else if(e.event==='outlet-sacrifice'&&result.stage5){
      const victim=board.get(e.victim);if(!victim||!cardSubtypes(victim.card).includes('Eldrazi'))error(e.event,'sacrifice missing or already spent');else board.delete(e.victim);
    } else if (e.event === 'optional-trigger-paid') {
      const source=board.get(e.label.replace(/^cast-trigger:/,''));
      const trigger=source?.model.castPayment, context={kind:'ability',abilityType:'triggered',types:source?cardTypes(source.card):[]};
      if (!pendingSpell || !trigger || !cardSubtypes(pendingSpell).includes(trigger.subtype) || e.cost!==trigger.cost || e.reduction!==0 || JSON.stringify(context)!==JSON.stringify(e.context)) error(e.event,'optional payment is not a supported pending triggered ability');
      spend(e.spent,e.cost,context,e.reduction);
    } else if(e.event==='activated-access-paid') {
      const s=board.get(e.source),a=s&&accessModel(s.card).abilities[e.abilityIndex],context={kind:'ability',abilityType:'activated',types:s?cardTypes(s.card):[]};
      if(!a||e.cost!==a.cost||e.reduction!==0||JSON.stringify(context)!==JSON.stringify(e.context))error(e.event,'unsupported access activation/payment context');
      spend(e.spent,e.cost,context,e.reduction);
    } else if(e.event==='access-costs') {
      const s=board.get(e.source),a=s&&accessModel(s.card).abilities[e.abilityIndex];
      if(!a||a.tap!==e.tap||a.sacrifice!==e.sacrifice||a.life!==e.life)error(e.event,'access costs differ from source');
      if(s&&a){
        if(a.tap&&(s.tapped||isCreature(s.card)&&s.since===turn&&!s.model.haste))error(e.event,'access source tapped/sick');
        life-=a.life;if(life<=0)error(e.event,'lethal activation payment');
        if(a.tap)s.tapped=true;if(a.sacrifice)board.delete(e.source);
      }
    } else if(e.event==='give-away')board.delete(e.id);
    else if(e.event==='life-loss')life-=e.count;
    else if(e.event==='life-gain'){if(!result.stage9)error(e.event,'unsupported life gain');life+=e.count;}
    else if(e.event==='spell-resolved')pendingSpell=null;
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
