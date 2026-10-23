# Stage 8 — Meaningful strategy coverage and recovery

Stage 8 establishes useful **supported opportunities and reusable death/recovery execution**, but does not establish a superior complete deck or justify a production trial. **339/339 tests pass; 2,976 registered complete-deck runs passed independent receipt audits and deterministic replays.** Natural tutor resolutions now occur; all sampled target policies still choose the same targets. Wilhelt demonstrates actual last-known death value and later paid commander/end-step recovery beyond Ulalek.

Version remains **1.1.5**. PR #4 stays draft, stacked on draft PR #2; neither is merged or released. Production construction, candidate selection, API, caches, historical evaluator observations, fallback and Windows launcher remain unchanged. Pod High-Power is inactive. No new external evaluation or improved real-game power is claimed.

## Review and reproduction

Review implementation commits `8b7ffbd` and `38ae0e8` separately from generated evidence. The small lossless storage helpers are also separate from the evidence commit. Read [supported semantics and Windows commands](../../docs/GAMEPLAY_STAGE8.md), [registered protocol and correctness amendments](stage8/PROTOCOL.md), [frozen records/source/cache hashes](stage8/inputs.json), [independent audit](stage8/independent-audit.json) and [test results](stage8/tests.json).

[Training](stage8/training.json) and [holdout](stage8/holdout.json) retain lossless hash-checked report indexes; [training vectors](stage8/training-vectors.json.gz), [holdout vectors](stage8/holdout-vectors.json.gz), [all opportunity/recovery panels](stage8/opportunity-panels.md), [actual tutor inventories/choices](stage8/tutor-opportunities.md), [complete challenger tradeoffs](stage8/candidate-tradeoffs.md) and [compact analysis](stage8/analysis.json.gz) retain every fixed pilot. [Controlled receipts](stage8/fixtures/index.json) are explicitly scripted. The extra [natural recovery illustration](stage8/natural-recovery-example.md) is post-hoc descriptive, not a new statistical sample.

## What changed and why

- `gameplayState` has an explicit Stage 8 option that waits for actual target deployment at an empty stack, rather than removing an absent engine at T5. Wipes/artifact-loss experiments require the actual commander first. Each intervention fires once; missing state is not reached, unknown rules abstain.
- `gameplayOpportunity` verifies the entire actual pre-intervention trace prefix matches its same-deck control. Unconditional opportunity exposure and the conditional two-own-turn response retain different denominators and explicit terminal/unknown/T8 censoring.
- `gameplayDeath` narrowly recognizes Wilhelt, Sifter of Skulls, Pawn of Ulamog, Grim Haruspex, Headless Rider and Undead Augur grammar. Simultaneous death uses last-known identities, token/type/decayed information and multiplier sources. All victims move before commander/token state-based actions and death-trigger stack placement. Supported sacrifices, end steps, draws, life costs and resources actually resolve.
- Native/resource audits independently reconstruct simultaneous moves, costs, LKI triggers, stack order, actual tokens, draws and life. Multiple Spawn deaths remain distinct within one payment. Copied-legend deaths dispatch immediately; token mana cannot pay a second sacrifice cost.
- Actual tutors record their complete legal target inventories. State-aware projections now handle already-consumed mana sources without crashing. Legacy/default selection is unchanged.
- Explicit card colors take precedence over absent mana costs; a black Zombie token cannot produce a false colorless-entry Fleshraker damage event. Unsupported extra clauses cannot be swallowed by the supported end-step grammar.

No new deck score, spending merit, combo-count merit, tuner, production hook or forced tutor/hand was introduced. Retained challengers are complete frozen lists, not isolated card substitutions. No new package was justified: supported diagnostics do not warrant replacing infrastructure merely because its remaining rules are unmodeled.

## Inputs and experiment

Original uploaded **32,197-card** catalog, **29 community sources** and Spellbook caches; catalog SHA256 `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`. No refresh, scraping or mutation. Prices are the same exact eligible selected-record **Scryfall EUR estimates**, not verified Cardmarket EN NM offers.

Fresh namespace `gameplay-opportunity-stage8-v1-2026-10-23`, disjoint training indices 0–7 and holdout 0–23, each of all three fixed pilots. Same complete records and common-card identity ordering; conservative optional payments, opening seven/no mulligan, T1 draw, T8 horizon, three inert 40-life seats. Common numeric seeds alone are not the coupling method. Different-list membership can still change absolute hands and downstream event/shuffle labels.

