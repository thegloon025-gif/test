# Stage 2 — Stateful access and strategy-aware deployment

Validated development on `codex/v1.2-gameplay-intelligence`, draft PR #4, 2026-10-22. Core: `9cab3d3`; resource-budget audit: `380f01d`; anti-starvation pilot guard: `6bef0bc`; exact follow-up land planning: `98c522c`. No-base-cost safety: `203703a`. Version remains **1.1.5**. No merge, release, construction change or final candidate-selection change.

## Fixed inputs and what this comparison means

The five **existing decks** are evaluated; no new deck construction is run. Their selected records, eligible-printing prices, 100-card legality/singleton audits, research/catalog conditions and historical external observations remain unchanged. This evaluates a more capable model and different pilots, not newly stronger decks.

| Frozen deck | Exact Scryfall EUR / unused | Complete unchanged export |
| --- | --- | --- |
| Ulalek High B3 | €174.24 / €16.76 | [100 cards](stage1/ulalek-b3-generated.txt) |
| Ulalek B4 Optimized | €173.88 / €17.12 | [100 cards](stage1/ulalek-b4-generated.txt) |
| Yuriko High B3 | €126.04 / €64.96 | [100 cards](stage1/yuriko-b3-generated.txt) |
| Wilhelt High B3 | €102.06 / €88.94 | [100 cards](stage1/wilhelt-b3-generated.txt) |
| Zada High B3 | €158.68 / €32.32 | [100 cards](stage1/zada-b3-generated.txt) |

Pricing uses the same exact archived records, including Wilhelt's €10.77 reversible Grimgrin, not the €1.33 normal record behind its export alias. These are eligible Scryfall EUR estimates, owned basics, not verified English NM offers. The original 32,197-record catalog, community and Spellbook caches are read-only. Gameplay uses the already selected cards; research is not rerun or changed.

The [external-score baseline](external-baseline-2026-10-22.json) is byte-preserved: user-observed B3 EDHCheck **5.7** / EDHPowerLevel **5.33**, B4 **5.6 / 5.48**, with the earlier €108.02 regression separate. No external evaluator was queried and no new external power, win rate, bracket ruling or reliable combo turn is claimed.

## Implemented behavior

- Supported draws and selections move actual cards through hand/library/graveyard/exile. Cast/entry and activated access checks the actual source, type/MV, singleton name conditions, known power, payment, tap/sickness, life and activation limits. Top casting consumes the actual permitted top card and pays its cost. Source control transfers remove its future activations. A newly drawn land can use an unspent land drop.
- Three deterministic pilots prioritize commander, mana/access setup or native strategy respectively. They share an explicit guard allowing at most one setup action before taking the next already-payable commander cast. Land planning tests exact commander or recognized typed follow-up plus trigger payments, without hardcoded Ulalek scoring. The opt-in free mulligan uses only the initial seven's two-to-five land window and keeps the second seven.
- Optimized exact payment search removes equivalent free-activation/pip orders and prunes with a safe optimistic matching relaxation. Fees, restrictions, distinct units, sickness and separate Ulalek `{C}{C}` are preserved. A bound remains unknown.
- Independent resource and zone/effect audits verify costs, source expenditure, card movements, actual top permissions, trigger prerequisites, resolved token quantities and effect budgets. No token or draw is credited in advance of the supported resolution that produced it.

See [the exact grammar, pilot rules, measurement definitions and Windows commands](../../docs/GAMEPLAY_STAGE2.md). No draw-engine tag is substituted for a resolved draw.

## Experiment design and uncertainty

Each deck uses the **same 32 common seeds** as Stage 1. Nine configurations: original Stage 1; Stage 1 with optimized payment search; native pilot with access disabled as an explicit ablation; three Stage 2 pilots without mulligans; and those three with the one-free mulligan. Every run is reproduced identically and independently audited: **1,440 modeled runs plus 1,440 deterministic replays**. Stage 1's 160 original trace hashes must match exactly. Fixed bound-hit inputs are replayed separately from new complete runs.

