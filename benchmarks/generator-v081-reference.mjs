/* Unmodified v0.8.1 generator with relative imports redirected for A/B tests. */
import {COLORS,faces,castHasType,castHasSubtype,playableLand,isLandSlot,isBasic,priceOf,legalFor,trueColorlessSource,coloredSources,oracleId,isCommander,landManaQuality,castFaces} from '../src/cards.mjs';
import {planFor,analysis,synergy} from '../src/mechanics.mjs';

export const BRACKETS={
  2:{name:'Core',lands:37,curve:3.6,synergy:1.55,popularity:.35,interaction:8,ramp:9,draw:8,protection:2,maxGameChangers:0},
  3:{name:'Upgraded',lands:36,curve:3.0,synergy:1.75,popularity:.65,interaction:10,ramp:10,draw:9,protection:3,maxGameChangers:3},
  4:{name:'Optimized',lands:35,curve:2.55,synergy:1.6,popularity:1.05,interaction:13,ramp:12,draw:10,protection:4,maxGameChangers:99}
};
const r2=n=>Math.round(n*100)/100;
const displayName=c=>{const name=c.name||'';const parts=name.split(' // ');return parts.length===2&&parts[0]===parts[1]?parts[0]:name;};
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
 if(!a.ramp||c.cmc>3||isLandSlot(c))return -Infinity;
 const t=castFaces(c).map(f=>f.oracle_text||'').join('\n')||c.oracle_text||'';
 const regular=/(?:\{T\}[^.]*add|add[^.]*\{T\})/i.test(t);
 const repeated=regular&&!/sacrifice [^.]*: add|remove [^.]*counter[^.]*: add/i.test(t);
 const multi=/add \{C\}\{C\}|add two mana|add \{W\}\{W\}|add \{U\}\{U\}|add \{B\}\{B\}|add \{R\}\{R\}|add \{G\}\{G\}/i.test(t);
 const oneShot=/create [^.]*spawn|create [^.]*scion|treasure token|sacrifice [^.]*add/i.test(t);
 return 20+10*(3-c.cmc)+(multi?8:0)+(repeated?6:0)-(oneShot?9:0);
}
// Avoid loading an otherwise solid deck with more huge spells than its early
// mana system can reasonably support. Commander-specific high-MV reveal
// strategies (e.g. ninjutsu) are not subject to this typed-cast curve cap.
function curveCaps(plan,profile,fastManaCount){
 if(!plan.needs.some(n=>n.kind==='typed-cast'))return {fivePlus:Infinity,sevenPlus:Infinity};
 return {fivePlus:Math.round(11+fastManaCount*.7+(profile.curve>=3.5?2:0)),sevenPlus:Math.round(3+fastManaCount*.55+(profile.curve>=3.5?1:0))};
}

