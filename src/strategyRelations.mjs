/** Conservative Oracle relationships. These are inventory/support observations,
 * not simulated payments, rates, strategy labels, or a deck-strength score.
 * No prices, community frequencies, commander names or reference decks enter. */
import {castHasType,castHasSubtype,isLandSlot,oracleId} from './cards.mjs';
import {oracleText} from './roleEvidence.mjs';
import {planFor} from './mechanics.mjs';
import {engineContext,engineManaValue,matchesCastNeed,supportedCardAccess,strategyInfrastructure} from './engineSupport.mjs';
const unique=xs=>[...new Map(xs.map(c=>[oracleId(c),c])).values()];
const sorted=xs=>xs.slice().sort((a,b)=>a.name.localeCompare(b.name));

/** Narrow uncertainty guard for native death strategies. These printed
 * life+sacrifice→Treasure costs are not modeled by the simple outlet grammar.
 * Losing them cannot be certified by surplus generic mana/draw evidence. */
export function uncertainNativeResources(cards,commander,plan=planFor(commander)){
 if(!(plan.needs||[]).some(n=>['death-tribal','recursion'].includes(n.kind)))return [];
 const context=engineContext(cards,plan);if(!context.creatures.length)return [];
 return cards.flatMap(card=>oracleText(card).split('\n').flatMap(line=>{
  const at=line.indexOf(':');if(at<0)return [];
  const cost=line.slice(0,at),effect=line.slice(at+1).trim();
  return /\bPay \d+ life\b/i.test(cost)&&/\bSacrifice (?:another |a )creature\b/i.test(cost)&&/^Create a Treasure token\./i.test(effect)
   ?[{card:card.name,id:oracleId(card),cost,effect,status:'unknown execution; native compound resource conversion'}]:[];
 }));
}
export function guardNativeRefinement(built,proposal,commander,plan=planFor(commander)){
 const remaining=new Set(proposal.cards.map(oracleId)),lost=uncertainNativeResources(built.cards,commander,plan).filter(r=>!remaining.has(r.id));
 return {deck:lost.length?built:proposal,lost};
}

