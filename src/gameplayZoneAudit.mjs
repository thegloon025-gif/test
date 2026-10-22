/** Independent replay of card zones and supported access prerequisites/effects.
 * Resource payment replay remains in gameplayAudit. This does not execute the
 * pilot or trust its hand/library snapshots as state. */
import {auditDeploymentTrace} from './gameplayAudit.mjs';
import {accessModel,accessCondition,entryMatches,matchesCastFilter,topCastAllowed} from './gameplayAccess.mjs';
import {cardModel,isCreature,isLand} from './gameplayCards.mjs';
import {auditNativeGameplayTrace} from './gameplayNativeAudit.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function auditGameplayTrace(result,commander,cards){
  if(result.schemaVersion===4)return auditNativeGameplayTrace(result,commander,cards);
  const resources=auditDeploymentTrace(result,commander,cards),errors=[...resources.errors],definitions=new Map(cards.map((card,i)=>['deck-'+i,{id:'deck-'+i,card}]));definitions.set('commander',{id:'commander',card:commander});
  const zones=new Map([...definitions].map(([id])=>[id,id==='commander'?'command':'library'])),library=result.order.map(i=>'deck-'+i),hand=[],board=new Map();
  let turn=0,landDrops=0,pendingSpell=null,pendingTrigger=null,announced=null,paidAbility=null,frame=null,tokenBudget=null;
  const fail=reason=>errors.push({turn,event:'zone/access',reason}),slot=id=>definitions.get(id),state=()=>({hand:hand.map(slot),board:[...board.values()],graveyard:[...zones].filter(([,z])=>z==='graveyard').map(([id])=>slot(id)),chosenType:result.chosenType});
  function move(id,from,to){if(zones.get(id)!==from)fail(`${id}: expected ${from}, found ${zones.get(id)}`);zones.set(id,to);}
  function effectsForTrigger(e){
    const source=board.get(e.source),entrant=slot(e.causedBy);if(!source||!entrant)return [];
    return accessModel(source.card).triggers.filter(t=>e.phase==='cast'?t.phase==='cast'&&pendingSpell===e.causedBy&&matchesCastFilter(entrant.card,t.filter):t.phase==='entrySelf'?source.id===e.causedBy&&accessCondition(t.condition,state()):t.phase==='entry'&&entryMatches(t,source,entrant,state())).map(t=>t.effects);
  }
  function consume(kind,e){
    if(!frame||frame.source!==e.source){fail('effect event outside its resolving source: '+kind);return;}
    const step=frame.steps[0];if(!step||step.kind!==kind){fail('unexpected effect event '+kind);return;}
    if(kind==='loseLife'&&e.count!==step.effect.count)fail('life effect amount differs');
    if(--step.remaining===0)frame.steps.shift();
  }
  for(const e of result.trace){turn=e.turn;
    if(e.event==='untap'){landDrops=0;for(const s of board.values())if(!cardModel(s.card).noNaturalUntap)s.tapped=false;}
    else if(e.event==='mulligan'){
      if(result.mulligan!=='one-free'||result.stats.mulligans!==1||e.returned.length!==7||e.paidBottom!==0)fail('unsupported mulligan accounting');
      const lands=result.initialOpening.filter(s=>isLand(slot(s.id)?.card||{})).length;if(lands>=2&&lands<=5)fail('mulligan violated documented keep rule');
      if(!same(e.order,result.order)||!same(e.redraw,library.slice(0,7)))fail('mulligan order differs');
    }else if(e.event==='opening'){
      const ids=e.hand.map(s=>s.id);if(!same(ids,library.splice(0,7)))fail('opening is not actual first seven');for(const id of ids){move(id,'library','hand');hand.push(id);}
    }else if(e.event==='draw'||e.event==='access-draw'){
      if(e.event==='access-draw')consume('draw',e);
      if(library.shift()!==e.id)fail('draw was not the actual library top');move(e.id,'library','hand');hand.push(e.id);
    }else if(e.event==='empty-draw'){if(library.length)fail('empty draw with cards available');if(e.reason!=='natural')consume('draw',{...e,source:e.source});}
    else if(e.event==='land'){
      if(++landDrops>1)fail('extra land drop');if(!isLand(slot(e.id)?.card||{}))fail('not a land');move(e.id,'hand','battlefield');hand.splice(hand.indexOf(e.id),1);board.set(e.id,{...slot(e.id),tapped:e.tapped,since:turn});
    }else if(e.event==='cast-paid'){
      const s=slot(e.id);if(!s){fail('unknown spell');continue;}
      if(e.id==='commander')move(e.id,'command','stack');
      else if(e.origin==='library'){
        if(![...board.values()].some(b=>{const a=accessModel(b.card);return a.lookTop&&a.top&&topCastAllowed(s.card,a.top);}))fail('no controlled top-cast permission');
        if(library.shift()!==e.id)fail('cast bypassed actual top');move(e.id,'library','stack');
      }else{move(e.id,'hand','stack');if(!hand.includes(e.id))fail('spell not in hand');else hand.splice(hand.indexOf(e.id),1);}
      pendingSpell=e.id;
    }else if(e.event==='permanent-resolved'){
      move(e.id,'stack','battlefield');board.set(e.id,{...slot(e.id),tapped:e.tapped,since:turn});pendingSpell=null;
    }else if(e.event==='spell-resolved'){move(e.id,'stack','graveyard');pendingSpell=null;}
    else if(e.event==='ritual-resolved'){move(e.source,'stack','graveyard');pendingSpell=null;}
    else if(e.event==='trigger-resolved'){
      const source=slot(e.source),created=e.effect?.match(/^create (\d+) (Spawn|Scion)$/),allowed=source&&created&&cardModel(source.card).spawn.some(s=>s.phase===e.phase&&s.count===+created[1]&&s.subtype===created[2]);
      if(!allowed||tokenBudget?.remaining||e.phase==='cast'&&pendingSpell!==e.source||e.phase==='entry'&&!board.has(e.source))fail('token resource trigger not justified/resolved in its required zone');
      tokenBudget=created?{remaining:+created[1],subtype:created[2]}:null;
    }else if(e.event==='token-created'){
      if(!tokenBudget?.remaining||e.card.type_line!==`Token Creature — Eldrazi ${tokenBudget.subtype}`||e.card.power!==(tokenBudget.subtype==='Spawn'?'0':'1')||e.card.mana_cost!==''||e.card.oracle_text!=='Sacrifice this token: Add {C}.')fail('token invented before a supported trigger resolved');
      if(tokenBudget)tokenBudget.remaining--;
      if(definitions.has(e.id))fail('duplicate token identity');definitions.set(e.id,{id:e.id,card:e.card,token:true});zones.set(e.id,'battlefield');board.set(e.id,{...slot(e.id),tapped:false,since:turn});
    }else if(e.event==='mana-activation'){
      const s=board.get(e.source);if(!s){fail('mana source unavailable in card ledger');continue;}
      if(e.tap)s.tapped=true;if(e.sacrifice){move(e.source,'battlefield',s.token?'ceased':'graveyard');board.delete(e.source);}
    }else if(e.event==='access-announced'){
      const s=board.get(e.source),a=s&&accessModel(s.card).abilities[e.abilityIndex];
      if(!a||a.tap&&(s.tapped||isCreature(s.card)&&s.since===turn&&!cardModel(s.card).haste)||a.once&&s.lastAccess===turn||!accessCondition(a.condition,state()))fail('activation prerequisites unmet at announcement');
      announced={source:e.source,index:e.abilityIndex};
    }else if(e.event==='activated-access-paid'){
      if(!announced||announced.source!==e.source||announced.index!==e.abilityIndex)fail('access payment not announced');paidAbility={...announced};announced=null;
    }else if(e.event==='access-costs'){
      const s=board.get(e.source);if(!paidAbility||paidAbility.source!==e.source||paidAbility.index!==e.abilityIndex||!s)fail('access costs before payment/source missing');
      if(s){if(e.tap)s.tapped=true;s.lastAccess=turn;if(e.sacrifice){move(e.source,'battlefield',s.token?'ceased':'graveyard');board.delete(e.source);}}
    }else if(e.event==='access-trigger-pending'){
      const allowed=effectsForTrigger(e);if(!allowed.length)fail('trigger prerequisites/source/event not present');pendingTrigger={source:e.source,allowed};
    }else if(e.event==='access-resolving'){
      if(frame)fail('unresolved previous access effect');let allowed=[];
      if(e.reason==='spell'&&pendingSpell===e.source){const a=accessModel(slot(e.source).card);if(a.direct)allowed=[a.direct];}
      else if(e.reason==='activation'&&paidAbility?.source===e.source){const a=accessModel(slot(e.source).card).abilities[paidAbility.index];if(a)allowed=[a.effects];paidAbility=null;}
      else if(e.reason.startsWith('trigger:')&&pendingTrigger?.source===e.source){allowed=pendingTrigger.allowed;pendingTrigger=null;}
      if(!allowed.some(a=>same(a,e.effects)))fail('effect not justified by Oracle/paid ability/trigger');
      frame={source:e.source,steps:e.effects.map(x=>({kind:x.kind,remaining:['scry','surveil','giveAway','exileTop','loseLife'].includes(x.kind)?1:x.count,effect:x}))};
    }else if(e.event==='selection'){
      const step=frame?.steps[0];if(!step||step.kind!==e.kind||!same(e.looked,library.slice(0,step.effect.count)))fail('selection looked at unauthorized cards');
      consume(e.kind,e);const ids=[...e.keep,...e.reject];if(new Set(ids).size!==ids.length||!same([...ids].sort(),[...e.looked].sort()))fail('selection invented/lost/duplicated cards');
      library.splice(0,e.looked.length);library.unshift(...e.keep);
      if(e.kind==='scry')library.push(...e.reject);else for(const id of e.reject)move(id,'library','graveyard');
    }else if(e.event==='discard'||e.event==='cleanup-discard'||e.event==='hand-to-top'){
      if(e.event!=='cleanup-discard')consume(e.event==='discard'?'discard':'handTop',e);
      else if(hand.length<=7)fail('unnecessary cleanup discard');
      if(!hand.includes(e.id))fail('discard/top card not in hand');else hand.splice(hand.indexOf(e.id),1);
      move(e.id,'hand',e.event==='hand-to-top'?'library':'graveyard');if(e.event==='hand-to-top')library.unshift(e.id);
    }else if(e.event==='top-exiled'){
      consume('exileTop',e);if(library.shift()!==e.id)fail('exile bypassed top');move(e.id,'library','exile');
    }else if(e.event==='life-loss')consume('loseLife',e);
    else if(e.event==='give-away'){consume('giveAway',{...e,source:e.id});move(e.id,'battlefield','opponents');board.delete(e.id);}
    else if(e.event==='access-resolved'){
      if(!frame||frame.source!==e.source)fail('resolved effect not pending');
      if(frame?.steps.length&&!result.lost&&!(hand.length===0&&frame.steps.every(s=>['discard','handTop'].includes(s.kind))))fail('effect skipped required card movements');frame=null;
    }else if(e.event==='look-top'){
      if(library[0]!==e.id||!e.sources.some(id=>board.has(id)&&accessModel(board.get(id).card).lookTop))fail('unauthorized top knowledge');
    }else if(e.event==='turn-end'){
      if(!same(e.handIds,hand)||!same(e.library,library))fail('hand/library snapshot differs from independent replay');
      for(const [zone,ids]of [['battlefield',e.board.map(s=>s.id)],['graveyard',e.graveyard],['exile',e.exile],['opponents',e.opponents],['ceased',e.ceased]]){
        const expected=[...zones].filter(([,z])=>z===zone).map(([id])=>id).sort();if(!same(expected,[...ids].sort()))fail(zone+' snapshot differs');
      }
    }
  }
  if(frame||announced||tokenBudget?.remaining&&!result.lost)fail('unfinished access/resource transaction');
  return {valid:errors.length===0,errors,resourceAudit:resources.valid,zoneAudit:errors.length===resources.errors.length};
}
