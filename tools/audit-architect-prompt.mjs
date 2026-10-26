/** Fixed-input audit against PR #14's archived brief, no inference or cache writes. */
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { architectRequest } from "../src/aiArchitect.mjs";
import { readComboLibrary } from "../src/comboLibrary.mjs";
const [catalogPath, communityPath, libraryPath, out] = process.argv.slice(2);
if (!out) throw Error("CATALOG COMMUNITY LIBRARY NEW_REPORT required");
const catalog = JSON.parse(await readFile(catalogPath)),
  decks = JSON.parse(await readFile(communityPath)).decks,
  variants = (await readComboLibrary(libraryPath)).flatMap((e) => e.variants),
  baseline = JSON.parse(
    gunzipSync(
      await readFile("benchmarks/architect-quality/comparison.json.gz"),
    ),
  ),
  cases = [];
for (const old of baseline.cases) {
  const p = {
      mode: "builder",
      commanderName: old.commander,
      budget: 191,
      budgetTolerance: 0,
      bracket: 3,
    },
    request = architectRequest(p, catalog, variants, { decks }),
    wire = JSON.parse(request.prompt.slice(request.prompt.indexOf("{"))),
    brief = wire.deckbuildingBrief;
  for (const expected of old.newBrief.packages) {
    const actual = brief.packages.find(
      (p) => p.anchor === expected.anchor && p.function === expected.function,
    );
    assert.ok(actual, expected.anchor + " missing");
    assert.equal(wire.oracleEvidence[actual.oracleRef].text, expected.printed);
    assert.deepEqual(
      [
        ...actual.requires,
        ...actual.requirementRefs.map((r) => wire.sharedRequirements[r]),
      ].sort(),
      expected.requires.slice().sort(),
    );
  }
  for (const expected of old.newBrief.combos) {
    const actual = brief.comboPackages.find((c) => c.id === expected.id);
    assert.ok(actual, "Critical combo missing " + expected.id);
    assert.deepEqual(actual.prerequisites, expected.prerequisites);
    assert.deepEqual(actual.policy, expected.policy);
    assert.deepEqual(actual.retainTogether, expected.retainTogether);
  }
  for (const [kind, expected] of Object.entries(old.newBrief.functions))
    assert.deepEqual(
      brief.functions[kind].selectedOptions,
      expected.selectedOptions,
    );
  assert.ok(Buffer.byteLength(request.prompt) <= 32000);
  cases.push({
    commander: old.commander,
    beforeBytes: old.promptBytes,
    afterBytes: Buffer.byteLength(request.prompt),
    reductionPercent: Number(
      ((1 - Buffer.byteLength(request.prompt) / old.promptBytes) * 100).toFixed(
        2,
      ),
    ),
    retainedEnginePackages: old.newBrief.packages.length,
    criticalCombosPreserved: old.newBrief.combos.length,
    exactOracleAndPrerequisites: true,
    pricedFunctionsPreserved: true,
  });
}
const upgrades = [];
for (const slug of ["ulalek", "wilhelt", "yshtola"]) {
  const text = await readFile(
      `benchmarks/chatgpt-architect/${slug}-validated-manual-fixture.txt`,
      "utf8",
    ),
    request = architectRequest(
      { mode: "upgrader", text, budget: 40, bracket: 3 },
      catalog,
      variants,
      { decks },
    ),
    p = JSON.parse(request.prompt.slice(request.prompt.indexOf("{")));
  assert.equal(p.originalPhysicalCards, 99);
  assert.equal(
    p.original.reduce((n, c) => n + c.quantity, 0),
    99,
  );
  assert.ok(p.original.every((c) => p.oracleEvidence[c.oracleRef]));
  assert.ok(Buffer.byteLength(request.prompt) <= 46000);
  upgrades.push({
    slug,
    bytes: Buffer.byteLength(request.prompt),
    physicalMainboard: 99,
    protectedIdentities: p.protectedOriginalCards.length,
    committedComboExamples: p.knownComboInventory.length,
    scope:
      "Original, locks, prices/costs and committed combo context retained; optional NEW discovery examples may be removed under legacy Upgrader bound.",
  });
}
await writeFile(
  out,
  JSON.stringify(
    {
      scope:
        "Fixed frozen-input losslessness checks, no inference; bytes are not tokens or latency predictions.",
      cases,
      upgrades,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    cases: cases.length,
    upgrades: upgrades.length,
    allCriticalEvidencePreserved: true,
  }),
);
