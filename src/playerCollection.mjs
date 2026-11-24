import {csvRows} from './pricing.mjs';
import {oracleId,priceOf,isBasic} from './cards.mjs';
import {maxNameCopies,singletonName} from './deckValidation.mjs';

export function importCollection(csv,catalog) {
  if(typeof csv!=='string'||csv.length>5_000_000) throw Error('Supply a collection CSV up to 5 MB.');
  const [header,...rows]=csvRows(csv);
  const headings=(header||[]).map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,''));
  const column=(...names)=>headings.findIndex(h=>names.includes(h));
  const name=column('name','cardname','card'), qty=column('quantity','qty','count','owned'),
    reserved=column('reserved','reservedquantity');
  if(name<0||qty<0||!rows.length) throw Error('The CSV needs Name and Quantity columns. Reserved is optional.');
  const names=new Map(catalog.map(c=>[singletonName(c),c]));
  const grouped=new Map(), unknown=new Set();
  for(const [index,row] of rows.entries()){
    const card=names.get(singletonName({name:row[name]}));
    const count=Number(row[qty]), held=reserved<0?0:Number(row[reserved]||0);
    if(!row[qty]||![count,held].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000)||held>count)
      throw Error('Invalid quantity or reservation on row '+(index+2));
    if(!card){unknown.add(row[name]);continue;}
    const id=oracleId(card),entry=grouped.get(id)||{id,name:card.name,quantity:0,reserved:0};
    entry.quantity+=count;entry.reserved+=held;grouped.set(id,entry);
  }
  if(unknown.size) throw Error('Unrecognized cards. Previous inventory retained. Check '+[...unknown].slice(0,8).join(', '));
  return [...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

export function availableCopies(collection) {
  return new Map((collection.enabled?collection.rows:[]).map(r=>[r.id,r.quantity-r.reserved]));
}

// A generator assigns one unit price per Oracle record. Grant a construction
// credit only when the inventory covers every copy that the deck can select.
export function collectionCatalog(cards,collection) {
  if(!collection.enabled)return cards;
  const stock=availableCopies(collection);
  return cards.map(card=>(stock.get(oracleId(card))||0)>=Math.min(100,maxNameCopies(card)) && priceOf(card)!==null
    ? {...card,collectionOwned:true} : card);
}
export function purchaseEstimate(cards,collection,{baseline=[],ownedBasics=true,holdings={}}={}) {
  const stock=availableCopies(collection),original=new Map();
  for(const c of baseline){const id=oracleId(c);original.set(id,(original.get(id)||0)+1);}
  for(const [id,count] of Object.entries(holdings))original.set(id,Math.max(count,original.get(id)||0));
  for(const [id,count] of original)stock.set(id,Math.max(0,(stock.get(id)||0)-count));
  let cents=0;const missing=[];
  for(const c of cards){
    const id=oracleId(c);
    if(original.get(id)>0){original.set(id,original.get(id)-1);continue;}
    if(stock.get(id)>0){stock.set(id,stock.get(id)-1);continue;}
    if(ownedBasics&&isBasic(c))continue;
    const price=priceOf(isBasic(c)?{...c,basicLandValuation:'catalog'}:c);
    if(price===null)missing.push(c.name);else cents+=Math.round(100*price);
  }
  return {cost:missing.length?null:cents/100,missing:[...new Set(missing)]};
}
