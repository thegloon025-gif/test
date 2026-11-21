import {castHasType,faces,oracleId} from './cards.mjs';
import {architectComboReport} from './architectComboReport.mjs';
import {oracleFinishers,specializeLoop} from './winConditionRules.mjs';

const unique=items=>[...new Set(items.filter(Boolean))];
const lines=items=>(items||[]).flatMap(item=>item.split(/\r?\n/)).map(s=>s.trim()).filter(Boolean);
const zones={B:'Battlefield',H:'Hand',G:'Graveyard',C:'Command zone',E:'Exile',L:'Library'};
const winning=route=>['DIRECT WIN','CONDITIONAL FINISHER'].includes(route.classification);
const order=['DIRECT WIN','CONDITIONAL FINISHER','NEEDS PAYOFF','VALUE ENGINE','INCOMPLETE'];

function setupFor(use){
 const location=(use.zoneLocations||[]).map(z=>zones[z]||z).join(' or ')||'Starting zone unspecified';
 const state=['battlefieldCardState','graveyardCardState','exileCardState','libraryCardState'].map(key=>use[key]).filter(Boolean);
 return [use.name+(use.quantity>1?' ×'+use.quantity:''),location,...state].join(' · ');
}

function published(variant,missing=[]){
 const steps=lines(variant.steps),prerequisites=lines(variant.prerequisites),results=variant.results||[];
 const uses=variant.uses||[],templates=variant.templateRequirements||[];
 const cards=unique([...(variant.pieces||uses).map(u=>u.name),...(variant.templateMatches||[])]);
 const simpleSetup=uses.every(u=>u.zoneLocations?.length&&!u.battlefieldCardState&&!u.graveyardCardState&&!u.libraryCardState&&!u.exileCardState)&&
  !templates.length&&prerequisites.every(p=>p===variant.manaNeeded)&&(!variant.manaNeeded||/^(?:\{(?:[WUBRGC]|\d+)\})+$/.test(variant.manaNeeded));
 let classification='VALUE ENGINE';
 if(missing.length||!steps.length||!results.length)classification='INCOMPLETE';
 else if(variant.directWin)classification=simpleSetup?'DIRECT WIN':'CONDITIONAL FINISHER';
 else if(variant.delayedWin||results.some(r=>/^near-infinite (?:damage to (?:all players|opponents)|mill)\b/i.test(r)))classification='CONDITIONAL FINISHER';
 else if(variant.infinite&&variant.kinds.some(k=>['mana','tokens','mill','enter-the-battlefield triggers','leave-the-battlefield or death triggers','sacrifice'].includes(k))||
  results.some(r=>/^infinite (?:storm count|magecraft triggers|card draw)\b/i.test(r)))classification='NEEDS PAYOFF';
 const reasons=[...missing];
 if(!steps.length)reasons.push('Execution instructions unavailable.');
 if(!results.length)reasons.push('Published outcome unavailable.');
 return {name:cards.join(' + '),cards,classification,simpleSetup,setup:[...uses,...templates].map(setupFor),
  family:variant.comboIds?.length?'spellbook:'+variant.comboIds.slice().sort().join(',')+':'+results.slice().sort().join('|'):null,
  steps,prerequisites:[...prerequisites,...(variant.supportingCards||[]).map(s=>s.zone+' support · '+s.cards.join(' or ')),...reasons],
  mana:variant.manaNeeded||'No separate starting payment listed. Pay the deployment and activation costs in the instructions.',
  outcome:results.join(' · '),source:'Commander Spellbook',url:variant.url,variantId:variant.id,
  verification:reasons.length?'Inventory or prerequisite incomplete.':'Published instructions checked against deck inventory. Board state requires confirmation.',
  templateSlots:templates.map(t=>t.name+(t.quantity>1?' ×'+t.quantity:'')),missing:reasons};
}

