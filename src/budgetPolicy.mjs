/** Explicit purchasing assumptions. Defaults preserve v1.1.5: basics already
 * owned (including Wastes), commander/nonbasics counted, no shipping. */
import {isBasic,priceOf} from './cards.mjs';
const cedhTiers=new Map([['1000',1000],['2000',2000],['3000',3000],['4000',4000],['open',null]]);
export function budgetPolicy({budget=191,budgetTolerance=0,basicLandsOwned=true,bracket,cedhBudgetTier}={}){
 if(![0,4].includes(budgetTolerance))throw Error('Budget tolerance must be explicitly 0 or 4 EUR.');
 if(typeof basicLandsOwned!=='boolean')throw Error('Basic-land ownership must be a boolean.');
 const common={basicLandsOwned,commanderIncluded:true,shippingIncluded:false,
  assumption:basicLandsOwned?'All basic lands, including Wastes, already owned; commander and nonbasics counted':'Selected basic-land EUR records counted; commander and nonbasics counted'};
 if(cedhBudgetTier!==undefined){
  if(Number(bracket)!==5||!cedhTiers.has(cedhBudgetTier))throw Error('Choose a valid budget range for Bracket 5.');
  const target=cedhTiers.get(cedhBudgetTier);
  return {...common,target,tolerance:0,effectiveMaximum:target??Infinity,cedhBudgetTier,open:target===null};
 }
 const target=Number(budget);
 if(!Number.isFinite(target)||target<5||target>100000||Math.abs(target*100-Math.round(target*100))>1e-6)throw Error('Budget must be a finite EUR amount with at most two decimal places (5–100000).');
 return {...common,target,tolerance:budgetTolerance,effectiveMaximum:Math.round((target+budgetTolerance)*100)/100};
}
export function applyBudgetValuation(cards,policy){
 return policy.basicLandsOwned?cards:cards.map(c=>isBasic(c)?{...c,basicLandValuation:'catalog'}:c);
}
// A finite value for the local engine's budget arithmetic. Even 100 copies of
// the highest-priced catalog record fit, so every fully priced deck is eligible.
export function openDeckPriceBound(cards){
 return Math.max(5,cards.reduce((highest,card)=>Math.max(highest,Math.ceil((priceOf(card)??0)*100)),0));
}
export function budgetUsage(policy,price){
 if(policy.open)return {...policy,effectiveMaximum:null,selectedCardValue:price,unused:null,overTarget:null};
 return {...policy,selectedCardValue:price,unused:Math.round((policy.effectiveMaximum-price)*100)/100,overTarget:Math.round(Math.max(0,price-policy.target)*100)/100};
}
