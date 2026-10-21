/** Non-JSON in-memory provenance for the exact priced card objects selected by
 * either generator. Symbols survive object spreads (legacy fallback), but never
 * enter API JSON, exports, or saved deck files.
 */
export const SELECTED_CARDS=Symbol('CommanderOracle.finalSelectedCards');
export function withSelectedCards(deck,commander,mainboard){
 Object.defineProperty(deck,SELECTED_CARDS,{value:[commander,...mainboard],enumerable:true});
 return deck;
}
export function selectedCards(deck){return deck?.[SELECTED_CARDS]||null;}
