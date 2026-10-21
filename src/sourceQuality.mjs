/** Quality-of-evidence screening of public Commander source lists.
 * Structural feasibility only: NOT win rate, bracket certification or
 * an external power estimate. Missing catalog cards cannot be guessed.
 */
import {isLandSlot,oracleId,isBasic} from './cards.mjs';
import {manaRole} from './deckQuality.mjs';
import {roleEvidence,dependencyEvidence} from './roleEvidence.mjs';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round=n=>Math.round(n*10)/10;

export function sourceStructureEvidence(deck,catalog=[]){
 const byId=new Map(catalog.map(c=>[oracleId(c),c]));
 let lands=0,known=0,missing=0,earlyRamp=0,efficientRamp=0,draw=0,conditionalDraw=0,broad=0,shields=0,late=0;
 const resolved=[];
 for(const item of deck?.mainboard||[]){
  const qty=Math.max(0,Math.min(99,Number(item.quantity)||0));
  const card=byId.get(item.id);
  if(!card){missing+=qty;continue;}
  known+=qty;
  for(let i=0;i<qty;i++)resolved.push(card);
 }
 for(const card of resolved){
  if(isLandSlot(card)){lands++;continue;}
  const mana=manaRole(card),role=roleEvidence(card),mv=Number(card.cmc)||0;
  if(mana.effective&&mv<=3){earlyRamp++;if(mv<=2)efficientRamp++;}
  if(role.draw==='positive')draw++;
  if(role.draw==='engine-conditional')conditionalDraw++;
  if(role.removal==='broad')broad++;
  if(role.shield==='dedicated')shields++;
  if(mv>=7)late++;
 }
 const unsupported=resolved.filter(c=>!isLandSlot(c)&&dependencyEvidence(c,resolved).length>0).length;
 // Weighted feasibility evidence, not a generic 8x8 quota or win predictor.
 // Count conditional draw at fractional value because resolving its condition is unproven.
 const reliableDraw=draw+Math.min(conditionalDraw,6)*0.4;
 const landDeviation=Math.max(0,34-lands)+Math.max(0,lands-40);
 const raw=45
  +2.0*Math.min(earlyRamp,12)
  +1.7*Math.min(reliableDraw,10)
  +1.1*Math.min(broad,8)
  +0.7*Math.min(shields,4)
  -4.5*landDeviation
  -3.5*unsupported
  -3*Math.max(0,late-9)
  -4*missing;
 const score=round(clamp(raw,0,100));
 const cautions=[];
 if(missing)cautions.push(`${missing} unresolved card slot(s)`);
 if(lands<33||lands>42)cautions.push(`${lands} lands outside broad Commander range`);
 if(earlyRamp<7)cautions.push(`only ${earlyRamp} early repeatable/land ramp sources`);
 if(reliableDraw<6)cautions.push(`limited direct/conditionally repeatable card advantage (${round(reliableDraw)} weighted)`);
 if(unsupported)cautions.push(`${unsupported} potentially unsupported engine card(s)`);
 return {score,knownCards:known,unmatched:missing,lands,earlyRamp,efficientRamp,positiveDraw:draw,
  conditionalDraw,broadAnswers:broad,dedicatedShields:shields,sevenPlus:late,unsupported,
  cautions,method:'Local Scryfall-text structural screening, not a power grade, playtest, or proof of castability.'};
}
