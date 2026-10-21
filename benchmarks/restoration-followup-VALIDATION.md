# PR #2: coordinated restoration and complete-strategy execution evidence

Unreleased continuation of `5db333e` on draft PR #2, dated 2026-10-22 (Europe/Brussels). No merge, release, paid AI, live research refresh or new EDHCheck/EDHPowerLevel evaluation. The [previous engine report](engine-followup-VALIDATION.md) and its exports remain historical. **This addresses a construction barrier; it does not establish that the gameplay regression is resolved.**

## What prevented the native package from competing

The €170.59 balanced/value and €171.20 quality paths from source `archidekt:23460147` were constructed successfully but inadmissible to the final investment comparison. Existing preservation demanded the unchanged seed's entire vector: ten early sources, fifteen repeatable output, one fixer, one nominal wide shield and three cast-time answers. The expensive paths had nine, fourteen, zero, zero and two respectively. The old search did not reserve coordinated repairs for these deficits. Incoming protection/answer alternatives were largely absent; cut permutations could consume its forty full evaluations before a viable restoration was examined. Ordinary steps also required functional dominance over the already different path.

Two kinds of protection must be distinguished:

- **Real constraints:** exact selected-record budget, legal singleton 99 + commander, bracket/known-combo policy, committed pieces, source spine, dependency support, original raw true-colorless output and true-colorless land sources, casting/mana-base evidence and high-output cheap acceleration. These gates still apply to the complete restoration transaction.
- **Surplus counts or false recognition:** coverage now protects the lesser of the original count and explicit targets: eight early sources, eight flow functions, seven broad answers, three dedicated shields, one wide shield, four threats and two cast-time answers. Other vector capabilities remain protected without this relaxation. Threat power/protection, annihilator, distinct native infrastructure and original raw {C} remain protected. These are transparent policy floors, **not a claim that eight sources or two cast-time answers are sufficient for every commander**. Strategy-role floors remain separately enforced.

The previous wide-shield requirement was false: Azlask's general creature pump and the separate protection for Scions/Spawns were combined across sentences. That ability is useful conditional token support, not unconditional protection for the whole engine board. Recognition now requires one group-protection clause and rejects limited targets, paid tier/kicker and unrelated text. A real whole-board indestructibility/phasing effect remains recognized and protected. Paid level-up mana is also excluded from immediate sustained output; Joraga Treespeaker cannot produce its level-one mana without the omitted investment.

## Bounded restoration

A deficient starting path receives a dedicated repair frontier: up to three alternatives per missing functional field, plus colorless compensation sources when needed, at most ten distinct incoming records and twelve outgoing slots. It considers one-, two- and three-card transactions, keeps up to six outgoing permutations per incoming bundle, and reserves half the existing forty full evaluations across repair bundles. Partial repairs are never exportable. Three rounds, two continuation beams and at most three constructor expansions remain the default bounds.

Restoration must pass **all** original gates and final functional/strategy floors. Recognized native infrastructure and supported access cards are excluded from repair cuts; each native card/kind is checked again against the complete repaired deck. Thus a tutor or cascade source is not cut to repair generic mana. Restorations may give up surplus counts above their floors, unlike the old strict per-step dominance requirement. Raw true-colorless output is not capped for preservation. `restoration`, `restoredPaths` and `functionalFloors` record deficits, reserved choices, validated transactions and actual minimums. Price is a constraint; it contributes no merit.

## Complete-deck comparison

Static functional dominance remains the first filter. Surviving strategies additionally receive **128 deterministic, no-mulligan eight-turn probes**, seed `strategy-execution-v1`. Shared records use shared seeded draw priorities. Each endpoint has its own setup line; the reported percentages are **not simultaneous game outcomes**:

