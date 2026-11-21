import {castHasType,faces,isLandSlot,oracleId} from './cards.mjs';
import {normalizedName} from './combos.mjs';
import {handCardPrerequisite,satisfyTemplates} from './comboTemplates.mjs';
import {manaRole} from './deckQuality.mjs';
import {oracleText,roleEvidence} from './roleEvidence.mjs';

const round=n=>Math.round(n*100)/100;
const byId=id=>'id:'+id.toLowerCase();
const byName=name=>'name:'+normalizedName(name);
const useKey=use=>typeof use.oracleId==='string'&&use.oracleId?byId(use.oracleId):byName(use.name);

/** Every line is indexed by its rarest named piece. A complete deck must
 * contain that piece, so a search examines only one bucket per deck identity. */
export function indexDiscoveryCombos(variants){
 const pool=[...new Map(variants.map(v=>[v.id,v])).values()];
 const frequency=new Map(),buckets=new Map();
 for(const variant of pool){
  for(const use of variant.uses){
   const key=useKey(use);
   frequency.set(key,(frequency.get(key)||0)+1);
  }
 }
 for(const variant of pool){
  const anchor=variant.uses.reduce((best,use)=>{
   const key=useKey(use);
   return best===null||frequency.get(key)<frequency.get(best)?key:best;
  },null);
  if(anchor===null)continue;
  if(!buckets.has(anchor))buckets.set(anchor,[]);
  buckets.get(anchor).push(variant);
 }
 return buckets;
}

const categories=[
 [/\bmana\b/i,'mana'],
 [/\bdamage\b|life ?loss|los(?:e|es) life/i,'damage or life loss'],
 [/\btokens?\b/i,'tokens'],
 [/\bETB\b|enters? (?:the )?battlefield/i,'enter-the-battlefield triggers'],
 [/\bLTB\b|leaves? (?:the )?battlefield|\bdeath triggers?\b/i,'leave-the-battlefield or death triggers'],
 [/\bsacrific/i,'sacrifice'],
 [/\bmill/i,'mill'],
 [/\bdraw/i,'draw']
];
function classifyOutcome(results,steps){
 const directWin=results.some(result=>
  /^(?:you )?win the game[.!]?$/i.test(result)||
  /^(?:each|all) opponents? lose(?:s)? the game[.!]?$/i.test(result)||
  /^(?:infinite|unbounded) (?:damage|life ?loss) (?:to|for) (?:each opponent|all opponents|any target)[.!]?$/i.test(result)||
  // Spellbook's generic damage result can also mean damage to creatures.
  /^infinite (?:damage|life ?loss)[.!]?$/i.test(result)&&steps.some(step=>
   /\bdeal(?:s|t|ing)? [^.\n]+ damage to (?:each opponent|all opponents|any target)\b|\b(?:each opponent|all opponents) (?:to )?los(?:e|es|ing) [^.\n]*life\b/i.test(step)));
 const delayedWin=!directWin&&results.some(result=>/^win the game (?:at|on|during|after)\b/i.test(result));
 const kinds=categories.filter(([pattern])=>results.some(result=>pattern.test(result))).map(([,kind])=>kind);
 if(directWin)kinds.unshift('direct win');
 if(delayedWin)kinds.unshift('delayed win');
 if(!kinds.length)kinds.push('other documented outcome');
 const infinite=results.some(text=>/(?:^|\s)(?:infinite|unbounded|arbitrarily many)\b/i.test(text));
 const payoff=directWin||delayedWin?null:
  kinds.includes('mana')?'A payoff that can spend the generated mana.':
  kinds.includes('mill')?'A forced draw or another payoff to turn the mill into a win.':
  kinds.includes('tokens')?'A token payoff or a later combat step.':
  kinds.includes('draw')?'A payoff for the cards drawn.':
  'Review the documented outcome and how it can close the game.';
 return {directWin,delayedWin,infinite,kinds,payoff};
}

