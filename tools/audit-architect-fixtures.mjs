/** Independent fixture text/printing/budget receipts, not live GPT or billing proof. */
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  exportCardName,
  validateCommanderSingleton,
} from "../src/deckValidation.mjs";
import { isBasic, legalFor, isCommander } from "../src/cards.mjs";
const [folder, catalogFile, out] = process.argv.slice(2);
if (!out) throw Error("FIXTURE_FOLDER CATALOG NEW_OUTPUT required");
const catalog = JSON.parse(await readFile(catalogFile));
let slots = 0;
for (const id of ["ulalek", "wilhelt", "yshtola", "yuriko", "zada"]) {
  const r = JSON.parse(
      await readFile(folder + "/" + id + "-manual-audit.json"),
    ),
    lines = (
      await readFile(
        folder + "/" + id + "-validated-manual-fixture.txt",
        "utf8",
      )
    )
      .trim()
      .split("\n");
  assert.equal(lines.length, 100);
  assert.equal(r.audit.cards.length, 100);
  let cents = 0;
  const selected = [];
  for (let i = 0; i < 100; i++) {
    const row = r.audit.cards[i],
      name = lines[i].replace(/^1 /, "").replace(/ \*CMDR\*$/, "");
    assert.equal(name, row.card);
    const matches = catalog.filter(
      (c) =>
        exportCardName(c) === name &&
        JSON.stringify(c.printing || null) === JSON.stringify(row.printing) &&
        Math.round((isBasic(c) ? 0 : c.prices?.eur) * 100) ===
          Math.round(row.price * 100),
    );
    assert.ok(matches.length, "Unverified selected printing: " + name);
    selected.push(matches[0]);
    cents += Math.round(row.price * 100);
    slots++;
  }
  assert.equal(cents, Math.round(r.price * 100));
  assert.ok(cents <= 19100);
  assert.ok(isCommander(selected[0]));
  assert.ok(validateCommanderSingleton(selected[0], selected.slice(1)).valid);
  assert.ok(selected.slice(1).every((c) => legalFor(c, selected[0])));
  assert.ok(selected.filter((c) => c.game_changer).length <= 3);
}
const result = {
  slots,
  passed: true,
  scope:
    "Five archived manual-result fixtures: count, canonical singleton/color, known GC metadata, frozen selected-printing cents and €191 cap. Not new AI-generated decks, gameplay evidence, official-policy certification or actual billing verification.",
};
await writeFile(out, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(result);
