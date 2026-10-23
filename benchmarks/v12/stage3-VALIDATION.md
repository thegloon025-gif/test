# Stage 3 — Gameplay-aware shadow optimization

Implementation **`436df81`**, on `codex/v1.2-gameplay-intelligence`, draft PR #4 stacked on draft PR #2. Validation date: 2026-10-22. Version remains **1.1.5**. No production construction/selection change, merge, release or new external power claim.

**Result: the shadow foundation works, but this experiment does not justify promoting an Ulalek repair into production.** Twelve Ulalek repairs show access/timing tradeoffs or intervals that include no improvement. Ten repairs for the other commanders explicitly abstain on incomplete native execution. Individual supported lines can improve while another line deteriorates; spending more is never evidence of a stronger deck.

## Frozen inputs and reproducibility

The five existing complete outputs are replayed, then modified through bounded atomic proposals. **No fresh production generation is claimed.** Stage 1 already established that these outputs reproduced actual strategy-first generation. Source selection, catalog, research, budget, bracket and selected-printing provenance remain fixed throughout this experiment. A changed deck is a complete shadow candidate, not an isolated card replay.

- Original catalog: **32,197 records**, SHA256 `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`.
- Same 29 cached community decks and Spellbook library; Ulalek has 177 cached variants. The other commanders have no commander-specific Spellbook entry in this snapshot; absence is documented rather than invented research.
- Both Ulalek source spines retain the existing **20 source-spell floor**: B3 `archidekt:23460147`, B4 `archidekt:24772686`. Recorded commitments and all 12 known complete inventory packages per Ulalek deck are retained, including actual template matches. Inventory preservation is not execution proof.
- Exact eligible selected-record Scryfall EUR estimates, owned basics, **€191 hard ceiling**. Not verified Cardmarket English NM offers; no cart total is fabricated into individual prices. Wilhelt retains its archived €10.77 reversible Grimgrin record.
- All seven original cache files, both Stage 1/2 artifact directories, historical measurements, Windows launcher and version are fingerprinted before/after. The source tree is based on `3ece65b`; full source hashes identify the tested implementation now committed as `436df81`.

[Input/source fingerprints and complete results](stage3/comparison.json), [exact export index](stage3/exports.json), [independent audit](stage3/independent-audit.json), [test outcomes/preservation](stage3/test-results.json).

The frozen user observations remain unchanged: B3 €174.24, EDHCheck **5.7**, EDHPowerLevel **5.33**; B4 €173.88, **5.6 / 5.48**. The separate €108.02 regression and older pricing-qualified references remain historical. No external evaluator was queried.

## What changed

`src/gameplayShadow.mjs` supplies identity coupling, bounded audited evaluation/cache, cohort bottleneck diagnosis, paired uncertainty, coverage-aware verdicts and a shadow adapter around the existing atomic package infrastructure. `gameplayState.mjs` adds an optional cloned pre-action observation hook; without it, traces/statistics stay unchanged. `packageInvestment.mjs` adds an opt-in proposal observer and **shadow-only** package frontier/schedule. Their defaults preserve production behavior. No server, UI, production selector, legacy execution probe, research integration or pricing API imports the shadow module.

The shadow frontier includes one-card changes, access/land pairs and acceleration/access/land triples. It schedules lower mana deployment requirements before large threat bundles, preserves different package sizes and protects capabilities before spending the evaluation cap. This is bounded hypothesis discovery, not a new deck-quality score. Existing functional/demand floors still guard proposals; the shadow can examine a mechanically safe incomparable package without overriding production's static-dominance rejection.

Additional conservative protections retain individual native tutor/copy/cascade/reduction infrastructure, existing access engines, unsupported native triggers, conditional high-output mana and on-plan support for incomplete strategies. Legality, singleton, exact budget, bracket inventory, source spine, commitments, support dependencies, response limits, raw true-colorless and mana-demand gates remain. These protections can also block valid alternative strategies; that limitation remains explicit.

