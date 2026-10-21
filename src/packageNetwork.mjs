/** v0.8.8 local combo-network evaluation. A graph edge means two independently
 * eligible Spellbook variants share a noncommander component. It is NOT a
 * probability of drawing, executing, or winning with those combinations.
 * No live lookups, commander-specific lists, or fabricated card data.
 */
import {oracleId} from './cards.mjs';

const ids=p=>new Set(p.memberIds||[]);
const nonCommander=(p,commanderId)=>[...ids(p)].filter(x=>x!==commanderId);

/** A package hub matters only when it intersects other *eligible* combos on
 * a noncommander card. Merely sharing Ulalek (or any other commander) does not
 * make all variants part of one strategically cohesive network. */
export function packageNetworkScore(pkg,candidates,chosenIds,commanderId){
 const all=ids(pkg),missing=pkg.added.filter(c=>!chosenIds.has(oracleId(c)));
 if(!missing.length)return null;
 const after=new Set([...chosenIds,...missing.map(oracleId)]);
 const own=nonCommander(pkg,commanderId);
 let sharedLinks=0,additionalCompleted=0,distinctOutcomes=new Set();
 for(const other of candidates){
  if(other.id===pkg.id)continue;
  const theirs=nonCommander(other,commanderId);
  if(!theirs.some(x=>own.includes(x)))continue;
  sharedLinks++;
  const member=ids(other);
  if([...member].every(x=>after.has(x)||x===commanderId)&&![...member].every(x=>chosenIds.has(x)||x===commanderId)){
   additionalCompleted++;
   for(const outcome of other.results||[])if(/infinite|win the game|opponents lose the game/i.test(outcome))distinctOutcomes.add(outcome);
  }
 }
 // Prefer packages with an immediate payoff, with capped secondary network
 // benefit; do not simply award points for thousands of near variants.
 const addedPrice=missing.reduce((n,c)=>n+(Number(c.prices?.eur)||0),0);
 const score=pkg.merit+Math.min(4,sharedLinks)*3+Math.min(3,additionalCompleted)*17+
  Math.min(2,distinctOutcomes.size)*2-missing.length*2.5;
 return {pkg,missing,addedPrice,sharedLinks,additionalCompleted,score};
}

export function rankPackageNetwork(candidates,chosen,commander,limit=5){
 const chosenIds=new Set(chosen.map(oracleId));
 const ranked=candidates.map(pkg=>packageNetworkScore(pkg,candidates,chosenIds,oracleId(commander)))
  .filter(Boolean).filter(x=>x.missing.length<=limit)
  .sort((a,b)=>b.score-a.score||a.addedPrice-b.addedPrice||a.pkg.id.localeCompare(b.pkg.id));
 return ranked;
}

/** Count currently inventory-complete eligible packages without promising
 * their mana, timing, battlefield state, or legal spellcasting prerequisites. */
export function completeNetworkPackages(candidates,chosen,commander){
 const selected=new Set([...chosen.map(oracleId),oracleId(commander)]);
 return candidates.filter(p=>(p.memberIds||[]).every(id=>selected.has(id)));
}
