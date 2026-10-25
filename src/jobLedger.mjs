/** Read-only, score-free shadow observations. Never imported by construction.
 * "supported" means a printed relationship/inventory prerequisite is recognized,
 * never that a spell resolved, a resource was spent or a game was won. */
import {castFaces,castHasType,castHasSubtype,isLandSlot,isBasic,oracleId} from './cards.mjs';
import {singletonName} from './deckValidation.mjs';
import {oracleText,roleEvidence} from './roleEvidence.mjs';
import {planFor} from './mechanics.mjs';
import {engineContext,supportedCardAccess,strategyInfrastructure,engineManaValue,matchesCastNeed,colorlessSpell} from './engineSupport.mjs';

const words={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6};
const quantity=s=>/^\d+$/.test(s)?Number(s):words[s?.toLowerCase()]??null;
const identity=c=>singletonName(c);
const persistent=c=>castFaces(c).some(f=>/Creature|Artifact|Enchantment|Planeswalker|Battle|Land/.test(f.type_line||c.type_line||''));
const draw=/\bdraw (a|one|two|three|four|five|six|[1-9]) cards?\b/i;
const status=(yes,missing=false)=>yes?'supported':missing?'unknown':'unsupported';
const timing=line=>/^At the beginning of (?:your |each )?end step/i.test(line)?'end step':/^At the beginning of.*upkeep/i.test(line)?'upkeep':/\bWhenever you cast\b/i.test(line)?'cast trigger (copies are not casts)':/\bdies\b/i.test(line)?'death event':/\benters\b/i.test(line)?'entry event':line.includes(':')?'activated ability; printed timing restrictions apply':'spell resolution or static rule';

export function printedCosts(text,card){
 const resources=[];let rest=text;
 for(const m of text.matchAll(/\{([^}]+)\}/g))resources.push({kind:m[1]==='T'?'tap-source':m[1]==='Q'?'untap-source':'mana',symbol:m[1],amount:1,consumed:true});
 rest=rest.replace(/\{[^}]+\}/g,'');
 const life=text.match(/Pay (\d+) life/i);if(life){resources.push({kind:'life',amount:Number(life[1]),consumed:true});rest=rest.replace(life[0],'');}
 const sacrifice=text.match(/Sacrifice (?:(another|an?|any number of) )?(nontoken )?(creature|artifact|enchantment|land|[A-Z][a-z]+)(?: token)?\b/);
 if(sacrifice){resources.push({kind:'sacrifice',type:sacrifice[3],another:sacrifice[1]==='another',nontoken:!!sacrifice[2],amount:sacrifice[1]==='any number of'?null:1,consumed:true});rest=rest.replace(sacrifice[0],'');}
 const discard=text.match(/Discard (?:a|one) card/i);if(discard){resources.push({kind:'hand-card',amount:1,consumed:true});rest=rest.replace(discard[0],'');}
 return {printed:text,resources,unparsed:rest.replace(/[,\s]/g,'')||null,summoningSickness:castHasType(card,'Creature')&&resources.some(r=>r.kind==='tap-source')};
}

/** cards is the 99-card mainboard (or a controlled diagnostic mutation).
 * Missing catalog cards may be placeholders with catalogMissing:true. */
