# Read-only job ledger and strategy obligations — draft v1.1.5

This is the shadow-first milestone on PR #9. **Production selection remains
unchanged**, including its existing scalar decisions. The earlier production
rewrite was set aside outside Git when the milestone changed. Only the isolated
incomplete-legacy export/fallback guard changes production behavior.

`src/jobLedger.mjs` is not imported by the server, generator, investment or
candidate-selection modules. It accepts already selected card records, returns
plain observations and does not modify inputs, exports, caches or prices. It
contains no deck-quality score, ranking, acceptance decision or budget target.

## Evidence semantics

- **supported:** a printed effect, type or inventory relationship is recognized.
  This never means a card was deployed, a cost paid, a trigger resolved or a win
  achieved. A single qualifying card can establish an inventory relationship;
  the existing access helper's eight-card heuristic is not a shadow obligation.
- **unsupported:** a specific recognized input predicate has no matching known
  inventory provider. Scope is that predicate/baseline direction, not a verdict
  that a whole deck is weak or its effect can never happen in any game.
- **unknown:** unparsed mechanics, undeclared choices, missing catalog data,
  battlefield/zone state, resources, timing, throughput or conversion are not
  established. Unknown never becomes zero performance or a failed obligation.

The module validates record/size bounds, not deck legality. `completeInput`
means 100 known records, not complete rules coverage or certified legality.
Keep the existing separate count/singleton/color/bracket/printing/budget audits.
Diagnostic mutations are not automatically admissible upgrades: deliberately
removing a committed engine can break a source spine or combo commitment.

## Ledger and observed directions

Every physical slot, including commander and each repeated basic, has a distinct
slot ID. Its jobs describe provided resources/events, beneficiaries, qualifying
cards, printed costs, timing, repeatability and unresolved clauses. Several jobs
on one permanent share `sharedDependency`; they are not independent engines.

Recognized jobs include physical creature/artifact material, casts, simple own
mana abilities, token production and sacrifice consumption, direct/activated/
triggered/top-library access, death and cast pressure, native infrastructure,
recovery permissions, interaction, protection and printed outlets/combat.
Unparsed clauses remain visible. Alternative casting faces remain explicitly
unknown as combined execution; their costs/effects cannot be used simultaneously.

Observed directions anchor plan-specific questions to those jobs rather than
assigning a commander archetype. A native cast engine asks about its actual
spell predicate; a conversion asks about eligible material, payments and renewal;
a pressure source asks about actual lethal conversion. Protection/recovery
questions are optional robustness questions with unverified candidates, not
universal quotas. Standalone interaction and utility need no closed combo.

Incomplete and competing directions coexist. `compareJobLedgers` identifies
removed functions, lost conditional access, changed support and broken baseline
anchors. It does not choose a winner or reject a legitimately different plan.
Quantities are descriptive costs/coverage, never summed into deck strength.

Examples:

- Warren Soultrader: pay **1 life** and sacrifice **another creature** before
  Treasure exists. Its own unresolved output cannot fund that cost. Treasure
  supplies colored choices, **not true {C}**. Material renewal and a win remain unknown.
- Ulalek: casting costs and optional **{C}{C} at trigger resolution** are separate
  jobs. Potential-source edges are not allocations; the same source cannot be
  spent twice. The model never spends unresolved copied/cast-trigger resources.
- Y'shtola: actual noncreature/MV≥3 cards support the printed pressure predicate.
  Enough life lost during a particular turn for end-step draw remains unknown;
  qualifying inventory is not a sequence of affordable casts.
- Mystic Forge: access is from the **actual top of library**, with paid costs and
  normal timing. It is neither a free draw nor evidence that a useful card was on top.
- Cycling and source sacrifice are consumed-card access. Counter-gated draw,
  control transfer and unparsed costs retain explicit conditions. Parenthesized
  basic-land mana remains one physical tap source.

## Limits and conditional probes

The bounded grammar inspects at most 32 Oracle clauses per card and records
omissions. Unknown card records are excluded from qualifying-type matches.
Self-bootstrap token payments, paying a spell with its unresolved source and
reusing the same tap for both mana and an activation are not certified.

Potential-source edges still do not allocate simultaneous payments. Life,
resource competition, generated-material bootstrap cycles, token attributes,
equip/death/commander replacement ordering, controller changes, counter states,
recursion and temporal throughput are mostly unknown. Token mana requires its
printed ability; a Spawn/Scion subtype alone grants no invented output.