- Commander deployment by the horizon.
- Supported infrastructure deployment plus an affordable eligible follow-up, separated into cascade, cast copying, passive trigger multiplication, activated trigger copying, reduction and tutoring.
- Repeatable access deployment plus a qualifying cast/activation, or an eligible actual next card for top access.
- A castable native expensive/finisher threat.
- Where Oracle text specifies it, a relevant cast after deploying the commander with the additional optional mana payment still available.

The probes pay for observed simple sustained ramp, wait for mana-creature summoning sickness and tapped entry, and allocate colored, hybrid and true-colorless mana jointly. The same mana cannot pay for a spell and the commander's {C}{C} payment. Simple supported reductions apply to generic costs after deployment. Unknown costs, restricted/consumed/conditional mana and unmodeled resource payments fail closed rather than create mana or cards.

Only nondecreasing observed endpoints with a one-sided paired exact sign-test improvement, Bonferroni-corrected across endpoints, can prune another surviving deck. Distinct engine endpoints prevent generic access from standing in for a missing cascade/tutor stream. This is model comparison, not statistical evidence of real-game power; correction is per pair across endpoints, not a global claim across every candidate/commander. **Unmodeled core mechanics disable probe-based pruning:** Yuriko's ninjutsu, Wilhelt's sacrifice/death plan and Zada's targeted-spell chain retain diagnostic probes but cannot lose a strategy on that partial model. Incomparable strategies still use the existing scalar. No new weighted power score or price bonus is introduced.

## Fixed inputs and separate experiments

All comparisons use €191, High B3, owned basics and eligible-printing Scryfall EUR estimates, not verified Cardmarket English NM offers. The pristine uploaded catalog remains unchanged: 32,197 records, SHA256 `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`. The same 29 cached community decks and combo library are used without a network refresh. Fresh results include catalog/research/library hashes. The original user-reported €108.02 list and historical external scores remain unchanged in earlier reports; its original generation route has not been independently reproduced.

1. **Frozen completed-candidate replay:** [replay](restoration-followup/frozen-candidate-replay.json) reconstructs the previous report's exact completed candidates, asserts singleton/count and exact cached price, recalculates current evidence and replays selection only. All four previous winners remain selected, including **€134.21 Ulalek**. Historical recorded protection floors in this replay are diagnostic snapshots; it does not regenerate or repair those old paths.
2. **Fresh generation:** [full traces and selected-printing ledgers](restoration-followup/generated-after.json) rerun actual strategy construction and investment under those identical inputs. These results must not be attributed to comparator-only replay. [Final candidate reconstruction](restoration-followup/final-candidate-replay.json) independently reproduces every completed list's price, current vector/probes and final selection. The final group-phasing grammar correction is also checked against every saved candidate vector/probe and restoration deficit; it changes none of these fixed-cache outputs.

## Fresh generation results

| Commander / High B3 | Previous fresh output | Current fresh output | Unused / €191 | Runtime |
| --- | ---: | ---: | ---: | ---: |
| Ulalek | €134.21 | €174.24 | €16.76 | 170.360 s |
| Yuriko | €126.04 | €126.04 | €64.96 | 55.107 s |
| Wilhelt | €102.06 | €102.06 | €88.94 | 53.121 s |
| Zada | €158.68 | €158.68 | €32.32 | 46.899 s |

All four have 100 cards, agree with the exact selected-printing audit, stay below €191 and report zero price anomalies. Runs overlapped automated checks on this machine; runtimes are observations, not controlled performance improvements. Yuriko, Wilhelt and Zada have **zero card changes** relative to the previous report. Their existing quality concerns, especially Wilhelt’s cheap draw/sacrifice tradeoff and Yuriko’s opener density, remain unvalidated. The partial execution model is diagnostic only for their core mechanics.

Ulalek switches source `14494014` → **`23460147`**, **€134.21 → €174.24** (+€40.03), using **91.23%** of the ceiling and retaining **€16.76**. This changes **22 cards**, including land/basic quantities, rather than merely swapping four isolated cards. Exact [before](restoration-followup/ulalek-before.txt) / [after](restoration-followup/ulalek-after.txt); [all four multiset differences](restoration-followup/deck-differences.json). All four before/after exports are in that directory. The new source retains **24 source spells**, above its protected twenty-spell spine.

