/** Independent state/stack replay. Shares only strict Oracle grammar helpers;
 * never invokes the pilot, stack executor or mana planner. */
import {auditDeploymentTrace} from './gameplayAudit.mjs';
import {cardModel,cardTypes,cardSubtypes,isCreature,isLand,isColorless,cardText} from './gameplayCards.mjs';
import {accessModel,entryMatches,accessCondition,accessConditionStatus,matchesCastFilter,knownPower,topCastAllowed,printedManaValue} from './gameplayAccess.mjs';
import {nativeModel,triggerMultipliers,tutorMatches,nativeShuffle} from './gameplayNative.mjs';
import {singletonName} from './deckValidation.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function auditNativeGameplayTrace(result,commander,cards){
 const resources=auditDeploymentTrace(result,commander,cards),errors=[...resources.errors],defs=new Map(cards.map((card,i)=>['deck-'+i,{id:'deck-'+i,card}]));defs.set('commander',{id:'commander',card:commander});
 const zones=new Map([...defs.keys()].map(id=>[id,id==='commander'?'command':'library'])),library=result.order.map(i=>'deck-'+i),hand=[],board=new Map(),objects=new Map(),stack=[],triggered=new Map(),expected=new Map(),pushes=new Set(),castAnnouncements=new Set();
 let turn=0,landDrops=0,draws=0,shuffle=0,creatureCasts=0,current=null,effectFrame=null,announced=null,activation=null,pendingCopy=null,lossEvidence=false,life=40;
 const fail=s=>errors.push({turn,event:'native-audit',reason:s}),slot=id=>defs.get(id),state=()=>({hand:hand.map(slot),board:[...board.values()],graveyard:[...zones].filter(([,z])=>z==='graveyard').map(([id])=>slot(id)),chosenType:result.chosenType});
 const move=(id,from,to)=>{if(zones.get(id)!==from)fail(id+': expected '+from+', found '+zones.get(id));zones.set(id,to);};
 const key=(source,zone,phase,cause,effect)=>JSON.stringify([source,zone,phase,cause,effect]);
 function expect(source,zone,phase,cause,effect){const mult=triggerMultipliers(source,zone,[...board.values()],result.chosenType),k=key(source.id,zone,phase,cause.id,effect),old=expected.get(k);expected.set(k,{remaining:(old?.remaining||0)+1+mult.length,mult});}
 function onEvent(phase,cause,origin){
  for(const source of board.values())for(const t of accessModel(source.card).triggers){if(!(t.phase===phase||phase==='entry'&&t.phase==='entrySelf'&&source.id===cause.id))continue;
   if(t.condition&&accessConditionStatus(t.condition,state())==='unknown'||t.power&&knownPower(cause,[...board.values()])===null)continue;
   if(t.phase==='cast'?matchesCastFilter(cause.card,t.filter):t.phase==='entrySelf'?source.id===cause.id&&accessCondition(t.condition,state()):entryMatches(t,source,cause,state()))expect(source,'battlefield',t.phase,cause,{type:'access',trigger:t});
  }
  const sources=phase==='cast'?[{source:cause,zone:'stack'},...[...board.values()].map(source=>({source,zone:'battlefield'}))]:[...board.values()].map(source=>({source,zone:'battlefield'}));
  for(const {source,zone}of sources){const m=nativeModel(source.card);
   if(phase==='cast'&&zone==='battlefield'){
    if(m.ulalek&&cardSubtypes(cause.card).includes('Eldrazi'))expect(source,zone,'cast',cause,{type:'ulalek',cost:'{C}{C}'});
    if(m.castCopy&&isColorless(cause.card))expect(source,zone,'cast',cause,{type:'spell-copy',target:cause.id});
   }
   for(const t of m.triggers){const own=phase==='cast'&&t.phase==='castSelf'&&zone==='stack'||phase==='entry'&&t.phase==='entrySelf'&&cause.id===source.id;
    const global=zone==='battlefield'&&(phase==='cast'&&t.phase==='cast'&&matchesCastFilter(cause.card,t.filter)&&(!t.filter.values||t.filter.values.includes(printedManaValue(cause.card)))||phase==='secondDraw'&&t.phase==='secondDraw');
    if((own||global)&&!(t.kind==='refill'&&hand.length>=t.size))expect(source,zone,t.phase,cause,{...t,type:t.kind});
   }
  }
  if(phase==='cast'){const m=nativeModel(cause.card),mv=printedManaValue(cause.card),grants=Array(m.cascade).fill(null);
   if(origin==='hand'&&isColorless(cause.card)&&mv!==null)for(const b of board.values()){const g=nativeModel(b.card).cascadeGrant;if(g&&mv>=g.minMV)grants.push(...Array(g.count).fill(b.id));}
   for(let i=0;i<grants.length;i++)expect(cause,'stack','cast',cause,{type:'cascade',manaValue:mv,grantInstance:i,grantSource:grants[i]});
  }
 }
 function consume(kind,e){const step=effectFrame?.steps[0];if(!effectFrame||effectFrame.source!==e.source||!step||step.kind!==kind){fail('effect outside justified frame: '+kind);return;}
  if(kind==='loseLife'&&step.count!==e.count)fail('life effect quantity');if(--step.remaining===0)effectFrame.steps.shift();}
 for(const e of result.trace){turn=e.turn;
  if(e.event==='untap'){landDrops=0;draws=0;creatureCasts=0;for(const b of board.values())if(!cardModel(b.card).noNaturalUntap)b.tapped=false;}
  else if(e.event==='opening'){const ids=e.hand.map(s=>s.id);if(!same(ids,library.splice(0,7)))fail('opening top mismatch');for(const id of ids){move(id,'library','hand');hand.push(id);}}
  else if(e.event==='draw'||e.event==='access-draw'){if(e.event==='access-draw')consume('draw',e);if(library.shift()!==e.id)fail('draw bypassed top');move(e.id,'library','hand');hand.push(e.id);if(++draws===2)onEvent('secondDraw',slot(e.id));}
  else if(e.event==='empty-draw'){if(library.length)fail('false empty draw');else lossEvidence=true;if(e.reason!=='natural')consume('draw',e);}
  else if(e.event==='land'){if(++landDrops>1||!isLand(slot(e.id)?.card||{}))fail('invalid land drop');move(e.id,'hand','battlefield');hand.splice(hand.indexOf(e.id),1);board.set(e.id,{...slot(e.id),tapped:e.tapped,since:turn});onEvent('entry',slot(e.id));}
  else if(e.event==='cast-paid'){
   const s=slot(e.id);if(!s){fail('unknown spell');continue;}if(e.freeCast){if(e.origin!=='cascade'||current?.effect.type!=='cascade'||e.permission!==current.id||current.found!==e.id||e.cost!==''||e.reduction!==0)fail('free cast without resolving cascade permission');move(e.id,'exile','stack');current.cast=e.id;}
   else if(e.id==='commander')move(e.id,'command','stack');else if(e.origin==='library'){
    if(![...board.values()].some(b=>{const a=accessModel(b.card);return a.lookTop&&a.top&&topCastAllowed(s.card,a.top);})||library.shift()!==e.id)fail('unpermitted top cast');move(e.id,'library','stack');
   }else{move(e.id,'hand','stack');if(!hand.includes(e.id))fail('cast not in hand');else hand.splice(hand.indexOf(e.id),1);}
   const reduction=[...board.values()].flatMap(b=>cardModel(b.card).reducers).reduce((n,r)=>n+((r.kind==='colorless'&&isColorless(s.card)||r.kind==='creatures'&&isCreature(s.card)||r.kind==='firstCreature'&&isCreature(s.card)&&creatureCasts===0)?r.amount:0),0);
   if(e.reduction!==(e.freeCast?0:reduction))fail('unsupported reduction or first-creature reuse');if(isCreature(s.card))creatureCasts++;castAnnouncements.add(e.id);onEvent('cast',s,e.origin);
  }else if(e.event==='native-triggered'){
   const k=key(e.source,e.zone,e.phase,e.cause,e.effect),allowed=expected.get(k);if(!allowed?.remaining)fail('invented/duplicated trigger');else{allowed.remaining--;if(!same(allowed.mult,e.multipliers))fail('trigger multiplier source/type/zone mismatch');}
   if(objects.has(e.id)||triggered.has(e.id))fail('duplicate stack identity');triggered.set(e.id,e);
  }else if(e.event==='copy-created'){
   const original=slot(e.original);if(!original||defs.has(e.id)||!current||e.by!==current.id)fail('copy provenance missing');else{defs.set(e.id,{id:e.id,card:original.card,copy:true,token:cardModel(original.card).permanent});zones.set(e.id,'stack');pendingCopy=e;}
  }else if(e.event==='stack-push'){
   if(pushes.has(e.id))fail('stack object pushed twice');pushes.add(e.id);let entry=e;
   if(e.copyOf){const original=objects.get(e.copyOf),owed=current?.owed?.shift();if(!original||!stack.includes(e.copyOf)||owed!==e.copyOf||!current)fail('copy not authorized by a paid resolving effect');
    if(e.kind==='spell'){if(!pendingCopy||pendingCopy.id!==e.source||pendingCopy.stackCopyOf!==e.copyOf||original?.source!==pendingCopy.original)fail('copied spell identity mismatch');pendingCopy=null;}
    else if(!same(e.effect,original?.effect)||e.source!==original?.source||e.cause!==original?.cause)fail('copied ability changed characteristics');entry={...original,...e};
   }else if(e.kind==='ability'&&e.effect.type==='activated-access'){
    if(!activation||activation.source!==e.source||!same(e.effect.effects,activation.effects))fail('unpaid activated access on stack');activation=null;
   }else if(e.kind==='ability'){const t=triggered.get(e.id);if(!t||e.source!==t.source||e.cause!==t.cause||!same(e.effect,t.effect))fail('stack trigger not created');triggered.delete(e.id);entry={...t,...e};}
   else{if(zones.get(e.source)!=='stack'||defs.get(e.source)?.copy||!castAnnouncements.has(e.source))fail('spell on stack without a distinct cast');castAnnouncements.delete(e.source);}
   objects.set(e.id,entry);stack.push(e.id);
  }else if(e.event==='stack-resolve-start'){
   if(current||stack.pop()!==e.id||!objects.has(e.id))fail('LIFO/resolution mismatch');current={...objects.get(e.id),owed:null,tokens:0,revealed:[],found:null,tutored:false};
   if(current.effect?.type==='spell-copy'){const target=stack.find(id=>objects.get(id)?.source===current.effect.target&&objects.get(id)?.kind==='spell');current.owed=target?[target]:[];}
   current.requiresAccess=current.effect?.type==='activated-access'||current.effect?.type==='refill'&&hand.length<current.effect.size||current.effect?.type==='access'&&!(current.effect.trigger.phase==='entry'&&current.effect.trigger.singleton&&!entryMatches(current.effect.trigger,slot(current.source),slot(current.cause),state()))||current.kind==='spell'&&!cardModel(slot(current.source).card).permanent&&!!accessModel(slot(current.source).card).direct;
  }else if(e.event==='native-trigger-paid'){
   if(current?.id!==e.ability||current.effect.type!=='ulalek'||current.source!==e.source||current.cause!==e.causedBy||current.owed)fail('Ulalek payment outside its resolution or duplicate');
   else{current.owed=stack.filter(id=>objects.get(id).kind==='spell').concat(stack.filter(id=>objects.get(id).kind==='ability'));current.optionalDecision=true;}
  }else if(e.event==='native-trigger-declined'){if(current?.id!==e.ability||current.effect.type!=='ulalek'||current.owed)fail('invalid declined payment');else current.optionalDecision=true;}
  else if(e.event==='stack-resolve-end'){
   if(current?.id!==e.id||effectFrame||current?.owed?.length||current?.effect?.type==='tokens'&&current.tokens!==current.effect.count||current?.effect?.type==='tutor'&&!current.tutored||current?.effect?.type==='cascade'&&!current.bottomDone||current?.effect?.type==='ulalek'&&!current.optionalDecision||current?.requiresAccess&&!current.accessStarted)fail('unfinished/overcredited stack resolution');current=null;
  }else if(e.event==='stack-resolve-suspended'){
   if(!result.nativeExecution.boundedUnknown||current?.id!==e.id)fail('unjustified suspension');
  }else if(e.event==='stack-resolve-aborted-loss'){
   if(!result.lost||!lossEvidence||current?.id!==e.id)fail('unjustified model-loss abortion');
  }else if(e.event==='permanent-resolved'){
   if(current?.kind!=='spell'||current.source!==e.id||!cardModel(slot(e.id)?.card||{}).permanent)fail('permanent without resolving spell');move(e.id,'stack','battlefield');board.set(e.id,{...slot(e.id),tapped:e.tapped,since:turn});onEvent('entry',slot(e.id));
  }else if(e.event==='native-legend-rule'){
   const b=board.get(e.id),keep=board.get(e.keep);if(!b||!keep||!cardTypes(b.card).includes('Legendary')||singletonName(b.card)!==singletonName(keep.card))fail('unjustified legend removal');move(e.id,'battlefield',b?.token?'ceased':'graveyard');board.delete(e.id);
  }else if(e.event==='spell-resolved'||e.event==='copy-ceased'||e.event==='ritual-resolved'){
   const id=e.source||e.id;if(current?.kind!=='spell'||current.source!==id)fail('spell resolution without frame');move(id,'stack',slot(id)?.copy?'ceased':'graveyard');
  }else if(e.event==='token-created'){
   const spec=current?.effect;if(spec?.type!=='tokens'||current.id!==e.ability||++current.tokens>spec.count||defs.has(e.id)||e.card.type_line!=='Token Creature — Eldrazi'+(spec.subtype?' '+spec.subtype:'')||e.card.power!==spec.power||e.card.toughness!==spec.toughness||e.card.oracle_text!==(spec.subtype?'Sacrifice this token: Add {C}.':''))fail('unjustified token budget/type/timing');
   defs.set(e.id,{id:e.id,card:e.card,token:true});zones.set(e.id,'battlefield');board.set(e.id,{...slot(e.id),tapped:false,since:turn});onEvent('entry',slot(e.id));
  }else if(e.event==='cascade-reveal'){
   if(current?.effect?.type!=='cascade'||current.id!==e.ability||current.found||library.shift()!==e.id)fail('unjustified reveal/skip after eligible card');move(e.id,'library','exile');current.revealed.push(e.id);const c=slot(e.id)?.card,mv=c&&printedManaValue(c);if(c&&!isLand(c)&&mv!==null&&mv<current.effect.manaValue)current.found=e.id;
  }else if(e.event==='cascade-bottom'){
   if(current?.id!==e.ability||current.effect.type!=='cascade')fail('cascade bottom outside frame');else{current.bottomDone=true;const ids=current.revealed.filter(id=>id!==current.cast),expectedOrder=nativeShuffle(ids.map(slot),result.seed,'cascade:'+shuffle++).map(s=>s.id);if(!same(expectedOrder,e.ids))fail('cascade cards missing/extra/order');for(const id of e.ids){move(id,'exile','library');library.push(id);}}
  }else if(e.event==='native-tutor'){
   if(current?.id!==e.ability||current.effect.type!=='tutor'||current.tutored||e.destination!==current.effect.destination)fail('tutor outside justified frame');else{current.tutored=true;
    const eligible=library.map(slot).filter(s=>tutorMatches(s.card,current.effect.filter)).sort((a,b)=>printedManaValue(a.card)-printedManaValue(b.card)||singletonName(a.card).localeCompare(singletonName(b.card))),found=eligible[0]?.id||null;if(found!==e.found)fail('invalid/fictional tutor choice');
    if(e.found){const i=library.indexOf(e.found);if(i<0)fail('tutored card missing');else library.splice(i,1);}
    const order=nativeShuffle(library.map(slot),result.seed,'tutor:'+shuffle++).map(s=>s.id);if(!same(order,e.order))fail('tutor shuffle lost/reordered cards');library.splice(0,library.length,...e.order);
    if(e.found){if(e.destination==='hand'){move(e.found,'library','hand');hand.unshift(e.found);}else library.unshift(e.found);}
   }
  }else if(e.event==='access-announced'){
   const b=board.get(e.source),a=b&&accessModel(b.card).abilities[e.abilityIndex];if(!a||a.tap&&(b.tapped||isCreature(b.card)&&b.since===turn&&!cardModel(b.card).haste)||a.once&&b.lastAccess===turn||!accessCondition(a.condition,state()))fail('access activation prerequisites');announced={source:e.source,index:e.abilityIndex};
  }else if(e.event==='activated-access-paid'){if(!announced||announced.source!==e.source||announced.index!==e.abilityIndex)fail('unannounced access payment');activation={source:e.source,effects:accessModel(slot(e.source).card).abilities[e.abilityIndex].effects};}
  else if(e.event==='access-costs'){life-=e.life||0;if(life<=0)lossEvidence=true;const b=board.get(e.source);if(!activation||!b)fail('access costs without source/payment');if(b){if(e.tap)b.tapped=true;b.lastAccess=turn;if(e.sacrifice){move(e.source,'battlefield',b.token?'ceased':'graveyard');board.delete(e.source);}}announced=null;}
  else if(e.event==='access-resolving'){
   let allowed=null;if(current?.effect?.type==='access')allowed=current.effect.trigger.effects;
   else if(current?.effect?.type==='refill')allowed=[{kind:'draw',count:Math.max(0,current.effect.size-hand.length)}];
   else if(current?.effect?.type==='activated-access')allowed=current.effect.effects;
   else if(current?.kind==='spell')allowed=accessModel(slot(current.source).card).direct;
   if(effectFrame||!same(allowed,e.effects)||e.source!==current?.source||current?.accessStarted)fail('unjustified access budget');if(current)current.accessStarted=true;effectFrame={source:e.source,steps:e.effects.map(x=>({...x,remaining:['scry','surveil','giveAway','exileTop','loseLife'].includes(x.kind)?1:x.count}))};
  }else if(e.event==='access-resolved'){if(!effectFrame||effectFrame.source!==e.source||effectFrame.steps.length&&!result.lost&&!(hand.length===0&&effectFrame.steps.every(s=>['discard','handTop'].includes(s.kind))))fail('access effect skipped');effectFrame=null;}
  else if(e.event==='access-aborted-loss'){if(!result.lost||!lossEvidence||!effectFrame||effectFrame.source!==e.source)fail('unjustified access abortion');effectFrame=null;}
  else if(e.event==='selection'){
   const step=effectFrame?.steps[0];if(!step||step.kind!==e.kind||!same(e.looked,library.slice(0,step.count))||!same([...e.keep,...e.reject].sort(),[...e.looked].sort())||new Set([...e.keep,...e.reject]).size!==e.looked.length)fail('selection cards/budget');consume(e.kind,e);library.splice(0,e.looked.length);library.unshift(...e.keep);if(e.kind==='scry')library.push(...e.reject);else for(const id of e.reject)move(id,'library','graveyard');
  }else if(['discard','cleanup-discard','hand-to-top'].includes(e.event)){
   if(e.event==='cleanup-discard'){if(hand.length<=7)fail('unneeded cleanup');}else consume(e.event==='discard'?'discard':'handTop',e);
   if(!hand.includes(e.id))fail('card not in hand');else hand.splice(hand.indexOf(e.id),1);move(e.id,'hand',e.event==='hand-to-top'?'library':'graveyard');if(e.event==='hand-to-top')library.unshift(e.id);
  }else if(e.event==='top-exiled'){consume('exileTop',e);if(library.shift()!==e.id)fail('exile not top');move(e.id,'library','exile');}
  else if(e.event==='life-loss'){consume('loseLife',e);life-=e.count;if(life<=0)lossEvidence=true;}
  else if(e.event==='give-away'){consume('giveAway',{...e,source:e.id});move(e.id,'battlefield','opponents');board.delete(e.id);}
  else if(e.event==='mana-activation'){life-=e.life||0;if(life<=0)lossEvidence=true;const b=board.get(e.source);if(!b)fail('mana source not controlled');else{if(e.tap)b.tapped=true;if(e.sacrifice){move(e.source,'battlefield',b.token?'ceased':'graveyard');board.delete(e.source);}}}
  else if(e.event==='turn-end'){
   if(!result.nativeExecution.boundedUnknown&&!result.lost&&(stack.length||current||effectFrame))fail('stack not empty at turn end');if([...expected.values()].some(x=>x.remaining))fail('missing triggered abilities');
   if(!same(hand,e.handIds)||!same(library,e.library))fail('hand/library snapshot mismatch');
   for(const [z,ids]of [['battlefield',e.board.map(s=>s.id)],['graveyard',e.graveyard],['exile',e.exile],['opponents',e.opponents],['ceased',e.ceased]])if(!same([...zones].filter(([,zone])=>zone===z).map(([id])=>id).sort(),[...ids].sort()))fail(z+' snapshot mismatch');
  }
 }
 if(result.lost&&!lossEvidence)fail('model loss without verified resource/zone evidence');
 if(!result.nativeExecution.boundedUnknown&&!result.lost&&(stack.length||triggered.size||castAnnouncements.size||[...expected.values()].some(x=>x.remaining)||current||effectFrame))fail('unfinished native transaction');
 const events=result.trace,number=predicate=>events.filter(predicate).length;
 const counts={castsFromCascade:number(e=>e.event==='cast-paid'&&e.origin==='cascade'),spellCopies:number(e=>e.event==='copy-created'),triggerCopies:number(e=>e.event==='stack-push'&&e.kind==='ability'&&!!e.copyOf),
  resolvedCopies:number(e=>['permanent-resolved','copy-ceased','ritual-resolved'].includes(e.event)&&defs.get(e.id||e.source)?.copy),cascades:number(e=>e.event==='stack-resolve-start'&&objects.get(e.id)?.effect?.type==='cascade'),
  tutors:number(e=>e.event==='native-tutor'),tutorCardsToHand:number(e=>e.event==='native-tutor'&&e.found&&e.destination==='hand'),tutorCardsToTop:number(e=>e.event==='native-tutor'&&e.found&&e.destination==='top'),tokens:number(e=>e.event==='token-created'),
  paidTriggers:number(e=>e.event==='native-trigger-paid'),declinedTriggers:number(e=>e.event==='native-trigger-declined'),boundHits:number(e=>e.event==='native-bound'),multipliedTriggers:events.filter(e=>e.event==='native-triggered'&&e.instance===0).reduce((n,e)=>n+e.multipliers.length,0)};
 for(const [k,n]of Object.entries(counts))if(result.stats.native[k]!==n)fail('native statistic not supported by events: '+k);
 if(result.stats.optionalPayments.length!==counts.paidTriggers)fail('optional payment receipt count differs');
 for(const payment of result.stats.optionalPayments)if(!!payment.copy!==!!objects.get(payment.ability)?.copyOf)fail('copied trigger mislabeled as original');
 return {valid:errors.length===0,errors,resourceAudit:resources.valid,zoneAudit:errors.length===resources.errors.length,stackAudit:errors.length===resources.errors.length};
}