Three implementation/audit findings were resolved:

1. High-ranked threat bundles and repeated outgoing permutations could consume the bounded frontier before useful coordinated land/access repairs. Shadow scheduling reserves package sizes and distinct incoming bundles.
2. Repeated basic copies can share one catalog-object reference. The historical proposer removes references; cutting one could remove several slots and fail count checks. The shadow adapter supplies distinct physical slots. Production behavior and catalog objects are unchanged.
3. Archived template matches contain both strings and structured records. An independent audit caught a dropped string match. Normalization now preserves both, merges commitments and fails closed on unknown shapes; a regression test covers it. The final experiment was rerun after this fix.

## Experimental design

Each full deck uses **eight training plus sixteen disjoint holdout seeds**, turns 1–8, no mulligan, and all three fixed pilots: commander-first, development and native. At most 40 scheduled proposals per original; at most six mechanically safe distinct incoming bundles are selected round-robin by size **before gameplay outcomes**. Holdout never feeds proposal generation or scheduling. No pilot is separately optimized for an alternative.

A shared numeric shuffle seed is insufficient when membership changes. Here each canonical card identity and duplicate occurrence receives a seed-specific SHA256 priority. Retained cards keep their relative random order across original/repaired decks. Replacements get independent priorities. Identical basics are exchangeable copies. Absolute draw slots can shift; subsequent selection/draw can diverge. Stage 2 slot-ID pilot tie-breaks can also shift. This coupling reduces arbitrary positional reshuffling but does not make hands or policies identical, eliminate all variance, or prove a particular card caused a seeded improvement. The Stage 2 position-based free-mulligan redraw is deliberately excluded from these comparisons.

Paired bootstrap intervals use 2,000 deterministic resamples, separately by pilot and partition. They describe conditional-model sampling uncertainty, without multiplicity correction or coverage-error bounds. Small cohorts and all-tie intervals cannot establish equivalence. A nonexistent supported optional-payment mechanic is unknown/not applicable, not zero execution. Search/action bounds force abstention. Unimplemented native mechanics cannot reject or endorse Yuriko/Wilhelt/Zada packages.

**1,944 cohort runs** = 27 complete decks × 24 seeds × 3 pilots. Another 44 sample-trace evaluations give **1,988 independently audited runs and 1,988 identical replays**. Six additional mechanism/counterexample traces are separately audited and replayed. Zero payment/action-bound hits occurred in this cohort. This is not a proof that arbitrary decks never hit a bound.

[Every proposal and why it passed/failed](stage3/decisions.md), [paired training/holdout measurements](stage3/paired-measurements.md), [all-pilot turn-by-turn mana/access intervals](stage3/turn-measurements.md), [numerical per-turn data](stage3/turn-measurements.json). All 1,944 complete per-run vectors are losslessly compressed under `stage3/*-runs.json.gz`; their raw/gzip SHA256 values and round-trip checks are in the independent audit. Full representative receipts remain plain JSON.

## Real bottlenecks versus pilot/coverage limitations

These are observations under the stated model. “Resource bottleneck” requires a turn-five commander payment blocked before deployment actions under **all three pilots**, rather than merely failing after the pilot spent mana. A generic shortfall can include source restrictions, tappedness or sequencing; it does not prove an extra land is the right repair. Pips are tested through diagnostic-only cost relaxations, never credited as legal payments.

| Original / holdout cohort | Shared T5 resource-blocked seeds /16 | Pilot-sensitive delay seeds | Runs without realized supported access /48 | Spell payable but optional trigger competes: snapshots | Post-action spent-resource snapshots |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ulalek B3 | 9 | 2 | 28 | 90 | 311 |
| Ulalek B4 | 7 | 0 | 33 | 79 | 286 |
| Yuriko B3 | 3 | 0 | 6 | not applicable | 582 |
| Wilhelt B3 | 6 | 0 | 22 | not applicable | 611 |
| Zada B3 | 2 | 0 | 30 | not applicable | 516 |

