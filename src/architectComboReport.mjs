import {faces,oracleId} from './cards.mjs';
import {normalizeVariant,normalizedName} from './combos.mjs';
import {analyzeDiscoveryCombos,indexDiscoveryCombos} from './discoveryCombos.mjs';
import {sourceStructureEvidence} from './sourceQuality.mjs';
import pinned from './winConditionEvidence.json' with {type:'json'};
import supplement from './architectComboEvidence.json' with {type:'json'};

// Keep published offline examples separate from construction policy. The live
// snapshot takes precedence over saved/pinned versions of the same variant.
export function architectComboReport({commander,cards},variants=[],snapshot=null){
 const catalog=[commander,...cards],byOracle=new Map(catalog.map(c=>[oracleId(c),c]));
 const quantities=new Map();
 for(const card of cards)quantities.set(oracleId(card),(quantities.get(oracleId(card))||0)+1);
 const deck={commanderIds:[oracleId(commander)],mainboard:[...quantities].map(([id,quantity])=>({id,quantity}))};
 // Older/local records may use a printing ID or a name as their identity.
 // Reconcile the small saved library by exact face name for that deck.
 const aliases=new Map();
 for(const c of catalog)for(const name of [c.name,...faces(c).map(f=>f.name)]){
  const key=normalizedName(name);
  if(!aliases.has(key)||aliases.get(key)===oracleId(c))aliases.set(key,oracleId(c));
  else aliases.set(key,null);
 }
 const saved=[...pinned.variants,...supplement.variants,...variants].map(normalizeVariant).filter(Boolean).map(v=>({
  ...v,uses:v.uses.map(u=>u.oracleId&&!byOracle.has(u.oracleId)&&aliases.get(normalizedName(u.name))?
   {...u,oracleId:aliases.get(normalizedName(u.name))}:u)
 }));
 const local=indexDiscoveryCombos(saved);
 const inventory=new Set(catalog.flatMap(c=>[c.name,...faces(c).map(f=>f.name)].map(normalizedName)));
 const matched=[],partials=new Map(),included=new Set();
 const onIncomplete=(variant,reasons)=>{
  if(!partials.has(variant.id))partials.set(variant.id,{variant,reasons});
 };
 const result=analyzeDiscoveryCombos(deck,byOracle,snapshot?.index||local,sourceStructureEvidence(deck,catalog),{
  additionalIndex:snapshot?local:null,onIncomplete,onMatch:line=>{included.add(line.id);matched.push(line);}
 });
 // The rarest-piece index cannot find a package whose anchor is missing.
 // Look for one-away packages with two present pieces or the deck commander.
 for(const list of [snapshot?.variants||[],saved])for(const variant of list){
  if(included.has(variant.id)||partials.has(variant.id)||variant.uses.length<2||variant.spoiler||
     [false,'banned','not_legal'].includes(variant.legalities?.commander))continue;
  if(variant.uses.length===2&&!variant.uses.some(u=>normalizedName(u.name)===normalizedName(commander.name)))continue;
  if(![...(variant.identity||'')].every(c=>commander.color_identity?.includes(c)))continue;
  const missing=variant.uses.filter(u=>!inventory.has(normalizedName(u.name)));
  if(missing.length===1)onIncomplete(variant,['Missing · '+missing[0].name]);
 }
 const partial=[...partials.values()].filter(p=>!included.has(p.variant.id)).sort((a,b)=>
  Number(b.variant.uses.some(u=>u.name===commander.name))-Number(a.variant.uses.some(u=>u.name===commander.name))||
  b.variant.uses.length-a.variant.uses.length||a.variant.id.localeCompare(b.variant.id));
 return {...result,matched,partial:partial.slice(0,24),omittedPartial:Math.max(0,partial.length-24),
  incomplete:partial.slice(0,8).map(({variant,reasons})=>({id:variant.id,missing:reasons})),
  coverage:snapshot?'Commander Spellbook snapshot'+(snapshot.timestamp?' · '+snapshot.timestamp.slice(0,10):''):'Saved and bundled Spellbook variants only'};
}
