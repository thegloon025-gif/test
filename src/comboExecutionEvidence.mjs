/** Requirement audit, not a rules engine, timing estimator or policy override.
 * Spellbook instructions and selected Oracle records remain the source of
 * truth; inventory, game state, a conditional line and reliability differ. */
import {faces,oracleId} from './cards.mjs';
import {normalizedName} from './combos.mjs';
import {satisfyTemplates} from './comboTemplates.mjs';
const unique=a=>[...new Set(a.filter(Boolean))];
const lines=a=>(a||[]).flatMap(s=>String(s).split(/\r?\n/)).map(s=>s.trim()).filter(Boolean);
const zones={B:'battlefield',H:'hand',G:'graveyard',E:'exile',L:'library',C:'command zone'};
const symbols=s=>[...String(s||'').matchAll(/\{([^}]+)\}/g)].map(m=>m[1]);
const states=u=>Object.fromEntries(['battlefieldCardState','exileCardState','libraryCardState','graveyardCardState'].map(k=>[k,u[k]||'']));
function resultKind(text){
 const patterns=[[/colorless mana/i,'colorless mana'],[/\binfinite.*damage/i,'damage'],[/\binfinite.*(?:ETB|enters)/i,'ETBs'],[/\binfinite.*(?:storm|casts?)/i,'casts'],[/\binfinite.*tokens/i,'tokens'],[/\binfinite.*mana/i,'mana']];
 return patterns.filter(([pattern])=>pattern.test(text)).map(([,kind])=>kind);
}

