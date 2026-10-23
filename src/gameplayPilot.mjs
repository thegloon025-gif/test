/** Transparent ordered pilot rules, not a deck-quality objective. */
import {cardText, cardSubtypes, isCreature, isColorless} from './gameplayCards.mjs';
import {printedManaValue,accessCondition,matchesCastFilter} from './gameplayAccess.mjs';
export const GAMEPLAY_POLICIES=['commander-first','development','native'];
export function strategyChannels(slot,nativeTypes) {
  const text=cardText(slot.card), channels=[];
  if(slot.access.triggers.length||slot.access.abilities.length||slot.access.top)channels.push({kind:'access',supported:true});
  if(slot.model.reducers.length)channels.push({kind:'reduction',supported:true});
  if(slot.model.castPayment)channels.push({kind:'cast-payment',supported:true});
  if(/\bcascade\b/i.test(text))channels.push({kind:'cascade',supported:false});
  if(/\bcopy (?:all|target|that)|\btrigger.*additional time/i.test(text))channels.push({kind:'copy',supported:false});
  return channels.map(c=>({...c,native:c.kind==='cast-payment'||c.kind==='reduction'||nativeTypes.some(t=>new RegExp('\\b'+t+'\\b','i').test(text))||c.kind==='copy'||c.kind==='cascade'}));
}
export function rampUseful(slot,{turn,turns,commander,board}) {
  if(turn===turns&&isCreature(slot.card)&&!slot.model.haste)return false;
  const sources=board.filter(s=>!s.consumed&&s.model.modes.length).length;
  if(sources>=(printedManaValue(commander)||5)+5)return false;
  return slot.model.modes.some(m=>m.outputs.some(o=>o.length>0)&&['none','commander',...(isCreature(commander)?['creatures']:[]),...(cardSubtypes(commander).includes('Eldrazi')?['eldrazi']:[])].includes(m.restriction||'none'));
}
export function pilotRule(action,{policy,turn,turns,commander,board,hand,nativeTypes}) {
  const s=action.slot, channels=strategyChannels(s,nativeTypes), mana=rampUseful(s,{turn,turns,commander,board}), native=cardSubtypes(s.card).some(t=>nativeTypes.includes(t));
  const accessReady=s.access.top||s.access.abilities.some(a=>accessCondition(a.condition,{hand,board})&&!(a.tap&&isCreature(s.card)&&!s.model.haste&&turn===turns))||s.access.triggers.some(t=>t.phase==='entrySelf'&&accessCondition(t.condition,{hand,board})||t.phase==='cast'&&hand.some(h=>h.id!==s.id&&matchesCastFilter(h.card,t.filter))||t.phase==='entry'&&hand.some(h=>isCreature(h.card)&&(!t.chosen||cardSubtypes(h.card).some(type=>nativeTypes.includes(type)))));
  const reductionReady=s.model.reducers.some(r=>hand.some(h=>/\{[1-9]\d*\}/.test(h.model.cost||'')&&(r.kind==='colorless'&&isColorless(h.card)||r.kind!=='colorless'&&isCreature(h.card))));
  const engine=accessReady||reductionReady,nativeEngine=engine&&channels.some(c=>c.supported&&c.native),cm=action.commander;
  const priorities=policy==='commander-first'?[
    [cm,'cast commander now'],[mana&&action.kind==='cast','develop usable mana'],[engine&&action.kind==='cast','deploy supported access/reduction'],[action.kind==='activate'&&hand.length<4,'refill a small hand'],[native&&action.kind==='cast','deploy native creature'],[s.access.direct&&action.kind==='cast','resolve supported access'],[action.kind==='activate','use spare mana for access']
  ]:policy==='development'?[
    [mana&&action.kind==='cast'&&turn<7,'develop usable mana'],[engine&&action.kind==='cast','set up access/reduction'],[action.kind==='activate'&&hand.length<4,'refill before running out of plays'],[cm,'deploy commander'],[s.access.direct&&action.kind==='cast','resolve supported access'],[native&&action.kind==='cast','deploy native creature'],[action.kind==='activate','use spare mana for access']
  ]:[
    [nativeEngine&&action.kind==='cast'&&turn<7,'deploy supported native engine'],[cm,'deploy commander'],[mana&&action.kind==='cast','develop usable mana'],[engine&&action.kind==='cast','deploy supported access'],[native&&action.kind==='cast','develop native creature plan'],[s.access.direct&&action.kind==='cast','resolve supported access'],[action.kind==='activate','use spare mana for access']
  ];
  const i=priorities.findIndex(([yes])=>yes);
  return {priority:i<0?priorities.length:i,reason:i<0?'remaining supported deployment':priorities[i][1]};
}
export function choosePilotAction(actions,context) {
  const ranked=actions.map(a=>({...a,rule:pilotRule(a,context)}));
  ranked.sort((a,b)=>a.rule.priority-b.rule.priority|| (printedManaValue(a.slot.card)||0)-(printedManaValue(b.slot.card)||0)||a.slot.id.localeCompare(b.slot.id)||String(a.abilityIndex||0).localeCompare(String(b.abilityIndex||0)));
  return ranked;
}
