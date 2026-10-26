import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../benchmarks/architect-quality/user-tests/", import.meta.url);
const fixtures = [
  ["ulalek-2026-10-26.txt", "Ulalek, Fused Atrocity", "72aef1cffeaca40aaeef8cfa3151dc6388772f12ab246b5808bce9255ed41099"],
  ["wilhelt-2026-10-26.txt", "Wilhelt, the Rotcleaver", "e600d3b4a18e524f618bf0073c98170229c00e81744c20106585c4e2229dc4ef"],
  ["yshtola-2026-10-26.txt", "Y'shtola, Night's Blessed", "714aa9a1305c26bcfa94c6a5d9871c5c8d3728ddf398783759d8fdfb5cb32cac"]
];
for (const [file, commander, expectedSha] of fixtures) {
  test("frozen external 100-card fixture: " + file, async () => {
    const bytes = await readFile(new URL(file, root)), content = bytes.toString("utf8");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedSha);
    const rows = content.trim().split(/\r?\n/).map(line => {
      const x = /^(\d+) (.+?)(?: \*CMDR\*)?$/.exec(line);
      assert.ok(x, "Incorrect line: " + line);
      return {count:Number(x[1]),name:x[2],commander:line.includes("*CMDR*")};
    });
    assert.equal(rows.reduce((sum, x) => sum + x.count, 0), 100);
    assert.deepEqual(rows.filter(x => x.commander).map(x => x.name), [commander]);
    const basics = new Set(["Wastes","Plains","Island","Swamp","Mountain","Forest"]);
    assert.equal(new Set(rows.filter(x => !basics.has(x.name)).map(x => x.name)).size,
      rows.filter(x => !basics.has(x.name)).length);
  });
}
