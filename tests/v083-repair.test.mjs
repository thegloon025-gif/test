import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeFindResponse,annotateCombos,spellbookRequest,normalizeVariant} from '../src/combos.mjs';
import {readComboLibrary,recordSpellbookVariants,repairComboLibraryFromCache} from '../src/comboLibrary.mjs';
import {templatePredicate} from '../src/comboTemplates.mjs';
import {proposeComboPackages} from '../src/comboConstruction.mjs';
import {planFor} from '../src/mechanics.mjs';

const fixture=JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)),'fixtures','ulalek-spellbook-recorded.json'),'utf8'));
const source=normalizeFindResponse(fixture);
const c=(name,type,mv=3,oracle='',extra={})=>({id:name,name,type_line:type,cmc:mv,mana_cost:`{${mv}}`,oracle_text:oracle,legalities:{commander:'legal'},color_identity:[],prices:{eur:1},...extra});
const commander=c('Ulalek, Fused Atrocity','Legendary Creature — Eldrazi',5,'Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control.',{color_identity:['W','U','B','R','G']});
const req=(id)=>source.included.find(v=>v.id===id);

test('recorded Ulalek source contains precisely 10 included and 115 near, including all five template IDs',()=>{
 assert.equal(source.included.length,10);
 assert.equal(source.near.length,115);
 assert.deepEqual(source.included.filter(v=>v.templateRequirements.length).map(v=>v.id).sort(),['2751-5637-5657--34','5637-5642-5657--34']);
 assert.equal(source.near.filter(v=>v.templateRequirements.length).length,3);
 assert.ok(source.included.every(v=>v.legalities?.commander===true));
 for(const v of source.included.filter(v=>v.templateRequirements.length)){
  assert.equal(v.templateRequirements[0].zoneLocations[0],'H');
  assert.equal(v.templateRequirements[0].scryfallQuery,'(t:eldrazi or keyword:changeling) t:creature mv>3 mv<7');
  assert.equal(v.executionVerified,undefined);
 }
});

test('real template query accepts castable Eldrazi MV 4/5/6 and Changeling, rejects false matches',()=>{
 const pred=templatePredicate(req('5637-5642-5657--34').templateRequirements[0]);
 assert.ok(pred);
 for(const mv of [4,5,6])assert.equal(pred(c('Eldrazi '+mv,'Creature — Eldrazi',mv)),true);
 assert.equal(pred(c('Low','Creature — Eldrazi',3)),false);
 assert.equal(pred(c('High','Creature — Eldrazi',7)),false);
 assert.equal(pred(c('Eldrazi in rules text','Creature — Human',5,'Search your library for an Eldrazi card')),false);
 assert.equal(pred(c('Noncreature Eldrazi','Kindred Enchantment — Eldrazi',5)),false);
 assert.equal(pred(c('Changeling','Creature — Shapeshifter',5,'Changeling (This card is every creature type.)')),true);
 assert.equal(pred(c('Changeling keyword','Creature — Shapeshifter',5,'', {keywords:['Changeling']})),true);
 const backface=c('Back face only','Artifact',5,'',{layout:'transform',card_faces:[{name:'Artifact front',type_line:'Artifact',mana_cost:'{5}'},{name:'Eldrazi back',type_line:'Creature — Eldrazi',mana_cost:''}]});
 assert.equal(pred(backface),false);
 assert.equal(templatePredicate({name:'Unverifiable rules text',scryfallQuery:'(t:eldrazi or t:zombie) t:creature'}),null);
});

test('the source’s two template combos are named+template complete in a qualifying *synthetic* deck, not execution-verified',()=>{
 const cards=[commander,c('Kozilek\'s Unsealing','Enchantment',3),c('Echoes of Eternity','Kindred Enchantment — Eldrazi',6),c('Strionic Resonator','Artifact',2),c('Castable creature','Creature — Eldrazi',5)];
 const deck={commanderIds:[commander.id],mainboard:cards.slice(1).map(x=>({id:x.id,quantity:1}))};
 const result=annotateCombos({included:source.included.filter(x=>x.id.endsWith('--34')),near:[],reportedIncluded:2,reportedNear:0},deck,cards);
 assert.equal(result.counts.complete,2);
 for(const v of result.complete){assert.equal(v.namedComplete,true);assert.equal(v.templateSatisfied,true);assert.equal(v.executionVerified,false);assert.equal(v.requiresReview,true);assert.deepEqual(v.templateMatches,['Castable creature']);}
 const lacking=annotateCombos({included:source.included.filter(x=>x.id.endsWith('--34')),near:[],reportedIncluded:2,reportedNear:0},{...deck,mainboard:deck.mainboard.slice(0,-1)},cards);
 assert.equal(lacking.counts.complete,0);
 assert.equal(lacking.counts.templatePending,2);
});

