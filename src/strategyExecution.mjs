/** Paired deterministic deployment probes, NOT a power score or full game.
 * Each endpoint uses its own legal setup line (they are not simultaneous
 * successes). No extra cards/mana are invented for unmodeled Oracle text. */
import {castFaces,castHasType,isLandSlot,landManaQuality,COLORS,oracleId} from './cards.mjs';
import {landAccess} from './deckQuality.mjs';
import {engineManaValue,engineContext,strategyInfrastructure} from './engineSupport.mjs';
import {manaCapacity,investmentEvidence} from './packageInvestment.mjs';
import {planFor,synergy,analysis} from './mechanics.mjs';
import {oracleText} from './roleEvidence.mjs';
const stable=(a,b)=>String(a).localeCompare(String(b));
function hash(s){let x=2166136261;for(const c of s)x=Math.imul(x^c.charCodeAt(0),16777619)>>>0;x^=x>>>16;x=Math.imul(x,2246822507)>>>0;x^=x>>>13;return x>>>0;}

/** Spend distinct units once, including true {C} and hybrid choices. Unknown
 * phyrexian/snow/variable costs fail closed. Generic reduction never pays pips. */
export function payExecutionCost(cost,sources,{extra='',reduction=0}={}){
 if(String(cost+extra).replace(/\{[^}]+\}/g,'').replace(/[,\s]/g,'')!=='')return null;
 const tokens=[...String(cost+extra).matchAll(/\{([^}]+)\}/g)].map(m=>m[1]);
 if(tokens.some(x=>!/^\d+$|^[WUBRGC](?:\/[WUBRGC])?$/.test(x)))return null;
 let generic=tokens.filter(x=>/^\d+$/.test(x)).reduce((n,x)=>n+Number(x),0);
 generic=Math.max(0,generic-reduction);
 const pips=tokens.filter(x=>!/^\d+$/.test(x)).map(x=>x.split('/'));
 const pool=sources.flatMap(s=>Array.from({length:s.units},()=>s.options));
 if(pool.length<generic+pips.length)return null;
 pips.sort((a,b)=>pool.filter(p=>p.some(x=>a.includes(x))).length-pool.filter(p=>p.some(x=>b.includes(x))).length);
 const used=new Set();
 function match(i){if(i===pips.length)return true;for(let j=0;j<pool.length;j++)if(!used.has(j)&&pool[j].some(x=>pips[i].includes(x))){used.add(j);if(match(i+1))return true;used.delete(j);}return false;}
 if(!match(0))return null;
 for(let j=0;j<pool.length&&generic;j++)if(!used.has(j)){used.add(j);generic--;}
 // Flattened remaining units retain their production choices; each endpoint
 // ends the turn after its target spell so mana never untaps within a turn.
 return pool.flatMap((options,i)=>used.has(i)?[]:[{units:1,options}]);
}
const manaCost=c=>castFaces(c)[0]?.mana_cost||c.mana_cost|| (engineManaValue(c)?`{${engineManaValue(c)}}`:'{0}');
function manaSource(c,commander,plan,lands,spells){
 const text=oracleText(c);
 if(isLandSlot(c)){
  const q=landManaQuality(c),a=landAccess(c,{commander,plan,lands,spells});
  // Conditional/paid/restricted/consumed lands do not acquire fictional mana.
  if(q.restricted||q.needsActivationPayment||q.consumable||q.unusable||/\bif\b|could produce|remove .*counter|\bsacrifice\b/i.test(text))return null;
  const options=[...a.reliable,...(a.colorless?['C']:[])];
  return options.length?{units:1,options,tapped:q.entersTapped}:null;
 }
 const m=manaCapacity(c);if(!m.units)return null;
 if(/\{[1-9]\}[^\n]*:\s*Add/i.test(text))return null;
 const options=new Set();
 for(const line of text.split('\n'))if(/^\{T\}(?:, Mill (?:a|one) card)?\s*:\s*(?:Mill (?:a|one) card\.\s*)?Add/i.test(line)){
  const body=line.slice(line.indexOf(':')+1);for(const p of body.matchAll(/\{([WUBRGC])\}/g))options.add(p[1]);
  if(/mana of any colou?r/i.test(body))for(const color of commander.color_identity||COLORS)options.add(color);
 }
 if(!options.size||m.units>1&&options.size>1)return null;
 return {units:m.units,options:[...options],sick:castHasType(c,'Creature'),tapped:/enters (?:the battlefield )?tapped/i.test(text)};
}

