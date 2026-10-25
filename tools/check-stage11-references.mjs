/** PRIVATE held-out preprocessing only; never pass references into generation.
 * node tools/check-stage11-references.mjs PACK CATALOG COMMUNITY PRIVATE_OUT
 * Original lists remain local. Filter exact sources and >=80% nonbasic-name
 * overlap before independent held-out generation; do not tune from differences. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isBasic,oracleId,priceOf,legalFor} from '../src/cards.mjs';
import {exportCardName,validateCommanderSingleton} from '../src/deckValidation.mjs';
import {strategyRelations} from '../src/strategyRelations.mjs';
const[pack,catalogFile,communityFile,out,identityMapFile]=process.argv.slice(2);if(!out)throw Error('PACK CATALOG COMMUNITY PRIVATE_OUT required');
const load=async f=>JSON.parse(await readFile(f)),catalog=await load(catalogFile),manifest=await load(path.join(pack,'manifest.json')),data=await load(communityFile),decks=data.decks||data;
const norm=s=>s.normalize('NFKC').trim().toLowerCase(),byName=new Map();for(const c of catalog){for(const n of[c.name,exportCardName(c),c.card_faces?.[0]?.name||c.name.split(' // ')[0]]){const list=byName.get(norm(n))||[];if(!list.includes(c))list.push(c);byName.set(norm(n),list);}}
const confirmed=identityMapFile?await load(identityMapFile):{},rows=[],bags=[];
for(const entry of manifest.entries){
 const source=await readFile(path.join(pack,entry.path),'utf8'),names=[];
 for(const line of source.split(/\r?\n/)){const m=line.trim().match(/^(\d+)x?\s+(.+?)(?:\s+\[Commander\]|\s+\*CMDR\*)?$/i);if(m)for(let i=0;i<Number(m[1]);i++)names.push(m[2]);}
 const commanderName=confirmed[entry.path]||entry.commander_candidate,commander=catalog.find(c=>c.name===commanderName),missing=[],ambiguous=[];
 const chosen=names.map(n=>{const candidates=(byName.get(norm(n))||[]).filter(c=>Number.isFinite(priceOf(c)));if(!candidates.length){missing.push(n);return null;}candidates.sort((a,b)=>priceOf(a)-priceOf(b)||String(a.id).localeCompare(String(b.id)));if(candidates.length>1)ambiguous.push(n);return candidates[0];}).filter(Boolean);
 const at=chosen.findIndex(c=>c.name===commanderName);if(at>=0)chosen.splice(at,1);
 const singleton=commander?validateCommanderSingleton(commander,chosen):null;
 const identityStatus=confirmed[entry.path]?'user-confirmed command-zone identity; Scryfall record checked':commanderName?.startsWith('Betor,')?'unresolved; both Betor cards present without explicit command-zone marker':'manifest candidate present once; Scryfall record verified, command zone inferred';
 const relations=commander?strategyRelations(chosen,commander):null;
 rows.push({path:entry.path,commander:commanderName,commanderId:commander?oracleId(commander):null,selectedRecordIds:chosen.map(oracleId),identityStatus,inputSHA256:createHash('sha256').update(source).digest('hex'),totalCount:names.length,matched:chosen.length+(at>=0?1:0),missing,ambiguous:[...new Set(ambiguous)],singleton:singleton?.valid??false,colorLegal:!!commander&&chosen.every(c=>legalFor(c,commander)),value:missing.length||!commander?null:Math.round(([commander,...chosen]).reduce((n,c)=>n+priceOf(c),0)*100)/100,priceAssumption:'Cheapest eligible matching frozen catalog record; basics owned, commander included; not historical shipped estimate',historicalLabel:entry.historical_labeled_eur,capabilities:relations?.capabilities,relationships:relations?.relationships,unsupported:relations?.unknowns});
 bags.push(new Set([...(commander?[commander]:[]),...chosen].filter(c=>!isBasic(c)).map(c=>norm(exportCardName(c)))));
}
// Confirmed test2 is separately fetched via the supported public Archidekt API.
try{const d=await load(path.join(pack,'test2-normalized.json'));const byId=new Map(catalog.map(c=>[String(oracleId(c)),c]));const commander=catalog.find(c=>String(oracleId(c))===String(d.commanderIds[0]));const cards=d.mainboard.flatMap(x=>Array.from({length:x.quantity},()=>byId.get(String(x.id)))).filter(Boolean);rows.push({path:'confirmed-test2',commander:commander?.name,commanderId:commander?oracleId(commander):null,selectedRecordIds:cards.map(oracleId),identityStatus:d.validated?'Public API command zone validated':'invalid',totalCount:cards.length+1,matched:cards.length+1,value:Math.round([commander,...cards].reduce((n,c)=>n+priceOf(c),0)*100)/100,singleton:validateCommanderSingleton(commander,cards).valid,colorLegal:cards.every(c=>legalFor(c,commander)),capabilities:strategyRelations(cards,commander).capabilities});bags.push(new Set([commander,...cards].filter(c=>!isBasic(c)).map(c=>norm(exportCardName(c)))));}catch(e){rows.push({path:'confirmed-test2',status:'unverified',error:e.message});}
const byId=new Map(catalog.map(c=>[String(oracleId(c)),c])),excluded=[],kept=[];
for(const deck of decks){const bag=new Set((deck.mainboard||[]).map(x=>byId.get(String(x.id))).filter(c=>c&&!isBasic(c)).map(c=>norm(exportCardName(c))));
 const overlaps=bags.map(b=>[...bag].filter(n=>b.has(n)).length/Math.max(1,Math.min(b.size,bag.size)));
 if(deck.key==='archidekt:26715826'||overlaps.some(n=>n>=.8))excluded.push({key:deck.key,maximumOverlap:Math.max(...overlaps)});else kept.push(deck);
}
await mkdir(out,{recursive:true});await writeFile(path.join(out,'reference-analysis-private.json'),JSON.stringify({rows,excluded,leakage:'Name-multiset exclusion >=80%; unknown private aliases/undetected derivatives remain possible'},null,2));await writeFile(path.join(out,'heldout-community.json'),JSON.stringify({version:1,decks:kept}));
console.log(JSON.stringify({references:rows.length,excluded:excluded.length,retained:kept.length,unresolvedCommanders:rows.filter(r=>r.identityStatus?.startsWith('unresolved')).map(r=>r.commander)}));
