/** Deterministic no-mulligan hand availability sampler. Independent of card
 * ranking but NOT a turn-by-turn gameplay simulator: ignores timing, draws,
 * casting constraints, opponent interaction and all decisions.
 */
import {isLandSlot} from './cards.mjs';
import {functionalRoles,manaRole} from './deckQuality.mjs';
function hashSeed(seed){let h=2166136261;for(const ch of seed){h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;}return h||1;}
export function sampleOpeningHands(cards,{trials=600,seed='commander-oracle-v086'}={}){
 if(!Array.isArray(cards)||cards.length<7)throw Error('Opening-hand sampler requires at least seven cards.');
 if(!Number.isInteger(trials)||trials<1||trials>10000)throw Error('Invalid sample count.');
 const flags=cards.map(c=>({land:isLandSlot(c),mana:manaRole(c).effective,interaction:functionalRoles(c).interaction,protection:functionalRoles(c).protection}));
 let rnd=hashSeed(seed),twoLands=0,thirdLand=0,ramp=0,interaction=0,protection=0;
 const rand=()=>{rnd^=rnd<<13;rnd^=rnd>>>17;rnd^=rnd<<5;return (rnd>>>0)/4294967296;};
 const base=Array.from({length:cards.length},(_,i)=>i);
 for(let t=0;t<trials;t++){
  const order=base.slice();
  // Partial unbiased Fisher-Yates shuffle: only first 12 positions used.
  for(let i=0;i<Math.min(12,order.length);i++){
   const j=i+Math.floor(rand()*(order.length-i));[order[i],order[j]]=[order[j],order[i]];
  }
  const count=(n,key)=>order.slice(0,n).filter(i=>flags[i][key]).length;
  const openLands=count(7,'land');
  if(openLands>=2&&openLands<=4)twoLands++;
  if(count(Math.min(10,order.length),'land')>=3)thirdLand++;
  if(count(Math.min(10,order.length),'mana')>=1)ramp++;
  if(count(Math.min(11,order.length),'interaction')>=1)interaction++;
  if(count(Math.min(12,order.length),'protection')>=1)protection++;
 }
 const pct=n=>Math.round(n/trials*1000)/10;
 return {trials,seed,openingTwoToFourLandsPct:pct(twoLands),threeLandsByTurnThreePct:pct(thirdLand),earlyRampSeenByTurnThreePct:pct(ramp),interactionSeenByTurnFourPct:pct(interaction),protectionSeenByTurnFivePct:pct(protection),assumptions:'Fixed no-mulligan random draws; cards seen only. No land sequencing, mana costs, castability, extra draw, Commander tax, combo timing, game actions or opponent modeling.'};
}
