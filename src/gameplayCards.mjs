/** Deliberately small Oracle grammar, not keyword/role inference. Unrecognized
 * mana clauses supply NO mana. Cast payment and resolved effects are separate. */
import {faces} from './cards.mjs';
export const front = c => faces(c)[0];
export const cardTypes = c => (front(c).type_line || '').split('—')[0].trim().split(/\s+/);
export const cardSubtypes = c => (front(c).type_line || '').split('—')[1]?.trim().split(/\s+/) || [];
export const cardText = c => front(c).oracle_text || '';
export const isCreature = c => cardTypes(c).includes('Creature');
export const isLand = c => cardTypes(c).includes('Land');
export const isColorless = c => /\bDevoid\b/.test(cardText(c)) || !/[WUBRG]/.test(front(c).mana_cost || '');
export const castContext = (c, commander = false) => ({kind: 'spell', types: cardTypes(c), subtypes: cardSubtypes(c), commander});
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const counts = {a: 1, an: 1, one: 1, two: 2, three: 3, four: 4};
export function cardModel(card, identity = []) {
  const f = front(card), text = cardText(card), unknown = [], modes = [], reducers = [];
  const entry = text.split('\n').filter(l => /enters? (?:the battlefield )?tapped/i.test(l));
  const conditionalEntry = entry.some(l => /\b(?:unless|if|as long as|you may|instead)\b/i.test(l));
  // An uncertain land drop may be recorded, but cannot be used for mana that
  // turn. Its entry condition is not claimed to have been simulated.
  if (conditionalEntry) unknown.push('conditional entry; mana withheld on entry turn');
  if (card.layout && !['normal', 'token'].includes(card.layout)) unknown.push('alternate faces/transform/craft not evaluated; front face only');
  for (const original of text.split('\n')) {
    const line = original.replace(/ \([^()]*\)\.?$/g, '').trim();
    if (!/\bAdd\b/.test(line) || !line.includes(':')) continue;
    const match = line.match(/^(.*?): Add (.*)$/);
    if (!match) { unknown.push('unsupported mana clause: ' + original); continue; }
    const [, activation, production] = match;
    const tap = activation.includes('{T}');
    const self = `(?:this (?:artifact|creature|land|token)|${escape(f.name || card.name)})`;
    const sacrifice = new RegExp(`Sacrifice ${self}`, 'i').test(activation);
    const cleaned = activation.replace(/\{T\}/g, '').replace(new RegExp(`Sacrifice ${self}`, 'ig'), '').replace(/[,\s]/g, '');
    if ((!tap && !sacrifice) || cleaned.replace(/\{[0-9WUBRGC/]+\}/g, '') || /\{(?:E|Q)\}/.test(activation)) { unknown.push('unsupported activation cost: ' + original); continue; }
    const [body, ...tail] = production.split(/\.\s*/), suffix = tail.filter(Boolean).join('. ');
    let outputs;
    if (/^(?:one|a) mana of any color(?: in your commander's color identity)?$/.test(body)) outputs = (/commander's color identity/.test(body) ? identity : ['W','U','B','R','G']).map(c => [c]);
    else if (/^(?:\{[WUBRGC]\})+(?:,? or (?:\{[WUBRGC]\})+)*$/.test(body)) outputs = body.split(/,? or /).map(part => [...part.matchAll(/\{([WUBRGC])\}/g)].map(m => m[1]));
    // Oxford-comma choices are common on tri-color lands.
    else if (/^\{[WUBRGC]\}(?:, \{[WUBRGC]\})*, or \{[WUBRGC]\}$/.test(body)) outputs = [...body.matchAll(/\{([WUBRGC])\}/g)].map(m => [m[1]]);
    if (!outputs?.length) { unknown.push('unsupported mana production: ' + original); continue; }
    let restriction = 'none', life = 0, minLands = 0, remaining = suffix;
    const restrictions = [
      [/This mana can't be spent to cast nonartifact spells/i, 'powerstone'],
      [/Spend this mana only to activate abilities/i, 'abilities'],
      [/Spend this mana only to cast creature spells/i, 'creatures'],
      [/Spend this mana only to cast Eldrazi spells/i, 'eldrazi'],
      [/Spend this mana only to cast your commander/i, 'commander']
    ];
    for (const [re, kind] of restrictions) if (re.test(remaining)) { restriction = kind; remaining = remaining.replace(re, '').replace(/^\.\s*/, ''); }
    const damage = remaining.match(/(?:This (?:artifact|creature|land)|.+?) deals 1 damage to you/i);
    if (damage) { life = 1; remaining = remaining.replace(damage[0], '').replace(/^\.\s*/, ''); }
    if (/Activate only if you control five or more lands/i.test(remaining)) { minLands = 5; remaining = remaining.replace(/Activate only if you control five or more lands/i, '').replace(/^\.\s*/, ''); }
    // Scry is optional future card access, not extra mana or a free draw.
    if (/^When that mana is spent [^.]*, scry 1\.?$/i.test(remaining)) { unknown.push('mana-spend scry not resolved'); remaining = ''; }
    if (remaining.replace(/[.\s]/g, '')) { unknown.push('unsupported mana condition: ' + original); continue; }
    modes.push({tap, sacrifice, cost: cleaned, outputs, restriction, life, minLands});
  }
  // Basic land types grant intrinsic abilities even if reminder text is absent.
  if (isLand(card)) for (const [subtype, color] of [['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G']]) {
    if (cardSubtypes(card).includes(subtype) && !modes.some(m => m.outputs.some(o => o.length === 1 && o[0] === color))) modes.push({tap: true, cost: '', outputs: [[color]]});
  }
  for (const line of text.split('\n')) {
    let m;
    if ((m = line.match(/^Colorless spells you cast cost \{(\d+)\} less to cast\.$/))) reducers.push({kind: 'colorless', amount: +m[1]});
    else if ((m = line.match(/^The first creature spell you cast each turn costs \{(\d+)\} less to cast\.$/))) reducers.push({kind: 'firstCreature', amount: +m[1]});
    else if ((m = line.match(/^Creature spells you cast cost \{(\d+)\} less to cast\.$/))) reducers.push({kind: 'creatures', amount: +m[1]});
    else if (/cost.*less to cast/i.test(line)) unknown.push('unsupported cost reduction: ' + line);
  }
  const spawn = [];
  for (const line of text.split('\n')) {
    const m = line.match(new RegExp(`^(When you cast this spell|When (?:this creature|this artifact|this land|${escape(f.name || card.name)}) enters(?: the battlefield)?), create (a|one|two|three|four) (?:0/1|1/1) colorless Eldrazi (Spawn|Scion) creature tokens? with "Sacrifice this token: Add \\{C\\}\\."$`));
    if (m) spawn.push({phase: m[1].startsWith('When you cast') ? 'cast' : 'entry', count: counts[m[2]], subtype: m[3]});
  }
  const castPayment = text.match(/^Whenever you cast an? (\w+) spell, you may pay ((?:\{[0-9WUBRGC/]+\})+)\./m);
  const spellCost = f.mana_cost;
  const ritual = text.match(/^Add ((?:\{[WUBRGC]\})+)\.$/);
  const ritualMana = ritual ? [...ritual[1].matchAll(/\{([WUBRGC])\}/g)].map(m => m[1]) : null;
  const extraCost = /as an additional cost to cast|this spell costs .*more to cast|rather than pay|bestow|prototype/i.test(text);
  if (extraCost) unknown.push('additional/alternate casting cost not evaluated');
  if (text) unknown.push('other Oracle effects not simulated (including draw, copying, tutoring, combat and targets)');
  return {cost: spellCost, modes, reducers, spawn, castPayment: castPayment ? {subtype: castPayment[1], cost: castPayment[2]} : null,
    tapped: !!entry.length, conditionalEntry, haste: /^Haste\b/m.test(text), noNaturalUntap: /doesn't untap|does not untap/i.test(text), extraCost,
    ritualMana, unknownTax: /spells? .*costs? .*more to cast/i.test(text),
    permanent: cardTypes(card).some(t => ['Artifact','Creature','Enchantment','Planeswalker','Battle'].includes(t)),
    unknown};
}
