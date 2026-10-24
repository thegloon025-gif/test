import test from 'node:test';
import assert from 'node:assert/strict';
import {constructStrategyDeck,strategyScore} from '../src/strategyFirst.mjs';
import {generateDeck} from '../src/generator.mjs';
import {auditExportPricing} from '../src/pricing.mjs';
import {validateCommanderSingleton} from '../src/deckValidation.mjs';
import {isLandSlot,priceOf,oracleId} from '../src/cards.mjs';

// Invented names/prices/source lists: reproducible architecture tests only.
const c=(name,type_line,oracle_text='',cmc=2,eur=.14,extra={})=>({id:name,name,type_line,oracle_text,cmc,prices:{eur},legalities:{commander:'legal'},color_identity:[],...extra});
const commander={...c('Strategy Test Commander','Legendary Creature — Eldrazi','Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy that spell.',5,.4),color_identity:['W','U','B','R','G']};
const basics=[['Plains','W'],['Island','U'],['Swamp','B'],['Mountain','R'],['Forest','G'],['Wastes','C']].map(([n,s])=>c(n,`Basic Land — ${n}`,`{T}: Add {${s}}.`,0,0));
const lands=Array.from({length:28},(_,i)=>c(`Community Prism ${i}`,'Land','{T}: Add one mana of any color.',0,.17));
const strategy=Array.from({length:90},(_,i)=>c(`On-plan Creature ${i}`,'Creature — Eldrazi',`When you cast this spell, ${i%3===0?'draw two cards':'create a 0/1 Eldrazi Spawn creature token'}.`,2+i%5,.12+i%4*.04));
const mana=Array.from({length:42},(_,i)=>c(`Early Mana ${i}`,'Artifact','{T}: Add {C}.',2,.13));
const removal=Array.from({length:40},(_,i)=>c(`Universal Answer ${i}`,'Instant','Exile target creature.',2,.13));
const draw=Array.from({length:38},(_,i)=>c(`Actual Draw ${i}`,'Sorcery','Draw two cards.',2,.13));
const shield=Array.from({length:33},(_,i)=>c(`Protect Piece ${i}`,'Instant','Target creature gains hexproof until end of turn.',1,.13));
const filler=Array.from({length:350},(_,i)=>c(`Unrelated Filler ${i}`,'Artifact','Scry 1.',3,.13));
const cards=[commander,...basics,...lands,...strategy,...mana,...removal,...draw,...shield,...filler];
const sources=Array.from({length:4},(_,i)=>({key:`archidekt:source${i}`,validated:true,commanderIds:[commander.id],edhBracket:3,owner:`author${i}`,title:`Source strategy ${i}`,
 mainboard:[...strategy.slice(i*12,i*12+38),...mana.slice(i*5,i*5+10),...draw.slice(i*4,i*4+8),
 ...removal.slice(i*4,i*4+8),...lands.slice(i*4,i*4+12)].map(x=>({id:oracleId(x),quantity:1}))}));
const communityBuild={status:'ready',highConfidence:false,selected:{sourceDecks:[sources[2].key]}};
const shared={cards,commander,bracket:3,budget:191,powerTarget:'high',communityBuild,communityDecks:sources};

test('v1.1 constructs independent complete decks from source templates and local archetypes',()=>{
 const result=constructStrategyDeck(shared);
 assert.equal(result.report.generated,7);
 assert.ok(result.report.complete>=3,JSON.stringify(result.report));
 assert.ok(result.report.distinct>=2,JSON.stringify(result.report));
 assert.ok(result.report.candidates.some(c=>c.id.startsWith('source:')&&c.sourceSpells>=8),JSON.stringify(result.report));
 assert.ok(result.report.candidates.some(c=>c.id.startsWith('source:')&&c.sourceLands>=2),JSON.stringify(result.report));
 for(const d of result.successful){
  assert.equal(d.cards.length,99);assert.equal(d.cards.filter(isLandSlot).length,37);
  assert.ok(d.price<=191);
  assert.equal(validateCommanderSingleton(commander,d.cards).valid,true);
  assert.equal(d.cards.filter(c=>!isLandSlot(c)&&/^Early Mana/.test(c.name)).length<=12,true);
 }
});

test('v1.1 engine can be switched on independently of v1.0; export and evidence agree',()=>{
 const next=generateDeck({...shared,constructionMode:'strategy-first'});
 const old=generateDeck({...shared,constructionMode:'legacy'});
 assert.equal(next.totalCards,100);assert.equal(next.landCount,37);
 assert.equal(next.deck.split('\n').length,100);
 assert.equal(next.constructionEngine.mode,'strategy-first');
 assert.ok(next.constructionEngine.complete>=3);
 assert.ok(next.price<=191);
 assert.equal(old.constructionEngine.mode,'legacy');
 for(const deck of [next,old]){
  const audit=auditExportPricing(deck,commander,cards);
  assert.equal(audit.count,100);
  assert.deepEqual(audit.missing,[]);
  assert.equal(audit.agreesWithGenerator,true,`${deck.constructionEngine.mode}: selected source records and export must agree`);
  assert.equal(audit.withinBudget,true);
 }
 const same=generateDeck({...shared,constructionMode:'strategy-first'});
 assert.equal(next.deck,same.deck,'deterministic source and profile selection');
});

