/** v0.8.6: conservative, offline, Oracle-text-derived gameplay diagnostics.
 * These are auditable heuristics, not a simulator or a bracket certification.
 * Do not count a restricted mana source as general colored fixing.
 */
import {COLORS,castFaces,landFaces,isLandSlot,castHasType,castHasSubtype,coloredSources, trueColorlessSource} from './cards.mjs';

const text=c=>String((isLandSlot(c)?landFaces(c):castFaces(c)).map(f=>f.oracle_text||c.oracle_text||'').join('\n'));
const subtype=(c,t)=>String(c.type_line||'').split('—')[1]?.trim().split(/\s+/).includes(t)||false;
const spellType=(c,t)=>castHasType(c,t)||castHasSubtype(c,t);
const typeReference=(line)=>{
 const after=line.match(/(?:only to cast|only to activate [^.]*? of|only for)\s+([^.]*)/i)?.[1]||'';
 return (after.match(/\b(?:Eldrazi|Ninja|Turtle|Hero|Goblin|Elf|Zombie|Artifact|Creature|Enchantment|Instant|Sorcery|Knight|Cleric|Rogue|Dragon|Vampire|Equipment)\b/gi)||[]).map(x=>x.toLowerCase());
};
const relatedTypes=(commander,plan,deck=[])=>new Set([
 ...((plan?.needs||[]).flatMap(n=>n.types||[])),
 ...(deck.filter(c=>!isLandSlot(c)).flatMap(c=>String(c.type_line||'').split('—')[1]?.trim().split(/\s+/).filter(x=>x.length>3)||[]))
 ].map(x=>x.toLowerCase()));

/** Separate a land's unconditional mana from any extra contextual ability.
 * A source whose only colored output is for a wrong tribe is NOT fixing.
 */
export function landAccess(card,{commander,plan,lands=[],spells=[]}={}){
 const oracle=text(card), lines=oracle.split('\n');
 const types=relatedTypes(commander,plan,spells);
 const all=new Set(),conditional=new Set(),reasons=[];
 const gates=lands.filter(c=>subtype(c,'Gate'));
 const caves=lands.filter(c=>subtype(c,'Cave'));
 const gateColors=new Set(gates.filter(c=>c!==card).flatMap(c=>coloredSources(c)));
 // The Gate must be capable of producing that color, not merely mention it
 // as a possible spending restriction on an unrelated effect.
 for(const line of lines){
  // Avoid granting the land colors from rules text describing ANOTHER land.
  if(/^\s*other \w+ you control have\b/i.test(line))continue;
  if(!/\badd\b/i.test(line))continue;
  const fragments=line.split(/(?=\{T\}(?:,|:)\s*(?:Add|[^.]*: Add))/i);
  for(const fragment of fragments){
   if(!/\badd\b/i.test(fragment))continue;
   const isGateDependent=/any type that a Gate you control could produce/i.test(fragment);
   const isCaveDependent=/if you control (?:another|two or more) Caves?/i.test(fragment);
   const restricted=/spend this mana only|use this mana only|can be spent only|only to cast/i.test(fragment);
   const need=typeReference(fragment);
   const badType=restricted&&(!need.length||!need.some(t=>types.has(t)));
   const noGate=isGateDependent&&!gates.length;
   const noCave=isCaveDependent&&caves.length<2;
   if(badType||noGate||noCave){reasons.push(badType?'color restricted to unsupported card types':noGate?'no other Gate provides the referenced mana':'insufficient Cave support');continue;}
   const set=new Set();
   for(const match of fragment.matchAll(/\{([WUBRG])\}/g))set.add(match[1]);
   if(isGateDependent)for(const c of gateColors)set.add(c);
   else if(/mana of any colo[u]?r|mana of any type/i.test(fragment))COLORS.forEach(c=>set.add(c));
   for(const c of set)(restricted||isGateDependent?conditional:all).add(c);
  }
 }
 // Other Caves acquire this ability from a separate Cave with a grant effect.
 // Count it as conditional (life payment / requires both lands), never unconditional.
 if(subtype(card,'Cave')&&lands.some(other=>other!==card&&/other Caves you control have[^\n]*add one mana of any color/i.test(text(other))))
  COLORS.forEach(c=>conditional.add(c));
 // Scryfall records sometimes omit the intrinsic basic land mana reminder.
 const basic=({'Plains':'W','Island':'U','Swamp':'B','Mountain':'R','Forest':'G'})[card.name];
 if(basic)all.add(basic);
 // Gate-copying uses the actual Gate-produced colors, not 'any color'.
 if(/any type that a Gate you control could produce/i.test(oracle)&&!gateColors.size)reasons.push('Gates provide no colored mana');
 return {reliable:[...all],conditional:[...conditional],colorless:trueColorlessSource(card),reasons:[...new Set(reasons)]};
}

