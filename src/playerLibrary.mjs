import {randomUUID} from 'node:crypto';
import {importCollection} from './playerCollection.mjs';
import {readPlayerDeck,inspectDeck,comparePlayerDecks,previewBracket,openingPractice} from './playerDecks.mjs';
import {singletonName} from './deckValidation.mjs';
import {oracleId} from './cards.mjs';

export function librarySummary(state){
  return {versions:state.versions.map(({text,holdings,...info})=>info),collection:state.collection};
}
function version(state,id){
  const entry=state.versions.find(v=>v.id===id);
  if(!entry)throw Error('Saved version could not be found.');
  return entry;
}
export async function playerAction(action,p,{store,catalog,context}){
  if(action==='state')return librarySummary(await store.get());
  if(action==='collection')return store.update(s=>{
    const rows=p.csv!==undefined?importCollection(p.csv,catalog):s.collection.rows;
    if(typeof p.enabled!=='boolean')throw Error('Choose whether to use the collection.');
    if(p.reserveId){
      const row=rows.find(r=>r.id===p.reserveId);
      if(!row||!Number.isSafeInteger(p.reserved)||p.reserved<0||p.reserved>row.quantity)throw Error('Reservation exceeds available copies.');
      row.reserved=p.reserved;
    }
    s.collection={enabled:p.enabled,rows};return s.collection;
  });
  const state=await store.get();
  if(action==='version')return version(state,p.id);
  const ctx=await context(p);ctx.collection=state.collection;
  const deck=readPlayerDeck(p.text,ctx.catalog,p.commanderId);
  const readVersion=id=>{const v=version(state,id);return readPlayerDeck(v.text,ctx.catalog,v.commanderId);};
  if(action==='hand')return openingPractice(deck,p,p.referenceText?readPlayerDeck(p.referenceText,ctx.catalog,p.referenceCommanderId):null);
  const view=inspectDeck(deck,ctx);
  if(action==='inspect')return view;
  if(action==='compare'){
    const before=readVersion(p.beforeId),first=inspectDeck(before,ctx);
    return comparePlayerDecks(before,deck,first,view,ctx.collection,ctx.ownedBasics,version(state,p.beforeId).holdings);
  }
  const locked=p.locked??[],budget=p.budget;
  if(!Array.isArray(locked)||locked.length>100||locked.some(n=>typeof n!=='string'||n.length>250))throw Error('Invalid card locks.');
  if(!Number.isFinite(budget)||budget<0||budget>100000||Math.abs(budget*100-Math.round(budget*100))>0.00001)throw Error('Enter a nonnegative budget in euros with up to two decimals.');
  if(action==='preview'){
    const proposal=previewBracket(deck,view,ctx,{locked,budget});
    if(proposal&&p.parentId){
      const parent=version(state,p.parentId),before=readVersion(parent.id),next=readPlayerDeck(proposal.text,ctx.catalog,p.commanderId);
      const total=comparePlayerDecks(before,next,inspectDeck(before,ctx),inspectDeck(next,ctx),ctx.collection,ctx.ownedBasics,parent.holdings).purchase.cost;
      if(total===null||total>parent.remaining)return {proposal:null};
    }
    return {proposal};
  }
  if(action!=='save')throw Error('Unknown library action.');
  const name=String(p.name??'').trim();
  if(!name||name.length>120)throw Error('Name this version (up to 120 characters).');
  return store.update(s=>{
    let spent=0,remaining=budget;
    const holdings=new Map();
    for(const c of [deck.commander,...deck.cards])holdings.set(oracleId(c),(holdings.get(oracleId(c))||0)+1);
    if(p.parentId){
      const parent=version(s,p.parentId),before=readPlayerDeck(parent.text,ctx.catalog,parent.commanderId);
      if(oracleId(deck.commander)!==parent.commanderId)throw Error('Start a new deck to change commanders.');
      const count=(d,n)=>[d.commander,...d.cards].filter(c=>singletonName(c)===singletonName({name:n})).length;
      if(locked.some(n=>count(deck,n)<count(before,n)))throw Error('A locked card would be cut. Review the locks before saving.');
      for(const [id,count] of Object.entries(parent.holdings||{}))holdings.set(id,Math.max(count,holdings.get(id)||0));
      const first=inspectDeck(before,ctx);
      const diff=comparePlayerDecks(before,deck,first,view,s.collection,ctx.ownedBasics,parent.holdings);
      spent=diff.purchase.cost;
      if(spent===null)throw Error('Missing purchase prices for '+diff.purchase.missing.join(', '));
      remaining=Math.round((parent.remaining-spent)*100)/100;
      if(remaining<0)throw Error('This version exceeds the remaining upgrade budget by €'+(-remaining).toFixed(2));
    }
    const entry={id:randomUUID(),parentId:p.parentId||null,created:new Date().toISOString(),name,
      holdings:Object.fromEntries(holdings),commanderId:oracleId(deck.commander),commander:deck.commander.name,text:p.text,locked:[...new Set(locked)],
      bracket:ctx.bracket,ownedBasics:ctx.ownedBasics,pricingMode:p.pricingMode||'scryfall_eur',spent,remaining};
    s.versions.push(entry);return entry;
  });
}
