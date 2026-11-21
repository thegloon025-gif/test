import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {normalizeVariant} from '../src/combos.mjs';
import {discoverPublicDecks,importDiscoveredDecks} from '../src/discovery.mjs';
import {analyzeDiscoveryCombos,indexDiscoveryCombos} from '../src/discoveryCombos.mjs';
import {rankPublicDecks} from '../src/rankedDiscovery.mjs';
import {createSpellbookSnapshotStore,SPELLBOOK_EXPORT} from '../src/spellbookSnapshot.mjs';

const base={type_line:'Sorcery',legalities:{commander:'legal'},color_identity:[],colors:[],prices:{eur:1},cmc:2};
const card=(id,name,extra={})=>({...base,id,name,...extra});
const zax=card('zax','Zaxara, the Exemplary',{type_line:'Legendary Creature — Nightmare Hydra',color_identity:['B','G','U'],cmc:4,
 oracle_text:'Deathtouch\n{T}: Add two mana of any one color.'});
const ula=card('ula','Ulalek, Fused Atrocity',{type_line:'Legendary Creature — Eldrazi',color_identity:['W','U','B','R','G'],cmc:5});
const freed=card('freed','Freed from the Real',{type_line:'Enchantment — Aura',colors:['U'],color_identity:['U'],cmc:3});
const pemmin=card('pemmin',"Pemmin's Aura",{type_line:'Enchantment — Aura',colors:['U'],color_identity:['U'],cmc:3});
const echoes=card('echoes','Echoes of Eternity',{type_line:'Kindred Enchantment — Eldrazi',cmc:6});
const fleshraker=card('fleshraker','Glaring Fleshraker',{type_line:'Creature — Eldrazi Drone',cmc:3});
const kozilek=card('kozilek','Kozilek, the Broken Reality',{type_line:'Legendary Creature — Eldrazi',cmc:9});
const displacer=card('displacer','Eldrazi Displacer',{type_line:'Creature — Eldrazi',color_identity:['W'],cmc:3});
const brood=card('brood','Brood Monitor',{type_line:'Creature — Eldrazi Drone',color_identity:['G'],cmc:6});
const reflection=card('reflection','Mana Reflection',{type_line:'Enchantment',color_identity:['G'],cmc:6});
const forest=card('forest','Forest',{type_line:'Basic Land — Forest',color_identity:['G'],cmc:0});
const tutor=card('tutor','Demonic Tutor',{color_identity:['B'],oracle_text:'Search your library for a card, put that card into your hand, then shuffle.'});
const fancy=card('collector','High priced spell',{prices:{eur:250}});
const missing=card('missing','Unpriced spell',{prices:{eur:null}});
const filler=Array.from({length:64},(_,i)=>card('filler-'+i,'Filler '+i));
const catalog=[zax,ula,freed,pemmin,echoes,fleshraker,kozilek,displacer,brood,reflection,forest,tutor,fancy,missing,...filler];
const byOracle=new Map(catalog.map(c=>[c.id,c]));

// Public Spellbook variant IDs and outcome/prerequisite excerpts. Fixture
// identities are local IDs and the filler cards only complete test decklists.
function variant(id,cards,results,extra={}){
 return {id,status:'OK',legalities:{commander:true},uses:cards.map(c=>({
  card:{oracleId:c.id,name:c.name},zoneLocations:['B'],quantity:1
 })),requires:[],produces:results.map(name=>({feature:{name}})),...extra};
}
const zaxFreed=variant('1835-4222',[zax,freed],['Infinite colored mana'],{
 identity:'BGU',notablePrerequisites:'Freed from the Real attached to Zaxara.\nZaxara does not have summoning sickness.'
});
const zaxPemmin=variant('1835-3525',[zax,pemmin],['Infinite colored mana'],{identity:'BGU'});
const ulalekCombo=variant('5642-5657-5705',[ula,fleshraker,echoes],[
 'Infinite creature LTB','Infinite creature ETB','Infinite creature sacrifice triggers','Infinite damage'
],{identity:'WUBRG',notablePrerequisites:'You have a colorless Eldrazi card in hand with the mana to cast it.',
 description:"Glaring Fleshraker's second ability triggers, dealing 1 damage to each opponent.\nRepeat."});
