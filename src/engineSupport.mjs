/** Observable engine support, not guaranteed card advantage or combo execution.
 * Match the qualifying spells/creatures in this complete deck. No card names,
 * prices, popularity, or weighted power score participate. */
import {castFaces,castHasType,castHasSubtype,isLandSlot} from './cards.mjs';
import {oracleText} from './roleEvidence.mjs';
import {singletonName} from './deckValidation.mjs';

export const colorlessSpell=c=>castFaces(c).every(f=>(f.colors||c.colors||c.color_identity||[]).length===0);
// Some reversible catalog records report zero despite a nonzero casting
// face. Repair discovery/support timing locally; never mutate the printing.
export function engineManaValue(c){
 if(Number(c.cmc)>0)return Number(c.cmc);
 const cost=castFaces(c)[0]?.mana_cost||c.mana_cost||'';
 return [...cost.matchAll(/\{([^}]+)\}/g)].reduce((n,m)=>n+(/^[XYZ]$/.test(m[1])?0:Math.max(1,...m[1].split('/').map(x=>Number(x)||0))),0);
}

/** Match an observed spell descriptor, not an assumed commander archetype. */
export function matchesCastNeed(card,need){
 if(isLandSlot(card)||need.kind!=='typed-cast')return false;
 const typed=(need.types||[]).some(type=>{
  const lower=type.toLowerCase(),canonical=type[0].toUpperCase()+type.slice(1);
  return lower==='noncreature'?!castHasType(card,'Creature'):lower==='colorless'?colorlessSpell(card):castHasType(card,canonical)||castHasSubtype(card,canonical);
 });
 return typed&&(need.minManaValue==null||engineManaValue(card)>=need.minManaValue);
}

export const planTypes=plan=>[...new Set((plan.needs||[]).flatMap(n=>n.types||(n.kind==='ninjutsu'?['Ninja']:[n.type])).filter(Boolean))];
export function engineContext(cards,plan){
 const spells=cards.filter(c=>!isLandSlot(c)),creatures=spells.filter(c=>castHasType(c,'Creature')),relevant=planTypes(plan);
 const typed=(plan.needs||[]).filter(n=>n.kind==='typed-cast');
 const native=spells.filter(c=>typed.length?typed.some(n=>matchesCastNeed(c,n)):relevant.some(type=>castHasSubtype(c,type)||castHasType(c,type)));
 return {spells,creatures,relevant,native,tribal:creatures.filter(c=>relevant.some(type=>castHasSubtype(c,type)))};
}
const unique=cards=>[...new Map(cards.map(c=>[singletonName(c),c])).values()];
const drawAction=/\bdraw (?:a|one|two|three|four|[1-9]) cards?\b/i;

