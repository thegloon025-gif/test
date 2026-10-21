/** Commander Spellbook integration. On-demand, read-only and explicitly not an
 * oracle for actual in-game executability. Network calls never happen on import
 * or during deck generation. See docs/COMBO_INTELLIGENCE.md.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {oracleId,legalFor,priceOf} from './cards.mjs';
import {satisfyTemplates} from './comboTemplates.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const CACHE=path.join(HERE,'..','data','spellbook-cache');
const ENDPOINT='https://backend.commanderspellbook.com/find-my-combos';
const DAY=24*60*60*1000;
let lastRequest=0;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export const normalizedName=s=>String(s||'').normalize('NFKC').replace(/[‘’]/g,"'").replace(/\s*\/\/\s*/g,' // ').trim().toLowerCase();
const text=x=>typeof x==='string'?x:typeof x?.name==='string'?x.name:typeof x?.description==='string'?x.description:typeof x?.card?.name==='string'?x.card.name:typeof x?.card==='string'?x.card:typeof x?.feature?.name==='string'?x.feature.name:typeof x?.template?.name==='string'?x.template.name:'';
const listText=value=>Array.isArray(value)?value.map(text).filter(Boolean).slice(0,24):typeof value==='string'?[value]:[];
const namesFromUses=variant=>{
 const uses=Array.isArray(variant.uses)?variant.uses:Array.isArray(variant.cards)?variant.cards:[];
 return uses.map(x=>text(x.card||x.used_card||x)).filter(Boolean);
};
const comboUrl=id=>`https://commanderspellbook.com/combo/${encodeURIComponent(id)}/`;
/** Preserve prerequisites and zone constraints; do not claim that merely having
 * every card guarantees you can execute a combo. */
export function normalizeVariant(raw){
 if(!raw||typeof raw!=='object')return null;
 const names=[...new Set(namesFromUses(raw))];
 const id=String(raw.id??raw.spellbook_id??'');
 if(!names.length||!/^\d+(?:(?:-\d+)|(?:--\d+))*$/.test(id))return null;
 const templates=Array.isArray(raw.templateRequirements)?raw.templateRequirements:Array.isArray(raw.requires)?raw.requires:Array.isArray(raw.templates)?raw.templates:[];
 const templateRequirements=templates.map(x=>({name:text(x?.template||x),quantity:Number(x?.quantity??1),scryfallQuery:String(x?.template?.scryfallQuery??x?.template?.scryfall_query??x?.scryfallQuery??''),zoneLocations:Array.isArray(x?.zoneLocations)?x.zoneLocations:[],battlefieldCardState:String(x?.battlefieldCardState||''),exileCardState:String(x?.exileCardState||''),libraryCardState:String(x?.libraryCardState||''),graveyardCardState:String(x?.graveyardCardState||'')})).filter(x=>x.name);
 const uses=(Array.isArray(raw.uses)?raw.uses:Array.isArray(raw.cards)?raw.cards:[]).map(x=>({name:text(x?.card||x?.used_card||x),quantity:Number(x?.quantity??1),zoneLocations:Array.isArray(x?.zoneLocations)?x.zoneLocations:[],battlefieldCardState:String(x?.battlefieldCardState||''),exileCardState:String(x?.exileCardState||''),libraryCardState:String(x?.libraryCardState||''),graveyardCardState:String(x?.graveyardCardState||''),mustBeCommander:x?.mustBeCommander===true})).filter(x=>x.name);
 const prerequisites=[...listText(raw.other_prerequisites),...listText(raw.prerequisites),...listText(raw.mana_needed),...listText(raw.manaNeeded),...listText(raw.easyPrerequisites),...listText(raw.notablePrerequisites)];
 const steps=[...listText(raw.description),...listText(raw.steps)];
 const results=[...listText(raw.produces),...listText(raw.results)];
 return {id,url:comboUrl(id),cards:names,uses,templates:templateRequirements.map(x=>x.name),templateRequirements,manaNeeded:String(raw.manaNeeded??raw.mana_needed??''),manaValueNeeded:Number(raw.manaValueNeeded??0)||0,prerequisites:[...new Set(prerequisites)],steps:[...new Set(steps)],results:[...new Set(results)],isInfinite:results.some(result=>/\binfinite\b|\barbitrarily many\b/i.test(result)),bracket:raw.bracket??null,bracketTag:raw.bracketTag??null,legalities:raw.legalities??null,identity:raw.identity??null,spoiler:raw.spoiler===true};
}
/** Extract documented Find My Combos response groups conservatively.
 * A response shape change is surfaced as an error, never represented as 0 combos. */
