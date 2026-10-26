import test from "node:test";
import assert from "node:assert/strict";
import fixtures from "./fixtures/architect-quality/cards.json" with { type: "json" };
import supplement from "../src/architectComboEvidence.json" with { type: "json" };
import {
  architectRequest,
  validateArchitectResult,
} from "../src/aiArchitect.mjs";
import { architectEvidence } from "../src/architectEvidence.mjs";
import { architectFunctionalReview } from "../src/architectReview.mjs";
const catalog = fixtures.cards,
  card = (n) => catalog.find((c) => c.name === n),
  id = (c) => c.oracle_id || c.id;
const u = card("Ulalek, Fused Atrocity"),
  w = card("Wilhelt, the Rotcleaver"),
  y = card("Y'shtola, Night's Blessed");
const params = (c) => ({
  mode: "builder",
  commanderName: c.name,
  budget: 191,
  bracket: 3,
});
const payload = (r) => JSON.parse(r.prompt.slice(r.prompt.indexOf("{")));
const retrieve = (c, extra = {}) =>
  architectEvidence({
    commander: c,
    catalog,
    variants: supplement.variants,
    budget: 191,
    bracket: 3,
    ...extra,
  });
test("commander-specific retrieval defeats alphabetical starvation and remains nonexclusive", () => {
  const filler = Array.from({ length: 120 }, (_, i) => ({
    ...card("Eldrazi Repurposer"),
    id: "filler" + i,
    oracle_id: "filler" + i,
    name: "AAA Unrelated " + i,
    type_line: "Creature — Human",
    oracle_text: "",
    cmc: 4,
    mana_cost: "{4}",
  }));
  const p = payload(architectRequest(params(u), [...filler, ...catalog]));
  assert.equal(p.advisoryCandidateSample, undefined);
  assert.ok(
    p.deckbuildingBrief.functions.native.cards.includes("Eldrazi Repurposer"),
  );
  assert.ok(
    p.deckbuildingBrief.packages.some(
      (p) =>
        p.anchor === u.name &&
        p.requires.some((r) => r.includes("2 true-colorless")),
    ),
  );
  assert.match(p.warning, /NOT an exclusive/);
  assert.ok(
    !p.deckbuildingBrief.records.some((c) =>
      c.name.startsWith("AAA Unrelated"),
    ),
  );
  assert.ok(Buffer.byteLength(JSON.stringify(p)) < 46000);
});
test("Wilhelt and Y'shtola receive genuinely different event/cost packages", () => {
  const wil = retrieve(w),
    ys = retrieve(y);
  assert.ok(wil.packages.some((p) => p.function === "sacrifice-outlet"));
  assert.ok(
    wil.packages.some(
      (p) => p.function === "death:card-access" && p.anchor === "Undead Augur",
    ),
  );
  const native = ys.packages.find(
    (p) => p.function === "commander-qualifying-casts",
  );
  assert.ok(native.support.includes("Read the Bones"));
  assert.ok(!native.support.includes("Night's Whisper"));
  assert.ok(!native.support.includes("Undead Augur"));
  assert.notDeepEqual(wil.needs, ys.needs);
});
test("unrelated landfall, target-copy and ninjutsu retain their actual grammar/unknowns", () => {
  for (const name of [
    "Tatyova, Benthic Druid",
    "Zada, Hedron Grinder",
    "Yuriko, the Tiger's Shadow",
  ]) {
    const c = card(name),
      e = retrieve(c);
    assert.ok(
      e.needs.some(
        (n) =>
          n.kind ===
          {
            "Tatyova, Benthic Druid": "landfall",
            "Zada, Hedron Grinder": "target-copy",
            "Yuriko, the Tiger's Shadow": "ninjutsu",
          }[name],
      ),
    );
    assert.match(e.unknowns.join(" "), /do not certify/);
  }
});
test("source structures must match commander/bracket, actual size and catalog; no popularity score", () => {
  const source = {
    source: "Archidekt",
    key: "archidekt:fixture",
    validated: true,
    commanderIds: [id(w)],
    edhBracket: 3,
    totalCards: 100,
    mainboard: [
      { id: id(card("Undead Augur")), quantity: 1 },
      { id: id(card("Swamp")), quantity: 98 },
    ],
  };
  const data = retrieve(w, {
    decks: [
      source,
      { ...source, key: "bad-bracket", edhBracket: 4 },
      { ...source, key: "bad-size", mainboard: source.mainboard.slice(0, 1) },
      { ...source, key: "other", commanderIds: [id(u)] },
    ],
  });
  assert.equal(data.sourceStructures.length, 1);
  assert.equal(data.sourceStructures[0].lands.length, 98);
  assert.equal(data.sourceStructures[0].source, source.key);
  assert.equal(data.score, undefined);
});
test("public compact infinite evidence discloses attachment/initial counter and B3 risk, not invented timing/win", () => {
  const b3 = retrieve(u).comboPackages.find((v) => v.id === "1988-5641");
  assert.ok(b3);
  assert.equal(b3.policy.allowedByKnownGate, false);
  assert.match(b3.prerequisites.join(" "), /attached/);
  assert.match(b3.prerequisites.join(" "), /counter/);
  assert.match(b3.policy.timing, /unknown/);
  assert.equal(b3.conversion.status, "not verified");
  assert.equal(
    retrieve(u, { bracket: 4 }).comboPackages[0].policy.allowedByKnownGate,
    true,
  );
});
test("101 physical cards are rejected; explicit controlled cut to 100 still respects compact-combo gate", () => {
  const text = `1 ${u.name} *CMDR*\n1 Basking Broodscale\n1 Blade of the Bloodchief\n97 Wastes\n1 Forest`;
  const wrong = validateArchitectResult(
    { ...params(u), bracket: 4 },
    text,
    catalog,
  );
  assert.equal(wrong.valid, false);
  assert.match(wrong.issues.join(" "), /100/);
  const cut = text.replace("97 Wastes", "96 Wastes");
  assert.equal(validateArchitectResult(params(u), cut, catalog).valid, false);
  const b4 = validateArchitectResult(
    { ...params(u), bracket: 4 },
    cut,
    catalog,
  );
  assert.equal(b4.valid, true, JSON.stringify(b4.issues));
  assert.equal(
    b4.functionalReview.combos.combinations[0].timing.status,
    "unknown",
  );
});
test("legally complete expensive-creature pile gets specific warnings without score or automatic repair", () => {
  const threats = Array.from({ length: 59 }, (_, i) => ({
    ...card("Eldrazi Repurposer"),
    id: "threat" + i,
    oracle_id: "threat" + i,
    name: "Controlled threat " + i,
    mana_cost: "{6}{G}{U}",
    cmc: 8,
    oracle_text: "",
    prices: { eur: 1 },
    color_identity: ["G", "U"],
  }));
  const local = [...catalog, ...threats],
    text = [
      `1 ${u.name} *CMDR*`,
      ...threats.map((c) => "1 " + c.name),
      "20 Wastes",
      "10 Forest",
      "10 Island",
    ].join("\n");
  const r = validateArchitectResult(params(u), text, local);
  assert.equal(r.valid, true, JSON.stringify(r.issues));
  const codes = r.functionalReview.warnings.map((w) => w.code);
  assert.ok(codes.includes("no-recognized-persistent-access"));
  assert.ok(codes.includes("unobserved-expensive-followups"));
  assert.equal(r.functionalReview.revision.automatic, false);
  assert.equal(r.functionalReview.score, undefined);
  assert.equal(
    r.functionalReview.goldfish.reduce((n, g) => n + g.auditedRuns, 0),
    16,
  );
});
test("colorless concentration, removed persistent access, and missing material are distinct observations", () => {
  const base = [
    card("Mystic Forge"),
    card("Warren Soultrader"),
    ...Array(97).fill(card("Wastes")),
  ];
  const before = architectFunctionalReview({ commander: u, cards: base });
  const after = architectFunctionalReview({
    commander: u,
    cards: [card("Read the Bones"), ...base.slice(1)],
  });
  assert.ok(before.cardAccess.persistent.includes("Mystic Forge"));
  assert.ok(!after.cardAccess.persistent.includes("Mystic Forge"));
  assert.ok(
    after.warnings.some((w) => w.code === "no-recognized-persistent-access"),
  );
  assert.ok(
    after.warnings.some((w) => w.code === "colorless-land-concentration"),
  );
  assert.ok(after.cardAccess.oneShot.includes("Read the Bones"));
  // Explicitly lacks another Zombie to fund this controlled native outlet.
  const outlet = {
    ...card("Carrion Feeder"),
    oracle_text: "Sacrifice another Zombie: Draw a card.",
  };
  const lost = architectFunctionalReview({
    commander: u,
    cards: [outlet, ...Array(98).fill(card("Wastes"))],
  });
  assert.ok(lost.warnings.some((w) => w.code === "missing-prerequisite"));
});
test("explicit revision needs a valid previous deck and bounded instruction; no automatic strategic calls", () => {
  assert.throws(
    () =>
      architectRequest(
        { ...params(u), revisionRequest: "improve access" },
        catalog,
      ),
    /explicit bounded/,
  );
  assert.throws(
    () =>
      architectRequest(
        {
          ...params(u),
          revisionRequest: "improve access",
          revisionDeck: "1 Unknown",
        },
        catalog,
      ),
    /Validate the previous/,
  );
  const deck = `1 ${u.name} *CMDR*\n1 Eldrazi Repurposer\n97 Wastes\n1 Forest`;
  const p = payload(
    architectRequest(
      {
        ...params(u),
        revisionRequest: "Explain the access tradeoff",
        revisionDeck: deck,
      },
      catalog,
    ),
  );
  assert.equal(p.revision.userRequest, "Explain the access tradeoff");
  assert.match(p.revision.instruction, /no automatic/);
});
test("retrieval/review are deterministic and read-only; large context prunes whole evidence units", () => {
  const before = JSON.stringify(catalog),
    a = architectRequest(params(u), catalog),
    b = architectRequest(params(u), catalog.slice().reverse());
  // Evidence uses identity-based diversity; no catalog-input-order dependence.
  assert.deepEqual(
    payload(a).deckbuildingBrief.functions,
    payload(b).deckbuildingBrief.functions,
  );
  const data = retrieve(u),
    copy = structuredClone(data);
  assert.deepEqual(data, copy);
  assert.equal(JSON.stringify(catalog), before);
  assert.equal(data.powerScore, undefined);
});

