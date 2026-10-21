/** v0.8.7: optional, commander-agnostic high-Bracket-3 selection guidance.
 * These are local, explainable text heuristics, NOT independent power or rules certification.
 */
import {castFaces,castHasType,isLandSlot} from './cards.mjs';
import {functionalRoles,manaRole} from './deckQuality.mjs';
import {cardAdvantage} from './selectionPolicy.mjs';

const oracle=c=>castFaces(c).map(f=>f.oracle_text||c.oracle_text||'').join('\n');
export const validPowerTarget=x=>['balanced','high'].includes(x);

/** A generic counterspell can defend a commander, but it is not dedicated
 * protection. We want independently useful shielding in the same 99. */
export function spellEfficiency(c){
 if(isLandSlot(c))return {score:0,directShield:false,hardAnswer:false,cheapDraw:false,softCounter:false};
 const t=oracle(c),cmc=Number(c.cmc)||0;
 const f=functionalRoles(c),instant=castHasType(c,'Instant');
 const softCounter=/counter target [^.\n]+ unless (?:its|that spell.s) controller pays|counter target [^.\n]+ unless (?:they|that player) pay/i.test(t);
 const unconditionalCounter=/counter target (?:spell|activated or triggered ability|activated ability|triggered ability)\b/i.test(t)&&!softCounter;
 const targetedRemoval=/\b(?:destroy|exile) target (?:nonland |one or more |up to [^ ]+ )?(?:artifact|enchantment|creature|permanent|planeswalker|noncreature|attacking|tapped)\b/i.test(t)||/return target (?:nonland )?permanent to its owner's hand/i.test(t);
 const directShield=instant&&/target (?:creature|permanent|artifact|commander|up to [^ ]+ target creatures?)\b[^.\n]*(?:hexproof|indestructible|protection from|phase out)|(?:equipped|enchanted) creature (?:has|gets|gains) (?:hexproof|shroud|indestructible)|creatures you control (?:have|gain) (?:hexproof|indestructible)/i.test(t)||castHasType(c,'Equipment')&&/(?:equipped creature has|equipped creature gains) (?:hexproof|shroud|indestructible)/i.test(t);
 const reliableDraw=f.draw&&!f.conditionalDraw&&cardAdvantage(c);
 const cheapDraw=reliableDraw&&cmc<=3;
 let score=0;
 if(f.mana.effective){score+=cmc<=2?8:cmc===3?1:-6;}
 if(instant&&unconditionalCounter)score+=cmc<=2?9:cmc===3?1:-4;
 if(targetedRemoval)score+=cmc<=2?8:cmc===3?4:0;
 if(softCounter)score-=11;
 if(directShield)score+=cmc<=2?11:cmc===3?6:1;
 if(reliableDraw)score+=cmc<=3?8:cmc<=4?3:0;
 if(f.conditionalDraw)score-=5;
 if(f.interaction&&cmc>3)score-=Math.min(10,(cmc-3)*3);
 // Avoid identifying slow, self-sufficient-looking resource trinkets as
 // intrinsically equivalent to actual cheap card draw or repeatable ramp.
 if(/\{[4-9]\}[^\n]*: [^\n]*draw a card/i.test(t))score-=7;
 return {score,directShield,hardAnswer:targetedRemoval||unconditionalCounter,spotRemoval:targetedRemoval,cheapDraw,softCounter};
}

/** Counts are diagnostic. They do not assume spells can actually be cast by a
 * certain turn, or that an opponent will play into interaction. */
export function highPowerAudit(cards){
 const spells=cards.filter(c=>!isLandSlot(c));
 const info=spells.map(spellEfficiency);
 const directShield=info.filter(x=>x.directShield).length;
 const hardAnswers=info.filter(x=>x.hardAnswer).length;
 const spotRemoval=info.filter(x=>x.spotRemoval).length;
 const cheapDraw=info.filter(x=>x.cheapDraw).length;
 const efficientMana=spells.filter(c=>manaRole(c).effective&&(Number(c.cmc)||0)<=2).length;
 const softCounters=info.filter(x=>x.softCounter).length;
 const targets={directShield:3,hardAnswers:8,spotRemoval:3,cheapDraw:5,efficientMana:7};
 const warnings=Object.entries(targets).filter(([k,n])=>({directShield,hardAnswers,spotRemoval,cheapDraw,efficientMana})[k]<n).map(([k,n])=>`${k}: ${{directShield,hardAnswers,spotRemoval,cheapDraw,efficientMana}[k]}/${n}`);
 return {directShield,hardAnswers,spotRemoval,cheapDraw,efficientMana,softCounters,targets,warnings,method:'Oracle-text quality proxies only; does not simulate games, evaluate official brackets, or reproduce Deckcheck'};
}