export function normalizeFindResponse(raw){
 if(!raw||typeof raw!=='object')throw Error('Commander Spellbook returned an invalid response.');
 const groups=raw.results&&typeof raw.results==='object'&&!Array.isArray(raw.results)?raw.results:raw;
 const pick=(group)=>Array.isArray(group)?group:Array.isArray(group?.variants)?group.variants:Array.isArray(group?.results)?group.results:null;
 const included=pick(groups.included??groups.included_combos??groups.includedCombos);
 const near=pick(groups.almost_included??groups.almostIncluded??groups.almost_included_combos);
 if(!included||!near)throw Error('Commander Spellbook response format changed (missing included/almostIncluded lists). No combos were assumed.');
 const extract=arr=>arr.map(x=>normalizeVariant(x?.variant??x)).filter(Boolean);
 const count=(value,items)=>Number.isInteger(value?.count)?value.count:items.length;
 return {included:extract(included),near:extract(near),reportedIncluded:count(groups.included,included),reportedNear:count(groups.almostIncluded??groups.almost_included,near)};
}
/** The REST API expects quantities with each card, not bare name strings.
 * All identities originate from the locally validated 100-card list.
 * See /schema/swagger/ POST /find-my-combos.
 */
export function spellbookRequest(deck,catalog){
 if(!deck?.validated||deck.totalCards!==100||deck.commanderIds?.length!==1)throw Error('Only validated 100-card single-commander decks can be checked for combos.');
 const byId=new Map(catalog.map(c=>[oracleId(c),c]));
 const commander=byId.get(deck.commanderIds[0]);
 if(!commander)throw Error('Commander not found in local Scryfall catalog.');
 const main=deck.mainboard.map(x=>{
  const card=byId.get(x.id);
  if(!card)throw Error('Deck contains an unmatched Scryfall identity.');
  if(!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>99)throw Error('Deck has an invalid card quantity.');
  return {card:card.name,quantity:x.quantity};
 });
 if(main.reduce((sum,x)=>sum+x.quantity,0)!==99)throw Error('Deck needs exactly 99 mainboard cards.');
 return {commanders:[{card:commander.name,quantity:1}],main};
}
function linkToCatalog(name,catalog){
 const target=normalizedName(name);
 return catalog.find(c=>normalizedName(c.name)===target||normalizedName(c.name.split(' // ')[0])===target);
}
export function annotateCombos(normalized,deck,catalog){
 const byId=new Map(catalog.map(c=>[oracleId(c),c]));
 const commander=byId.get(deck.commanderIds[0]);
 if(!commander)throw Error('Unknown commander in combo annotation.');
 const owned=new Set([...deck.mainboard.map(x=>x.id),...deck.commanderIds]);
 function adapt(v){
  const matched=[],missing=[],unknown=[];let missingEUR=0,unpriced=false,illegal=false;
  const reserved=new Set();
  for(const item of (v.uses?.length?v.uses:v.cards.map(name=>({name,quantity:1})))){
   const card=linkToCatalog(item.name,catalog);
   if(!card){unknown.push(item.name);continue;}
   const id=oracleId(card);reserved.add(id);
   const ownedCount=deck.commanderIds.filter(x=>x===id).length+deck.mainboard.filter(x=>x.id===id).reduce((n,x)=>n+x.quantity,0);
   const required=Number(item.quantity??1);
   if(!Number.isInteger(required)||required<1||required>99){unknown.push(item.name+' (invalid quantity)');continue;}
   if(item.mustBeCommander&&!deck.commanderIds.includes(id)){missing.push(card.name+' (must be commander)');continue;}
   if(ownedCount>=required){matched.push(card.name);continue;}
   missing.push(card.name);
   if(!legalFor(card,commander)&&id!==oracleId(commander))illegal=true;
   const p=priceOf(card);if(p===null)unpriced=true;else missingEUR+=p*(required-ownedCount);
  }
  const apiCommanderLegality=v.legalities?.commander;
  const spellbookLegal=apiCommanderLegality===undefined||apiCommanderLegality===null||apiCommanderLegality==='legal'||apiCommanderLegality===true;
  const comboIdentity=Array.isArray(v.identity)?v.identity:typeof v.identity==='string'?v.identity.match(/[WUBRG]/g)||[]:[];
  const identityAllowed=comboIdentity.every(c=>(commander.color_identity||[]).includes(c));
  const withinColorIdentity=!illegal&&identityAllowed;
  const templateRequirements=v.templateRequirements||v.templates.map(name=>({name,quantity:1}));
  const available=[commander,...deck.mainboard.flatMap(x=>{const card=byId.get(x.id);return card?[card]:[];})];
  const templateMatch=satisfyTemplates(templateRequirements,available,{reservedIds:reserved,idOf:oracleId});
  const namedComplete=missing.length===0&&unknown.length===0;
  const templateSatisfied=templateMatch.satisfied;
  const requiresReview=v.prerequisites.length>0||unknown.length>0||v.spoiler||!spellbookLegal||v.uses?.some(u=>u.zoneLocations.length>0)||templateRequirements.some(t=>t.zoneLocations.length>0)||!templateSatisfied||[...v.uses,...templateRequirements].some(x=>x.battlefieldCardState||x.exileCardState||x.libraryCardState||x.graveyardCardState)||!!v.manaValueNeeded||!!v.manaNeeded;
  const complete=namedComplete&&templateSatisfied&&withinColorIdentity&&spellbookLegal&&!v.spoiler;
  return {...v,matched,missing,unknown,namedComplete,templateSatisfied,templateMatches:templateMatch.matched,unresolvedTemplates:templateMatch.unresolved,complete,executionVerified:false,requiresReview,missingPriceEstimate:unpriced?null:Math.round(missingEUR*100)/100,missingPricesAreScryfallEstimates:true,withinColorIdentity,spellbookLegal};
 }
 const unique=(items)=>[...new Map(items.map(v=>[v.id,v])).values()];
 const checked=unique([...normalized.included,...normalized.near].map(adapt));
 const complete=checked.filter(v=>v.complete);
 const oneAway=checked.filter(v=>v.missing.length===1&&!v.unknown.length&&v.withinColorIdentity&&v.spellbookLegal&&!v.spoiler&&v.templateSatisfied);
 const templatePending=checked.filter(v=>v.namedComplete&&!v.templateSatisfied&&v.withinColorIdentity&&v.spellbookLegal&&!v.spoiler);
 return {complete:complete.slice(0,40),oneAway:oneAway.slice(0,40),templatePending:templatePending.slice(0,40),counts:{complete:complete.length,inventoryComplete:complete.length,namedComplete:checked.filter(v=>v.namedComplete).length,templatePending:templatePending.length,oneAway:oneAway.length,infiniteComplete:complete.filter(v=>v.isInfinite).length,infiniteOneAway:oneAway.filter(v=>v.isInfinite).length,sourceIncluded:normalized.reportedIncluded,sourceNear:normalized.reportedNear},warning:'Named cards and catalog-matched templates prove only inventory coverage, not an executable game state. Check starting zones, timing, payment and all prerequisites.',source:'Commander Spellbook'};
}
/** One bounded request per user action, cache by deck hash and no sweeping. */
export async function fetchSpellbookForDeck(deck,catalog,{fetcher=fetch,now=()=>Date.now(),minGapMs=2000,cacheDir=CACHE,forceRefresh=false,onVerifiedResponse=async()=>{}}={}){
 const request=spellbookRequest(deck,catalog);
 const key=createHash('sha256').update(JSON.stringify(request)).digest('hex');
 const filename=path.join(cacheDir,key+'.json');
 if(!forceRefresh){try{const saved=JSON.parse(await readFile(filename,'utf8'));if(saved.stamp&&now()-saved.stamp<DAY){const parsed=normalizeFindResponse(saved.response);await onVerifiedResponse(parsed);return {...annotateCombos(parsed,deck,catalog),fromCache:true,fetchedAt:new Date(saved.stamp).toISOString()};}}catch(e){if(e.code!=='ENOENT')throw e;}}
 const delay=minGapMs-(now()-lastRequest);if(delay>0)await wait(delay);lastRequest=now();
 const response=await fetcher(ENDPOINT,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json','User-Agent':'CommanderOracleIndependent/0.8'},body:JSON.stringify(request),redirect:'manual',signal:AbortSignal.timeout(25000)});
 if(response.status===429)throw Error('Commander Spellbook is rate-limiting requests; wait and retry.');
 if(response.status===400||response.status===422){
  // Spellbook includes field-specific validation errors in its response body.
  // Show a bounded, text-only excerpt to distinguish bad requests from other faults.
  let detail='';
  try{
   const raw=await response.text();
   const parsed=JSON.parse(raw);
   detail=String(JSON.stringify(parsed)).slice(0,600);
  }catch{}
  throw Error(`Commander Spellbook rejected its request (HTTP ${response.status})${detail?': '+detail:''}. No combos were assumed.`);
 }
 if(!response.ok)throw Error(`Commander Spellbook unavailable (HTTP ${response.status}). No combos were assumed.`);
 const len=Number(response.headers?.get?.('content-length'))||0;if(len>3_000_000)throw Error('Commander Spellbook response too large.');
 const raw=await response.text();if(raw.length>3_000_000)throw Error('Commander Spellbook response too large.');
 let result;try{result=JSON.parse(raw);}catch{throw Error('Commander Spellbook sent non-JSON data.');}
 const parsed=normalizeFindResponse(result);
 await onVerifiedResponse(parsed);
 await mkdir(cacheDir,{recursive:true});const tmp=filename+'.tmp';await writeFile(tmp,JSON.stringify({stamp:now(),response:result}));await rename(tmp,filename);
 return {...annotateCombos(parsed,deck,catalog),fromCache:false,fetchedAt:new Date(now()).toISOString()};
}
