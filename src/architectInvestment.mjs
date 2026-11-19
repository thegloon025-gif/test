import {castHasSubtype,castHasType,isBasic,isLandSlot,landFaces,legalFor,oracleId,priceOf} from './cards.mjs';
import {exportCardName,singletonName} from './deckValidation.mjs';
import {dependencyEvidence,oracleText,roleEvidence} from './roleEvidence.mjs';
import {investmentEvidence,manaCapacity} from './packageInvestment.mjs';
import {analysis,planFor,synergy} from './mechanics.mjs';
import {castabilityIssues} from './selectionPolicy.mjs';
import {analyzeDiscoveryCombos,indexDiscoveryCombos} from './discoveryCombos.mjs';
import {sourceStructureEvidence} from './sourceQuality.mjs';
import {landEntryEvidence} from './manaPolish.mjs';

const cents=n=>Math.round(n*100);
const euros=n=>n/100;
const cost=card=>priceOf(card)===null?Infinity:cents(priceOf(card));
const total=cards=>cards.reduce((sum,card)=>sum+cost(card),0);
const basicColors={Plains:'W',Island:'U',Swamp:'B',Mountain:'R',Forest:'G'};
const landTypes=Object.keys(basicColors);
const evaluationsPerRound=24;
const roles=['mana','ramp','tutor','draw','protection','interaction','finish'];
const titles={mana:'mana consistency',ramp:'ramp efficiency',tutor:'tutor access',draw:'card advantage',protection:'protection',interaction:'interaction',finish:'win conditions',combos:'verified combo routes'};
const coverageCaps={ramp:20,tutor:5,draw:12,protection:6,interaction:12,finish:5};

export function architectDeckText(commander,cards){
 return ['1 '+exportCardName(commander)+' *CMDR*',...cards.map(card=>'1 '+exportCardName(card))].join('\n');
}

// Count a fetch as a choice among existing targets, rather than crediting
// every color in its Oracle text as repeatable mana or assuming a shock land.
function fetchTypes(text){
 const clause=text.match(/^\{T\},[^:\n]*Sacrifice [^:\n]+: Search your library for (?:an? )?(basic land|(?:(?:Plains|Island|Swamp|Mountain|Forest)(?:, | or |, or )?)+) card, put (?:it|that card) onto the battlefield( tapped)?, then shuffle\./im);
 return clause?{basic:clause[1]==='basic land',types:landTypes.filter(type=>clause[1].includes(type)),tapped:!!clause[2]}:null;
}