const displacerCombo=variant('1996-4013',[displacer,brood],[
 'Infinite death triggers','Infinite creature ETB','Infinite creature LTB','Infinite creature sacrifice triggers'
],{identity:'GW',manaNeeded:'{2}{C}',manaValueNeeded:3});
const fixtures=[zaxFreed,zaxPemmin,ulalekCombo,displacerCombo];
const smallIndex=raw=>indexDiscoveryCombos(raw.map(normalizeVariant));
const structure={earlyRamp:7,positiveDraw:5,conditionalDraw:3,dedicatedShields:2};
function analyze(commander,main,variants=fixtures){
 return analyzeDiscoveryCombos({commanderIds:[commander.id],mainboard:main.map(c=>({id:c.id,quantity:1}))},
  byOracle,smallIndex(variants),structure);
}

function archidektFixture(id,edhBracket,commander,pieces=[],{maybe=[]}={}){
 const row=(c,quantity=1,category='Mainboard')=>({quantity,categories:[category],card:{oracleCard:{uid:c.id,name:c.name}}});
 return {id,edhBracket,name:'Deck '+id,owner:{username:'player'+id},
  categories:[{name:'Commander',isPremier:true,includedInDeck:true},{name:'Mainboard',includedInDeck:true},
   {name:'Maybeboard',includedInDeck:false}],
  cards:[row(commander,1,'Commander'),row(forest,36),
   ...[...pieces,...filler.slice(0,63-pieces.length)].map(c=>row(c)),...maybe.map(c=>row(c,1,'Maybeboard'))]};
}
const response=value=>Response.json(value);
const snapshotValue=(variants=fixtures)=>({status:'ready',source:'fixture',snapshot:{
 index:smallIndex(variants),variants,timestamp:'2026-11-19T00:00:00.000Z',skipped:0
}});
let fixtureNumber=0;
function mockSearch(listings,data){
 const name=zax.name+' Fixture '+(++fixtureNumber);
 const calls={pages:[],details:[],snapshots:0},progress=[];
 const fetcher=async url=>{
  const u=new URL(url);
  if(u.pathname.endsWith('/v3/')){
   const page=Number(u.searchParams.get('page'));
   calls.pages.push(page);
   return response({results:listings[page-1]||[],next:listings.length>page?'next':null});
  }
  const id=Number(u.pathname.split('/')[3]);
  calls.details.push(id);
  return response(data[id]);
 };
 return {calls,progress,options:{commanderId:zax.id,commanderName:name,catalog,
  budgetMaximum:191,pricingLabel:'Scryfall EUR estimate',archidektOptions:{minGapMs:0,fetcher},
  onProgress:event=>progress.push(event),snapshot:async()=>{calls.snapshots++;return snapshotValue();}}};
}

test('ranked Bracket 3 and Bracket 4 searches verify the actual commander, bracket and cardlist',async()=>{
 const indexed=[[{id:1,edhBracket:3},{id:2,edhBracket:4},{id:3,edhBracket:null},
  {id:4,edhBracket:3},{id:5,edhBracket:3},{id:6,edhBracket:4}]];
 const published={
  1:archidektFixture(1,3,zax,[freed]),2:archidektFixture(2,4,zax,[pemmin]),
  4:archidektFixture(4,3,ula,[echoes]),5:archidektFixture(5,null,zax,[freed]),
  6:archidektFixture(6,3,zax,[pemmin])
 };
 const {options,calls}=mockSearch(indexed,published);
 const b3=await rankPublicDecks({...options,bracket:3});
 assert.deepEqual(b3.results.map(d=>[d.id,d.edhBracket,d.combo.counts.twoCard]),[['1',3,1]]);
 assert.equal(b3.unknownBracket,1);
 assert.equal(b3.unconfirmedBracket,1);
 assert.equal(b3.results[0].combo.details[0].commanderInvolved,true);
 assert.ok(b3.skipped.some(d=>d.id==='4'&&/commander/i.test(d.reason)));
 const b4=await rankPublicDecks({...options,bracket:4});
 assert.deepEqual(b4.results.map(d=>[d.id,d.edhBracket,d.combo.counts.twoCard]),[['2',4,1]]);
 assert.ok(b4.skipped.some(d=>d.id==='6'));
 assert.deepEqual(calls.details.sort(),[1,2,4,5,6]);
});