export function strategyRelations(cards,commander,{plan=planFor(commander)}={}){
 const all=unique([commander,...cards]),spells=all.filter(c=>!isLandSlot(c));
 const context={...engineContext(all,plan),commander};
 const creatures=spells.filter(c=>castHasType(c,'Creature')),relationships=[],unknowns=(plan.unsupportedCast||[]).map(clause=>({card:commander.name,reason:'Unparsed cast qualifier; no generic cast support granted: '+clause}));
 const add=(card,kind,support,prerequisites,outcome,extra={})=>relationships.push({card:card.name,kind,
  support:sorted(unique(support)).map(c=>c.name),prerequisites,outcome,evidence:'local Oracle grammar; inventory support only',...extra});
 const outlets=[];
 for(const c of spells)for(const line of oracleText(c).split('\n')){
  // Exact simple activation cost; no creature tap/mana/sacrifice assumed paid.
  const m=line.match(/^((?:\{[0-9WUBRGC]+\}(?:,?\s*)?)*)(?:Sacrifice (?:(another )|(?:a|an) )(creature|[A-Z][a-z]+)):\s*(.+)$/);
  if(!m)continue;
  const matches=creatures.filter(x=>(x!==c||!m[2])&&(m[3]==='creature'||castHasSubtype(x,m[3])));
  outlets.push({card:c,type:m[3],another:!!m[2],matches,cost:m[1],effect:m[4]});
  add(c,'sacrifice-outlet',matches,[m[1]||'No printed mana payment','Sacrifice one eligible creature; cannot reuse it for mana or another cost',...(m[2]?['Requires another creature']:[])],m[4]);
 }
 for(const c of spells){
  const text=oracleText(c),access=supportedCardAccess(c,context);
  if(oracleId(c)===oracleId(commander))for(const line of text.split('\n')){
   const m=line.match(/^Whenever you cast (?:a|an|another) [A-Za-z]+(?:, [A-Za-z]+)*(?:,? or [A-Za-z]+)? spell(?: with mana value \d+ or (?:greater|more))?, (.+)$/i);
   if(!m||!/deals? \d+ damage to each opponent|each opponent loses \d+ life/i.test(m[1]))continue;
   const needs=(plan.needs||[]).filter(n=>n.kind==='typed-cast'),support=spells.filter(x=>x!==c&&needs.some(n=>matchesCastNeed(x,n)));
   const conditional=/\bif\b|unless|\bpay\b|first|only once/i.test(m[1]);
   add(c,'cast:life-pressure',support,['Commander must be deployed','Actually cast a qualifying spell; copies are not casts','Pay spell costs and resolve trigger; repeatability, life totals and lethal conversion unverified'],m[1],{conditional,qualified:support.length>0&&!conditional});
  }
  for(const trigger of access.triggers)if(trigger.support>=1)add(c,'card-access:'+trigger.kind,all.filter(x=>trigger.cards.includes(x.name)),['Deploy engine, then resolve qualifying '+trigger.kind+' event','Pay actual spell/activation costs; support count is not realized draw'], 'Conditional card access',{qualified:trigger.supported});
  if(access.topSupport)add(c,'top-library-access',all.filter(x=>access.topCards.includes(x.name)),['Deploy engine','Eligible card must actually be on top; pay its real costs'],'Access, not a free draw',{qualified:access.topAccess});
  for(const entry of strategyInfrastructure(c,context))add(c,'native:'+entry.kind,all.filter(x=>entry.cards.includes(x.name)),['Deploy source and satisfy its printed trigger/payment/zone restrictions'],'Supported '+entry.kind+' infrastructure; no resolved value claimed');
  for(const line of text.split('\n')){
   // Anchored printed death triggers; reject complex guards we cannot verify.
   const m=line.match(/^Whenever (?:this (?:creature|permanent) or )?(another )?(nontoken )?(creature|[A-Z][a-z]+) you control dies, (.+)$/);
   if(!m)continue;
   const body=m[4],conditional=/\bif\b|unless|pay|only once|first time|each turn/i.test(body);
   const material=creatures.filter(x=>x!==c&&(m[3]==='creature'||castHasSubtype(x,m[3])));
   const relevantOutlets=outlets.filter(o=>o.matches.some(x=>material.includes(x)));
   const outcome=/draw (?:a|one|two|three) cards?/i.test(body)?'card-access':/loses? \d+ life|deals? \d+ damage/i.test(body)?'life-pressure':/create .*token/i.test(body)?'replacement-material':'unknown';
   if(outcome==='unknown'){unknowns.push({card:c.name,reason:'Unparsed death outcome',oracle:line});continue;}
   add(c,'death:'+outcome,material,['Eligible creature dies',...(m[2]?['Nontoken material required']:[]),...(conditional?['Printed condition not certified: '+body]:[]),'All actual costs, timing and last-known battlefield information still apply'],body,
    {conditional,qualified:material.length>0&&relevantOutlets.length>0&&!conditional,outlets:relevantOutlets.map(o=>o.card.name)});
  }
  if(/graveyard/i.test(text)&&/return|cast/i.test(text))unknowns.push({card:c.name,reason:'Recursion present; legal targets, timing and resources not certified by relationship analysis'});
 }
 const unverifiedNativeResources=uncertainNativeResources(cards,commander,plan);
 for(const r of unverifiedNativeResources)unknowns.push({card:r.card,reason:'Native resource conversion requires '+r.cost+'; '+r.effect+' Execution and substitutability unverified.'});
 const capabilities=[...new Set(relationships.filter(r=>r.support.length&&r.qualified!==false).map(r=>r.kind))].sort();
 const byCard=new Map();for(const r of relationships){const xs=byCard.get(r.card)||[];xs.push(r.kind);byCard.set(r.card,xs);}
 return {relationships,capabilities,unverifiedNativeResources,multiRole:[...byCard].filter(([,xs])=>new Set(xs).size>1).map(([card,kinds])=>({card,functions:[...new Set(kinds)],note:'One permanent; functions share deployment, survival and resource dependencies'})),
  unknowns,commanderOracle:oracleText(commander),commanderNeeds:plan.needs,
  limitations:'Inventory relationships are conditional; no execution, recursion, reliable timing, combat win or infinite conversion is certified. Unrecognized mechanics remain unknown.'};
}

/** Preserve genuinely distinct plans; use spell differences AND capability/
 * engine differences, never a price difference or a handful of land swaps. */
