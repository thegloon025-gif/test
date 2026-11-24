import {playerStore} from './src/playerStore.mjs';
import {playerAction} from './src/playerLibrary.mjs';
import {canonicalDeck} from './src/playerDecks.mjs';
import {collectionCatalog,availableCopies,purchaseEstimate} from './src/playerCollection.mjs';
import {randomBytes} from 'node:crypto';
import {createPlanOnly,safePlanError} from './src/planOnly.mjs';
import {loadOfficialChatGPT} from './src/chatgptSdk.mjs';
import {architectRequest,validateArchitectResult} from './src/aiArchitect.mjs';
import {DATA_DIR} from './src/scryfall.mjs';
import {parseUpgradeDeck,upgradeDeck} from './src/deckUpgrader.mjs';
import {budgetPolicy,applyBudgetValuation} from './src/budgetPolicy.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCatalog,refreshCatalog,remoteCommanders} from './src/scryfall.mjs';
import {isCommander,isBasic,oracleId} from './src/cards.mjs';
import {pricingCatalogStatus} from './src/printingEligibility.mjs';
import {generateDeck} from './src/generator.mjs';
import {prepareCommunityConstruction,communityStrategySummary} from './src/communityConstruction.mjs';
import {loadCommunity,importPublicDeck,communityInsights} from './src/community.mjs';
import {COMBINED_BRACKETS,discoverPublicDecks,importDiscoveredDecks} from './src/discovery.mjs';
import {rankPublicDecks} from './src/rankedDiscovery.mjs';
import {getSpellbookSnapshot} from './src/spellbookSnapshot.mjs';
import {analyzeWinConditions} from './src/winConditions.mjs';
import {architectLab} from './src/architectLab.mjs';
import {createCedhRankingsStore} from './src/cedhRankings.mjs';
import {autoResearchArchidekt} from './src/autoResearch.mjs';
import {researchForGeneration} from './src/researchFlow.mjs';
import {readEdhrecCommanderJson} from './src/edhrecKnowledge.mjs';
import {archidektTextExport} from './src/deckExport.mjs';
import {tempoEvidence} from './src/playabilityEvidence.mjs';
import {selectedCards} from './src/deckSelection.mjs';
import {fetchSpellbookForDeck} from './src/combos.mjs';
import {readComboLibrary,recordSpellbookVariants,repairComboLibraryFromCache} from './src/comboLibrary.mjs';
import {PRICING_SCRYFALL,PRICING_CM,importCardmarketOffers,loadCardmarketOffers,saveCardmarketOffers,applyCardmarketPrices,coverage,PRICING_ESTIMATED_EN_NM,applyEstimatedEnglishNM,auditExportPricing} from './src/pricing.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export const APP_VERSION=JSON.parse(await readFile(path.join(ROOT,'package.json'),'utf8')).version;
const players=playerStore(DATA_DIR);
const PORT=Number(process.env.PORT)||4285;
let offers=null;
try{offers=await loadCardmarketOffers();}catch(e){console.error('Cardmarket offer cache could not be opened:',e.message);}
let community=[];let communityDiscoveryBusy=false;const completedAutomaticResearch=new Map();
try{community=await loadCommunity();}catch(e){console.error('Community cache could not be opened:',e.message);}
let state={cards:[],meta:null};let update={phase:'not downloaded',bytes:0,unique:0},syncing=false;
try{state=await loadCatalog();if(state.cards.length)update={phase:'ready',unique:state.cards.length};}catch(e){console.error('Cache could not be opened:',e.message);}
// On upgrade, recover combinations v0.8.2 discarded (notably template IDs
// ending --34) from exact previously cached user-requested Spellbook responses.
// This is local-only; a missing cache never triggers an API call.
try{const recovered=await repairComboLibraryFromCache(community,state.cards);if(recovered.cacheHits)console.log('Local Spellbook cache repair:',recovered);if(recovered.errors.length)console.warn('Some local combo caches could not be repaired:',recovered.errors.slice(0,5));}catch(e){console.warn('Combo cache repair skipped:',e.message);}
const architectCSRF=randomBytes(32).toString('hex');
const architect=createPlanOnly({sdkFactory:options=>loadOfficialChatGPT({dataDir:DATA_DIR,...options}),historyFile:path.join(DATA_DIR,'chatgpt-architect','usage.json')});
const cedhRankings=createCedhRankingsStore({apiKey:process.env.TOPDECK_API_KEY?.trim()});
function localOrigin(req){
 const host=req.headers.host,allowed=new Set(['127.0.0.1:'+PORT,'localhost:'+PORT]);
 return allowed.has(host)&&(!req.headers.origin||req.headers.origin==='http://'+host)&&req.headers['sec-fetch-site']!=='cross-site';
}
async function architectInputs(p,{useCollection=true}={}){
 if(!state.cards.length){
  const message=syncing?'The Scryfall catalog is downloading. Wait for the card count to appear, then try again.':
   'No card catalog is installed. In Scryfall catalog, click Update database and wait for the card count to appear.';
  throw Object.assign(Error(message),{statusCode:409});
 }
 const mode=p.pricingMode||PRICING_SCRYFALL;
 if(![PRICING_SCRYFALL,PRICING_CM,PRICING_ESTIMATED_EN_NM].includes(mode))throw Error('Unsupported pricing mode.');
 if(mode!==PRICING_CM&&!pricingCatalogStatus(state.cards,state.meta).audited)
  throw Object.assign(Error('Click Update database in Scryfall catalog to refresh the pricing and printing data.'),{statusCode:409});
 const cards=mode===PRICING_CM?applyCardmarketPrices(state.cards,offers):mode===PRICING_ESTIMATED_EN_NM?applyEstimatedEnglishNM(state.cards):state.cards;
 const inventory=(await players.get()).collection;
 const library=await readComboLibrary();return {inventory,market:cards,cards:useCollection?collectionCatalog(cards,inventory):cards,variants:library.flatMap(e=>e.variants),research:{decks:community}};
}
function purchaseSummary(list,inventory,basicLandsOwned){
 return {cost:purchaseEstimate(list,inventory,{ownedBasics:basicLandsOwned}).cost,
  fullValue:purchaseEstimate(list,{enabled:false,rows:[]},{ownedBasics:false}).cost};
}
function validateForPlayer(p,result,x,options){
 const deck=validateArchitectResult(p,result,x.cards,x.variants,options);
 if(deck.valid&&deck.mode==='builder'&&x.inventory.enabled){
  const parsed=parseUpgradeDeck(deck.deck,x.market);
  if(parsed.commander&&!parsed.errors.length)deck.collectionPurchases=purchaseSummary([parsed.commander,...parsed.cards],x.inventory,p.basicLandsOwned!==false);
 }
 return deck;
}
async function importedWinConditions(decks){
 if(!decks.length)return [];
 const library=await readComboLibrary();
 const variants=library.flatMap(e=>e.variants),{snapshot}=await getSpellbookSnapshot({localOnly:true});
 const byId=new Map(state.cards.map(c=>[oracleId(c),c]));
 return decks.map(deck=>{
  if(!deck?.validated||deck.commanderIds.length!==1)return null;
  const commander=byId.get(deck.commanderIds[0]);
  const cards=deck.mainboard.flatMap(({id,quantity})=>Array(quantity).fill(byId.get(id)));
  return commander&&cards.length===99&&cards.every(Boolean)?analyzeWinConditions({commander,cards},{variants,snapshot}):null;
 });
}
const headers={'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
function json(res,obj,status=200){res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(obj));}
function error(res,err,status=400){json(res,{error:err.message||String(err)},status);}
function architectPlanError(res,err){
 const safe=safePlanError(err);
 return json(res,{error:safe.message,code:safe.code},400);
}
async function body(req){let str='';for await(const chunk of req){str+=chunk;if(str.length>8_000_000)throw Error('Request too large (8 MB maximum)');}return JSON.parse(str||'{}');}
function discoveryPricing(p,cards){
 const policy=budgetPolicy(p),mode=p.pricingMode||PRICING_SCRYFALL;
 if(![PRICING_SCRYFALL,PRICING_CM,PRICING_ESTIMATED_EN_NM].includes(mode))throw Error('Unsupported pricing mode.');
 const pricingLabel=mode===PRICING_CM?'Imported Cardmarket English NM/Mint snapshot':
  mode===PRICING_ESTIMATED_EN_NM?'Modeled English NM estimate':'Scryfall EUR estimate';
 const printing=pricingCatalogStatus(cards,state.meta);
 const pricingWarning=mode===PRICING_CM&&!offers?'Import Cardmarket offers to check the budget in this pricing mode.':
  !policy.basicLandsOwned&&mode!==PRICING_SCRYFALL?'Select Scryfall EUR to price unowned basic lands.':
  mode!==PRICING_CM?printing.warning:null;
 const priced=pricingWarning?cards.filter(card=>policy.basicLandsOwned&&isBasic(card)):
  mode===PRICING_CM?applyCardmarketPrices(cards,offers):
  mode===PRICING_ESTIMATED_EN_NM?applyEstimatedEnglishNM(cards):cards;
 return {pricedCatalog:applyBudgetValuation(priced,policy),budgetMaximum:policy.effectiveMaximum,
  pricingLabel,pricingWarning};
}
async function sendWithProgress(req,res,run){
 if(req.headers.accept!=='application/x-ndjson')return json(res,await run(()=>{}));
 res.writeHead(200,{...headers,'Content-Type':'application/x-ndjson; charset=utf-8'});
 const send=event=>{if(!res.destroyed)res.write(JSON.stringify(event)+'\n');};
 try{
  const result=await run(progress=>send({type:'progress',...progress}));
  send({type:'result',result});
 }catch(err){send({type:'error',error:err.message});}
 finally{res.end();}
}
const staticFiles={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/strategy.js':'strategy.js','/research.js':'research.js','/discovery-results.js':'discovery-results.js','/progress.js':'progress.js','/local-api.js':'local-api.js','/player-library.js':'player-library.js','/upgrader.js':'upgrader.js','/precons.js':'precons.js','/commander-precons.json':'commander-precons.json','/architect.js':'architect.js','/architect-lab.js':'architect-lab.js','/win-conditions.js':'win-conditions.js','/cedh.js':'cedh.js','/style.css':'style.css'};
const mime={'.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 try{
  if(url.pathname.startsWith('/api/')){
   if(!localOrigin(req))return json(res,{error:'Open the API through this local application.'},403);
   if(req.method!=='GET'&&req.headers['x-commander-ai-session']!==architectCSRF)
    return json(res,{error:'Refresh the local session before submitting changes.',code:'session_expired'},403);
   if(req.method==='GET'&&url.pathname==='/api/session')return json(res,{csrf:architectCSRF});
  }
  if(url.pathname.startsWith('/api/player/')){
   if(req.method!=='POST'||!req.headers['content-type']?.startsWith('application/json'))throw Error('Open the library in the local app.');
   const p=await body(req);
   if(url.pathname==='/api/player/community'){
    const entry=community.find(d=>d.key===p.key&&d.validated&&d.commanderIds.length===1);
    if(!entry)throw Error('Choose a validated single-commander import.');
    const byId=new Map(state.cards.map(c=>[oracleId(c),c]));
    const commander=byId.get(entry.commanderIds[0]),cards=entry.mainboard.flatMap(r=>Array(r.quantity).fill(byId.get(r.id)));
    if(!commander||cards.length!==99||cards.some(c=>!c))throw Error('Refresh this import against the current catalog.');
    return json(res,{text:canonicalDeck({commander,cards}),name:entry.title,bracket:entry.edhBracket||3,commanderId:oracleId(commander)});
   }
   return json(res,await playerAction(url.pathname.slice('/api/player/'.length),p,{store:players,catalog:state.cards,context:async p=>{
    const {cards,variants}=await architectInputs(p,{useCollection:false});
    const {snapshot}=await getSpellbookSnapshot({localOnly:true});
    return {catalog:cards,variants,snapshot,asOf:state.meta?.savedAt??null,bracket:Number(p.bracket??3),ownedBasics:p.ownedBasics!==false};
   }}));
  }
  if(url.pathname.startsWith('/api/architect/')){
   if(req.method==='GET'&&url.pathname==='/api/architect/status'){let status;try{status=await architect.status();}catch(e){status={strictPlanOnly:true,paidFallback:false,enabled:false,error:safePlanError(e),models:[],history:[]};}return json(res,{...status,csrf:architectCSRF});}
   if(req.method!=='POST')throw Error('Unsupported Architect method.');const p=await body(req);
   if(url.pathname==='/api/architect/request'){const x=await architectInputs(p);return json(res,architectRequest(p,x.cards,x.variants,x.research));}
   if(url.pathname==='/api/architect/import'){
    const x=await architectInputs(p),optimizeBudget=p.mode==='builder'&&p.optimizeBudget===true;
    const snapshot=(await getSpellbookSnapshot({localOnly:true})).snapshot;
    return json(res,validateForPlayer(p,p.result,x,{optimizeBudget,snapshot}));
   }
   if(url.pathname==='/api/architect/simulate'){
    const x=await architectInputs(p);
    const feed=await getSpellbookSnapshot();
    return json(res,{...architectLab(p,{catalog:x.cards,variants:x.variants,snapshot:feed.snapshot}),snapshotStatus:feed.status});
   }
   if(url.pathname==='/api/architect/run'){
    const x=await architectInputs(p),request=architectRequest(p,x.cards,x.variants,x.research);
    const optimizeBudget=p.mode==='builder'&&!p.revisionRequest&&!p.revisionDeck;
    res.on('close',()=>{if(!res.writableEnded)architect.cancel();});
    try{
     return json(res,await architect.run({prompt:request.prompt,maxRepairs:p.mode==='builder'?0:2,
      validate:async raw=>{
       const snapshot=(await getSpellbookSnapshot({localOnly:true})).snapshot;
       return validateForPlayer(p,raw,x,{optimizeBudget,snapshot});
      }}));
    }catch(e){return architectPlanError(res,e);}
   }
   try{
    if(url.pathname==='/api/architect/connect'){
     const cancelled=new AbortController();
     res.once('close',()=>{if(!res.writableEnded)cancelled.abort();});
     if(req.headers.accept!=='application/x-ndjson')return json(res,{auth:await architect.signIn(p,{signal:cancelled.signal})});
     return await sendWithProgress(req,res,async progress=>{
      try{
       const auth=await architect.signIn(p,{signal:cancelled.signal,openBrowser:url=>progress({phase:'authorize',url})});
       return {auth};
      }catch(err){throw Error(safePlanError(err).message);}
     });
    }
    if(url.pathname==='/api/architect/models')return json(res,{models:await architect.discover()});
    if(url.pathname==='/api/architect/configure'){await architect.configure(p);return json(res,await architect.status());}
    if(url.pathname==='/api/architect/cancel'){architect.cancel();return json(res,{cancelled:true});}
    if(url.pathname==='/api/architect/disconnect'){await architect.disconnect();return json(res,await architect.status());}
   }catch(e){return architectPlanError(res,e);}
   throw Error('Unknown Architect operation.');
  }
  if(req.method==='POST'&&url.pathname==='/api/upgrader/analyze'){
   if(!state.cards.length)throw Error('Load the local Scryfall catalog first.');
   const p=await body(req),mode=p.pricingMode||PRICING_SCRYFALL;
   if(![PRICING_SCRYFALL,PRICING_CM,PRICING_ESTIMATED_EN_NM].includes(mode))throw Error('Unknown pricing mode.');
   if(mode!==PRICING_CM&&!pricingCatalogStatus(state.cards,state.meta).audited)throw Error('Refresh the catalog for eligible-printing prices first.');
   const priced=mode===PRICING_CM?applyCardmarketPrices(state.cards,offers):mode===PRICING_ESTIMATED_EN_NM?applyEstimatedEnglishNM(state.cards):state.cards;
   const library=await readComboLibrary();const variants=library.flatMap(e=>e.variants);
   const inventory=(await players.get()).collection;
   const collectionNames=inventory.enabled?inventory.rows.filter(r=>r.quantity>r.reserved).map(r=>r.name):[];
   const review=upgradeDeck(p,priced,variants,{collectionNames});
   if(review.stage==='review'){
    const parsed=parseUpgradeDeck(review.canExport?review.proposed.deck:review.original.deck,priced,{commanderId:p.commanderId});
    const {snapshot}=await getSpellbookSnapshot({localOnly:true});
    if(parsed.commander&&!parsed.errors.length)review.winConditions=analyzeWinConditions(parsed,{variants,snapshot});
   }
   return json(res,review);
  }
  if(req.method==='GET'&&url.pathname==='/api/status')return json(res,{version:APP_VERSION,count:state.cards.length,metadata:state.meta,printingAudit:pricingCatalogStatus(state.cards,state.meta),update,syncing});
  if(req.method==='GET'&&url.pathname==='/api/cedh/rankings'){
   return json(res,await cedhRankings());
  }
  if(req.method==='GET'&&url.pathname==='/api/community/decks')return json(res,{decks:community.map(d=>({key:d.key,url:d.url,title:d.title,commanderNames:d.commanderNames,totalCards:d.totalCards,validated:d.validated,issues:d.issues,unmatchedCount:d.unmatched?.length||0,unmatched:d.unmatched||[],excluded:d.excluded||[],excludedCount:d.excludedCount||0,sourceIncludedCards:d.sourceIncludedCards,sourceExcludedCards:d.sourceExcludedCards,importedAt:d.importedAt,owner:d.owner,edhBracket:d.edhBracket??null})),count:community.length});
  if(req.method==='POST'&&url.pathname==='/api/community/import'){
   if(!state.cards.length)throw Error('Download the Scryfall catalog first so imported cards can be verified.');
   const p=await body(req);
   if(typeof p.url!=='string'||p.url.length>500)throw Error('Supply a public Archidekt deck URL.');
   const result=await importPublicDeck(p.url,{catalog:state.cards,forceRefresh:p.forceRefresh===true});
   community=await loadCommunity();
   const [winConditions]=await importedWinConditions([result.deck]);
   return json(res,{...result,winConditions});
  }
  if(req.method==='POST'&&url.pathname==='/api/community/combos'){
   if(!state.cards.length)throw Error('Download the Scryfall catalog first.');
   const p=await body(req);
   if(typeof p.deckKey!=='string'||!/^archidekt:[1-9]\d{0,11}$/.test(p.deckKey))throw Error('Choose one saved public Archidekt deck.');
   const target=community.find(d=>d.key===p.deckKey);
   if(!target)throw Error('That deck is not saved locally.');
   if(!target.validated)throw Error('The imported deck must pass validation before combo analysis.');
   const result=await fetchSpellbookForDeck(target,state.cards,{forceRefresh:p.forceRefresh===true,onVerifiedResponse:async parsed=>{try{await recordSpellbookVariants(target.commanderIds[0],parsed);}catch(e){console.error('Combo-library persistence failed:',e.message);}}});
   return json(res,{deckKey:target.key,deckTitle:target.title,...result});
  }
  if(req.method==='POST'&&url.pathname==='/api/community/discover'){
   if(!state.cards.length)throw Error('Load the local Scryfall catalog first.');
   const p=await body(req);const selectedCard=state.cards.find(c=>c.id===p.commanderId);
   if(!selectedCard||!isCommander(selectedCard))throw Error('Select a legal commander first.');
   if(communityDiscoveryBusy)return json(res,{error:'A community search/import is already running.'},409);
   communityDiscoveryBusy=true;
   try{
    const startPage=p.startPage??1;
    if(p.ranked!==true)return json(res,await discoverPublicDecks(selectedCard.name,{bracket:p.bracket,startPage}));
    const catalog=state.cards;
    const pricing=discoveryPricing(p,catalog);
    const inventory=(await players.get()).collection;
    pricing.stock=availableCopies(inventory);
    if(inventory.enabled)pricing.pricingLabel+=' · estimated purchases after available collection credits';
    return await sendWithProgress(req,res,onProgress=>rankPublicDecks({commanderId:oracleId(selectedCard),commanderName:selectedCard.name,
     bracket:p.bracket,startPage,catalog,...pricing,onProgress}));
   }
   finally{communityDiscoveryBusy=false;}
  }
  if(req.method==='POST'&&url.pathname==='/api/community/discover-import'){
   if(!state.cards.length)throw Error('Load the local Scryfall catalog first.');
   const p=await body(req);const selectedCard=state.cards.find(c=>c.id===p.commanderId);
   if(!selectedCard||!isCommander(selectedCard))throw Error('Select a legal commander first.');
   if(communityDiscoveryBusy)return json(res,{error:'A community search/import is already running.'},409);
   communityDiscoveryBusy=true;
   try{const result=await importDiscoveredDecks({commanderId:selectedCard.id,commanderName:selectedCard.name,bracket:p.bracket,startPage:p.startPage??1,ids:p.ids,catalog:state.cards});
    community=await loadCommunity();
    const reports=await importedWinConditions(result.added.map(d=>community.find(stored=>stored.key==='archidekt:'+d.id)));
    return json(res,{...result,added:result.added.map((d,i)=>({...d,winConditions:reports[i]}))});}
   finally{communityDiscoveryBusy=false;}
  }
  if(req.method==='POST'&&url.pathname==='/api/community/auto-research'){
   if(!state.cards.length)throw Error('Download the local Scryfall catalog before automatic research.');
   const p=await body(req);const selectedCard=state.cards.find(c=>c.id===p.commanderId);
   if(!selectedCard||!isCommander(selectedCard))throw Error('Select a legal commander first.');
   if(![2,3,4,5].includes(Number(p.bracket)))throw Error('Choose a specific community Bracket 2, 3, 4 or 5.');
   if(communityDiscoveryBusy)return json(res,{error:'A community search/import is already running.'},409);
   communityDiscoveryBusy=true;
   try{
    const result=await autoResearchArchidekt({commanderId:oracleId(selectedCard),commanderName:selectedCard.name,bracket:Number(p.bracket),budget:p.budget,catalog:state.cards});
    community=await loadCommunity();return json(res,result);
   }finally{communityDiscoveryBusy=false;}
  }
  if(req.method==='GET'&&url.pathname==='/api/community/insights'){
   const id=url.searchParams.get('commanderId')||'';
   if(!id)return json(res,{error:'Select a commander to view matching imported community decks.'},400);
   const bracket=url.searchParams.get('bracket')||null;
   const analysis=communityInsights(community,{commanderId:id,bracket,basicIds:new Set(state.cards.filter(isBasic).map(oracleId))});
   const names=new Map(state.cards.map(c=>[c.id,c.name]));
   analysis.inclusion=analysis.inclusion.map(x=>({...x,name:names.get(x.id)||x.id}));
   analysis.pairings=analysis.pairings.map(x=>({...x,nameA:names.get(x.a)||x.a,nameB:names.get(x.b)||x.b}));
   analysis.distinctivePairings=analysis.distinctivePairings.map(x=>({...x,nameA:names.get(x.a)||x.a,nameB:names.get(x.b)||x.b}));
   analysis.archetypes=analysis.archetypes.map(x=>({...x,signature:x.signature.map(c=>({...c,name:names.get(c.id)||c.id}))}));
   analysis.packages=analysis.packages.map(x=>({...x,cardNames:x.cards.map(cardId=>names.get(cardId)||cardId)}));
   return json(res,analysis);
  }
  if(req.method==='GET'&&url.pathname==='/api/community/build-options'){
   const id=url.searchParams.get('commanderId');const cmd=state.cards.find(c=>c.id===id);
   if(!cmd||!isCommander(cmd))return json(res,{error:'Select a cached legal commander first.'},400);
   const bracket=Number(url.searchParams.get('bracket')||3);
   const prepared=prepareCommunityConstruction({decks:community,commander:cmd,bracket,catalog:state.cards});
   return json(res,communityStrategySummary(prepared));
  }
  if(req.method==='GET'&&url.pathname==='/api/pricing/status')return json(res,{scryfall:{label:'Scryfall EUR estimate (not EN/NM verified)'},cardmarket:{available:!!offers,importedAt:offers?.importedAt||null,matchedCards:offers?.matchedCards||0,counters:offers?.counters||null,coverage:coverage(state.cards,offers),label:'User-imported Cardmarket offers · English Near Mint or Mint · not live verified'}});
  if(req.method==='POST'&&url.pathname==='/api/pricing/import'){
   if(!state.cards.length)throw Error('Download the Scryfall card catalog before importing Cardmarket prices.');
   const p=await body(req);if(typeof p.csv!=='string'||p.csv.length>5_000_000)throw Error('Import a CSV of up to 5 MB.');
   const imported=importCardmarketOffers(p.csv,state.cards);
   await saveCardmarketOffers(imported);offers=imported;return json(res,{matchedCards:offers.matchedCards,counters:offers.counters,importedAt:offers.importedAt,coverage:coverage(state.cards,offers)});
  }
  if(req.method==='POST'&&url.pathname==='/api/sync'){
   if(syncing)return json(res,{message:'Catalog update is already running.',update});
   syncing=true;update={phase:'starting'};
   (async()=>{try{state=await refreshCatalog(p=>{update=p;});console.log('Scryfall cache updated:',state.cards.length);}catch(e){console.error('Scryfall update:',e);update={phase:'error',error:e.message};}finally{syncing=false;}})();
   return json(res,{message:'Started Scryfall bulk API download.'},202);
  }
  if(req.method==='GET'&&url.pathname==='/api/commanders'){
   const q=(url.searchParams.get('q')||'').trim();if(q.length<2)return json(res,[]);
   if(state.cards.length){const ss=q.toLowerCase();return json(res,state.cards.filter(c=>isCommander(c)&&c.name.toLowerCase().includes(ss)).slice(0,30).map(c=>({id:c.id,name:c.name,image_url:c.image_url,color_identity:c.color_identity,price:c.prices?.eur})));}
   const found=await remoteCommanders(q);return json(res,found.map(c=>({id:c.id,name:c.name,image_url:c.image_url,color_identity:c.color_identity,price:c.prices?.eur}))); 
  }
  if(req.method==='POST'&&url.pathname==='/api/generate'){
   if(!state.cards.length)throw Error('Please update the Scryfall catalog before generating a deck.');
   const p=await body(req),catalog=state,priceOffers=offers;const commander=catalog.cards.find(c=>c.id===p.commanderId);if(!commander)throw Error('Selected commander not found in local database. Search after syncing.');
   const combined=p.bracket===COMBINED_BRACKETS;
   if(combined&&p.communityMode!=='off'&&p.communityStrategy&&p.communityStrategy!=='auto')
    throw Error('Choose Automatic community archetype to generate both brackets.');
   const mode=p.pricingMode||PRICING_SCRYFALL;
   if(![PRICING_SCRYFALL,PRICING_CM,PRICING_ESTIMATED_EN_NM].includes(mode))throw Error('Unsupported pricing mode.');
   if(mode!==PRICING_CM&&!pricingCatalogStatus(catalog.cards,catalog.meta).audited)throw Error('This Scryfall catalog predates v1.1.3 printing eligibility checks. Click Update database and wait for the full refresh before generating a budget-constrained deck. Your existing imported community decks are preserved.');
   if(mode===PRICING_CM&&!priceOffers)throw Error('Cardmarket English NM requires imported Cardmarket offer prices. Select a CSV file under Pricing and import it first.');
   const purchasing=budgetPolicy(p);
   if(!purchasing.basicLandsOwned&&mode!==PRICING_SCRYFALL)throw Object.assign(Error('Counting unowned basics currently requires selected Scryfall EUR records; offer/model basics are not priced independently.'),{statusCode:400});
   const pricedCards=mode===PRICING_CM?applyCardmarketPrices(catalog.cards,priceOffers):mode===PRICING_ESTIMATED_EN_NM?applyEstimatedEnglishNM(catalog.cards):catalog.cards;
   const inventory=(await players.get()).collection;
   const candidateCards=collectionCatalog(applyBudgetValuation(pricedCards,purchasing),inventory);
   if(mode===PRICING_CM&&candidateCards.length<400)throw Error(`Only ${candidateCards.length} locally catalogued cards have usable English NM/Mint offer prices (including basics). A full Commander deck requires broader offer coverage. No Scryfall fallback was used.`);
   const selectedCommander=candidateCards.find(c=>c.id===p.commanderId);
   if(!selectedCommander)throw Error('No matching English NM Cardmarket price for this commander in the imported offers. No Scryfall fallback was used.');
   let sharedLookups,edhrecKnowledge;
   async function build(bracket,powerTarget,progress){
    let automaticResearch=null;
    if(p.autoResearch===true&&p.communityMode!=='off'){
     progress({phase:'research',bracket});
     const key=oracleId(commander)+':'+String(bracket);
     const cached=completedAutomaticResearch.get(key),ownsDiscovery=!communityDiscoveryBusy;
     if(ownsDiscovery)communityDiscoveryBusy=true;
     try{
      const result=await researchForGeneration({commanderId:oracleId(commander),commanderName:commander.name,
       bracket:Number(bracket),budget:purchasing.target??Infinity,catalog:catalog.cards,savedCommunity:community,
       reuseDiscovery:Date.now()<(cached?.until||0),reusedAt:cached?.at||null,discoveryBusy:!ownsDiscovery,catalogFetchedAt:catalog.meta?.savedAt||null,sharedLookups});
      // Concurrent Spellbook-only work must not replace a newer imported cohort.
      if(ownsDiscovery)community=result.community;
      automaticResearch=result.report;
      sharedLookups=automaticResearch;
      if(ownsDiscovery&&result.report.discovery.status==='completed')completedAutomaticResearch.set(key,{until:Date.now()+6*60*60*1000,at:result.report.discovery.fetchedAt||new Date().toISOString()});
     }finally{if(ownsDiscovery)communityDiscoveryBusy=false;}
    }
    progress({phase:'build',bracket});
    let localCombos=[],comboLibraryError=null;
    try{localCombos=(await readComboLibrary()).find(x=>x.commanderId===p.commanderId)?.variants||[];}catch(e){comboLibraryError=e.message;console.error('Combo library unavailable:',e.message);}
    const communityMode=p.communityMode==='off'?'off':'auto';
    const communityPrepared=prepareCommunityConstruction({decks:community,commander:selectedCommander,bracket,catalog:candidateCards,mode:communityMode});
    if(communityPrepared.status==='ready'&&typeof p.communityStrategy==='string'&&p.communityStrategy!=='auto'){
     const selected=communityPrepared.candidates.find(x=>x.id===p.communityStrategy);
     if(!selected)throw Error('Selected community strategy is no longer available. Refresh community research and choose another strategy.');
     communityPrepared.selected=selected;communityPrepared.userSelected=true;
    }
    const deck=generateDeck({cards:candidateCards,commander:selectedCommander,budget:purchasing.target,cedhBudgetTier:purchasing.cedhBudgetTier,budgetTolerance:purchasing.tolerance,basicLandsOwned:purchasing.basicLandsOwned,bracket,powerTarget,comboVariants:localCombos,communityBuild:communityPrepared,communityDecks:community,constructionMode:p.constructionMode==='legacy'?'legacy':'strategy-first'});
    deck.communityKnowledge=communityStrategySummary(communityPrepared);
    // Stage 12: optional manually imported EDHREC observation. Never a remote
    // request and never a constructor score or ranking input.
    try{deck.edhrecKnowledge=await (edhrecKnowledge??=readEdhrecCommanderJson({commanderName:commander.name}));}
    catch(e){deck.edhrecKnowledge={status:'unavailable',source:'EDHREC local JSON',error:String(e.message).slice(0,180)};}

    if(automaticResearch){deck.automaticResearch=automaticResearch;
     if(automaticResearch.discovery?.status==='unavailable')deck.warnings.push('Automatic Archidekt research unavailable; built from saved sources/local fallback: '+automaticResearch.discovery.error);
     if(automaticResearch.combos?.status==='unavailable')deck.warnings.push('Automatic Spellbook source check unavailable; retained previously cached combos: '+automaticResearch.combos.error);
     if(['unavailable','partial','cached-fallback'].includes(automaticResearch.commanderLookup?.status))deck.warnings.push('Commander-specific Spellbook research unavailable; retained saved combo library/local fallback: '+automaticResearch.commanderLookup.error);
     if(automaticResearch.discovery?.status==='busy')deck.warnings.push('Archidekt research was busy; built from previously saved community sources.');
    }
    if(automaticResearch?.colorLookup?.status==='unavailable')deck.warnings.push('Color-compatible Spellbook discovery unavailable; retained saved combo knowledge: '+automaticResearch.colorLookup.error);
    // Validate the FINAL exported list, not just intermediate construction costs.
    // Any inconsistency fails closed instead of presenting a misleading budget.
    const audit=auditExportPricing(deck,selectedCommander,candidateCards);
    if(audit.count!==100||audit.missing.length||!audit.agreesWithGenerator||!audit.withinBudget)
     throw Error(`Final price integrity failure: ${audit.count}/100 cards; ${audit.missing.length} unpriced; calculated €${audit.total}; generator €${deck.price}; cap €${deck.budget}. ${audit.anomalies.length?'First mismatches: '+audit.anomalies.slice(0,4).map(x=>x.card+': '+x.reason).join('; ')+'. ':''}No unverified deck exported.`);
    deck.pricingAudit=audit;
    const finalCards=selectedCards(deck);
    if(finalCards?.length===100){
     const {snapshot}=await getSpellbookSnapshot({localOnly:true});
     if(inventory.enabled){
      const market=new Map(pricedCards.map(c=>[oracleId(c),c]));
      deck.collectionPurchases=purchaseSummary(finalCards.map(c=>market.get(oracleId(c))),inventory,purchasing.basicLandsOwned);
     }
     deck.winConditions=analyzeWinConditions({commander:finalCards[0],cards:finalCards.slice(1)},{variants:localCombos,snapshot});
    }
    deck.archidektImport=archidektTextExport(deck.deck);
    deck.tempoEvidence=tempoEvidence((selectedCards(deck)||[]).slice(1));
    deck.pricingCatalog=pricingCatalogStatus(catalog.cards,catalog.meta);
    if(!deck.pricingCatalog.audited)deck.warnings.push(deck.pricingCatalog.warning);
    deck.version=APP_VERSION;
    if(comboLibraryError)deck.warnings.push('Combo library is unreadable; skipped optional combo packages ('+comboLibraryError+').');
    deck.pricing={mode,label:mode===PRICING_CM?'Imported Cardmarket offers · English NM or Mint (not live verified)':mode===PRICING_ESTIMATED_EN_NM?'Modeled English NM price (unverified markup, NOT a Cardmarket quote)':'Scryfall eligible-printing EUR market estimate (not English NM verified)',updatedAt:mode===PRICING_CM?priceOffers.importedAt:catalog.meta?.savedAt||null,shippingIncluded:false};
    deck.warnings=deck.warnings.filter(w=>!w.startsWith('Budget estimates use cached Scryfall EUR prices'));
    deck.warnings.push(mode===PRICING_CM?'Prices from the imported English NM/Mint offer snapshot; offers may be stale or unavailable. Shipping excluded; basics presumed owned.':mode===PRICING_ESTIMATED_EN_NM?'Modeled EN NM prices based on Scryfall EUR. NOT live offers and NOT verified English/NM stock. Shipping excluded; basics presumed owned.':'Scryfall EUR estimates only — NOT verified Cardmarket English NM offers. Shipping excluded; '+purchasing.assumption+'.');
    if(inventory.enabled)deck.pricing.label+=' · purchase budget after available collection credits';
    return deck;
   }
   const powerTarget=p.powerTarget||'balanced';
   return await sendWithProgress(req,res,async progress=>{
    if(!combined)return build(p.bracket===undefined?3:p.bracket,powerTarget,progress);
    const results=[];
    for(const bracket of [3,4]){
     try{
      const deck=await build(bracket,bracket===3?powerTarget:'balanced',progress);
      results.push({bracket,deck});
     }catch(err){
      results.push({bracket,error:String(err.message||err)});
     }
    }
    return {version:APP_VERSION,results};
   });
  }
  if(req.method==='GET'&&staticFiles[url.pathname]){
   const filename=path.join(ROOT,'public',staticFiles[url.pathname]);
   const buf=await readFile(filename);res.writeHead(200,{...headers,'Content-Type':mime[path.extname(filename)]});return res.end(path.extname(filename)==='.html'?buf.toString('utf8').replaceAll('{{APP_VERSION}}',APP_VERSION):buf);
  }
  json(res,{error:'Not found'},404);
 }catch(e){console.error('Request error:',e.message);error(res,e,e.statusCode??(e.message?.includes('Scryfall')?502:400));}
});
server.listen(PORT,'127.0.0.1',()=>console.log(`CommanderOracle Independent running at http://127.0.0.1:${PORT}`));