/** Repeatable, generally spendable mana rocks and dorks are early acceleration.
 * Spawn/Scion/Treasure bursts and Powerstones are separate and not counted as
 * unconditional early ramp for casting nonartifact Eldrazi spells.
 */
export function manaRole(c){
 if(isLandSlot(c))return {kind:'land',effective:false};
 const t=text(c),mv=Number(c.cmc)||0;
 const producesPowerstone=/create [^.\n]*Powerstone token/i.test(t);
 const landRamp=/search your library[^\n]{0,270}(?:land cards?|Forest cards?|Plains cards?|Island cards?|Swamp cards?|Mountain cards?)[^\n]{0,260}put [^\n]{0,170}onto the battlefield|put (?:a|target|up to [^.]*) land [^.]*onto the battlefield/i.test(t);
 const producesBurst=/create [^.\n]*(?:Eldrazi Spawn|Eldrazi Scion|Treasure)\b/i.test(t);
 const manaAbility=/(?:\{T\}[^\n.]*:\s*)?add\s+(?:\{[WUBRGC]\}|one mana|two mana|three mana)/i.test(t);
 const repeatable=/\{T\}[^\n.]*:\s*add\s+(?:\{[WUBRGC]\}|one mana|two mana|three mana)/i.test(t)||/\{T\}: Add one mana of any color/i.test(t);
 const restricted=/spend this mana only|use this mana only|this mana can't be spent to cast a nonartifact spell|activate abilities only/i.test(t);
 const activationOnly=/spend this mana only to activate|activate abilities only/i.test(t);
 const oneShot=/sacrifice (?:this|~|[^.\n]*)\s*:\s*add/i.test(t);
 if(landRamp&&mv<=3)return {kind:'land-ramp',effective:true};
 if(repeatable&&!restricted&&!oneShot&&mv<=3&&!/suspend \d+|suspend—|multikicker/i.test(t))return {kind:'repeatable',effective:true};
 if(repeatable&&restricted)return {kind:activationOnly?'activated-only':'restricted',effective:false};
 if(producesPowerstone)return {kind:'powerstone',effective:false};
 if(repeatable&&/suspend \d+|suspend—|multikicker/i.test(t))return {kind:'delayed-or-variable',effective:false};
 if(producesBurst||oneShot)return {kind:'burst',effective:false};
 if(manaAbility)return {kind:mv>3?'late':'conditional',effective:false};
 return {kind:'none',effective:false};
}

/** Spells with effects that actually protect OTHER objects rather than only themselves.
 * This conservative classification avoids reporting a hexproof creature as
 * protecting the commander. Reactive counterspells also count as shielding.
 */
