/** Strict native Oracle grammar and bounded own-stack execution. No ranking. */
import {createHash} from 'node:crypto';
import {CompactNativeStack,colorlessUpperBound} from './gameplayNativeStack.mjs';
import {outletModel} from './gameplayOutlets.mjs';
import {cardText,cardTypes,cardSubtypes,isCreature,isColorless,front} from './gameplayCards.mjs';
import {accessModel,withoutReminder,printedManaValue,matchesCastFilter,entryMatches,accessCondition,accessConditionStatus,knownPower} from './gameplayAccess.mjs';
import {singletonName} from './deckValidation.mjs';
const nums={a:1,one:1,two:2,three:3,four:4};
export function nativeModel(card){
 const text=withoutReminder(cardText(card)),lines=text.split('\n').map(l=>l.trim()),triggers=[],unknown=[];
 const multiplier=[];let castCopy=false,cascadeGrant=null,cascade=0;
 for(const l of lines){let m;
  if(/^If a triggered ability of a legendary creature you control triggers, that ability triggers an additional time\.$/.test(l))multiplier.push('legendary-creature');
  else if(/^If a triggered ability of another creature you control of the chosen type triggers, it triggers an additional time\.$/.test(l))multiplier.push('chosen-creature');
  else if(/^If a triggered ability of a colorless spell you control or another colorless permanent you control triggers, that ability triggers an additional time\.$/.test(l))multiplier.push('colorless');
  else if(/^Whenever you cast a colorless spell, copy it\. You may choose new targets for the copy\.$/.test(l))castCopy=true;
  else if((m=l.match(/^Colorless spells you cast from your hand with mana value (\d+) or greater have "(Cascade(?:, cascade)*)\."$/i)))cascadeGrant={minMV:+m[1],count:m[2].split(',').length};
  else if((m=l.match(/^(Cascade(?:, cascade)*)(?:\.)?$/i)))cascade=m[1].split(',').length;
  else if((m=l.match(/^When you cast this spell, you may search your library for a colorless creature card with mana value (\d+) or greater, reveal it, then shuffle and put that card on top\.$/)))triggers.push({phase:'castSelf',kind:'tutor',filter:{colorless:true,creature:true,minMV:+m[1]},destination:'top'});
  else if((m=l.match(/^When (?:this creature|[^,]+) enters, you may search your library for a (colorless creature|creature|Eldrazi creature) card(?: with mana value (\d+) or greater)?, reveal it, put it into your hand, then shuffle\.$/)))triggers.push({phase:'entrySelf',kind:'tutor',filter:{creature:true,colorless:m[1]==='colorless creature',subtype:m[1]==='Eldrazi creature'?'Eldrazi':null,minMV:+m[2]||0},destination:'hand'});
  else if(/^When you cast this spell, if you have fewer than seven cards in hand, draw cards equal to the difference\.$/.test(l))triggers.push({phase:'castSelf',kind:'refill',size:7});
  else if((m=l.match(/^(When you cast this spell(?: and when this creature dies)?|When this creature enters|Whenever you cast a colorless spell|Whenever you cast a creature spell with mana value 4, 5, or 6|Whenever you draw your second card each turn), create (a|one|two|three|four) (0\/1|1\/1|10\/10) colorless Eldrazi(?: (Spawn|Scion))? creature tokens?(?: with "Sacrifice this token: Add \{C\}\."|\. They have "Sacrifice this token: Add \{C\}\.")?\.?$/))){
   const phase=m[1].startsWith('When you cast')?'castSelf':m[1].startsWith('When this')?'entrySelf':m[1].startsWith('Whenever you draw')?'secondDraw':'cast';
   triggers.push({phase,kind:'tokens',count:nums[m[2]],power:m[3].split('/')[0],toughness:m[3].split('/')[1],subtype:m[4]||null,filter:phase==='cast'?m[1].includes('4, 5, or 6')?{parts:['creature'],values:[4,5,6]}:{parts:['colorless']}:null});
   if(/and when this creature dies/.test(m[1]))unknown.push('Death branch not executed: '+l);
  }else if(/copy|cascade|search your library|create.*Eldrazi|draw cards equal|^(?:When|Whenever|At the beginning)/i.test(l)&&!/first creature spell|^Whenever you cast an Eldrazi spell, you may pay/.test(l)&&!(/draw|scry|surveil/i.test(l)&&!accessModel(card).unknown.includes(l)))unknown.push(l);
 }
 const ulalek=/^Whenever you cast an Eldrazi spell, you may pay \{C\}\{C\}\. If you do, copy all spells you control, then copy all other activated and triggered abilities you control\. You may choose new targets for the copies\.$/m.test(text);
 return {triggers,multiplier,castCopy,cascade,cascadeGrant,ulalek,unknown};
}
export function tutorMatches(card,filter){const mv=printedManaValue(card);return (!filter.creature||isCreature(card))&&(!filter.colorless||isColorless(card))&&(!filter.subtype||cardSubtypes(card).includes(filter.subtype))&&mv!==null&&mv>=(filter.minMV||0);}
/** Shuffle labels are independent of deck slot positions; identical copies are
 * exchangeable. Subsequent event divergence can still change shuffle labels. */