export function buildCardJobLedger({commander,cards,executionEvidence=null}={}){
 if(!commander||!Array.isArray(cards)||cards.length>99)throw Error('Supply a commander and at most 99 mainboard records.');
 if([commander,...cards].some(c=>!c||typeof c.name!=='string'||c.name.length>300||oracleText(c).length>20000))throw Error('Invalid or oversized card record; no shadow result was produced.');
 const all=[commander,...cards],known=all.filter(c=>!c.catalogMissing),unknownCatalog=all.some(c=>c.catalogMissing),plan=planFor(commander),context={...engineContext(known,plan),commander};
 const counters=new Map(),jobs=[],obligations=[],rows=[],omissions=[];
 const slots=all.map((card,index)=>{const name=identity(card),copy=counters.get(name)||0;counters.set(name,copy+1);return {card,slot:name+'#'+copy,index};});
 const add=(row,kind,line,extra={})=>{
  const job={id:row.slot+'|'+kind+'|'+row.jobs.length,card:row.card,slot:row.slot,sharedDependency:row.slot,kind,status:'unknown',provides:[],beneficiaries:[],supportingCards:[],requires:[],repeatability:'unknown',timing:timing(line),oracle:line,unresolved:[],execution:'unknown; inventory evidence only',...extra};
  row.jobs.push(job);jobs.push(job);return job;
 };
 const names=xs=>[...new Set(xs.map(c=>c.name))].sort();
 for(const entry of slots){
  const c=entry.card,text=oracleText(c),row={slot:entry.slot,card:c.name,oracleId:oracleId(c),isCommander:entry.index===0,catalogMissing:!!c.catalogMissing,castCosts:castFaces(c).map(f=>f.mana_cost||c.mana_cost||null),roleHints:c.catalogMissing?null:roleEvidence(c),jobs:[]};rows.push(row);
  if(c.catalogMissing){add(row,'unresolved-card','',{unresolved:['Card absent from frozen catalog; types, costs, legality and effects unknown']});continue;}
  if(castHasType(c,'Creature'))add(row,'material:creature',c.type_line,{status:'supported',provides:[{kind:'creature',types:(c.type_line||'').split('—')[1]?.trim().split(/\s+/)||[],token:false}],requires:['Actually deploy this creature; a card in the library is not a battlefield resource'],repeatability:'one physical card; recovery unverified'});
  if(castHasType(c,'Artifact'))add(row,'material:artifact',c.type_line,{status:'supported',provides:[{kind:'artifact',types:['Artifact'],token:false}],requires:['Actually deploy this artifact; it is not a second independent object when it also has other jobs'],repeatability:'one physical card; recovery unverified'});
  if(!isLandSlot(c))add(row,'event:spell-cast',text,{status:'supported',provides:[{kind:'spell-cast',types:castFaces(c).map(f=>f.type_line||c.type_line),manaValue:engineManaValue(c),colorless:colorlessSpell(c)}],cost:{...printedCosts(castFaces(c)[0]?.mana_cost||c.mana_cost||'',c),phase:'spell-cast'},requires:['Pay the selected casting face and actual additional costs','Obey timing and zone permissions; copied spells are not casts'],repeatability:'one cast per available card; recasting requires a supported zone transition'});
  const access=supportedCardAccess(c,context),infrastructure=strategyInfrastructure(c,context),lines=text.split('\n');
  if(lines.length>32)omissions.push({slot:entry.slot,clauses:lines.length-32,status:'unknown'});
  for(const line of lines.slice(0,32)){
   if(!line.trim())continue;
   const normalizedLine=isBasic(c)&&/^\(.*\)$/.test(line)?line.slice(1,-1):line;
   const colon=normalizedLine.indexOf(':'),cost=colon>=0?printedCosts(normalizedLine.slice(0,colon),c):null;
   const limited=/\bif\b|unless|only once|first |second |each turn|this turn|only during|activate only|gains? control|gain control/i.test(line);
   const consumesSource=!!cost&&(cost.printed.toLowerCase().includes('sacrifice '+c.name.split(' // ')[0].toLowerCase())||/Discard this card|Sacrifice this (?:artifact|creature|permanent|token)|Exile this (?:card|creature|artifact|permanent)/i.test(cost.printed));
   const common={cost,sourceIsPersistent:persistent(c),consumesSource,repeatability:/gains? control|gain control/i.test(line)?'unknown after printed control transfer':consumesSource?'consumed source; recovery required for another use':colon>=0?'activation; limited by actual payments/resources':persistent(c)?'trigger/static source; requires deployment and fresh qualifying events':'one-shot',requires:cost?.resources.length?['Pay all costs before the effect resolves; a produced resource cannot pay its own cost']:[],unresolved:[...(limited?['Printed timing/guard remains state-dependent: '+line]:[]),...(cost?.unparsed?['Unparsed activation cost: '+cost.unparsed]:[]),...(cost?.summoningSickness?['Source must be able to tap; summoning sickness applies']:[])]};
   // Own mana ability only: quoted token/granted abilities remain unknown.
   const mana=normalizedLine.match(/^\s*(\{T\}[^:]*):\s*Add ((?:\{[WUBRGC]\})+|one mana of any colou?r)\./i);
   if(mana&&!/["“]/.test(line.slice(0,line.indexOf('Add')))){
    const symbols=[...mana[2].matchAll(/\{([WUBRGC])\}/g)].map(m=>m[1]);
    add(row,'resource:mana',line,{...common,status:cost?.unparsed||/if|unless|only|for each|doesn't untap/i.test(line)?'unknown':'supported',provides:[{kind:'mana',symbols:symbols.length?symbols:['W/U/B/R/G choice'],trueColorless:symbols.includes('C'),spendingRestrictions:/spend|only|can't|unless|for each/i.test(line)?line:'none parsed'}],unresolved:[...common.unresolved,'Production, tappedness, sickness and sequencing are not simulated']});
   }
   const tokens=line.match(/\b[Cc]reate (a|an|one|two|three|four|[1-9]) ([^.]*?)tokens?\b/);
   if(tokens){
    const descriptor=tokens[2],treasure=/\bTreasure\b/.test(descriptor),spawn=/\bSpawn\b/.test(descriptor),scion=/\bScion\b/.test(descriptor),creature=/creature|Spawn|Scion/i.test(descriptor);
    const compound=colon>=0&&cost?.resources.some(r=>r.kind==='sacrifice');
    add(row,compound?'conversion:resource':'resource:token',line,{...common,status:cost?.unparsed?'unknown':'supported',provides:[{kind:treasure?'treasure-token':creature?'creature-token':'other-token',amount:quantity(tokens[1]),descriptor,attributes:line.slice(tokens.index+tokens[0].length).split('. ')[0],types:descriptor.split(/\s+/),token:true,...(treasure?{manaOptions:['W','U','B','R','G'],trueColorless:false,sacrificeForMana:true}:spawn||scion?{manaOptions:/Sacrifice this (?:creature|token): Add \{C\}/i.test(line)?['C']:[],trueColorless:/Sacrifice this (?:creature|token): Add \{C\}/i.test(line),sacrificeForMana:/Sacrifice this (?:creature|token): Add \{C\}/i.test(line),manaAbilityEvidence:'Requires the printed token mana ability; subtype alone is insufficient'}:{} )}],unresolved:[...common.unresolved,'Token exists only after its producing effect resolves','A token sacrificed for mana cannot also pay another sacrifice cost',...(limited?['Printed trigger/quantity condition needs actual state']:[])]});
   }
   const sacrifice=cost?.resources.find(r=>r.kind==='sacrifice');
   if(sacrifice)add(row,'consume:sacrifice',line,{...common,status:cost.unparsed?'unknown':'supported',provides:[{kind:'sacrifice-event',type:sacrifice.type,amount:sacrifice.amount}],requires:[...common.requires,'Eligible material must exist before activation; sacrificing does not guarantee a reusable loop'],unresolved:[...common.unresolved,'Controller, battlefield state and commander replacement ordering need an actual event trace']});
   // Existing access grammar supplies eligible identities, not its 8-card quota.
   for(const trigger of access.triggers){
    if(!draw.test(line)||trigger.kind==='cast'&&!/you cast/i.test(line)||trigger.kind==='entry'&&!/enters/i.test(line))continue;
    add(row,'access:'+trigger.kind,line,{...common,status:/chosen type/i.test(line)?'unknown':trigger.kind==='entry'&&!trigger.cards.length?'unknown':status(trigger.cards.length>0,unknownCatalog),supportingCards:/chosen type/i.test(line)?names(context.creatures.filter(x=>x!==c)):trigger.cards.slice().sort(),provides:[{kind:'card-access',quantity:quantity(line.match(draw)?.[1]),destination:'hand'}],requires:[...common.requires,'Resolve a qualifying '+trigger.kind+' event after deploying this source'],unresolved:[...common.unresolved,'Support density, event frequency and resource-funded deployment unknown',...(/chosen type/i.test(line)?['Actual chosen type is not declared; listed creature cards are choice candidates, not a commander archetype assignment']:[]),...(trigger.kind==='entry'?['Tokens, graveyard names and actual enter/attack choices need event-state verification']:[])]});
   }
   if(draw.test(line)&&!row.jobs.some(j=>j.oracle===line&&j.kind.startsWith('access:'))){
    const direct=/^(?:You )?[Dd]raw (?:a|one|two|three|four|five|six|[1-9]) cards?\.(?:$|\s*\()/i.test(line);
    const activation=colon>=0&&/^(?:You )?[Dd]raw (?:a|one|two|three|four|[1-9]) cards?\./i.test(line.slice(colon+1).trim());
    const death=/^Whenever [^.]*dies,/i.test(line),end=/^At the beginning of .*end step/i.test(line);
    add(row,direct?'access:one-shot':activation?'access:activated':death?'access:death':end?'access:end-step':'access:unparsed',line,{...common,repeatability:direct?'one-shot':common.repeatability,status:direct||activation&&!cost?.unparsed&&!limited?'supported':'unknown',provides:[{kind:'card-access',quantity:quantity(line.match(draw)?.[1]),destination:'hand'}],requires:[...common.requires,...(death?['A qualifying death (and any equip/last-known-information condition) must actually occur']:[]),...(end?['Reach the printed end step with all guards true']:[])],unresolved:[...common.unresolved,...(!direct&&!activation?['Trigger/guard, target and zone prerequisites need state evidence']:[])]});
   }
   if(/you may cast .*from the top of your library/i.test(line))add(row,'access:top-library',line,{...common,status:access.topSupport>0?'supported':unknownCatalog?'unknown':'unsupported',supportingCards:access.topCards.slice().sort(),provides:[{kind:'card-access',destination:'cast from library top; not hand'}],requires:['Eligible card must actually be on top','Pay its real costs and obey spell timing; look permission is not drawing'],unresolved:['Library ordering, payable costs and realized access unknown']});
   if(/graveyard/i.test(line)&&/return|cast/i.test(line))add(row,'recovery:zone-access',line,{...common,provides:[{kind:'recovery',destination:/to your hand/i.test(line)?'hand':/battlefield/i.test(line)?'battlefield':/cast/i.test(line)?'cast permission from graveyard':'unknown'}],requires:['Eligible card in the actual graveyard; printed type/controller/zone conditions','Pay real costs; a card in the deck is not already in the graveyard'],unresolved:['Legal targets, replacements, timing and sustained recursion not established']});
   if(/\bdies,/.test(line)&&!/draw/i.test(line))add(row,'payoff:death',line,{...common,status:'unknown',provides:[{kind:/loses? \d+ life|deals? \d+ damage/i.test(line)?'life-pressure':/create/i.test(line)?'replacement-material':'unknown-death-result'}],requires:['Eligible death and last-known source information','Resolve any condition, target and commander replacement correctly'],unresolved:['Death execution, token attributes and conversion into a win unknown']});
   if(/Whenever you cast/i.test(line)&&/deals? \d+ damage to each opponent|each opponent loses \d+ life/i.test(line)){
    const typed=(plan.needs||[]).filter(n=>n.kind==='typed-cast'),support=known.filter(x=>x!==c&&typed.some(n=>matchesCastNeed(x,n)));
    add(row,'payoff:cast-pressure',line,{...common,status:typed.length?status(support.length>0,unknownCatalog):'unknown',supportingCards:names(support),provides:[{kind:'life-pressure',amount:Number(line.match(/(?:deals? |loses? )(\d+)/i)?.[1])||null}],requires:['Cast a qualifying spell, pay costs and resolve the trigger; copies are not casts'],unresolved:['Repeated casts, opponent life totals and lethal conversion unknown']});
   }
   if(/deals? (?:\d+|X) damage to (?:each opponent|any target)|each opponent loses (?:\d+|X) life|you win the game/i.test(line)&&!row.jobs.some(j=>j.oracle===line&&j.provides.some(p=>p.kind==='life-pressure')))
    add(row,'win:printed-outlet',line,{...common,provides:[{kind:'life-pressure',amount:Number(line.match(/(?:deals? |loses? )(\d+)/i)?.[1])||null,printedOutcome:line}],requires:[...common.requires,'Fund the exact event/activation and select legal targets','Resolve enough actual events against actual opponent life totals'],unresolved:[...common.unresolved,'No infinite resources, lethal conversion, execution turn or win is established']});
   if(castHasType(c,'Creature')&&/\bannihilator\b|\btrample\b|can't be blocked|\bninjutsu\b/i.test(line))add(row,'win:combat-contribution',line,{...common,provides:[{kind:'combat-contribution',printedMechanic:line}],requires:['Deploy legal attacker, respect sickness, pay costs and resolve combat against actual defenders'],unresolved:['Combat/ninjutsu and victory are not modeled; this is not a failed strategy']});
   if(/copy|cascade|search your library|spells.*cost.*less/i.test(line)){
    const relevant=infrastructure.filter(e=>e.kind==='tutor'?/search your library/i.test(line):e.kind==='cascade'?/cascade/i.test(line):e.kind==='costReduction'?/cost.*less/i.test(line):/copy|triggers? an additional time/i.test(line));
    const support=[...new Set([...relevant.flatMap(e=>e.cards),...(row.isCommander&&/Whenever you cast/i.test(line)&&!(plan.unsupportedCast||[]).length?known.filter(x=>x!==c&&(plan.needs||[]).some(n=>matchesCastNeed(x,n))).map(x=>x.name):[])])].sort();
    const optional=line.match(/you may pay ((?:\{[^}]+\})+)/i);
    add(row,'native:infrastructure',line,{...common,...(optional?{cost:{...printedCosts(optional[1],c),phase:'optional trigger-resolution payment'},requires:[...common.requires,'Separate optional payment after the qualifying cast; do not spend unresolved trigger outputs']}:{}),status:'unknown',supportingCards:support,provides:relevant.map(e=>({kind:e.kind,units:e.units})),requires:[...common.requires,...(optional?['Separate optional payment after the qualifying cast; no spending of unresolved trigger outputs']:[]),'Deploy actual source and obey printed spell/ability/zone restrictions'],destination:/put .*into your hand/i.test(line)?'hand':/put .*on top/i.test(line)?'library top':/put .*onto the battlefield/i.test(line)?'battlefield':null,unresolved:[...common.unresolved,'Helper support thresholds are hypotheses, not execution evidence','Stack ordering, copied versus cast events, reveal/search results and actual payments unmodeled']});
   }
   if(/\b(?:destroy|exile|counter|return) target\b/i.test(line))add(row,'utility:interaction',line,{...common,status:'supported',provides:[{kind:'interaction',printedTarget:line}],requires:['Legal target and actual costs/timing; opponent state unknown'],unresolved:['Conditional targeting, modes and response outcome not simulated']});
   if(/hexproof|indestructible|phase[sd]? out|protection from/i.test(line))add(row,'utility:protection',line,{...common,status:'unknown',provides:[{kind:'protection',printedTarget:line}],requires:['Correct legal beneficiary and timing; self-protection is not group protection'],unresolved:['Actual beneficiary, costs, opponent actions and effect duration need state evidence']});
  }
  if(castFaces(c).length>1)for(const job of row.jobs){job.status='unknown';job.unresolved.push('Alternative casting faces share one physical card; choose a legal face and its own costs/effects, never deploy both as independent engines');}
  const unparsed=lines.slice(0,32).filter(line=>line.trim()&&!row.jobs.some(j=>!['event:spell-cast','material:creature'].includes(j.kind)&&j.oracle===line));
  if(unparsed.length)add(row,'unresolved:mechanics',unparsed.join('\n'),{unresolved:['These clauses are outside the supported effect grammar; no bad-card verdict']});
 }
 // Link printed consumptions to potential inventory providers. This never
 // allocates resources, moves zones or spends a physical card/token twice.
 for(const job of jobs){
  const costs=job.cost?.resources||[],material=costs.find(r=>r.kind==='sacrifice');
  if(material){
   const supports=jobs.filter(j=>j.id!==job.id&&j.provides.some(p=>{
    const candidate=slots.find(s=>s.slot===j.slot)?.card;if(candidate&&/this (?:artifact|creature|permanent) can't be sacrificed/i.test(oracleText(candidate)))return false;
    if(!['creature','artifact','creature-token','treasure-token'].includes(p.kind)||material.nontoken&&p.token)return false;
    if(material.another&&j.slot===job.slot&&!p.token)return false;
    // No resource may fund the same unresolved effect that would create it.
    if(j.slot===job.slot&&j.oracle===job.oracle)return false;
    return material.type==='creature'?p.kind==='creature'||p.kind==='creature-token':material.type==='artifact'?p.kind==='treasure-token'||p.kind==='artifact':p.types?.includes(material.type)||p.descriptor?.includes(material.type);
   }));
   job.supportingCards=[...new Set([...job.supportingCards,...supports.map(s=>s.card)])].sort();
   obligations.push({id:job.id+'|material',anchor:job.id,question:'Which existing material can pay this printed sacrifice cost?',status:status(supports.length>0,unknownCatalog),satisfiedBy:supports.map(s=>s.id),missing:supports.length?[]:['No recognized eligible material provider in the known inventory'],scope:'Potential material only; not simultaneous funded activations or sustained throughput'});
  }
  if(job.kind==='payoff:death'||job.kind==='access:death'){
   const tribe=job.oracle.match(/(?:another )?(?:nontoken )?([A-Z][a-z]+|creature)(?: you control)? dies/)?.[1]||'creature';
   const matching=jobs.filter(j=>j.provides.some(p=>['creature','creature-token'].includes(p.kind)&&(tribe==='creature'||p.types?.includes(tribe)))&&!(j.slot===job.slot&&/another/.test(job.oracle)&&!/^Whenever this creature or another/.test(job.oracle)));
   const outlets=jobs.filter(j=>j.kind==='consume:sacrifice'&&matching.some(m=>{const cost=j.cost?.resources.find(r=>r.kind==='sacrifice');return cost&&m.provides.some(p=>!(cost.another&&j.slot===m.slot&&p.kind==='creature')&&!(cost.nontoken&&p.token)&&(cost.type==='creature'||p.types?.includes(cost.type)));}));
   job.supportingCards=[...new Set([...job.supportingCards,...matching.map(j=>j.card),...outlets.map(j=>j.card)])].sort();
   obligations.push({id:job.id+'|voluntary-death',anchor:job.id,question:'Is a compatible voluntary sacrifice path present for this death payoff?',status:matching.length&&outlets.length?'supported':'unknown',satisfiedBy:outlets.map(j=>j.id),material:matching.map(j=>j.id),scope:'Inventory path only. Combat/removal/other death causes remain unknown; no outlet is not a failed universal quota'});
  }
  if(job.kind==='recovery:zone-access'){
   const guard=job.oracle.match(/as long as you control an? ([A-Z][a-z]+)/),support=guard?all.filter(c=>identity(c)!==identity({name:job.card})&&castHasSubtype(c,guard[1])):[];
   job.supportingCards=names(support);
   obligations.push({id:job.id+'|zone-and-permission',anchor:job.id,question:'Are the actual graveyard card, permission and printed battlefield guard available?',status:guard&&!support.length&&!unknownCatalog?'unsupported':'unknown',satisfiedBy:names(support),scope:'No graveyard state or recast is invented. Token/unknown enablers and alternative recovery remain unverified'});
  }
  if(job.kind==='conversion:resource')obligations.push({id:job.id+'|material-renewal',anchor:job.id,question:'What replaces the material consumed by another funded activation?',status:'unknown',satisfiedBy:jobs.filter(j=>j.id!==job.id&&(j.kind==='recovery:zone-access'||j.provides.some(p=>p.kind==='creature-token'))).map(j=>j.id),scope:'Possible renewal channels, not an executable cycle; zone, life, mana, ordering and shared objects must be proven'});
  job.resourceLinks=[];
  for(const need of costs.filter(r=>r.kind==='mana')){
   const receiver=slots.find(s=>s.slot===job.slot)?.card;
   const donors=jobs.filter(j=>j.id!==job.id&&!(j.slot===job.slot&&(j.oracle===job.oracle||job.kind==='event:spell-cast'||costs.some(r=>r.kind==='tap-source')&&j.cost?.resources.some(r=>r.kind==='tap-source')))&&
    !(job.kind==='event:spell-cast'&&/spend this mana only to activate/i.test(j.oracle))&&
    !(job.kind==='event:spell-cast'&&!castHasType(receiver,'Artifact')&&/can't be spent to cast nonartifact/i.test(j.oracle))&&j.provides.some(p=>{
    const options=p.kind==='mana'?p.symbols:p.sacrificeForMana?p.manaOptions:[];
    return options&&(need.symbol==='C'?options.includes('C'):/^\d+$/.test(need.symbol)?options.length>0:need.symbol.split('/').some(x=>options.includes(x)||options.includes('W/U/B/R/G choice')&&/[WUBRG]/.test(x)));
   }));
   job.resourceLinks.push({kind:'potential-mana-source',symbol:need.symbol,providers:donors.map(j=>j.id),status:'unknown',scope:'Candidates, not a payment allocation; one physical source/token cannot fund multiple competing costs'});
   for(const donor of donors)donor.beneficiaries.push(job.id);
  }
  if(costs.some(r=>['mana','life','tap-source','hand-card'].includes(r.kind)))obligations.push({id:job.id+'|cost-funding',anchor:job.id,question:'Are all printed costs simultaneously available at the required time?',status:'unknown',satisfiedBy:job.resourceLinks.flatMap(r=>r.providers),cost:job.cost,scope:'Source inventory is not actual mana/life/hand/tapped state; produced effects are unavailable before resolution'});
  if(job.kind.startsWith('access:')||job.kind.startsWith('payoff:')||job.kind==='native:infrastructure'||job.kind==='conversion:resource'||job.kind==='recovery:zone-access'){
   if(job.kind==='access:cast'||job.kind==='access:entry'||job.kind==='access:top-library'||job.kind==='payoff:cast-pressure')obligations.push({id:job.id+'|qualifying-input',anchor:job.id,question:'Which cards satisfy this observed event/access predicate?',status:job.status,satisfiedBy:job.supportingCards,missing:job.status==='unsupported'?['No recognized qualifying card in the complete known inventory']:[],scope:'Inventory relationship; no minimum density quota or event-frequency claim'});
   obligations.push({id:job.id+'|execution',anchor:job.id,question:'Can this source be deployed and its real prerequisites funded, repeatedly if needed?',status:'unknown',satisfiedBy:[],missing:[],requires:job.requires,cost:job.cost||null,scope:'State/timing/throughput unknown; no failed obligation inferred from an absent simulation event'});
   if(job.kind==='access:end-step')obligations.push({id:job.id+'|throughput',anchor:job.id,question:'Does the actual turn satisfy the printed end-step event/resource threshold?',status:'unknown',satisfiedBy:jobs.filter(j=>j.provides.some(p=>p.kind==='life-pressure')).map(j=>j.id),printedCondition:job.oracle,scope:'Potential pressure sources are not evidence of enough life lost in one turn'});
  }
  if(job.provides.some(p=>p.kind==='life-pressure'))obligations.push({id:job.id+'|win-conversion',anchor:job.id,question:'Can funded repetitions or another legal outlet actually finish opponents?',status:'unknown',satisfiedBy:[],scope:'No infinite, lethal, reliable timing or win rate inferred'});
  if(job.kind==='native:infrastructure'||job.kind.startsWith('access:')&&job.sourceIsPersistent)obligations.push({id:job.id+'|resilience',anchor:job.id,question:'Which legal protection or recovery channels could preserve/re-establish this particular source?',status:'unknown',satisfiedBy:[],candidates:jobs.filter(j=>j.kind==='recovery:zone-access'||j.kind==='utility:protection').map(j=>j.id),scope:'Candidate channels require target-type/zone/timing verification. No universal protection/recovery quota; absence is not a failed plan'});
  for(const donor of jobs)if(donor.id!==job.id&&job.supportingCards.includes(donor.card))donor.beneficiaries.push(job.id);
 }
 for(const job of jobs)job.beneficiaries=[...new Set(job.beneficiaries)].sort();
 const plans=jobs.filter(j=>j.kind.startsWith('access:')&&j.kind!=='access:one-shot'||j.kind.startsWith('payoff:')||j.kind.startsWith('recovery:')||j.kind.startsWith('win:')||j.kind==='conversion:resource'||j.kind==='native:infrastructure').map(j=>({id:j.id,anchorCard:j.card,observedDirection:j.kind,obligations:obligations.filter(o=>o.anchor===j.id).map(o=>o.id),supportingCards:j.supportingCards,competition:'Shared physical cards, tokens, mana and timing; directions may coexist or compete. No predetermined commander archetype.'}));
 const probe=executionEvidence?{status:'conditional supporting evidence only',comparisonUsed:false,unmodeledNeeds:executionEvidence.unmodeledNeeds||[],assumptions:executionEvidence.assumptions||'unknown',counts:executionEvidence.counts||null,absenceIsFailure:false}:{status:'not supplied',comparisonUsed:false,absenceIsFailure:false};
 return {schemaVersion:1,mode:'read-only shadow',commander:commander.name,totalCards:all.length,completeInput:cards.length===99&&!unknownCatalog,cards:rows,obligations,plans,executionEvidence:probe,coverage:{missingCatalogCards:all.filter(c=>c.catalogMissing).map(c=>c.name),omissions},
  limitations:['Supported means a recognized printed relationship or inventory prerequisite, not actual execution','Unknown mechanics are neither failures nor zero strength','No universal score, ranking, spending target, construction change or export mutation','Utility cards need no closed combo; plans and resources may overlap','Oracle grammar is bounded; token resources exist only after resolution, and conversion requires distinct actual costs']};
}