test("related hypotheses sharing one absent piece do not become independent finishing paths", () => {
  // Controlled duplicate of published requirements: not a second real combo claim.
  const v = supplement.variants[0],
    variants = [v, { ...structuredClone(v), id: "1988-5641-1" }];
  const review = architectFunctionalReview({
    commander: u,
    cards: [card("Basking Broodscale"), ...Array(98).fill(card("Wastes"))],
    variants,
  });
  const missing = review.combos.sharedMissingPieces.find(
    (x) => x.card === "Blade of the Bloodchief",
  );
  assert.equal(missing.packages.length, 2);
  assert.ok(
    review.warnings.some((w) => w.code === "shared-missing-package-input"),
  );
  assert.equal(review.combos.independentWinConditions, null);
  assert.equal(review.combos.executionVerified, false);
});

test("incidental off-tribe deaths do not masquerade as commander-native material", () => {
  const engine = {
    ...card("Undead Augur"),
    id: "controlled-fairy-engine",
    oracle_id: "controlled-fairy-engine",
    name: "Controlled Fairy engine",
    type_line: "Creature — Faerie",
    oracle_text: "Whenever another Faerie you control dies, draw a card.",
  };
  const material = {
    ...card("Gravecrawler"),
    id: "controlled-fairy-material",
    oracle_id: "controlled-fairy-material",
    name: "Controlled Fairy material",
    type_line: "Creature — Faerie",
    oracle_text: "When this creature dies, draw a card.",
  };
  const e = retrieve(w, { catalog: [...catalog, engine, material] });
  assert.ok(!e.packages.some((p) => p.anchor === engine.name));
  assert.ok(e.packages.some((p) => p.anchor === "Undead Augur"));
});
