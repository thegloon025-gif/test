import test from "node:test";
import assert from "node:assert/strict";
import { landEntryEvidence, manaPolishReview } from "../src/manaPolish.mjs";

const card = (name, type_line, oracle_text, color_identity, price = 0.2) => ({
  id: name, oracle_id: name, name, type_line, oracle_text, color_identity,
  mana_cost: "", cmc: 0, legalities: { commander: "legal" },
  printing: { eligibleVersion: 2 }, prices: { eur: price }
});
const commander = { ...card("Mana Test Commander", "Legendary Creature — Wizard", "", ["U", "B"], 0.6),
  mana_cost: "{1}{U}{B}", cmc: 3 };
const temple = card("Temple of Test", "Land", "Temple of Test enters tapped.\nWhen this land enters, scry 1.\n{T}: Add {U} or {B}.", ["U", "B"], 0.3);
const fastland = card("Early Test Shores", "Land", "Early Test Shores enters tapped unless you control two or fewer other lands.\n{T}: Add {U} or {B}.", ["U", "B"], 0.5);
const badColor = card("Single Island Test", "Land", "{T}: Add {U}.", ["U"], 0.01);
const expensive = card("Unaffordable Test Shores", "Land", "{T}: Add {U} or {B}.", ["U", "B"], 45);
const wastes = card("Wastes", "Basic Land — Wastes", "{T}: Add {C}.", [], 0);
const swamp = card("Swamp", "Basic Land — Swamp", "{T}: Add {B}.", ["B"], 0);
const fetch = card("Slow Fetch Test", "Land", "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.", [], 0.01);

test("printed entry evidence keeps conditional, mandatory and delayed cases separate", () => {
  assert.equal(landEntryEvidence(temple).kind, "always-tapped");
  assert.equal(landEntryEvidence(fastland).kind, "conditional-tapped");
  assert.equal(landEntryEvidence(fetch).kind, "delayed-fetch");
  assert.equal(landEntryEvidence(wastes).kind, "no-recognized-tap-clause");
});

test("safe replacement preserves colors, stays under total price ceiling, does not mutate input", () => {
  const cards = [temple, swamp, wastes], catalog = [temple, swamp, wastes, fastland, badColor, expensive];
  const before = JSON.stringify(cards), old = cards.map(c => c.name);
  const r = manaPolishReview({ commander, cards, catalog, budget: 3, tolerance: 0 });
  assert.deepEqual(cards.map(c => c.name), old);
  assert.equal(JSON.stringify(cards), before);
  assert.equal(r.mode, "read-only mana-polish");
  assert.equal(r.entryCounts["always-tapped"], 1);
  assert.equal(r.printedTrueColorlessLands, 1);
  assert.equal(r.suggestions[0]?.cut, temple.name);
  assert.equal(r.suggestions[0]?.add, fastland.name);
  assert.match(r.suggestions[0].caveat, /printed function/);
  assert.ok(r.suggestions[0].proposedFullDeckEUR <= 3);
  assert.equal(r.suggestions[0].after, "conditional-tapped");
  assert.ok(!r.suggestions.some(x => x.add === badColor.name || x.add === expensive.name));
});

test("no price, no full catalog, or insufficient budget means no speculative proposal", () => {
  const cards = [temple, swamp];
  assert.equal(manaPolishReview({commander, cards, catalog: [], budget: 3}).suggestions.length, 0);
  assert.equal(manaPolishReview({commander, cards, catalog: [fastland], budget: 0.5}).suggestions.length, 0);
  const unknown = {...temple, prices: {eur: null}};
  const r = manaPolishReview({commander, cards: [unknown, swamp], catalog: [fastland], budget: 3});
  assert.equal(r.originalFullDeckEUR, null);
  assert.equal(r.suggestions.length, 0);
  assert.match(r.unavailableSuggestions, /Unpriced/);
});

test("never discard the only printed true-colorless land without matching channel", () => {
  const forcedC = card("Slow Colorless Test", "Land", "Slow Colorless Test enters tapped.\n{T}: Add {C}.", [], 0.1);
  const r = manaPolishReview({commander, cards:[forcedC, swamp], catalog:[badColor,fastland],budget:20});
  assert.equal(r.suggestions.length,0);
  assert.equal(r.printedTrueColorlessLands,1);
});

test("unknown/new land utility does not imply a proved early-turn deployment probability", () => {
  const r = manaPolishReview({commander, cards:[fetch,temple,swamp], catalog:[fastland],budget:20});
  assert.equal(r.entryCounts["delayed-fetch"],1);
  assert.match(r.scope, /not probabilities/);
  assert.equal(r.suggestions.some(s=>s.cut === fetch.name),false);
});

