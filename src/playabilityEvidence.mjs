/** Strategy-neutral timing and card-flow evidence, not a gameplay simulator.
 * Deals in fractional evidence instead of claiming every 'draw' textbox works.
 */
import {isLandSlot} from './cards.mjs';
import {manaRole} from './deckQuality.mjs';
import {roleEvidence,dependencyEvidence,oracleText} from './roleEvidence.mjs';
const round=n=>Math.round(n*100)/100;

export function drawAccess(card,deck=[]){
 const kind=roleEvidence(card).draw;
 if(kind==='positive')return 1;
 if(kind!=='engine-conditional')return 0;
 if(deck?.length&&dependencyEvidence(card,deck).length)return 0.1;
 const t=oracleText(card),cmc=Number(card.cmc)||0;
 // Activated draw requiring ≥4 generic mana is not equivalent to a free trigger.
 const activation=t.match(/(?:\{(\d+)\}[^.\n]{0,100}:|:\s*\{(\d+)\}[^.\n]{0,60})[^.\n]{0,140}\bdraw\b/i);
 const pay=activation?Number(activation[1]||activation[2]||0):0;
 const heavilyGated=/(?:whenever an opponent|whenever (?:a|an) opponent|if you control (?:seven|eight|nine|ten)|only if)/i.test(t);
 return round(Math.max(0.1,(cmc>=5?0.30:0.60)-(pay>=4?0.30:pay>=2?0.15:0)-(heavilyGated?0.15:0)));
}

export function tempoEvidence(cards){
 const spells=cards.filter(c=>!isLandSlot(c));
 const efficient=spells.filter(c=>manaRole(c).effective&&Number(c.cmc)<=2).length;
 const three=spells.filter(c=>manaRole(c).effective&&Number(c.cmc)===3).length;
 const burst=spells.filter(c=>manaRole(c).kind==='burst').length;
 const expensive=spells.filter(c=>Number(c.cmc)>=7).length;
 const flow=round(spells.reduce((n,c)=>n+drawAccess(c,cards),0));
 return {efficientRamp:efficient,threeManaRamp:three,burstSources:burst,sevenPlusSpells:expensive,
  weightedCardFlow:flow,
  heavyCurveAccelerationGap:Math.max(0,Math.min(10,expensive-3)-efficient),
  note:'Non-simulated tempo and draw-access evidence: mana timing, actual castability and triggers are not guaranteed.'};
}

/** Conservative sustained output of a cheap, explicit tap-for-mana ability.
 * Used as a preservation gate, not a quality score or mana simulation. Unknown,
 * restricted, sacrificed and untap-limited sources deliberately return zero. */
export function sustainedEarlyMana(card){
 if(isLandSlot(card)||Number(card.cmc)>2||!manaRole(card).effective)return 0;
 const t=oracleText(card);
 if(/doesn't untap|does not untap|spend this mana only|only to cast|sacrifice[^\n]*:|activate only/i.test(t))return 0;
 let output=0;
 for(const line of t.split('\n')){
  const match=line.match(/^\s*((?:\{[^}]+\},?\s*)*\{T\})\s*:\s*Add\s+((?:\{[WUBRGC]\})+|one mana|two mana|three mana)/i);
  if(!match)continue;
  // Non-generic activation costs need a richer mana model; fail closed.
  const payments=[...match[1].matchAll(/\{([^}]+)\}/g)].map(x=>x[1]).filter(x=>x!=='T');
  if(payments.some(x=>!/^\d+$/.test(x)))continue;
  const produced=match[2].startsWith('{')?(match[2].match(/\{/g)||[]).length:
   match[2].toLowerCase()==='three mana'?3:match[2].toLowerCase()==='two mana'?2:1;
  output=Math.max(output,produced-payments.reduce((n,x)=>n+Number(x),0));
 }
 return Math.max(0,output);
}
