import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {parseBulkForTest} from '../src/scryfall.mjs';
import {eligibleScryfallPrinting,maskKnownIneligibleCachePrint,pricingCatalogStatus} from '../src/printingEligibility.mjs';
import {estimateEnglishNearMint,applyEstimatedEnglishNM,cardmarketEnglishNMSearchUrl,auditExportPricing} from '../src/pricing.mjs';

const printing=(options={})=>({object:'card',oracle_id:'id-grim',name:'Grim Monolith',type_line:'Artifact',oracle_text:'{T}: Add {C}{C}{C}.',cmc:2,legalities:{commander:'legal'},color_identity:[],prices:{eur:'20.00'},lang:'en',border_color:'gold',games:['paper'],set:'wc99',cardmarket_id:135,
 ...options});
test('collector copy can never undercut a regular paper printing for the same Oracle card',async()=>{
 const raw=[printing(),printing({border_color:'black',set:'ulg',prices:{eur:'310.00'},cardmarket_id:136})];
 const parsed=await parseBulkForTest(Readable.from(raw.map(c=>JSON.stringify(c)+'\n')),'jsonl');
 assert.equal(parsed.cards.length,1);
 assert.equal(parsed.cards[0].prices.eur,310);
 assert.equal(parsed.cards[0].printing.set,'ulg');
 assert.equal(parsed.cards[0].printing.border,'black');
 assert.deepEqual(parsed.cards[0].cardmarketIds,['136']);
});
test('printing screening includes language, digital, oversized, silver and gold bans',()=>{
 for(const changed of [{lang:'it'},{digital:true},{oversized:true},{games:['arena']},{border_color:'silver'},{border_color:'gold'},{set:'wc00',border_color:'black'}])
  assert.equal(eligibleScryfallPrinting(printing({set:'ulg',border_color:'black',...changed})),false,JSON.stringify(changed));
 assert.equal(eligibleScryfallPrinting(printing({set:'ulg',border_color:'borderless'})),true);
});
test('old cached World Championship selected price fails closed until refresh',()=>{
 const legacy={id:'id-grim',name:'Grim Monolith',set:'wc99',type_line:'Artifact',prices:{eur:20}};
 const masked=maskKnownIneligibleCachePrint(legacy);
 assert.equal(masked.prices.eur,null);
 assert.match(masked.pricingWarning,/ineligible/);
 assert.equal(pricingCatalogStatus([masked],{source:'default_cards'}).audited,false);
});
test('four-tier modeled EN NM costs never compound and preserve unpriced cards',()=>{
 assert.equal(estimateEnglishNearMint(0.05),0.2);
 assert.equal(estimateEnglishNearMint(0.9),1.17);
 assert.equal(estimateEnglishNearMint(5),6.75);
 assert.equal(estimateEnglishNearMint(20),27.4);
 const sample=[{id:'a',name:'Sol Ring',type_line:'Artifact',prices:{eur:.9}},{id:'b',name:'Other',type_line:'Artifact',prices:{eur:null}}];
 const priced=applyEstimatedEnglishNM(sample);
 assert.equal(priced[0].prices.eur,1.17);
 assert.equal(priced[0].baseScryfallEur,.9);
 assert.equal(priced[1].prices.eur,null);
 assert.equal(sample[0].prices.eur,.9);
 assert.equal(applyEstimatedEnglishNM(sample)[0].prices.eur,priced[0].prices.eur);
});
test('export ledger audits final actual 100-card representation and Cardmarket links',()=>{
 const commander={id:'commander',name:'Test Commander',type_line:'Legendary Creature',prices:{eur:2}};
 const sol={id:'sol',name:'Sol Ring',type_line:'Artifact',prices:{eur:1.17},printing:{set:'cmm',border:'black'}};
 const deck={deck:'1 Test Commander *CMDR*\n1 Sol Ring',budget:5,price:3.17};
 const audit=auditExportPricing(deck,commander,[commander,sol]);
 assert.equal(audit.total,3.17);assert.equal(audit.count,2);
 assert.equal(audit.withinBudget,true);assert.equal(audit.agreesWithGenerator,true);
 assert.match(audit.cards[1].cardmarketUrl,/language=1&minCondition=2/);
 assert.equal(auditExportPricing({...deck,price:2},commander,[commander,sol]).agreesWithGenerator,false);
 assert.equal(auditExportPricing({...deck,deck:deck.deck+'\n1 Unknown'},commander,[commander,sol]).withinBudget,false);
});