export function functionalRoles(card){
 const t=text(card), mv=Number(card.cmc)||0;
 const instant=spellType(card,'Instant');
 const equip=spellType(card,'Equipment');
 const counter=/counter target (?:spell|activated|triggered)/i.test(t);
 const removal=/\b(?:destroy|exile) (?:target|all|each)\b|return target (?:spell|creature|permanent) to/i.test(t)||counter;
 const shields=/hexproof|shroud|indestructible|phase(?:s)? out|protection from|ward\s*\{/i.test(t);
 const grants=/\b(?:target|another|equipped|enchanted|creatures you control|permanents you control|each creature you control|you and permanents you control|up to \w+ target)\b/i.test(t);
 const protection=shields&&(grants||instant)||counter&&instant;
 const draw=/\bdraw (?:a|one|two|three|x|that many|[1-9]\d*) card/i.test(t);
 const conditionalDraw=/activate only if|draw a card (?:only|if)|whenever you cast or copy an instant or sorcery|whenever (?:a|an) (?:artifact|creature) you control dies/i.test(t);
 return {interaction:removal&&(mv<=5||instant),protection:protection&&(mv<=5||equip||instant),draw:draw&&mv<=5,conditionalDraw,mana:manaRole(card)};
}

/** Oracle-text support relationships: card-name-independent and deck-specific. */
export function supportProblems(card,deck,plan){
 const t=text(card),results=[];
 const spells=deck.filter(c=>!isLandSlot(c));
 if(/(?:create [^.]*Powerstone tokens?|Powerstone token)/i.test(t)){
  const artifacts=spells.filter(c=>spellType(c,'Artifact')).length;
  if(artifacts<8)results.push('Powerstone mana cannot cast nonartifact spells; few artifact targets');
 }
 if(/whenever you cast or copy an instant or sorcery|instant or sorcery spell[^.]*put a .*counter/i.test(t)){
  const supported=spells.filter(c=>spellType(c,'Instant')||spellType(c,'Sorcery')).length;
  if(supported<10)results.push(`instant/sorcery engine has only ${supported} supporting spells`);
 }
 if(isLandSlot(card)){
  const access=landAccess(card,{plan,lands:deck.filter(isLandSlot),spells});
  results.push(...access.reasons);
  if(access.reliable.length===0&&access.conditional.length===0&&access.colorless)results.push('colorless-only utility land');
 }
 return [...new Set(results)];
}

export function deckQuality({cards,commander,plan,bracket}){
 const spells=cards.filter(c=>!isLandSlot(c)),lands=cards.filter(isLandSlot);
 const roles=spells.map(c=>({c,r:functionalRoles(c)}));
 const early=roles.filter(x=>x.r.mana.effective).length;
 const bursts=roles.filter(x=>x.r.mana.kind==='burst').length;
 const powerstones=roles.filter(x=>x.r.mana.kind==='powerstone').length;
 const interaction=roles.filter(x=>x.r.interaction).length;
 const protection=roles.filter(x=>x.r.protection).length;
 const draw=roles.filter(x=>x.r.draw).length;
 const conditionalDraw=roles.filter(x=>x.r.draw&&x.r.conditionalDraw).length;
 const mana=Object.fromEntries(COLORS.map(k=>[k,0]));
 const conditional=Object.fromEntries(COLORS.map(k=>[k,0]));
 const landIssues=[];
 for(const c of lands){const a=landAccess(c,{commander,plan,lands,spells});for(const color of a.reliable)mana[color]++;for(const color of a.conditional)conditional[color]++;if(a.reasons.length)landIssues.push({card:c.name,reasons:a.reasons});}
 const nonLandIssues=spells.flatMap(c=>supportProblems(c,cards,plan).map(reason=>({card:c.name,reason})));
 const wanted=bracket===4?{early:10,interaction:8,protection:3,draw:8}:bracket===3?{early:8,interaction:8,protection:3,draw:7}:{early:7,interaction:6,protection:2,draw:6};
 const warnings=[];
 if(early<wanted.early)warnings.push(`Repeatable early mana ${early}/${wanted.early} (burst mana excluded)`);
 if(interaction<wanted.interaction)warnings.push(`Effective interaction ${interaction}/${wanted.interaction}`);
 if(protection<wanted.protection)warnings.push(`Commander protection ${protection}/${wanted.protection}`);
 if(draw<wanted.draw)warnings.push(`Accessible card draw ${draw}/${wanted.draw}`);
 if(landIssues.length)warnings.push(`${landIssues.length} land(s) have conditional or unsupported fixing`);
 if(nonLandIssues.length)warnings.push(`${nonLandIssues.length} spell(s) have weak mechanical support`);
 return {status:warnings.length?'NEEDS PLAYTEST AND REVIEW':'HEURISTIC TARGETS MET — NOT PLAYTEST CERTIFIED',earlyMana:early,burstMana:bursts,powerstoneMakers:powerstones,interaction,protection,draw,conditionalDraw,targets:wanted,landSources:mana,conditionalLandSources:conditional,landIssues,spellIssues:nonLandIssues.slice(0,20),warnings,method:'Conservative Oracle-text functional heuristics; no simulated games or official bracket verification'};
}
