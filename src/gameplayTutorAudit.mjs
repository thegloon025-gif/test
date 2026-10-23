/** Positive planning receipts replayed independently: no payment planner or
 * choice policy invocation. Blocked/unknown optimality is not certified. */
import {parseManaCost,manaAllowed} from './gameplayMana.mjs';
import {cardModel,cardTypes,cardSubtypes,isCreature,isColorless,castContext} from './gameplayCards.mjs';
import {nativeModel} from './gameplayNative.mjs';
export function auditTutorPlans(event,{board,pool,life,turn,definitions,commander,creatureCasts}){
 const errors=[],fail=s=>errors.push(s),landCount=[...board.values()].filter(b=>cardTypes(b.card).includes('Land')).length;
 const sourceState={life,pool:[...pool.values()],sources:[...board].map(([id,b])=>({id,types:cardTypes(b.card),subtypes:cardSubtypes(b.card),modes:b.model.modes.filter(m=>!m.minLands||landCount>=m.minLands),tapped:b.tapped,sick:isCreature(b.card)&&b.since===turn&&!b.model.haste}))};
 for(const f of event.facts||[]){const c=definitions.get(f.id);if(!c){fail('unknown tutor planning identity');continue;}
  const m=cardModel(c),reduction=[...board.values()].flatMap(b=>b.model.reducers).reduce((n,r)=>n+(r.kind==='colorless'&&isColorless(c)||r.kind==='creatures'&&isCreature(c)?r.amount:0),0);
  // First-creature reducers are validated by the actual later cast audit. The
  // projection receipt supplies its exact reduction, bounded by board support.
  const first=[...board.values()].flatMap(b=>b.model.reducers).filter(r=>r.kind==='firstCreature'&&isCreature(c)).reduce((n,r)=>n+r.amount,0);
  const base={cost:m.cost,context:castContext(c)},triggered=[...board].filter(([id,b])=>nativeModel(b.card).ulalek&&cardSubtypes(c).includes('Eldrazi')).map(([id,b])=>({cost:'{C}{C}',context:{kind:'ability',abilityType:'triggered',types:cardTypes(b.card)},reduction:0}));
  for(const key of ['now','next','jointNow','jointNext']){const plan=f[key];if(!['paid','blocked','unknown'].includes(plan?.status)){fail('invalid planning status');continue;}if(plan.status!=='paid')continue;
   const future=key==='next'||key==='jointNext',state={...sourceState,pool:future?[]:sourceState.pool,sources:sourceState.sources.map(s=>({...s,tapped:future?(board.get(s.id).model.noNaturalUntap?s.tapped:false):s.tapped,sick:future?false:s.sick}))},units=new Map(state.pool.map(u=>[u.id,u])),used=new Set(),expected=[base,...(key.startsWith('joint')?triggered:[])];let paid=0,balance=life;
   function spend(spent,cost,context,discount=0){const pips=parseManaCost(cost,discount),available=[];for(const u of spent){const actual=units.get(u.id);if(!actual||actual.type!==u.type||actual.restriction!==u.restriction)fail('planning unit invented/reused');else available.push(actual);units.delete(u.id);}if(!pips||pips.length!==available.length){fail('planning pip count');return;}const assign=new Map();function match(i,seen){for(let j=0;j<available.length;j++)if(!seen.has(j)&&manaAllowed(available[j],context)&&(pips[i].includes('*')||pips[i].includes(available[j].type))){seen.add(j);if(!assign.has(j)||match(assign.get(j),seen)){assign.set(j,i);return true;}}return false;}for(let i=0;i<pips.length;i++)if(!match(i,new Set()))fail('planning restricted or incorrect mana');}
   for(const r of plan.receipts||[])if(r.kind==='activation'){const s=state.sources.find(s=>s.id===r.source),mode=s?.modes[r.mode];if(!mode||used.has(s.id)||mode.tap&&(s.tapped||s.sick)||JSON.stringify(mode)!==JSON.stringify(r.ability)){fail('planning source unavailable');continue;}used.add(s.id);spend(r.spent,mode.cost||'',{kind:'ability',abilityType:'activated',types:s.types,subtypes:s.subtypes});if(!mode.outputs.some(o=>JSON.stringify(o)===JSON.stringify(r.produced.map(u=>u.type))))fail('planning production unsupported');for(const [i,u]of r.produced.entries()){if(u.id!==`${s.id}:${r.mode}:${i}`||units.has(u.id)||u.restriction!==(mode.restriction||'none'))fail('planning production identity/restriction');units.set(u.id,u);}balance-=mode.life||0;if(balance<=0)fail('planning life exhausted');}
   else{const p=expected[paid++];if(!p||r.cost!==p.cost||JSON.stringify(r.context)!==JSON.stringify(p.context)||(paid===1?r.reduction!==reduction+(future||creatureCasts===0?first:0):r.reduction!==0))fail('planning payment altered');spend(r.spent,r.cost,r.context,r.reduction);}
   if(paid!==expected.length)fail('planning payment omitted');
  }
 }
 return errors;
}
