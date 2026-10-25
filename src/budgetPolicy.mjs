/** Explicit purchasing assumptions. Defaults preserve v1.1.5: basics already
 * owned (including Wastes), commander/nonbasics counted, no shipping. */
import {isBasic} from './cards.mjs';
export function budgetPolicy({budget=191,budgetTolerance=0,basicLandsOwned=true}={}){
 const target=Number(budget);
 if(!Number.isFinite(target)||target<5||target>100000||Math.abs(target*100-Math.round(target*100))>1e-6)throw Error('Budget must be a finite EUR amount with at most two decimal places (5–100000).');
 if(![0,4].includes(budgetTolerance))throw Error('Budget tolerance must be explicitly 0 or 4 EUR.');
 if(typeof basicLandsOwned!=='boolean')throw Error('Basic-land ownership must be a boolean.');
 return {target,tolerance:budgetTolerance,effectiveMaximum:Math.round((target+budgetTolerance)*100)/100,basicLandsOwned,commanderIncluded:true,shippingIncluded:false,
  assumption:basicLandsOwned?'All basic lands, including Wastes, already owned; commander and nonbasics counted':'Selected basic-land EUR records counted; commander and nonbasics counted'};
}
export function applyBudgetValuation(cards,policy){
 return policy.basicLandsOwned?cards:cards.map(c=>isBasic(c)?{...c,basicLandValuation:'catalog'}:c);
}
export function budgetUsage(policy,price){return {...policy,selectedCardValue:price,unused:Math.round((policy.effectiveMaximum-price)*100)/100,overTarget:Math.round(Math.max(0,price-policy.target)*100)/100};}
