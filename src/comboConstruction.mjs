/** Optional offline combo package proposals; no forced cards, no API calls.
 * All scores are deck-building heuristics, never proof of combo execution.
 */
import {oracleId,legalFor,priceOf,isLandSlot,castOracle} from './cards.mjs';
import {analysis,synergy} from './mechanics.mjs';
import {templatePredicate} from './comboTemplates.mjs';
import {normalizedName} from './combos.mjs';

export function proposeComboPackages({variants=[],cards,commander,chosen=[],plan,bracket,budget,remainingSlots=99-chosen.length,gameChangers=0,maxGameChangers=99,curveAllowed=()=>true}){
 const catalogByName=new Map();
 for(const c of cards){catalogByName.set(normalizedName(c.name),c);for(const f of c.card_faces||[])if(f.name)catalogByName.set(normalizedName(f.name),c);}
 const chosenIds=new Set(chosen.map(oracleId)),commanderId=oracleId(commander);
 const eligible=c=>c&&(oracleId(c)===commanderId||legalFor(c,commander)&&priceOf(c)!==null&&!isLandSlot(c));
 const scores=new Map();const score=c=>{const id=oracleId(c);if(!scores.has(id)){const a=analysis(c),s=synergy(c,plan,a);scores.set(id,{a,s,utility:s.impact+(a.ramp?5:0)+(a.draw?4:0)+(a.removal?4:0)+(a.protection?2:0)-Math.max(0,c.cmc-5)});}return scores.get(id);};
 const accepted=[], rejected=[];
 for(const v of variants.slice(0,300)){
  const deny=reason=>{rejected.push({id:v?.id,reason});};
  if(!v||!Array.isArray(v.cards)||!Array.isArray(v.uses)||!v.uses.length){deny('malformed variant');continue;}
  if(v.spoiler||!(v.legalities?.commander===undefined||v.legalities?.commander===true||v.legalities?.commander==='legal')){deny('upstream legality or spoiler');continue;}
  const identity=Array.isArray(v.identity)?v.identity:String(v.identity||'').match(/[WUBRG]/g)||[];
  if(identity.some(c=>!(commander.color_identity||[]).includes(c))){deny('color identity');continue;}
  if(bracket===2&&v.isInfinite){deny('Bracket 2 conservative infinite-combo policy');continue;}
  if(bracket===3&&v.isInfinite&&(v.uses.reduce((n,u)=>n+u.quantity,0)+(v.templateRequirements||[]).reduce((n,r)=>n+(r.quantity||0),0))<3){deny('Bracket 3 conservative compact infinite-combo policy');continue;}
  if(Number.isInteger(v.bracket)&&v.bracket>bracket){deny('known bracket mismatch');continue;}
  const requirements=new Map();let invalid=false;
  for(const u of v.uses){
   const c=catalogByName.get(normalizedName(u.name));
   if(!eligible(c)||!Number.isInteger(u.quantity)||u.quantity!==1||u.mustBeCommander&&oracleId(c)!==commanderId){invalid=true;break;}
   requirements.set(oracleId(c),c);
  }
  if(invalid){deny('unavailable, illegal or unsupported named requirement');continue;}
  const reserved=new Set(requirements.keys());
  const added=[...requirements.values()].filter(c=>oracleId(c)!==commanderId&&!chosenIds.has(oracleId(c)));
  const templateMatches=[],reservedTemplate=new Set(reserved);
  const candidatePool=[...chosen,...cards.filter(c=>eligible(c)&&oracleId(c)!==commanderId&&!chosenIds.has(oracleId(c)))];
  for(const req of v.templateRequirements||[]){
   const pred=templatePredicate(req);
   if(!pred||!Number.isInteger(req.quantity)||req.quantity<1||req.quantity>4){invalid=true;break;}
   for(let i=0;i<req.quantity;i++){
    const candidates=candidatePool.filter(c=>!reservedTemplate.has(oracleId(c))&&pred(c)&&eligible(c)&&(!c.game_changer||gameChangers+(added.filter(x=>x.game_changer).length)<maxGameChangers));
    candidates.sort((a,b)=>Number(chosenIds.has(oracleId(b)))-Number(chosenIds.has(oracleId(a)))||score(b).utility-score(a).utility||priceOf(a)-priceOf(b)||a.name.localeCompare(b.name));
    const c=candidates[0];if(!c){invalid=true;break;}
    reservedTemplate.add(oracleId(c));templateMatches.push({template:req.name,card:c.name});
    if(!chosenIds.has(oracleId(c)))added.push(c);
   }
   if(invalid)break;
  }
  if(invalid){deny('unresolved or unsatisfied template');continue;}
  if(added.length>Math.min(4,remainingSlots)){deny('insufficient free spell slots');continue;}
  if(added.some(c=>!curveAllowed(c))){deny('curve cap');continue;}
  const newGc=added.filter(c=>c.game_changer).length;
  if(gameChangers+newGc>maxGameChangers){deny('game-changer limit');continue;}
  const cost=added.reduce((sum,c)=>sum+priceOf(c),0);
  if(cost>budget*(bracket===4?.26:.20)){deny('combo spends too much budget');continue;}
  // Never reward an unrelated infinite combo simply for being listed online.
  const packageCards=[...requirements.values(),...templateMatches.map(x=>catalogByName.get(normalizedName(x.card)))].filter(c=>oracleId(c)!==commanderId);
  const onPlan=packageCards.filter(c=>score(c).s.impact>=4).length;
  const useful=packageCards.filter(c=>score(c).utility>=4).length;
  // An unrelated enabler should not enter an Eldrazi (or other commander)
  // deck solely because Spellbook found a technically legal loop. Already
  // owned off-plan cards may participate, but *new* inclusions must pull
  // their weight as part of the plan or fill a protected utility function.
  const colorlessEngine=bracket===4&&plan.needsColorless>0&&v.isInfinite&&
   (v.results||[]).some(r=>/infinite colorless mana/i.test(r))&&
   packageCards.length<=2&&packageCards.every(c=>/mana|colorless|\{C\}/i.test(castOracle(c))||score(c).a.ramp);
  const offPlanAdditions=added.filter(c=>{
   const {a,s}=score(c);
   return s.impact<4&&!a.ramp&&!a.draw&&!a.removal&&!a.protection;
  });
  if(offPlanAdditions.length&&!colorlessEngine){deny('off-plan cards would be forced into deck: '+offPlanAdditions.map(c=>c.name).join(', '));continue;}
  if(!packageCards.length||(!colorlessEngine&&(!onPlan||onPlan<Math.ceil(packageCards.length*.6)||useful<Math.ceil(packageCards.length*.6)))||plan.confidence==='low'){
   deny('weak commander synergy or unclassified strategy');continue;
  }
  // Small packages get a limited payoff bonus; existing roles are always built first.
  const overlap=packageCards.filter(c=>chosenIds.has(oracleId(c))).length;
  const commanderInCombo=reserved.has(commanderId);
  const directFinish=(v.results||[]).some(r=>/^(?:infinite|near-infinite) damage|you win the game|opponents lose the game/i.test(r));
  // Reward efficient, on-plan packages and components that already have a
  // purpose in the deck. Do not reward the sheer number of combo pieces.
  // Direct damage is an outcome signal, NOT evidence the loop executes.
  const merit=onPlan/packageCards.length*28+useful/packageCards.length*12+(colorlessEngine?21:0)+
   (commanderInCombo?12:0)+(directFinish?5:0)+(v.isInfinite?3:0)+
   overlap*6-added.length*9-cost/Math.max(1,budget)*70+
   Math.min(12,added.reduce((n,c)=>n+score(c).utility,0)*.16);
  accepted.push({id:v.id,url:v.url,added,memberIds:[...reservedTemplate],templateMatches,merit,cost,isInfinite:v.isInfinite,prerequisites:v.prerequisites||[],namedCards:v.cards,results:v.results||[],onPlanCards:onPlan,alreadyPresent:overlap,commanderInCombo});
 }
 accepted.sort((a,b)=>b.merit-a.merit||a.cost-b.cost||a.id.localeCompare(b.id));
 return {candidates:accepted,rejected};
}