export function auditComboExecutions(variants,{commander,cards=[],catalog=cards,proposedIds=[]}={}){
 if(!commander?.name)throw Error('Combo requirement audit requires a commander.');
 const selected=[commander,...cards].filter(Boolean),lookup=new Map(),owned=new Map();
 // Actual selected records override aliases of unselected catalog records.
 for(const c of [...catalog,...selected])for(const name of [c.name,...faces(c).map(f=>f.name)])lookup.set(normalizedName(name),c);
 for(const c of selected)owned.set(oracleId(c),(owned.get(oracleId(c))||0)+1);
 const proposed=new Set(proposedIds),rows=[];
 for(const variant of [...new Map((variants||[]).filter(v=>v?.isInfinite).map(v=>[v.id,v])).values()]){
  const missing=[],reserved=new Set(),steps=lines(variant.steps),prerequisites=unique(lines(variant.prerequisites));
  const requirements=(variant.uses||[]).map(u=>{
   const card=lookup.get(normalizedName(u.name)),quantity=Number(u.quantity??1),available=card?owned.get(oracleId(card))||0:0;
   const isCommander=!!card&&oracleId(card)===oracleId(commander);
   const satisfied=Number.isInteger(quantity)&&quantity>0&&available>=quantity&&(!u.mustBeCommander||isCommander);
   if(!satisfied)missing.push({name:u.name,required:quantity,available,reason:!card?'not in catalog':u.mustBeCommander&&!isCommander?'must be commander':'quantity or inventory'});
   if(card)reserved.add(oracleId(card));
   const fs=card?faces(card):[],mentionedBack=fs.slice(1).filter(f=>f.name&&normalizedName(f.name)!==normalizedName(fs[0].name)&&steps.some(step=>step.toLowerCase().includes(f.name.toLowerCase())));
   return {name:u.name,quantity,available,isCommander,mustBeCommander:u.mustBeCommander===true,
    startingZones:(u.zoneLocations||[]).map(z=>({code:z,name:zones[z]||'unknown zone'})),...states(u),
    castCost:fs[0]?.mana_cost??card?.mana_cost??null,
    oracleFaces:fs.map(f=>({name:f.name,manaCost:f.mana_cost||'',type:f.type_line||'',text:f.oracle_text||''})),
    setupWarnings:mentionedBack.map(f=>({kind:card.layout==='transform'?'back-face required by recorded steps':'non-front face used by recorded steps',face:f.name,
     detail:card.layout==='transform'?'Owning the card does not establish transformation. Pay all front-face transformation/craft costs and supply its additional resources.':'Review this face’s casting/zone rules and costs. A modal card does not require a transform action.',setupOracle:fs[0]?.oracle_text||''}))};
  });
  const templates=variant.templateRequirements||[];
  const matched=satisfyTemplates(templates,selected,{reservedIds:reserved,idOf:oracleId});
  const inventoryComplete=missing.length===0&&matched.satisfied&&requirements.length>0;
  const actions=steps.map(text=>({text,manaSymbols:symbols(text),requiresTap:/\{T\}|\btapp?ing\b|\btap\b/i.test(text),
   resources:/sacrifice|discard|remove .*counter|exile|pay .*life/i.test(text)?'Additional resource action; see full instruction':null,
   priority:/holding priority|in response|before .*resolv/i.test(text)}));
  const allText=[...prerequisites,...steps].join('\n');
  const outcomes=(variant.results||[]).map(text=>({text,kinds:resultKind(text)}));
  // Candidates for manual outlet review only: neither triggers nor a mana
  // sink establish availability of its required creatures/counters/colors.
  const outletCandidates=selected.flatMap(c=>faces(c).flatMap(f=>String(f.oracle_text||'').split('\n').filter(l=>/deals? (?:\d+|X|that much) damage to (?:any target|each opponent|target (?:player|opponent))/i.test(l)).map(text=>({card:c.name,text,
   cost:text.includes(':')?text.slice(0,text.indexOf(':')):null,needsReview:true}))));
  rows.push({id:variant.id,url:variant.url,proposed:proposed.has(variant.id),inventoryComplete,missing,
   requiredNamedQuantity:requirements.reduce((n,r)=>n+r.quantity,0),requiredTemplateQuantity:templates.reduce((n,t)=>n+Number(t.quantity||1),0),
   commanderRequired:requirements.some(r=>r.isCommander||r.mustBeCommander),requirements,
   templates:templates.map(t=>({...t,startingZones:(t.zoneLocations||[]).map(z=>({code:z,name:zones[z]||'unknown zone'}))})),
   templateInventory:{satisfied:matched.satisfied,matches:matched.matched,unresolved:matched.unresolved,missing:matched.missing},
   initialMana:{spellbook:variant.manaNeeded||null,manaValueNeeded:variant.manaValueNeeded||null,symbols:symbols(variant.manaNeeded),
    trueColorlessSymbols:symbols(variant.manaNeeded).filter(x=>x==='C').length,
    note:'Published starting mana is not total deployment cost. Mana symbols in actions may be recycled and must not simply be summed.'},
   prerequisites,actions,outcomes,
   resourceReview:unique([/summoning sickness|haste/i.test(allText)?'Recorded summoning-sickness/haste prerequisite':null,
    actions.some(a=>a.requiresTap)?'Required tap abilities need untapped objects; a creature using its own tap ability needs haste or control since turn began':null,
    /counter/i.test(allText)?'Counters: see required quantities and instructions':null,
    /tokens?|creatures? you control|you control/i.test(allText)?'Additional permanents/tokens/resources: see full prerequisites and actions':null]),
   timing:{status:'unknown',earliestTurn:null,reliableTurn:null,reason:'Cached loop instructions do not prove draw order, paid deployment, state transitions or reliable execution timing. A possible turn-six example is not a reliability estimate.'},
   conversion:{publishedDirectWinRoute:(variant.results||[]).some(r=>/infinite damage|you win the game|opponents lose the game/i.test(r)),
    status:'not verified',outletCandidates,note:'Infinite mana/tokens/ETBs alone are not a certified win. Check legal targets, usable mana colors, outlet availability, additional costs and priority.'},
   executionVerified:false,podPolicyAssessment:{status:'unknown',assignedBracket:null,reason:'Pod profile is not enabled without validated timing/reliability evidence; a two-card count alone cannot establish its pod classification.'}});
 }
 const groups=new Map();for(const r of rows){const key=JSON.stringify([r.requirements.map(u=>[normalizedName(u.name),u.quantity]).sort(),r.templates.map(t=>[t.name,t.quantity]).sort()]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r.id);}
 return {method:'Recorded requirements plus catalog state/cost review; no simulator, timing estimate or policy change',
  inventoryInfinite:rows.filter(r=>r.inventoryComplete).length,proposedInfinite:rows.filter(r=>r.proposed).length,
  redundantPieceSetGroups:[...groups.values()].filter(ids=>ids.length>1),independentWinConditions:null,
  timingEvidenceAvailable:false,executionVerified:false,combinations:rows};
}