Within its selected €170.59 starting path, the accepted transactions are:

- Spell Satchel, Guardian Idol, Magus of the Library → Arcane Signet, Thran Dynamo, Palladium Myr: **+€2.07** (functional restoration).
- Warping Wail → Mystic Forge: **+€1.58** (functional complement).

The first transaction restores fixing and raises modeled sustained output from 14 to 18 while retaining Zhulodok, Conduit and all recognized native infrastructure. It exchanges an unreliable counter rock and smaller/conditional sources for a fixer, a three-output rock and a two-output mana creature. Palladium Myr must survive summoning sickness; Thran Dynamo costs four to deploy. Early-source count falls from nine to eight on that path (ten in the protected unchanged seed). The final true-colorless nonland output is **17 versus protected raw 14**; true-colorless land sources remain **23**. Broad answers remain seven and cast-time answers two; the unchanged seed had three cast-time answers. These are capacity/functions, not on-turn spendable mana. The Forge transaction loses Warping Wail’s situational interaction; it is not a free draw upgrade.

The €171.20 quality path also has validated restorations in `restoredPaths`, but does not supply the selected origin. Arcane Signet now receives thirty complete considerations / twenty-two accepted states on this source; Thran Dynamo thirty-six / nineteen. Those counts include alternative transactions, not independent trials. Unaffordable or broken transactions still fail: many Signet/Dynamo combinations exceed ramp counts, raw {C} or budget. Worn Powerstone remains outside the bounded frontier; Rhystic Study’s opponent-dependent access is not promoted to reliable draw; The One Ring (€98.06) fails available budget on this source. Kindred Discovery (€5.51) has twelve evaluated proposals here, all failing the mana-base/demand gate; this indicts those outgoing packages, not the card. Guardian Project (€12.61) and Up the Beanstalk (€2.47) each have two accepted intermediate states but lose subsequent bounded selection. Mystic Forge (€1.90) has six accepted states and reaches the final list. The exact traces show these events and limitations; **none proves a globally optimal exclusion**.

The following **separate** endpoints compare the old €134.21 output (frozen replay, current probe method) with the fresh €174.24 list. They are deterministic model observations, not external performance gains:

| Endpoint by turn eight | €134.21 | €174.24 |
| --- | ---: | ---: |
| Commander deployed | 78.1% | 78.9% |
| Cascade engine + qualifying cast | 0.0% | 0.8% |
| Tutor infrastructure + qualifying follow-up | 0.0% | 2.3% |
| Repeatable access online | 25.8% | 13.3% |
| Native threat castable | 57.0% | 59.4% |
| Commander + relevant cast + optional payment | 64.8% | 67.2% |

Cascade execution is rare in this probe despite recognized support; the model must both draw/deploy the six-mana engine and afford a qualifying seven-plus spell by the horizon. **Repeatable access falls 25.8% → 13.3%.** The new list has not demonstrated superior draw consistency or external power. Native infrastructure is restored, but its real deployment/return remains a substantial quality risk.

## Why the selected complete candidate wins the implemented comparison

The €174.24 deck survives both frontiers and has scalar **200.29**. The table explains every other complete candidate. A scalar decision means the program selects it; it does **not** establish gameplay dominance. Complete cardlists, prices, vectors, per-kind samples and elimination edges are in the final replay and full traces.

