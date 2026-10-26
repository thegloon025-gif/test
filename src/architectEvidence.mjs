/** Bounded, typed retrieval for advisory prompts. No quality score or network IO. */
import { strategyRelations } from "./strategyRelations.mjs";
import { createHash } from "node:crypto";
import {
  legalFor,
  priceOf,
  oracleId,
  isLandSlot,
  isBasic,
  castHasSubtype,
  castHasType,
} from "./cards.mjs";
import { oracleText, roleEvidence } from "./roleEvidence.mjs";
import { planFor, analysis } from "./mechanics.mjs";
import {
  engineContext,
  planTypes,
  matchesCastNeed,
  supportedCardAccess,
  strategyInfrastructure,
  engineManaValue,
} from "./engineSupport.mjs";
import { independentCommunityDecks } from "./communityKnowledge.mjs";
import { normalizeVariant, normalizedName } from "./combos.mjs";
import { auditComboExecutions } from "./comboExecutionEvidence.mjs";
const id = (c) => String(oracleId(c));
const unique = (xs) => [...new Map(xs.map((c) => [id(c), c])).values()];
const stable = (c) => createHash("sha256").update(id(c)).digest("hex");
export const architectCardRecord = (c) => ({
  name: c.name,
  manaCost: c.mana_cost ?? null,
  type: c.type_line,
  colorIdentity: c.color_identity,
  oracle: oracleText(c).slice(0, 700),
  oracleTruncated: oracleText(c).length > 700,
  eur: priceOf(c),
  eligiblePrinting: c.printing?.eligibleVersion === 2,
  printing: c.printing
    ? {
        recordId: c.printing.id ?? null,
        set: c.printing.set,
        collectorNumber:
          c.printing.collectorNumber ?? c.printing.collector_number ?? null,
      }
    : null,
});
function native(c, plan) {
  const a = analysis(c),
    t = oracleText(c);
  // Matching printed support clauses supplies potential packages, not executed value.
  const supportTypes = planTypes(plan);
  if (
    supportTypes.some((type) =>
      new RegExp(
        "\\b" + type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
        "i",
      ).test(t),
    ) &&
    /draw|copy|cascade|search your library|cost.*less|create/i.test(t)
  )
    return true;
  if (
    plan.needs.some((n) => n.kind === "typed-cast") &&
    /copy target triggered ability|triggered abilit[^\n]*additional time/i.test(
      t,
    )
  )
    return true;
  return plan.needs.some((n) =>
    n.kind === "typed-cast"
      ? matchesCastNeed(c, n)
      : n.kind === "death-tribal" || n.kind === "token-tribal"
        ? castHasSubtype(c, n.type) ||
          a.sacrifice ||
          a.recursion ||
          /\bdies\b/.test(t)
        : n.kind === "ninjutsu"
          ? castHasSubtype(c, "Ninja") || a.freeEvasion
          : n.kind === "target-copy"
            ? a.targetOnly || a.tokens
            : n.kind === "landfall"
              ? a.ramp || /landfall/i.test(t)
              : n.kind === "lifegain"
                ? a.lifegain
                : n.kind === "blink"
                  ? a.blink || a.etb
                  : n.kind === "counters"
                    ? /\+1\/\+1 counter/.test(t)
                    : n.kind === "recursion"
                      ? a.recursion || a.sacrifice
                      : false,
  );
}
/** Diversity within a FUNCTION, not a global card ranking. Round-robin MV/cost bands. */
function options(cards, limit) {
  const bins = new Map();
  for (const c of cards
    .slice()
    .sort((a, b) => stable(a).localeCompare(stable(b)))) {
    const key =
      (engineManaValue(c) <= 2
        ? "early"
        : engineManaValue(c) <= 5
          ? "middle"
          : "late") +
      ":" +
      (priceOf(c) <= 2 ? "low" : priceOf(c) <= 10 ? "medium" : "higher");
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key).push(c);
  }
  const result = [];
  for (let i = 0; result.length < limit; i++) {
    let added = false;
    for (const xs of bins.values())
      if (xs[i] && result.length < limit) {
        result.push(xs[i]);
        added = true;
      }
    if (!added) break;
  }
  return result;
}
export function architectEvidence({
  commander,
  catalog,
  variants = [],
  decks = [],
  budget,
  bracket,
  highlightVariantIds = [],
}) {
  const plan = planFor(commander),
    eligible = unique(
      catalog.filter(
        (c) =>
          legalFor(c, commander) &&
          priceOf(c) !== null &&
          priceOf(c) <= budget &&
          id(c) !== id(commander),
      ),
    ),
    byId = new Map(eligible.map((c) => [id(c), c])),
    byName = new Map(eligible.map((c) => [normalizedName(c.name), c]));
  byName.set(normalizedName(commander.name), commander);
  const cohort = independentCommunityDecks(decks, {
      commanderId: id(commander),
      bracket: Number(bracket),
    }),
    sources = [];
  for (const d of cohort.decks) {
    if (d.source !== "Archidekt") continue;
    // Recheck physical structure and catalog legality, not the cached flag alone.
    const rows = d.mainboard || [],
      resolved = rows.map((r) => ({
        c: byId.get(String(r.id)),
        n: Number(r.quantity),
      }));
    if (
      resolved.reduce((n, r) => n + r.n, 0) !== 99 ||
      resolved.some(
        (r) =>
          !r.c ||
          !Number.isInteger(r.n) ||
          r.n < 1 ||
          (r.n > 1 && !isBasic(r.c)),
      ) ||
      new Set(resolved.filter((r) => !isBasic(r.c)).map((r) => id(r.c)))
        .size !== resolved.filter((r) => !isBasic(r.c)).length
    )
      continue;
    sources.push({
      source: d.key,
      bracket: d.edhBracket,
      cards: resolved.flatMap((r) => Array(r.n).fill(r.c)),
      observedAt: d.updatedAt || d.importedAt || null,
    });
  }
  const sourceCards = unique(sources.flatMap((s) => s.cards)),
    nativeCards = eligible.filter((c) => native(c, plan));
  const comboCandidates = [
    ...new Map(
      variants
        .map(normalizeVariant)
        .filter(Boolean)
        .map((v) => [v.id, v]),
    ).values(),
  ].filter(
    (v) =>
      v.uses.length &&
      v.uses.every((u) => byName.has(normalizedName(u.name))) &&
      v.uses.some((u) => {
        const c = byName.get(normalizedName(u.name));
        return (
          id(c) === id(commander) ||
          native(c, plan) ||
          sourceCards.some((s) => id(s) === id(c))
        );
      }),
  );
  // Distinct evidence channels: commander-required, compact-risk, native packages,
  // then source-only ideas. Numeric IDs never act as a global strategy ranking.
  const highlighted = new Set(highlightVariantIds);
  const comboGroups = [[], [], [], [], [], []];
  for (const v of comboCandidates
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    if (
      v.spoiler ||
      v.legalities?.commander === false ||
      v.uses.some(
        (u) =>
          u.mustBeCommander &&
          byName.get(normalizedName(u.name))?.name !== commander.name,
      )
    )
      continue;
    const hasCommander = v.uses.some(
        (u) => byName.get(normalizedName(u.name))?.name === commander.name,
      ),
      nativeCount = v.uses.filter((u) =>
        native(byName.get(normalizedName(u.name)), plan),
      ).length;
    const qty =
      v.uses.reduce((n, u) => n + u.quantity, 0) +
      v.templateRequirements.reduce((n, r) => n + r.quantity, 0);
    comboGroups[
      highlighted.has(v.id)
        ? 0
        : hasCommander
          ? 1
          : v.isInfinite && qty < 3 && nativeCount
            ? 2
            : nativeCount >= 2
              ? 3
              : nativeCount
                ? 4
                : 5
    ].push(v);
  }
  const chosenCombos = [];
  for (let round = 0; chosenCombos.length < 8; round++) {
    let added = false;
    for (const xs of comboGroups)
      if (xs[round] && chosenCombos.length < 8) {
        chosenCombos.push(xs[round]);
        added = true;
      }
    if (!added) break;
  }
  const combos = chosenCombos.map((v) => {
    const pieces = v.uses.map((u) => byName.get(normalizedName(u.name))),
      audit = auditComboExecutions([v], {
        commander,
        cards: unique(pieces.filter((c) => id(c) !== id(commander))),
        catalog,
      }).combinations[0];
    const quantity =
      v.uses.reduce((n, u) => n + u.quantity, 0) +
      (v.templateRequirements || []).reduce((n, r) => n + r.quantity, 0);
    return {
      id: v.id,
      url: v.url,
      pieces: v.uses,
      templates: v.templateRequirements,
      initialMana: v.manaNeeded,
      prerequisites: v.prerequisites,
      steps: v.steps,
      outcomes: v.results,
      infinite: v.isInfinite,
      policy: {
        allowedByKnownGate: !(
          (Number(bracket) === 2 && v.isInfinite) ||
          (Number(bracket) === 3 && v.isInfinite && quantity < 3) ||
          (Number.isInteger(v.bracket) && v.bracket > Number(bracket))
        ),
        reason:
          "Existing conservative B2 infinite/B3 compact-infinite and cached higher-bracket gates; not current official certification. Custom pod profile inactive.",
        timing: "unknown; no turn inferred from inventory",
      },
      conversion: audit?.conversion || { status: "unknown" },
      retainTogether: pieces.map((c) => c.name),
      packageEUR:
        Math.round(unique(pieces).reduce((n, c) => n + priceOf(c), 0) * 100) /
        100,
    };
  });
  const functions = {
    native: [],
    fixing: [],
    trueColorless: [],
    acceleration: [],
    cardAccess: [],
    interaction: [],
    protection: [],
    recovery: [],
  };
  for (const c of eligible) {
    const a = analysis(c),
      r = roleEvidence(c),
      t = oracleText(c);
    if (native(c, plan)) functions.native.push(c);
    if (
      isLandSlot(c) &&
      (/Add .*\{[WUBRG]\}|mana of any color/i.test(t) ||
        (isBasic(c) && !castHasSubtype(c, "Wastes")))
    )
      functions.fixing.push(c);
    if (a.manaC) functions.trueColorless.push(c);
    if (!isLandSlot(c) && a.ramp) functions.acceleration.push(c);
    if (
      r.draw !== "none" ||
      /you may cast .*from the top of your library/i.test(t)
    )
      functions.cardAccess.push(c);
    if (r.removal !== "none") functions.interaction.push(c);
    if (r.shield !== "none") functions.protection.push(c);
    if (a.recursion) functions.recovery.push(c);
  }
  const helpers = nativeCards.filter((c) =>
    /draw|copy|cascade|search your library|cost.*less/i.test(oracleText(c)),
  );
  const pool = unique([
      commander,
      ...sourceCards,
      ...options(helpers, 48),
      ...options(nativeCards, 48),
      ...Object.values(functions).flatMap((xs) => options(xs, 8)),
    ]),
    context = { ...engineContext(pool, plan), commander },
    packages = [];
  for (const need of plan.needs.filter((n) => n.kind === "typed-cast")) {
    const support = pool.filter(
      (c) => id(c) !== id(commander) && matchesCastNeed(c, need),
    );
    packages.push({
      anchor: commander.name,
      function: "commander-qualifying-casts",
      support: options(support, 6).map((c) => c.name),
      totalPotentialSupport: support.length,
      printed: oracleText(commander),
      requires: [
        "Deploy commander, then actually cast qualifying spells; copies do not qualify",
        ...(plan.needsColorless
          ? [
              "Reserve a separate " +
                plan.needsColorless +
                " true-colorless mana after paying the spell",
            ]
          : []),
      ],
      status: support.length
        ? "inventory relationship; execution unknown"
        : "unknown: no recognized inputs",
    });
  }
  const materialNeeds = plan.needs.filter(
    (n) => ["death-tribal", "token-tribal"].includes(n.kind) && n.type,
  );
  const coreMaterial = (c) =>
    materialNeeds.length
      ? materialNeeds.some((n) =>
          n.type.toLowerCase() === "creature"
            ? castHasType(c, "Creature")
            : castHasSubtype(c, n.type),
        )
      : native(c, plan);
  for (const r of strategyRelations(pool, commander).relationships.filter(
    (r) =>
      (r.kind === "sacrifice-outlet" || r.kind.startsWith("death:")) &&
      (r.card === commander.name ||
        sourceCards.some((c) => c.name === r.card) ||
        r.support.some((name) =>
          pool.some((c) => c.name === name && coreMaterial(c)),
        )),
  )) {
    packages.push({
      anchor: r.card,
      function: r.kind,
      support: r.support.slice(0, 6),
      totalPotentialSupport: r.support.length,
      outlets: r.outlets || [],
      printed: oracleText(pool.find((c) => c.name === r.card)),
      requires: r.prerequisites,
      status: "inventory relationship; execution unknown",
    });
  }
  for (const c of pool) {
    if (id(c) === id(commander) || isLandSlot(c)) continue;
    const access = supportedCardAccess(c, context),
      infra = strategyInfrastructure(c, context);
    const relationships = [
      ...access.triggers.map((t) => ({
        kind: "access:" + t.kind,
        cards: t.cards,
      })),
      ...(access.topSupport
        ? [{ kind: "top-access", cards: access.topCards }]
        : []),
      ...infra,
    ];
    for (const r of relationships) {
      if (!r.cards.length) continue;
      if (
        r.kind === "passiveTriggerCopy" &&
        !/legendary creature|chosen type|colorless/i.test(oracleText(c))
      )
        continue; // Other source qualifiers remain unparsed, never invent equipment/tribal support.
      packages.push({
        anchor: c.name,
        function: r.kind,
        support: r.cards.slice(0, 6),
        totalPotentialSupport: r.cards.length,
        printed: oracleText(c).slice(0, 700),
        requires: [
          "All printed guards, costs and adverse effects in the printed clause apply",
          "Deploy engine and actual support; pay each cost; copies are not casts",
          "Retain required event/resource production alongside its consumer; no execution proof",
        ],
        status: "inventory relationship; execution unknown",
      });
    }
  }
  const groupedPackages = new Map();
  for (const p of packages) {
    if (!groupedPackages.has(p.function)) groupedPackages.set(p.function, []);
    groupedPackages.get(p.function).push(p);
  }
  const selectedPackages = [];
  for (let round = 0; selectedPackages.length < 12; round++) {
    let added = false;
    for (const xs of groupedPackages.values())
      if (xs[round] && selectedPackages.length < 12) {
        selectedPackages.push(xs[round]);
        added = true;
      }
    if (!added) break;
  }
  const functionOptions = Object.fromEntries(
    Object.entries(functions).map(([kind, xs]) => [
      kind,
      {
        available: xs.length,
        cards: options(
          unique([...sourceCards.filter((c) => xs.includes(c)), ...xs]),
          kind === "native" ? 16 : 6,
        ).map((c) => c.name),
      },
    ]),
  );
  // Balanced serialization order: context trimming must not recreate alphabetical starvation.
  const channels = [
      selectedPackages.map((p) => p.anchor),
      ...Object.values(functionOptions).map((f) => f.cards),
      ...selectedPackages.map((p) => p.support),
      combos.flatMap((c) => c.retainTogether),
    ],
    ordered = [];
  for (let round = 0; round < 100; round++) {
    let added = false;
    for (const xs of channels)
      if (xs[round]) {
        ordered.push(xs[round]);
        added = true;
      }
    if (!added) break;
  }
  const recordNames = [...new Set(ordered)];
  const records = recordNames
    .map((name) => byName.get(normalizedName(name)))
    .filter((c) => c && id(c) !== id(commander))
    .map((c) => ({
      ...architectCardRecord(c),
      roles: roleEvidence(c),
      evidence:
        "Printed option only; restrictions and prerequisites must be reviewed",
    }));
  for (const f of Object.values(functionOptions))
    f.selectedOptions = f.cards
      .map((name) => byName.get(normalizedName(name)))
      .filter(Boolean)
      .map((c) => ({ name: c.name, manaCost: c.mana_cost, eur: priceOf(c) }));
  return {
    schema: 1,
    commander: architectCardRecord(commander),
    needs: plan.needs,
    additionalTrueColorless: plan.needsColorless,
    strategicDirections: [
      ...new Set([plan.label, ...selectedPackages.map((p) => p.function)]),
    ],
    packages: selectedPackages,
    comboPackages: combos,
    functions: functionOptions,
    sourceStructures: sources.slice(0, 3).map((s) => ({
      source: s.source,
      bracket: s.bracket,
      observedAt: s.observedAt,
      spells: s.cards.filter((c) => !isLandSlot(c)).map((c) => c.name),
      lands: s.cards.filter(isLandSlot).map((c) => c.name),
      interpretation:
        "Complete observed structure, not a recipe or power proof; choose a direction, do not copy blindly.",
    })),
    records,
    coverage: {
      eligibleCards: eligible.length,
      verifiedMatchingSources: sources.length,
      ignoredSourceDuplicates: cohort.ignored.length,
      totalRelevantComboPackages: comboCandidates.length,
      totalDiscoveredEngineRelationships: packages.length,
    },
    unknowns: [
      "Retrieval is bounded and incomplete, never an exclusive allowed-card list; any exact legal catalog card may be proposed",
      "Inventory relationships do not certify executable combos, timing, recurring draw, lethal damage or wins",
      "Unknown commander grammar: " +
        JSON.stringify(plan.unsupportedCast || []),
      "No official bracket freshness certification (Issue #10); no external power measurements",
      "Mana fixing must cover actual spells, including hybrid choices and separate optional true-C payments; source restrictions remain prerequisites",
    ],
    budget: {
      ceiling: budget,
      commanderEUR: priceOf(commander),
      meaning:
        "Exact selected-record estimates, not verified marketplace quotes; no price reward or mandatory spending",
    },
    selection:
      "Typed function/package retrieval with deterministic MV/price-band diversity; no global quality score, alphabetical shortlist, or personal reference overlap",
  };
}