const tutorType=/search your library for (?:up to )?(?:a|an|one|two|three|[1-9]) (?:(artifact|creature|enchantment|instant|sorcery|planeswalker|battle|land) )?cards?\b/ig;
function battlefieldManaPrerequisite(line){
 const required=line.match(/^you control (?:a|another) creature that can tap to produce (?:at least )?(\{[WUBRGC]\})(?=[,.;]|$)/i)?.[1]?.toUpperCase();
 if(!required)return null;
 return card=>castHasType(card,'Creature')&&oracleText(card).split('\n').some(ability=>{
  const produced=ability.match(/^\s*\{T\}:\s*Add\b ([^.\n]+)/i)?.[1];
  return produced&&(produced.includes(required)||required!=='{C}'&&/\bmana of any (?:one )?colou?r\b/i.test(produced));
 });
}
function comboSupport(cards,structure){
 const tutors=cards.flatMap(card=>{
  const types=[...oracleText(card).matchAll(tutorType)].map(match=>match[1]?.toLowerCase()||'any');
  return types.length?[{id:oracleId(card),types}]:[];
 });
 return {tutors,draw:structure.positiveDraw+0.4*structure.conditionalDraw,
  ramp:structure.earlyRamp,protection:structure.dedicatedShields};
}

function fitScore(line,pieces,support){
 const deckPieces=pieces.filter(piece=>!piece.inCommandZone);
 const standalones=deckPieces.filter(({card})=>{
  const role=roleEvidence(card);
  return isLandSlot(card)||manaRole(card).effective||role.draw==='positive'||role.removal==='broad'||role.shield==='dedicated';
 }).length;
 const compatibleTutors=support.tutors.filter(tutor=>
  !pieces.some(piece=>piece.id===tutor.id)&&deckPieces.some(({card})=>tutor.types.some(type=>
   type==='any'||(type==='land'?isLandSlot(card):castHasType(card,type[0].toUpperCase()+type.slice(1)))))).length;
 const startingMana=Number(line.manaValueNeeded)||[...line.manaNeeded.matchAll(/\{([^}]+)\}/g)]
  .reduce((sum,[,symbol])=>sum+(/^\d+$/.test(symbol)?Number(symbol):1),0);
 const deploymentMana=pieces.reduce((sum,piece)=>sum+piece.quantity*(Number(piece.card.cmc)||0),0);
 const setupLines=line.prerequisites.flatMap(text=>text.split(/\n/)).filter(text=>text.trim()&&text.trim()!==line.manaNeeded);
 const compactness=[2,5,3.6,1.5][line.requiredCards-1]??0.7;
 const finish=line.directWin?4:line.delayedWin?2.5:line.infinite?1.4:0.4;
 const assembly=0.8*Number(line.commanderInvolved)+0.20*Math.min(4,compatibleTutors)+
  0.08*Math.min(8,support.draw)+0.07*Math.min(10,support.ramp)+0.09*Math.min(4,support.protection)+0.18*Math.min(3,standalones);
 const burden=0.32*Math.max(0,deploymentMana-4)+0.4*startingMana+
  0.27*Math.min(8,setupLines.length)+0.6*(line.requiredCards-line.namedPieces+line.supportingCards.length);
 const score=Math.max(0.1,compactness+finish+assembly-burden);
 return {score:round(score),startingMana,deploymentMana,tutors:compatibleTutors,standalones};
}