export function supportedCardAccess(c,context){
 const text=oracleText(c),spells=context.spells.filter(x=>x!==c),creatures=context.creatures.filter(x=>x!==c);
 const triggers=[],levelGated=/\bLevel \d|\blevel up\b/i.test(text);
 for(const line of text.split('\n')){
  const at=line.search(drawAction);if(at<0||/this turn|until end of turn/i.test(line))continue;
  // The ETB cantrip before "and whenever" does not restrict the cast trigger.
  const start=line.toLowerCase().lastIndexOf('whenever',at);if(start<0)continue;
  if(levelGated||!/^whenever\b|^when\b.*?and whenever\b/i.test(line))continue;
  const trigger=line.slice(start,at);
  if(/remove [^.]*counter|sacrifice|discard|unless|only if|spent|spend|treasure|second spell|pay|\bnamed\b/i.test(trigger))continue;
  const singletonCondition=/if it doesn't have the same name as another creature you control or a creature card in your graveyard/i.test(trigger);
  if(/\bif\b/i.test(trigger)&&!singletonCondition)continue;
  let matches=null,kind=null,tribal=false;
  const mv=trigger.match(/mana value (\d+) or (?:greater|more)/i);
  if(/you cast/i.test(trigger)){
   const clause=trigger.match(/you cast (?:(?:an?|another|your (?:first|second)) )?(.*?)spells?\b/i);
   if(!clause)continue;
   let descriptor=clause[1].trim();
   matches=spells;
   const kinds=['Artifact','Enchantment','Creature','Instant','Sorcery'].filter(type=>new RegExp('\\b'+type+'\\b','i').test(descriptor));
   if(kinds.length)matches=matches.filter(x=>kinds.some(type=>castHasType(x,type)));
   if(/noncreature/i.test(descriptor))matches=matches.filter(x=>!castHasType(x,'Creature'));
   if(/colorless/i.test(descriptor))matches=matches.filter(colorlessSpell);
   descriptor=descriptor.replace(/\b(?:artifact|enchantment|creature|instant|sorcery|noncreature|colorless|or)\b/gi,'').trim();
   if(descriptor){tribal=true;const types=descriptor.split(/\s*,\s*|\s+or\s+/).filter(Boolean);matches=matches.filter(x=>types.some(type=>castHasSubtype(x,type)));}
   if(/chosen type/i.test(trigger)){tribal=true;matches=matches.filter(x=>context.relevant.some(type=>castHasSubtype(x,type)));}
   if(mv)matches=matches.filter(x=>engineManaValue(x)>=Number(mv[1]));
   if(/from (?!your hand)|targets? |historic|during|\bthat\b/i.test(trigger)||/\bwith\b/i.test(trigger)&&!mv)matches=null;
   kind='cast';
  }else if(/creature.*you control/i.test(trigger)&&/enters/i.test(trigger)){
   // Enter-or-attack has an independently usable ETB branch; combat-only
   // triggers are not promoted to supported entry engines.
   tribal=/chosen type/i.test(trigger);
   matches=tribal?context.tribal.filter(x=>x!==c):creatures;
   const adjective=trigger.match(/(?:an?|another) (.*?)creature you control/i)?.[1]?.replace(/\b(?:nontoken|another)\b/gi,'').trim();
   if(adjective){tribal=true;matches=matches.filter(x=>castHasSubtype(x,adjective));}
   const power=line.match(/power (?:is )?(\d+) or (?:greater|more)/i);
   if(power)matches=matches.filter(x=>Number(x.power)>=Number(power[1]));
   else if(/\bwith\b/i.test(trigger))matches=null;
   if(/token creature/i.test(trigger)&&!/nontoken/i.test(trigger))matches=null;
   if(/\bdies\b|deals .*damage/i.test(trigger))matches=null;
   if(singletonCondition&&matches){const counts=new Map();for(const x of creatures){const key=singletonName(x);counts.set(key,(counts.get(key)||0)+1);}matches=matches.filter(x=>counts.get(singletonName(x))===1);}
   kind='entry';
  }
  if(/\bif\b/i.test(line.slice(at))&&!/power (?:is )?\d+ or (?:greater|more)/i.test(line))matches=null;
  if(matches){const support=unique(matches);triggers.push({kind,tribal,support:support.length,cards:support.map(x=>x.name),supported:support.length>=8});}
 }
 const persistent=/Creature|Artifact|Enchantment|Planeswalker|Battle/.test(castFaces(c)[0]?.type_line||c.type_line||'');
 const restrictive=/you can't cast more than one spell|you can cast no more than|you can't draw more than|skip your draw step|discard your hand/i.test(text);
 let topCards=[];
 const top=text.split('\n').map(line=>line.match(/^you may cast (artifact spells and colorless spells|artifact spells|colorless spells|creature spells|spells) from the top of your library\.$/i)).find(Boolean);
 if(top){const filter=top[1].toLowerCase();topCards=unique(spells.filter(x=>filter==='spells'||filter==='creature spells'&&castHasType(x,'Creature')||filter==='artifact spells'&&castHasType(x,'Artifact')||filter==='colorless spells'&&colorlessSpell(x)||filter==='artifact spells and colorless spells'&&(castHasType(x,'Artifact')||colorlessSpell(x))));}
 return {supported:persistent&&!restrictive&&triggers.some(t=>t.supported),triggers,
  topAccess:persistent&&!restrictive&&!levelGated&&topCards.length>=16,topSupport:topCards.length,topCards:topCards.map(c=>c.name)};
}

/** Keep strategically different capabilities separate, without saturation.
 * Losing a cast copier, tutor or cascade stream is a tradeoff, never a
 * dominated improvement merely because generic role totals are higher. */
