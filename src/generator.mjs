import {auditExportPricing} from './pricing.mjs';
import {budgetPolicy,applyBudgetValuation,budgetUsage} from './budgetPolicy.mjs';
import {auditComboExecutions} from './comboExecutionEvidence.mjs';
import {investmentEvidence,functionallyBetter} from './packageInvestment.mjs';
import {constructStrategyDeck,strategyScore} from './strategyFirst.mjs';
import {withSelectedCards,selectedCards} from './deckSelection.mjs';
import {COLORS,faces,castHasType,castHasSubtype,playableLand,isLandSlot,isBasic,priceOf,legalFor,trueColorlessSource,coloredSources,oracleId,isCommander,landManaQuality,castFaces} from './cards.mjs';
import {planFor,analysis,synergy} from './mechanics.mjs';
import {proposeComboPackages} from './comboConstruction.mjs';
import {rankPackageNetwork,completeNetworkPackages} from './packageNetwork.mjs';
import {annotateCombos,normalizedName} from './combos.mjs';
import {exportCardName,singletonName,validateCommanderSingleton} from './deckValidation.mjs';
import {landAccess,manaRole,functionalRoles,deckQuality} from './deckQuality.mjs';
import {sampleOpeningHands} from './handSampling.mjs';
import {spellEfficiency,highPowerAudit,validPowerTarget} from './highPower.mjs';
import {castabilityIssues,responseProfile,cardAdvantage,selectionLimits,selectionTotals,createSelectionLimitChecker} from './selectionPolicy.mjs';
import {optimizeWholeDeck} from './wholeDeckOptimizer.mjs';
import {optimizeManaBase} from './manaBaseOptimizer.mjs';
import {roleEvidence,evidenceAudit,dependencyEvidence} from './roleEvidence.mjs';

export const BRACKETS={
  2:{name:'Core',lands:37,curve:3.6,synergy:1.55,popularity:.35,interaction:8,ramp:9,draw:8,protection:2,maxGameChangers:0},
  3:{name:'Upgraded',lands:36,curve:3.0,synergy:1.75,popularity:.65,interaction:10,ramp:10,draw:9,protection:3,maxGameChangers:3},
  4:{name:'Optimized',lands:35,curve:2.55,synergy:1.6,popularity:1.05,interaction:13,ramp:12,draw:10,protection:4,maxGameChangers:99}
};
const r2=n=>Math.round(n*100)/100;
const displayName=exportCardName;
const price=c=>priceOf(c)??Infinity;
const manaPips=c=>{
 const cost=castFaces(c)[0]?.mana_cost||c.mana_cost||'';
 const found=[];
 for(const bracket of cost.matchAll(/\{([^}]+)\}/g))for(const part of bracket[1].split('/'))if(COLORS.includes(part))found.push(part);
 return found;
};
function practicalEffect(c){
 const text=(castFaces(c)[0]?.oracle_text||c.oracle_text||'').replace(/\b(?:devoid|ingest)\b/gi,'').trim();
 // Reward effects that actually move the board, resources or cards. Tribal type
 // alone is NOT evidence that a weak body is a worthwhile slot.
 let value=0;
 if(/whenever you cast|when you cast|annihilator|cascade|emerge|convoke/i.test(text))value+=4;
 if(/create [^.]*token|when [^.]*enters|whenever [^.]*enters|draw (?:a|\d+|two|three) card|search your library/i.test(text))value+=3;
 if(/exile target|destroy target|counter target|each opponent|deals? damage to/i.test(text))value+=2;
 if(/\{T\}[^\n.]*add \{C\}|add \{C\}/i.test(text))value+=2;
 if(/put (?:a|an|one|two|three) (?:card|cards) [^.]*from exile into [^.]*graveyard|put a card an opponent owns from exile/i.test(text))value-=5; // processor without guaranteed exile setup
 if(text.length<32)value-=5;
 return value;
}

const popularity=c=>c.edhrec_rank==null?0:Math.max(0,12-2*Math.log10(Math.max(1,c.edhrec_rank)));
// Compare early, repeatable mana acceleration with conditional Spawn mana.
// A cheap permanent that can add two mana every turn is a meaningfully
// stronger accelerator than a late body or a one-shot token.
function earlyAcceleration(c,a){
 if(isLandSlot(c)||!manaRole(c).effective)return -Infinity;
 const t=castFaces(c).map(f=>f.oracle_text||'').join('\n')||c.oracle_text||'';
 const multi=/add \{C\}\{C\}|add two mana|add \{W\}\{W\}|add \{U\}\{U\}|add \{B\}\{B\}|add \{R\}\{R\}|add \{G\}\{G\}/i.test(t);
 return 20+10*(3-(c.cmc||0))+(multi?8:0)+6;
}
// Avoid loading an otherwise solid deck with more huge spells than its early
// mana system can reasonably support. Commander-specific high-MV reveal
// strategies (e.g. ninjutsu) are not subject to this typed-cast curve cap.
function curveCaps(plan,profile,fastManaCount){
 if(!plan.needs.some(n=>n.kind==='typed-cast'))return {fivePlus:Infinity,sevenPlus:Infinity};
 return {fivePlus:Math.round(11+fastManaCount*.7+(profile.curve>=3.5?2:0)),sevenPlus:Math.round(3+fastManaCount*.55+(profile.curve>=3.5?1:0))};
}