Five primary decks (four Ulalek lists + Wilhelt) run intact control and separate commander exile, deployed-engine exile, creature destruction and nonland Artifact exile. The last explicitly tests artifact acceleration loss and can also remove other artifacts; it is not a claim to cover every nonland mana source. Engines are Mystic Forge and Undead Augur. Yuriko/Zada have control regressions and retain native abstention. Both tutor policies run all Ulalek controls; disrupted runs use the same fixed state-aware policy.

**Correctness disclosure:** preflight found consumed-source tutor projections, multi-sacrifice audit queues and copied-legend death timing errors; an initial partial holdout exposed the latter. Final review tightened exact-clause and checkpoint guards and colored-token handling. Final outputs recompute the unchanged registered sample/criteria after those fixes. They are a **same-sample correctness reanalysis, not an untouched blind holdout**. Superseded preflight results are not counted as extra evidence. The natural positive illustration is explicitly post-hoc; it does not choose a winning policy or alter any cohort denominator.

## Complete exports and hard budgets

Every export below has commander + 99 lines, singleton/color legality, original source spines/commitments, bracket policy and exact eligible-printing reconciliation. The independent audit checks **700 selected-printing slots across seven decks**; source-backed original floors and all recorded combos remain. These are frozen-list comparisons; the separate API smoke is fresh generation.

| Complete deck / export | Exact EUR estimate | Unused from €191 |
|---|---:|---:|
| [ulalek-b3-original](stage8/ulalek-b3-original.txt) | €174.24 | €16.76 |
| [ulalek-b3-challenger-1](stage8/ulalek-b3-challenger-1.txt) | €187.59 | €3.41 |
| [ulalek-b4-original](stage8/ulalek-b4-original.txt) | €173.88 | €17.12 |
| [ulalek-b4-challenger-2](stage8/ulalek-b4-challenger-2.txt) | €175.39 | €15.61 |
| [wilhelt-b3-original](stage8/wilhelt-b3-original.txt) | €102.06 | €88.94 |
| [yuriko-b3-original](stage8/yuriko-b3-original.txt) | €126.04 | €64.96 |
| [zada-b3-original](stage8/zada-b3-original.txt) | €158.68 | €32.32 |

B3 C1 adds **Kindred Discovery, Talisman of Conviction, City of Brass**; cuts **Gideon Blackblade, Hedron Crawler, one Forest** (+€13.35). This exchanges loyalty/combat protection and a mana creature/basic for tribal access, a rock and fixing. Heavy colored setup, life and unmodeled protection/combat remain tradeoffs; a draw-engine label is not a guaranteed realized draw.

B4 C2 adds **Fierce Empath, Thran Dynamo, Benthic Anomaly**; cuts **Deranged Assistant, Gideon Blackblade, Shared Roots** (+€1.51). It exchanges a small mana creature, loyalty support and basic-land-search spell for a real creature tutor, higher-output artifact acceleration and a seven-MV native threat. Benthic's opponent-dependent copying value and removed protection are incompletely modeled. All lists stay below €191; higher price earns no advantage.

## Opportunities now occur, but tutor benefits remain unproved

Numbers below are **per fixed pilot**, each with 24 holdout seeds; the three pilots share seeds and are not independent games. Full Wilson opportunity intervals and all conditional +2-turn differences appear in the linked panels.

| Complete deck | Supported tutor runs per pilot | Specified engine deployed per pilot | Actually removed / unknown engine events | Observable +2-turn engine pairs |
|---|---:|---:|---:|---:|
| B3 original | 3/24 | 5/24 | 2 / 3 | 1, 2, 1 |
| B3 C1 | 3/24 | 6/24 | 4 / 2 | 1, 2, 1 |
| B4 original | 0/24 (no supported tutor in list) | 4/24 | 3 / 1 | 2, 2, 2 |
| B4 C2 | 1/24 | 4/24 | 3 / 1 | 3, 3, 3 |
| Wilhelt | 0/24 (no supported library tutor) | 3/24 | 2 / 1 | 2, 2, 2 |

Observable-pair triplets follow commander-first/development/native. A late or unknown opportunity is not silently dropped from opportunity frequency. Conditional follow-up samples are small: they cannot establish general engine resilience. Unlike Stage 7's all-absent T5 Forge result, these events actually wait for its deployment.

