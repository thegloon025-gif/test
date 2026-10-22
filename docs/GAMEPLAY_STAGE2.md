# Stateful card access and strategy-aware deployment

Stage 2 remains an **observational model**, independent of deck generation and final candidate selection. App version remains 1.1.5; PR #4 is draft. Stage 1's default evaluator and archived results remain reproducible. Stage 2 uses `evaluateGameplay` in `src/gameplayState.mjs`; no static deck-quality score is introduced.

## What is actually executed

The state tracks distinct deck slots through library, hand, stack, battlefield, graveyard, exile and opponent control. Sacrificed tokens cease to exist; they are not creature cards in a graveyard. Drawing takes the actual next card. Casting, discarding, surveilling, scrying, returning a hand card to the top, top casting and exiling the top change those zones. A failed mandatory draw records a model loss, not successful card advantage. Cleanup enforces seven cards unless a supported no-maximum-hand-size permanent is controlled.

`gameplayAccess.mjs` recognizes complete, bounded effect clauses rather than a substring containing “draw.” Supported effects include fixed draw counts, draw/discard, draw/hand-to-top, scry/surveil 1–4 and simple life-loss riders. Effect order is preserved. Selection can inspect only the allowed top cards or actual hand; it prefers a needed land, usable ramp/access, native cards, then other cheaper plays. No unseen future card is used to decide a selection. Rejected scry cards go to the bottom; rejected surveil cards go to the graveyard. These are explicit pilot choices, not optimal-play claims.

Supported abilities include fixed mana/life costs, tapping, self-sacrifice, once each turn, own-turn restrictions, exactly-seven-card conditions and a controlled-power threshold where power is known. Tapping creatures must be past sickness (or have recognized haste). A source cannot tap for mana and also pay a tap-draw cost. A non-tap self-sacrifice draw may use the source's independent tap mana first when legal. Activation-only mana can pay an activated draw fee, but cannot pay Ulalek's triggered cost. Draw sources that give themselves to an opponent leave our board; they do not keep drawing for us.

Supported triggers include self entry, simple creature entry and spell casting with known type/colorless/MV filters. Kindred Discovery chooses a commander-relevant creature type deterministically, then draws for real matching entries; its combat branch is unknown. Guardian Project checks nontoken status and actual same-name creatures on the battlefield and creature cards in the graveyard. Up the Beanstalk has distinct entry and MV-five cast triggers. Emrakul's Influence and the draw clause of Kozilek's Unsealing check the actual spell type and printed MV. Engines do not trigger themselves from hand before entering the battlefield. A cast-trigger draw resolves before the original permanent; obtained cards can be used only after the current cast has finished resolving.

Fixed numeric power is used only when the model knows it. Counters, power-changing text and relevant unmodeled modifiers make power prerequisites **unknown**, rather than activating draw from an assumed printed number. No counters are invented for The One Ring, Insight Engine or Tablet of Compleation. Paid/conditional draw triggers outside the explicit grammar, quoted/granted abilities, Class/level gates, death/combat triggers, modal/additional-cost access, arbitrary tutors and complex reveal/search effects remain unknown.

Top casting requires an active supported permission and top visibility. Mystic Forge and Eladamri use the actual top card, satisfy type restrictions and pay the normal exact cost. Lands cannot be cast. Mystic Forge may pay its tap/life cost to exile a blocker; it cannot skip a land for free or untap itself for another attempt. Drawn lands may use an unspent land drop during the same main phase. Top-land play, cascade, copying, alternate-face/craft access and full priority/stack-order search are not implemented.

Every optional commander cast-trigger payment is still reserved before any credited cast/entry/access resources resolve. No copied spells, extra copied draw triggers, infinite resources or executed win are credited. The normal bracket policy and deferred custom pod rules remain untouched.

## Pilots and mulligans

Three deterministic ordered policies share the same known hand, rules and inputs:

- **commander-first:** pay for an available commander before setup; otherwise develop usable mana, supported access and native follow-ups.
- **development:** prioritize usable mana and supported access/reduction setup, then commander deployment. Refill a small hand when a supported activation is available. This can delay the commander; it is a tradeoff, not an automatic improvement.
- **native:** prefer supported native access/reduction with a known follow-up, then commander, usable mana and native creatures. Unknown copy/cascade effects do not receive invented execution credit.

Land selection first checks whether a land enables an exact commander payment. After deployment, a recognized commander cast-payment pattern can prioritize a land enabling a real matching spell **plus its separately reserved trigger payment** (including true-colorless costs). These hypothetical checks include five-land activation thresholds, timing, source restrictions and fees; no trigger resources are credited. Untapped timing and missing known required mana types break remaining ties. Setup avoids prioritizing final-turn sick mana creatures or a conditional engine with no observed support. Remaining off-plan filler is not funded by consuming one-shot mana creatures. Available draw/source activations compete with casting; they do not receive free fees or extra untaps. Ordered rules choose actions; they are not a weighted deck-ranking objective.

