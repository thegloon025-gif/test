/** Price eligibility is distinct from oracle-level Commander format legality.
 * A Commander-legal card may have a collector/gold-border copy that is not
 * an acceptable priced physical tournament printing.
 */
export function eligibleScryfallPrinting(raw){
 if(raw?.digital===true||raw?.oversized===true)return false;
 if(raw?.lang && raw.lang!=='en')return false;
 if(Array.isArray(raw?.games)&&!raw.games.includes('paper'))return false;
 if(raw?.border_color&&!['black','white','borderless'].includes(raw.border_color))return false;
 if(raw?.security_stamp==='acorn')return false;
 // World Championship series remain in some datasets with Oracle legalities
 // borrowed from the underlying card; their gold-bordered print is not playable.
 if(/^wc(?:\d|$)/i.test(String(raw?.set||'')))return false;
 return true;
}
/** Old v1.1.1 JSON lacks border metadata. Fail closed on known collectors
 * while keeping all other older prices explicitly unverified until resync. */
export function maskKnownIneligibleCachePrint(card){
 if(!card||typeof card!=='object')return card;
 if(eligibleScryfallPrinting({...card,...(card.printing?{border_color:card.printing.border,lang:card.printing.language}:{} )}))return card;
 return {...card,prices:{...card.prices,eur:null},pricingWarning:'Cached price used an ineligible collector/digital/non-English printing. Refresh Scryfall to find an eligible alternative.'};
}
export function pricingCatalogStatus(cards,meta){
 const audited=meta?.printingEligibilityVersion>=2;
 const removedKnown=cards.filter(c=>!!c.pricingWarning).length;
 return {audited,removedKnown,warning:audited?null:'This catalog predates eligible-printing screening. Refresh Scryfall before trusting a budget or using a high-priced card.'};
}