function quality(c,p,profile,s,a,powerTarget='balanced'){
  const cmc=c.cmc||0,cost=priceOf(c)||0;
  let base=profile.synergy*s.impact+profile.popularity*popularity(c);
  base-= Math.max(0,cmc-profile.curve)*2.6;
  base-= Math.log1p(cost)*1.8;
  if(s.roles.includes('engine'))base+=practicalEffect(c)*1.8;
  if(s.roles.includes('finisher'))base+=5;
  const functions=functionalRoles(c);
  if(functions.mana.effective)base+=12;
  if(functions.mana.kind==='powerstone'||functions.mana.kind==='activated-only')base-=10;
  if(functions.draw)base+=7-(functions.conditionalDraw?5:0);
  if(functions.interaction)base+=9;
  const evidence=roleEvidence(c);
  if(evidence.removal==='conditional')base-=12;
  if(evidence.draw==='cantrip-or-conditional')base-=8;
  if(evidence.draw==='positive')base+=9;
  if(evidence.shield==='dedicated')base+=5;
  const response=responseProfile(c);
  // Conditional permission counters are not equivalent to general answers;
  // an Eldrazi deck gets no intrinsic advantage from narrow counter text.
  if(response.narrow)base-=17;
  if(response.soft)base-=7;
  if(functions.draw&&!cardAdvantage(c))base-=9;
  if(functions.protection)base+=9;
  if(!functions.interaction&&a.removal)base-=4;
  if(!functions.protection&&a.protection)base-=4;
  if(a.win && s.impact>0)base+=3;
  if(a.ramp && cmc>=5)base-=10;
  if(p.needs.some(n=>n.kind==='typed-cast')&&/create [^.]*Powerstone token/i.test(c.oracle_text||''))base-=8;
  if(p.needs.some(n=>n.kind==='typed-cast')&&/whenever you cast or copy an instant or sorcery/i.test(c.oracle_text||''))base-=7;
  if(s.impact===0&&/\b(Ninja|Aura|Equipment)\b/i.test(c.type_line||'')&&!a.ramp&&!a.removal&&!a.draw)base-=10;
  if(powerTarget==='high'){
    const efficient=spellEfficiency(c);
    base+=efficient.score*2.5;
    // Extra weight for proven primary gameplan; not generic popularity.
    if(s.impact>0)base+=Math.min(18,s.impact*.65);
    if(s.impact===0&&!efficient.hardAnswer&&!efficient.directShield&&!efficient.cheapDraw&&!functions.mana.effective)base-=12;
  }
  return base;
}
function targetsFor(plan,commander,profile,all){
 const out=[];for(const n of plan.needs)switch(n.kind){
  case 'typed-cast':out.push({role:'engine',target:n.types.some(t=>['Aura','Equipment','Vehicle'].includes(t))?18:21,label:`Castable ${n.types.join('/')} spells`});break;
  case 'ninjutsu':out.push({role:'opener',target:8,label:'Turn-one evasive attackers'});out.push({role:'engine',target:18,label:'Ninja spells'});out.push({role:'topdeck',target:3,label:'Real topdeck setters'});break;
  case 'death-tribal':out.push({role:'fodder',target:25,label:`${n.type} creature cards`});out.push({role:'outlet',target:6,label:'Sacrifice outlets'});out.push({role:'payoff',target:6,label:'Death payoffs'});break;
  case 'lifegain':out.push({role:'engine',target:15,label:'Life gain enablers'});out.push({role:'payoff',target:5,label:'Life gain payoffs'});break;
  case 'landfall':out.push({role:'engine',target:11,label:'Extra land drops and land ramp'});out.push({role:'payoff',target:6,label:'Landfall payoffs'});break;
  case 'target-copy':out.push({role:'fodder',target:18,label:'Creatures to copy onto'});out.push({role:'engine',target:13,label:'Single-target spells'});break;
  case 'blink':out.push({role:'engine',target:10,label:'Blink activators'});out.push({role:'payoff',target:12,label:'ETB value creatures'});break;
  case 'token-tribal':out.push({role:'engine',target:20,label:`${n.type} producers`});out.push({role:'payoff',target:5,label:'Token payoffs'});break;
  case 'small-creature-counters':out.push({role:'engine',target:18,label:'Small creature triggers'});out.push({role:'payoff',target:8,label:'Counter payoffs'});break;
  case 'counters':out.push({role:'engine',target:18,label:'Counter mechanics'});break;
  case 'recursion':out.push({role:'fodder',target:15,label:'Sacrifice fodder'});out.push({role:'outlet',target:6,label:'Sacrifice outlets'});out.push({role:'recursion',target:6,label:'Graveyard recursion'});break;
  case 'exile-cast':out.push({role:'engine',target:15,label:'Exile-casting access'});break;
 }
 return out;
}
export function generateLegacyDeck({cards,commander,budget=191,bracket=3,comboVariants=[],powerTarget='balanced',communityBuild=null}){
 const fitsSelectionLimits=createSelectionLimitChecker();
 const b=Number(bracket),profile=BRACKETS[b],cap=Number(budget);
 if(!profile)throw Error('Choose bracket 2, 3 or 4.');
 if(!validPowerTarget(powerTarget))throw Error('Choose balanced or high as power target.');
 if(b!==3&&powerTarget!=='balanced')throw Error('Power target is currently supported only for Bracket 3.');
 const high=b===3&&powerTarget==='high';
 // Bracket 4 is an intentionally optimized search profile, not Bracket 3
 // with a relaxed Game Changer count. B3 High remains the bounded profile.
 const optimized=b===4;
 const tuning=high?{...profile,ramp:12,interaction:12,draw:10,protection:4}:profile;
 if(!Number.isFinite(cap)||cap<=0)throw Error('Budget must be a positive euro amount.');
 if(!commander||!isCommander(commander))throw Error('Choose a legal legendary commander from the Scryfall catalog.');
 if(!Array.isArray(cards)||cards.length<400)throw Error('Card catalog too small to generate a reliable 100-card deck. Use Update Scryfall Database first.');
 const cmdPrice=priceOf(commander);
 if(cmdPrice===null)throw Error('Commander has no EUR price; cannot verify the total budget.');
 if(cmdPrice>cap)throw Error('Commander alone exceeds the requested budget.');
 const plan=planFor(commander),limits=selectionLimits(plan,b,powerTarget),remaining=new Map(),chosen=[],reasons=new Map(),chosenNames=new Map();
 let spent=cmdPrice,gcs=commander.game_changer?1:0;
 const pool=cards.filter(c=>legalFor(c,commander)&&priceOf(c)!==null);
 const lands=pool.filter(isLandSlot),nonlands=pool.filter(c=>!isLandSlot(c));
 if(nonlands.length<62)throw Error('Not enough eligible priced spells in the catalog.');
 const analyzed=nonlands.map(c=>{const a=analysis(c),s=synergy(c,plan,a);return {c,a,s,rank:quality(c,plan,tuning,s,a,(high||optimized)?'high':'balanced')};});
 const analyzedById=new Map(analyzed.map(e=>[oracleId(e.c),e]));
 function allowed(c){return !remaining.has(oracleId(c))&&(isBasic(c)||!(chosenNames.get(singletonName(c))>0))&&singletonName(c)!==singletonName(commander)&&(!c.game_changer||gcs<profile.maxGameChangers);}
 let landMembers=[],selectedLands=[];
 function spellFits(c,replaces=null){
  if(chosen.length!==landMembers.length||chosen.some((card,i)=>card!==landMembers[i])){
   landMembers=chosen.slice();selectedLands=chosen.filter(isLandSlot);
  }
  return !castabilityIssues(c,selectedLands).length&&fitsSelectionLimits(c,chosen,limits,replaces);
 }
 function append(obj,why){const c=obj.c||obj;if(!allowed(c)||!spellFits(c)||spent+(priceOf(c)||0)>cap+.00001)return false;remaining.set(oracleId(c),c);chosen.push(c);if(!isBasic(c))chosenNames.set(singletonName(c),(chosenNames.get(singletonName(c))||0)+1);spent+=priceOf(c)||0;gcs+=c.game_changer?1:0;reasons.set(oracleId(c),why);return true;}
 const basicMap=new Map(lands.filter(isBasic).map(c=>[c.name,c]));
 const legalColors=(commander.color_identity||[]).filter(c=>COLORS.includes(c));
 const minBasics=legalColors.length===0?['Wastes']:legalColors.map(c=>({W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest'})[c]);
 for(const name of minBasics)if(!basicMap.has(name))throw Error(`Missing basic land ${name} in imported Scryfall dataset.`);
 const landQuota=profile.lands+(legalColors.length>=4?1:0);
 const landBudget=cap*((high||optimized)?.30:.21);
 let landSpend=0;
 const nonBasics=lands.filter(c=>!isBasic(c)).map(c=>{
  const m=landManaQuality(c);
  const access=landAccess(c,{commander,plan,lands:chosen.filter(isLandSlot),spells:[]});
  const colors=access.reliable.filter(x=>legalColors.includes(x));
  const any=colors.length===legalColors.length&&colors.length>=3;
  let score=colors.length*9+(any?11:0)+(plan.needsColorless&&m.canC?5:0);
  if(access.reasons.length)score-=16*access.reasons.length;
  if(access.conditional.length)score+=access.conditional.length*1.0;
  if(legalColors.length>=4&&colors.length===0)score-=17;
  if(m.restricted)score-=8;
  if(m.needsActivationPayment)score-=11;
  if(m.consumable)score-=7;
  if(m.entersTapped)score-=7;
  if(m.unusable)score=-Infinity;
  score+=popularity(c)*.25-Math.log1p(priceOf(c)||0)*3;
  return {c,score,m};
 }).sort((x,y)=>y.score-x.score||x.c.name.localeCompare(y.c.name));
 // A five-color mana base must have room for real colored sources; avoid
 // filling nonbasic slots with colorless-only utility lands.
 const maxNonBasic=Math.min(legalColors.length>=4?22:legalColors.length>=2?16:10,landQuota-Math.max(0,legalColors.length)*2-(plan.needsColorless?4:0));
 let nonbasicPicked=0;
 for(const obj of nonBasics){if(nonbasicPicked>=maxNonBasic)break;
  if(obj.score<0)continue;
  if(landSpend+(priceOf(obj.c)||0)>landBudget)continue;
  if(append(obj.c,'Mana fixing / land utility')){landSpend+=priceOf(obj.c)||0;nonbasicPicked++;}
 }
 // Make sure the deck contains basic lands. True colorless basics are *additional* to colored fixing.
 let wastes=0;if(plan.needsColorless&&basicMap.has('Wastes')){
  const ideal=legalColors.length>=4?5:3;
  while(wastes<ideal&&chosen.filter(isLandSlot).length<landQuota){chosen.push(basicMap.get('Wastes'));wastes++;reasons.set('Wastes','Unrestricted {C} for commander abilities');}
 }
 const colorTotals=new Map(legalColors.map(c=>[c,0]));
 for(const c of chosen.filter(isLandSlot))for(const color of colorTotals.keys())if(landAccess(c,{commander,plan,lands:chosen.filter(isLandSlot)}).reliable.includes(color))colorTotals.set(color,colorTotals.get(color)+1);
 let basicNum=0;
 while(chosen.filter(isLandSlot).length<landQuota){let name;if(!legalColors.length)name='Wastes';else {const color=[...colorTotals].sort((a,b)=>a[1]-b[1])[0][0];name=({W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest'})[color];colorTotals.set(color,colorTotals.get(color)+1);}chosen.push(basicMap.get(name));basicNum++;}
 // Account for explicitly unowned basic records before choosing spells.
 spent=cmdPrice+chosen.reduce((n,c)=>n+(priceOf(c)??Infinity),0);
 if(spent>cap)throw Error('Land configuration exceeds the effective budget.');
 const spellQuota=99-landQuota;
 const targets=targetsFor(plan,commander,profile,analyzed);
 const roleCounts=role=>chosen.filter(c=>{const o=analyzedById.get(oracleId(c));return o?.s.roles.includes(role);}).length;
 const picked=new Set(chosen.map(oracleId));
 // Reserve real early acceleration BEFORE filling the Eldrazi and finisher
 // slots. Otherwise a deck can meet its tribal quota while having no way to
 // cast its expensive payoffs in time.
 const earlyManaGoal=high?Math.min(tuning.ramp,10):optimized?Math.min(tuning.ramp,12):Math.min(profile.ramp,Math.max(6,Math.round(profile.ramp*.65)));
 function earlyManaCount(){return chosen.filter(c=>!isLandSlot(c)&&earlyAcceleration(c,analyzedById.get(oracleId(c))?.a||analysis(c))>-Infinity).length;}
 while(earlyManaCount()<earlyManaGoal&&chosen.length-landQuota<spellQuota){
  const available=analyzed.filter(e=>!picked.has(oracleId(e.c))&&allowed(e.c)&&spent+priceOf(e.c)<=cap&&earlyAcceleration(e.c,e.a)>-Infinity);
  if(!available.length)break;
  available.sort((a,b)=>(b.rank+earlyAcceleration(b.c,b.a))-(a.rank+earlyAcceleration(a.c,a.a))||a.c.name.localeCompare(b.c.name));
  const next=available[0];if(!append(next,'Early mana acceleration'))break;
  picked.add(oracleId(next.c));
 }
 const maxCurve=curveCaps(plan,tuning,earlyManaCount());
 function curveAllowed(c){
  if(c.cmc<5)return true;
  const spellCards=chosen.filter(x=>!isLandSlot(x));
  if(c.cmc>=7&&spellCards.filter(x=>x.cmc>=7).length>=maxCurve.sevenPlus)return false;
  if(spellCards.filter(x=>x.cmc>=5).length>=maxCurve.fivePlus)return false;
  return true;
 }

 const eligibleEntry=(e,role)=>!picked.has(oracleId(e.c))&&(!role||e.s.roles.includes(role))&&allowed(e.c)&&spellFits(e.c)&&curveAllowed(e.c)&&(spent+priceOf(e.c)<=cap)&&(!e.c.game_changer||gcs<profile.maxGameChangers);
 function pick(role,count,caption){
  let added=0;
  while(roleCounts(role)<count&&chosen.length-landQuota<spellQuota){
   const possibles=analyzed.filter(e=>eligibleEntry(e,role));
   if(!possibles.length)break;
   possibles.sort((a,b)=>(b.rank-1.1*Math.log1p(priceOf(b.c)||0))-(a.rank-1.1*Math.log1p(priceOf(a.c)||0))||a.c.name.localeCompare(b.c.name));
   const o=possibles[0];if(!append(o,caption))break;picked.add(oracleId(o.c));added++;
  }
  return added;
 }
 // Reserve enough real answers and protection before Eldrazi density can
 // consume every spell slot. These targets count FUNCTION, not word matches.
 // The later generic stage fills remaining gaps where the catalog supports it.
 const reserve=[{key:'interaction',target:limits.interactionGoal??Math.min(tuning.interaction,b===4?10:b===3?high?11:8:6),label:'Useful interaction'},
                {key:'draw',target:limits.drawGoal??(b===4?8:b===3?high?10:7:6),label:'Accessible card advantage'},
                {key:'protection',target:limits.shieldingGoal??(b===4?3:b===3?high?4:3:2),label:'Commander shielding'}];
 const functionalCount=key=>chosen.filter(c=>!isLandSlot(c)&&functionalRoles(c)[key]).length;
 if(high||optimized){
  // Diversify answers: a dozen counterspells cannot replace permanent removal,
  // and a counterspell counted as 'protection' cannot replace real shields.
  for(const specialized of [{test:e=>spellEfficiency(e.c).directShield,count:3,label:'Dedicated commander protection'},
                            {test:e=>spellEfficiency(e.c).spotRemoval,count:limits.typed&&high?5:3,label:'Permanent removal'},
                            {test:e=>spellEfficiency(e.c).cheapDraw&&cardAdvantage(e.c),count:5,label:'Efficient card advantage'}]){
   let guard=0;
   while(chosen.filter(c=>!isLandSlot(c)&&specialized.test({c})).length<specialized.count&&chosen.length-landQuota<spellQuota&&guard++<60){
    const opts=analyzed.filter(e=>eligibleEntry(e,null)&&specialized.test(e));
    if(!opts.length)break;
    opts.sort((a,b)=>b.rank-a.rank||a.c.name.localeCompare(b.c.name));
    if(!append(opts[0],specialized.label))break;
    picked.add(oracleId(opts[0].c));
   }
  }
 }
 for(const q of reserve){let guard=0;
  while(functionalCount(q.key)<q.target&&chosen.length-landQuota<spellQuota&&guard++<100){
   const options=analyzed.filter(e=>eligibleEntry(e,null)&&functionalRoles(e.c)[q.key]&&(q.key!=='draw'||!limits.typed||cardAdvantage(e.c)));
   if(!options.length)break;
   options.sort((a,b)=>b.rank-a.rank||a.c.name.localeCompare(b.c.name));
   const next=options[0];if(!append(next,q.label))break;picked.add(oracleId(next.c));
  }
 }
 // v1.0: actual COMMUNITY-INFORMED CONSTRUCTION. Unlike v0.9's reporting,
 // packages are committed as whole units before generic typed-engine filling.
 // Sources must have passed independent-deck, declared-bracket, creator,
 // legality, price and mechanical evidence gates in communityConstruction.
 // The remaining original generator enforces all other floors and policies.
 const communityLocks=new Set(),communityAdded=[],communitySkipped=[];
 const communitySelection=communityBuild?.selected||null;
 const communityReport={mode:communitySelection?'community-informed':'local-only',
  evidence:communityBuild?.status||'not-provided',sampleSize:communityBuild?.sampleSize||0,
  highConfidence:!!communityBuild?.highConfidence,selectedStrategy:communitySelection?.id||null,
  strategyLabel:communitySelection?.label||null,availableStrategies:communityBuild?.candidates?.length||0,
  sourceDecks:communitySelection?.sourceDecks||[],sourcesAreProofOfPower:false,
  maxNewCards:communityBuild?.maxSeedCards||0,committedPackages:[],added:communityAdded,
  skipped:communitySkipped,method:'Preselected coherent imported packages with atomic legality and role checks; no win-rate or playtest claim'};
 if(communitySelection){
  const maxNew=communityBuild.maxSeedCards||0;
  let newTotal=0;
  function commitGroup(ids,label,sourceKeys=[]){
   const requested=[...new Set(ids)];
   // Already selected cards are still an essential part of the committed
   // group. Protect them too: otherwise reinvestment can silently destroy
   // a reported "atomic" community package.
   const missing=requested.filter(id=>!picked.has(id));
   if(!missing.length){for(const id of requested)communityLocks.add(id);return true;}
   if(newTotal+missing.length>maxNew){communitySkipped.push({label,reason:'Community seed cap'});return false;}
   const entries=missing.map(id=>analyzedById.get(id));
   if(entries.some(x=>!x)){communitySkipped.push({label,reason:'Unavailable priced legal cards'});return false;}
   const additions=entries.map(x=>x.c);
   // Simultaneous members must satisfy global constraints together, not just
   // each pass an individual allowed() check against the unchanged deck.
   const singletonKeys=additions.map(singletonName);
   if(new Set(singletonKeys).size!==singletonKeys.length ||
      gcs+additions.filter(c=>c.game_changer).length>profile.maxGameChangers){
    communitySkipped.push({label,reason:'Batch singleton or Game Changer limit'});return false;
   }
   const oldSpells=chosen.filter(c=>!isLandSlot(c));
   const projectedFive=oldSpells.filter(c=>c.cmc>=5).length+additions.filter(c=>c.cmc>=5).length;
   const projectedSeven=oldSpells.filter(c=>c.cmc>=7).length+additions.filter(c=>c.cmc>=7).length;
   if(projectedFive>maxCurve.fivePlus||projectedSeven>maxCurve.sevenPlus){
    communitySkipped.push({label,reason:'Combined mana-curve limit'});return false;
   }
   const spellCount=chosen.length-landQuota;
   // Keep enough capacity for the commander's unfinished engine quota and
   // at least some situational support cards; don't spend all slots on trends.
   const remainingTarget=Math.max(0,...targets.map(q=>q.target-roleCounts(q.role)-
    entries.filter(x=>x.s.roles.includes(q.role)).length));
   if(spellQuota-spellCount-additions.length<Math.max(8,remainingTarget)){
    communitySkipped.push({label,reason:'Primary strategy reserve'});return false;
   }
   if(additions.some(c=>!allowed(c)||!curveAllowed(c)||castabilityIssues(c,chosen.filter(isLandSlot)).length)){
    communitySkipped.push({label,reason:'Legality, castability or curve gate'});return false;
   }
   if(spent+additions.reduce((sum,c)=>sum+(priceOf(c)||0),0)>cap+1e-7){
    communitySkipped.push({label,reason:'Budget cap'});return false;
   }
   const provisional=[...chosen];
   for(const c of additions){
    if(!fitsSelectionLimits(c,provisional,limits)){communitySkipped.push({label,reason:'Response/card-selection ceilings'});return false;}
    provisional.push(c);
   }
   const unsupportable=additions.filter(c=>dependencyEvidence(c,provisional).length);
   if(unsupportable.length){communitySkipped.push({label,reason:'Unverified support dependencies: '+unsupportable.map(c=>c.name).join(', ')});return false;}
   for(const c of additions){
    if(!append(c,`Community ${label} · verified public source co-occurrence`))throw Error('Atomic community package validation changed unexpectedly.');
    const id=oracleId(c);picked.add(id);communityAdded.push(c.name);newTotal++;
   }
   for(const id of requested)communityLocks.add(id);
   return true;
  }
  for(const pkg of communitySelection.packages||[]){
   if(commitGroup(pkg.ids,`package (${pkg.support} source lists)`,pkg.sourceDecks)){
    communityReport.committedPackages.push({cards:pkg.ids.map(id=>analyzedById.get(id)?.c.name||id),
     sourceDecks:pkg.sourceDecks||[],observedDecks:pkg.support,executionVerified:false});
   }
  }
  for(const id of communitySelection.cardIds||[]){
   if(newTotal>=maxNew)break;
   // Do not lock an unrelated baseline card merely because it also appears
   // in community lists. Only atomic package members and NEW seeds are held.
   if(!communityLocks.has(id)&&!picked.has(id))commitGroup([id],'archetype-supported card');
  }
  communityReport.newCardCount=newTotal;
  if(!newTotal&&!communityReport.committedPackages.length){
   communityReport.mode='local-only';
   communityReport.evidence='no feasible community seeds after all mechanical gates';
  }
 }
 // v0.8.8: scored combo *networks* after functional reserves but before
 // primary engine quotas and filler. A card shared by multiple viable combos
 // has genuine marginal value. The other protection/ramp floors are already
 // reserved and cannot be swapped away later.
 const comboLocks=new Set(),comboSelections=[],comboNetworkTrace=[];
 const {candidates:comboCandidates,rejected:comboRejected}=proposeComboPackages({variants:comboVariants,cards:[commander,...nonlands],commander,chosen,plan,bracket:b,budget:cap,remainingSlots:99-chosen.length,gameChangers:gcs,maxGameChangers:profile.maxGameChangers,curveAllowed});
 const maxNetworkPackages=optimized?4:high?3:1;
 const maxNetworkCards=optimized?8:high?6:3;
 let networkNewCards=0;
 for(let attempt=0;attempt<maxNetworkPackages;attempt++){
  const ranked=rankPackageNetwork(comboCandidates,chosen,commander,maxNetworkCards-networkNewCards);
  // Keep enough open spell slots for the commander's *primary strategy*.
  // Cards in a package can themselves satisfy that strategy quota.
  let selection=null;
  for(const option of ranked){
   const pkg=option.pkg,adds=option.missing;
   if(comboSelections.some(x=>x.id===pkg.id)||!adds.length)continue;
   if(addedTooMany(adds))continue;
   if(spent+option.addedPrice>cap+1e-6)continue;
   if(gcs+adds.filter(c=>c.game_changer).length>profile.maxGameChangers)continue;
   if(adds.some(c=>!allowed(c)||!curveAllowed(c)||!analyzedById.has(oracleId(c))||castabilityIssues(c,chosen.filter(isLandSlot)).length))continue;
   // Evaluate the complete package, not its members independently: several
   // narrow spells can collectively exceed the cap even if each alone fits.
   if(adds.reduce((ok,c)=>{if(!ok.valid)return ok;const next=[...ok.cards];if(!fitsSelectionLimits(c,next,limits))return {valid:false,cards:next};next.push(c);return {valid:true,cards:next};},{valid:true,cards:[...chosen]}).valid===false)continue;
   const five=chosen.filter(c=>!isLandSlot(c)&&c.cmc>=5).length+adds.filter(c=>c.cmc>=5).length;
   const seven=chosen.filter(c=>!isLandSlot(c)&&c.cmc>=7).length+adds.filter(c=>c.cmc>=7).length;
   if(five>maxCurve.fivePlus||seven>maxCurve.sevenPlus)continue;
   const afterRoleCount=role=>roleCounts(role)+adds.filter(c=>analyzedById.get(oracleId(c))?.s.roles.includes(role)).length;
   const outstanding=Math.max(0,...targets.map(t=>t.target-afterRoleCount(t.role)));
   if(spellQuota-(chosen.length-landQuota)-adds.length<outstanding)continue;
   selection=option;break;
  }
  if(!selection)break;
  const pkg=selection.pkg,added=[];
  for(const c of selection.missing){
   if(!append(c,`Overlapping Spellbook package ${pkg.id}; prerequisites unverified`))throw Error('Network package feasibility changed during selection.');
   picked.add(oracleId(c));comboLocks.add(oracleId(c));added.push(c.name);
  }
  for(const id of pkg.memberIds||[])if(picked.has(id))comboLocks.add(id);
  comboSelections.push({id:pkg.id,url:pkg.url,added,namedCards:pkg.namedCards,results:pkg.results,templateMatches:pkg.templateMatches,alreadyPresent:pkg.alreadyPresent,onPlanCards:pkg.onPlanCards,commanderInCombo:pkg.commanderInCombo,missingCostEstimate:r2(selection.addedPrice),isInfinite:pkg.isInfinite,prerequisites:pkg.prerequisites,sharedLinks:selection.sharedLinks,additionalCompleted:selection.additionalCompleted});
  networkNewCards+=selection.missing.length;
  comboNetworkTrace.push({id:pkg.id,added:added.length,linkedVariants:selection.sharedLinks,additionalComplete:selection.additionalCompleted});
 }
 function addedTooMany(adds){return adds.length>spellQuota-(chosen.length-landQuota)||adds.length>maxNetworkCards-networkNewCards;}
 // Fulfil original strategy targets *after* useful package inclusions; this
 // counts engine cards acquired through the network toward typed-cast quotas.
 for(const q of targets)pick(q.role,q.target,q.label);
 if(plan.needs.some(n=>n.kind==='typed-cast'))pick('finisher',b===2?3:4,'On-plan game-ending threat');
 const generic=[{role:'ramp',limit:tuning.ramp,label:'Mana development'}, {role:'removal',limit:limits.interactionGoal??tuning.interaction,label:'Interaction'}, {role:'draw',limit:limits.drawGoal??tuning.draw,label:'Card advantage'}, {role:'protection',limit:limits.shieldingGoal??tuning.protection,label:'Protection'}];
 const genericCount=role=>chosen.filter(c=>!isLandSlot(c)&&(role==='ramp'?manaRole(c).effective:role==='draw'&&limits.typed?cardAdvantage(c):functionalRoles(c)[role==='removal'?'interaction':role])).length;
 for(const q of generic){let safety=0;while(genericCount(q.role)<q.limit&&chosen.length-landQuota<spellQuota&&safety++<100){const p=analyzed.filter(x=>eligibleEntry(x,null)&&(q.role==='ramp'?manaRole(x.c).effective:q.role==='draw'&&limits.typed?cardAdvantage(x.c):functionalRoles(x.c)[q.role==='removal'?'interaction':q.role]));if(!p.length)break;p.sort((a,b)=>b.rank-a.rank||a.c.name.localeCompare(b.c.name));const o=p[0];if(!append(o,q.label))break;picked.add(oracleId(o.c));}}
 // Fill the remaining slots with on-strategy cards or useful interaction, not foreign packages.
 while(chosen.length-landQuota<spellQuota){
  const opts=analyzed.filter(e=>eligibleEntry(e,null)&&((e.s.impact>0)||(functionalRoles(e.c).interaction||functionalRoles(e.c).draw||manaRole(e.c).effective||functionalRoles(e.c).protection)));
  if(!opts.length)break;
  const typedNeed=targets.find(q=>q.role==='engine');
  const currentEngine=typedNeed?roleCounts('engine'):0;
  const adjusted=x=>x.rank-(typedNeed&&x.s.roles.includes('engine')&&!x.s.roles.includes('finisher')?Math.max(0,currentEngine-typedNeed.target)*3.5:0);
  opts.sort((a,b)=>adjusted(b)-adjusted(a)||a.c.name.localeCompare(b.c.name));const o=opts[0];if(!append(o,o.s.impact>0?'Supports commander engine':'Useful supporting spell'))break;picked.add(oracleId(o.c));
 }
 // V55-inspired budget-reinvestment pass. A cheap first-pass choice is not
 // automatically the best achievable card when the user has a larger budget.
 // Compare independently useful in-deck cards at *equal price sensitivity*
 // (remove the acquisition-price penalty from the marginal quality measure),
 // but protect every functional role at its currently achieved floor. No swap
 // can sacrifice the commander engine, early acceleration, curve or GC policy.
 // This does not "spend the budget" for its own sake: swaps must improve merit.
 const beforeReinvest=spent;
 const reinvestments=[];
 const intrinsic=e=>e.rank+1.8*Math.log1p(priceOf(e.c)||0);
 const byMerit=analyzed.slice().sort((x,y)=>intrinsic(y)-intrinsic(x)||x.c.name.localeCompare(y.c.name));
 const genericRoles=['ramp','removal','draw','protection'];
 const genericThresholds={ramp:tuning.ramp,removal:limits.interactionGoal??tuning.interaction,draw:limits.drawGoal??tuning.draw,protection:limits.shieldingGoal??tuning.protection};
 for(let iteration=0;iteration<((high||optimized)?24:12)&&cap-spent>0.10;iteration++){
  const spells=chosen.filter(c=>!isLandSlot(c));
  const roleTotal=Object.fromEntries([...new Set(targets.map(x=>x.role))].map(role=>[role,spells.filter(c=>analyzedById.get(oracleId(c))?.s.roles.includes(role)).length]));
  const genericTotal=Object.fromEntries(genericRoles.map(role=>[role,spells.filter(c=>role==='ramp'?manaRole(c).effective:functionalRoles(c)[role==='removal'?'interaction':role]).length]));
  const powerCounts=(high||optimized)?highPowerAudit(spells):null;
  const currentC=chosen.filter(trueColorlessSource).length;
  const currentEarly=earlyManaCount();
  const fiveCount=spells.filter(c=>c.cmc>=5).length,sevenCount=spells.filter(c=>c.cmc>=7).length;
  let best=null;
  // Cap scanning work in large bulk catalogs without changing which cards
  // the initial generator is allowed to pick. The strongest individually
  // useful alternatives are tested first, and infeasible ones are ignored.
  const candidates=byMerit.slice(0,5000).filter(e=>!picked.has(oracleId(e.c)));
  for(let i=0;i<chosen.length;i++){
   const old=chosen[i];if(isLandSlot(old)||comboLocks.has(oracleId(old))||communityLocks.has(oracleId(old)))continue;
   const oldEntry=analyzedById.get(oracleId(old));if(!oldEntry)continue;
   const oldMerit=intrinsic(oldEntry);
   const oldRoles=oldEntry.s.roles;
   const oldEarly=earlyAcceleration(old,oldEntry.a)>-Infinity;
   const maxUpgradeCost=cap-spent+priceOf(old);
   for(const next of candidates){
    const newMerit=intrinsic(next);
    const delta=newMerit-oldMerit;
    if(delta<=1.5)break; // Candidates are sorted by intrinsic merit.
    if(priceOf(next.c)>maxUpgradeCost+1e-6||!allowed(next.c)||!spellFits(next.c,old))continue;
    if(next.c.game_changer&&!old.game_changer&&gcs>=profile.maxGameChangers)continue;
    if(plan.needsColorless&&trueColorlessSource(old)&&!trueColorlessSource(next.c)&&currentC<=9)continue;
    // A stronger-looking generic card must not replace a markedly more
    // efficient early accelerator, even if the deck has spare mana rocks.
    if(oldEarly&&earlyAcceleration(next.c,next.a)<earlyAcceleration(old,oldEntry.a)-0.001)continue;
    if(old.cmc<5&&next.c.cmc>=5&&fiveCount>=maxCurve.fivePlus)continue;
    if(old.cmc<7&&next.c.cmc>=7&&sevenCount>=maxCurve.sevenPlus)continue;
    // Protect core dependencies and generic utility requirements. If the
    // current build could not reach a quota, don't make its deficit worse.
    const losesCore=targets.some(t=>oldRoles.includes(t.role)&&!next.s.roles.includes(t.role)&&roleTotal[t.role]<=t.target);
    if(losesCore)continue;
    const fn=(card,r)=>r==='ramp'?manaRole(card).effective:r==='draw'&&limits.typed?cardAdvantage(card):functionalRoles(card)[r==='removal'?'interaction':r];
    const losesGeneric=genericRoles.some(r=>fn(old,r)&&!fn(next.c,r)&&genericTotal[r]<=genericThresholds[r]);
    if(losesGeneric)continue;
    if(high||optimized){
     const oldEff=spellEfficiency(old),newEff=spellEfficiency(next.c);
     const critical=[['directShield',3],['spotRemoval',limits.typed&&high?5:3],['cheapDraw',5]];
     if(critical.some(([key,floor])=>oldEff[key]&&!newEff[key]&&powerCounts[key]<=floor))continue;
    }

    // Prefer meaningful commander involvement, or a concrete utility job;
    // unrelated filler cannot sneak in merely through EDHREC popularity.
    if(next.s.impact<=0&&!genericRoles.some(r=>r==='ramp'?manaRole(next.c).effective:functionalRoles(next.c)[r==='removal'?'interaction':r]))continue;
    if(!best||delta>best.delta+1e-6||Math.abs(delta-best.delta)<1e-6&&priceOf(next.c)<priceOf(best.next.c))best={i,old,oldEntry,next,delta};
    // Candidate list is sorted by descending intrinsic merit. The first
    // feasible upgrade is therefore optimal for this old slot; scanning
    // thousands of weaker options cannot improve the result.
    break;
   }
  }
  if(!best)break;
  const newCard=best.next.c;
  remaining.delete(oracleId(best.old));picked.delete(oracleId(best.old));
  if(!isBasic(best.old)){const name=singletonName(best.old);const left=(chosenNames.get(name)||0)-1;if(left)chosenNames.set(name,left);else chosenNames.delete(name);}
  if(!isBasic(newCard))chosenNames.set(singletonName(newCard),(chosenNames.get(singletonName(newCard))||0)+1);
  remaining.set(oracleId(newCard),newCard);picked.add(oracleId(newCard));
  chosen[best.i]=newCard;
  spent+=priceOf(newCard)-priceOf(best.old);
  gcs+=(newCard.game_changer?1:0)-(best.old.game_changer?1:0);
  reasons.delete(oracleId(best.old));reasons.set(oracleId(newCard),'Higher-impact budget upgrade (core roles preserved)');
  reinvestments.push({out:best.old.name,in:newCard.name,additionalCost:r2(priceOf(newCard)-priceOf(best.old)),meritGain:r2(best.delta)});
 }
 // Land slots were reserved before spells were selected. Now that the actual
 // colored pips are known, redistribute *basic* land slots to meet real demand.
 // This changes no prices, land counts, nonbasic selections or source identity.
 if(legalColors.length>=2){
  const basicIndexes=chosen.flatMap((c,i)=>isBasic(c)&&c.name!=='Wastes'?[i]:[]);
  const pipCounts=Object.fromEntries(legalColors.map(k=>[k,chosen.filter(c=>!isLandSlot(c)).reduce((n,c)=>n+manaPips(c).filter(x=>x===k).length,0)]));
  const basicsFromChoices=chosen.filter((c,i)=>!basicIndexes.includes(i));
  const totals=Object.fromEntries(legalColors.map(k=>[k,basicsFromChoices.filter(c=>landAccess(c,{commander,plan,lands:basicsFromChoices.filter(isLandSlot),spells:chosen.filter(c=>!isLandSlot(c))}).reliable.includes(k)).length]));
  const chosenBasics=Object.fromEntries(legalColors.map(k=>[k,0]));
  for(const i of basicIndexes){
   const candidates=basicIndexes.length>=legalColors.length?legalColors.filter(k=>chosenBasics[k]===0):legalColors;
   const options=candidates.length?candidates:legalColors;
   const color=options.slice().sort((a,b)=>{
    const priority=k=>(1+0.7*pipCounts[k])/(1+totals[k]);
    return priority(b)-priority(a)||a.localeCompare(b);
   })[0];
   const name=({W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest'})[color];
   chosen[i]=basicMap.get(name);chosenBasics[color]++;totals[color]++;
  }
 }
 // v0.8.10: compare several complete, constrained candidate decks. This is
 // deliberately AFTER the established generator and BEFORE the final audits,
 // so no candidate bypasses the existing export, budget or singleton gates.
 const portfolio=optimizeWholeDeck({cards99:[...chosen],commander,plan,bracket:b,limits,
  variants:comboVariants,catalog:nonlands,budget:cap,commanderPrice:cmdPrice,
  lockedIds:new Set([...comboLocks,...communityLocks]),maxGameChangers:profile.maxGameChangers,requiredRoles:targets,
  minOnPlan:Math.min(chosen.filter(c=>!isLandSlot(c)&&analyzedById.get(oracleId(c))?.s.impact>=4).length,
                 plan.needs.some(n=>n.kind==='typed-cast')?21:10)});
 for(const change of portfolio.report.swaps){
  const previous=chosen.find(c=>c.name===change.out);
  if(previous)reasons.delete(oracleId(previous));
  const replacement=nonlands.find(c=>c.name===change.in);
  if(replacement)reasons.set(oracleId(replacement),`Whole-deck ${portfolio.report.selected} improvement (role floors preserved)`);
 }
 chosen.splice(0,chosen.length,...portfolio.cards);
 // v0.8.11: optimize land slots AFTER the selected spells determine colored demand.
 const manaPortfolio=optimizeManaBase({cards99:chosen,commander,plan,catalog:lands,budget:cap,commanderPrice:cmdPrice});
 chosen.splice(0,chosen.length,...manaPortfolio.cards);
 spent=cmdPrice+chosen.reduce((n,c)=>n+(priceOf(c)||0),0);
 gcs=(commander.game_changer?1:0)+chosen.filter(c=>c.game_changer).length;
 const cards99=[...chosen];
 const singleton=validateCommanderSingleton(commander,cards99);
 if(!singleton.valid)throw Error(`Commander singleton validation failed: ${singleton.violations.join('; ')}`);
 const valid=cards99.length===99&&cards99.filter(isLandSlot).length===landQuota;
 const actualCounts=targets.map(q=>({...q,actual:cards99.filter(c=>{const o=analyzedById.get(oracleId(c));return o?.s.roles.includes(q.role);}).length}));
 const colorless=cards99.filter(trueColorlessSource).length;
 const selectedSpells=cards99.filter(c=>!isLandSlot(c));
 const demand=Object.fromEntries(legalColors.map(color=>[color,selectedSpells.reduce((n,c)=>n+manaPips(c).filter(x=>x===color).length,0)]));
 const qualityAudit=deckQuality({cards:cards99,commander,plan,bracket:b});
 const roleAudit=evidenceAudit(cards99);
 const selectionAudit={limits,totals:selectionTotals(cards99),castabilityIssues:cards99.filter(c=>!isLandSlot(c)).flatMap(c=>castabilityIssues(c,cards99.filter(isLandSlot)).map(issue=>({card:c.name,issue}))),method:'Card-independent interaction ceilings and explicit snow-mana feasibility; not full casting simulation'};
 const highAudit=(high||optimized)?highPowerAudit(cards99):null;
 const openingHands=sampleOpeningHands(cards99,{seed:`${oracleId(commander)}:B${b}`});
 const sources=Object.fromEntries(legalColors.map(color=>[color,qualityAudit.landSources[color]]));
 const weakColors=legalColors.filter(color=>demand[color]>0&&sources[color]<Math.min(12,legalColors.length>=4?Math.max(6,Math.min(9,Math.ceil(demand[color]*.7))):Math.max(10,Math.ceil(demand[color]*.8))));
 const missing=actualCounts.filter(x=>x.actual<x.target).map(q=>`${q.label}: ${q.actual}/${q.target}`);
 if(plan.needsColorless>0 && colorless < (legalColors.length>=4?9:8))missing.push(`True colorless-producing cards: ${colorless}`);
 for(const color of weakColors)missing.push(`Weak ${color} access: ${sources[color]} sources for ${demand[color]} colored pips`);
 if(roleAudit.unsupported.length)missing.push(`${roleAudit.unsupported.length} card(s) with unsupported payoff dependencies`);
 if(roleAudit.counts.positiveDraw<4)missing.push(`Only ${roleAudit.counts.positiveDraw} directly positive draw cards identified (conditional engines listed separately)`);
 if(selectionAudit.castabilityIssues.length)missing.push(`${selectionAudit.castabilityIssues.length} spell(s) with unsupported casting costs`);
 if(!valid)missing.push(`Deck size or lands incomplete: ${cards99.length}/99 cards; ${cards99.filter(isLandSlot).length}/${landQuota} lands`);
 const comboInventory=comboVariants.length?annotateCombos({included:comboVariants,near:[],reportedIncluded:comboVariants.length,reportedNear:0},{commanderIds:[oracleId(commander)],mainboard:cards99.map(c=>({id:oracleId(c),quantity:1}))},cards):null;
 const comboNetwork={packagesCommitted:comboSelections.length,newCards:networkNewCards,completeEligibleNetworks:completeNetworkPackages(comboCandidates,[...chosen],commander).length,selections:comboNetworkTrace,method:'Shared-component Spellbook graph; inventory evidence only, not executable wins or externally measured power'};
 const comboPlan={network:comboNetwork,source:'Locally recorded Commander Spellbook variants',knownVariants:comboVariants.length,candidatePackages:comboCandidates.length,rejectedPackages:comboRejected.length,selected:comboSelections,inventoryComplete:comboInventory?.counts.complete??0,inventoryInfinite:comboInventory?.counts.infiniteComplete??0,inventoryCombinations:(comboInventory?.complete||[]).slice(0,20).map(v=>({id:v.id,url:v.url,namedCards:v.cards,templateMatches:v.templateMatches,results:v.results,prerequisites:v.prerequisites,executionVerified:false})),executionVerified:false};
 comboPlan.executionAudit=auditComboExecutions([...(comboInventory?.complete||[]),...comboVariants.filter(v=>comboCandidates.some(c=>c.id===v.id))],{commander,cards:cards99,catalog:cards,proposedIds:comboCandidates.map(c=>c.id)});
 // Independently check the final *exported* list, not only catalog identities.
 const finalCards=cards99.sort((a,b)=>Number(isLandSlot(a))-Number(isLandSlot(b))||a.name.localeCompare(b.name));
 const exportAudit=validateCommanderSingleton({name:exportCardName(commander),type_line:commander.type_line,oracle_text:commander.oracle_text,card_faces:commander.card_faces,layout:commander.layout},finalCards.map(c=>({...c,name:exportCardName(c)})));
 if(!exportAudit.valid)throw Error(`Export singleton validation failed: ${exportAudit.violations.join('; ')}`);
 const exportDeck=[`1 ${displayName(commander)} *CMDR*`,...finalCards.map(c=>`1 ${displayName(c)}`)].join('\n');
 return withSelectedCards({commander:commander.name,plan:plan.label,confidence:plan.confidence,powerTarget,highPowerAudit:highAudit,bracket:b,budget:cap,price:r2(spent),totalCards:cards99.length+1,landCount:cards99.filter(isLandSlot).length,colorlessSources:colorless,comboPlan,reinvestment:{spentBefore:r2(beforeReinvest),spentAfter:r2(spent),swaps:reinvestments},wholeDeckOptimization:portfolio.report,manaOptimization:manaPortfolio.report,communityConstruction:communityReport,roleAudit,earlyAcceleration:earlyManaCount(),qualityAudit,selectionAudit,openingHands,highManaValueSpells:cards99.filter(c=>!isLandSlot(c)&&c.cmc>=5).length,sevenPlusSpells:cards99.filter(c=>!isLandSlot(c)&&c.cmc>=7).length,coloredMana:{demand,sources},gameChangers:gcs,qualityVerdict:!valid?'INCOMPLETE':plan.confidence==='low'?'UNCLASSIFIED COMMANDER':(missing.length||qualityAudit.warnings.length||roleAudit.unsupported.length)?'PLAYABILITY NEEDS REVIEW':'HEURISTIC TARGETS MET — NOT PLAYTEST CERTIFIED',warnings:[...missing,...qualityAudit.warnings,...(plan.confidence==='low'?['Commander mechanic not yet recognized. This deck cannot be certified.']:[]),'Budget estimates use cached Scryfall EUR prices (not necessarily the cheapest printing); basic lands assumed owned.','Brackets are approximate playstyle profiles, not independently verified official bracket compliance. Combo policy is deliberately conservative.',...(comboVariants.length?['Combo inventory matches are not proof of executable win conditions or bracket compliance.']:['No locally verified Spellbook variants for this commander; generation used existing strategy rules without combo assertions.'])],needs:actualCounts,deck:exportDeck,sections:{lands:cards99.filter(isLandSlot).map(displayName),spells:cards99.filter(c=>!isLandSlot(c)).map(displayName)},reasons:cards99.filter(c=>!isLandSlot(c)).slice(0,20).map(c=>({name:c.name,reason:reasons.get(oracleId(c))}))},commander,finalCards);
}


/** New API engine; the historical single-path constructor remains independently
 * accessible for deterministic A/B tests and as a hard safety fallback.
 * The old result is *only* a reporting scaffold for successfully constructed
 * strategy-first candidates. Its spell/land decisions never fill these decks.
 */
export function generateDeck(opts){
 const policy=budgetPolicy(opts),cards=applyBudgetValuation(opts.cards,policy);
 const commander=cards.find(c=>oracleId(c)===oracleId(opts.commander));
 if(!commander)throw Error('Commander is missing from priced catalog.');
 const result=generateWithEffectiveBudget({...opts,cards,commander,budget:policy.effectiveMaximum});
 if(result.price>policy.effectiveMaximum+0.005)throw Error('Final selected deck exceeds the effective maximum.');
 result.budgetPolicy=budgetUsage(policy,result.price);
 result.warnings=result.warnings.map(w=>w.startsWith('Budget estimates use cached Scryfall EUR prices')?'Selected EUR estimates; '+policy.assumption+'. Shipping excluded.':w);
 return result;
}
function generateWithEffectiveBudget(opts){
 const {cards,commander,bracket=3,budget=191,powerTarget='balanced',communityBuild=null,
  communityDecks=[],constructionMode='legacy',comboVariants=[]}=opts;
 if(!['legacy','strategy-first'].includes(constructionMode))throw Error('Unknown construction mode.');
 const legacy=generateLegacyDeck(opts);
 if(constructionMode==='legacy'){
  legacy.constructionEngine={mode:'legacy',selected:'legacy',reason:'Explicit old-generator A/B selection'};
  return legacy;
 }
 const plan=planFor(commander),landQuota=BRACKETS[Number(bracket)].lands+((commander.color_identity||[]).length>=4?1:0);
 const referenceCards=selectedCards(legacy)?.slice(1)||[];
 const referenceDeck=referenceCards.length===99?{status:'ok',strategy:'reference:legacy',label:'Complete reference with coordinated investment',cards:referenceCards,price:legacy.price,
  committedCombos:[...(legacy.comboPlan?.selected||[]).map(c=>({id:c.id,added:c.added||[],cards:[...(c.namedCards||[]),...(c.added||[]),...(c.templateMatches||[]).map(t=>t.card)]})),...(legacy.communityConstruction?.committedPackages||[])]}:null;
 const pool=constructStrategyDeck({cards,commander,bracket,budget,powerTarget,communityBuild,communityDecks,preferredCombos:legacy.comboPlan?.selected||[],comboVariants,investmentTrace:opts.investmentTrace||[],referenceDeck});
 const baselineCards=legacy.deck.split('\n').slice(1).map(row=>row.replace(/^1 /,''));
 const lookup=new Map(cards.map(c=>[exportCardName(c),c]));
 const baseline=baselineCards.map(n=>lookup.get(n)).filter(Boolean);
 const baselineScore=baseline.length===99?strategyScore(baseline,commander,plan):null;
 const candidate=pool.selected;
 // Never advertise heuristic improvements as verified competitive power.
 const failed=!candidate||candidate.cards.length!==99||candidate.cards.filter(isLandSlot).length!==landQuota||
  candidate.price>Number(budget)+1e-5||!validateCommanderSingleton(commander,candidate.cards).valid;
 const functionalImprovement=!!candidate&&baseline.length===99&&functionallyBetter(investmentEvidence(candidate.cards,commander,plan),investmentEvidence(baseline,commander,plan));
 const materiallyWorse=!!candidate&&!!baselineScore&&!functionalImprovement&&candidate.score.value<baselineScore.value-18;
 if(failed||materiallyWorse){
  return {...legacy,constructionEngine:{...pool.report,mode:'strategy-first',selected:'legacy-fallback',
   reason:failed?'Independent complete-deck candidate failed a hard validation gate.':'Independent whole-deck evidence was materially below the legacy reference.',
   legacyScore:baselineScore?.value??null},
   warnings:[...legacy.warnings,'Strategy-first did not pass the local acceptance gate; the legacy deck was returned.']};
 }
 const spells=candidate.cards.filter(c=>!isLandSlot(c)),lands=candidate.cards.filter(isLandSlot);
 const all=[...spells,...lands],final=spells.slice().sort((a,b)=>a.name.localeCompare(b.name))
  .concat(lands.slice().sort((a,b)=>a.name.localeCompare(b.name)));
 const deck=`1 ${exportCardName(commander)} *CMDR*\n${final.map(c=>`1 ${exportCardName(c)}`).join('\n')}`;
 const quality=deckQuality({cards:all,commander,plan,bracket:Number(bracket)});
 const evidence=evidenceAudit(all),limits=selectionLimits(plan,Number(bracket),powerTarget);
 const selection={limits,totals:selectionTotals(all),castabilityIssues:spells.flatMap(c=>
  castabilityIssues(c,lands).map(issue=>({card:c.name,issue}))),method:'Conservative role/castability screening; not full casting simulation'};
 const demand=Object.fromEntries((commander.color_identity||[]).filter(x=>COLORS.includes(x)).map(k=>[k,spells.reduce((n,c)=>n+manaPips(c).filter(v=>v===k).length,0)]));
 const required=targetsFor(plan,commander,BRACKETS[Number(bracket)],[]);
 const needs=required.map(q=>({...q,actual:spells.filter(c=>synergy(c,plan,analysis(c)).roles.includes(q.role)).length}));
 const warnings=[...quality.warnings,...needs.filter(q=>q.actual<q.target).map(q=>`${q.label}: ${q.actual}/${q.target}`),
  ...evidence.unsupported.slice(0,4).map(x=>`${x.card}: ${x.reasons.join('; ')}`),
  ...selection.castabilityIssues.map(x=>`${x.card}: ${x.issue}`),
  'Independent decks are selected using local mechanical heuristics and unverified public examples; no official bracket certification or simulated gameplay.',
  'Scryfall EUR estimates and Cardmarket offer snapshots depend on the selected pricing source; shipping excluded.'];
 const comboInventory=comboVariants.length?annotateCombos({included:comboVariants,near:[],reportedIncluded:comboVariants.length,reportedNear:0},
   {commanderIds:[oracleId(commander)],mainboard:all.map(c=>({id:oracleId(c),quantity:1}))},cards):null;
 const comboCommitted=candidate.committedCombos||[];
 const comboPlan={network:{packagesCommitted:comboCommitted.length,newCards:sumComboCards(comboCommitted),completeEligibleNetworks:0,selections:[],method:'Legacy Spellbook candidate packages checked atomically by independent constructor; inventory completion is not proof of execution'},
  source:'Recorded local Commander Spellbook variants',knownVariants:comboVariants.length,candidatePackages:0,rejectedPackages:0,selected:comboCommitted.map(x=>({id:x.id||'retained-package',added:x.added||[],namedCards:x.cards,results:[],prerequisites:[],templateMatches:[]})),
  inventoryComplete:comboInventory?.counts.complete??0,inventoryInfinite:comboInventory?.counts.infiniteComplete??0,
  inventoryCombinations:(comboInventory?.complete||[]).slice(0,20).map(v=>({id:v.id,url:v.url,namedCards:v.cards,templateMatches:v.templateMatches,
    results:v.results,prerequisites:v.prerequisites,executionVerified:false})),executionVerified:false};
 const proposedComboIds=[...new Set([...(legacy.comboPlan?.executionAudit?.combinations||[]).filter(v=>v.proposed).map(v=>v.id),...comboCommitted.map(c=>c.id)])];
 comboPlan.executionAudit=auditComboExecutions([...(comboInventory?.complete||[]),...comboVariants.filter(v=>proposedComboIds.includes(v.id))],{commander,cards:all,catalog:cards,proposedIds:proposedComboIds});
 const sourceNames=candidate.sourceKey?candidate.cards.filter(c=>!isLandSlot(c)).slice(0).filter(c=>{
  const list=communityDecks.find(d=>d.key===candidate.sourceKey);return !!list?.mainboard.some(x=>String(x.id)===String(oracleId(c)));
 }).map(c=>c.name):[];
 const community={mode:candidate.sourceKey?'community-informed':'local-only',strategyLabel:candidate.label,
  evidence:'Full independent source-deck scaffold or local archetype; never asserted to be a proven strategy',
  highConfidence:!!communityBuild?.highConfidence,sourceDecks:candidate.sourceKey?[candidate.sourceKey]:[],added:sourceNames,
  newCardCount:sourceNames.length,committedPackages:[],skipped:[]};
 const alternatives=(pool.alternatives||[]).map(row=>{
  const ordered=row.cards.filter(c=>!isLandSlot(c)).sort((a,b)=>a.name.localeCompare(b.name)).concat(row.cards.filter(isLandSlot).sort((a,b)=>a.name.localeCompare(b.name)));
  const alternative=withSelectedCards({deck:`1 ${exportCardName(commander)} *CMDR*\n${ordered.map(c=>`1 ${exportCardName(c)}`).join('\n')}`,price:row.price,budget:Number(budget)},commander,ordered);
  const audit=auditExportPricing(alternative,commander,cards);
  if(audit.count!==100||!audit.withinBudget||!audit.agreesWithGenerator||audit.anomalies.length)throw Error('Alternative deck exact-printing audit failed.');
  const comparison=pool.report.comparison.find(x=>x.id===row.strategy);
  return {id:row.strategy,recommended:row.strategy===candidate.strategy,deck:alternative.deck,price:audit.total,pricingAudit:audit,relations:row.relations,comparison,sourceKey:row.sourceKey,committedCombos:row.committedCombos,
   explanation:comparison?.selection.reason==='selected'?'Provisional recommendation under existing comparator; incomparable alternatives are not proved inferior':comparison?.selection.reason};
 });
 const high=Number(bracket)===4||(Number(bracket)===3&&powerTarget==='high');
 return withSelectedCards({...legacy,deck,price:roundCost(candidate.price),totalCards:100,landCount:lands.length,colorlessSources:all.filter(trueColorlessSource).length,
  alternatives,whyThisDeck:{relations:pool.report.comparison.find(x=>x.id===candidate.strategy)?.relations,discovered:pool.report.discovered,selection:'Supported capabilities constrain pruning. Remaining incomparable strategies use the existing heuristic; this is not an objective power winner.',alternatives:alternatives.map(a=>({id:a.id,price:a.price,explanation:a.explanation}))},
  comboPlan,needs,qualityAudit:quality,roleAudit:evidence,selectionAudit:selection,
  highPowerAudit:high?highPowerAudit(all):null,openingHands:sampleOpeningHands(all,{seed:`${oracleId(commander)}:B${bracket}:strategy-first`}),
  communityConstruction:community,wholeDeckOptimization:null,manaOptimization:null,reinvestment:null,
  budgetInvestment:candidate.budgetInvestment||null,packageInvestment:candidate.packageInvestment||null,
  earlyAcceleration:spells.filter(c=>manaRole(c).effective&&c.cmc<=3).length,
  highManaValueSpells:spells.filter(c=>c.cmc>=5).length,sevenPlusSpells:spells.filter(c=>c.cmc>=7).length,
  coloredMana:{demand,sources:Object.fromEntries(Object.keys(demand).map(k=>[k,quality.landSources[k]||0]))},
  gameChangers:all.filter(c=>c.game_changer).length+(commander.game_changer?1:0),
  qualityVerdict:plan.confidence==='low'?'UNCLASSIFIED COMMANDER':warnings.length?'PLAYABILITY NEEDS REVIEW':'HEURISTIC TARGETS MET — NOT PLAYTEST CERTIFIED',
  warnings:plan.confidence==='low'?[...warnings,'Commander mechanics are not classified; strategy recommendations require independent review.']:warnings,
  sections:{spells:spells.map(exportCardName),lands:lands.map(exportCardName)},
  reasons:spells.slice(0,20).map(c=>({name:c.name,reason:candidate.sourceKey?'Independent source-template / strategy role':'Independent local strategy / functional role'})),
  constructionEngine:{...pool.report,mode:'strategy-first',selected:candidate.strategy,
   legacyScore:baselineScore?.value??null,selectedScore:candidate.score.value,
   selectedEvidence:candidate.score,selectedSource:candidate.sourceKey||null,
   adaptedSourceSpells:candidate.sourceSpellCount,adaptedSourceLands:candidate.sourceLandCount,
   reason:'Independent strategy candidate accepted after legal, budget and mechanical checks. Scores are local heuristics only.'}},commander,final);
}
const roundCost=n=>Math.round(n*100)/100;

const sumComboCards=records=>records.reduce((n,x)=>n+x.added.length,0);