`strategyExecution.mjs` remains unchanged. Optional fixed 16-trial setup probes
are attached as **conditional supporting evidence only**. Its separate endpoints
are not simultaneous outcomes. Unsupported combat/ninjutsu, sacrifice/death,
copy resolution and zone mechanics cannot create failed obligations, comparisons
or power claims. Missing/zero endpoints do not mean a strategy failed.

## Six current scalar decision points — audit, not replacement

| Point and current effect | Proposed migration and evidence gate |
|---|---|
| Initial construction: `merit()` plus weighted source/land priors order cards; individual numerical utility can hide an incomplete engine. | First validate job costs/support and false positives. Later schedule bounded relationship hypotheses with independent hard validation. Never use job counts as a replacement score. |
| Single-card remaining budget: intrinsic merit threshold/price-utility ordering, role floors and `strategyScore` veto control accepted swaps. | Hold original plan obligations and exact record constraints fixed; shadow complete changes, retaining tradeoffs and unresolved execution. Do not change acceptance yet. |
| Investment-path portfolio: quality/balanced/value paths are compared by scalar, quality gain and cost ties. | Retain coherent complete paths; establish when supported functionality actually dominates and when only a presentation default is defensible. No spending reward. |
| Atomic packages: rough summed utility schedules probes; scalar orders beam survivors and final package selection after functional gates. | Audit coordinated resource/dependency changes, source/combo commitments and unknowns before any opt-in scheduling/comparison trial. Bound/capture search exclusions. |
| Complete-candidate pruning/refinement: generic vectors, coverage leaders and lightweight execution comparisons narrow survivors/deeper work. | Test native/support loss and unfamiliar-strategy abstention. A missing probe event is not failed functionality. Validate opportunity/coverage before a pruning decision. |
| Final selection/API presentation: `strategyScore` sorts incomparable survivors and alternatives; generator has a scalar legacy-acceptance veto. | Keep incomparable alternatives; propose an explicit deterministic presentation policy and user preferences only in a separately reviewed integration. Retain historical diagnostics, not a hidden replacement score. |

These are present-day behaviors, not claims the scalar is retired from production.
The historical Wilhelt €102.06 / €186.47 scores (168.82 /168.50) and final guarded
€163.25 recommendation remain archived. The ledger does not recalculate or
endorse them. Source/Oracle observations and job totals cannot establish superiority.

Before migration: independently label more real prerequisites/false positives,
verify relevant paid/temporal paths, retain unexplained alternatives, replay fixed
complete decks across commanders and budgets, and obtain permitted human/external
quality evidence. This milestone does **not** justify production integration.

## Local use and Windows

Node **22+**, ES modules; no added dependencies or network access:

```
node tools/shadow-job-ledger.mjs "C:\My Decks\selected-records.json" "C:\My Decks\new-ledger.json.gz"
```

Input is `{ "commander": {...}, "cards": [99 selected catalog records] }`, not
an unpriced plain-text export. Optional `executionEvidence` is conditional caller
input, not verified gameplay. CLI input is limited to 2 MiB and an existing
output is never overwritten. Original cache and personal files remain unchanged.
Paths containing spaces are tested on Linux; native Windows remains unverified.

Frozen public/archive plus private-reference reproduction, from repository root:

```
node tools/benchmark-shadow-job-ledgers.mjs CATALOG LIBRARY PRIVATE_ANALYSIS NEW_PUBLIC_OUT NEW_PRIVATE_OUT
node tools/audit-shadow-job-ledgers.mjs CATALOG LIBRARY NEW_PUBLIC_OUT/ledgers.json.gz NEW_AUDIT.json
```

`PRIVATE_ANALYSIS` is the existing confirmed reference analysis, never a generator
input. It contains exact reference IDs and explicit missing-card names; do not
commit it. Full private reference ledgers stay outside Git. Public bundles hold
complete generated/source ledgers, mutation ledgers and explanatory comparisons;
extract them with standard Node zlib or a ZIP/gzip reader.

Run `node --test tests/shadow-job-ledger*.test.mjs tests/legacy-export-guard.test.mjs`
and `npm test`. Independent audits verify static graph/cost and selected-printing
receipts, not live zone/resource execution or official bracket rulings.

Version remains **1.1.5**. PRs stay draft/unmerged. No Pod profile, gameplay ranking,
release, automatic Upgrader, scraping or external performance claim is enabled.