test('round trip records all 125 genuine Spellbook IDs and recovers lost variants from v0.8.2 library',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'v083-library-'));const file=path.join(dir,'combo-library.json');
 try{
  await recordSpellbookVariants(commander.id,{included:source.included.filter(v=>!v.id.includes('--')),near:source.near.filter(v=>!v.id.includes('--'))},{file});
  assert.equal((await readComboLibrary(file))[0].variants.length,120);
  await recordSpellbookVariants(commander.id,source,{file});
  let saved=(await readComboLibrary(file))[0].variants;
  assert.equal(saved.length,125);
  assert.equal(new Set(saved.map(v=>v.id)).size,125);
  assert.equal(saved.filter(v=>v.templateRequirements.length).length,5);
  assert.equal(saved.find(v=>v.id==='5637-5642-5657--34').templateRequirements[0].scryfallQuery,'(t:eldrazi or keyword:changeling) t:creature mv>3 mv<7');
  await recordSpellbookVariants(commander.id,source,{file});
  saved=(await readComboLibrary(file))[0].variants;assert.equal(saved.length,125,'recording twice must not duplicate');
  assert.equal(normalizeVariant({id:'../../danger',uses:[{name:'x'}]}),null);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('startup repair restores exact locally cached response without contacting any API or cross-attributing unrelated decks',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'v083-repair-'));const cacheDir=path.join(dir,'spellbook-cache'),file=path.join(dir,'library.json');
 const catalog=[commander,...Array.from({length:99},(_,i)=>c('Filler '+i,'Artifact',1))];
 const deck={key:'archidekt:123',validated:true,commanderIds:[commander.id],mainboard:catalog.slice(1).map(x=>({id:x.id,quantity:1})),totalCards:100};
 const hash=createHash('sha256').update(JSON.stringify(spellbookRequest(deck,catalog))).digest('hex');
 try{
  await mkdir(cacheDir);
  await writeFile(path.join(cacheDir,hash+'.json'),JSON.stringify({stamp:1792499583926,response:fixture}));
  const restored=await repairComboLibraryFromCache([deck],catalog,{file,cacheDir});
  assert.deepEqual({hits:restored.cacheHits,added:restored.added,errors:restored.errors},{hits:1,added:125,errors:[]});
  assert.equal((await readComboLibrary(file))[0].variants.length,125);
  const again=await repairComboLibraryFromCache([deck],catalog,{file,cacheDir});
  assert.equal(again.added,0);assert.equal(again.cacheHits,1);
  const altered={...deck,mainboard:[...deck.mainboard.slice(1),deck.mainboard[0]]};
  assert.equal((await repairComboLibraryFromCache([altered],catalog,{file,cacheDir})).cacheHits,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('package ranking rejects unrelated missing enablers and favors commander engine overlap',()=>{
 const plan=planFor(commander);
 const packageCards=[c('Eldrazi supporter','Creature — Eldrazi',4,'Whenever you cast an Eldrazi spell, create a 0/1 Eldrazi Spawn token.'),c('Path of Annihilation','Kindred Enchantment — Eldrazi',4,'Whenever you cast an Eldrazi spell, create an Eldrazi Spawn token.'),c('Drowner of Hope','Creature — Eldrazi',6,'When this creature enters, create two Eldrazi Scion tokens.'),c('Yarus, Roar of the Old Gods','Legendary Creature — Centaur Druid',5,'Other creatures you control have haste.')];
 const [good,path,drowner,yarus]=packageCards;
 const onplan=normalizeVariant({id:'99-100-200',uses:[{name:commander.name},{name:good.name},{name:path.name}],produces:[{feature:{name:'Infinite creature tokens'}}],legalities:{commander:true},identity:'WUBRG'});
 const foreign=normalizeVariant({id:'99-100-201',uses:[{name:commander.name},{name:path.name},{name:drowner.name},{name:yarus.name}],produces:[{feature:{name:'Infinite damage'}}],legalities:{commander:true},identity:'WUBRG'});
 const result=proposeComboPackages({variants:[foreign,onplan],cards:[commander,...packageCards],commander,chosen:[path],plan,bracket:3,budget:191,remainingSlots:5});
 assert.ok(result.rejected.some(x=>x.id===foreign.id&&x.reason.includes('off-plan')));
 assert.equal(result.candidates[0]?.id,onplan.id);
 assert.deepEqual(result.candidates[0]?.added.map(x=>x.name),[good.name]);
});