export function nativeShuffle(slots,seed,label){const counts=new Map();return slots.map(s=>{const n=singletonName(s.card),i=counts.get(n)||0;counts.set(n,i+1);return {s,key:createHash('sha256').update(JSON.stringify(['native-shuffle-v1',seed,label,n,i])).digest('hex')};}).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0).map(x=>x.s);}
export function triggerMultipliers(source,zone,board,chosenType){const out=[];
 for(const b of board){const model=nativeModel(b.card);for(const kind of model.multiplier){const types=cardSubtypes(source.card),chosen=types.includes(chosenType)||/This creature is the chosen type in addition to its other types\./.test(cardText(source.card));
  if(kind==='legendary-creature'&&zone==='battlefield'&&isCreature(source.card)&&cardTypes(source.card).includes('Legendary')||kind==='chosen-creature'&&zone==='battlefield'&&b.id!==source.id&&isCreature(source.card)&&chosen||kind==='colorless'&&isColorless(source.card)&&(zone==='stack'||b.id!==source.id))out.push({source:b.id,kind});
 }}return out;}
export function createNativeStack(host,{seed,chosenType,triggerOrder='copy-first',maxSteps=192,maxObjects=128,stage5=false,enableOutlets=true,compression=true,maxContinuations=3,optionalPolicy='all'}={}){
 if(!['copy-first','resources-first'].includes(triggerOrder)||!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>512||!Number.isInteger(maxObjects)||maxObjects<2||maxObjects>256)throw Error('Invalid native bounds');
 if(!Number.isInteger(maxContinuations)||maxContinuations<0||maxContinuations>3||!['all','conservative'].includes(optionalPolicy))throw Error('Invalid Stage 5 policy/bound');
 const stack=stage5&&compression?new CompactNativeStack():[],pending=[],modelMemo=new WeakMap();let serial=0,resolving=null,steps=0,shuffle=0,draws=0,blocked=false,continuations=0;
 const stats={castsFromCascade:0,spellCopies:0,triggerCopies:0,resolvedCopies:0,cascades:0,tutors:0,tutorCardsToHand:0,tutorCardsToTop:0,tokens:0,paidTriggers:0,declinedTriggers:0,multipliedTriggers:0,boundHits:0,unsupported:[],maxStack:0};
 if(stage5)Object.assign(stats,{compressedDeclines:0,compressedNoops:0,continuations:0,logicalPeak:0,storagePeak:0});
 const emit=e=>host.emit(e),model=s=>{if(!modelMemo.has(s.card))modelMemo.set(s.card,nativeModel(s.card));return modelMemo.get(s.card);};
 function unknown(reason,details={}){stats.unsupported.push({reason,...details});emit({event:'native-unknown',reason,...details});}
 const size=()=>stack.storageSize??stack.length;
 function atCapacity(item){return stage5?stack.length+pending.length>=4096||size()+pending.length>=maxObjects&&!stack.canMerge?.(item):stack.length+pending.length>=maxObjects;}
 function bound(){if(blocked)return;blocked=true;stats.boundHits++;emit({event:'native-bound',status:'unknown',stack:stack.map(s=>s.id),pending:pending.map(s=>s.id),resolving:resolving?.id||null,maxSteps,maxObjects,...(stage5?{storage:size(),logical:stack.length,continuations}: {})});}
 function push(item){if(atCapacity(item)){bound();return;}stack.push(item);stats.maxStack=Math.max(stats.maxStack,stack.length);if(stage5){stats.logicalPeak=Math.max(stats.logicalPeak,stack.length);stats.storagePeak=Math.max(stats.storagePeak,size());}emit({event:'stack-push',id:item.id,kind:item.kind,source:item.source?.id||item.slot?.id,effect:item.effect,copyOf:item.copyOf||null,cause:item.cause?.id||null,zone:item.sourceZone||null,parent:resolving?.id||null});}
 function trigger(source,zone,effect,cause,phase){const multipliers=triggerMultipliers(source,zone,host.active(),chosenType),count=1+multipliers.length;
  for(let i=0;i<count;i++){const item={id:'stack-'+serial++,kind:'ability',source,sourceZone:zone,effect,cause,phase};pending.push(item);emit({event:'native-triggered',id:item.id,source:source.id,zone,phase,cause:cause?.id||null,effect,instance:i,multipliers});}
  stats.multipliedTriggers+=multipliers.length;for(const m of multipliers){const s=host.active().find(s=>s.id===m.source);if(s)host.useEngine?.(s,'copy');}if(stage5?(size()+pending.length>maxObjects||stack.length+pending.length>4096):stack.length+pending.length>maxObjects)bound();
 }
 function flush(){const priority=e=>triggerOrder==='resources-first'?(e.type==='tokens'?3:e.type==='ulalek'?2:1):(e.type==='ulalek'?3:e.type==='spell-copy'?2:1);
  pending.sort((a,b)=>priority(a.effect)-priority(b.effect));while(pending.length&&!blocked)push(pending.shift());}
 function accessTriggers(phase,cause){for(const source of host.active())for(const t of source.access.triggers){if(!(t.phase===phase||phase==='entry'&&t.phase==='entrySelf'&&source.id===cause.id))continue;
  if(t.condition&&accessConditionStatus(t.condition,host.context())==='unknown'||t.power&&knownPower(cause,host.active())===null){unknown('access prerequisite unknown',{source:source.id});continue;}
  const ok=t.phase==='cast'?matchesCastFilter(cause.card,t.filter):t.phase==='entrySelf'?source.id===cause.id&&accessCondition(t.condition,host.context()):entryMatches(t,source,cause,host.context());
  if(ok)trigger(source,'battlefield',{type:'access',trigger:t},cause,t.phase);
 }}
 function nativeTriggers(phase,cause){
  if(phase==='cast')for(const source of host.active()){
   const m=model(source);if(m.ulalek&&cardSubtypes(cause.card).includes('Eldrazi'))trigger(source,'battlefield',{type:'ulalek',cost:'{C}{C}'},cause,'cast');
   if(m.castCopy&&isColorless(cause.card))trigger(source,'battlefield',{type:'spell-copy',target:cause.id},cause,'cast');
  }
  const sources=phase==='cast'?[{source:cause,zone:'stack'},...host.active().map(source=>({source,zone:'battlefield'}))]:host.active().map(source=>({source,zone:'battlefield'}));
  for(const {source,zone}of sources)for(const t of model(source).triggers){const self=phase==='cast'&&t.phase==='castSelf'&&zone==='stack'||phase==='entry'&&t.phase==='entrySelf'&&source.id===cause.id;
   const global=zone==='battlefield'&&(phase==='cast'&&t.phase==='cast'&&matchesCastFilter(cause.card,t.filter)&&(!t.filter.values||t.filter.values.includes(printedManaValue(cause.card)))||phase==='secondDraw'&&t.phase==='secondDraw');
   if((self||global)&&!(t.kind==='refill'&&host.hand.length>=t.size))trigger(source,zone,{...t,type:t.kind},cause,t.phase);
  }
  if(stage5&&enableOutlets&&phase==='entry'&&isCreature(cause.card)&&isColorless(cause.card))for(const source of host.active())if(source.id!==cause.id&&outletModel(source.card).entryDamage)trigger(source,'battlefield',{type:'opponent-damage',count:1,target:'each'},cause,'entry');
 }
 function registerCast(slot,origin){push({id:'stack-'+serial++,kind:'spell',slot,origin});accessTriggers('cast',slot);nativeTriggers('cast',slot);
  const mv=printedManaValue(slot.card),grants=Array(model(slot).cascade).fill(null);
  if(origin==='hand'&&isColorless(slot.card)&&mv!==null)for(const s of host.active()){const grant=model(s).cascadeGrant;if(grant&&mv>=grant.minMV)grants.push(...Array(grant.count).fill(s.id));}
  for(let i=0;i<grants.length;i++)trigger(slot,'stack',{type:'cascade',manaValue:mv,grantInstance:i,grantSource:grants[i]},slot,'cast');
 }
 function copyItem(item,by){if(blocked)return;if(!stage5&&atCapacity(item)){bound();return;}if(item.kind==='spell'){const slot=host.copySlot(item.slot);const copy={...item,id:'stack-'+serial++,slot,copyOf:item.id,origin:'copy'};if(stage5&&atCapacity(copy)){bound();return;}emit({event:'copy-created',id:slot.id,original:item.slot.id,by,stackCopyOf:item.id});stats.spellCopies++;push(copy);}
  else{const copy={...item,id:'stack-'+serial++,copyOf:item.id};if(stage5&&atCapacity(copy)){bound();return;}stats.triggerCopies++;push(copy);}}
 function cascade(item){stats.cascades++;const revealed=[];let found=null;
  while(host.library.length){const s=host.library.shift();host.exile.push(s);revealed.push(s);emit({event:'cascade-reveal',id:s.id,ability:item.id});const mv=printedManaValue(s.card);if(!cardTypes(s.card).includes('Land')&&mv!==null&&mv<item.effect.manaValue){found=s;break;}if(!cardTypes(s.card).includes('Land')&&mv===null){unknown('cascade mana value unknown',{card:s.card.name});break;}}
  if(found){const r=host.castCascade(found,item.id);if(r.status==='paid'){stats.castsFromCascade++;revealed.splice(revealed.indexOf(found),1);}else unknown('cascade eligible card not cast: '+r.reason,{card:found.card.name,status:r.status});}
  const bottom=nativeShuffle(revealed,seed,'cascade:'+shuffle++);for(const s of bottom){host.exile.splice(host.exile.indexOf(s),1);host.library.push(s);}emit({event:'cascade-bottom',ability:item.id,ids:bottom.map(s=>s.id)});
 }
 function tutor(item){const eligible=host.library.filter(s=>tutorMatches(s.card,item.effect.filter)).sort((a,b)=>printedManaValue(a.card)-printedManaValue(b.card)||singletonName(a.card).localeCompare(singletonName(b.card))),found=eligible[0];
  if(found)host.library.splice(host.library.indexOf(found),1);const reordered=nativeShuffle(host.library,seed,'tutor:'+shuffle++);host.library.splice(0,host.library.length,...reordered);
  if(found){(item.effect.destination==='hand'?host.hand:host.library).unshift(found);stats[item.effect.destination==='hand'?'tutorCardsToHand':'tutorCardsToTop']++;}emit({event:'native-tutor',ability:item.id,source:item.source.id,found:found?.id||null,destination:item.effect.destination,order:reordered.map(s=>s.id)});stats.tutors++;return !!found;
 }
 function resolve(item){if(item.kind==='spell'){const complete=host.resolveSpell(item.slot,item.origin);if(item.copyOf&&complete!==false)stats.resolvedCopies++;return;}
  const e=item.effect;
  if(e.type==='ulalek'){if(stage5&&optionalPolicy==='conservative'&&item.copyOf){stats.declinedTriggers++;emit({event:'native-trigger-declined',ability:item.id,source:item.source.id,status:'policy',reason:'conservative: do not pay copied optional triggers'});return;}const r=host.payOptional(item.source,e.cost,item);if(r.status!=='paid'){stats.declinedTriggers++;emit({event:'native-trigger-declined',ability:item.id,source:item.source.id,status:r.status,reason:r.reason});return;}
   stats.paidTriggers++;const snapshot=stack.slice();for(const s of snapshot.filter(s=>s.kind==='spell'))copyItem(s,item.id);for(const s of snapshot.filter(s=>s.kind==='ability'))copyItem(s,item.id);
  }else if(e.type==='spell-copy'){const target=stack.find(s=>s.kind==='spell'&&s.slot.id===e.target);if(target){copyItem(target,item.id);host.useEngine?.(item.source,'copy');}else emit({event:'native-copy-target-gone',ability:item.id,target:e.target});}
  else if(e.type==='cascade'){const before=stats.castsFromCascade;cascade(item);if(stats.castsFromCascade>before){const source=host.active().find(s=>s.id===e.grantSource);if(source)host.useEngine?.(source,'cascade');}}
  else if(e.type==='tutor'){if(tutor(item))host.useEngine?.(item.source,'tutor');}
  else if(e.type==='tokens'){host.createTokens(e,item);stats.tokens+=e.count;}
  else if(e.type==='refill'){const n=Math.max(0,e.size-host.hand.length);if(n)host.effects([{kind:'draw',count:n}],item.source,'native-refill');}
  else if(e.type==='access'){
   const t=e.trigger;if(t.phase==='entry'&&t.singleton&&!entryMatches(t,item.source,item.cause,host.context())){emit({event:'native-intervening-if-failed',ability:item.id});return;}
   host.effects(t.effects,item.source,'native-trigger');
  }else if(e.type==='opponent-damage'||e.type==='activated-outlet')host.damage(item.source.id,e.count,e.target,item.id);
  else if(e.type==='activated-access')host.effects(e.effects,item.source,'activation');
 }
 function drain(){flush();while(stack.length&&!blocked&&!host.lost()&&!host.won?.()){
   // Only adjacent no-op effects may be collapsed. No source, zone, resource,
   // pending trigger or identity is elided. Unknown payment searches never qualify.
   const group=stage5&&compression&&stack.topGroup?.();
   if(group?.item?.kind==='ability'&&group.count>1){const e=group.item.effect,upper=e.type==='ulalek'?colorlessUpperBound(host.sourceState()):null;
    const reason=e.type==='ulalek'&&upper<2?'C-upper-bound':e.type==='ulalek'&&optionalPolicy==='conservative'&&group.item.copyOf?'conservative-copy':e.type==='refill'&&host.hand.length>=e.size?'refill-full':null;
    // Policy batching is allowed only if every identity is a copy.
    const items=reason?stack.slice().slice(-group.count):[];
    if(reason&&!(reason==='conservative-copy'&&items.some(x=>!x.copyOf))){const ids=[];for(let i=0;i<group.count;i++)ids.push(stack.pop().id);
     emit({event:'native-noop-group',ids,reason,...(upper!==null?{colorlessUpperBound:upper}:{})});if(e.type==='ulalek'){stats.declinedTriggers+=ids.length;stats.compressedDeclines+=ids.length;}else stats.compressedNoops+=ids.length;continue;
    }
   }
   if(++steps>maxSteps){if(stage5&&continuations<maxContinuations){emit({event:'native-continuation',index:++continuations,steps:maxSteps,stack:stack.map(s=>s.id),pending:pending.map(s=>s.id),storage:size()});stats.continuations++;steps=1;}else{bound();break;}}
   const item=stack.pop();resolving=item;emit({event:'stack-resolve-start',id:item.id});resolve(item);emit({event:blocked?'stack-resolve-suspended':host.lost()?'stack-resolve-aborted-loss':'stack-resolve-end',id:item.id});if(blocked||host.lost()||host.won?.())break;resolving=null;flush();
  }}
 return {stats,registerCast,drain,entry(slot){accessTriggers('entry',slot);nativeTriggers('entry',slot);},draw(slot){if(++draws===2)nativeTriggers('secondDraw',slot);},beginTurn(){steps=0;draws=0;continuations=0;},activated(source,effects){push({id:'stack-'+serial++,kind:'ability',source,sourceZone:'battlefield',effect:{type:'activated-access',effects}});drain();},activatedOutlet(source,count,target){push({id:'stack-'+serial++,kind:'ability',source,sourceZone:'battlefield',effect:{type:'activated-outlet',count,target}});drain();},get blocked(){return blocked;},get resolving(){return resolving;},unknown};
}