Most shared Ulalek turn-five failures are supported mana shortfalls, rather than a color-only constraint solved by a rainbow land. Yuriko includes one shared colored-payment constraint, but ninjutsu remains unknown. Ulalek has many ordinary Eldrazi payments that cannot simultaneously retain the separate `{C}{C}`. Draw/access setup can compete with deployment, and some deployed supported engines have no currently payable follow-up. Per-card large native body sightings, payable/blocked/unknown statuses and engine snapshots remain in the report; they are opportunities under a declared body proxy, not wins.

The spent-resource column is **not** a deck penalty. It explicitly captures plays affordable before actions but blocked afterward. Unknown source/Oracle coverage still applies even when a particular supported payment query is definitive. “No realized supported access” does not mean the physical deck cannot draw. In particular, unmodeled combat, sacrifice/death, copying, tutors and cascade cannot be scored as absent strategy performance.

## Full-deck repairs, prices and tradeoffs

| Deck | Original price / unused | Scheduled / safe / simulated repairs | Outcome | End-to-end deck experiment |
| --- | --- | --- | --- | ---: |
| [Ulalek B3](stage3/ulalek-b3-before.txt) | €174.24 / €16.76 | 40 / 18 / 6 | Six inconclusive tradeoffs | 32.824 s |
| [Ulalek B4](stage3/ulalek-b4-before.txt) | €173.88 / €17.12 | 40 / 30 / 6 | Six inconclusive tradeoffs | 32.370 s |
| [Yuriko B3](stage3/yuriko-b3-before.txt) | €126.04 / €64.96 | 40 / 3 / 2 | Native-coverage abstention | 11.884 s |
| [Wilhelt B3](stage3/wilhelt-b3-before.txt) | €102.06 / €88.94 | 40 / 25 / 6 | Native-coverage abstention | 24.233 s |
| [Zada B3](stage3/zada-b3-before.txt) | €158.68 / €32.32 | 40 / 5 / 2 | Native-coverage abstention | 11.819 s |

All 200 scheduled full proposals, plus five originals, pass an independent **100-card, singleton, color legality, known bracket inventory and integer-cent exact budget audit**. Safeguard-rejected proposals remain rejected despite having valid import lists. Not every preliminary combinatorial draft is exported: early budget/ramp failures are aggregate screening counts. Safe proposals outside the six-bundle cap are explicitly unevaluated.

Representative Ulalek alternatives below are **analysis exports, not promoted recommendations**. The complete incoming/outgoing sets, function gains/losses, prices, unknown coverage and decisions for every proposal are in [decisions.md](stage3/decisions.md).

| Full after export | Additions / cuts | Exact EUR / unused | Native-pilot holdout mean Δ net cards, 95% interval | Native-pilot Δ commander tempo, 95% interval |
| --- | --- | --- | --- | --- |
| [B3 pair, repair-03](stage3/proposals/ulalek-b3-repair-03.txt) | + Beanstalk, City of Brass; − Gideon, Temple of Malady | €184.22 / €6.78 | +0.438 [−0.188, 1.188] | +0.063 [−0.250, 0.375] |
| [B3 triple, repair-04](stage3/proposals/ulalek-b3-repair-04.txt) | Above, plus Birds of Paradise for Arcane Signet | €186.84 / €4.16 | +0.438 [−0.188, 1.188] | +0.063 [−0.250, 0.375] |
| [B3 pair, repair-13](stage3/proposals/ulalek-b3-repair-13.txt) | + Beanstalk, Forbidden Orchard; − Gideon, Temple of Malady | €181.00 / €10.00 | +0.250 [−0.250, 0.875] | +0.063 [−0.250, 0.375] |
| [B4 pair, repair-03](stage3/proposals/ulalek-b4-repair-03.txt) | + Beanstalk, City of Brass; − Gideon, Forest | €184.01 / €6.99 | +0.188 [−0.250, 0.563] | −0.125 [−0.375, 0.125] |
| [B4 triple, repair-04](stage3/proposals/ulalek-b4-repair-04.txt) | Above, plus Birds of Paradise for Arcane Signet | €186.63 / €4.37 | +0.063 [−0.313, 0.438] | −0.188 [−0.438, 0.063] |
| [B4 single, repair-02](stage3/proposals/ulalek-b4-repair-02.txt) | + Birds of Paradise; − Arcane Signet | €176.50 / €14.50 | 0 [−0.188, 0.188] | −0.125 [−0.313, 0] |