test("bounce lands and two-mana sources do not silently trade their throughput for a plain dual", () => {
  const bounce = card("Bounce Test Aqueduct", "Land",
    "Bounce Test Aqueduct enters tapped.\nWhen this land enters, return a land you control to its owner's hand.\n{T}: Add {U}{B}.", ["U", "B"], 0.1);
  const r = manaPolishReview({ commander, cards:[bounce, swamp], catalog:[fastland], budget:10 });
  assert.equal(r.entryCounts["always-tapped"], 1);
  assert.equal(r.suggestions.length, 0);
});

test("two-land opening sevens count physical land slots, independent of color identity and budget", () => {
  const cards = [...Array(10).fill(temple), ...Array(26).fill(swamp)];
  for (const identity of [["B"], ["W","U","B","G"]]) {
    const review = manaPolishReview({commander: {...commander, color_identity: identity}, cards});
    assert.equal(review.openingMana.pairs, 630);
    assert.equal(review.openingMana.forcedTappedPairFraction, 1 / 14);
    assert.equal(review.ceilingEUR, null);
  }
  assert.equal(manaPolishReview({commander, cards: [temple]}).openingMana.forcedTappedPairFraction, null);
});

test("early printed costs use the better land order, each source once, including hybrid and true C", () => {
  const spell = (cost, mv) => ({...commander, name: cost, cmc: mv, mana_cost: cost});
  const spells = [spell("{U}",1), spell("{U}{B}",2), spell("{U}{U}",2), spell("{C}",1), spell("{1}{U/B}",2), spell("{X}{U}",1)];
  const run = (lands, spellCards = spells) => manaPolishReview({commander, cards: [...lands, ...spellCards]}).openingMana;
  const byCost = result => Object.fromEntries(result.costs.map(row => [row.cost, row.payablePairs]));
  assert.deepEqual(byCost(run([temple, swamp])), {"{U}":0, "{U}{B}":1, "{U}{U}":0, "{C}":0, "{1}{U/B}":1});
  assert.equal(byCost(run([swamp, temple]))["{U}{B}"], 1);
  assert.equal(byCost(run([temple, temple]))["{U}{B}"], 0);
  assert.equal(byCost(run([fastland, temple]))["{U}{U}"], 1);
  assert.equal(byCost(run([wastes, temple]))["{C}"], 1);
  const shock = {...temple, oracle_text: "As this land enters, you may pay 2 life. If you don't, it enters tapped.\n({T}: Add {U} or {B}.)"};
  assert.equal(byCost(run([shock, shock]))["{U}{U}"], 1);
  assert.equal(run([fetch, temple]).modeledPairs, 0);
  assert.equal(run([fetch, temple]).pairs, 1);
});

test("a land tapping other permanents or offering a ready second face is not itself forced tapped", () => {
  const face = (name, text) => ({name, type_line: "Land", oracle_text: text});
  const split = {...temple, layout:"modal_dfc",card_faces:[face("Slow","Slow enters tapped."),face("Fast","{T}: Add {U}.")]};
  const effect = {...temple, oracle_text:"Creatures your opponents control enter tapped.\n{T}: Add {B}."};
  const review = manaPolishReview({commander, cards:[split, effect, fastland]});
  assert.equal(review.openingMana.forcedTappedPairFraction, 0);
  assert.equal(review.openingMana.modeledPairs, 0);
});

test("an affordable shockland can be recommended and a cycling triome can fund turn two", () => {
  const shock = card("Watery Grave","Land — Island Swamp", "({T}: Add {U} or {B}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped.", ["U","B"], 2);
  const triome = card("Test Triome","Land — Plains Island Swamp", "({T}: Add {W}, {U}, or {B}.)\nThis land enters tapped.\nCycling {3}", ["W","U","B"]);
  const spell = {...commander, name:"Two blue pips", mana_cost:"{U}{U}", cmc:2};
  const review = manaPolishReview({commander, cards:[temple, fastland], catalog:[shock], budget:5});
  assert.deepEqual(review.suggestions.map(s=>[s.cut,s.add]), [[temple.name,shock.name]]);
  assert.match(review.suggestions[0].caveat,/2 life/);
  assert.equal(manaPolishReview({commander, cards:[triome, shock, spell]}).openingMana.costs[0].payablePairs,1);
});