test('v1.1 source matching is isolated to correct commander and bracket, with explicit local-only behavior',()=>{
 const off=constructStrategyDeck({...shared,communityBuild:{status:'disabled'},communityDecks:sources});
 const wrong=constructStrategyDeck({...shared,communityDecks:sources.map(d=>({...d,edhBracket:4}))});
 assert.equal(off.report.generated,4);
 assert.equal(wrong.report.generated,4);
 assert.ok(off.selected);
});


test('v1.1 explicit source archetype selection honors provenance rather than merely re-scoring it',()=>{
 const input={...shared,communityBuild:{...communityBuild,userSelected:true,selected:{sourceDecks:[sources[3].key]}}};
 const result=constructStrategyDeck(input);
 assert.ok(result.selected);
 assert.equal(result.selected.sourceKey,sources[3].key,'explicit user pick should choose a legal representative source');
});

test('v1.1 Bracket 2 vs 4 choose distinct 100-card objectives without invalid Game Changers',()=>{
 const b2=constructStrategyDeck({...shared,bracket:2,communityBuild:{status:'disabled'}});
 const b4=constructStrategyDeck({...shared,bracket:4,communityBuild:{status:'disabled'}});
 assert.ok(b2.selected&&b4.selected);
 assert.equal(b2.selected.cards.filter(isLandSlot).length,38);
 assert.equal(b4.selected.cards.filter(isLandSlot).length,36);
 assert.notDeepEqual(b2.selected.cards.map(c=>c.name),b4.selected.cards.map(c=>c.name));
});

test('v1.1 Spellbook proposals can be seeded atomically with source-independent validation',()=>{
 const components=strategy.slice(80,82);
 const result=constructStrategyDeck({...shared,communityBuild:{status:'disabled'},preferredCombos:[{id:'synthetic-combo',
  namedCards:components.map(c=>c.name),added:components.map(c=>c.name),templateMatches:[]}]});
 assert.ok(result.selected);
 const committed=result.successful.filter(x=>x.committedCombos.some(c=>c.id==='synthetic-combo'));
 assert.ok(committed.length>0);
 for(const build of committed){const selected=new Set(build.cards.map(c=>c.name));
  assert.ok(components.every(c=>selected.has(c.name)),'combo is all-or-nothing');}
});

test('v1.1 blocks inventory-complete recorded 2-card infinites at B3, not at B4',async()=>{
 const {conservativeComboViolation}=await import('../src/strategyFirst.mjs');
 const pair=[strategy[3],strategy[4]];
 const known={id:'100-101',isInfinite:true,uses:pair.map(x=>({name:x.name,quantity:1})),templateRequirements:[]};
 assert.equal(conservativeComboViolation(pair,commander,[known],3)?.id,'100-101');
 assert.equal(conservativeComboViolation(pair,commander,[known],4),null);
 assert.equal(conservativeComboViolation(pair.slice(0,1),commander,[known],3),null);
 assert.equal(conservativeComboViolation(pair,commander,[{...known,isInfinite:false}],3),null);
});

test('explicit tolerance and owned basics propagate through completed candidate audits',()=>{
 const d=generateDeck({...shared,budget:160,budgetTolerance:4,basicLandsOwned:true,constructionMode:'strategy-first'});
 assert.equal(d.budget,164);assert.equal(d.budgetPolicy.target,160);assert.equal(d.budgetPolicy.tolerance,4);
 assert.equal(d.budgetPolicy.unused,Math.round((164-d.price)*100)/100);
 assert.ok(d.alternatives.length>=1&&d.alternatives.length<=4);
 for(const alt of d.alternatives){assert.equal(alt.deck.split('\n').length,100);assert.equal(alt.pricingAudit.provenance,'exact-selected-cards');assert.ok(alt.pricingAudit.withinBudget&&alt.pricingAudit.agreesWithGenerator);}
 assert.ok(d.whyThisDeck.relations);assert.equal(d.constructionEngine.packageExpansion.limit,4);
});
test('counting explicitly unowned basics reconciles exact records and preserves the original catalog',()=>{
 const priced=cards.map(c=>c.type_line.startsWith('Basic')?{...c,prices:{eur:.2}}:c);
 const d=generateDeck({...shared,cards:priced,basicLandsOwned:false,constructionMode:'strategy-first'});
 assert.equal(d.totalCards,100);assert.equal(d.budgetPolicy.basicLandsOwned,false);
 assert.ok(d.price<=191);assert.ok(d.alternatives.every(x=>x.pricingAudit.agreesWithGenerator));
 assert.ok(priced.filter(c=>c.type_line.startsWith('Basic')).every(c=>priceOf(c)===0),'caller records stay owned-by-default');
});

test('explicit tolerance permits a selected-record total above target but never above its effective cap',()=>{
 const premium={...commander,prices:{eur:160.01}},free=cards.map(c=>c.id===commander.id?premium:{...c,prices:{eur:0}});
 const options={...shared,cards:free,commander:premium,budget:160,constructionMode:'strategy-first'};
 assert.throws(()=>generateDeck(options),/Commander alone exceeds/);
 const deck=generateDeck({...options,budgetTolerance:4});
 assert.equal(deck.totalCards,100);assert.equal(deck.price,160.01);assert.equal(deck.budgetPolicy.overTarget,.01);
 assert.equal(auditExportPricing(deck,premium,free).withinBudget,true);
 assert.equal(auditExportPricing({...deck,budget:160},premium,free).withinBudget,false,'audit still enforces the explicit effective cap');
});