| Rejected candidate | Price / scalar | Actual decision and retained tradeoff |
| --- | ---: | --- |
| `source:archidekt:14494014` | €180.99 / 188.97 | Survives both frontiers; scalar 188.97 loses to 200.29. Has more top access/early sources/flow, but less sustained output and lower observed commander/payment deployment. Repeatable-access endpoint is higher (17.2% versus 13.3%); no dominance is claimed. |
| `local:engine` | €163.51 / 173.54 | Survives; scalar tie-break. More early/output mana and higher threat-cast endpoint (77.3% versus 59.4%); loses cast-copy capability, a passive multiplier, fixing and top access. |
| `local:resilience` | €183.59 / 172.42 | Survives; scalar tie-break. Better unconditional/scalable draw, protection and early mana; loses native cascade/tutor/cast copying and much threat capability. Its higher draw endpoint is a legitimate tradeoff. |
| `source:archidekt:16437369` | €177.71 / 170.13 | Functionally eliminated by the €180.99 source 14494014, which retains its native capabilities and improves mana/fixing/access. The selected €174.24 deck then wins against that surviving source by the scalar; it does not directly functionally dominate this candidate. |
| `reference:legacy` | €173.86 / 168.65 | Survives static functions but loses paired deployment comparison to both source 23460147 and 14494014. More nominal answers/shields than the selected deck; lower modeled commander, supported-engine, threat and additional-payment endpoints. No extra cards or price merit are used. |
| `local:threats` | €152.92 / 159.54 | Survives; scalar tie-break. More early mana, raw threat power/annihilator and an 80.5% threat-cast endpoint; lacks cast copying, a passive multiplier and top access. The selected deck is not proven faster. |
| `local:tempo` | €145.34 / 137.63 | Survives; scalar tie-break. Faster commander deployment (93.0%) and more mana/burst; lacks native cascade/tutor/reduction/cast copying, has no recognized flow and fewer threats/answers. |

Thus the new execution comparison removes an execution-inferior legacy alternative, but **five other survivors still lose to the legacy scalar**. Restoration, not a spending reward or a wholesale new objective, makes the native €170 path competitive. Choosing optimally between the remaining genuinely different strategies is still unresolved.


## Functional consequences and remaining weaknesses

The fresh Ulalek selection restores a genuine native package rather than buying unrelated expensive filler. Zhulodok supplies two conditional cascade streams for qualifying seven-plus colorless casts; Conduit supplies a supported creature tutor/top-deck setup and a first-creature reduction. They do not certify extra resolved cards, a complete combo or a win. Roaming Throne, Echoes of Eternity, Annie Joins Up and Strionic Resonator remain present. The selected source retains at least twenty native source spells; the trace gives the exact count. Atomic commitments, known bracket policies, automatic research, pricing modes, exact selected records, local fallback and Windows launcher are preserved.

This is still a strategy tradeoff. Relative to the previous €134.21 source, the new deck loses independent/conditional access options, some reducers and utility, including Archivist, Elven Chorus, Herald of Kozilek, It That Heralds the End, Sowing Mycospawn and World Breaker. It gains native engines, sustained colorless output and supporting bodies. It also retains weak or slow cards such as Tablet of Compleation, conditional interaction and expensive threats. The deployment model does not credit cascade cards drawn/resolved, but its lower repeatable-access endpoint is still a real warning about losing easier draw. Do not call a higher scalar or higher spend proof that this trade is favorable.

Further risks:

- Preservation repairs functions already present in a seed; a deficient seed can still start below useful desired coverage. The conservative shield vector can miss real protection-from-color or flash-entry effects. Eldritch Immunity and Void Grafter remain in Ulalek; a zero dedicated-shield proxy does not mean no protection cards exist. Engine protection needs richer recognition and gameplay validation.
- Bounded frontiers and beam/scalar continuation can miss better repairs, balanced draw/protection packages and stronger whole decks. Nonselected affordable cards are not proven weak. Only three constructors receive atomic expansion. Final per-candidate reasons explicitly retain scalar decisions where execution evidence is incomparable.
- Greedy setup probes omit mulligans, interaction/removal, life costs, many conditional lands, Spawn/Scion/temporary mana, granted creature mana, most activated/resource costs, tutor resolution, extra cards from engines/cascade, combat, ninjutsu and death/sacrifice loops. An endpoint is a separate feasible setup policy, not an optimal line or a full board/game. The eight-turn horizon and recognized threat grammar are uncalibrated.
- Trigger support and exact payment do not certify combo execution or independent wins. Existing bracket 2–4 approximations are unchanged; this does not implement all current official 1–5 rules.
- Scryfall eligible-printing estimates remain estimates; a foil may be the selected eligible record. Verified English NM Cardmarket offers still require actual imported offer data, and an actual cart total is never redistributed into fabricated per-card quotes.