export function strategyExecution(cards,commander,plan=planFor(commander),{trials=128,turns=8,seed='strategy-execution-v1',evidence=investmentEvidence(cards,commander,plan)}={}){
 if(!Number.isInteger(trials)||trials<1||trials>1024||turns<2||turns>10)throw Error('Invalid deployment probe bounds.');
 const lands=cards.filter(isLandSlot),spells=cards.filter(c=>!isLandSlot(c)),context={...engineContext(cards,plan),commander};
 const sources=new Map(cards.map(c=>[c,manaSource(c,commander,plan,lands,spells)]));
 const infrastructure=new Map(spells.map(c=>[c,strategyInfrastructure(c,context)]));
 const draws=new Map(evidence.drawEngines.map(row=>[row.card,row]));
 const threat=new Set(spells.filter(c=>engineManaValue(c)>=5&&(context.tribal.includes(c)||synergy(c,plan,analysis(c)).roles.includes('finisher'))));
 const activation=oracleText(commander).match(/whenever you cast an? (\w+) spell, you may pay ((?:\{[0-9WUBRGC]+\})+)/i);
 const kinds=['cascade','castCopy','passiveTriggerCopy','activatedTriggerCopy','costReduction','tutor'];
 const outcomes={commanderDeployed:0,supportedEngineOnline:0,...Object.fromEntries(kinds.map(k=>[k+'Online',0])),repeatableAccessOnline:0,threatCast:0,...(activation?{commanderFollowupWithPayment:0}:{})};
 const samples=Object.fromEntries(Object.keys(outcomes).map(k=>[k,'']));
 const names=new Map(cards.map((c,i)=>[i,String(oracleId(c))]));
 const engineKind=kind=>kind==='supportedEngineOnline'||kinds.some(k=>kind===k+'Online');
 const targetSupport=(c,kind)=>engineKind(kind)?infrastructure.get(c).filter(e=>kind==='supportedEngineOnline'||kind===e.kind+'Online').flatMap(e=>e.cards.filter(name=>{
  if(!['passiveTriggerCopy','activatedTriggerCopy'].includes(e.kind))return true;
  const source=spells.find(x=>x.name===name);return source&&/when (?:you cast|this [^.,]* enters)|whenever [^.,]* enters/i.test(oracleText(source));
 })): draws.get(c.name)?.triggers.filter(t=>t.supported).flatMap(t=>t.cards)||[];
 for(let trial=0;trial<trials;trial++){
  // Stable priorities for shared records, including each repeated basic slot.
  const counts=new Map();const order=cards.map((c,i)=>{const name=names.get(i),n=counts.get(name)||0;counts.set(name,n+1);return {c,key:hash(`${seed}:${trial}:${name}:${n}`),i};}).sort((a,b)=>a.key-b.key||a.i-b.i).map(x=>x.c);
  for(const kind of Object.keys(outcomes)){
   const hand=order.slice(0,7),board=[];let next=7,target=null,targetTurn=0,success=false,commanderTurn=0;
   for(let turn=1;turn<=turns&&!success;turn++){
    if(next<order.length)hand.push(order[next++]);
    const landChoices=hand.filter(c=>isLandSlot(c)&&sources.get(c));
    landChoices.sort((a,b)=>Number(sources.get(a).tapped)-Number(sources.get(b).tapped)||sources.get(b).options.length-sources.get(a).options.length||stable(a.name,b.name));
    const land=landChoices[0];if(land){hand.splice(hand.indexOf(land),1);board.push({c:land,turn});}
    let available=board.filter(b=>b.turn<turn||!sources.get(b.c)?.tapped&&!sources.get(b.c)?.sick).flatMap(b=>sources.get(b.c)?[sources.get(b.c)]:[]);
    // Spend only on observed, simple sustained setup mana. Creatures wait a
    // turn; rocks may be tapped immediately if they do not enter tapped.
    for(let setup=0;setup<4;setup++){
     const choices=hand.filter(c=>!isLandSlot(c)&&sources.get(c)).sort((a,b)=>engineManaValue(a)-engineManaValue(b)||sources.get(b).units-sources.get(a).units||stable(a.name,b.name));
     const c=choices.find(c=>payExecutionCost(manaCost(c),available)!==null);if(!c)break;
     available=payExecutionCost(manaCost(c),available);hand.splice(hand.indexOf(c),1);board.push({c,turn});
     const src=sources.get(c);if(!src.sick&&!src.tapped)available.push(src);
    }
    if(kind==='commanderDeployed'||kind==='commanderFollowupWithPayment'){
     if(!commanderTurn){const rest=payExecutionCost(manaCost(commander),available);if(rest){available=rest;commanderTurn=turn;if(kind==='commanderDeployed')success=true;}}
     if(kind==='commanderFollowupWithPayment'&&commanderTurn){const qualifying=new Set(context.tribal.filter(c=>castFaces(c).some(f=>(f.type_line||c.type_line||'').includes(activation[1]))));
      success=hand.some(c=>qualifying.has(c)&&payExecutionCost(manaCost(c),available,{extra:activation[2]})!==null);}
     continue;
    }
    if(kind==='threatCast'){success=hand.some(c=>threat.has(c)&&payExecutionCost(manaCost(c),available)!==null);continue;}
    if(!target){
     const choices=hand.filter(c=>engineKind(kind)?infrastructure.get(c)?.some(e=>kind==='supportedEngineOnline'||kind===e.kind+'Online'):draws.has(c.name)).sort((a,b)=>engineManaValue(a)-engineManaValue(b)||stable(a.name,b.name));
     const c=choices.find(c=>payExecutionCost(manaCost(c),available)!==null);
     if(c){available=payExecutionCost(manaCost(c),available);target=c;targetTurn=turn;hand.splice(hand.indexOf(c),1);}
    }
    if(!target)continue;
    const support=targetSupport(target,kind),row=draws.get(target.name);
    if(kind==='repeatableAccessOnline'&&row.independent&&turn>targetTurn){
     const line=oracleText(target).split('\n').find(l=>/\{T\}[^:]*:.*\bdraw\b/i.test(l));
     if(line){const payment=line.slice(0,line.indexOf(':')).replace(/\{T\}/g,'');if(payExecutionCost(payment,available)!==null)success=true;}
    }
    // A real qualifying follow-up must be affordable AFTER deploying the
    // engine. No hypothetical draw, cascade output or copied mana is added.
    const abilities=infrastructure.get(target)||[];
    const copy=abilities.some(e=>e.kind==='activatedTriggerCopy');
    const payment=copy?oracleText(target).split('\n').find(l=>/copy target triggered ability/i.test(l))?.split(':')[0]||'{X}':'';
    const tapReady=!/\{T\}/.test(payment)||!castHasType(target,'Creature')||turn>targetTurn;
    // Explicit simple reductions apply only after the reducer was deployed;
    // first-spell reductions wait a turn to avoid reusing that turn's cast.
    const reducer=oracleText(target).match(/(colorless spells you cast|the first creature spell you cast each turn) costs? \{(\d+)\} less/i);
    const eligible=c=>reducer&&turn>targetTurn&&(reducer[1].startsWith('colorless')?castFaces(c).every(f=>(f.colors||c.colors||c.color_identity||[]).length===0):castHasType(c,'Creature'));
    if(tapReady&&hand.some(c=>support.includes(c.name)&&payExecutionCost(manaCost(c),available,{extra:payment.replace(/\{T\}/g,''),reduction:eligible(c)?Number(reducer[2]):0})!==null))success=true;
    if(kind==='repeatableAccessOnline'&&row.topAccess&&next<order.length&&row.topCards.includes(order[next].name)&&payExecutionCost(manaCost(order[next]),available)!==null)success=true;
   }
   if(success)outcomes[kind]++;samples[kind]+=success?'1':'0';
  }
 }
 const unmodeledNeeds=(plan.needs||[]).filter(n=>n.kind!=='typed-cast').map(n=>n.kind);
 const comparisonEligible=!!context.tribal.length&&!unmodeledNeeds.length;
 return {trials,turns,seed,comparisonEligible,unmodeledNeeds,counts:outcomes,samples,rates:Object.fromEntries(Object.entries(outcomes).map(([k,n])=>[k,Math.round(n/trials*1000)/10])),
  assumptions:'Separate no-mulligan eight-turn setup probes, one land and one natural draw/turn. Exact colored/hybrid/{C} payment, tapped lands and mana-creature sickness. No opponents, extra draw, tutors resolving, unrecognized reductions, bursts, tokens, combat, ninjutsu or tax. Engine endpoint requires a castable qualifying follow-up; top access requires an eligible actual next card. Not simultaneous outcomes, win rates or external power.'};
}
/** A paired endpoint improvement must survive a one-sided exact sign test,
 * Bonferroni-corrected across endpoints. Every other endpoint must also have
 * nondecreasing observed success. This is a conservative tie-break certificate,
 * not a calibrated power objective or a guarantee outside these probes. */
export function executionDominates(a,b){
 if(a.comparisonEligible===false||b.comparisonEligible===false)return false;
 if(a.seed!==b.seed||a.trials!==b.trials||a.turns!==b.turns)return false;
 const keys=Object.keys(b.counts);
 if(!keys.every(k=>Number.isFinite(a.counts[k])&&a.counts[k]>=b.counts[k]))return false;
 return keys.some(k=>{
  let wins=0,losses=0;for(let i=0;i<a.trials;i++){const x=a.samples[k][i],y=b.samples[k][i];if(x==='1'&&y==='0')wins++;if(x==='0'&&y==='1')losses++;}
  const n=wins+losses;if(!n||wins<=losses)return false;
  let probability=2**(-n),tail=0;for(let j=0;j<=n;j++){if(j>=wins)tail+=probability;probability*= (n-j)/(j+1);}
  return tail<.05/keys.length;
 });
}