export function strategyInfrastructure(c,context){
 const text=oracleText(c),spells=context.spells.filter(x=>x!==c);
 const native=(context.native||spells.filter(x=>context.relevant.some(type=>castHasSubtype(x,type)||castHasType(x,type)))).filter(x=>x!==c);
 const colorless=spells.filter(colorlessSpell),entries=[];
 function add(kind,support,min=1,units=1){if(unique(support).length>=min)entries.push({kind,units,support:unique(support).length,cards:unique(support).map(x=>x.name)});}
 const cascade=text.match(/(colorless )?spells you cast(?: from your hand)? with mana value (\d+) or greater have ["“]?(cascade(?:, cascade)*)/i);
 if(cascade){const support=(cascade[1]?colorless:spells).filter(x=>engineManaValue(x)>=Number(cascade[2]));add('cascade',support,4,cascade[3].split(',').length);}
 if(/whenever you cast a colorless spell, copy it/i.test(text))add('castCopy',colorless,8);
 for(const line of text.split('\n'))if(/triggered abilit[^\n]*triggers? (?:an|one) additional time/i.test(line)){
  const qualifies=x=>/legendary creature/i.test(line)?castHasType(x,'Creature')&&/Legendary/.test(x.type_line||''):
   /chosen type/i.test(line)?context.relevant.some(type=>castHasSubtype(x,type))&&castHasType(x,'Creature'):
   /colorless/i.test(line)?colorlessSpell(x):native.includes(x);
  const triggers=x=>/when(?:ever)?|at the beginning|cascade/i.test(oracleText(x));
  const sources=[...spells,...(context.commander?[context.commander]:[])].filter(x=>qualifies(x)&&triggers(x));
  add('passiveTriggerCopy',sources,1);
 }
 if(/copy target triggered ability/i.test(text))add('activatedTriggerCopy',native.filter(x=>/when(?:ever)?|at the beginning|cascade/i.test(oracleText(x))),4);
 for(const line of text.split('\n')){
  // Conditions such as graveyard Lessons, levels, life or counters are not
  // established by inventory. Never grant unconditional reduction support.
  if(/as long as|\bif\b|for each|level up|Level \d/i.test(line))continue;
  const m=line.match(/^(colorless|creature|artifact|enchantment|noncreature|instant and sorcery|instant or sorcery) spells you cast cost \{\d+\} less to cast\.$/i);
  let support=null;
  if(m){const kind=m[1].toLowerCase();support=spells.filter(x=>kind==='colorless'?colorlessSpell(x):kind==='noncreature'?!castHasType(x,'Creature'):kind.startsWith('instant')?castHasType(x,'Instant')||castHasType(x,'Sorcery'):castHasType(x,kind[0].toUpperCase()+kind.slice(1)));}
  if(/^the first creature spell you cast each turn costs \{\d+\} less to cast\.$/i.test(line))support=context.creatures.filter(x=>x!==c);
  if(/^spells of the chosen type cost \{\d+\} less to cast\.$/i.test(line))support=native;
  if(support)add('costReduction',support.filter(x=>engineManaValue(x)>=3),8);
 }

 // A bounded tutor grammar: require real eligible targets, and distinguish
 // mana/land search from access to strategy pieces. Unmodeled tutors get no
 // proof rather than counting the word "search" as infrastructure.
 for(const line of text.split('\n')){
  const match=line.match(/search your library for (?:an?|another) ((?:colorless |artifact |enchantment |creature |legendary )*)(?:card|spell)(?: with mana value (\d+) or (greater|less))?/i);
  if(!match||/land card/i.test(match[0]))continue;
  let targets=spells;
  for(const type of ['Artifact','Enchantment','Creature'])if(new RegExp(type,'i').test(match[1]))targets=targets.filter(x=>castHasType(x,type));
  if(/colorless/i.test(match[1]))targets=targets.filter(colorlessSpell);
  if(/legendary/i.test(match[1]))targets=targets.filter(x=>/Legendary/.test(x.type_line||''));
  if(match[2])targets=targets.filter(x=>match[3]==='greater'?engineManaValue(x)>=Number(match[2]):engineManaValue(x)<=Number(match[2]));
  if(/\bwith\b/i.test(line.slice(match.index+match[0].length)))continue;
  add('tutor',targets.filter(x=>native.includes(x)||/artifact|enchantment/i.test(match[1])),1);
 }
 return entries;
}