function groupRoutes(routes){
 const groups=[],byPieces=new Map(),byFamily=new Map();
 for(const route of routes){
  const key=JSON.stringify([route.classification,route.cards.slice().sort(),route.templateSlots||[],route.classification==='DIRECT WIN'?'lethal':route.outcome]);
  const family=route.family&&route.classification+'|'+route.family;
  const group=byPieces.get(key)||(family&&byFamily.get(family));
  if(group){
   group.variants.push(route);
   byPieces.set(key,group);
  }else{
   const entry={name:route.name,classification:route.classification,variants:[route]};
   groups.push(entry);byPieces.set(key,entry);
   if(family)byFamily.set(family,entry);
  }
 }
 return groups.sort((a,b)=>order.indexOf(a.classification)-order.indexOf(b.classification)||a.name.localeCompare(b.name));
}

// A type-limited search with further qualifiers ("with mana value …",
// "named …") needs separate evidence before it can point at a piece.
function tutorGuidance(deck){
 const tutors=[];
 for(const card of new Set([deck.commander,...deck.cards])){
  for(const face of faces(card)){
   for(const match of (face.oracle_text||'').matchAll(/search your library for (?:an? |one )(?:(artifact|creature|enchantment|instant|sorcery|planeswalker|land) )?card(?=,| and (?:put|reveal)|\.)/gi))
    tutors.push({name:card.name,type:match[1]?.toLowerCase()});
  }
 }
 return tutors;
}

export function analyzeWinConditions(deck,{variants=[],snapshot=null,report=architectComboReport(deck,variants,snapshot)}={}){
 const catalog=new Map([deck.commander,...deck.cards].flatMap(c=>[c.name,...faces(c).map(f=>f.name)].map(name=>[name,c])));
 const tutors=tutorGuidance(deck);
 const routes=report.matched.flatMap(line=>{
  const route=published(line);
  return route.classification==='INCOMPLETE'?[route]:specializeLoop(line,route,deck);
 });
 routes.push(...oracleFinishers(deck),...report.partial.map(({variant,reasons})=>published(variant,reasons)));
 for(const route of routes){
  route.cards=unique(route.cards.map(name=>catalog.get(name)?.name||name));
  route.commander=route.cards.includes(deck.commander.name);
  route.pieceCount=route.cards.length;
  route.oracle=route.cards.flatMap(name=>{
   const card=catalog.get(name);
   return card?faces(card).map(f=>({name:f.name,cost:f.mana_cost??card.mana_cost??'',text:f.oracle_text||''})):[];
  });
  route.tempo=route.classification==='DIRECT WIN'?'Immediate once the listed setup is met':
   route.classification==='CONDITIONAL FINISHER'?'Conditional on the stated resources or timing':'No executable win established';
  if(route.oracle.some(f=>/\{T\}:/.test(f.text)&&/Creature/.test(catalog.get(f.name)?.type_line))&&route.steps.some(s=>/tapping|tap (?!lands)/i.test(s)))
   route.prerequisites.push('A creature using its own tap ability must be untapped and have haste or have been under your control since the beginning of your turn.');
  if(route.commander)route.prerequisites.push('When casting the commander from the command zone, add {2} per previous cast from that zone. Recasts from hand use the ordinary cost.');
  const held=route.setup.filter(s=>s.includes(' · Hand')).map(s=>s.split(' · ')[0]);
  const early=route.setup.filter(s=>s.includes(' · Battlefield')).map(s=>s.split(' · ')[0]);
  const targets=route.cards.filter(c=>c!==deck.commander.name&&catalog.has(c));
  const searches=tutors.flatMap(t=>{
   const available=targets.filter(n=>n!==t.name&&(!t.type||castHasType(catalog.get(n),t.type[0].toUpperCase()+t.type.slice(1))));
   return available.length?[t.name+' can search for '+available.join(' or ')+'. Check its cost, timing and destination.']:[];
  });
  route.guidance=[
   ...(route.sequencing||(early.length?['Develop '+early.join(', ')+' as mana allows. Consider holding exposed pieces until protection is available.']:[])),
   ...(early.length&&winning(route)?['Protect '+early.join(', ')+' through the critical trigger or activation.']:[]),
   ...(held.length?['Keep '+held.join(', ')+' available in hand for the execution window.']:[]),
   ...(searches.length?unique(searches):targets.length?['If you have a compatible search effect, prioritize the missing piece among '+targets.join(', ')+'.']:[])
  ];
 }
 const groups=groupRoutes(routes),wins=groups.filter(winning);
 const essential=g=>g.variants[0].cards.filter(c=>g.variants.every(v=>v.cards.includes(c)));
 const independent=[],occupied=new Set(),usage=new Map();
 for(const group of wins)for(const name of essential(group))usage.set(name,(usage.get(name)||0)+1);
 for(const group of wins){
  const choice=group.variants.find(v=>v.cards.every(c=>!occupied.has(c))&&!v.templateSlots?.length&&
   !v.prerequisites.some(p=>/^(?:Hand|Battlefield) support ·/.test(p)));
  if(choice){independent.push(choice.name);choice.cards.forEach(c=>occupied.add(c));}
  group.shared=essential(group).filter(c=>usage.get(c)>1);
 }
 const findings=[];
 const needs=groups.filter(g=>g.classification==='NEEDS PAYOFF'&&!wins.some(w=>w.variants.some(v=>
  g.variants.some(engine=>engine.cards.every(name=>v.cards.includes(name))))));
 if(needs.length)findings.push('Missing conversion for '+needs[0].name+'. Look for an on-plan outlet that spends its mana colors or triggers on its repeated event.');
 const partial=groups.find(g=>g.classification==='INCOMPLETE');
 if(partial)findings.push('Incomplete package · '+partial.name+'. '+partial.variants[0].missing.join(' ')+' Review whether completing it fits the deck’s plan.');
 if(!wins.length)findings.push('No credible finish identified in the available evidence. Pair the main engine with a compatible payoff or support a combat plan.');
 if(wins.length){
  const vulnerable=essential(wins[0]).filter(c=>wins.every(w=>essential(w).includes(c)));
  if(vulnerable.length)findings.push('Every identified finish relies on '+vulnerable.join(', ')+'. Prioritize protection, recursion or a second route using different pieces.');
 }
 const demanding=wins.flatMap(g=>g.variants).find(r=>r.pieceCount>=5||/\{[7-9]\}|\{\d\d\}|six expendable|needs confirmation/i.test([r.mana,...r.prerequisites].join(' ')));
 if(demanding)findings.push('Review demanding setup for '+demanding.name+' · '+(demanding.prerequisites.find(p=>/six expendable|needs confirmation/i.test(p))||demanding.mana));
 return {cardCount:deck.cards.length+1,coverage:report.coverage,groups,independent,findings,omittedPartial:report.omittedPartial};
}

