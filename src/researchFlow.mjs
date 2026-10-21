/** The Generate action can perform bounded, opt-in, read-only online research
 * before constructing its deck. This orchestration never certifies deck power.
 * All external failures preserve the existing local/previously imported data.
 */
import {autoResearchArchidekt} from './autoResearch.mjs';
import {loadCommunity} from './community.mjs';
import {fetchSpellbookForDeck} from './combos.mjs';
import {recordSpellbookVariants} from './comboLibrary.mjs';

export async function researchForGeneration({commanderId,commanderName,bracket,budget,catalog=[],savedCommunity=[],reuseDiscovery=false,
 discover=autoResearchArchidekt,reload=loadCommunity,analyze=fetchSpellbookForDeck,record=recordSpellbookVariants}={}){
 let decks=savedCommunity,discovery={status:reuseDiscovery?'reused':'pending',added:0,examined:0,skipped:0,rateLimited:false};
 if(!reuseDiscovery){
  try{
   const result=await discover({commanderId,commanderName,bracket,budget,catalog});
   decks=await reload();
   discovery={status:result.rateLimited?'partial':'completed',added:result.added.length,examined:result.examined,
    eligible:result.eligible,skipped:result.skippedCount,rateLimited:result.rateLimited,pagesSearched:result.pagesSearched,
    distinctValidated:result.distinctValidated,distinctCreators:result.distinctCreators,
    newSourceIds:result.added.map(d=>String(d.id)),
    structuralExamples:result.added.slice(0,4).map(d=>({title:d.title,score:d.structureScore??null,earlyRamp:d.earlyRamp??null}))};
  }catch(err){
   discovery={status:'unavailable',added:0,examined:0,skipped:0,rateLimited:false,error:String(err.message||err).slice(0,250)};
  }
 }
 const eligible=decks.filter(d=>d.validated&&d.commanderIds?.length===1&&d.commanderIds[0]===commanderId&&d.edhBracket===Number(bracket));
 // A single source per click is a consciously bounded combo lookup. Larger
 // cohorts are NOT all certified as combo-executable or independent wins.
 const source=eligible.find(d=>discovery.newSourceIds?.includes(d.sourceId))||eligible[0];
 let combos={status:'no-source',checkedSources:0};
 if(source){
  try{
   const result=await analyze(source,catalog,{onVerifiedResponse:async normalized=>record(commanderId,normalized)});
   combos={status:'checked',checkedSources:1,sourceKey:source.key,complete:result.counts.complete,
    infiniteInventory:result.counts.infiniteComplete,fromCache:result.fromCache,
    note:'Inventory-complete Spellbook variants are not verified executable game states.'};
  }catch(err){combos={status:'unavailable',checkedSources:0,sourceKey:source.key,error:String(err.message||err).slice(0,250)};}
 }
 return {community:decks,report:{mode:'automatic-before-build',discovery,combos,
  matchingSaved:eligible.length,
  limitations:'Archidekt labels and popularity do not prove deck quality. At most one source is checked against Spellbook per build; source combo inventory does not prove game execution. Online failures use locally cached data.'}};
}
