/** Stage 1 resource ledger. Independent of deck ranking. All pool units have a
 * fixed type; choices belong to source activations, never to floating mana. */
export function parseManaCost(cost, reduction = 0) {
  if (!Number.isSafeInteger(reduction) || reduction < 0) return null;
  const text = String(cost), symbols = [...text.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
  if (text.replace(/\{[^}]+\}/g, '').trim() || symbols.some(s => !/^\d+$|^[WUBRGC](?:\/[WUBRGC])?$/.test(s))) return null;
  const generic = Math.max(0, symbols.filter(s => /^\d+$/.test(s)).reduce((n, s) => n + Number(s), 0) - reduction);
  if (!Number.isSafeInteger(generic) || generic + symbols.filter(s => !/^\d+$/.test(s)).length > 40) return null;
  return [...symbols.filter(s => !/^\d+$/.test(s)).map(s => s.split('/')), ...Array.from({length: generic}, () => ['*'])];
}
export function manaAllowed(unit, context) {
  switch (unit.restriction || 'none') {
    case 'none': return true;
    case 'abilities': return context.kind === 'ability' && context.abilityType === 'activated';
    case 'powerstone': return context.kind === 'ability' || context.types?.includes('Artifact');
    case 'creatures': return context.kind === 'spell' && context.types?.includes('Creature');
    case 'eldrazi': return context.kind === 'spell' && context.subtypes?.includes('Eldrazi');
    case 'commander': return context.kind === 'spell' && context.commander === true;
    default: return false;
  }
}
const signature = u => `${u.type}:${u.restriction || 'none'}`;
function allocations(pool, pips, context, visit, tick, canonical = false) {
  const ordered = [...pips].sort((a, b) => pool.filter(u => manaAllowed(u, context) && (a.includes('*') || a.includes(u.type))).length - pool.filter(u => manaAllowed(u, context) && (b.includes('*') || b.includes(u.type))).length);
  function take(i, remaining, spent, previous = '') {
    if (!tick()) return true; // propagate cancellation, including partial matches
    if (i === ordered.length) return visit(remaining, spent);
    const seen = new Set(), pip = ordered[i];
    for (let j = 0; j < remaining.length; j++) {
      const u = remaining[j], key = signature(u);
      if (canonical && i && ordered[i].join('/') === ordered[i-1].join('/') && key < previous) continue;
      if (seen.has(key) || !manaAllowed(u, context) || !(pip.includes('*') || pip.includes(u.type))) continue;
      seen.add(key);
      if (take(i + 1, remaining.filter((_, k) => k !== j), [...spent, {...u, paidFor: pip.join('/')}], key)) return true;
    }
    return false;
  }
  return take(0, pool, []);
}
/** Atomic bounded search over source activations and a sequence of SEPARATE
 * payments. Later payments cannot fund earlier costs. Activation fees are paid
 * before that activation produces mana; each tapped/sacrificed source is used
 * once. No mutation on failure. A bound hit is unknown, never insufficiency. */
