/** Independent trace receipt check. Does not call simulator/source/payment parser. */
import assert from 'node:assert/strict';
export function auditFunctionalTrace(input,run){
 const slots=new Map();for(const c of input.cards){const root=c.oracle_id||c.name;let n=0;while(slots.has(root+'#'+n))n++;slots.set(root+'#'+n,c);}
 const hand=new Set(run.initialHand),seen=new Set(run.initialHand),board=new Map();let commandCasts=0;
 for(const t of run.observations){const used=new Set(),pool=[];
  for(const e of run.events.filter(e=>e.turn===t.turn)){
   if(e.kind==='draw'){assert.ok(!seen.has(e.id));assert.ok(slots.has(e.id));seen.add(e.id);hand.add(e.id);}
   if(e.kind==='land'){assert.ok(hand.delete(e.id));board.set(e.id,{card:slots.get(e.id),turn:t.turn});}
   if(e.kind==='scripted-command-zone-return')board.delete('command-zone');
   if(e.kind==='cast'){
    const printedCard=e.commander?input.commander:slots.get(e.id);assert.ok(printedCard);const printed=printedCard.card_faces?.[0]?.mana_cost??printedCard.mana_cost;assert.equal(e.cost,printed+(e.commander?`{${2*commandCasts++}}`:''),'cost differs from printed record/tax');
    for(const p of e.payment){assert.ok(!used.has(p.source),'double physical activation');used.add(p.source);const b=board.get(p.source);assert.ok(b,'source not deployed');const text=b.card.oracle_text||'';assert.ok(!/Creature/.test(b.card.type_line)||b.turn<t.turn,'sick source');assert.ok(!/enters (?:the battlefield )?tapped/i.test(text)||b.turn<t.turn,'tapped source');const line=text.replace(/[()]/g,'').split('\n').find(l=>l.startsWith('{T}: Add '));assert.ok(line&&line.includes('{'+p.color+'}'),'unprinted output');const output=line.slice(9).split(' or ').find(x=>x.includes('{'+p.color+'}'));assert.equal((output.match(/\{[WUBRGC]\}/g)||[]).length,p.units);pool.push(...Array(p.units).fill(p.color));}
    const syms=[...e.cost.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]),pips=syms.filter(x=>!/^\d+$/.test(x)),generic=syms.filter(x=>/^\d+$/.test(x)).reduce((s,x)=>s+Number(x),0);
    function remove(i,rest){if(i===pips.length)return rest.length>=generic?rest.slice(generic):null;for(let j=0;j<rest.length;j++)if(pips[i].split('/').includes(rest[j])){const r=remove(i+1,rest.filter((_,k)=>k!==j));if(r)return r;}return null;}
    const remaining=remove(0,pool);assert.ok(remaining,'receipt cannot pay cost');pool.splice(0,pool.length,...remaining);
    const c=e.commander?input.commander:slots.get(e.id);assert.ok(c);if(!e.commander)assert.ok(hand.delete(e.id));if(/Creature|Artifact|Enchantment|Planeswalker|Battle/.test(c.type_line))board.set(e.id,{card:c,turn:t.turn});
   }
  }assert.equal(hand.size,t.hand);
 }
 assert.deepEqual([...hand].sort(),run.finalZones.hand.slice().sort());const all=Object.values(run.finalZones).flat();assert.equal(all.length,99);assert.equal(new Set(all).size,99);return true;
}