/** A mutation comparison holds the original observed directions accountable.
 * It identifies losses, not whether a legitimately different plan is stronger. */
export function compareJobLedgers(before,after){
 const key=j=>j.slot+'|'+j.kind+'|'+j.oracle,oldJobs=before.cards.flatMap(c=>c.jobs),newJobs=after.cards.flatMap(c=>c.jobs),next=new Map(newJobs.map(j=>[key(j),j]));
 const removed=oldJobs.filter(j=>!next.has(key(j))),supportChanges=[];
 for(const job of oldJobs){const n=next.get(key(job));if(!n)continue;const lost=job.supportingCards.filter(c=>!n.supportingCards.includes(c)),gained=n.supportingCards.filter(c=>!job.supportingCards.includes(c));if(lost.length||gained.length)supportChanges.push({card:job.card,kind:job.kind,removed:lost,added:gained,beforeStatus:job.status,afterStatus:n.status});}
 const providerIds=new Set(after.cards.map(c=>c.slot));
 const obligations=new Map(after.obligations.map(o=>[o.id,o]));
 return {mode:'shadow mutation diagnostic; no winner or acceptance decision',removedJobs:removed.map(j=>({card:j.card,kind:j.kind,status:j.status,oracle:j.oracle,reason:providerIds.has(j.slot)?'Printed function changed':'Original provider removed'})),
  addedJobs:newJobs.filter(j=>!oldJobs.some(o=>key(o)===key(j))).map(j=>({card:j.card,kind:j.kind,status:j.status})),supportChanges,
  lostPersistentAccess:removed.filter(j=>j.kind.startsWith('access:')&&j.sourceIsPersistent&&!j.consumesSource&&j.repeatability!=='one-shot').map(j=>({card:j.card,kind:j.kind})),
  obligationChanges:before.obligations.flatMap(o=>{const n=obligations.get(o.id);return n&&(n.status!==o.status||o.satisfiedBy?.some(id=>!n.satisfiedBy?.includes(id)))?[{id:o.id,question:o.question,beforeStatus:o.status,afterStatus:n.status,lostSupport:(o.satisfiedBy||[]).filter(id=>!n.satisfiedBy?.includes(id)),scope:n.scope}]:[];}),
  brokenBaselineObligations:before.obligations.filter(o=>{const j=oldJobs.find(j=>j.id===o.anchor);return !next.has(key(j));}).map(o=>({id:o.id,status:'unsupported',scope:'Original observed plan lost its anchor; alternative strategies are not ranked',question:o.question})),
  limitations:['Losing a baseline function is a specific tradeoff, not proof the edited deck is weaker','Support quantity changes do not fail an arbitrary density quota','Unmodeled state/throughput remains unknown']};
}
