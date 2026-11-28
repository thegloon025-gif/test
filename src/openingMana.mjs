// Compare the printed costs of this deck's early spells against two physical land slots.
import { isLandSlot, landFaces } from './cards.mjs';
import { allocateMana, sourceGrammar } from './functionalGoldfish.mjs';

const fast = 'This land enters tapped unless you control two or fewer other lands.';
const shock = "As this land enters, you may pay 2 life. If you don't, it enters tapped.";
const basicTypes = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G' };
const tapped = /^This land enters (?:the battlefield )?tapped\.$/i;

export function earlySpellCosts(commander, cards) {
  const costs = new Map();
  for (const card of [commander, ...cards]) {
    if (isLandSlot(card) || card.card_faces?.length || ![1, 2].includes(Number(card.cmc))) continue;
    const cost = card.mana_cost || '';
    const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map(match => match[1]);
    if (!symbols.length || !/^(?:\{(?:\d+|[WUBRGC](?:\/[WUBRGC])?)\})+$/.test(cost)) continue;
    const turn = symbols.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : 1), 0);
    if (turn !== Number(card.cmc)) continue;
    if (!costs.has(cost)) costs.set(cost, { cost, turn, cards: [] });
    costs.get(cost).cards.push(card.name);
  }
  return [...costs.values()];
}

// Only claim a payment when entry and mana output are both understood.
// Shocklands assume the player chooses to pay life. Fastlands are ready on either land drop.
export function earlyLandSource(card, commander) {
  if (!isLandSlot(card) || card.card_faces?.length || card.catalogMissing || /Creature/.test(card.type_line)) return null;
  const lines = (landFaces(card)[0].oracle_text || '').replaceAll(card.name, 'This land').split('\n');
  let delayed = false;
  const mana = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (tapped.test(line)) delayed = true;
    else if (line === fast || line === shock || /^Cycling \{\d+\}(?: \(.*\))?$/.test(line) || /^When this land enters, (?:scry 1|surveil 1|you gain 1 life)\.$/i.test(line)) continue;
    else mana.push(line);
  }
  const manaText = mana.join('\n').trim();
  let source = sourceGrammar({ ...card, oracle_text: manaText });
  if (!source && !manaText) {
    const types = card.type_line.split('—')[1]?.trim().split(/\s+/) || [];
    source = { options: types.map(type => basicTypes[type]).filter(Boolean), units: 1 };
  }
  if (!source && /^\(?\{T\}: Add \{[WUBRGC]\}(?:, \{[WUBRGC]\})+, or \{[WUBRGC]\}\.\)?$/.test(manaText)) {
    source = { options: [...manaText.matchAll(/\{([WUBRGC])\}/g)].map(match => match[1]), units: 1 };
  }
  if (!source && manaText === "{T}: Add one mana of any color in your commander's color identity.") {
    source = { options: commander.color_identity || [], units: 1 };
  }
  if (!source?.options.length || source.tapped || (manaText && !/^\(?\{T\}: Add [^.]+\.\)?$/.test(manaText))) return null;
  return { options: source.options, units: source.units, delayed };
}

const pairsOf = n => n * Math.max(0, n - 1) / 2;

const paymentCache = new Map();
function payable(target, sources) {
  const key = JSON.stringify([target.cost, sources.map(s => [s.options, s.units])]);
  if (!paymentCache.has(key)) {
    if (paymentCache.size >= 4096) paymentCache.clear();
    paymentCache.set(key, allocateMana(target.cost, sources.map((s, id) => ({ ...s, id }))).status === 'supported');
  }
  return paymentCache.get(key);
}

export function pairPays(target, a, b) {
  if (target.turn === 1) return (!a.delayed && payable(target, [a])) || (!b.delayed && payable(target, [b]));
  // Put a delayed land down first. If both are delayed, only the first one untaps on turn two.
  if (a.delayed && b.delayed) return payable(target, [a]) || payable(target, [b]);
  return payable(target, [a, b]);
}

export function openingManaReview(commander, cards, forcedTapped) {
  const lands = cards.filter(isLandSlot);
  const pairs = pairsOf(lands.length);
  const groups = new Map();
  for (const card of lands) {
    const source = earlyLandSource(card, commander);
    if (!source) continue;
    const key = JSON.stringify(source);
    if (!groups.has(key)) groups.set(key, { source, count: 0 });
    groups.get(key).count++;
  }
  const sources = [...groups.values()];
  const known = sources.reduce((sum, group) => sum + group.count, 0);
  const modeledPairs = pairsOf(known);
  const costs = earlySpellCosts(commander, cards).map(target => {
    let payablePairs = 0;
    for (const [i, a] of sources.entries()) {
      for (let j = i; j < sources.length; j++) {
        const b = sources[j];
        const weight = i === j ? pairsOf(a.count) : a.count * b.count;
        if (weight && pairPays(target, a.source, b.source)) payablePairs += weight;
      }
    }
    return { ...target, payablePairs };
  });
  return { pairs, modeledPairs, forcedTappedPairFraction: pairs ? pairsOf(forcedTapped) / pairs : null, costs };
}