All experiments cover turns 1–8, natural turn-one draw, one main phase and normal land limits. Main policy comparisons use no mulligans; mulligan comparisons are separate. The access-disabled ablation intentionally omits effects, while keeping the same pilot priorities, to isolate new state movement. Its zero credited draws and Stage 1's zero credited draws mean **unmodeled**, not that the physical deck cannot draw.

Nominal Wilson 95% intervals describe the sampled model's commander events. Common-seed paired bootstrap intervals use 2,000 deterministic resamples. They cover sampling uncertainty only under this model/pilot, not incomplete Oracle coverage, human decisions or opposing play. Comparisons are exploratory without multiple-comparison correction. No profile is promoted as the strongest overall deck strategy from these measurements.

All-tie samples can yield a degenerate paired bootstrap interval (for example, Yuriko's commander-by-T5 policy comparison). This is not proof of population equivalence or that a different seed could never differ; the full turn traces can show timing differences within that cutoff.

### Commander timing, actual card flow and policy tradeoffs

| Frozen deck / pilot (no mulligan) | Commander by T5 (of 32), Wilson 95% | Resolved effect draws / paid top casts (all 32) | Mean T8 hand | Mean T8 net accessible cards, bootstrap 95% |
| --- | --- | --- | ---: | --- |
| ulalek-b3 / commander-first | 26/32 [64.7–91.1%] | 17 / 1 | 3.78 | 0.38 [0.12, 0.66] |
| ulalek-b3 / development | 23/32 [54.6–84.4%] | 17 / 1 | 3.66 | 0.38 [0.12, 0.66] |
| ulalek-b3 / native | 25/32 [61.2–89.0%] | 15 / 2 | 3.66 | 0.31 [0.12, 0.53] |
| ulalek-b4 / commander-first | 29/32 [75.8–96.8%] | 14 / 13 | 3.25 | 0.75 [0.31, 1.25] |
| ulalek-b4 / development | 26/32 [64.7–91.1%] | 17 / 5 | 3.28 | 0.59 [0.28, 0.97] |
| ulalek-b4 / native | 29/32 [75.8–96.8%] | 12 / 12 | 3.19 | 0.66 [0.28, 1.09] |
| yuriko-b3 / commander-first | 29/32 [75.8–96.8%] | 84 / 0 | 1.84 | 1.03 [0.47, 1.66] |
| yuriko-b3 / development | 29/32 [75.8–96.8%] | 93 / 0 | 1.91 | 1.12 [0.53, 1.84] |
| yuriko-b3 / native | 29/32 [75.8–96.8%] | 86 / 0 | 1.81 | 1.09 [0.50, 1.72] |
| wilhelt-b3 / commander-first | 22/32 [51.4–82.0%] | 17 / 0 | 3.12 | -0.12 [-0.66, 0.34] |
| wilhelt-b3 / development | 21/32 [48.3–79.6%] | 19 / 0 | 3.12 | -0.06 [-0.59, 0.44] |
| wilhelt-b3 / native | 22/32 [51.4–82.0%] | 17 / 0 | 3.12 | -0.12 [-0.66, 0.34] |
| zada-b3 / commander-first | 31/32 [84.3–99.4%] | 8 / 16 | 1.50 | 0.66 [0.28, 1.16] |
| zada-b3 / development | 29/32 [75.8–96.8%] | 7 / 16 | 1.50 | 0.62 [0.25, 1.06] |
| zada-b3 / native | 31/32 [84.3–99.4%] | 8 / 16 | 1.50 | 0.66 [0.28, 1.16] |

Stage 1 commander-by-T5 counts (same seeds): ulalek-b3 25/32, ulalek-b4 26/32, yuriko-b3 28/32, wilhelt-b3 20/32, zada-b3 29/32. The optimized-search-only replay has the same commander counts; its eliminated unknowns mostly affect other plays.

Stage 1 also lacks Stage 2 cleanup/access behavior; its hand or card-flow values are not full-game ground truth. The same-pilot access-disabled Stage 2 ablation is the cleaner comparison for new card movements. Full Stage 1-versus-Stage 2 deltas mix corrected rules coverage, land planning and pilot behavior.

`Net accessible cards` means hand plus our nontoken/noncommander permanents, minus opening seven and natural draws. It includes one-shot spells, sacrifice, discard, cleanup and control transfers. Lands do not fabricate advantage by moving from hand to battlefield, tokens are not extra cards, and casting a commander is not an extra drawn card. Gross draw totals alone cannot establish improved card advantage. Card-flow intervals are bootstrap intervals across these model seeds.

| Native pilot | No mulligan: commander T5 / T8 | One-free: commander T5 / T8 | Mulliganed seeds | Effect draws / top casts, without → with mulligan |
| --- | --- | --- | ---: | --- |
| ulalek-b3 | 25 / 29 | 26 / 30 | 6 | 15 / 2 → 16 / 6 |
| ulalek-b4 | 29 / 32 | 29 / 32 | 6 | 12 / 12 → 11 / 13 |
| yuriko-b3 | 29 / 30 | 28 / 30 | 6 | 86 / 0 → 89 / 0 |
| wilhelt-b3 | 22 / 27 | 22 / 27 | 6 | 17 / 0 → 18 / 0 |
| zada-b3 | 31 / 31 | 32 / 32 | 6 | 8 / 16 → 7 / 15 |

The free mulligan is conservative and bounded; it does not solve colored keeps or offer unlimited retries. The same initial decision and seeded redraw are used across pilots. It can help or hurt a particular seeded line; no universal mulligan advantage is assumed.

### Turn-by-turn observations and unknown coverage

[comparison.json](stage2/comparison.json) contains configuration summaries, per-turn intervals and paired comparisons. Full per-seed turn vectors are stored separately: [Ulalek B3](stage2/ulalek-b3-runs.json), [Ulalek B4](stage2/ulalek-b4-runs.json), [Yuriko](stage2/yuriko-b3-runs.json), [Wilhelt](stage2/wilhelt-b3-runs.json), [Zada](stage2/zada-b3-runs.json). These vectors include hand size, credited draws/discards, net card flow, independent colored/true-colorless affordability, native channels, large native bodies and missed-play reasons. Complete sample traces retain every individual card/source payment and zone movement.

Independent mana capacities use the commander-spell context; they are **not simultaneous/additive**, saturate at 16, and stay null if unknown. Trigger `{C}{C}` is a separate ability-cost query, not a claim that a trigger exists or that its copying effect executed. Engine readiness is an end-of-main-phase snapshot; an engine used earlier may be tapped or out of mana now. Native copy/cascade channels may be deployed but their effects remain unknown. End-turn blocked plays after resources were spent are not automatically deck-construction defects; decision traces and pre-action mana distinguish policy choices from resource deficits.

| Frozen deck | Unique records with supported access | Records with identified unsupported access | Identified unsupported access clauses |
| --- | ---: | ---: | ---: |
| ulalek-b3 | 11 | 10 | 10 |
| ulalek-b4 | 9 | 11 | 11 |
| yuriko-b3 | 14 | 13 | 14 |
| wilhelt-b3 | 6 | 12 | 12 |
| zada-b3 | 5 | 12 | 12 |

Coverage counts identify known unsupported **access clauses** and native channels; they are not a percentage of all rules understood. The large-native-body observation uses the declared printed-power/MV proxy, with cast payment checked. Other threats, combat pumps, combo outlets and actual win conversion remain unknown. In particular, Yuriko ninjutsu/combat access, Wilhelt death/end-step sacrifice access and Zada target-copy/cantrip chains are not simulated. Their missing outcomes must not become zero-strength scores in candidate selection.

## Payment-search investigation

[Fixed-input payment cases and exact receipts](stage2/payment-search.json):

| Search on the same 28 inputs | Paid | Proven blocked within supported source model | Unknown |
| --- | ---: | ---: | ---: |
| Original 4,000-node limit | 0 | 0 | 28 |
| Optimized, same 4,000-node limit | 6 | 22 | 0 |
| Legacy extended to 100,000 nodes (cross-check) | 6 | 22 | 0 |

Optimized states: median 1, maximum 48. Extended legacy: median 16493, maximum 56769. Every definitive status agrees. These are exact original state/payment replays, not fresh whole-game outcome counts.

Across the complete runs, the original search records 7 bound attempts in 5 Ulalek B3 seeds and 21 in 9 B4 seeds. Optimized Stage 1 and every Stage 2 configuration record **zero** payment-bound or action-bound hits in this cohort. This is an observed sample result, not a proof that arbitrary decks can never hit the cap. “Blocked” applies to the supported source model; an unmodeled mana ability can still make the physical game different.

The pruning graph intentionally ignores fees and relaxes source mode/color consistency, so it overestimates future mana. Failure of that graph can prove a branch impossible; success cannot pay anything. Only real activation/payment receipts can produce a paid result. Canonical ordering is applied only to independent zero-fee activations between payments/paid activations; fee funding and restrictions remain explicit. Controlled small-source legacy cross-checks and actual whole-trace resource audits guard against false pruning or invented payments.

## Concrete changed turns

[Readable before/after turn traces](stage2/turn-traces.md) and [example selection/details](stage2/examples.json) show the **first** common seed with an access or commander-timing difference for each deck. They are illustrative, not estimates of typical outcomes or earliest/reliable combo turns. Access examples compare the same native pilot with/without stateful access; pilot examples compare commander-first and development with the same access model.

| Deck / change | Seed index | Commander turn before → after | Effect draws before → after | Paid top casts before → after |
| --- | ---: | --- | --- | --- |
| ulalek-b3 / access | 4 | 2 → 2 | 0 → 2 | 0 → 0 |
| ulalek-b3 / pilot | 9 | 5 → 6 | 0 → 0 | 0 → 0 |
| ulalek-b4 / access | 0 | 5 → 5 | 0 → 3 | 0 → 0 |
| ulalek-b4 / pilot | 2 | 4 → 5 | 1 → 1 | 0 → 0 |
| yuriko-b3 / access | 0 | 3 → 3 | 0 → 1 | 0 → 0 |
| yuriko-b3 / pilot | 5 | 3 → 4 | 4 → 4 | 0 → 0 |
| wilhelt-b3 / access | 1 | 3 → 3 | 0 → 4 | 0 → 0 |
| wilhelt-b3 / pilot | 2 | 6 → 7 | 0 → 0 | 0 → 0 |
| zada-b3 / access | 0 | 4 → 4 | 0 → 1 | 0 → 1 |
| zada-b3 / pilot | 0 | 4 → 5 | 1 → 1 | 1 → 1 |

Each example links complete before/after JSON. Effects occur in order, including natural draws, payment, cast triggers, spell/permanent resolution, new cards, later plays and cleanup. Unsupported actions cannot use an imagined top card or free resources. The trace tool can reproduce another seed/policy against exact frozen records.

## Verification and performance

Node v24.19.0, Linux. [Exact test outcomes and preservation checks](stage2/test-results.json):

| Check | Passed / total | Failed / cancelled / skipped | Runtime |
| --- | ---: | --- | ---: |
| Stage 1 baseline suite | 213/213 | 0 / 0 / 0 | 121.120 s |
| Focused access + Stage 1 deployment suite | 39/39 | 0 / 0 / 0 | 0.279 s |
| Final complete suite | 234/234 | 0 / 0 / 0 | 126.056 s |

There are **21 new regression cases**, with the original 213 preserved. The final suite runs on the committed implementation including the no-base-cost guard. All 1,440 base runs pass resource audits; all 1,120 Stage 2 runs also pass zone/effect audits. Another 1,440 evaluations reproduce the runs identically. All 160 original Stage 1 trace hashes match exactly.

The regressions cover actual draw-to-hand and same-turn use; draw/discard/top order; creature sickness and source-tap contention; activated/triggered restrictions; conditional power/hand and once-per-turn gates; control transfer; real Guardian/Kindred/Beanstalk triggers; paid actual-top casting; scry/surveil card conservation; no invented counter/combat/modal/granted access; policy tradeoffs and anti-starvation; deterministic free mulligans; exact follow-up/trigger land planning; same-turn drawn lands; empty-library loss; forged effects/tokens; and optimized/exhaustive payment agreement. All Stage 1 tests remain.

Intermediate review found and fixed a pilot starvation loop, late-drawn land omission and insufficient independent token-budget checks. An early fixture incorrectly asserted a particular discard preference rather than legal movement/accounting; it now tests the latter. The completed required checks, not intermediate iterations, are reported here. No unresolved test failures are silently counted as passes.

| Deck | Original Stage 1: 32 runs + replay/audit | Optimized Stage 1 | Stage 2 configurations: min–max per 32 runs + replay/audit |
| --- | ---: | ---: | ---: |
| ulalek-b3 | 0.639 s | 0.311 s | 1.116–1.546 s |
| ulalek-b4 | 0.755 s | 0.320 s | 1.431–1.728 s |
| yuriko-b3 | 0.238 s | 0.197 s | 0.924–1.209 s |
| wilhelt-b3 | 0.262 s | 0.192 s | 0.844–1.074 s |
| zada-b3 | 0.247 s | 0.220 s | 1.025–1.571 s |

Measured evaluation/replay/audit loops total **46.472 seconds** across 45 configurations. This excludes subsequent bootstrap aggregation, final artifact serialization and the separate fixed-state legacy cross-check; sample-trace writing inside loops is included. Shared CPU load from tests affects these timings. No hardware-independent speedup or gameplay-strength claim follows from the measurements.

[Server/UI smoke](stage2/http-smoke.json) starts an isolated copy, loads 32,197 records, verifies version 1.1.5 and UI assets, and resolves cached commander lookup without network research. Existing startup cache repair touches only that disposable copy. The Windows launcher is byte-preserved; actual BAT execution remains untested on Linux. Production generator/fallback/research APIs are unchanged. Reproduction commands are in [GAMEPLAY_STAGE2.md](../../docs/GAMEPLAY_STAGE2.md); no catalog refresh or paid dependency is required.

## Remaining limits and Stage 3 proposal

This is still a partial rules model. Ignoring unsupported mandatory effects can change later game outcomes; supported subsets are not mathematical lower bounds on full-game performance. No opponents' actions, complete stack search, copied effects/cascade, alternate faces/craft, variable/snow/Phyrexian costs, arbitrary tutors, counters/energy, attack/death/target-copy engines or executable-combo outlets are solved. Unknown power modifiers do not satisfy conditional draw prerequisites. A one-action commander setup budget and deterministic selections are defensible pilot rules, not expert play. Source restrictions outside the grammar remain unknown. Model horizon, observation caps and search/action bounds remain explicit.

Stage 3 should be a **shadow evaluation of complete candidates and coordinated upgrades**, before any production selection change:

1. Hand-review representative traces, especially engine timing, fees, copied/conditional effects and pilot disagreements. Extend the supported native channels needed by the compared strategies; never let an unmodeled strategy lose merely because another strategy has better model coverage.
2. Diagnose concrete pre-decision bottlenecks: a missing mana type, unusable ramp, unsupported access setup, a native engine with no payable follow-up, or resource-consuming pilot actions. Distinguish these from end-turn spent mana and pilot starvation. Use card-flow accounting, not gross draw counts.
3. Propose bounded two/three-card repair packages, including coordinated mana/support changes. Preserve source spines, committed combos, singleton/color/bracket legality, exact selected-record pricing and the hard budget. Spending earns no merit.
4. Compare the **complete modified decks** over common card-identity-based draws and multiple fixed pilots, with holdout seeds and unknown-coverage reports. A shared seed alone does not pair common cards when deck slot ordering changes; establish an appropriate common-random-input scheme before candidate comparisons. Retain distinct tutor/cascade/copying infrastructure instead of letting generic surplus dominate it.
5. Report additions, cuts, functional gains/losses and paired uncertainty. Do not maximize a favorable pilot per deck or immediately collapse measurements into a replacement scalar. Enable a conservative selection hook only after these shadow comparisons and hand-reviewed lines support it; keep fallback when evidence is unknown/incomparable.

Actual EDHCheck/EDHPowerLevel validation remains external human evidence before claiming improved gameplay power. Reliable combo/pod policy additionally needs complete execution/outlet modeling and an agreed reliability definition; inventory, a favorable trace or a Wilson interval on commander deployment cannot substitute for that. PR #2 and PR #4 remain draft and unmerged.
