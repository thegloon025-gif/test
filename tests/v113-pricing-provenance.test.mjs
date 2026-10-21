import test from 'node:test';
import assert from 'node:assert/strict';
import {withSelectedCards} from '../src/deckSelection.mjs';
import {auditExportPricing} from '../src/pricing.mjs';

const card=(id,name,price,set='tst')=>({id,oracle_id:id,name,type_line:'Artifact',prices:{eur:price},printing:{set,border:'black',language:'en'}});
const commander={...card('cmd','Commander Alpha',.5),type_line:'Legendary Creature — Eldrazi'};
const affordable=card('cheap','Same Printed Name',2,'one');
const costly=card('expensive','Same Printed Name',45,'two');
const deckText='1 Commander Alpha *CMDR*\n1 Same Printed Name';

test('export price uses exact selected printing, not the last same-name card in the catalog',()=>{
 const catalog=[commander,affordable,costly];
 const deck=withSelectedCards({deck:deckText,price:2.5,budget:10},commander,[affordable]);
 const audited=auditExportPricing(deck,commander,catalog);
 assert.equal(audited.count,2);
 assert.equal(audited.total,2.5);
 assert.equal(audited.agreesWithGenerator,true);
 assert.equal(audited.withinBudget,true);
 assert.equal(audited.cards[1].printing.set,'one');
 assert.equal(audited.provenance,'exact-selected-cards');
 // This was the v1.1.2 problem: a Map over the catalog used the last price.
 assert.equal(auditExportPricing({...deck},commander,catalog).total,2.5,'object-spread fallback preserves exact selected cards');
});

test('exactly selected expensive printing cannot pass a cheap generator claim',()=>{
 const deck=withSelectedCards({deck:deckText,price:2.5,budget:10},commander,[costly]);
 const audited=auditExportPricing(deck,commander,[commander,affordable,costly]);
 assert.equal(audited.total,45.5);
 assert.equal(audited.agreesWithGenerator,false);
 assert.equal(audited.withinBudget,false);
});

test('when selected identity is unavailable, ambiguous names fail closed rather than picking a price',()=>{
 const audited=auditExportPricing({deck:deckText,price:2.5,budget:10},commander,[commander,affordable,costly]);
 assert.deepEqual(audited.missing,['Same Printed Name']);
 assert.equal(audited.withinBudget,false);
 assert.match(audited.anomalies[0].reason,/Ambiguous/);
});

test('export/name, price, and printing disagreements fail closed',()=>{
 const catalog=[commander,affordable,costly];
 const renamed=withSelectedCards({deck:'1 Commander Alpha *CMDR*\n1 Unknown Name',price:2.5,budget:10},commander,[affordable]);
 assert.deepEqual(auditExportPricing(renamed,commander,catalog).missing,['Unknown Name']);
 const manipulated=withSelectedCards({deck:deckText,price:2.5,budget:10},commander,[{...affordable,prices:{eur:0.2}}]);
 assert.deepEqual(auditExportPricing(manipulated,commander,catalog).missing,['Same Printed Name']);
 const reprinted=withSelectedCards({deck:deckText,price:2.5,budget:10},commander,[{...affordable,printing:{...affordable.printing,set:'other'}}]);
 assert.deepEqual(auditExportPricing(reprinted,commander,catalog).missing,['Same Printed Name']);
});
