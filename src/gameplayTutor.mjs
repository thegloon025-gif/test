/** Ordered tactical choice among real legal tutor inventory. No power score,
 * price input, commander-name rule or utility for unsupported Oracle text. */
import {cardModel,isColorless,isCreature,cardSubtypes,cardText} from './gameplayCards.mjs';
import {accessModel,printedManaValue,matchesCastFilter} from './gameplayAccess.mjs';
import {nativeModel} from './gameplayNative.mjs';
import {outletModel} from './gameplayOutlets.mjs';
export function chooseTutorTarget(eligible,{turn,turns,board,hand,nativeTypes,commander,preview}){
 const facts=eligible.slice(0,24).map(s=>{const p=preview(s),n=nativeModel(s.card),a=accessModel(s.card),m=cardModel(s.card),hasTime=turn<turns,affordable=p.now.status==='paid'||hasTime&&p.next.status==='paid';
  const cascade=board.some(b=>{const g=nativeModel(b.card).cascadeGrant;return g&&isColorless(s.card)&&printedManaValue(s.card)>=g.minMV;});
  const flow=a.triggers.some(t=>t.phase==='entrySelf'&&!t.condition&&t.effects.some(e=>e.kind==='draw')||t.phase==='cast'&&hand.some(h=>matchesCastFilter(h.card,t.filter)))||a.top&&a.lookTop;
  const required=new Set([...((commander?.mana_cost||'').matchAll(/\{([^}]+)\}/g))].flatMap(v=>v[1].split('/').filter(t=>/[WUBRGC]/.test(t))));
  const mana=m.modes.some(x=>x.outputs.some(o=>o.some(t=>required.has(t)||t==='C'))&&!x.cost&&(hasTime||!isCreature(s.card)||m.haste||!x.tap)&&['none','creatures','eldrazi','commander'].includes(x.restriction||'none'))||m.reducers.length>0;
  const protection=/^Artifacts you control have indestructible\.$/m.test(cardText(s.card))&&board.some(b=>b.card.type_line?.includes('Artifact')&&(accessModel(b.card).top||accessModel(b.card).triggers.length||nativeModel(b.card).castCopy));
  const native=cardSubtypes(s.card).some(t=>nativeTypes.includes(t))&&board.some(b=>nativeModel(b.card).ulalek||nativeModel(b.card).castCopy)&& (p.jointNow.status==='paid'||hasTime&&p.jointNext.status==='paid');
  const conversion=outletModel(s.card).entryDamage&&hand.some(h=>isCreature(h.card)&&isColorless(h.card));
  const channel=!affordable?'no-supported-payable-line':cascade?'payable-cascade-follow-up':flow?'payable-supported-card-access':mana?'payable-supported-mana':protection?'payable-supported-engine-protection':conversion?'payable-entry-outlet-setup':native?'payable-native-follow-up':'no-supported-tactical-priority';
  return {id:s.id,channel,priority:['payable-cascade-follow-up','payable-supported-card-access','payable-supported-mana','payable-supported-engine-protection','payable-entry-outlet-setup','payable-native-follow-up','no-supported-tactical-priority','no-supported-payable-line'].indexOf(channel),...p};
 });
 facts.sort((a,b)=>a.priority-b.priority||eligible.findIndex(s=>s.id===a.id)-eligible.findIndex(s=>s.id===b.id));
 // A remaining vanilla/unsupported target gets no invented merit. Preserve the
 // old legal choice when no supported, affordable tactical channel is found.
 const chosen=facts.find(f=>f.priority<6)?.id||eligible[0]?.id||null;
 return {chosen,facts,examined:Math.min(eligible.length,24),unexamined:Math.max(0,eligible.length-24),projection:'now or next own untap from currently deployed sources only; no new land, pending spell/trigger resource, draw, activation or combat utility assumed'};
}