All pilots share an anti-starvation guard: at most **one setup action may precede an already-payable commander**. After that, the next payable commander cast takes priority. The guard considers actual payment feasibility, not a guessed curve. This permits one intentional setup tradeoff but stops repeated draw activations or cheap deployments from indefinitely consuming the commander's budget. Scripts remain explicit schedules rather than following the pilot guard.

Default is **no mulligan** for direct Stage 1/policy comparisons. The opt-in `one-free` policy takes one multiplayer free mulligan when the initial seven has fewer than two or more than five land slots. All cards return before a deterministically seeded reshuffle; redraw seven, no paid bottom, then keep regardless. It does not optimize colored sources or inspect future draws. Policies receive identical initial orders, and when mulliganing they receive the same new order. This is a conservative reproducible assumption, not an expert Commander mulligan solver.

Each turn is one own main phase after a natural draw, including turn one. Three inert opponent seats exist only for supported control transfers; no opposing combat, removal or other actions are simulated. Bounds: turns 1–8, at most 40 configured actions (default 24), 4,000 payment/allocation nodes per attempt and the inherited mana-cost/production bounds. Hitting a bound remains unknown. No ranking uses these results.

## Payment-search changes

Stage 1 keeps the original search by default. Stage 2 opts into:

1. Canonical ordering of independent zero-fee activations between payments/paid activations. Activation fees reset the ordering barrier; fees still require already produced mana.
2. Canonical assignments for identical pips, avoiding equivalent permutations while retaining distinct mana types/restrictions.
3. Bipartite feasibility pruning over an **optimistic relaxation** of unused sources: fees are ignored and each potential unit may independently choose a mode/color. This can overestimate availability; only a failed matching can prune. A successful relaxed match never counts as a real payment.

The actual search still produces distinct, legal activation and spending receipts. Tests cross-check optimized and exhaustive small-source legacy outcomes, restricted fees/trigger costs, source use and atomic unknown behavior. The benchmark separately replays the exact original bound-hit inputs, an extended legacy cross-check, and full newly evaluated policies; those are different experiments.

## Metrics, audits and uncertainty

Per-turn observations record actual commander presence and first deployment turn; independent affordable mana-type/generic counts for the commander context; separately affordable triggered `{C}{C}`; effect/natural draws, discards, top returns/casts, hand size; supported/unknown native channels deployed, ready and actually used; payable large native bodies; and missed plays with underlying causes. Mana-type maxima are **not simultaneous or additive**; counts saturate at the documented 16-unit observation cap. Unknown query results remain null/unknown.

`netAccessibleCards` is exact card accounting within the model: **hand + our nontoken, noncommander permanents − opening seven − natural draws**. It captures draw/selection, one-shot spells, sacrifice, cleanup and control transfers. Tokens and the commander do not fabricate card advantage. It is not a strength score. Gross draw counts alone cannot establish improved card advantage or deck quality.

Readiness is a currently payable supported activation/follow-up; “used” requires an observed supported event. A deployed copier or cascade engine remains unknown. The large-native-body observation uses a declared printed-power/MV predicate; it cannot measure Yuriko combat damage, Wilhelt death engines or Zada target-copy wins. Missing those outcomes is an implementation limit, not evidence of a weak deck.

`gameplayAudit.mjs` independently checks mana receipts, activation fees/restrictions, tap/sickness and life. `gameplayZoneAudit.mjs` reconstructs zones, permissions, prerequisites and effect budgets from the original deck and Oracle grammar, rather than trusting hand/library snapshots. It catches fabricated draws, skipped effects, missing top permission and repeated source costs. Both are subset audits, not full Magic rules certification.

Benchmarks use 32 deterministic common seeds per configuration. Wilson 95% intervals describe sampled model events; paired bootstrap intervals describe common-seed differences. They cover neither unsupported mechanics nor human play/opponents and do not establish reliable combo turns or win rates. Comparisons are exploratory, without multiple-comparison correction. Unknown coverage counts identified unsupported access clauses and channels; full Oracle/rules coverage is not quantified.

## Local commands (Node 22+, Windows compatible)

Keep the original `data` directory; do not refresh it for a frozen comparison. Benchmarking requires Git for source provenance. The trace CLI accepts frozen deck slugs and resolves their exact archived records, preserving printing aliases/prices.

```text
node --test tests/gameplay-stage2.test.mjs tests/gameplay-deployment.test.mjs
npm test
node tools/trace-stateful-gameplay.mjs data ulalek-b4 trace.json native none
node tools/trace-stateful-gameplay.mjs data ulalek-b3 mulligan-trace.json commander-first one-free
node tools/benchmark-stateful-gameplay.mjs data benchmarks/v12/local-stage2
```

The benchmark checks 100-card legality/singleton/exact selected-printing budgets, cache hashes, historical measurements and Stage 1 archive hashes. It reproduces Stage 1 trace hashes before comparing optimized search, three pilots, access ablation and mulligans. No new construction is run and no frozen deck is edited. New snapshots use a new output directory. See [validation and Stage 3 proposal](../benchmarks/v12/stage2-VALIDATION.md).
