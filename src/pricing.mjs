/**
 * Cardmarket English NM (or better) offer prices.
 * No silent substitution with Scryfall price estimates is permitted.
 * Prices must come from a user-supplied offer export containing Cardmarket
 * product identifiers. We make no assertion that a CSV upload is live or
 * authenticated Cardmarket data.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {DATA_DIR} from './scryfall.mjs';
import {isBasic,oracleId,priceOf} from './cards.mjs';
import {exportCardName} from './deckValidation.mjs';
import {selectedCards} from './deckSelection.mjs';
export const CM_OFFERS_FILE=path.join(DATA_DIR,'cardmarket-en-nm-offers.json');
export const PRICING_SCRYFALL='scryfall_eur';
export const PRICING_CM='cardmarket_en_nm';

function csvRows(source){
 const text=String(source).replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/,1)[0]||'';
 const delimit=first.includes(';')&&!first.includes(',')?';':',';
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else quoted=false;}else field+=c;}
  else if(c==='"')quoted=true;
  else if(c===delimit){row.push(field.trim());field='';}
  else if(c==='\r'||c==='\n'){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(field.trim());if(row.some(x=>x!==''))rows.push(row);
   row=[];field='';
  }else field+=c;
 }
 if(quoted)throw Error('Malformed CSV: unterminated quoted field.');
 row.push(field.trim());if(row.some(x=>x!==''))rows.push(row);
 return rows;
}
const normalize=x=>String(x).toLowerCase().replace(/[^a-z0-9]/g,'');
const getField=(row,headers,aliases)=>{
 for(const alias of aliases){const at=headers.indexOf(normalize(alias));if(at!==-1)return row[at]??'';}
 return '';
};
const english=x=>['en','eng','english','1'].includes(normalize(x));
const nm=x=>['nm','nearmint','mt','mint','m'].includes(normalize(x));
const positiveQuantity=x=>x===''||(Number(x)>0&&Number.isFinite(Number(x)));
function parseEuro(value){
 const v=String(value).trim().replace(/€/g,'').replace(/\s/g,'');
 if(!v)return null;
 let decimal=v;
 if(/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(v))decimal=v.replace(/\./g,'').replace(',','.');
 else if(/^\d+(?:,\d{1,2})?$/.test(v))decimal=v.replace(',','.');
 else if(!/^\d+(?:\.\d{1,2})?$/.test(v))return null;
 const result=Number(decimal);return Number.isFinite(result)&&result>=0?result:null;
}
export function importCardmarketOffers(csv,cards,{timestamp=new Date().toISOString()}={}){
 const rows=csvRows(csv);if(rows.length<2)throw Error('No offer rows found. Import a CSV with Cardmarket product IDs, language, condition and EUR prices.');
 const headers=rows[0].map(normalize);
 const identifiers=[['cardmarket_id','idProduct','product_id'],['card_name','cardName','name','oracle_name','scryfall_name'],['oracle_id','oracleId']];
 if(!identifiers.some(aliases=>aliases.some(h=>headers.includes(normalize(h)))))throw Error('CSV requires a cardmarket_id, card_name, or oracle_id column to identify cards.');
 const required=[['language','lang','idLanguage'],['condition','grade'],['price_eur','price','priceEUR']];
 for(const aliases of required)if(!aliases.some(h=>headers.includes(normalize(h))))throw Error(`Missing required CSV column: ${aliases[0]}.`);
 const cardByProduct=new Map();
 for(const c of cards)for(const id of c.cardmarketIds||[]){const product=String(id).trim();if(product)cardByProduct.set(product,oracleId(c));}
 const cardByName=new Map(cards.map(c=>[String(c.name||'').trim().toLowerCase(),oracleId(c)]));
 const cardByOracle=new Set(cards.map(oracleId));
 // Older Scryfall caches lack Cardmarket IDs; name or Oracle ID matching also
 // allows user-supplied offer exports containing different real printings.
 const prices=new Map();const counters={total:0,accepted:0,ignoredLanguage:0,ignoredCondition:0,ignoredStock:0,ignoredPrice:0,unmatched:0};
 for(const row of rows.slice(1)){
  counters.total++;
  const id=getField(row,headers,['cardmarket_id','idProduct','product_id']).trim();
  const name=getField(row,headers,['card_name','cardName','name','oracle_name','scryfall_name']).trim();
  const suppliedOracle=getField(row,headers,['oracle_id','oracleId']).trim();
  const lang=getField(row,headers,['language','lang','idLanguage']);
  const condition=getField(row,headers,['condition','grade']);
  const price=parseEuro(getField(row,headers,['price_eur','price','priceEUR']));
  const quantity=getField(row,headers,['quantity','count','available','stock']);
  if(!english(lang)){counters.ignoredLanguage++;continue;}
  if(!nm(condition)){counters.ignoredCondition++;continue;}
  if(!positiveQuantity(quantity)){counters.ignoredStock++;continue;}
  if(price===null||price===0){counters.ignoredPrice++;continue;}
  const oracle=(cardByProduct.get(id))||(cardByOracle.has(suppliedOracle)?suppliedOracle:null)||(name?cardByName.get(name.toLowerCase()):null);
  if(!oracle){counters.unmatched++;continue;}
  counters.accepted++;
  const prev=prices.get(oracle);
  if(!prev||price<prev.price)prices.set(oracle,{price,cardmarketId:id});
 }
 if(!counters.accepted)throw Error('No matching English NM/Mint Cardmarket offers found. Include card_name, oracle_id or a matching cardmarket_id with each offer, along with language, condition and price_eur.');
 return {schemaVersion:1,source:'User-provided offer CSV (Cardmarket data not independently verified)',filter:{language:'English',condition:'NM or better (NM/MT)',currency:'EUR'},importedAt:timestamp,matchedCards:prices.size,counters,byOracle:Object.fromEntries(prices)};
}
export async function loadCardmarketOffers(){try{
 const parsed=JSON.parse(await readFile(CM_OFFERS_FILE,'utf8'));
 if(parsed.schemaVersion!==1||!parsed.byOracle||typeof parsed.byOracle!=='object')throw Error('Invalid saved Cardmarket price data.');
 return parsed;
 }catch(e){if(e.code==='ENOENT')return null;throw e;}}
export async function saveCardmarketOffers(data){await mkdir(DATA_DIR,{recursive:true});await writeFile(CM_OFFERS_FILE,JSON.stringify(data));}
export function applyCardmarketPrices(cards,offers){
 if(!offers?.byOracle)throw Error('Cardmarket English NM selected, but no Cardmarket offer data is imported. Import matching offers first, or choose Scryfall EUR estimate.');
 return cards.flatMap(c=>{
  if(isBasic(c))return [{...c,prices:{eur:0}}];
  const offer=offers.byOracle[oracleId(c)];
  return offer&&Number.isFinite(offer.price)&&offer.price>=0?[{...c,prices:{eur:offer.price},chosenCardmarketId:offer.cardmarketId,pricingMethod:'imported-en-nm-quote',printing:{set:null,border:null,language:'en',condition:'NM or better',source:'User-imported Cardmarket offer; printing not independently established',cardmarketId:offer.cardmarketId||null}}]:[];
 });
}
export function coverage(cards,offers){if(!offers)return {priced:0,total:cards.length};return {priced:cards.filter(c=>isBasic(c)||offers.byOracle?.[oracleId(c)]!==undefined).length,total:cards.length};}

/** Experimental purchasing estimate adapted from the user's supplied
 * piecewise price model. It is NOT a Cardmarket quote. Never relabel it as one.
 * Missing bases remain missing; never fabricate a 50-cent fallback price.
 */