function landProfile(card){
 const faces=landFaces(card),text=faces.map(face=>face.oracle_text||'').join('\n');
 const types=landTypes.filter(type=>faces.some(face=>String(face.type_line||'').split('—')[1]?.trim().split(/\s+/).includes(type)));
 const colors=new Set(types.map(type=>basicColors[type]));
 let units=0,pain=false;
 for(const line of text.split('\n')){
  const ability=line.match(/^\(?\{T\}(, Pay \d+ life)?: Add ([^.]+)\.(?:\))?$/i);
  if(!ability||!/^(?:\{[WUBRGC]\})+(?:,? (?:or )?(?:\{[WUBRGC]\})+)*$|^one mana of any colou?r(?: in your commander's color identity)?$/i.test(ability[2]))continue;
  const outputs=[...ability[2].matchAll(/\{([WUBRG])\}/g)].map(match=>match[1]);
  if(!outputs.length&&/one mana of any color/i.test(ability[2]))outputs.push(...Object.values(basicColors));
  for(const color of outputs)colors.add(color);
  units=Math.max(units,ability[2].match(/^(?:\{[WUBRGC]\})+/)?.[0].length/3||1);
  pain||=!!ability[1];
 }
 const entry=landEntryEvidence(card).kind;
 const canPayToUntap=/as this land enters, you may pay \d+ life\. If you don't, it enters tapped/i.test(text);
 const fast=/unless you control two or fewer other lands/i.test(text);
 const painfulTap=/whenever this land becomes tapped, it deals \d+ damage to you/i.test(text);
 const costlyEntry=entry==='entry-cost-or-unknown'||/\breturn [^.]*land you control|\bsacrifice it unless/i.test(text);
 const upkeepCost=/doesn't untap|does not untap|at the beginning of [^.\n]*\b(?:upkeep|end step)\b[^.\n]*(?:sacrifice|exile a card|pay \{)/i.test(text);
 const gift=/target opponent creates a [^.\n]*token/i.test(text);
 const readiness=upkeepCost?.25:costlyEntry?.22:canPayToUntap?.94:fast?.88:entry==='always-tapped'?.55:
  entry==='conditional-tapped'?.72:gift?.82:pain||painfulTap?.97:1;
 const utility=units>1||card.layout==='modal_dfc'||/^(?:Each|Other) lands? (?:is|are|you control have) /im.test(text)||
  /\{[^}]+\}[^:\n]*:\s*(?:draw|surveil|scry|exile target|destroy target|return target)/i.test(text);
 return {types,colors:[...colors],units,readiness,utility,fetch:fetchTypes(text)};
}

function profile(card){
 const text=oracleText(card), mv=Number(card.cmc)||0, land=isLandSlot(card);
 if(land)return {card,text,land,landInfo:landProfile(card),effects:{},mv};
 const flags=roleEvidence(card), mana=manaCapacity(card);
 const tutor=text.match(/(?:^|[.:]\s+)Search your library(?: and\/or graveyard)? for (?:a|an) (?:(artifact|enchantment|creature|instant|sorcery|Equipment|legendary) )?card(?=,| and put| with mana value (?:X|\d+) or less)([^\n]*)/im);
 const discardOrDelay=/discard a card at random|suspend|skip your next/i.test(text);
 const tutorCost=mv+(/\{X\}/.test(card.mana_cost||'')?3:0)+(/\bSolved —|an opponent gains control/i.test(text)?2:0);
 const tutorSpeed=tutorCost<=1?1.23:tutorCost===2?1.1:tutorCost<=4?.85:.55;
 const destination=tutor&&(/onto the battlefield/i.test(tutor[2])?1.75:/into your hand/i.test(tutor[2])?1.6:/on top/i.test(tutor[2])?1.25:0);
 const tutorWeight=discardOrDelay?0:(destination||0)*tutorSpeed*(tutor?.[1]?1:1.25);
 const landSearch=text.match(/\bSearch your library for (?:an? |up to )((?:(?:two|three) )?(?:basic )?(?:land|Forest|Plains|Mountain|Island|Swamp) cards?)[^.\n]{0,110}(?:onto the battlefield)( tapped)?/im);
 const landAura=text.match(/^Enchant (land|Forest)\n(?:[^\n]+\n)?Whenever enchanted (?:land|Forest) is tapped for mana, (?:its controller adds|add) /im);
 const manaMultiplier=/^Whenever (?:a player taps|you tap) a land for mana,[^.\n]+(?:add|adds)[^.\n]+mana of any type that land produced|^If you tap a (?:permanent|land) for mana, it produces twice as much/im.test(text);
 const restricted=/can't cast more than one spell|can't draw more than|skip your draw step|sacrifice this at the beginning|spend this mana only/i.test(text);
 const broadProtection=!/tiered/i.test(text)&&/(?:^(?:Other |All |Each )?|\b(?:all|each|and|then) )(?:(tapped|attacking|modified|unmodified|nontoken|token|[A-Z][a-z]+) )?(?:[cC]reatures|[pP]ermanents) you control [^.\n]*(?:indestructible|phase out|phases out|hexproof)/m.exec(text);
 const majorShield=!/tiered|kicked|level up/i.test(text)&&/all permanents you control phase out|permanents you control gain (?:hexproof and indestructible|indestructible and hexproof)/i.test(text);
 const answer=flags.removal==='broad'?1.6:flags.removal==='conditional'?.75:0;
 const shield=flags.shield==='dedicated'?1.45:flags.shield==='counterspell'?.65:0;
 const tempo=mv<=1?1.8:mv===2?1.4:mv===3?1:.75;
 const searchActivation=landSearch?text.slice(0,landSearch.index).split('\n').at(-1):'';
 const searchDelay=/\{T\}|\{[1-9]\}/.test(searchActivation)?0.65:1;
 const setupSearch=/^Enchant creature\b|\bremove (?:two|three|four|five|[2-9]) [^.:\n]* counters? from\b|^Whenever [^.\n]* attacks\b/im.test(text);
 const searchRamp=!landSearch?0:setupSearch?.25:
  (/\b(?:two|three)\b/.test(landSearch[1])?2:1)*tempo*searchDelay*(landSearch[2]?1.18:1.55);
 const fixing=/^\{T\}: Add one mana of any color in your commander's color identity\.$/m.test(text)?1:mana.fixing;
 const repeatable=(Math.max(mana.units,fixing)+.25*fixing)*tempo;
 const passiveDraw=/^At the beginning of your (?:upkeep|draw step), (?:you may )?draw (?:a|one|two)(?: additional)? cards?/im.test(text);
 const groupFinish=/creatures you control get \+(?:X|[3-9]|\d{2,})\/\+(?:X|[3-9]|\d{2,}) and gain (?:trample|haste)/i.test(text);
 return {card,text,land,mv,landSearch,landAura,tutorType:tutor?.[1]||null,groupFinish,
  protectionQualifier:broadProtection?.[1],
  effects:{
   mana:0,
   ramp:restricted?0:Math.max(repeatable,mana.burst*tempo*.65,searchRamp,landAura?tempo*1.7:0,manaMultiplier?1.8:0),
   tutor:restricted?0:tutorWeight,
   draw:restricted||/\beach player draws|you and target opponent each draw/i.test(text)?0:
    passiveDraw&&mv<=4?2.25:flags.draw==='positive'?(mv<=3?1.8:1.25):flags.draw==='engine-conditional'?.55:0,
   protection:(majorShield?2.9:shield+(broadProtection?.65:0))*(mv<=2?1.15:mv<=4?1:.65),
   interaction:answer*(mv<=2?1.2:mv<=4?1:.65)+(answer&&/exile target/i.test(text)?.15:0),
   finish:groupFinish?1.6:0
  }};
}

function deckInventory(commander,cards,index){
 if(!index?.size)return {details:[],completeLineIds:[],infiniteLineIds:[],compactInfiniteIds:[]};
 const byOracle=new Map([[oracleId(commander),commander]]), quantities=new Map();
 for(const card of cards){const id=oracleId(card);byOracle.set(id,card);quantities.set(id,(quantities.get(id)||0)+1);}
 const deck={commanderIds:[oracleId(commander)],mainboard:[...quantities].map(([id,quantity])=>({id,quantity}))};
 return analyzeDiscoveryCombos(deck,byOracle,index,sourceStructureEvidence(deck,[...byOracle.values()]));
}
function landEvidence(lands,forCard,colors){
 const sources=Object.fromEntries(colors.map(color=>[color,0]));
 let quality=0;
 const profiles=lands.map(forCard);
 for(const row of profiles){
  const land=row.landInfo;
  if(land.fetch){
   const targets=profiles.filter(target=>target!==row&&target.landInfo.colors.length&&
    (land.fetch.basic?isBasic(target.card):land.fetch.types.some(type=>target.landInfo.types.includes(type))));
   for(const color of colors){
    const matching=targets.filter(target=>target.landInfo.colors.includes(color));
    const best=Math.max(0,...matching.map(target=>target.landInfo.readiness));
    if(best)sources[color]+=Math.min(best,land.fetch.tapped?.50:.91);
   }
   const choices=new Set(targets.flatMap(target=>target.landInfo.colors.filter(color=>color in sources)));
   quality+=targets.length?Math.min(1.1,land.fetch.tapped?.5:.91)+.17*(choices.size-1):0;
   continue;
  }
  const available=land.colors.filter(color=>color in sources);
  for(const color of available)sources[color]+=land.readiness;
  quality+=land.readiness*(available.length?1+.24*(available.length-1):land.units?.65:0);
 }
 const value=quality+Object.values(sources).reduce((n,value)=>n+.64*Math.min(value,13)+.1*Math.max(0,value-13),0);
 return {value,sources};
}
function roleTotals(cards,forCard,commander,evidence,onPlan){
 const lands=cards.filter(isLandSlot),spells=cards.filter(card=>!isLandSlot(card));
 const land=landEvidence(lands,forCard,commander.color_identity||[]);
 const types=Object.fromEntries(landTypes.map(type=>[type,lands.filter(card=>forCard(card).landInfo.types.includes(type)).length]));
 const supportedDraw=new Set(evidence.drawEngines.map(row=>row.card));
 const nativeTutors=new Set(evidence.infrastructure.filter(row=>row.kind==='tutor').map(row=>row.card));
 const creatures=spells.filter(card=>castHasType(card,'Creature')||/create [^.\n]*creature tokens?/i.test(forCard(card).text));
 const sums=Object.fromEntries(roles.map(role=>[role,0]));
 const teamFinish=[];
 for(const card of spells){
  const row=forCard(card);
  const typedSearch=landTypes.find(type=>row.landSearch?.[1].includes(type));
  const hasTargets=!typedSearch||types[typedSearch]>=2;
  const supportedRamp=hasTargets&&(!row.landAura||row.landAura[1]!=='Forest'||types.Forest>=3);
  if(supportedRamp)sums.ramp+=row.effects.ramp;
  const typedTargets=!row.tutorType||spells.some(target=>target!==card&&castHasType(target,row.tutorType[0].toUpperCase()+row.tutorType.slice(1)));
  if(typedTargets)sums.tutor+=row.effects.tutor;
  if(nativeTutors.has(card.name))sums.tutor+=.65;
  sums.draw+=row.effects.draw+(supportedDraw.has(card.name)?1.25:0);
  const qualifier=row.protectionQualifier;
  const tribal=qualifier&&/^[A-Z]/.test(qualifier);
  if(!tribal||castHasSubtype(commander,qualifier)||creatures.filter(card=>castHasSubtype(card,qualifier)).length>=6)
   sums.protection+=row.effects.protection*(qualifier&&!tribal?.45:1);
  sums.interaction+=row.effects.interaction;
  if(creatures.length>=15&&row.groupFinish)teamFinish.push(row);
  if(onPlan(card).roles.includes('finisher'))sums.finish+=.7;
 }
 sums.finish+=teamFinish.filter(row=>!/If X is \d+ or more/i.test(row.text)||sums.ramp>=12)
  .reduce((n,row)=>n+row.effects.finish,0);
 for(const [role,cap] of Object.entries(coverageCaps))sums[role]=Math.min(sums[role],cap)+.35*Math.max(0,sums[role]-cap);
 sums.mana=land.value;
 return {sums,land,types};
}
const stable=(a,b)=>a.card.name.localeCompare(b.card.name);
const sumEffects=row=>Object.values(row.effects).reduce((a,b)=>a+b,0);
const significant=changes=>Object.entries(changes).filter(([,gain])=>gain>.24);
const receipt=(proposal,status,reason,changes)=>({round:proposal.round,
 cuts:proposal.cuts.map(row=>row.card.name),adds:proposal.adds.map(row=>row.card.name),
 changeEUR:euros(proposal.delta),status,reason,...(changes?{changes}:{})});

export function investArchitectBudget({commander,cards,catalog,variants=[],snapshot=null,bracket,ceiling,strategy={},exclusions='',preferences='',verify}){
 let current=cards.slice();
 const initial=total([commander,...cards]), cap=cents(ceiling);
 const report={initialEUR:euros(initial),ceilingEUR:ceiling,finalEUR:euros(initial),remainingEUR:euros(cap-initial),
  utilizationPercent:Math.round(initial*1000/cap)/10,targetPercent:[85,100],
  accepted:[],considered:[],rounds:0,stopReason:'Headroom below the review threshold.'};
 if(cap-initial<Math.min(2500,Math.round(cap*.15)))return {cards:current,report};
 const nearlyExhausted=Math.min(100,Math.round(cap*.005));
 const plan=planFor(commander),cache=new Map();
 const discover=card=>{if(!cache.has(card))cache.set(card,profile(card));return cache.get(card);};
 const aptitude=new Map();
 const onPlan=card=>{if(!aptitude.has(card))aptitude.set(card,synergy(card,plan,analysis(card)));return aptitude.get(card);};
 const deckEvidence=list=>investmentEvidence(list,commander,plan,onPlan);
 const excludedNames=singletonName({name:exclusions});
 const bansCombos=/\bcombos?\b/i.test(exclusions)||/\b(?:no|avoid|without) (?:infinite )?combos?\b/i.test(preferences);
 const bansTurns=/\bextra turns?\b/i.test(exclusions)||/\b(?:no|avoid|without) extra turns?\b/i.test(preferences);
 const bansLandDenial=/\bmass land (?:destruction|denial)\b/i.test(exclusions)||
  /\b(?:no|avoid|without) mass land (?:destruction|denial)\b/i.test(preferences);
 const allowed=card=>!(card.name.length>=4&&excludedNames.includes(singletonName(card)))&&
  !(bansTurns&&/take (?:an|one|two|three) extra turns?/i.test(oracleText(card)))&&
  !(bansLandDenial&&/\b(?:destroy|exile) (?:all|each)[^.\n]*lands?\b/i.test(oracleText(card)));
 const indexes=[indexDiscoveryCombos(variants),snapshot?.index].filter(Boolean);
 const inventory=list=>{
  const rows=indexes.map(index=>deckInventory(commander,list,index));
  return {ids:new Set(rows.flatMap(row=>row.completeLineIds)),details:rows.flatMap(row=>row.details),
   forbidden:new Set(rows.flatMap(row=>bansCombos?row.completeLineIds:bracket===2?row.infiniteLineIds:bracket===3?row.compactInfiniteIds:[]))};
 };
 const originalInventory=inventory(current);
 const originalEvidence=deckEvidence(current);
 const native=new Set(originalEvidence.infrastructure.filter(row=>row.kind!=='tutor').map(row=>row.card));
 const notes=singletonName({name:[strategy?.engines,strategy?.winConversion].filter(x=>typeof x==='string').join('\n')});
 const protectedNames=new Set([...native,...originalInventory.details.flatMap(line=>[
  ...line.pieces.map(piece=>piece.name),...line.templateMatches,...line.supportingCards.flatMap(support=>support.cards)
 ])].map(name=>singletonName({name})));
 const planJobs=['payoff','outlet','finisher'];
 for(const card of cards)if(onPlan(card).roles.some(role=>planJobs.includes(role)))protectedNames.add(singletonName(card));
 for(const card of cards)if(card.name.length>=4&&notes.includes(singletonName(card)))protectedNames.add(singletonName(card));
 const originalLandTypes=roleTotals(current,discover,commander,originalEvidence,onPlan).types;
 const usesTrueColorless=[commander,...cards].some(card=>(card.mana_cost||'').includes('{C}')||oracleText(card).includes('pay {C}'));
 const neededLandTypes=landTypes.filter(type=>[commander,...cards].some(card=>
  new RegExp('Enchant '+type+'\\b|search your library for[^.\\n]*\\b'+type+'\\b','i').test(oracleText(card))));
 const pool=catalog.filter(card=>legalFor(card,commander)&&cost(card)<=cap-cost(commander)&&!card.pricingWarning&&allowed(card)&&
  (card.printing?.eligibleVersion===2||card.pricingMethod==='imported-en-nm-quote'||isBasic(card))).map(discover);
 const nameIndex=new Map(pool.map(row=>[singletonName(row.card),row]));
 const startingNames=new Set([commander,...cards].map(singletonName));
 const uniqueVariants=bansCombos?[]:[...new Map([...(snapshot?.variants||[]),...variants].filter(variant=>{
  if(variant.uses.length<2||variant.uses.length>3||variant.templateRequirements?.length||variant.spoiler||variant.legalities?.commander===false)return false;
  const names=variant.uses.map(use=>singletonName({name:use.name}));
  return names.some(name=>startingNames.has(name))&&names.every(name=>startingNames.has(name)||nameIndex.has(name));
 }).map(variant=>[variant.id,variant])).values()];
 const sourceAffinities=['strategy_tutor','strategy_costReduction','strategy_castCopy','strategy_passiveTriggerCopy','strategy_activatedTriggerCopy',
  'strategy_cascade','topAccessEngines','independentDraw','scalableDraw','shields','answers'];
 const retained=report.accepted;
 let currentPrice=initial;
 for(let round=1;cap-currentPrice>nearlyExhausted;round++){
  report.rounds=round;
  const remaining=cap-currentPrice;
  const currentEvidence=deckEvidence(current);
  const currentRoles=roleTotals(current,discover,commander,currentEvidence,onPlan);
  const currentInventory=inventory(current),currentLands=current.filter(isLandSlot);
  const occupied=new Set([commander,...current].map(singletonName));
  const options=pool.filter(row=>!occupied.has(singletonName(row.card)));
  const cuts=current.map(discover).filter(row=>!protectedNames.has(singletonName(row.card)));
  const landCuts=[...new Set(cuts.filter(row=>row.land&&!row.landInfo.utility))].sort((a,b)=>
   a.landInfo.colors.length*a.landInfo.readiness-b.landInfo.colors.length*b.landInfo.readiness||stable(a,b)).slice(0,10);
  const spellCuts=cuts.filter(row=>!row.land).sort((a,b)=>
   sumEffects(a)+.08*onPlan(a.card).impact-sumEffects(b)-.08*onPlan(b.card).impact||b.mv-a.mv||stable(a,b)).slice(0,12);
  const proposals=Object.fromEntries([...roles,'combos'].map(role=>[role,[]]));
  const addProposal=(role,adds,remove,priority)=>{
   if(adds.length!==remove.length||new Set(remove).size!==remove.length)return;
   const delta=total(adds.map(row=>row.card))-total(remove.map(row=>row.card));
   proposals[role].push({round,adds,cuts:remove,delta,priority});
  };
  const colors=commander.color_identity||[];
  const landOptions=options.filter(row=>row.land&&row.landInfo.readiness>=.7&&
   (row.landInfo.fetch||row.landInfo.colors.some(color=>colors.includes(color))));
  const landPriority=row=>row.landInfo.fetch?2.7:
   (row.landInfo.colors.filter(color=>colors.includes(color)).length+.13*row.landInfo.types.length)*row.landInfo.readiness;
  for(const row of landOptions.sort((a,b)=>landPriority(b)-landPriority(a)||cost(a.card)-cost(b.card)||stable(a,b)).slice(0,100)){
   for(const cut of landCuts){
    const next=current.slice();next[next.indexOf(cut.card)]=row.card;
    const gain=landEvidence(next.filter(isLandSlot),discover,colors).value-currentRoles.land.value;
    if(gain>.35)addProposal('mana',[row],[cut],gain);
   }
  }
  for(const role of roles.filter(role=>role!=='mana')){
   const rank=row=>row.effects[role]+.045*onPlan(row.card).impact;
   const viable=options.filter(row=>!row.land&&row.effects[role]>0)
    .sort((a,b)=>rank(b)-rank(a)||a.mv-b.mv||cost(a.card)-cost(b.card)||stable(a,b));
   const slate=[...viable.filter(row=>cost(row.card)<=remaining).slice(0,10),...viable.filter(row=>cost(row.card)>remaining).slice(0,4)];
   for(const add of slate)for(const cut of spellCuts){
    const gain=add.effects[role]-cut.effects[role];
    if(gain>.24)addProposal(role,[add],[cut],gain+.04*(onPlan(add.card).impact-onPlan(cut.card).impact));
   }
  }
  for(const variant of uniqueVariants){
   const missing=variant.uses.filter(use=>!occupied.has(singletonName({name:use.name})));
   if(!missing.length||missing.length>2||missing.length===variant.uses.length||missing.some(use=>use.mustBeCommander||use.quantity!==1))continue;
   const adds=missing.map(use=>nameIndex.get(singletonName({name:use.name})));
   if(adds.some(row=>!row||row.land)||spellCuts.length<adds.length)continue;
   const payoff=variant.results.some(result=>/win the game|each opponent|all opponents/i.test(result))?2.5:variant.isInfinite?1.4:0;
   if(!payoff)continue;
   for(let i=0;i<3;i++)addProposal('combos',adds,spellCuts.slice(i,i+adds.length),payoff+.1*adds.reduce((n,row)=>n+sumEffects(row),0));
  }
  const sort=(a,b)=>Number(a.delta>remaining)-Number(b.delta>remaining)||b.priority-a.priority||a.delta-b.delta;
  for(const [role,bucket] of Object.entries(proposals)){
   bucket.sort(sort);
   const distinct=new Set(),primary=[],alternate=[];
   for(const p of bucket){
    const key=p.adds.map(row=>oracleId(row.card)).sort().join('|');
    (distinct.has(key)?alternate:primary).push(p);
    distinct.add(key);
   }
   proposals[role]=[...primary.slice(0,2),...alternate.slice(0,2),...primary.slice(2),...alternate.slice(2)];
  }
  const seen=new Set(), scheduled=[];
  const extendedLimit=2*evaluationsPerRound;
  while(scheduled.length<extendedLimit&&Object.values(proposals).some(bucket=>bucket.length)){
   for(const bucket of Object.values(proposals)){
    while(bucket.length){
     const p=bucket.shift();
     const key=JSON.stringify([p.cuts.map(row=>oracleId(row.card)),p.adds.map(row=>oracleId(row.card))]);
     if(seen.has(key))continue;
     seen.add(key);scheduled.push(p);break;
    }
    if(scheduled.length>=extendedLimit)break;
   }
  }

  const viable=[];
  const priorDependencies=new Map(current.map(card=>[card,dependencyEvidence(card,current)]));
  const colorlessFloor=currentEvidence.land.realColorless;
  for(const [i,p] of scheduled.entries()){
   if(i>=evaluationsPerRound&&viable.length)break;
   const reject=reason=>report.considered.push(receipt(p,'rejected',reason));
   if(currentPrice+p.delta>cap){reject('Above the full-deck ceiling.');continue;}
   const next=current.slice();
   for(const [i,cut] of p.cuts.entries())next[next.indexOf(cut.card)]=p.adds[i].card;
   const nextLands=next.filter(isLandSlot);
   if([commander,...next].filter(card=>card.game_changer).length>(bracket===2?0:bracket===3?3:Infinity)){
    reject('Would exceed this bracket’s Game Changer limit.');continue;
   }
   if([commander,...next].some(card=>castabilityIssues(card,nextLands).length&&!castabilityIssues(card,currentLands).length)||
    next.some(card=>dependencyEvidence(card,next).length>(priorDependencies.get(card)?.length||0))){
    reject('Would introduce an unsupported casting cost or strategy dependency.');continue;
   }
   const evidence=deckEvidence(next);
   const after=roleTotals(next,discover,commander,evidence,onPlan);
   if(neededLandTypes.some(type=>after.types[type]<Math.min(originalLandTypes[type],3))||
    Object.entries(after.land.sources).some(([color,n])=>n+.05<Math.min(currentRoles.land.sources[color],7))){
    reject('Would weaken a needed color or land-type channel.');continue;
   }
   const strategicLoss=Object.entries(currentEvidence.raw.strategyRoles).filter(([role,count])=>
    (evidence.raw.strategyRoles[role]||0)<Math.min(count,role==='engine'||role==='fodder'?16:5));
   if(strategicLoss.length){
    reject('Would weaken support for the deck’s '+strategicLoss.map(([role])=>role).join(', ')+'.');continue;
   }
   if(sourceAffinities.some(role=>(evidence.vector[role]||0)<(currentEvidence.vector[role]||0))){
    reject('Would lose a supported strategy engine or card access, protection, or answer capability.');continue;
   }
   if(usesTrueColorless&&(evidence.land.realColorless<colorlessFloor||evidence.raw.trueColorless<currentEvidence.raw.trueColorless)){
    reject('Would reduce true colorless mana access.');continue;
   }
   const combos=inventory(next);
   if([...currentInventory.ids].some(id=>!combos.ids.has(id))){
    reject('Would break a verified combo package.');continue;
   }
   if([...combos.forbidden].some(id=>!currentInventory.ids.has(id))){
    reject('Would introduce a combo excluded by the bracket or your preferences.');continue;
   }
   const changes=Object.fromEntries(roles.map(role=>[role,(after.sums[role]-currentRoles.sums[role])]));
   const newLines=combos.details.filter(line=>!currentInventory.ids.has(line.id));
   const bestLine=newLines.filter(line=>line.directWin||line.delayedWin).sort((a,b)=>b.fit.score-a.fit.score)[0];
   const routeBenefit=bestLine&&(bestLine.commanderInvolved||bestLine.fit.tutors||bestLine.fit.standalones>0)
    ?Math.min(2.2,.6+bestLine.fit.score*.26):0;
   const manaOutlet=[commander,...next].some(card=>/^\{[\dX][^}\n]*\}(?:\{[^}]+\})*:\s*[^.\n]*(?:damage to any target|damage to each opponent|each opponent loses)/im.test(oracleText(card)));
   const manaRoute=newLines.some(line=>line.commanderInvolved&&line.infinite&&line.kinds.includes('mana'));
   changes.combos=Math.max(routeBenefit,manaOutlet&&manaRoute?1.4:0);
   changes.draw+=.75*Math.max(0,evidence.vector.independentDraw-currentEvidence.vector.independentDraw);
   changes.finish+=.5*(evidence.vector.threats-currentEvidence.vector.threats);
   const losses=Object.keys(changes).filter(role=>changes[role]<-.4);
   if(losses.length){
    reject('Would weaken '+losses.map(role=>titles[role]).join(', ')+'.');continue;
   }
   const gain=Object.entries(changes).reduce((n,[role,value])=>n+value*(role==='mana'?.8:1),0);
   if(gain<=.35||!significant(changes).length){reject('No meaningful improvement to a supported deck function.');continue;}
   viable.push({p,next,changes,gain});
  }
  viable.sort((a,b)=>b.gain-a.gain||a.p.delta-b.p.delta);
  let chosen=null;
  for(const candidate of viable){
   if(chosen){report.considered.push(receipt(candidate.p,'rejected','Another affordable candidate had stronger functional evidence.'));continue;}
   const nextPrice=total([commander,...candidate.next]);
   const validation=verify(candidate.next,euros(nextPrice));
   if(!validation.valid){
    report.considered.push(receipt(candidate.p,'rejected',validation.reason||'Final deck validation failed.'));
    continue;
   }
   chosen=candidate;
   current=candidate.next;
   currentPrice=nextPrice;
   const changes=Object.fromEntries(significant(candidate.changes).map(([role,gain])=>[titles[role],Math.round(gain*100)/100]));
   const routes=changes[titles.combos]?' Adds a published Commander Spellbook route.':'';
   const entry=receipt(candidate.p,'accepted','Improves '+Object.keys(changes).join(', ')+' with supported deck functions preserved.'+routes,changes);
   retained.push({...entry,priceEUR:euros(currentPrice),remainingEUR:euros(cap-currentPrice)});
   report.considered.push(entry);
  }
  if(!chosen){report.stopReason='No meaningful upgrade passed the bounded search and validation.';break;}
 }
 report.finalEUR=euros(currentPrice);
 report.remainingEUR=euros(cap-currentPrice);
 if(cap-currentPrice<=nearlyExhausted)report.stopReason='Budget nearly exhausted.';
 report.utilizationPercent=Math.round(currentPrice*1000/cap)/10;
 return {cards:current,report};
}