test('default combines both brackets in one bounded search and deduplicates IDs and identical source lists',async()=>{
 const {options,calls,progress}=mockSearch([
  [...Array.from({length:6},(_,i)=>({id:10+i,edhBracket:3})),{id:10,edhBracket:3},{id:1,edhBracket:null}],
  [{id:10,edhBracket:3},{id:20,edhBracket:4},{id:21,edhBracket:4},{id:22,edhBracket:4}]
 ],{
  10:archidektFixture(10,3,zax,[freed]),11:archidektFixture(11,3,zax,[],{maybe:[freed]}),
  12:archidektFixture(12,3,ula),13:archidektFixture(13,3,ula),14:archidektFixture(14,3,ula),15:archidektFixture(15,3,ula),
  20:archidektFixture(20,4,zax,[freed]),21:archidektFixture(21,4,zax,[freed,pemmin]),
  22:archidektFixture(22,4,zax,[pemmin])
 });
 const result=await rankPublicDecks(options);
 assert.equal(result.bracket,'3+4');
 assert.deepEqual(calls.pages,[1,2]);
 assert.equal(calls.details.filter(id=>id===10).length,1);
 assert.equal(result.duplicateDecks,1);
 assert.deepEqual(result.results.map(d=>d.id).sort(),['10','11','21','22']);
 assert.equal(result.results[0].id,'21');
 assert.equal(result.results.at(-1).combo.counts.total,0); // Maybeboard has Freed, the main deck does not.
 assert.deepEqual(result.results.find(d=>d.id==='10').sources.map(d=>d.edhBracket),[3,4]);
 assert.equal(calls.snapshots,1);
 assert.deepEqual([...new Set(progress.map(event=>event.phase))],['search','verify','spellbook','score']);
 const again=await rankPublicDecks(options);
 assert.equal(again.fromCache,true);
 assert.equal(calls.details.length,9);
 const dir=await mkdtemp(join(tmpdir(),'commander-ranked-import-'));
 try{
  const result=await importDiscoveredDecks({commanderId:zax.id,commanderName:options.commanderName,
   bracket:'3+4',ids:['10','21'],catalog,file:join(dir,'decks.json'),...options.archidektOptions});
  assert.equal(result.importedCount,2);
 }finally{await rm(dir,{force:true,recursive:true});}
});

test('combined preview quota leaves slots for Bracket 4 behind a full Bracket 3 page',async()=>{
 const requests=[];
 const result=await discoverPublicDecks('Quota commander',{bracket:'3+4',minGapMs:0,fetcher:async url=>{
  const page=Number(new URL(url).searchParams.get('page'));
  requests.push(page);
  return response({results:Array.from({length:20},(_,i)=>({id:page*100+i,edhBracket:page===1?3:4})),next:'more'});
 }});
 assert.deepEqual(requests,[1,2]);
 assert.equal(result.previews.filter(d=>d.edhBracket===3).length,6);
 assert.equal(result.previews.filter(d=>d.edhBracket===4).length,6);
});

test('Zaxara counts as a named piece in both two-card lines and each line is an engine',()=>{
 const result=analyze(zax,[freed,pemmin]);
 assert.deepEqual(result.counts,{total:2,twoCard:2,threeCard:0,directWins:0,delayedWins:0,engines:2});
 for(const line of result.details){
  assert.equal(line.commanderInvolved,true);
  assert.equal(line.namedPieces,2);
  assert.equal(line.requiredCards,2);
  assert.deepEqual(line.kinds,['mana']);
  assert.match(line.payoff,/spend the generated mana/);
 }
 assert.match(result.details.find(line=>line.id===zaxFreed.id).prerequisites.join(' '),/summoning sickness/);
 assert.equal(result.scoring.independent,1);
 assert.equal(result.details[1].relationship,'Redundant route');
});
test('Ulalek needs a separate colorless Eldrazi to cast and the three named pieces can win directly',()=>{
 assert.equal(analyze(ula,[fleshraker,echoes]).counts.total,0);
 assert.equal(analyze(ula,[fleshraker,kozilek]).counts.total,0);
 const result=analyze(ula,[fleshraker,echoes,kozilek]);
 assert.equal(result.counts.threeCard,1);
 assert.equal(result.counts.directWins,1);
 assert.equal(result.details[0].commanderInvolved,true);
 assert.equal(result.details[0].namedPieces,3);
 assert.deepEqual(result.details[0].supportingCards,[{zone:'Hand',cards:[kozilek.name]}]);
 assert.match(result.details[0].prerequisites.join(' '),/mana to cast/);
});
test('Eldrazi Displacer and Brood Monitor only report the documented trigger loops',()=>{
 const result=analyze(ula,[displacer,brood]);
 assert.equal(result.counts.twoCard,1);
 assert.equal(result.counts.engines,1);
 const line=result.details[0];
 assert.equal(line.directWin,false);
 assert.equal(line.commanderInvolved,false);
 assert.equal(line.manaNeeded,'{2}{C}');
 assert.deepEqual(line.kinds,['enter-the-battlefield triggers','leave-the-battlefield or death triggers','sacrifice']);
});