## Verification and Windows reproduction

- Baseline: **180/180 passed**, no failures, 115.265 seconds.
- Final focused engine/package/execution checks: **31/31 passed**, no failures, 1.402 seconds.
- Full suite on final code: **187/187 passed**, 0 failures/skips/cancellations, **135.884 seconds** (`npm test`). New cases cover coordinated fixing/protection restoration, budget and forbidden-combo rejection around retained cascade/tutor infrastructure, exact mana allocation including {C}{C}, deterministic deployment, paid-level/false-wide-shield exclusions, significant paired comparison and diagnostic-only treatment of unmodeled commanders. Existing exact-printing, source, singleton, role and bracket regressions remain green.
- Four fresh fixed-cache outputs pass count, hard budget and exact-printing reconciliation. Frozen completed-candidate replay keeps all four old winners. Final reconstruction reproduces **every candidate's current vector, probe samples, price and selected strategy**; no restoration in these runs uses a group-phasing deficit affected by the final grammar correction.
- Server/HTTP smoke on final code loads **32,197** records, serves HTML/browser script and returns Yuriko B4 HTTP 200: **100 cards / €116.38**, exact audit agreement, within cap and zero anomalies. New comparison/selection/execution fields are present. [Smoke artifact](restoration-followup/http-smoke.json). Interactive browser testing and actual Windows batch execution remain unperformed.
- Syntax checks and `git diff --check` pass. `AGENTS.md`, `CODEX_HANDOFF.md`, `start-windows.bat`, pricing/research integrations and pristine input hashes are unchanged. No catalog, account metadata or user data is added to Git.
- During development, the first new-fixture run failed on a fixture syntax error; it was corrected and all final runs passed. Pilot generation was restarted after adding the diagnostic-only guard; partial/restarted outputs are not the reported final four-commanders experiment. No unresolved automated failure is hidden.

Changed production files: `src/packageInvestment.mjs`, `src/strategyFirst.mjs`, new `src/strategyExecution.mjs`. Regression files: `tests/package-investment.test.mjs`, new `tests/strategy-execution.test.mjs`. Read-only benchmark tools: `tools/compare-budget-search.mjs`, `tools/compare-candidate-evidence.mjs`. Changelog, roadmap, investment documentation and validation artifacts are updated. The application remains unreleased v1.1.5.


To test locally, retain the old installation/data backup, check out PR #2 in a separate folder on its existing branch, copy the local `data` into that checkout, install Node 22+ and run from PowerShell:

```powershell
npm test
$env:BENCH_BRACKETS = '3'
node tools/compare-budget-search.mjs (Get-Location).Path "$env:TEMP\CommanderOracle-restoration" .\data
node tools/compare-candidate-evidence.mjs (Get-Location).Path .\data .\benchmarks\engine-followup\generated-after.json "$env:TEMP\CommanderOracle-frozen-replay.json"
```

The benchmark defaults to Ulalek, Yuriko, Wilhelt and Zada. Use a fresh output folder and the frozen supplied cache to reproduce exact comparisons; refreshing Scryfall or research changes the experiment. Close the old server, run unchanged `start-windows.bat`, then generate Ulalek / €191 / High B3 in strategy-first mode. Ordinary UI use may retain automatic research; frozen-cache comparisons intentionally do not refresh it. Review the complete export, price ledger, retained engines, support and mana/draw tradeoffs. Obtain new permitted EDHCheck/EDHPowerLevel results before making a real-world power claim. **PR #2 remains draft.**
