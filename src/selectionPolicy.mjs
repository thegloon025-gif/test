/** v0.8.9: local, commander-independent constraints on *whole-deck* support.
 * These are intentionally conservative Scryfall-Oracle proxies, not rules
 * simulation. Unsupported casting resources must never be assumed available.
 */
import {castFaces,castHasType,isLandSlot,landFaces} from './cards.mjs';

const spellText=c=>castFaces(c).map(f=>f.oracle_text||c.oracle_text||'').join('\n');
const landText=c=>landFaces(c).map(f=>f.oracle_text||c.oracle_text||'').join('\n');
export const needsSnowMana=c=>{
 const costs=castFaces(c).map(f=>f.mana_cost||c.mana_cost||'').filter(Boolean);
 // Casting either legal face is sufficient; a snow cost on just one
 // alternative spell face does not make the whole card uncastable.
 return costs.length>0&&costs.every(cost=>/\{S\}/i.test(cost));
};
const isSnow=c=>/\bSnow\b/i.test(c.type_line||'')||landFaces(c).some(f=>/\bSnow\b/i.test(f.type_line||''));
export function snowManaSource(c){
 if(!isSnow(c))return false;
 // A snow source must actually produce mana; a snow creature with no mana
 // ability is not proof that {S} can be paid.
 const t=isLandSlot(c)?landText(c):spellText(c);
 return /\badd\s+(?:\{|one mana|two mana|three mana)/i.test(t)||
  isLandSlot(c)&&/\bBasic\b/i.test(c.type_line||'')&&/\b(?:Plains|Island|Swamp|Mountain|Forest|Wastes)\b/i.test(c.type_line||'');
}
export function castabilityIssues(card,selectedLands=[]){
 const problems=[];
 if(needsSnowMana(card)&&!selectedLands.some(snowManaSource))
  problems.push('requires {S} but the selected mana base has no snow-producing land');
 return problems;
}

/** The counterspell distinction is based on targeting restrictions, not
 * whether a sentence includes the word "counter". Card-name neutral. */
export function responseProfile(c){
 if(isLandSlot(c))return {instant:false,counter:false,narrow:false,soft:false};
 const t=spellText(c),instant=castHasType(c,'Instant');
 const counter=/\bcounter (?:target|all|each)\b/i.test(t);
 const soft=counter&&/\bunless\b[^.\n]*(?:\bpay|\bpays)\b/i.test(t);
 const narrow=counter&&(
  /counter target (?:activated|triggered|ability|instant|sorcery|creature|artifact|enchantment)\b/i.test(t)||
  /counter target spell (?:that|if|unless|with|you|an opponent|controlled by)[^.\n]*/i.test(t)||
  /counter target [^.\n]*spell\s+that\s+targets\b/i.test(t)||
  /counter target (?:red|blue|green|black|white) spell/i.test(t)||soft);
 return {instant,counter,narrow,soft};
}

/** A one-off "draw a card" normally replaces itself; it does not generate
 * card advantage. Repeated triggered or activated draw is still conditional
 * and its reliability must be evaluated separately. */
export function cardAdvantage(c){
 const t=spellText(c);
 if(/draw (?:two|three|four|five|[2-9]|x|that many) cards?/i.test(t))return true;
 if(/(?:whenever|at the beginning of|each time)[^.\n]{0,180}\bdraw (?:a|one) card/i.test(t))return true;
 if(/(?:\{T\}|\{\d+\})[^.\n]{0,100}:\s*draw a card/i.test(t))return true;
 return false;
}

const playsTypedSpells=plan=>(plan?.needs||[]).some(n=>n.kind==='typed-cast'&&!n.types?.every(t=>['Instant','Sorcery'].includes(t)));
export function selectionLimits(plan,bracket,powerTarget='balanced'){
 const typed=playsTypedSpells(plan);
 // The ceilings apply to nonland slots and preserve additional space for the
 // actual commander engine; they are intentionally NOT one-size-fits-all for
 // instants/sorceries commanders.
 return {typed, maxInstants:typed?20:Infinity,
  maxCounters:typed?(bracket===4?5:4):Infinity,
  maxNarrow:typed?2:4,
  interactionGoal:typed?8:null,
  drawGoal:typed?(bracket===4?8:powerTarget==='high'?8:7):null,
  shieldingGoal:typed?3:null};
}
export function selectionTotals(cards){
 const spells=cards.filter(c=>!isLandSlot(c));const r=spells.map(responseProfile);
 return {instants:r.filter(x=>x.instant).length,counters:r.filter(x=>x.counter).length,
  narrow:r.filter(x=>x.narrow).length,snowDependent:spells.filter(needsSnowMana).length,
  cardAdvantage:spells.filter(cardAdvantage).length};
}
export function fitsSelectionLimits(card,chosen,limits,replaces=null){
 if(isLandSlot(card))return true;
 const after=chosen.filter(c=>!isLandSlot(c)&&c!==replaces);
 const next=responseProfile(card),counts=selectionTotals(after);
 return counts.instants+(next.instant?1:0)<=limits.maxInstants&&
  counts.counters+(next.counter?1:0)<=limits.maxCounters&&
  counts.narrow+(next.narrow?1:0)<=limits.maxNarrow;
}