const finishRank=line=>line.directWin?2:Number(line.delayedWin);
const rankWeights=[1,0.65,0.45,0.3];
const maxComboPoints=20;
const sharedCount=(a,b)=>[...a].filter(id=>b.has(id)).length;
function routeOverlap(route,credited){
 let sharedPieces=false;
 for(const earlier of credited){
  const shared=sharedCount(route.deckPieces,earlier.deckPieces);
  const sameOutcome=finishRank(route)===finishRank(earlier)&&route.kinds.some(kind=>
   !['direct win','delayed win','other documented outcome'].includes(kind)&&earlier.kinds.includes(kind));
  const publishedFamily=route.comboIds.some(id=>earlier.comboIds.includes(id));
  if((sameOutcome&&route.commanderInvolved&&earlier.commanderInvolved&&!shared)||
     (sameOutcome&&shared&&2*shared>=Math.min(route.deckPieces.size,earlier.deckPieces.size))||
     (finishRank(route)===finishRank(earlier)&&publishedFamily))return {factor:0.35,label:'Redundant route'};
  sharedPieces||=shared>0;
 }
 return sharedPieces?{factor:0.6,label:'Shares pieces'}:{factor:1,label:'Independent pieces'};
}

function scoreRoutes(routes){
 routes.sort((a,b)=>b.fit.score-a.fit.score||a.requiredCards-b.requiredCards||a.id.localeCompare(b.id));
 const credited=new Set();
 let points=0,independent=0;
 for(const weight of rankWeights){
  let best=null;
  for(const route of routes){
   if(credited.has(route))continue;
   const overlap=routeOverlap(route,credited);
   const potential=route.fit.score*overlap.factor;
   if(!best||potential>best.potential)best={route,overlap,potential};
  }
  if(!best||points>=maxComboPoints)break;
  const bonus=round(Math.min(maxComboPoints-points,best.potential*weight));
  best.route.contribution=bonus;
  best.route.relationship=best.overlap.label;
  credited.add(best.route);
  points+=bonus;
  if(best.overlap.factor===1)independent++;
 }
 for(const route of routes){
  if(credited.has(route))continue;
  route.contribution=0;
  route.relationship=routeOverlap(route,credited).label;
 }
 routes.sort((a,b)=>b.contribution-a.contribution);
 return {points:round(points),maxPoints:maxComboPoints,independent};
}

/** Inspect actual quantities and assigned commanders, reserve named pieces,
 * then resolve distinct wildcard slots. Free-text game state remains a
 * prerequisite for play, separate from the deck inventory. */
