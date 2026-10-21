// Independent export gate: a card's Oracle ID is not a substitute for its
// English name in the Commander singleton rule. Multiple database records may
// represent the same English name under distinct IDs.
import {isBasic,castOracle} from './cards.mjs';
import {normalizedName} from './combos.mjs';

/** The export format collapses duplicated printed faces (e.g. Sol Ring // Sol Ring).
 * Validate *that same canonical name*, not the raw bulk-record name. */
export function exportCardName(card){
 const name=String(card?.name||'').trim();
 const halves=name.split(/\s*\/\/\s*/);
 return halves.length===2 && normalizedName(halves[0])===normalizedName(halves[1]) ? halves[0] : name;
}
export const singletonName=c=>normalizedName(exportCardName(c));

// Only trust an explicit card-text exception; never infer exceptions from
// subtype, rarity or the number of copies seen in a community deck.
export function maxNameCopies(card){
 if(isBasic(card))return Infinity;
 const text=castOracle(card);
 const name=singletonName(card);
 for(const match of text.matchAll(/\ba deck can have (any number of|up to (\w+)) cards named ([^\n.]+?)(?=\.|$)/gi)){
  if(singletonName({name:match[3]})!==name)continue;
  if(/^any number of$/i.test(match[1]))return Infinity;
  const nums={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
  const limit=nums[match[2]?.toLowerCase()]??Number(match[2]);
  if(Number.isSafeInteger(limit)&&limit>0)return limit;
 }
 return 1;
}

export function validateCommanderSingleton(commander,mainboard){
 const seen=new Map();
 for(const card of [commander,...mainboard]){
  const key=singletonName(card);
  const entry=seen.get(key)||{count:0,limit:Infinity,name:card.name};
  entry.count++;
  entry.limit=Math.min(entry.limit,maxNameCopies(card));
  seen.set(key,entry);
 }
 const violations=[...seen.values()].filter(x=>x.count>x.limit).map(x=>`${x.name}: ${x.count} copies (maximum ${x.limit})`);
 return {valid:violations.length===0,violations};
}