test('Mana Reflection and Pemmin’s Aura require a separate creature that can tap for blue',()=>{
 const reflectionAura=variant('579-3525',[reflection,pemmin],['Infinite blue mana'],{
  notablePrerequisites:"You control a creature that can tap to produce at least {U}, and Pemmin's Aura is attached to that creature."
 });
 const unconfirmed=analyze(ula,[reflection,pemmin,brood],[reflectionAura]);
 assert.equal(unconfirmed.counts.total,0);
 assert.equal(unconfirmed.unresolvedPrerequisites,1);
 const result=analyze(zax,[reflection,pemmin],[reflectionAura]);
 assert.equal(result.counts.twoCard,1);
 assert.equal(result.details[0].commanderInvolved,false);
 assert.deepEqual(result.details[0].supportingCards,[{zone:'Battlefield',cards:[zax.name]}]);
});

test('required quantities, command zones and wildcard card slots prevent incomplete false positives',()=>{
 assert.equal(analyze(zax,[]).counts.total,0);
 const mustCommand=variant('1-2',[zax,freed],['Infinite colored mana']);
 mustCommand.uses[0].zoneLocations=['C'];
 assert.equal(analyze(ula,[zax,freed],[mustCommand]).counts.total,0);
 assert.equal(analyze(zax,[freed],[mustCommand]).counts.total,1);
 const quantity=variant('1-3',[zax,freed],['Infinite colored mana']);
 quantity.uses[1].quantity=2;
 assert.equal(analyze(zax,[freed],[quantity]).counts.total,0);
 const wildcard=variant('1-3--4',[zax,freed],['Infinite colored mana'],{
  requires:[{template:{name:'A creature'},zoneLocations:['B'],quantity:1}]
 });
 assert.equal(analyze(zax,[freed],[wildcard]).counts.total,0);
 const valid=analyze(zax,[freed,brood],[wildcard]);
 assert.equal(valid.counts.threeCard,1);
 assert.deepEqual(valid.details[0].templateMatches,[brood.name]);
 const unknown=variant('1-3--5',[zax,freed],['Infinite colored mana'],{
  requires:[{template:{name:'An unmanaged inside-out resource'},quantity:1}]
 });
 assert.equal(analyze(zax,[freed],[unknown]).unresolvedTemplates,1);
 assert.equal(analyze(zax,[freed],[unknown]).counts.total,0);
});

test('results classify direct wins, delayed wins, and mill, draw and token engines',()=>{
 const results=[
  variant('111',[zax,freed],['Infinite damage to all opponents']),
  variant('112',[zax,pemmin],['Win the game at the beginning of your next upkeep']),
  variant('113',[freed,pemmin],['Infinite creature tokens','Infinite mill','Infinite draw']),
  variant('114',[zax,tutor],['Infinite damage to one opponent'])
 ];
 const matched=analyze(zax,[freed,pemmin,tutor],results);
 assert.equal(matched.counts.directWins,1);
 assert.equal(matched.counts.delayedWins,1);
 assert.equal(matched.counts.engines,2);
 assert.deepEqual(matched.details.find(line=>line.id==='113').kinds,['tokens','mill','draw']);
 assert.equal(matched.details.find(line=>line.id==='114').directWin,false);
});

test('combo score rewards compact lines and tutors, limits redundant variants and caps raw volume',()=>{
 const alone=analyze(zax,[freed],[zaxFreed]);
 const duplicate={...zaxFreed,id:'1-999',uses:zaxFreed.uses.slice().reverse()};
 const same=analyze(zax,[freed],[zaxFreed,duplicate]);
 assert.equal(same.counts.total,1);
 assert.equal(same.details[0].variantCount,2);
 assert.equal(same.scoring.points,alone.scoring.points);
 assert.ok(analyze(zax,[freed,tutor],[zaxFreed]).scoring.points>alone.scoring.points);
 const two=analyze(zax,[freed,pemmin]);
 assert.ok(two.scoring.points>alone.scoring.points);
 const late=Array.from({length:18},(_,i)=>variant('100-'+(i+1),[zax,freed,pemmin,kozilek,...filler.slice(0,i)],['Infinite creature tokens']));
 const impractical=analyze(zax,[freed,pemmin,kozilek,...filler],late);
 assert.ok(two.scoring.points>impractical.scoring.points);
 assert.ok(two.scoring.points<=20);
});

