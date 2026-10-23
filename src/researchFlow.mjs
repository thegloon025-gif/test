/** Explicit user-action orchestration. Independent failures never erase saved
 * sources or certify candidate combos as executable wins. */
import {autoResearchArchidekt} from './autoResearch.mjs';
import {loadCommunity} from './community.mjs';
import {fetchSpellbookForDeck} from './combos.mjs';
import {recordSpellbookVariants} from './comboLibrary.mjs';
import {lookupCommanderVariants,lookupColorVariants} from './commanderComboResearch.mjs';
export async function researchForGeneration({commanderId,commanderName,bracket,budget,catalog=[],savedCommunity=[],reuseDiscovery=false,reusedAt=null,discoveryBusy=false,catalogFetchedAt=null,
 discover=autoResearchArchidekt,reload=loadCommunity,analyze=fetchSpellbookForDeck,record=recordSpellbookVariants,
 lookup=lookupCommanderVariants,lookupColors=lookupColorVariants,now=()=>Date.now()}={}){
 let decks=savedCommunity,discovery={status:discoveryBusy?'busy':reuseDiscovery?'reused':'pending',added:0,examined:0,skipped:0,rateLimited:false,...(reuseDiscovery?{fetchedAt:reusedAt,cacheAgeMs:reusedAt?Math.max(0,now()-Date.parse(reusedAt)):null}: {})};
 if(!reuseDiscovery&&!discoveryBusy){
  try{
   const r=await discover({commanderId,commanderName,bracket,budget,catalog});decks=await reload();
   discovery={status:r.rateLimited||r.partial?'partial':'completed',added:r.added.length,examined:r.examined,eligible:r.eligible,skipped:r.skippedCount,rateLimited:r.rateLimited,pagesSearched:r.pagesSearched,distinctValidated:r.distinctValidated,distinctCreators:r.distinctCreators,
    partial:r.partial===true,truncated:r.truncated===true,unknownBracket:r.unknownBracket??null,searches:r.searches||[],searchedNames:r.searchedNames||[commanderName],errors:r.errors||[],fetchedAt:r.fetchedAt||null,cacheAgeMs:r.cacheAgeMs??null,
    newSourceIds:r.added.map(d=>String(d.id)),structuralExamples:r.added.slice(0,4).map(d=>({title:d.title,score:d.structureScore??null,earlyRamp:d.earlyRamp??null}))};
  }catch(err){discovery={status:'unavailable',added:0,examined:0,skipped:0,rateLimited:false,error:String(err.message||err).slice(0,250)};}
 }
 async function channel(fetchVariants,scope,extra={}){
  try{
   const r=await fetchVariants({commanderId,commanderName,...extra});
   // Cache retrieval date, rather than today's read date, identifies evidence.
   const fetchedAt=r.fetchedAt||null;
   await record(commanderId,{included:[],near:r.variants},...(fetchedAt?[{provenance:{scope,query:r.query||'',fetchedAt,partial:r.partial,truncated:r.truncated}}]:[]));
   return{status:r.stale?'cached-fallback':r.partial?'partial':'checked',variants:r.variants.length,total:r.total??null,truncated:r.truncated===true,partial:r.partial===true,fromCache:r.fromCache===true,stale:r.stale===true,pages:r.pages,query:r.query||null,endpoint:r.endpoint||'https://backend.commanderspellbook.com/variants/',fetchedAt,cacheAgeMs:r.cacheAgeMs??null,error:r.error||null,note:'Documented candidate variants only; no included pieces, execution, timing or wins certified.'};
  }catch(err){return{status:'unavailable',variants:null,total:null,error:String(err.message||err).slice(0,250)};}
 }
 const commanderLookup=await channel(lookup,'commander-card'),commander=catalog.find(c=>c.id===commanderId);
 const colorLookup=commander?await channel(lookupColors,'color-identity',{catalog,identity:commander.color_identity||[]}):{status:'not-attempted',variants:null,total:null,reason:'Known local commander identity is required.'};
 const eligible=decks.filter(d=>d.validated&&d.commanderIds?.length===1&&d.commanderIds[0]===commanderId&&d.edhBracket===Number(bracket));
 const source=eligible.find(d=>discovery.newSourceIds?.includes(d.sourceId))||eligible[0];let combos={status:'no-source',checkedSources:0};
 if(source){
  try{
   const result=await analyze(source,catalog,{onVerifiedResponse:async (normalized,evidence={})=>record(commanderId,normalized,{provenance:{scope:'deck-inventory',query:source.key,fetchedAt:evidence.fetchedAt||new Date(now()).toISOString()}})});
   combos={status:'checked',checkedSources:1,sourceKey:source.key,complete:result.counts.complete,infiniteInventory:result.counts.infiniteComplete,fromCache:result.fromCache,fetchedAt:result.fetchedAt||null,note:'Inventory-complete variants are not verified executable game states.'};
  }catch(err){combos={status:'unavailable',checkedSources:0,sourceKey:source.key,error:String(err.message||err).slice(0,250)};}
 }
 return{community:decks,report:{mode:'automatic-before-build',discovery,commanderLookup,colorLookup,combos,matchingSaved:eligible.length,
  scryfall:{status:catalog.length?'local-catalog':'unavailable',records:catalog.length,fetchedAt:catalogFetchedAt,note:'Local Oracle/identity/legality evidence; final price audit uses exact selected records and chosen pricing mode.'},
  limitations:'Bounded title-based Archidekt search is incomplete and respects declared brackets. Independent Spellbook scopes retrieve candidates, not strength or executable combo counts. At most one saved source deck receives a full-deck check. Unknown totals, partial results and offline fallback remain explicit. No EDHREC automation.'}};
}
