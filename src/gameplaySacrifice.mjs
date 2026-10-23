/** Narrow Oracle-verified creature costs. No counters, recursion, targets,
 * mana production, timing overrides or inferred infinite loops. */
import {cardText,isCreature,cardSubtypes} from './gameplayCards.mjs';
import {withoutReminder} from './gameplayAccess.mjs';
import {parseManaCost} from './gameplayMana.mjs';
import {deathModel,deathMatches} from './gameplayDeath.mjs';
export function creatureSacrificeModel(card){
 const abilities=[];
 for(const clause of withoutReminder(cardText(card)).split('\n').map(l=>l.trim())){
  const m=clause.match(/^((?:\{[0-9WUBRGC]+\})+(?:, )?)?Sacrifice a creature: (You gain (\d+) life|Scry (\d+))\.$/);
  if(!m)continue;const cost=(m[1]||'').replace(/, $/,'');if(!parseManaCost(cost))continue;
  abilities.push({clause,cost,effects:m[3]?[{kind:'gainLife',count:+m[3]}]:[{kind:'scry',count:+m[4]}]});
 }
 return abilities;
}
export function safeSacrificeVictims(board){return board.filter(s=>s.id!=='commander'&&isCreature(s.card)&&(s.token||['','This creature enters tapped.'].includes(withoutReminder(cardText(s.card))))).sort((a,b)=>Number(b.token||false)-Number(a.token||false)||a.id.localeCompare(b.id));}
/** One voluntary conversion per own turn, after ordinary deployment. Preserve
 * the last Zombie for a supported end-step draw unless this death replaces it.
 * Actual payable actions still use the exact planner and independent ledger. */
export function sacrificeHasSupportedValue(board,victim){
 const events=board.flatMap(s=>deathModel(s.card,{additional:true}).triggers.filter(t=>deathMatches(s,victim,t.filter)).map(t=>t.effect));
 if(!events.length)return false;
 const endStep=board.some(s=>deathModel(s.card).endStep),zombie=cardSubtypes(victim.card).includes('Zombie');
 if(endStep&&zombie&&board.filter(s=>s.id!==victim.id&&cardSubtypes(s.card).includes('Zombie')&&s.id!=='commander').length===0&&!events.some(e=>e.type==='tokens'&&e.tribe==='Zombie'))return false;
 return true;
}