export function analyzeDiscoveryCombos(deck,byOracle,index,structure){
 const entries=[...deck.commanderIds.map(id=>({id,quantity:1,inCommandZone:true})),...deck.mainboard];
 const lookup=new Map(),selected=[];
 for(const entry of entries){
  const card=byOracle.get(entry.id);
  if(!card)continue;
  const item={...entry,card};
  selected.push(item);
  lookup.set(byId(entry.id),item);
  for(const name of [card.name,...card.name.split(' // '),...faces(card).map(face=>face.name)].filter(Boolean)){
   const key=byName(name);
   if(!lookup.has(key))lookup.set(key,item);
   else if(lookup.get(key)?.id!==entry.id)lookup.set(key,null);
  }
 }
 const commander=selected.find(item=>item.inCommandZone)?.card;
 const support=comboSupport(selected.map(item=>item.card),structure);
 const routes=new Map();
 let unresolvedTemplates=0,unresolvedPrerequisites=0;
 for(const key of lookup.keys()){
  for(const variant of index.get(key)||[]){
   const identity=Array.isArray(variant.identity)?variant.identity:String(variant.identity||'').match(/[WUBRG]/g)||[];
   if(!identity.every(color=>commander?.color_identity?.includes(color)))continue;
   const named=new Map(),pieces=[];
   let complete=true;
   for(const use of variant.uses){
    const item=lookup.get(useKey(use));
    const needed=(named.get(item?.id)||0)+use.quantity;
    const mustBeCommander=use.mustBeCommander||use.zoneLocations.length===1&&use.zoneLocations[0]==='C';
    if(!item||needed>item.quantity||mustBeCommander&&!item.inCommandZone){
     complete=false;
     break;
    }
    named.set(item.id,needed);
    pieces.push({...use,id:item.id,card:item.card,inCommandZone:!!item.inCommandZone});
   }
   if(!complete)continue;
   const templates=variant.templateRequirements;
   const supportConditions=variant.prerequisites.flatMap(text=>text.split(/\r?\n/)).flatMap(text=>{
    const hand=handCardPrerequisite(text.trim()),battlefield=battlefieldManaPrerequisite(text.trim());
    if(hand)return [{zone:'Hand',matches:hand}];
    return battlefield?[{zone:'Battlefield',matches:battlefield}]:[];
   });
   const available=templates.length||supportConditions.length?
    selected.flatMap(item=>Array(item.quantity-(named.get(item.id)||0)).fill(item.card)):[];
   const supportingCards=supportConditions.map(({zone,matches})=>({
    zone,cards:[...new Set(available.filter(matches).map(card=>card.name))].slice(0,12)
   }));
   // For example, another permanent might grant the needed tap ability. Leave
   // such a line out of confirmed deck inventory when that state is unmodeled.
   if(supportingCards.some(support=>support.zone==='Battlefield'&&!support.cards.length)){
    unresolvedPrerequisites++;
    continue;
   }
   if(supportingCards.some(support=>!support.cards.length))continue;
   const eligibleFor=(card,template)=>template.zoneLocations?.length!==1||template.zoneLocations[0]!=='C'||card===commander;
   const matched=templates.length?satisfyTemplates(templates,available,{allowCopies:true,eligibleFor}):{satisfied:true,matched:[]};
   if(!matched.satisfied){
    if(matched.unresolved.length)unresolvedTemplates++;
    continue;
   }
   const namedPieces=pieces.reduce((count,piece)=>count+piece.quantity,0);
   const requiredCards=namedPieces+templates.reduce((count,template)=>count+template.quantity,0);
   const outcome=classifyOutcome(variant.results,variant.steps);
   const line={...variant,...outcome,namedPieces,requiredCards,templateMatches:matched.matched,
    supportingCards,
    commanderInvolved:pieces.some(piece=>piece.inCommandZone||matched.matched.includes(commander?.name)),
    pieces:pieces.map(({card,...piece})=>({...piece,castCost:faces(card)[0].mana_cost||card.mana_cost||null})),
    deckPieces:new Set(pieces.filter(piece=>!piece.inCommandZone).map(piece=>piece.id))};
   line.fit=fitScore(line,pieces,support);
   const requirements=[...named].sort();
   const wildcard=templates.map(t=>[normalizedName(t.name),t.scryfallQuery,t.quantity]).sort();
   const group=JSON.stringify([requirements,wildcard]);
   const existing=routes.get(group);
   if(!existing||finishRank(line)>finishRank(existing)||
     finishRank(line)===finishRank(existing)&&line.fit.score>existing.fit.score){
    routes.set(group,{...line,variantCount:(existing?.variantCount??0)+1});
   }else{
    existing.variantCount++;
   }
  }
 }
 const all=[...routes.values()];
 const scoring=scoreRoutes(all);
 return {counts:{total:all.length,twoCard:all.filter(line=>line.requiredCards===2).length,
  threeCard:all.filter(line=>line.requiredCards===3).length,directWins:all.filter(line=>line.directWin).length,
  delayedWins:all.filter(line=>line.delayedWin).length,engines:all.filter(line=>!line.directWin&&!line.delayedWin).length},
  scoring,support:{...support,tutors:support.tutors.length},unresolvedTemplates,unresolvedPrerequisites,
  compactInfinite:all.some(line=>line.infinite&&line.requiredCards<=2),completeLineIds:all.map(line=>line.id),
  infiniteLineIds:all.filter(line=>line.infinite).map(line=>line.id),
  compactInfiniteIds:all.filter(line=>line.infinite&&line.requiredCards<=2).map(line=>line.id),
  details:all.slice(0,30).map(({deckPieces,comboIds,...line})=>line)};
}