export const PRICING_ESTIMATED_EN_NM='estimated_en_nm';
export function estimateEnglishNearMint(base){
 if(!Number.isFinite(base)||base<0)return null;
 if(base<=0.4)return Math.round((base+0.15)*100)/100;
 if(base<=2)return Math.round(base*1.30*100)/100;
 if(base<=10)return Math.round(base*1.35*100)/100;
 return Math.round(base*1.37*100)/100;
}
export function applyEstimatedEnglishNM(cards){
 return cards.map(c=>{
  const base=priceOf(c);
  return {...c,baseScryfallEur:base,prices:{...c.prices,eur:isBasic(c)?0:base===null?null:estimateEnglishNearMint(base)},pricingMethod:'piecewise-estimate-not-verified'};
 });
}
export function cardmarketEnglishNMSearchUrl(name){
 const query=new URLSearchParams({searchQuery:String(name),language:'1',minCondition:'2'});
 return `https://www.cardmarket.com/en/Magic/Products/Search?${query.toString()}`;
}

/** Reconstruct a transparent per-card ledger from the actual exported cards.
 * Do not rely on guessed card names or skip missing prices when reporting a cap.
 */
export function auditExportPricing(deck,commander,cards){
 const lines=String(deck.deck||'').split(/\r?\n/).filter(Boolean);
 const parsed=lines.map(line=>line.replace(/^\d+\s+/, '').replace(/\s+\*CMDR\*$/, '').trim());
 // The generator retains exact selected card provenance in memory. Matching
 // exported names to a last-write-wins catalog Map was unsafe: multiple Oracle
 // records/printings can share an export name at DIFFERENT prices.
 const original=selectedCards(deck);
 const catalogById=new Map(cards.map(c=>[oracleId(c),c]));
 const byName=new Map();
 if(!original)for(const c of cards){const k=exportCardName(c).toLowerCase();
  const matches=byName.get(k)||[];matches.push(c);byName.set(k,matches);
 }
 const result=[];
 for(let i=0;i<parsed.length;i++){
  const name=parsed[i];let c=null,issue=null;
  if(original){
   const selected=original[i];
   if(!selected||exportCardName(selected).toLowerCase()!==name.toLowerCase())issue='Export differs from selected card identity';
   else {
    const saved=catalogById.get(oracleId(selected));
    // Verify that the generator used the same priced catalog object, not a
    // mutated/foreign record or a different printing with the same name.
    if(!saved||exportCardName(saved).toLowerCase()!==name.toLowerCase()||
      priceOf(saved)!==priceOf(selected)||
      (saved.printing?.set||'')!==(selected.printing?.set||''))issue='Selected card price/printing no longer matches active catalog';
    else c=selected;
   }
  }else{
   // Backward compatibility for direct audit calls: ambiguous names are NOT
   // resolved by picking an arbitrary expensive or cheap catalog record.
   const matches=(i===0&&name.toLowerCase()===exportCardName(commander).toLowerCase())?[commander]:(byName.get(name.toLowerCase())||[]);
   if(matches.length===1)c=matches[0];
   else issue=matches.length?'Ambiguous exported name; exact record unavailable':'Card not found in catalog';
  }
  const cost=c?priceOf(c):null;
  result.push({card:name,price:cost,unpriced:cost===null,issue:issue||(cost===null?'No eligible price':null),
   baseEur:c?.baseScryfallEur??null,printing:c?.printing||null,
   cardmarketUrl:cardmarketEnglishNMSearchUrl(name)});
 }
 const total=result.reduce((acc,e)=>acc+(e.price??0),0);
 const missing=result.filter(e=>e.unpriced);
 const totalRounded=Math.round(total*100)/100;
 return {cards:result,total:totalRounded,count:result.length,missing:missing.map(x=>x.card),
  agreesWithGenerator:Math.abs(totalRounded-Number(deck.price))<=0.02,
  withinBudget:total<=Number(deck.budget)+0.005&&missing.length===0,
  provenance:original?'exact-selected-cards':'unique-catalog-name',
  anomalies:result.filter(x=>x.issue).map(x=>({card:x.card,reason:x.issue}))};
}
