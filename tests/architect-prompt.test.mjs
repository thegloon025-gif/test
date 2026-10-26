import test from "node:test";
import assert from "node:assert/strict";
import { compactArchitectPayload } from "../src/architectPrompt.mjs";
import { architectRequest } from "../src/aiArchitect.mjs";
import fixtures from "./fixtures/architect-quality/cards.json" with { type: "json" };
test("prompt deduplication preserves exact Oracle, costs, repeated guards and prices without mutating input", () => {
  const oracle =
    "Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy all spells you control.";
  const shared = "Pay actual spell costs; copies are not casts";
  const raw = {
    commander: { name: "Example", oracle, oracleTruncated: false },
    deckbuildingBrief: {
      commander: { name: "Example", oracle },
      packages: [
        {
          anchor: "Example",
          printed: oracle,
          requires: [shared, "Reserve {C}{C} separately"],
        },
        { anchor: "Example", printed: oracle, requires: [shared] },
      ],
      records: [
        {
          name: "Example",
          manaCost: "{5}",
          eur: 1.25,
          oracle,
          oracleTruncated: false,
          evidence: "repeated boilerplate",
        },
      ],
      comboPackages: [
        {
          initialMana: "{C}{C}",
          prerequisites: ["Blade attached; supply initial counter"],
          policy: { allowedByKnownGate: false },
        },
      ],
    },
  };
  const before = JSON.stringify(raw),
    x = compactArchitectPayload(raw);
  assert.equal(JSON.stringify(raw), before);
  assert.equal(Object.keys(x.oracleEvidence).length, 1);
  for (const p of x.deckbuildingBrief.packages) {
    assert.equal(x.oracleEvidence[p.oracleRef].text, oracle);
    assert.deepEqual(
      [
        ...p.requires,
        ...p.requirementRefs.map((r) => x.sharedRequirements[r]),
      ].sort(),
      [
        ...raw.deckbuildingBrief.packages[
          x.deckbuildingBrief.packages.indexOf(p)
        ].requires,
      ].sort(),
    );
  }
  assert.equal(x.deckbuildingBrief.records[0].eur, 1.25);
  assert.equal(x.deckbuildingBrief.records[0].manaCost, "{5}");
  assert.deepEqual(
    x.deckbuildingBrief.comboPackages,
    raw.deckbuildingBrief.comboPackages,
  );
  assert.equal(x.deckbuildingBrief.commanderRef, "commander");
});
test("compact real-card brief retains native costs, combo setup/policy and priced functions", () => {
  const req = architectRequest(
      {
        mode: "builder",
        commanderName: "Ulalek, Fused Atrocity",
        budget: 191,
        bracket: 3,
      },
      fixtures.cards,
    ),
    p = JSON.parse(req.prompt.slice(req.prompt.indexOf("{"))),
    brief = p.deckbuildingBrief;
  assert.ok(Buffer.byteLength(req.prompt) <= 32000);
  const engine = brief.packages.find(
    (p) => p.function === "commander-qualifying-casts",
  );
  assert.match(p.oracleEvidence[engine.oracleRef].text, /pay \{C\}\{C\}/);
  const combo = brief.comboPackages.find((p) => p.id === "1988-5641");
  assert.match(combo.prerequisites.join(" "), /attached/);
  assert.equal(combo.policy.allowedByKnownGate, false);
  assert.ok(
    brief.functions.acceleration.selectedOptions.every(
      (c) => typeof c.eur === "number",
    ),
  );
  assert.ok(brief.records.every((c) => p.oracleEvidence[c.oracleRef]));
});

test("Upgrader wire context preserves every original physical copy and exact per-card cost", () => {
  const u = fixtures.cards.find((c) => c.name === "Ulalek, Fused Atrocity");
  const r = architectRequest(
    {
      mode: "upgrader",
      text: `1 ${u.name} *CMDR*\n1 Eldrazi Repurposer\n97 Wastes\n1 Forest`,
      budget: 40,
      bracket: 3,
    },
    fixtures.cards,
  );
  const p = JSON.parse(r.prompt.slice(r.prompt.indexOf("{")));
  assert.equal(p.originalPhysicalCards, 99);
  assert.equal(
    p.original.reduce((n, c) => n + c.quantity, 0),
    99,
  );
  assert.equal(p.original.find((c) => c.name === "Wastes").quantity, 97);
  for (const c of p.original) {
    assert.ok(p.oracleEvidence[c.oracleRef]);
    assert.equal(typeof c.eur, "number");
    assert.ok("manaCost" in c);
  }
});