export function planManaPayments({sources = [], pool = [], life = 40}, payments, {maxStates = 4000, optimized = false} = {}) {
  if (!Number.isInteger(maxStates) || maxStates < 1 || maxStates > 100000) throw Error('Invalid mana search bound');
  const ids = sources.map(s => s.id);
  if (new Set(ids).size !== ids.length || new Set(pool.map(u => u.id)).size !== pool.length) throw Error('Duplicate resource identity');
  const costs = payments.map(p => parseManaCost(p.cost, p.reduction || 0));
  if (costs.some(c => c === null)) return {status: 'unknown', reason: 'unsupported mana cost', states: 0};
  const usable = sources.filter(s => !s.consumed);
  const modes = usable.flatMap(s => (s.modes || []).flatMap((m, i) => {
    const fee = parseManaCost(m.cost || '');
    if (m.tap && (s.tapped || s.sick)) return [];
    if (!fee || !m.outputs?.length || !m.tap && !m.sacrifice) return [];
    if (m.outputs.some(output => output.some(t => !/^[WUBRGC]$/.test(t)) || output.length > 8)) return [];
    return [{source: s, mode: m, index: i, fee}];
  }));
  const required = costs.reduce((n, c) => n + c.length, 0);
  const ceiling = pool.length + usable.reduce((n, s) => n + Math.max(0, ...modes.filter(m => m.source === s).map(m => Math.max(...m.mode.outputs.map(o => o.length)) - m.fee.length)), 0);
  if (ceiling < required) return {status: 'blocked', reason: 'insufficient total mana even before color/restriction checks', states: 0};
  // A safe optimistic color check avoids exponential searches for absent pips.
  const possible = new Set([...pool.map(u => u.type), ...modes.flatMap(m => m.mode.outputs.flat())]);
  if (costs.flat().some(p => !p.includes('*') && !p.some(t => possible.has(t)))) return {status: 'blocked', reason: 'required colored or true-colorless type unavailable', states: 0};
  let states = 0, exhausted = false, result;
  function tick() { if (++states > maxStates) { exhausted = true; return false; } return true; }
  const seen = new Set();
  // Relax future activations into independent possible units. Ignoring fees and
  // allowing each unit its own mode/color is an UPPER bound, never a payment.
  // Failure of bipartite matching therefore safely proves a branch infeasible.
  function potentiallyPayable(stage, floating, used) {
    const units = floating.map(u=>[u]);
    for(const s of usable) if(!used.has(s.id)) {
      const own=modes.filter(m=>m.source===s), n=Math.max(0,...own.flatMap(m=>m.mode.outputs.map(o=>o.length)));
      for(let i=0;i<n;i++) units.push(own.flatMap(m=>m.mode.outputs.flatMap(o=>o[i]?[{type:o[i],restriction:m.mode.restriction||'none'}]:[])));
    }
    const needs=costs.slice(stage).flatMap((pips,i)=>pips.map(pip=>({pip,context:payments[stage+i].context||{}}))), assigned=new Map();
    function match(i,visited) {
      const {pip,context}=needs[i];
      for(let j=0;j<units.length;j++) if(!visited.has(j)&&units[j].some(u=>manaAllowed(u,context)&&(pip.includes('*')||pip.includes(u.type)))) {
        visited.add(j);if(!assigned.has(j)||match(assigned.get(j),visited)){assigned.set(j,i);return true;}
      }
      return false;
    }
    return needs.every((_,i)=>match(i,new Set()));
  }
  function search(stage, floating, used, receipts, remainingLife, lastFree = -1) {
    // Returning true propagates cancellation through allocation recursion too.
    if (!tick()) return true;
    if (stage === payments.length) { result = {pool: floating, used: [...used], receipts, life: remainingLife}; return true; }
    const key = `${stage}|${[...used].sort().join(',')}|${floating.map(signature).sort().join(',')}|${remainingLife}|${optimized?lastFree:''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if(optimized&&!potentiallyPayable(stage,floating,used)) return false;
    const payment = payments[stage];
    if (allocations(floating, costs[stage], payment.context || {}, (rest, spent) => search(stage + 1, rest, used, [...receipts, {kind: 'payment', label: payment.label, cost: payment.cost, reduction: payment.reduction || 0, context: payment.context || {}, spent}], remainingLife), tick, optimized)) return true;
    if (exhausted) return false;
    for (const [position, {source, mode, index, fee}] of modes.entries()) {
      if (used.has(source.id) || remainingLife <= (mode.life || 0)) continue;
      if(optimized&&!fee.length&&position<lastFree) continue;
      const context = {kind: 'ability', abilityType: 'activated', types: source.types || [], subtypes: source.subtypes || []};
      if (allocations(floating, fee, context, (rest, spent) => {
        for (const output of mode.outputs) {
          const produced = output.map((type, n) => ({id: `${source.id}:${index}:${n}`, type, source: source.id, restriction: mode.restriction || 'none'}));
          if (rest.length + produced.length > 40) { exhausted = true; return false; }
          if (search(stage, [...rest, ...produced], new Set([...used, source.id]), [...receipts, {kind: 'activation', source: source.id, mode: index, ability: mode, spent, produced, tap: !!mode.tap, sacrifice: !!mode.sacrifice, life: mode.life || 0}], remainingLife - (mode.life || 0), optimized&&!fee.length?position:-1)) return true;
          if (exhausted) return false;
        }
        return false;
      }, tick, optimized)) return true;
      if (exhausted) return false;
    }
    return false;
  }
  search(0, pool, new Set(), [], life);
  return result ? {status: 'paid', ...result, states} : {status: exhausted ? 'unknown' : 'blocked', reason: exhausted ? 'mana search bound reached' : 'no legal allocation (colors, restrictions, fees or source contention)', states};
}