Every naturally resolved supported tutor has multiple legal inventory targets, but **state-aware and lowest-MV policies select identical targets in this sample**. All **24 deck × pilot × partition control tutor panels tie** on reported execution. This is evidence of actual exposure, not evidence of a better targeting policy. A legal target inventory does not prove multiple affordable strategic follow-ups.

The controlled Fierce Empath fixture deliberately supplies a deployed Zhulodok: legacy selects six-MV Conduit of Ruin; state-aware selects seven-MV Bane of Bala Ged, which is paid for on the following turn and produces real qualifying cascades/reveals/casts. Destinations, inventory, mana and horizon are audited. That correctly distinguishes the stipulated tactical choice; it is not a randomly occurring line or whole-deck advantage. Natural cohorts do not reproduce the same choice divergence.

## Death and recovery generalize to Wilhelt

In holdout creature-wipe runs, **6/24 seeds per pilot** produce supported Wilhelt/death-trigger events. There are 10, 11 and 10 death triggers respectively; those are events, not independent games. Actual end-step sacrifices occur in **3/24 commander-first, 2/24 development and 3/24 native runs**, with three sacrifice events for each pilot. Controls have zero death events/sacrifices: the intervention exposes a real state-dependent mechanism rather than assigning static engine credit.

The natural example uses native pilot/holdout seed 6 and the unchanged €102.06 Wilhelt list: T5 Wilhelt and Dreadmalkin die simultaneously; last-known Wilhelt creates a real decayed Zombie. T6 the commander actually pays `{2}{U}{B}{2}` from surviving mana, then sacrifices the Zombie at end step and really draws Brain Gorgers. This is supported-model execution with unmodeled text/responses still disclosed, not certified rules-complete play or reliable recovery timing. The descriptive example was selected after results for explanation only.

The 19 controlled receipts cover simultaneous Wilhelt/Haruspex deaths (two real draws plus a Zombie), Headless Rider/Augur self/other/nontoken filters and life loss, Pawn/Sifter Spawn/Scion creation, exile producing no deaths, token versus creature sacrifice, actual taxed recast/access recovery, insufficient/unknown rules, copied legends, black-token color, and independent rejection of invented costs/LKI/triggers/zones/token abilities. A token cannot both fund mana and another sacrifice.

Recovery outputs retain **mana restored, commander recast, native/access receipt, outlet execution and terminal outcome separately**. Mana restoration uses independent capped generic/C maxima, not simultaneous allocations or certified optimal mana. The legacy native/access summary marker does not itself count a created death token; actual death-trigger/token receipts are inspected separately above. Recasting is not full strategy recovery.

## Whole-deck evidence and tradeoffs

All fixed pilots and partitions remain in the complete tradeoff tables. Original/challenger disruption checkpoints can occur at different turns; cross-list disruption contrasts therefore combine deployment and recovery. Within-list prefix-matched comparisons isolate the stipulated intervention opportunity instead.

At T7, B3 C1 has mixed/lower supported output. Training development net-accessible-card change is **−1.000 [−2.500, −0.125]**. Holdout net-card intervals cross zero for all pilots (commander-first −0.208 [−0.542, 0.125]; development −0.042 [−0.500, 0.458]; native −0.125 [−0.500, 0.292]). A more expensive tribal engine is not enough to win this evidence comparison.

B4 C2 has a supported **payable-threat** signal: holdout development **+0.250 [0.042, 0.500]**, with positive points but zero-touching intervals for commander-first/native. Realized-draw changes are negative points with upper interval bounds at zero, and net-card intervals cross zero. Training commander presence is lower. These are meaningful tradeoffs, not a robust improvement across every fixed pilot/partition. Benthic's full native effects and lost protection remain unknown.

Two holdout conditional model-lethal runs are the same development/creature-wipe seed 4 under B4 original and C2, both T8. They do not distinguish those decks or prove an unavoidable win against real opponents. No score or spending rule breaks the tie. **Neither challenger is promoted; no additional package is proposed.** Human evaluator observations from Stage 7 remain separately frozen and are not rerun or tuned against here.

## Audit, runtime and limitations

The final independent persisted audit verifies 2,976 audited/replayed vectors, 28 paired tables, 120 conditional panels, 43 prospectively first-occurrence full traces, 19 controlled receipts and one explicitly post-hoc descriptive trace. Eight archived Stage 6 default full traces still match exactly. All old Stage 1–7 artifacts, human observations, uploaded caches, production entry points and launcher hashes are preserved.

