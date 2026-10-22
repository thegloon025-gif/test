/** Narrow Oracle-verified outlets. Only inert opposing player seats are legal
 * targets in this model; no creature/planeswalker/battle target inference. */
import {withoutReminder} from './gameplayAccess.mjs';
import {cardText,cardSubtypes} from './gameplayCards.mjs';
export function outletModel(card){
 const lines=withoutReminder(cardText(card)).split('\n').map(l=>l.trim());
 const entryLine='Whenever another colorless creature you control enters, this creature deals 1 damage to each opponent.',sacrificeLine='{1}{C}, Sacrifice an Eldrazi: This creature deals 2 damage to any target.';
 return {
  recognized:lines.filter(l=>l===entryLine||l===sacrificeLine),
  entryDamage:lines.includes('Whenever another colorless creature you control enters, this creature deals 1 damage to each opponent.'),
  sacrificeDamage:lines.includes('{1}{C}, Sacrifice an Eldrazi: This creature deals 2 damage to any target.')?{cost:'{1}{C}',subtype:'Eldrazi',damage:2}:null
 };
}
export function createOutletLedger(emit,initialLife=[40,40,40]){
 if(!Array.isArray(initialLife)||initialLife.length!==3||initialLife.some(n=>!Number.isInteger(n)||n<1||n>100))throw Error('Three explicit opponent life totals, 1..100 required');
 const life=[...initialLife],events=[];
 function damage(source,amount,target,ability){
  const targets=target==='each'?life.map((n,i)=>i).filter(i=>life[i]>0):Number.isInteger(target)&&life[target]>0?[target]:[];
  if(!targets.length){emit({event:'outlet-no-target',ability,source,target});return;}
  for(const seat of targets){const before=life[seat];life[seat]-=amount;const e={event:'outlet-damage',ability,source,target:seat,amount,before,after:life[seat]};events.push(e);emit(e);}
  for(const seat of targets)if(life[seat]<=0)emit({event:'opponent-eliminated',target:seat,ability});
 }
 return {life,events,damage,get won(){return life.every(n=>n<=0);}};
}

/** Automatic ammunition excludes copied engines and ordinary Eldrazi bodies. */
export function safeOutletResource(slot){return !!slot.token&&cardSubtypes(slot.card).some(t=>t==='Spawn'||t==='Scion');}