Beanstalk provides a supported entry draw plus paid MV-five casts drawing actual library cards. The land partners help satisfy new colored demand without losing protected true-colorless sources. Costs include losing Temple's scry/ETB timing, Gideon's protection/other utility, pain from City, or giving an opponent a creature with Orchard. Bird introduces green setup, creature removal exposure and summoning sickness while losing Signet's immediate artifact availability. Opponent responses, Orchard's combat consequences and Gideon's full tactical value remain unmodeled. More spent money or higher generic mana cannot compensate for those unknowns.

Supported-access record counts can fall when replacing a scry land; that count is neither draw quantity nor engine strength. Conditional high-output producers, including Fanatic of Rhonas, are protected even if their strongest mode is not simulated. Neither Temple of the False God's delayed output nor another conditional producer is silently discarded as zero capability.

The unchanged original remains the production choice because **no shadow alternative meets the all-pilot, training-and-holdout supported-improvement rule**. This does not prove the original is stronger. B3 card-access gains are promising but uncertain; B4 exposes timing losses. Choosing a favorable pilot, quoting the best seeded trace, or preferring the €186 deck merely for spending more would overstate this evidence.

For unfamiliar strategies, even Wilhelt repair-14's favorable observed native-pilot net-card interval, +0.750 [0.313, 1.313], cannot certify a strategy upgrade: sacrifice/death/end-step execution remains unknown. Yuriko's normal casting is not commander ninjutsu; Zada's target-copy/cantrip chains are not generic access. Their core support is protected and verdicts abstain.

## Concrete mechanism and counterexample traces

[Readable paired turns and complete exact receipts](stage3/mechanism-traces.md) use the same native pilot on both decks. These deliberately selected illustrative mechanisms are separate from the prespecified first-difference sample traces and aggregate inference.

- B3 repair-03, holdout seed 6: both deploy Ulalek on T4. Beanstalk resolves on T3, drawing Rapacious One. Ulalek itself then draws a card on T4; later qualifying casts produce five effect draws/net +5 cards by T8 versus zero in the original model. All obtained cards move through real zones, and every Ulalek trigger payment remains separate. Copy/tutor/cascade effects stay unknown.
- B4 repair-03, the same seed: both deploy Ulalek on T4; Beanstalk resolves on T5. The repaired line draws two actual cards by T8 versus zero, but delays Eldrazi Linebreaker from T5 to T6. Better access has a deployment cost in this line.
- B4 repair-04, holdout seed 4: the original casts Arcane Signet on T5 and Ulalek on T8. The repaired list has no supported replacement deployment at T5 and fails to deploy Ulalek by T8. Both draw once; repaired net access is −1 versus 0. This is a concrete failure, not evidence that all Birds packages are bad.

Identity coupling can also change a line when none of the incoming cards is cast: removing/replacing cards shifts absolute draw positions. The automatic first-difference examples include such cases. They illustrate the experiment's coupling, not proof that the named incoming engine mechanically produced the improvement. The hand-review examples above specifically include actual supported access resolution and a timing counterexample.

## Tests, independent audits and runtime

Node **v24.19.0**, Linux. [Exact machine-readable outcomes](stage3/test-results.json):