export function distinctStrategy(a,b){
 const as=new Set(a.cards.filter(c=>!isLandSlot(c)).map(oracleId)),bs=new Set(b.cards.filter(c=>!isLandSlot(c)).map(oracleId));
 const changed=[...as].filter(x=>!bs.has(x)).length;
 const ar=a.relations,br=b.relations;
 const signatures=r=>new Set(r.relationships.filter(x=>x.support.length&&x.qualified!==false).map(x=>x.kind+':'+x.card));
 const ax=signatures(ar),bx=signatures(br);
 const engineChange=[...ax].filter(x=>!bx.has(x)).length+[...bx].filter(x=>!ax.has(x)).length;
 return changed>=12&&engineChange>=2;
}

export function refinementCohort(decks,{preferred,commander,coverageLeaders=[],limit=4}={}){
 const rows=decks.map(deck=>({...deck,original:deck,relations:strategyRelations(deck.cards,commander)})),chosen=[];
 const take=row=>{if(row&&!chosen.includes(row))chosen.push(row);};
 take(rows.find(r=>r.original===preferred));
 for(const deck of coverageLeaders)if(chosen.length<limit)take(rows.find(r=>r.original===deck));
 // Round-robin across source-informed vs local, prioritizing actual plan differences.
 const other=rows.filter(r=>r!==chosen[0]).sort((a,b)=>Number(!!b.sourceKey)-Number(!!a.sourceKey)||String(a.strategy).localeCompare(String(b.strategy)));
 // Source templates were already independently screened and deduplicated.
 // Shared scaffolding before refinement must not deny the remaining source
 // its one bounded opportunity to recover a distinct native plan.
 for(const row of other)if(row.sourceKey&&chosen.length<limit)take(row);
 for(const row of other)if(chosen.length<limit&&chosen.every(x=>distinctStrategy(row,x)))take(row);
 for(const row of other)if(chosen.length<limit)take(row);
 return chosen.map(r=>r.original);
}

/** Evidence-derived hypotheses, not commander-name/archetype presets. Bounded
 * persistent engines require actual catalog support. Costs only constrain
 * feasibility; neither cost nor inclusion/popularity earns merit. */
export function discoverStrategyPlans(pool,commander,{budget,limit=2}={}){
 const plan=planFor(commander),context={...engineContext(pool,plan),commander};
 const providers=sorted(pool.filter(c=>!isLandSlot(c)&&/Creature|Artifact|Enchantment/.test(c.type_line||'')&&engineManaValue(c)<=6&&
  /whenever|spells you cast|from the top of your library/i.test(oracleText(c))))
  .sort((a,b)=>engineManaValue(a)-engineManaValue(b)||a.name.localeCompare(b.name)).slice(0,160);
 const found=[];
 for(const c of providers){
  const access=supportedCardAccess(c,context),native=strategyInfrastructure(c,context);
  const entries=[...access.triggers.filter(t=>t.supported).map(t=>({kind:'access-'+t.kind,cards:t.cards})),
   ...native.map(t=>({kind:t.kind,cards:t.cards}))];
  for(const entry of entries){
   const support=sorted(pool.filter(x=>entry.cards.includes(x.name)&&x!==c&&engineManaValue(x)<=5)).sort((a,b)=>engineManaValue(a)-engineManaValue(b)||a.name.localeCompare(b.name));
   if(support.length<4)continue;
   const anchors=[c,...support.slice(0,2)];
   // Real card-value estimates only screen affordability.
   if(anchors.some(x=>!Number.isFinite(x.prices?.eur))||anchors.reduce((n,x)=>n+x.prices.eur,0)>budget*.35)continue;
   if(found.some(x=>x.discovery.kind===entry.kind))continue;
   found.push({id:'discovered:'+entry.kind+':'+oracleId(c),label:'Supported '+entry.kind+' with '+c.name,sourceKey:null,source:null,
    anchors:new Set(anchors.map(oracleId)),discovery:{kind:entry.kind,engine:c.name,support:support.length,anchors:anchors.map(x=>x.name),basis:'Commander Oracle needs and eligible catalog support; not a prescribed archetype'}});
   if(found.length>=limit)return found;
  }
 }
 return found;
}