test('unavailable combo data yields unknown counts and preserves budget and structural ranking',async()=>{
 const {options}=mockSearch([[{id:1,edhBracket:3},{id:2,edhBracket:4},{id:3,edhBracket:4}]],{
  1:archidektFixture(1,3,zax,[freed]),2:archidektFixture(2,4,zax,[fancy]),3:archidektFixture(3,4,zax,[missing])
 });
 const result=await rankPublicDecks({...options,snapshot:async()=>{throw Error('Spellbook offline');}});
 assert.equal(result.spellbook.status,'unavailable');
 assert.equal(result.spellbook.error,'Spellbook offline');
 for(const row of result.results){
  assert.equal(row.combo.counts,null);
  assert.equal(row.scoreBreakdown.combos,null);
  assert.ok(Number.isFinite(row.score));
 }
 assert.equal(result.results.find(d=>d.id==='1').estimatedEur,64);
 assert.equal(result.results.find(d=>d.id==='1').budgetStatus,'within-budget');
 assert.equal(result.results.find(d=>d.id==='2').budgetStatus,'over-budget');
 assert.equal(result.results.find(d=>d.id==='3').budgetStatus,'unconfirmed');
 assert.equal(result.results.find(d=>d.id==='3').estimatedEur,null);
});

test('missing active-mode prices are never substituted with Scryfall amounts',async()=>{
 const {options}=mockSearch([[{id:1,edhBracket:3}]],{1:archidektFixture(1,3,zax,[freed])});
 const result=await rankPublicDecks({...options,pricedCatalog:[forest,{...zax,prices:{eur:9.5}}],pricingLabel:'Imported offers'});
 assert.equal(result.pricingLabel,'Imported offers');
 assert.deepEqual(result.results.map(d=>[d.knownEur,d.unpricedCards,d.budgetStatus]),[[9.5,63,'unconfirmed']]);
 assert.equal(result.results[0].combo.counts.twoCard,1);
});

const archive=variants=>JSON.stringify({timestamp:'2026-11-18T22:13:17.179328+00:00',version:'7.4.4',variants,aliases:[]});
function fragmentedResponse(text){
 const bytes=Buffer.from(text);
 return new Response(new ReadableStream({
  start(controller){
   for(let i=0;i<bytes.length;i+=17)controller.enqueue(bytes.subarray(i,i+17));
   controller.close();
  }
 }));
}
test('snapshot is streamed, cached once, reused after restart, and retained during refresh failure',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'commander-spellbook-snapshot-'));
 try{
  const file=join(dir,'snapshot.json.gz');
  let calls=0,now=Date.UTC(2026,10,19),fail=false;
  const fetcher=async(url,init)=>{
   assert.equal(url,SPELLBOOK_EXPORT);
   assert.match(init.headers['User-Agent'],/CommanderOracle/);
   calls++;
   if(fail)return new Response(null,{status:429,headers:{'Retry-After':'300'}});
   return fragmentedResponse(archive([{...zaxFreed,description:'Tap {"full \\"string\\""} — repeat.'},zaxPemmin]));
  };
  const options={file,fetcher,minGapMs:0,now:()=>now,maxAgeMs:1000};
  const store=createSpellbookSnapshotStore(options);
  const absent=await store({localOnly:true});
  assert.equal(absent.status,'unavailable');
  assert.equal(calls,0);
  const [first,parallel]=await Promise.all([store(),store()]);
  assert.equal(first.source,'download');
  assert.equal(parallel.snapshot,first.snapshot);
  assert.equal(first.snapshot.variants[0].steps[0],'Tap {"full \\"string\\""} — repeat.');
  assert.deepEqual([...await readFile(file)].slice(0,2),[31,139]);
  assert.equal((await store()).source,'memory');
  const restarted=createSpellbookSnapshotStore(options);
  const [disk,parallelDisk]=await Promise.all([restarted({localOnly:true}),restarted({localOnly:true})]);
  assert.equal(disk.source,'disk');
  assert.equal(disk.snapshot,parallelDisk.snapshot);
  assert.equal(disk.snapshot.variants.length,2);
  assert.equal(calls,1);
  now+=2000;
  fail=true;
  const stale=await restarted();
  assert.equal(stale.status,'stale');
  assert.equal(stale.snapshot.timestamp,disk.snapshot.timestamp);
  assert.match(stale.error,/429/);
  assert.equal((await restarted()).snapshot,stale.snapshot);
  assert.equal(calls,2);
 }finally{await rm(dir,{force:true,recursive:true});}
});
test('truncated or changed export is unavailable and never cached as zero complete combos',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'commander-spellbook-truncated-'));
 try{
  const file=join(dir,'snapshot.json.gz');
  const store=createSpellbookSnapshotStore({file,minGapMs:0,
   fetcher:async()=>fragmentedResponse(archive(fixtures).slice(0,-5))});
  const result=await store();
  assert.equal(result.status,'unavailable');
  assert.equal(result.snapshot,null);
  await assert.rejects(readFile(file),{code:'ENOENT'});
 }finally{await rm(dir,{force:true,recursive:true});}
});