Training: **744 runs, 86.954 s**; holdout: **2,232 runs, 175.995 s** (phase report runtimes; final preservation checks add a fraction of a second). Simulation/audit/replay profiles are retained; all actual runs are replayed once. Persisted reaudits take about seven seconds. Bounds are finite and no candidate × package search is added. Phase reports are losslessly compressed behind indexes; the complete checksum manifest verifies compact evidence. No original catalog is copied into Git.

Outcomes: training 708 completed-T8 / 36 unsupported-rule unknown; holdout 2,089 completed-T8 / 141 unknown / 2 conditional lethal. **No execution-search-bound or model-loss vector in this cohort.** Across 1,920 disruption cases, 1,120 apply, 623 have no opportunity before horizon and 177 abstain unknown. Completed supported-model execution does not mean every Oracle mechanic is modeled.

Tests: baseline **321/321, 124.829 s**; final **339/339, 142.065 s**, zero failed/cancelled/skipped; gameplay-focused **144/144, 7.061 s**; new Stage 8 **18/18, 1.606 s**. The disposable-cache HTTP/API smoke serves UI/script 200, version 1.1.5, 32,197 records and a newly generated **100-card €174.24 Ulalek deck** with exact selected-record budget reconciliation; 206.915 s under concurrent load. This is an API preservation check, separate from frozen-list model comparisons. Native Windows execution and interactive browser checks are unavailable on Linux; unchanged BAT syntax/hash and portable Node tools are checked.

Auditors share narrow Oracle/type grammar but independently replay payments, zones, last-known event prerequisites, token/draw/life budgets and stack order. They do not prove pilot/target optimality, model a full opponent table, certify diagnostic mana maxima or remove grammar-correlation risk. Every full run is audited by the hashed runner; persisted first-occurrence receipts are separately reaudited. Bootstrap/Wilson intervals describe this small sampled pilot/model and are not real-game probabilities; repeated policies/scenarios are correlated and no multiplicity-adjusted universal power claim follows.

Remaining unknowns include combined cast/death Eldrazi Repurposer, Chittering Dispatcher's leaves-battlefield Spawn, counters (Idol of False Gods, Dauthi Ghoul and others), temporary protection expiry, death damage/prevention, general sacrifice outlets, variable-X/targeted death draw, recursion, continuous creature-type layers, exploit and opponent/combat effects. Some conservative guards abstain on text that a fuller rules model would prove irrelevant. Example: a possibly expired Void Grafter grant still makes targeting unknown. No unsupported effects are converted into missing-performance penalties.

**Wilhelt, Yuriko and Zada retain full-native-strategy abstention.** Wilhelt's supported deaths do not certify its many sacrifice/damage/counter/recursion packages. Yuriko still needs combat, unblocked attacker, ninjutsu/commander timing and reveal/damage execution. Zada still needs legal targeting, copy creation/resolution and relevant combat/conversion. Partial deployment/access measurements cannot reject those commanders' native infrastructure.

## Practical decision gate

1. **Useful supported opportunities? Partly yes.** Actual deployed-engine removals and Wilhelt death/recovery events are now distinguished from absence; a controlled tutor decision produces real follow-up. Natural tutors still tie, so a useful general tutor improvement is not established.
2. **Beyond Ulalek? Yes at the event/resource level.** Wilhelt demonstrates last-known simultaneous deaths, actual Zombie resources and later taxed/end-step recovery in complete decks. Full unfamiliar-strategy optimization remains blocked.
3. **Credible complete-deck change? Not established.** C2 has a payable-threat signal and access tradeoffs; C1 is mixed/adverse in this cohort. Neither supports robust complete-deck superiority or a new package recommendation.
4. **Opt-in production trial? No.** Keep shadow mode and existing construction/selection. No Pod activation, release or merge.

The smallest useful next work is coverage at **already observed opportunities**, not a larger cohort: verify common leave/death Spawn branches and relevant temporary protections; implement one exact reusable sacrifice/access outlet from the existing Wilhelt list, with real costs/zone effects; then demonstrate an actual supported tutor→payable follow-up choice divergence. A small controlled/replay experiment is worth that cost because the current framework now measures exposure. More bulk simulations or another static score is not justified until those obstacles are removed. Retain human review/external evaluation for complete-deck strength.
