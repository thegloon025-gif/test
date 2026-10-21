# Coherent investment validation after PR #1

Subsequent PR #2 work: [strategy infrastructure and card-access follow-up](engine-followup-VALIDATION.md). Results below describe `b55cc01` and remain historical.

Base commit: `b7070d2` (merged PR #1). Development remains an unreleased v1.1.5 extension. Commands and Windows reproduction steps: [implementation and limitations](../docs/COHERENT_INVESTMENT.md).

## Historical evidence supplied by the user

Ulalek, €191, High B3: reported current list €108.02, unused €82.98; EDHCheck 5.8/10, B2, speed 5.8, consistency 6.6; EDHPowerLevel 4.70/10, B1, average playability 58.0%. The earlier v1.1.1 reference scored EDHCheck 6.1 (consistency 6.9), EDHPowerLevel 5.26. Earlier pricing was less reliable: these are **not equal-cost results**. No fresh external evaluator scores were obtained here.

The supplied list is preserved verbatim in card membership in [the input export](ulalek-reported-108.txt). It resolves to exactly €108.02 in the uploaded 32,197-record eligible-printing Scryfall catalog, SHA256 `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`. Price mode: Scryfall EUR estimates, owned basics, shipping excluded. These are not verified Cardmarket English NM offers. The user's preference for that pricing mode remains supported through imported actual offers; no marketplace quotes were fabricated.

## What was reproduced

The actual supplied deck can be repriced and passed into investment with empty research, matching the user's recollection. Its **original automatic-generation route was not reproduced exactly**. With the same catalog, merged PR #1 automatically produces €109.65 with empty research (`local:engine`), and €171.21 with the uploaded cached research (`source:archidekt:14494014`). Cached and empty research are different experiments. The supplied caches contain public community decks and recorded combos, despite the original run possibly having empty research.

Replaying investment on the supplied list under PR #1 produces:

| Path | Final estimate | Unused | Legacy scalar |
| --- | ---: | ---: | ---: |
| quality | €134.07 | €56.93 | 184.22 |
| balanced | €107.63 | €83.37 | 181.22 |
| value | €107.63 | €83.37 | 181.22 |
| unchanged | €108.02 | €82.98 | 174.12 |

The original replay and a copy with observational diagnostics produced identical final export and price. The instrumentation did not add atomic search or change source selection. This demonstrates why the optimizer can leave substantial budget: useful cards fail an individual merit threshold, never enter the 850-card shortlist, or lose the three-feasible-alternative race. Arcane Signet was rejected 431 times by individual merit and twice by role floors across the three paths. Thran Dynamo, The One Ring, Kindred Discovery and Mystic Forge were outside the old shortlist in this replay. Those exclusions are not evidence those cards lack value.

## Interpretation and remaining risk

The new search fixes atomic investment, canonical-record frontier crowding, invalid-cut allocation and complete-candidate comparison. Controlled tests demonstrate engine/support threshold crossing, multi-card affordable upgrades, hard-budget rejection, exact-printing reconciliation, combo preservation and a €108 fixture losing to a functionally dominant €182.80 fixture despite the latter's deliberately lower legacy score. Fixture prices are synthetic; this is not an external rating.

The supported-function vector is conservative static evidence, not a calibrated power model. There is no price bonus, but caps, parsing, search frontiers and tie-breaking still influence results. Opponent-dependent draw, conditional support, extra costs, life/upkeep risk, land deployment and retaining two usable {C} after an Eldrazi are not fully modeled. A card marked outside the frontier was not disproved. Known bracket gates do not certify current official bracket compliance. Additional real-world deck testing is required.

Results below are fixed-cache experiments, not improved-gameplay claims. The original Windows launcher and original instruction/handoff files remain unchanged. Linux HTTP/static-page checks do not substitute for running the Windows batch launcher or interacting with a browser on Windows.

## Supplied-list investment replay: final implementation

- Before: **€108.02**, unused **€82.98** (56.55% of cap used).
- After: **€157.71**, unused **€33.29** (82.57% used), exactly 100 cards; export pricing agrees with selected records and has no anomalies.
- Selected origin: unchanged input; the three original individual-swap paths remain recorded but their complete function tradeoffs do not beat the protected result.
- Accepted: **Spell Satchel → Mana Vault**, +€49.69. The former needs spell counters to work; the latter supplies three upfront true-colorless mana but has an untap cost and upkeep risk. It is recorded as burst capacity, **not sustained ramp**. It does not solve card advantage.
- Sustained nonland mana capacity remains 15, raw nonland true-colorless output remains 15, and recognized true-colorless land sources remain 23. These are static capacity counts, not the probability of casting and activating Ulalek on a particular turn. Other protected function counts remain unchanged.

The replay **does not demonstrate that the remaining €33.29 lacks useful investments**. It finds no further accepted improvement under this bounded search. The draw weakness remains: recognized flow is 2 and independent draw 1. Do not buy this list solely on the basis of the new internal evidence.

| Watched upgrade | Eligible estimate | Outcome in supplied-list replay |
| --- | ---: | --- |
| Arcane Signet | €0.38 | Present in incoming frontier; proposed cuts fail true-colorless/mana-demand or ramp-count gates before full evaluation. No eligible outgoing choice survives this bounded scheduling. |
| Thran Dynamo | €2.11 | 80 complete proposals evaluated; 29 accepted intermediate states, absent from final winner. Other combinations fail ramp count, mana or full-function dominance. |
| Worn Powerstone | €0.23 | Outside limited output frontier; not established inferior. |
| The One Ring | €98.06 | 17 complete proposals evaluated; combined packages fail budget, mana, support or full-function dominance. Standalone price plus original deck exceeds cap without funding cuts. |
| Rhystic Study | €36.73 | Opponent-payment dependency not modeled as reliable engine; outside frontier. |
| Kindred Discovery | €5.51 | Enter-or-attack trigger is missed by conservative trigger parsing; outside frontier. Known remaining recognition defect. |
| Guardian Project | €12.61 | Supported engine recognized in isolation, but outside six-card draw frontier in this run. Search limitation. |
| Mystic Forge | €1.90 | Supported top-library access recognized, but outside bounded draw/support frontier. Search limitation. |
| Up the Beanstalk | €2.47 | Combined enter/cast trigger support is not recognized correctly; outside frontier. Known remaining recognition defect. |
| Ulamog, the Infinite Gyre | €26.44 | 19 complete proposals evaluated, two accepted intermediate states; none selected. Other combinations fail mana, ramp count, high-curve support or dependency gates. |

Counts are proposal events across paths/rounds, not distinct cards or mutually exclusive reasons. “Accepted intermediate” does not mean selected in the exported deck. Full traces, exact printing ledger and before/after exports: [replay JSON](coherent-investment/reported-replay.json), [before](coherent-investment/ulalek-before.txt), [after](coherent-investment/ulalek-after.txt), [original PR #1 paths](coherent-investment/pr1-reported-paths.json).

## Empty-research automatic construction

PR #1: €109.65 (`local:engine`); current: €113.07 (`local:engine`), unused €77.93. The old 51.95 resilience candidate still exists but does not win. Both catalogs and empty research inputs match; the new complete selection differs substantially, not just by a final swap. Current candidate prices/scores: engine 113.07/165.60, tempo 104.81/148.37, resilience 51.95/150.42, threats 110.41/153.54, complete reference 119.07/99.45. Scores are historical internal heuristics, not gameplay ratings.

Compared with PR #1's final export, 11 spells change. Cuts include Kozilek's Command, Zhulodok, Conduit of Ruin and several Spawn engines; additions include Archivist, Mana Vault, Basalt Monolith, Millikin, Hedron Crawler, Thought Vessel, two Talismans and other acceleration. This output **still shows an excessive preference for small acceleration and sacrifices significant native engines**. Protecting each seed's existing full capacity can discard a useful old investment path; this conservative tradeoff remains a construction weakness. The current result should not be represented as stronger than PR #1. The atomic additions within its selected seed remove Spell Satchel, Tablet of Compleation and Heartwood Crafter for Mana Vault, Basalt Monolith and Archivist respectively. No external playability improvement was measured.

Full before/after lists and all candidate paths: [old empty-research run](coherent-investment/pr1-empty.json), [current empty-research run](coherent-investment/current-empty.json), [old export](coherent-investment/ulalek-pr1-empty.txt), [current export](coherent-investment/ulalek-current-empty.txt).

## Automated and environment verification

- Baseline full suite: **156 passed, 0 failed**.
- Final focused `node --test tests/package-investment.test.mjs`: **12 passed, 0 failed**.
- Final `npm test`: **168 passed, 0 failed**, 186.753 seconds; no skipped/cancelled tests.
- `node --check` for the new module and browser JavaScript, and `git diff --check`: pass.
- Server startup and HTTP checks on the final code: status returns 32,197 cards; HTML and browser script load; POST generation for Yuriko B4 returns HTTP 200, exactly 100 cards, €114.53, exact-selected-card price agreement, budget pass and no anomalies. [Smoke audit](coherent-investment/http-smoke.json).
- An initial smoke request used an invalid pricing enum (`scryfall`); the API rejected it as expected. Retried with existing `scryfall_eur` successfully. This was a test-command mistake, not an application change.
- Intermediate test failures (undefined pool passed to atomic expansion; ramp overprovision) were fixed before the final successful run. An experimental core-role-first comparison selected an undesirable cheap deck; that comparison rule was removed and a regression added. Only complete functional dominance can override the existing scalar now.
- No live external evaluator runs, fresh online research benchmarks, real Cardmarket offer quotes, interactive browser check or Windows execution were performed. Windows batch source is unchanged. Read-only benchmark tools leave original uploaded caches intact; the catalog hash is unchanged. Local server cache initialization uses a disposable working copy.

## Fixed cached-research automatic construction

Same catalog, 29 cached public community decks and the same recorded combo library, with no online fetches:

| Run | Winning source | Estimate | Unused |
| --- | --- | ---: | ---: |
| PR #1 | `source:archidekt:14494014` | €171.21 | €19.79 |
| Current | `source:archidekt:14494014` | €131.88 | €59.12 |

The current list has 100 cards and passes exact selected-record price reconciliation with no anomalies. **It is cheaper; improved gameplay is not established.** Complete current candidates include source 23460147 at €170.59 (legacy score 187.78), source 14494014 at €131.88 (183.69), source 16437369 at €177.71 (170.13), local engine €163.51 (173.54), tempo €145.34 (137.63), resilience €185.11 (172.42), threats €152.92 (159.54), and complete reference €162.57 (101.05). Full-function dominance, rather than price or the scalar alone, chooses the second source. This is evidence about the implemented objective, **not proof the cheaper deck is stronger**; capped static functions may still hide valuable engines.

The selected candidate's atomic change is Spell Satchel → Insight Engine, +€2.10, adding repeatable scalable card access under the parser. Relative to PR #1's final export, eleven spells differ. Cuts: Idol of False Gods, Blisterpod, Zhulodok, Spell Satchel, Nest Invader, Propagator Drone, Nightshade Dryad, Basking Broodscale, Conduit of Ruin, Desolation Twin and Emrakul's Messenger. Adds: Herald of Kozilek, Eldrazi Displacer, Bismuth Mindrender, World Breaker, Titans' Vanguard, Snapping Voidcraw, **Arcane Signet**, Talisman of Curiosity, Insight Engine, Talisman of Creativity and Sowing Mycospawn. This exchanges Spawn/cascade/tutor support for cost reduction, fixing, different Eldrazi threats and card access. The lost cascade/tutor engines are a material tradeoff that still needs playtesting.

Every original investment path for every candidate, watched-card reasons and atomic outcomes are in [current cached diagnostics](coherent-investment/current-cached.json); original results: [PR #1 cached](coherent-investment/pr1-cached.json). Complete exports: [before](coherent-investment/ulalek-pr1-cached.txt), [after](coherent-investment/ulalek-current-cached.txt).

The budget-utilization/gameplay regression is **not demonstrated resolved**. This PR provides bounded package search, concrete diagnostics and regression coverage, but the real-list draw omissions, surplus-ramp seed choices and final candidate objective need further validation. It should remain a draft pending that review and fresh permitted external evaluation.

## Additional fixed-cache commander checks

All four B3 outputs reconcile to exactly 100 cards, agree with exact selected-record pricing, remain below €191 and have zero pricing anomalies. No external gameplay scoring was performed. Full diagnostics and per-commander exports are in [current cached results](coherent-investment/current-cached.json).

| Commander | Estimate | Unused | Candidate | Runtime (parallel workload) |
| --- | ---: | ---: | --- | ---: |
| Ulalek, Fused Atrocity | €131.88 | €59.12 | `source:archidekt:14494014` | 213.585s |
| Yuriko, the Tiger's Shadow | €113.61 | €77.39 | `local:engine` | 45.558s |
| Wilhelt, the Rotcleaver | €171.33 | €19.67 | `local:resilience` | 42.336s |
| Zada, Hedron Grinder | €166.39 | €24.61 | `local:tempo` | 38.698s |

B4 coverage includes the final Yuriko HTTP smoke and existing B3/B4 regression cases. Real Ulalek B4 external scoring was not repeated. Full catalog generation takes tens of seconds to several minutes; timings above include concurrent validation workloads, so are not controlled performance measurements.