// A replacement can keep a published family or another verified outlet for
// the same loop. A conditional route cannot replace a formerly direct finish.
export function lostWinPath(original,candidate){
 const next=candidate.groups.filter(winning).flatMap(g=>g.variants);
 return original.groups.find(g=>winning(g)&&!g.variants.some(before=>next.some(after=>{
  if(before.classification==='DIRECT WIN'&&after.classification!=='DIRECT WIN')return false;
  return before.name===after.name||Boolean(before.family&&before.family===after.family);
 })));
}

// Passive end-of-trial observation. Alternate variants form a union of
// successful trials; percentages are never added or treated as wins.
export function assemblyQueries(analysis,deck){
 const byName=new Map([deck.commander,...deck.cards].map(c=>[c.name,oracleId(c)]));
 return analysis.groups.filter(g=>g.classification!=='INCOMPLETE').map(g=>({group:g,choices:g.variants.flatMap(v=>{
  if(v.templateSlots?.length||v.setup.some(s=>s.includes(' ×'))||v.prerequisites.some(p=>/^(?:Hand|Battlefield) support ·/.test(p)))return [];
  const ids=v.cards.filter(n=>n!==deck.commander.name).map(n=>byName.get(n));
  return ids.every(Boolean)?[ids]:[];
 })})).filter(q=>q.choices.length===q.group.variants.length);
}
