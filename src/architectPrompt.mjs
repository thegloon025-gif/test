/** Lossless wire deduplication. Oracle, prerequisites and prices are never summarized here. */
export function compactArchitectPayload(raw) {
  const p = structuredClone(raw),
    brief = p.deckbuildingBrief;
  const oracleEvidence = {},
    lookup = new Map(),
    requirements = {},
    counts = new Map();
  const intern = (card, text, truncated = false) => {
    const key = JSON.stringify([card, text, truncated]);
    if (lookup.has(key)) return lookup.get(key);
    const ref = "o" + lookup.size;
    lookup.set(key, ref);
    oracleEvidence[ref] = { card, text, truncated };
    return ref;
  };
  p.commander.oracleRef = intern(
    p.commander.name,
    p.commander.oracle,
    p.commander.oracleTruncated,
  );
  delete p.commander.oracle;
  delete p.commander.oracleTruncated;
  // Same commander was serialized twice. Keep one authoritative record.
  delete brief.commander;
  brief.commanderRef = "commander";
  for (const pack of brief.packages)
    for (const r of pack.requires || [])
      counts.set(r, (counts.get(r) || 0) + 1);
  const common = new Map(
    [...counts].filter(([, n]) => n > 1).map(([text], i) => [text, "r" + i]),
  );
  for (const [text, ref] of common) requirements[ref] = text;
  for (const pack of brief.packages) {
    pack.oracleRef = intern(
      pack.anchor,
      pack.printed,
      pack.printed.length >= 700
        ? "unknown; package excerpt may be clipped"
        : false,
    );
    delete pack.printed;
    pack.requirementRefs = (pack.requires || [])
      .filter((r) => common.has(r))
      .map((r) => common.get(r));
    pack.requires = (pack.requires || []).filter((r) => !common.has(r));
  }
  for (const record of brief.records) {
    record.oracleRef = intern(
      record.name,
      record.oracle,
      record.oracleTruncated,
    );
    delete record.oracle;
    delete record.oracleTruncated;
    delete record.evidence; // identical advisory boilerplate, retained once below
  }
  // Repeated physical basics need one text record plus their exact quantity.
  const originals = new Map();
  for (const record of p.original || []) {
    const compatible = Object.entries(oracleEvidence).find(
      ([, o]) => o.card === record.name && o.text.startsWith(record.oracle),
    );
    record.oracleRef =
      compatible?.[0] ||
      intern(record.name, record.oracle, record.oracleTruncated);
    delete record.oracle;
    delete record.oracleTruncated;
    const key = JSON.stringify(record);
    if (originals.has(key)) originals.get(key).quantity++;
    else originals.set(key, { ...record, quantity: 1 });
  }
  if (p.original) {
    p.originalPhysicalCards = p.original.length;
    p.original = [...originals.values()];
  }
  p.oracleEvidence = oracleEvidence;
  p.sharedRequirements = requirements;
  p.evidenceFormat =
    "Resolve oracleRef through oracleEvidence, requirementRefs through sharedRequirements. All referenced costs/guards apply. Records are printed options, not execution proof. CommanderRef points to top-level commander. Original quantity counts physical copies; an original oracleRef may provide a fuller matching clause. Exact full catalog is used for local validation.";
  return p;
}