function quality(c,p,profile,s,a){
  const cmc=c.cmc||0,cost=priceOf(c)||0;
  let base=profile.synergy*s.impact+profile.popularity*popularity(c);
  base-= Math.max(0,cmc-profile.curve)*2.6;
  base-= Math.log1p(cost)*1.8;
  if(s.roles.includes('engine'))base+=practicalEffect(c)*1.8;
  if(s.roles.includes('finisher'))base+=5;
  if(a.ramp && cmc<=3)base+=8;
  if(a.draw)base+=5;
  if(a.removal)base+=5;
  if(a.protection)base+=3;
  if(a.win && s.impact>0)base+=3;
  if(a.ramp && cmc>=5)base-=10;
  if(s.impact===0&&/\b(Ninja|Aura|Equipment)\b/i.test(c.type_line||'')&&!a.ramp&&!a.removal&&!a.draw)base-=10;
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
export function generateDeck({cards,commander,budget=191,bracket=3}){
 const b=Number(bracket),profile=BRACKETS[b],cap=Number(budget);
 if(!profile)throw Error('Choose bracket 2, 3 or 4.');
 if(!Number.isFinite(cap)||cap<=0)throw Error('Budget must be a positive euro amount.');
 if(!commander||!isCommander(commander))throw Error('Choose a legal legendary commander from the Scryfall catalog.');
 if(!Array.isArray(cards)||cards.length<400)throw Error('Card catalog too small to generate a reliable 100-card deck. Use Update Scryfall Database first.');
 const cmdPrice=priceOf(commander);
 if(cmdPrice===null)throw Error('Commander has no EUR price; cannot verify the total budget.');
 if(cmdPrice>cap)throw Error('Commander alone exceeds the requested budget.');
 const plan=planFor(commander),remaining=new Map(),chosen=[],reasons=new Map();
 let spent=cmdPrice,gcs=commander.game_changer?1:0;
 const pool=cards.filter(c=>legalFor(c,commander)&&priceOf(c)!==null);
 const lands=pool.filter(isLandSlot),nonlands=pool.filter(c=>!isLandSlot(c));
 if(nonlands.length<62)throw Error('Not enough eligible priced spells in the catalog.');
 const analyzed=nonlands.map(c=>{const a=analysis(c),s=synergy(c,plan,a);return {c,a,s,rank:quality(c,plan,profile,s,a)};});
 const analyzedById=new Map(analyzed.map(e=>[oracleId(e.c),e]));
 function allowed(c){return !remaining.has(oracleId(c))&&(!c.game_changer||gcs<profile.maxGameChangers);}
 function append(obj,why){const c=obj.c||obj;if(!allowed(c)||spent+(priceOf(c)||0)>cap+.00001)return false;remaining.set(oracleId(c),c);chosen.push(c);spent+=priceOf(c)||0;gcs+=c.game_changer?1:0;reasons.set(oracleId(c),why);return true;}
 const basicMap=new Map(lands.filter(isBasic).map(c=>[c.name,c]));
 const legalColors=(commander.color_identity||[]).filter(c=>COLORS.includes(c));
 const minBasics=legalColors.length===0?['Wastes']:legalColors.map(c=>({W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest'})[c]);
 for(const name of minBasics)if(!basicMap.has(name))throw Error(`Missing basic land ${name} in imported Scryfall dataset.`);
 const landQuota=profile.lands+(legalColors.length>=4?1:0);
 const landBudget=cap*.21;
 let landSpend=0;
 const nonBasics=lands.filter(c=>!isBasic(c)).map(c=>{
  const m=landManaQuality(c);
  const colors=m.colors.filter(x=>legalColors.includes(x));
  const any=colors.length===legalColors.length&&colors.length>=3;
  let score=colors.length*7+(any?9:0)+(plan.needsColorless&&m.canC?6:0);
  if(legalColors.length>=4&&colors.length===0)score-=11;
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
 for(const c of chosen.filter(isLandSlot))for(const color of colorTotals.keys())if(coloredSources(c).includes(color)||(c.produced_mana||[]).includes(color))colorTotals.set(color,colorTotals.get(color)+1);
 let basicNum=0;
 while(chosen.filter(isLandSlot).length<landQuota){let name;if(!legalColors.length)name='Wastes';else {const color=[...colorTotals].sort((a,b)=>a[1]-b[1])[0][0];name=({W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest'})[color];colorTotals.set(color,colorTotals.get(color)+1);}chosen.push(basicMap.get(name));basicNum++;}
 // Explicit land budget reserve was applied above; basics have nominal zero price.
 const spellQuota=99-landQuota;
 const targets=targetsFor(plan,commander,profile,analyzed);
 const roleCounts=role=>chosen.filter(c=>{const o=analyzedById.get(oracleId(c));return o?.s.roles.includes(role);}).length;
 const picked=new Set(chosen.map(oracleId));
 // Reserve real early acceleration BEFORE filling the Eldrazi and finisher
 // slots. Otherwise a deck can meet its tribal quota while having no way to
 // cast its expensive payoffs in time.
 const earlyManaGoal=Math.min(profile.ramp,Math.max(6,Math.round(profile.ramp*.65)));
 function earlyManaCount(){return chosen.filter(c=>!isLandSlot(c)&&earlyAcceleration(c,analyzedById.get(oracleId(c))?.a||analysis(c))>-Infinity).length;}
 while(earlyManaCount()<earlyManaGoal&&chosen.length-landQuota<spellQuota){
  const available=analyzed.filter(e=>!picked.has(oracleId(e.c))&&allowed(e.c)&&spent+priceOf(e.c)<=cap&&earlyAcceleration(e.c,e.a)>-Infinity);
  if(!available.length)break;
  available.sort((a,b)=>(b.rank+earlyAcceleration(b.c,b.a))-(a.rank+earlyAcceleration(a.c,a.a))||a.c.name.localeCompare(b.c.name));
  const next=available[0];if(!append(next,'Early mana acceleration'))break;
  picked.add(oracleId(next.c));
 }
 const maxCurve=curveCaps(plan,profile,earlyManaCount());
 function curveAllowed(c){
  if(c.cmc<5)return true;
  const spellCards=chosen.filter(x=>!isLandSlot(x));
  if(c.cmc>=7&&spellCards.filter(x=>x.cmc>=7).length>=maxCurve.sevenPlus)return false;
  if(spellCards.filter(x=>x.cmc>=5).length>=maxCurve.fivePlus)return false;
  return true;
 }

 const eligibleEntry=(e,role)=>!picked.has(oracleId(e.c))&&(!role||e.s.roles.includes(role))&&allowed(e.c)&&curveAllowed(e.c)&&(spent+priceOf(e.c)<=cap)&&(!e.c.game_changer||gcs<profile.maxGameChangers);
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
 // Fulfil primary plan first; generic staples must not displace the essential engine.
 for(const q of targets)pick(q.role,q.target,q.label);
 // Big on-plan spells are important: a pile of small tribal creatures is not
 // sufficient to produce a credible high-mana win condition.
 if(plan.needs.some(n=>n.kind==='typed-cast'))pick('finisher',b===2?3:4,'On-plan game-ending threat');
 const generic=[{role:'ramp' ,limit:profile.ramp,label:'Mana development'}, {role:'removal',limit:profile.interaction,label:'Interaction'}, {role:'draw',limit:profile.draw,label:'Card advantage'}, {role:'protection',limit:profile.protection,label:'Protection'}];
 const genericCount=role=>chosen.filter(c=>{const o=analyzedById.get(oracleId(c));return o?.a[role];}).length;
 for(const q of generic){let safety=0;while(genericCount(q.role)<q.limit&&chosen.length-landQuota<spellQuota&&safety++<100){const p=analyzed.filter(x=>eligibleEntry(x,null)&&x.a[q.role]&&(q.role!=='ramp'||x.c.cmc<=3));if(!p.length)break;p.sort((a,b)=>b.rank-a.rank||a.c.name.localeCompare(b.c.name));const o=p[0];if(!append(o,q.label))break;picked.add(oracleId(o.c));}}
 // Fill the remaining slots with on-strategy cards or useful interaction, not foreign packages.
 while(chosen.length-landQuota<spellQuota){
  const opts=analyzed.filter(e=>eligibleEntry(e,null)&&((e.s.impact>0)||(e.a.removal||e.a.draw||e.a.ramp||e.a.protection)));
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
 const genericThresholds={ramp:profile.ramp,removal:profile.interaction,draw:profile.draw,protection:profile.protection};
 for(let iteration=0;iteration<12&&cap-spent>0.10;iteration++){
  const spells=chosen.filter(c=>!isLandSlot(c));
  const roleTotal=Object.fromEntries([...new Set(targets.map(x=>x.role))].map(role=>[role,spells.filter(c=>analyzedById.get(oracleId(c))?.s.roles.includes(role)).length]));
  const genericTotal=Object.fromEntries(genericRoles.map(role=>[role,spells.filter(c=>analyzedById.get(oracleId(c))?.a[role]).length]));
  const currentC=chosen.filter(trueColorlessSource).length;
  const currentEarly=earlyManaCount();
  const fiveCount=spells.filter(c=>c.cmc>=5).length,sevenCount=spells.filter(c=>c.cmc>=7).length;
  let best=null;
  // Cap scanning work in large bulk catalogs without changing which cards
  // the initial generator is allowed to pick. The strongest individually
  // useful alternatives are tested first, and infeasible ones are ignored.
  const candidates=byMerit.slice(0,5000).filter(e=>!picked.has(oracleId(e.c)));
  for(let i=0;i<chosen.length;i++){
   const old=chosen[i];if(isLandSlot(old))continue;
   const oldEntry=analyzedById.get(oracleId(old));if(!oldEntry)continue;
   const oldMerit=intrinsic(oldEntry);
   const oldRoles=oldEntry.s.roles;
   const oldEarly=earlyAcceleration(old,oldEntry.a)>-Infinity;
   const maxUpgradeCost=cap-spent+priceOf(old);
   for(const next of candidates){
    const newMerit=intrinsic(next);
    const delta=newMerit-oldMerit;
    if(delta<=1.5)break; // Candidates are sorted by intrinsic merit.
    if(priceOf(next.c)>maxUpgradeCost+1e-6||!allowed(next.c))continue;
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
    const losesGeneric=genericRoles.some(r=>oldEntry.a[r]&&!next.a[r]&&genericTotal[r]<=genericThresholds[r]);
    if(losesGeneric)continue;
    // Prefer meaningful commander involvement, or a concrete utility job;
    // unrelated filler cannot sneak in merely through EDHREC popularity.
    if(next.s.impact<=0&&!genericRoles.some(r=>next.a[r]))continue;
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
  const totals=Object.fromEntries(legalColors.map(k=>[k,basicsFromChoices.filter(c=>coloredSources(c).includes(k)).length]));
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
 const cards99=[...chosen];
 const valid=cards99.length===99&&cards99.filter(isLandSlot).length===landQuota;
 const actualCounts=targets.map(q=>({...q,actual:cards99.filter(c=>{const o=analyzedById.get(oracleId(c));return o?.s.roles.includes(q.role);}).length}));
 const colorless=cards99.filter(trueColorlessSource).length;
 const selectedSpells=cards99.filter(c=>!isLandSlot(c));
 const demand=Object.fromEntries(legalColors.map(color=>[color,selectedSpells.reduce((n,c)=>n+manaPips(c).filter(x=>x===color).length,0)]));
 const sources=Object.fromEntries(legalColors.map(color=>[color,cards99.filter(c=>coloredSources(c).includes(color)).length]));
 const weakColors=legalColors.filter(color=>demand[color]>0&&sources[color]<Math.min(12,legalColors.length>=4?Math.max(6,Math.min(9,Math.ceil(demand[color]*.7))):Math.max(10,Math.ceil(demand[color]*.8))));
 const missing=actualCounts.filter(x=>x.actual<x.target).map(q=>`${q.label}: ${q.actual}/${q.target}`);
 if(plan.needsColorless>0 && colorless < (legalColors.length>=4?9:8))missing.push(`True colorless-producing cards: ${colorless}`);
 for(const color of weakColors)missing.push(`Weak ${color} access: ${sources[color]} sources for ${demand[color]} colored pips`);
 if(!valid)missing.push(`Deck size or lands incomplete: ${cards99.length}/99 cards; ${cards99.filter(isLandSlot).length}/${landQuota} lands`);
 const exportDeck=[`1 ${commander.name} *CMDR*`,...cards99.sort((a,b)=>Number(isLandSlot(a))-Number(isLandSlot(b))||a.name.localeCompare(b.name)).map(c=>`1 ${displayName(c)}`)].join('\n');
 return {commander:commander.name,plan:plan.label,confidence:plan.confidence,bracket:b,budget:cap,price:r2(spent),totalCards:cards99.length+1,landCount:cards99.filter(isLandSlot).length,colorlessSources:colorless,reinvestment:{spentBefore:r2(beforeReinvest),spentAfter:r2(spent),swaps:reinvestments},earlyAcceleration:earlyManaCount(),highManaValueSpells:cards99.filter(c=>!isLandSlot(c)&&c.cmc>=5).length,sevenPlusSpells:cards99.filter(c=>!isLandSlot(c)&&c.cmc>=7).length,coloredMana:{demand,sources},gameChangers:gcs,qualityVerdict:!valid?'INCOMPLETE':plan.confidence==='low'?'UNCLASSIFIED COMMANDER':missing.length?'NEEDS REVIEW':'STRUCTURALLY COMPLETE — NOT GAMEPLAY CERTIFIED',warnings:[...missing,...(plan.confidence==='low'?['Commander mechanic not yet recognized. This deck cannot be certified.']:[]),'Budget estimates use cached Scryfall EUR prices (not necessarily the cheapest printing); basic lands assumed owned.','Brackets are approximate playstyle profiles, not independently verified official bracket compliance.'],needs:actualCounts,deck:exportDeck,sections:{lands:cards99.filter(isLandSlot).map(displayName),spells:cards99.filter(c=>!isLandSlot(c)).map(displayName)},reasons:cards99.filter(c=>!isLandSlot(c)).slice(0,20).map(c=>({name:c.name,reason:reasons.get(oracleId(c))}))};
}
