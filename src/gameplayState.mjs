/** Stage 2: bounded stateful access and deployment. Observational only. */
import {deploymentOrder} from './gameplayDeployment.mjs';
import {planManaPayments,parseManaCost} from './gameplayMana.mjs';
import {cardModel,cardTypes,cardSubtypes,cardText,front,isLand,isCreature,isColorless,castContext} from './gameplayCards.mjs';
import {accessModel,accessCondition,accessConditionStatus,knownPower,entryMatches,matchesCastFilter,topCastAllowed,printedManaValue} from './gameplayAccess.mjs';
import {GAMEPLAY_POLICIES,choosePilotAction,strategyChannels,rampUseful} from './gameplayPilot.mjs';
import {planFor} from './mechanics.mjs';
import {planTypes} from './engineSupport.mjs';

export function evaluateGameplay({commander,cards,seed='gameplay-stage2-v1',turns=8,order,script,policy='native',mulligan='none',access=true,maxManaStates=4000,maxActions=24,onPreAction=null}={}) {
  if(!commander||!Array.isArray(cards)||cards.length<7||cards.length>99||!Number.isInteger(turns)||turns<1||turns>8||!GAMEPLAY_POLICIES.includes(policy)||!['none','one-free'].includes(mulligan)||!Number.isInteger(maxActions)||maxActions<1||maxActions>40||script&&mulligan!=='none')throw Error('Invalid Stage 2 bounds/options');
  order??=deploymentOrder(cards,seed);
  if(order.length!==cards.length||new Set(order).size!==cards.length||order.some(i=>!Number.isInteger(i)||i<0||i>=cards.length))throw Error('Order must be an exact permutation');
  const models=new Map(), make=(card,id)=>{
    if(!models.has(card))models.set(card,{model:cardModel(card,commander.color_identity||[]),access:accessModel(card)});
    return {id,card,...models.get(card)};
  };
  const slots=cards.map((c,i)=>make(c,'deck-'+i)),command=make(commander,'commander');
  const nativeTypes=planTypes(planFor(commander));if(!nativeTypes.length)nativeTypes.push(...cardSubtypes(commander));
  const chosenType=[...nativeTypes].sort((a,b)=>cards.filter(c=>cardSubtypes(c).includes(b)).length-cards.filter(c=>cardSubtypes(c).includes(a)).length||a.localeCompare(b))[0]||'Creature';
  let library=order.map(i=>slots[i]),hand=library.splice(0,7),board=[],graveyard=[],exile=[],opponents=[],ceased=[],pool=[],life=40,turn=0,creatureCasts=0,landPlayed=false,commanderCast=false,tokenId=0,decked=false,lost=false,lastTop=null;
  const trace=[],observations=[],stats={casts:[],commanderDeploymentTurn:null,setupBeforePayableCommander:0,optionalPayments:[],effectDraws:0,naturalDraws:0,accessDiscards:0,cleanupDiscards:0,returnedToTop:0,topCasts:0,accessSacrifices:0,accessSpells:0,activations:0,selections:0,manaStates:0,manaSearches:0,boundHits:0,actionBoundHits:0,usedEngines:[],mulligans:0};
  const emit=e=>trace.push({turn,...e}),context=()=>({hand,board,graveyard,chosenType}),pilotContext=()=>({policy,turn,turns,commander,board,hand,nativeTypes});
  const opening=hand.map(s=>({id:s.id,card:s.card.name}));
  if(mulligan==='one-free'&&(hand.filter(s=>isLand(s.card)).length<2||hand.filter(s=>isLand(s.card)).length>5)){
    const previous=hand.map(s=>s.id);order=deploymentOrder(cards,seed+':free-mulligan:1');library=order.map(i=>slots[i]);hand=library.splice(0,7);stats.mulligans=1;
    emit({event:'mulligan',reason:'outside two-to-five land keep window',returned:previous,redraw:hand.map(s=>s.id),paidBottom:0,order});
  }
  emit({event:'opening',hand:hand.map(s=>({id:s.id,card:s.card.name}))});
  function active(){return board.filter(s=>!s.consumed);}
  function toGrave(s){(s.token?ceased:graveyard).push(s);}
  function sourceState(){const landCount=active().filter(s=>isLand(s.card)).length;return {pool,life,sources:board.map(s=>({id:s.id,types:cardTypes(s.card),subtypes:cardSubtypes(s.card),modes:s.model.modes.filter(m=>!m.minLands||landCount>=m.minLands),tapped:s.tapped,consumed:s.consumed,sick:isCreature(s.card)&&s.since===turn&&!s.model.haste}))};}
  function pay(state,payments,record=true){const r=planManaPayments(state,payments,{maxStates:maxManaStates,optimized:true});if(record){stats.manaSearches++;stats.manaStates+=r.states;if(r.status==='unknown'&&r.reason.includes('bound'))stats.boundHits++;}return r;}
  function reductionFor(c){return active().flatMap(s=>s.model.reducers).reduce((n,r)=>n+((r.kind==='colorless'&&isColorless(c)||r.kind==='creatures'&&isCreature(c)||r.kind==='firstCreature'&&isCreature(c)&&!creatureCasts)?r.amount:0),0);}
  function castPlan(slot,reserve=true,record=true){
    const m=slot.model;if((!m.permanent&&!m.ritualMana&&!(access&&slot.access.direct))||cardSubtypes(slot.card).includes('Aura'))return {status:'unknown',reason:'target/nonpermanent effects unsupported',states:0};
    if(m.extraCost||m.cost==null||m.cost===''||!parseManaCost(m.cost)||active().some(s=>s.model.unknownTax))return {status:'unknown',reason:'unknown/unpayable base cost or battlefield tax',states:0};
    if(/enters under the control of an opponent/i.test(cardText(slot.card)))return {status:'unknown',reason:'enters under opponent control',states:0};
    const triggers=active().filter(s=>s.model.castPayment&&cardSubtypes(slot.card).includes(s.model.castPayment.subtype));
    const payments=[{label:'spell',cost:m.cost,reduction:reductionFor(slot.card),context:castContext(slot.card,slot===command)}];
    if(reserve)for(const s of triggers)payments.push({label:'cast-trigger:'+s.id,cost:s.model.castPayment.cost,context:{kind:'ability',abilityType:'triggered',types:cardTypes(s.card)}});
    return {...pay(sourceState(),payments,record),triggers};
  }
  function commit(r,onPayment){
    pool=r.pool;life=r.life;
    for(const receipt of r.receipts)if(receipt.kind==='activation'){
      const s=board.find(s=>s.id===receipt.source);if(receipt.tap)s.tapped=true;if(receipt.sacrifice){s.consumed=true;toGrave(s);}
      emit({event:'mana-activation',card:s.card.name,...receipt});
    }else onPayment(receipt);
  }
  function useEngine(s,kind){if(!stats.usedEngines.some(e=>e.id===s.id&&e.kind===kind))stats.usedEngines.push({id:s.id,card:s.card.name,kind,turn});}
  function selectionPriority(s){
    if(isLand(s.card))return hand.filter(h=>isLand(h.card)).length===0&&active().filter(b=>isLand(b.card)).length<6?0:5;
    if(rampUseful(s,pilotContext())&&turn<6)return 1;
    if(s.access.triggers.length||s.access.abilities.length||s.access.top)return 2;
    return cardSubtypes(s.card).some(t=>nativeTypes.includes(t))?3:4;
  }
  function worstHand(){return [...hand].sort((a,b)=>selectionPriority(b)-selectionPriority(a)||(printedManaValue(b.card)||0)-(printedManaValue(a.card)||0)||b.id.localeCompare(a.id))[0];}
  function draw(count,reason,source){for(let i=0;i<count;i++){
    const s=library.shift();if(!s){decked=true;lost=true;emit({event:'empty-draw',reason,source});break;}
    hand.push(s);if(reason==='natural')stats.naturalDraws++;else stats.effectDraws++;
    emit({event:reason==='natural'?'draw':'access-draw',card:s.card.name,id:s.id,reason,source});
  }}
  function effects(effects,source,reason){
    const before={draws:stats.effectDraws,selections:stats.selections,exile:exile.length};
    emit({event:'access-resolving',source:source.id,reason,effects});
    for(const e of effects){if(lost)break;
      if(e.kind==='draw')draw(e.count,reason,source.id);
      else if(e.kind==='loseLife'){life-=e.count;emit({event:'life-loss',source:source.id,count:e.count});if(life<=0){lost=true;emit({event:'model-loss',reason:'life exhausted'});}}
      else if(e.kind==='giveAway'&&!source.consumed){source.consumed=true;opponents.push(source);emit({event:'give-away',id:source.id});}
      else if(e.kind==='discard'||e.kind==='handTop')for(let i=0;i<e.count&&hand.length;i++){
        const s=worstHand();hand.splice(hand.indexOf(s),1);if(e.kind==='discard'){graveyard.push(s);stats.accessDiscards++;}else{library.unshift(s);stats.returnedToTop++;}
        emit({event:e.kind==='discard'?'discard':'hand-to-top',id:s.id,card:s.card.name,source:source.id});
      }
      else if(e.kind==='exileTop'){
        const s=library.shift();if(s){exile.push(s);emit({event:'top-exiled',id:s.id,card:s.card.name,source:source.id});}
      }else if(e.kind==='scry'||e.kind==='surveil'){
        const looked=library.splice(0,e.count),ranked=[...looked].sort((a,b)=>selectionPriority(a)-selectionPriority(b)||looked.indexOf(a)-looked.indexOf(b));
        const keep=ranked.filter(s=>selectionPriority(s)<5&&(printedManaValue(s.card)||0)<=Math.max(4,turn+2)),reject=ranked.filter(s=>!keep.includes(s));
        library.unshift(...keep);if(e.kind==='scry')library.push(...reject);else graveyard.push(...reject);
        if(looked.length)stats.selections++;emit({event:'selection',kind:e.kind,source:source.id,looked:looked.map(s=>s.id),keep:keep.map(s=>s.id),reject:reject.map(s=>s.id),destination:e.kind==='scry'?'bottom':'graveyard'});
      }
    }
    emit({event:'access-resolved',source:source.id,reason});if(stats.effectDraws>before.draws||stats.selections>before.selections||exile.length>before.exile)useEngine(source,'access');
  }
  function triggerAccess(phase,eventSlot,origin){
    if(!access)return;
    const pending=active().flatMap(source=>source.access.triggers.filter(t=>t.phase===phase||phase==='entry'&&t.phase==='entrySelf'&&source.id===eventSlot.id).map(trigger=>({source,trigger})));
    for(const {source,trigger:t}of pending){
      if(t.condition&&accessConditionStatus(t.condition,context())==='unknown'||t.power&&knownPower(eventSlot,board)===null){emit({event:'access-trigger-unknown',source:source.id,phase,reason:'power modifiers/counters not modeled'});continue;}
      const matches=t.phase==='cast'?matchesCastFilter(eventSlot.card,t.filter):t.phase==='entrySelf'?source.id===eventSlot.id&&accessCondition(t.condition,context()):entryMatches(t,source,eventSlot,context());
      if(!matches)continue;
      emit({event:'access-trigger-pending',source:source.id,phase,causedBy:eventSlot.id,origin});
      effects(t.effects,source,'trigger:'+phase);
    }
  }
  function spawn(slot,phase){for(const s of slot.model.spawn.filter(s=>s.phase===phase)){
    emit({event:'trigger-resolved',source:slot.id,phase,effect:'create '+s.count+' '+s.subtype});
    for(let i=0;i<s.count;i++){const card={name:'Eldrazi '+s.subtype,type_line:'Token Creature — Eldrazi '+s.subtype,mana_cost:'',power:s.subtype==='Spawn'?'0':'1',oracle_text:'Sacrifice this token: Add {C}.'},token={...make(card,'token-'+tokenId++),token:true,since:turn,tapped:false};board.push(token);emit({event:'token-created',id:token.id,card});triggerAccess('entry',token);}
  }}
  function cast(slot,origin='hand',requireOptional=false){
    if(slot===command)origin='command';
    let r=castPlan(slot,true),declined;if(r.status!=='paid'&&!requireOptional){declined=r;r=castPlan(slot,false);}if(r.status!=='paid')return r;
    if(slot===command)commanderCast=true;else if(origin==='library'){if(library[0]!==slot)throw Error('Top changed before casting');library.shift();stats.topCasts++;}else hand.splice(hand.indexOf(slot),1);
    commit(r,receipt=>{
      if(receipt.label==='spell'){
        emit({event:'cast-paid',id:slot.id,card:slot.card.name,origin,...receipt});
        for(const s of r.triggers)emit({event:'cast-trigger-pending',source:s.id,cost:s.model.castPayment.cost});
        if(receipt.reduction){let remaining=[...slot.model.cost.matchAll(/\{(\d+)\}/g)].reduce((n,m)=>n+Number(m[1]),0);for(const s of active()){
          const amount=s.model.reducers.filter(r=>r.kind==='colorless'&&isColorless(slot.card)||r.kind==='creatures'&&isCreature(slot.card)||r.kind==='firstCreature'&&isCreature(slot.card)&&!creatureCasts).reduce((n,r)=>n+r.amount,0);
          if(amount&&remaining){useEngine(s,'reduction');remaining=Math.max(0,remaining-amount);}
        }}
      }else{emit({event:'optional-trigger-paid',card:slot.card.name,...receipt,effect:'unknown: copying not simulated'});stats.optionalPayments.push({turn,card:slot.card.name,cost:receipt.cost});for(const s of r.triggers)useEngine(s,'cast-payment');}
    });
    if(declined)for(const s of r.triggers)emit({event:'optional-trigger-declined',source:s.id,status:declined.status,reason:declined.reason});
    if(isCreature(slot.card))creatureCasts++;stats.casts.push({turn,id:slot.id,card:slot.card.name,commander:slot===command,origin});
    triggerAccess('cast',slot,origin);spawn(slot,'cast');
    if(lost){emit({event:'resolution-aborted',id:slot.id,reason:'model loss during cast triggers'});return r;}
    if(slot.model.ritualMana){const produced=slot.model.ritualMana.map((type,n)=>({id:slot.id+':ritual:'+n,source:slot.id,type,restriction:'none'}));pool.push(...produced);emit({event:'ritual-resolved',source:slot.id,produced});graveyard.push(slot);}
    else if(!slot.model.permanent){if(access&&slot.access.direct){effects(slot.access.direct,slot,'spell');stats.accessSpells++;}graveyard.push(slot);emit({event:'spell-resolved',id:slot.id});}
    else{const s={...slot,since:turn,tapped:slot.model.tapped};board.push(s);if(slot===command)stats.commanderDeploymentTurn=turn;emit({event:'permanent-resolved',id:s.id,card:s.card.name,tapped:s.tapped,effects:{manaUnknown:s.model.unknown.filter(x=>!x.startsWith('other Oracle effects')),accessUnknown:s.access.unknown,other:'other Oracle effects unmodeled'}});spawn(s,'entry');triggerAccess('entry',s);}
    return r;
  }
  function abilityPlan(s,i,record=true){const a=s.access.abilities[i];
    if(a&&accessConditionStatus(a.condition,context())==='unknown')return {status:'unknown',reason:'activation power prerequisite unknown: modifiers/counters',states:0};
    if(!a||s.consumed||a.tap&&(s.tapped||isCreature(s.card)&&s.since===turn&&!s.model.haste)||a.once&&s.lastAccess===turn||!accessCondition(a.condition,context())||life<=a.life)return {status:'blocked',reason:'activation prerequisite: tappedness, sickness, condition, once/turn or life',states:0};
    const state=sourceState();state.life-=a.life;if(a.tap||a.sacrifice)state.sources=state.sources.map(b=>b.id===s.id?{...b,modes:a.tap?[]:b.modes.filter(m=>!m.sacrifice)}:b);
    return pay(state,[{label:'access:'+s.id,cost:a.cost,context:{kind:'ability',abilityType:'activated',types:cardTypes(s.card)}}],record);
  }
  function activate(s,i){const a=s.access.abilities[i],r=abilityPlan(s,i);if(r.status!=='paid')return r;
    emit({event:'access-announced',source:s.id,abilityIndex:i});
    // Mana fees first; then this ability's tap/sacrifice/life costs; effects last.
    const paidLife=r.life;r.life+=a.life;commit(r,receipt=>emit({event:'activated-access-paid',source:s.id,abilityIndex:i,...receipt}));life=paidLife;
    if(a.tap)s.tapped=true;if(a.sacrifice){s.consumed=true;toGrave(s);stats.accessSacrifices++;}s.lastAccess=turn;
    emit({event:'access-costs',source:s.id,abilityIndex:i,tap:a.tap,sacrifice:a.sacrifice,life:a.life});stats.activations++;effects(a.effects,s,'activation');return r;
  }
  function playLand(s){if(!s||!hand.includes(s)||!isLand(s.card)||landPlayed)return {status:'blocked',reason:'land unavailable/drop used'};landPlayed=true;hand.splice(hand.indexOf(s),1);const b={...s,since:turn,tapped:s.model.tapped};board.push(b);emit({event:'land',id:b.id,card:b.card.name,tapped:b.tapped,unknown:b.model.conditionalEntry});spawn(b,'entry');triggerAccess('entry',b);return {status:'played'};}
  function chooseLand(){
    const current=sourceState(),availableTypes=new Set(current.sources.filter(s=>!s.consumed).flatMap(s=>s.modes.flatMap(m=>m.outputs.flat())));
    const targetCost=(!commanderCast?command.model.cost||'':'')+hand.filter(s=>!isLand(s.card)&&(printedManaValue(s.card)||0)<=4).map(s=>s.model.cost||'').join('');
    const wanted=new Set([...targetCost.matchAll(/\{([WUBRGC])\}/g)].map(m=>m[1]).filter(t=>!availableTypes.has(t)));
    const costKnown=!active().some(s=>s.model.unknownTax);
    const candidates=hand.filter(s=>isLand(s.card)).map(s=>{
      const landCount=active().filter(b=>isLand(b.card)).length+1;
      const hypothetical={...current,sources:[...current.sources.map(source=>({...source,modes:board.find(b=>b.id===source.id).model.modes.filter(m=>!m.minLands||landCount>=m.minLands)})),{id:s.id,types:cardTypes(s.card),subtypes:cardSubtypes(s.card),modes:s.model.modes.filter(m=>!m.minLands||landCount>=m.minLands),tapped:s.model.tapped,sick:isCreature(s.card)&&!s.model.haste}]};
      const enables=costKnown&&!commanderCast&&!command.model.extraCost&&parseManaCost(command.model.cost||'{X}')&&pay(hypothetical,[{cost:command.model.cost,reduction:reductionFor(commander),context:castContext(commander,true)}],false).status==='paid';
      const trigger=active().find(b=>b.id==='commander')?.model.castPayment;
      const enablesFollowup=costKnown&&!!trigger&&hand.some(h=>h.model.permanent&&!h.model.extraCost&&!cardSubtypes(h.card).includes('Aura')&&parseManaCost(h.model.cost||'{X}')&&cardSubtypes(h.card).includes(trigger.subtype)&&pay(hypothetical,[{cost:h.model.cost,reduction:reductionFor(h.card),context:castContext(h.card)},{cost:trigger.cost,context:{kind:'ability',abilityType:'triggered'}}],false).status==='paid');
      return {slot:s,enables:!!enables,enablesFollowup,fixes:s.model.modes.some(m=>m.outputs.some(o=>o.some(t=>wanted.has(t))))};
    });
    candidates.sort((a,b)=>Number(b.enables)-Number(a.enables)||Number(b.enablesFollowup)-Number(a.enablesFollowup)||Number(a.slot.model.tapped)-Number(b.slot.model.tapped)||Number(b.fixes)-Number(a.fixes)||b.slot.model.modes.length-a.slot.model.modes.length||a.slot.id.localeCompare(b.slot.id));
    return candidates[0]?.slot;
  }
  function topChoice(){const providers=active().filter(s=>s.access.top&&s.access.lookTop);if(!access||!providers.length||!library.length)return null;
    if(lastTop!==library[0].id){emit({event:'look-top',id:library[0].id,card:library[0].card.name,sources:providers.map(s=>s.id)});lastTop=library[0].id;}
    const provider=providers.find(s=>topCastAllowed(library[0].card,s.access.top));return provider?{slot:library[0],provider}:null;
  }
  function candidates(){const top=topChoice(),casts=[...hand.filter(s=>!isLand(s.card)).map(slot=>({kind:'cast',slot,origin:'hand'})),...(!commanderCast?[{kind:'cast',slot:command,origin:'command',commander:true}]:[]),...(top?[{kind:'cast',slot:top.slot,origin:'library',provider:top.provider}]:[])];
    const actions=casts.map(a=>({...a,plan:castPlan(a.slot,false)})).filter(a=>a.plan.status==='paid');
    if(access)for(const s of active())for(let i=0;i<s.access.abilities.length;i++){
      const ability=s.access.abilities[i];if(ability.effects.some(e=>e.kind==='exileTop')&&(!s.access.lookTop||!library[0]||top&&top.slot===library[0]&&castPlan(top.slot,false).status==='paid'))continue;
      const plan=abilityPlan(s,i);if(plan.status==='paid')actions.push({kind:'activate',slot:s,abilityIndex:i,plan});
    }
    return choosePilotAction(actions,pilotContext()).filter(a=>a.rule.reason!=='remaining supported deployment'||!a.plan.receipts.some(r=>r.sacrifice));
  }
  function manaObservation(){const state=sourceState(),commanderContext=castContext(commander,true),max={};
    for(const type of ['generic','W','U','B','R','G','C']){
      let lower=0,upper=16,unknown=false;
      while(lower<upper){const n=Math.ceil((lower+upper)/2),cost=type==='generic'?`{${n}}`:`{${type}}`.repeat(n),r=pay(state,[{cost,context:commanderContext}],false);if(r.status==='unknown'){unknown=true;break;}if(r.status==='paid')lower=n;else upper=n-1;}
      max[type]={payableAtLeast:lower,unknown,cap:16};
    }
    const copy=pay(state,[{cost:'{C}{C}',context:{kind:'ability',abilityType:'triggered'}}],false);
    return {context:'independent maxima for commander spell; not simultaneous or additive',max,separateTriggeredCC:copy.status};
  }
  function threatObservation(){return hand.filter(s=>isCreature(s.card)&&cardSubtypes(s.card).some(t=>nativeTypes.includes(t))&&(Number(front(s.card).power)>=4||(printedManaValue(s.card)||0)>=5)).map(s=>({card:s.card.name,status:castPlan(s,false,false).status}));}
  function engineReadiness(s,channel){
    if(!channel.supported)return 'unknown';const statuses=[];
    if(channel.kind==='access'){
      for(let i=0;i<s.access.abilities.length;i++)statuses.push(abilityPlan(s,i,false).status);
      for(const t of s.access.triggers)if(t.phase!=='entrySelf')for(const h of hand){const ok=t.phase==='cast'?matchesCastFilter(h.card,t.filter):entryMatches(t,s,h,context());if(ok)statuses.push(castPlan(h,false,false).status);}
      if(s.access.top){if(!s.access.lookTop)statuses.push('unknown');else if(library[0]&&topCastAllowed(library[0].card,s.access.top))statuses.push(castPlan(library[0],false,false).status);}
    }else if(channel.kind==='reduction')for(const h of hand)if(/\{[1-9]\d*\}/.test(h.model.cost||'')&&s.model.reducers.some(r=>r.kind==='colorless'?isColorless(h.card):isCreature(h.card)))statuses.push(castPlan(h,false,false).status);
    else if(channel.kind==='cast-payment')for(const h of hand)if(cardSubtypes(h.card).includes(s.model.castPayment.subtype))statuses.push(castPlan(h,true,false).status);
    return statuses.includes('paid')?'ready':statuses.includes('unknown')?'unknown':'blocked';
  }
  for(turn=1;turn<=turns&&!lost;turn++){
    pool=[];creatureCasts=0;landPlayed=false;lastTop=null;for(const s of active())if(!s.model.noNaturalUntap)s.tapped=false;
    emit({event:'untap',sources:sourceState().sources});draw(1,'natural');if(lost)break;
    if(!script){const land=chooseLand();if(land)playLand(land);}
    const beforeMana=manaObservation(),threatsBeforeActions=threatObservation();let acts=0;
    // A read-only diagnostic snapshot before spending action mana. Payment
    // previews do not resolve effects or change the pilot/trace/statistics.
    if(onPreAction){
      const probe=slot=>{const r=castPlan(slot,false,false),joint=castPlan(slot,true,false);
        return {id:slot.id,card:slot.card.name,cost:slot.model.cost,reduction:reductionFor(slot.card),context:castContext(slot.card,slot===command),status:r.status,reason:r.reason||null,jointStatus:joint.status,triggerCosts:(joint.triggers||[]).map(s=>s.model.castPayment.cost)};};
      onPreAction(structuredClone({turn,state:sourceState(),commander:commanderCast?null:probe(command),hand:hand.filter(s=>!isLand(s.card)).map(probe),engines:active().flatMap(s=>strategyChannels(s,nativeTypes).map(c=>({card:s.card.name,...c,ready:engineReadiness(s,c)})))}));
    }
    if(script){if((script[turn]||[]).length>maxActions)throw Error('Script action bound exceeded');for(const a of script[turn]||[]){
      if(lost)break;const top=topChoice(),s=a.card===commander.name&&!commanderCast?command:a.origin==='library'?top?.slot:hand.find(s=>s.card.name===a.card);
      const source=active().find(s=>s.card.name===a.card),r=a.type==='land'?playLand(s):a.type==='cast'&&s&&s.card.name===a.card?cast(s,a.origin||'hand',!!a.requireOptional):a.type==='activate'&&source?activate(source,a.abilityIndex||0):{status:'unknown',reason:'unsupported action/source unavailable'};
      if(!['paid','played'].includes(r.status))emit({event:'action-failed',action:a,status:r.status,reason:r.reason});
    }}else for(;acts<maxActions&&!lost;acts++){
      if(!landPlayed){const lateLand=chooseLand();if(lateLand){emit({event:'decision',policy,chosen:lateLand.id,kind:'land',reason:'use an available land drop after access',alternatives:[]});playLand(lateLand);continue;}}
      const options=candidates();if(!options.length)break;
      const payableCommander=options.find(a=>a.commander),guarded=payableCommander&&stats.setupBeforePayableCommander>=1;
      const a=guarded?{...payableCommander,rule:{reason:'take the payable commander after one setup action'}}:options[0];
      if(payableCommander&&!a.commander)stats.setupBeforePayableCommander++;
      emit({event:'decision',policy,chosen:a.slot.id,kind:a.kind,reason:a.rule.reason,commanderPayable:!!payableCommander,setupBudgetUsed:stats.setupBeforePayableCommander,alternatives:options.filter(x=>x.slot.id!==a.slot.id).slice(0,4).map(x=>({id:x.slot.id,kind:x.kind,reason:x.rule.reason}))});
      if(a.kind==='cast'){cast(a.slot,a.origin);if(a.provider)useEngine(a.provider,'top-access');}else activate(a.slot,a.abilityIndex);
    }
    if(acts===maxActions){stats.actionBoundHits++;emit({event:'action-bound',status:'unknown',limit:maxActions});}
    const missed=[];for(const slot of [...hand.filter(s=>!isLand(s.card)),...(!commanderCast?[command]:[])]){const r=castPlan(slot,false);missed.push({id:slot.id,card:slot.card.name,status:r.status==='paid'?'payable-but-not-selected':r.status,reason:r.reason||'policy/action limit preserves resources'});}
    for(const s of active())if(access)for(let i=0;i<s.access.abilities.length;i++){const r=abilityPlan(s,i);if(r.status!=='paid')missed.push({id:s.id,card:s.card.name,kind:'activation',status:r.status,reason:r.reason});}
    const threats=threatObservation();
    if(!active().some(s=>/You have no maximum hand size\./i.test(cardText(s.card))))while(hand.length>7){const s=worstHand();hand.splice(hand.indexOf(s),1);graveyard.push(s);stats.cleanupDiscards++;emit({event:'cleanup-discard',id:s.id,card:s.card.name});}
    const engines=active().flatMap(s=>strategyChannels(s,nativeTypes).map(c=>({id:s.id,card:s.card.name,...c,readyNow:engineReadiness(s,c),used:stats.usedEngines.some(e=>e.id===s.id&&(['access','top-access'].includes(e.kind)?c.kind==='access':e.kind===c.kind))})));
    const accessibleCards=hand.length+active().filter(s=>!s.token&&s.id!=='commander').length;
    const observation={turn,commanderDeployed:active().some(s=>s.id==='commander'),manaBeforeActions:beforeMana,manaRemaining:manaObservation(),handSize:hand.length,accessibleCards,netAccessibleCards:accessibleCards-7-stats.naturalDraws,naturalDraws:stats.naturalDraws,effectDraws:stats.effectDraws,effectDiscards:stats.accessDiscards,cleanupDiscards:stats.cleanupDiscards,returnedToTop:stats.returnedToTop,topCasts:stats.topCasts,accessSpells:stats.accessSpells,accessSacrifices:stats.accessSacrifices,engines,threatsBeforeActions,threatAvailability:threats,missed};observations.push(observation);
    emit({event:'turn-end',hand:hand.map(s=>s.card.name),handIds:hand.map(s=>s.id),library:library.map(s=>s.id),graveyard:graveyard.map(s=>s.id),exile:exile.map(s=>s.id),opponents:opponents.map(s=>s.id),ceased:ceased.map(s=>s.id),board:active().map(s=>({id:s.id,card:s.card.name,tapped:s.tapped})),floatingExpires:pool,life});
  }
  return {schemaVersion:2,evaluator:'gameplay-stage2-v1',seed,turns,policy,mulligan,order,initialOpening:opening,commander:commander.name,nativeTypes,chosenType,stats,observations,decked,lost,
    assumptions:{opening:7,mulligan,drawOnTurnOne:true,rankingIntegration:false,commanderTaxPriorCasts:0,access,mainPhases:1,maxActions,maxManaStates,maxSetupActionsBeforePayableCommander:1,sourcePayments:'optimized exact ledger',opponents:'three inert seats; no combat/interaction; supported control transfers leave our board',optionalPayment:'reserve before resolving resource/access triggers',threatDefinition:'native creature with printed power >=4 or printed MV >=5; payment availability, not win conversion; other threat/combat/copy outcomes unknown',otherRulesCoverage:'not quantified; parsed access is not complete Oracle/rules coverage'},
    coverage:{cardsWithSupportedAccess:[...models.values()].filter(m=>m.access.direct||m.access.abilities.length||m.access.triggers.length||m.access.top).length,cardsWithUnmodeledAccess:[...models.values()].filter(m=>m.access.unknown.length).length,unmodeledAccessClauses:[...models.values()].reduce((n,m)=>n+m.access.unknown.length,0)},
    unknown:[...models].map(([card,m])=>({card:card.name,access:m.access.unknown,other:m.model.unknown.filter(s=>!s.startsWith('other Oracle effects'))})),trace};
}
