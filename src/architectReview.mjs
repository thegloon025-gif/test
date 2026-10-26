/** Advisory only: hard validation runs first. No score, selector or model request. */
import { buildCardJobLedger } from "./jobLedger.mjs";
import { dependencyAnalysis } from "./functionalAblation.mjs";
import { strategyRelations } from "./strategyRelations.mjs";
import { runGoldfish, sourceGrammar } from "./functionalGoldfish.mjs";
import { auditFunctionalTrace } from "./functionalTraceAudit.mjs";
import { auditComboExecutions } from "./comboExecutionEvidence.mjs";
import { isLandSlot, coloredSources, trueColorlessSource } from "./cards.mjs";
import { engineManaValue } from "./engineSupport.mjs";
import { manaPolishReview } from "./manaPolish.mjs";
export function architectFunctionalReview({ commander, cards, variants = [], catalog = [], budget = null, tolerance = 0 }) {
  const present = new Set(
    [commander, ...cards].map((c) => c.name.toLowerCase()),
  );
  const relevantVariants = variants.filter(
    (v) =>
      (v.uses || []).filter((u) => present.has(u.name.toLowerCase())).length >=
        2 ||
      ((v.uses || []).length === 2 &&
        (v.uses || []).some((u) => present.has(u.name.toLowerCase()))) ||
      (v.uses || []).some(
        (u) => u.name.toLowerCase() === commander.name.toLowerCase(),
      ),
  );
  const input = { commander, cards },
    ledger = buildCardJobLedger(input),
    dependencies = dependencyAnalysis(ledger),
    relations = strategyRelations(cards, commander),
    combos = auditComboExecutions(relevantVariants, {
      ...input,
      catalog: [commander, ...cards],
    }),
    jobs = ledger.cards.flatMap((c) => c.jobs),
    warnings = [];
  const warn = (code, status, explanation, evidence) =>
    warnings.push({ code, status, explanation, evidence });
  for (const o of ledger.obligations.filter((o) => o.status === "unsupported"))
    warn("missing-prerequisite", o.status, o.question, {
      obligation: o.id,
      missing: o.missing,
    });
  const persistentAccess = jobs.filter(
      (j) =>
        j.kind.startsWith("access:") &&
        j.sourceIsPersistent &&
        !j.consumesSource,
    ),
    oneShot = jobs.filter(
      (j) => j.kind.startsWith("access:") && !j.sourceIsPersistent,
    ),
    lands = cards.filter(isLandSlot),
    ramp = cards.filter((c) => !isLandSlot(c) && sourceGrammar(c));
  if (!persistentAccess.length)
    warn(
      "no-recognized-persistent-access",
      "unknown",
      "No persistent card-access job recognized. One-shot draw is not a replacement for a deployed engine; unparsed access remains unknown.",
      {
        oneShot: oneShot.map((j) => j.card),
        unresolved: jobs
          .filter((j) => j.kind === "unresolved:mechanics")
          .map((j) => j.card),
      },
    );
  const manaInventory = {
    lands: lands.length,
    supportedRamp: ramp.map((c) => ({
      card: c.name,
      cost: c.mana_cost,
      source: sourceGrammar(c),
    })),
    colors: Object.fromEntries(
      ["W", "U", "B", "R", "G"].map((color) => [
        color,
        {
          printedPotential: lands
            .filter((c) => coloredSources(c).includes(color))
            .map((c) => c.name),
          simpleSupported: lands
            .filter((c) => sourceGrammar(c)?.options.includes(color))
            .map((c) => c.name),
        },
      ]),
    ),
    trueColorless: lands.filter(trueColorlessSource).map((c) => c.name),
    colorlessOnly: lands.filter(
      (c) => trueColorlessSource(c) && !coloredSources(c).length,
    ).length,
  };
  const demandGroups = [
    ...new Set(
      [commander, ...cards].flatMap((c) =>
        [...(c.mana_cost || "").matchAll(/\{([^}]+)\}/g)]
          .map((m) => m[1])
          .filter((s) => /^[WUBRG](?:\/[WUBRG])?$/.test(s)),
      ),
    ),
  ].map((s) => s.split("/"));
  const demanded = new Set(demandGroups.flat());
  for (const choices of demandGroups)
    if (
      !choices.some(
        (color) => manaInventory.colors[color].printedPotential.length,
      )
    )
      warn(
        "missing-colored-land-channel",
        "unknown",
        "No recognized land production for any option of {" +
          choices.join("/") +
          "}. Nonland fixing and unsupported sources require review.",
        { choices },
      );
  if (
    demanded.size > 0 &&
    manaInventory.colorlessOnly > lands.length - manaInventory.colorlessOnly
  )
    warn(
      "colorless-land-concentration",
      "supported",
      "Most lands have only recognized true-colorless production while spells have colored payment requirements. This inventory concentration risks fixing; it is not a turn probability.",
      {
        demanded: [...demanded],
        colorlessOnly: manaInventory.colorlessOnly,
        lands: lands.length,
      },
    );
  const observations = ["commander-first", "development-first"].map(
    (policy) => {
      const sample = runGoldfish(input, {
        seed: "architect-functional-v1",
        trials: 8,
        turns: 8,
        policy,
      });
      for (const r of sample.runs) auditFunctionalTrace(input, r);
      const blocked = new Map();
      for (const r of sample.runs)
        for (const t of r.observations)
          for (const b of t.blocked) {
            const k = b.card + "|" + b.status + "|" + b.reason;
            if (!blocked.has(k)) blocked.set(k, { ...b, attempts: 0 });
            blocked.get(k).attempts++;
          }
      return {
        policy,
        trials: sample.trials,
        commanderByTurn8: sample.deployed,
        interval95: sample.interval95,
        commanderTurns: sample.runs.map((r) => r.commanderTurn),
        immediateCardsDrawn: sample.runs.map((r) =>
          r.observations.reduce((n, t) => n + t.immediateDraw, 0),
        ),
        missedLandDrops: sample.runs.map(
          (r) => r.observations.filter((t) => !t.landDrop).length,
        ),
        castCards: [
          ...new Set(
            sample.runs.flatMap((r) =>
              r.events.filter((e) => e.kind === "cast").map((e) => e.card),
            ),
          ),
        ],
        blocked: [...blocked.values()],
        unknownCards: sample.runs[0].coverage.unknownCards,
        unsupported: sample.runs[0].coverage.unsupported,
        auditedRuns: sample.runs.length,
        scope:
          "8 fixed trials per pilot, not independent population estimates or real-game win rates. Wilson interval applies only to sampled deployment model; native triggers/combat/recovery not simulated. Absent unsupported events are unknown.",
      };
    },
  );
  const expensive = cards.filter(
      (c) => !isLandSlot(c) && engineManaValue(c) > commander.cmc,
    ),
    stranded = observations.map((o) => ({
      policy: o.policy,
      cards: expensive
        .filter((c) => !o.castCards.includes(c.name))
        .map((c) => c.name),
    }));
  if (stranded.some((x) => x.cards.length))
    warn(
      "unobserved-expensive-followups",
      "unknown",
      "Some above-commander-MV spells were never cast in this bounded sample. Check actual development and access; absent draws, pilot choices and unsupported mana are alternative causes, not proven uncastability.",
      {
        stranded,
        supportedRamp: ramp.map((c) => c.name),
        persistentAccess: [...new Set(persistentAccess.map((j) => j.card))],
      },
    );
  const commanderInputs = relations.relationships.filter(
    (r) => r.card === commander.name && r.kind.startsWith("cast:"),
  );
  for (const r of commanderInputs.filter((r) => !r.support.length))
    warn(
      "no-recognized-native-input",
      "unknown",
      "No recognized qualifying input for commander relationship " + r.kind,
      { prerequisites: r.prerequisites },
    );
  const pressure = jobs.filter((j) =>
    j.provides.some((p) =>
      ["life-pressure", "combat-contribution"].includes(p.kind),
    ),
  );
  if (!pressure.length)
    warn(
      "win-conversion-unresolved",
      "unknown",
      "No printed direct pressure/combat keyword conversion recognized. Ordinary creature combat and unparsed finishers remain unknown; no claim that the deck cannot win.",
      {
        resources: jobs
          .filter(
            (j) =>
              j.kind === "conversion:resource" || j.kind === "resource:token",
          )
          .map((j) => j.card),
      },
    );
  const complete = combos.combinations.filter((c) => c.inventoryComplete),
    sharedComboPieces = [
      ...new Set(complete.flatMap((c) => c.requirements.map((r) => r.name))),
    ]
      .map((card) => ({
        card,
        packages: complete
          .filter((c) => c.requirements.some((r) => r.name === card))
          .map((c) => c.id),
      }))
      .filter((x) => x.packages.length > 1);
  if (sharedComboPieces.length)
    warn(
      "shared-combo-dependency",
      "supported",
      "Nominal combo packages share physical pieces; they are not automatically independent finishing paths.",
      sharedComboPieces,
    );
  const incomplete = combos.combinations.filter(
    (c) => !c.inventoryComplete && c.requirements.some((r) => r.available > 0),
  );
  if (incomplete.length)
    warn(
      "incomplete-cached-packages",
      "unknown",
      "Some relevant cached packages are incomplete. These are optional hypotheses, not required plans or independent wins; missing pieces and timing are not free.",
      {
        count: incomplete.length,
        examples: incomplete
          .slice(0, 6)
          .map((c) => ({ id: c.id, missing: c.missing, timing: c.timing })),
        omittedExamples: Math.max(0, incomplete.length - 6),
      },
    );
  const sharedMissingPieces = [
    ...new Set(incomplete.flatMap((c) => c.missing.map((m) => m.name))),
  ]
    .map((card) => ({
      card,
      packages: incomplete
        .filter((c) => c.missing.some((m) => m.name === card))
        .map((c) => c.id),
    }))
    .filter((x) => x.packages.length > 1);
  if (sharedMissingPieces.length)
    warn(
      "shared-missing-package-input",
      "unknown",
      "Several cached hypotheses rely on the same absent piece. They are neither available nor independent wins. This does not recommend adding a piece that violates bracket policy.",
      sharedMissingPieces,
    );
  return {
    mode: "read-only functional review",
    warnings,
    ledger,
    dependencies,
    relations,
    manaInventory,
    manaPolish: manaPolishReview({ commander, cards, catalog, budget, tolerance }),
    cardAccess: {
      persistent: [...new Set(persistentAccess.map((j) => j.card))],
      oneShot: [...new Set(oneShot.map((j) => j.card))],
      execution:
        "Triggers and repeated activated access remain unknown in this goldfish subset",
    },
    combos: { ...combos, sharedComboPieces, sharedMissingPieces },
    goldfish: observations,
    revision: {
      automatic: false,
      requiresExplicitUserRequest: true,
      reason:
        "Warnings never start a model repair, change hard gates, mutate deck or certify strength.",
    },
    limitations: [
      "No universal quality score or mandatory role quotas",
      "Independent physical providers still share mana, timing and material; redundancy is structural only",
      "Simulator is the existing bounded PR #9 mana/hand foundation, not PR #4 native execution",
      "Supported means printed/inventory evidence unless an audited trace explicitly records the event",
    ],
  };
}