| Check | Passed / total | Failed / cancelled / skipped | Runtime |
| --- | ---: | --- | ---: |
| Initial preserved baseline | 234/234 | 0 / 0 / 0 | 128.846 s |
| Final focused gameplay suites | 58/58 | 0 / 0 / 0 | 3.723 s |
| Final complete regression suite | **253/253** | **0 / 0 / 0** | **148.295 s** |
| Independent artifact audit | 205 exports, 3,200 selected-record checks; 50 sample resource/zone audits | 0 failures | 2.677 s |
| Archived foundation replay | 160 Stage 1 hashes + 15 Stage 2 full sample traces match | 0 differences | Included above |

Nineteen new tests cover common retained identities and basic occurrences; disjoint holdouts; color/C/restriction diagnoses; observation noninterference; exact-record/model cache invalidation and bounded copies; all-pilot pairing, holdout disagreement, ties, missing/bounded unknowns; native abstention; callback/default production equivalence; coordinated budget/source/combo/native/access protection; conditional high-output preservation; one-slot land removal; an actual controlled 100-card weak expensive mana substitution; cohort separation; and archived string/structured combo template preservation. Controlled fixtures are not real-catalog or external power measurements.

Earlier development runs caught a test assuming two different seeds must always yield different permutations, an insufficient synthetic cascade protection case, the template archive issue, and an audit comparing in-memory `undefined` fields against persisted JSON. These were corrected; final checks above pass. No unresolved failures are counted as passes.

The final complete experiment takes **113.655 s**, including bounded proposal discovery, evaluation/replay/audit, bootstrap aggregation and artifact writing, under concurrent full-suite load. Evaluation internals: simulation with diagnostics **44.531 s**, deterministic replay **38.122 s**, independent audit **3.381 s**, diagnostic summary **3.364 s**, key serialization **3.380 s**. Sample explanatory traces are separately profiled in [explanations.json](stage3/explanations.json).

The summary LRU stays at **128 entries**. This streaming experiment records zero LRU hits, so no cache speedup is claimed. Originals are evaluated once per seed/pilot and their observations reused across all repairs, avoiding 1,224 repeated baseline cohort runs. The bounded proposal/frontier and six-repair cap prevent full-catalog × package × seed explosion. Lossless run-log compression reduces repeated archive data; it changes no measurements.

[Isolated HTTP/UI smoke](stage3/http-smoke.json): version 1.1.5, 32,197 cached cards, root page/JS/CSS and cached commander search pass. Startup touches only a disposable data copy. The Windows launcher is byte-preserved. Native BAT/browser execution remains a local Windows check; no release was attempted.

## Remaining risks and next decision

This is an initial **shadow** connection to construction, not a demonstrated better deckbuilder. The bounded frontier can miss strong repairs; strict per-card/function protections can exclude sensible coordinated replacements. Small cohorts, membership-induced draw shifts and slot-based pilot ties create uncertainty. No opponent interaction, full stack/tutor/copy/cascade execution, complete land/source/alternate-face mechanics, combat/ninjutsu, sacrifice/death, target-copy chains or reliable combo-to-win timing is available. Missing mandatory effects can change later game outcomes; these are not certified lower bounds on real games.

Keep production unchanged. Next, review the access/timing counterexamples, implement narrowly verified native/source mechanics, improve pilot tie invariance, test more diverse repair hypotheses and prospective larger holdouts, and compare genuinely different source strategies. Obtain fresh permitted human EDHCheck/EDHPowerLevel evaluations of specific frozen exports before claiming external improvement. Any production feedback hook requires a separate explicit review; timed pod combo policy still needs complete prerequisite/outlet support and a user-agreed reliability rule.

Windows reproduction and all model assumptions: [GAMEPLAY_STAGE3.md](../../docs/GAMEPLAY_STAGE3.md). PR #2 and PR #4 remain draft and unmerged.
