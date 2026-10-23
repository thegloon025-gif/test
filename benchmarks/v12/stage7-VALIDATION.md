# Stage 7 — Explicit recovery and supported tutor planning

Stage 7 implements reusable, opt-in disruption/recovery experiments and a state-aware alternative for supported tutor targets. **5,400 complete-deck model runs passed resource/zone/stack/event audits and deterministic replays. All 321 tests pass.** Controlled real-card sequences demonstrate genuine taxed recasts, later native execution, protected access and an earlier qualifying cascade target. The prospective cohort does **not** establish a superior complete deck or an integration-ready tutor policy. Production construction/selection remain unchanged.

Version stays **1.1.5**, with PR #4 stacked on draft PR #2, both draft and unmerged. Stage 1–6 artifacts, uploaded caches, historical measurements and the Windows launcher are preserved. The custom Pod High-Power policy remains inactive. No new Stage 7 external evaluation, real-game win probability, reliable combo turn or universal recovery grade is claimed.

## Implementation and evidence

Review core implementation commit **`18d7415`** and repeatable artifact-packing helper **`edf04df`** separately from the generated evidence commit. Frozen source SHA256 identifies the exact implementation bytes; the original pre-implementation HEAD contains the separately committed human observations (`58b8cfe`).

- [Full assignment](https://github.com/thegloon025-gif/test/pull/4#issuecomment-6353557065), [supported semantics and Windows commands](../../docs/GAMEPLAY_STAGE7.md).
- [Protocol and explicit correctness amendments](stage7/PROTOCOL.md), [fixed complete records, source/cache/history fingerprints and new package discovery](stage7/discovery.json).
- [Training index](stage7/training.json), [holdout index](stage7/holdout.json); each links a hash-checked compressed complete comparison array. [Compact training vectors](stage7/training-vectors.json.gz), [holdout vectors](stage7/holdout-vectors.json.gz).
- [Every complete-candidate tradeoff](stage7/candidate-tradeoffs.md), [every tutor-policy tradeoff](stage7/tutor-tradeoffs.md), [every holdout recovery timing/status](stage7/recovery-observations.md). These retain all fixed pilots rather than selecting a favorite.
- [Independent persisted audit](stage7/independent-audit.json), [controlled fixture index with complete receipts](stage7/fixtures/index.json), [packed evidence manifest](stage7/packed-evidence.json).

`gameplayRecovery.mjs` defines explicit scope/unknown guards and separate recovery observations. `gameplayState.mjs` injects empty-stack events, conserves actual zones, applies command-zone choices and cumulative commander tax, and records actual downstream state. `gameplayTutor.mjs` chooses among real supported inventory using ordered tactical channels and exact projections. `gameplayTutorAudit.mjs` independently replays positive plans. Existing resource/native audits now validate the new zone transitions, actual taxed costs, planning receipts and legal tutor choices. `gameplayComparison.mjs` preserves the terminal/unknown distinction for interruptions. `gameplayChallengers.mjs` adds an explicit shadow cast-draw frontier while keeping its default unchanged. No new API/UI control or production objective imports this experiment.

## Human observations are preserved, not optimization targets

The separate [2026-10-23 human-observation artifact](stage7-human-observations-2026-10-23.json) records:

| Existing complete deck | Frozen Scryfall estimate | Human EDHCheck / EDHPowerLevel | EDHCheck consistency |
|---|---:|---:|---:|
| B3 original | €174.24 | 5.7 / 5.33 | 6.6 |
| Stage 6 B3 C1 | €187.59 | 5.8 / 5.58 | 6.9 |
| B4 original | €173.88 | 5.6 / 5.48 | 6.5 |
| Stage 6 B4 C2 | €175.39 | 5.7 / 5.52 | 6.8 |

These small external heuristic changes are user-supplied observations, not independently rerun gameplay results or equal-price power proofs. The B4 challenger also had somewhat lower evaluator efficiency/playability. The DeckCheck screenshot reports Threat Index 26, engine ready about T5, first must-answer threat about T6 and Engine Recovery B / 1 of 4. Its B4 label is driven by bracket-card rules, not independent power certification.

Its three-own-turn recovery explanation assumes both Ulalek and nonland ramp are removed. This is a hypothetical without an exact spell/removal definition. We do **not** calibrate the model to three turns. Our events are deliberately explicit and can be materially different: the compound selector includes indirect mana/token producers whose Oracle text contains quoted `Add` abilities, not only mana rocks. No comparison below certifies or disproves that site's estimate.

## Frozen experiments and complete decks

Same original **32,197-record** Scryfall catalog (`6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`), 29 saved community sources and cached Spellbook library. No research refresh or external pricing call. Selected-printing EUR estimates and owned basics, **€191 hard cap**, ordinary official B3/B4 option; no modeled estimate is labeled a verified Cardmarket EN NM offer.

Nine complete decks are evaluated: the two originals; the two manually evaluated Stage 6 lists; two new cast-access proposals; Yuriko, Wilhelt and Zada. Every list has commander + 99, singleton/color legality, exact eligible selected-record prices and original source/combo/commitment constraints. The independent audit checks **900 selected-printing slots**, all nine complete decks and both new proposals' native/function/C/mana/source safeguards. The source spines retain their 20-spell floor.

| Complete deck | Exact estimate | Unused | Role in experiment |
|---|---:|---:|---|
| Ulalek B3 original | €174.24 | €16.76 | Frozen control; [complete export](stage6/ulalek-b3-original.txt) |
| Stage 6 B3 C1 | €187.59 | €3.41 | Human-observed context; [complete export](stage6/ulalek-b3-challenger-1.txt) |
| New B3 cast access | €184.55 | €6.45 | New bounded hypothesis; full exact records in discovery manifest |
| Ulalek B4 original | €173.88 | €17.12 | Frozen control; [complete export](stage6/ulalek-b4-original.txt) |
| Stage 6 B4 C2 | €175.39 | €15.61 | Human-observed context; [complete export](stage6/ulalek-b4-challenger-2.txt) |
| New B4 cast access | €184.15 | €6.85 | New bounded hypothesis; full exact records in discovery manifest |
| Yuriko / Wilhelt / Zada originals | €126.04 / €102.06 / €158.68 | €64.96 / €88.94 / €32.32 | Resource/access regressions with mandatory native abstention |

New B3 adds **Up the Beanstalk, Talisman of Conviction, City of Brass**; cuts **Gideon Blackblade, Hedron Crawler, one Forest** (+€10.31 against its original). New B4 adds **Up the Beanstalk, Herald of Kozilek, City of Brass**; cuts **Gideon Blackblade, Shared Roots, one Forest** (+€10.27). These preserve native/source/committed infrastructure through the existing atomic validator, including coordinated land support. They are not the prior twelve Stage 3 repairs or Stage 6 decks. They add supported lower-setup cast access; B4 also adds a reduction channel. Real losses include loyalty/combat support, a mana creature or basic-land-search spell, and a basic. City of Brass self-damage and some interaction/protection functions remain incompletely modeled. More spending earns no merit.

All three fixed pilots, conservative optional copy payments, legacy and state-aware tutors on every Ulalek deck; other commanders retain legacy targeting and explicit native abstention. New namespace `gameplay-recovery-stage7-v1-2026-10-23`, four training and sixteen holdout seeds, common physical card-identity coupling. No Stage 1–6 holdout was relabeled new. Seven-card opening, no mulligan, draw on T1, eight-turn horizon and three inert 40-life seats. Common-card relative order is coupled; absolute opening membership, actions and downstream shuffles can diverge.

The original protocol was prospective. Two recorded correctness reviews occurred without changing candidates, scenarios, policies, seeds or criteria: granted protection had to force unknown; later an empty removal target set had to return known not-applicable before unrelated recursion guards. All affected outputs were recomputed. **The final holdout is a correctness reanalysis of the same registered sample, not a second independent blind holdout.** Superseded development outputs were not retained as favorable evidence. Fixture JSON replay also needed explicit JavaScript card-object alias metadata; this preserves full replay equality rather than discarding differing coverage fields.

## Explicit removals, not a generic wipe assumption

All cohort effects are at **T5 after natural draw/resolution, before the land drop, at an empty stack**, with no modeled response from hand or opponent. They are forced unanswered hypotheses, not a cast of a particular paid opponent spell.

1. Commander exile only, with explicit command-zone return.
2. Destroy all modeled creatures; unaffected artifacts/enchantments/lands survive. Relevant unsupported death/replacement effects suspend unknown before any removal.
3. Exile nonland artifacts, including artifact creatures; ordinary creatures/enchantments/lands survive.
4. Compound commander plus nonland mana/reduction/explicit `Add` text exile. This **also catches Spawn/Scion token producers with quoted mana text and actual tokens**, so it is broader than “commander plus rocks.” All actual identities/types removed are recorded. It is not assumed to be the effect of one real sweeper.
5. Exile a specified strategy engine: Mystic Forge for Ulalek, a fixed named card for each unfamiliar deck. If absent, no removal occurred; not-applicable is not failure. Fully protected target sets also need no recovery and are distinguished by their recorded supported survivors; the cohort not-applicable counts should not be read as a generic protection grade.
6. No-disruption control on the exact same complete list, seed and pilot.

Destroy/exile, destinations, token cessation, surviving types, untaps and later draws/payments are explicit. Intrinsic indestructible and the exact artifacts-have-indestructible static effect survive destroy, not exile. Ward, hexproof/protection granted by another card, unsupported death/leave/replacement/recursion and uncertain targeting are unknown where relevant. The guard is intentionally conservative; some unknown clauses would prove irrelevant with more complete rules. These experiments do not establish that a real player could not protect the engine from hand.

## Separate recovery receipts and reviewed sequences

We report supported mana restored, actual commander recast, first paid native/access receipt, actual outlet execution and conditional table lethal separately. Mana restoration uses capped independent generic/C lower-bound maxima, **not simultaneous allocations**, and does not mean the whole strategy is restored. A paid native trigger is a marker; resolved copies, accessed cards and outlets must also be inspected. Missing future time remains censored/unknown, not zero. Actual outlet damage is not a certified unavoidable win threat; combat and opponent responses remain unknown.

The [17 controlled receipts](stage7/fixtures/index.json) cover these hand-reviewed cases. Card setup/order and choices are stipulated; none estimates reliable combo or recovery timing:

- **Commander only:** Ulalek cast T3 from three lands + Sol Ring. Exile T4 moves battlefield→exile→command. The T4 recast fails at six mana; T5 pays the printed hybrid cost plus `{2}` (seven units). Native copying resumes only T6 after casting Kozilek's Channeler and separately paying `{C}{C}`. “Commander recast” and “native execution resumed” are different turns.
- **Compound resource loss:** same initial setup, but T4 also removes Sol Ring. Supported pre-event generic/C capacity falls 5→3 before that turn's land drop. Ulalek is actually recast T7 for seven and copying resumes T8. This is four own-turn offsets to the demonstrated native receipt, not a general recovery estimate or a target of three.
- **Repeated removal:** a second command-zone return produces an actual `{4}` tax (nine-mana printed-plus-tax payment), not a repeated fixed `{2}`. A commander deliberately left in exile is not freely recast. Legal generic reductions can reduce generic tax in other states.
- **Type/destination conservation:** Darksteel Myr survives creature destruction but is exiled by creature/artifact exile; Sol Ring survives the creature sweeper. A Spawn enters the specified destination and then ceases. Sifter of Skulls death/conditional targeting protection suspends unknown rather than fabricating resources or a failed recovery.
- **Protection versus another rock:** a real-card Ring/Dynamo/Powerstone/Archive setup deploys Darksteel Forge, Mystic Forge and Ulalek. The T5 artifact-destruction hypothesis preserves the protected artifacts; a top-library Channeler cast and paid native copying remain legal. Replacing Darksteel Forge with Basalt Monolith leaves those artifacts destroyed and loses that top-access line. This is a controlled strategy/protection tradeoff, not a €191 proposal to insert a nine-mana protector.
- **Actual engine loss with an alternative:** Mystic Forge is exiled T3 in a fixed sequence. Up the Beanstalk is deployed T4 and really moves a card into hand; Channeler produces actual copied value T5. The commander was not removed, so no commander recast is reported. An absent engine is separately proven not-applicable even with unrelated recursion text elsewhere.
- **Tutor choice:** Fierce Empath with Zhulodok already deployed chooses legacy six-MV Conduit of Ruin versus the alternative payable seven-MV Bane of Bala Ged. The alternative leads to actual qualifying cascade and real revealed/cast cards in the controlled next turn. Legacy Conduit can instead set up a later chain; the fixture is not proof of whole-game superiority. Hand/top destinations, shuffle, current/next-untap payments, horizon, separate C and actual inventory are retained. A top tutor at T8 cannot invent T9 access.

Independent tamper checks reject invented/changed payments, illegal destinations, nonexistent removals and altered positive tutor projections. Auditors do not call the gameplay pilot or payment planner to certify positive receipts. They share strict Oracle/type grammar and do not certify target-search optimality or diagnostic mana maximization.

## What the complete-deck comparison establishes

The final 5,400 vectors comprise 1,080 training and 4,320 holdout runs. Across the 4,500 disruption runs, **2,303 events apply, 1,945 are not applicable and 252 suspend unknown**. Training: 911 completed T8, 106 supported conditional lethal, 63 unsupported-rule unknown. Holdout: 4,077 completed T8, 54 conditional lethal, 189 unsupported-rule unknown. No supported model loss or actual execution search-bound vector occurred. Correlated deck/pilot/scenario cases are not independent games or real win probabilities.

Unknowns and not-applicable events remain visible in the [full recovery tables](stage7/recovery-observations.md). At T5 many intended engines are not deployed. In the native/state-aware 16-seed Ulalek slice, **Mystic Forge engine loss is not applicable in all sixteen runs of every complete deck**. That cohort cannot establish recovery from an actually lost Forge; the controlled actual-loss fixture supplies correctness coverage, not population evidence. State-conditioned future experiments are needed rather than treating this as perfect engine resilience.

For the manually evaluated B4 C2 under native/state-aware decisions:

| Scenario | Actually applied / not-applicable / unknown | Commander recast among removed-command cases | First native/access receipt after an applied event | Actual outlet receipt after an applied event |
|---|---|---|---|---|
| Commander exile | 6 / 10 / 0 | T5:4; T7:2 | T5:1; T6:4; T8:1 | T6:2; four censored |
| Creature destroy | 11 / 4 / 1 | T5:1; T6:4; T8:1; one unknown | T6:2; T7:4; T8:3; two censored; one unknown | T6:2; nine censored; one unknown |
| Artifact exile | 13 / 3 / 0 | Not applicable (commander survives) | T5:4; T7:4; five censored | T5:2; eleven censored |
| Compound exile | 14 / 2 / 0 | T6:2; T7:2; two censored | T5:2; T6:3; T7:1; T8:1; seven censored | T6:3; eleven censored |

Denominators differ: an event can remove ramp without removing a not-yet-deployed commander. “Native/access” can be an alternative access channel, not necessarily Ulalek recovery. The table includes known supported receipt markers, not a total recovery grade. An unanswered removal can even create additional cast-trigger draw on a recast; an isolated higher event count is not evidence removal improved the deck.

The first prespecified B4 C2 trace is informative through its limitations: control deploys Signet/Jewel T2, Tablet T3, Millikin T5, Ornithopter T6, Ulalek T7, Endbringer T8. Commander/creature/engine events at T5 find no chosen permanent. Artifact/compound exile actually removes Signet, Jewel and Tablet; the supported cast timeline still matches control. Some conditional/counter-based artifact mana and crafted faces are unmodeled, while Jewel's restricted mana cannot be assumed to cast the commander/pay every trigger. This is **not** proof those removals have no real cost. Both fixed tutor policies' complete traces for all six cases are archived; no more favorable seed was substituted.

### Tradeoffs, Pareto views and uncertainty

For every fixed pilot, policy, scenario and partition, the report retains terminal event identification bounds, conditional landmark pairs/omitted identities and nominal 95% paired bootstrap intervals (2,000 resamples). There is no multiplicity correction, causal full-game interpretation, independent-pilot pooling or scalar power sum. All-tie bootstrap intervals can understate population uncertainty. Conditional subset Pareto statements do not establish complete-deck dominance.

New B3 cast access versus its original, no disruption, state-aware tutor, T7 (all 16 paired landmarks observed):

| Fixed pilot | Commander presence difference | Net accessible cards | Payable native threats |
|---|---|---|---|
| Commander-first | 0 [0,0] | +0.750 [0.063,1.688] | +0.125 [-0.188,0.563] |
| Development | 0 [0,0] | +0.750 [0.063,1.688] | +0.250 [-0.063,0.688] |
| Native | 0 [0,0] | +0.750 [0.063,1.688] | +0.125 [-0.188,0.563] |

That is promising supported card-access evidence, **not a uniformly established stronger deck**. Threat-payment uncertainty, disrupted scenarios, very small training strata and unmodeled effects prevent the prespecified complete-deck standard. New B4's no-disruption net-access differences are +0.188 [-0.125,0.625] in commander-first/native and +0.375 [-0.063,0.938] in development: insufficient to establish a robust gain.

Across 72 predeclared candidate panels each, new B3 has 42 point-vector dominance, 26 tradeoff and four dominated classifications; 30 panels have a favorable supported interval, none a strictly adverse interval, but zero satisfy the separate strict diagnostic. New B4 has 62 point-vector dominance, eight tradeoff and two dominated classifications; no strict positive interval panels and 22 pass the strict diagnostic, with no uniform strict execution/access improvement. **These are correlated descriptive panel counts, not votes, power ratings or chances of superiority.** All panels remain published in [candidate tradeoffs](stage7/candidate-tradeoffs.md).

The tutor-policy complete-deck result is especially limited: **all 216 measured tutor-policy panels tie**, and the prospective cohort produces **zero supported tutor resolutions**. The controlled fixture proves a meaningful different choice when a tutor is deployed; it does not establish more useful target choices in these sampled decks/pilots. Tutor deployment opportunities and bounded setup→target→follow-up action planning are still missing from the useful cohort evidence. More static tutor tags or external-score tuning would not fix this.

No newly discovered proposal meets the prospective shortlist criterion. Therefore **no new plain-text recommendation shortlist is exported**. The full 100-card selected records, exact additions/cuts and prices are retained for audit/reproduction in discovery.json, but neither experimental list is presented as stronger than the existing manually tested lists. This respects the requirement to export a new shortlist only when supported evidence justifies it.

## Generalization and remaining native coverage

Yuriko, Wilhelt and Zada retain their complete decks and receive all six scenarios, three pilots and twenty registered seeds each (360 runs per commander). Native-coverage abstention remains explicit: Yuriko combat/ninjutsu/reveal damage; Wilhelt sacrifice/death/decayed/replacement interactions; Zada targets/copies/combat. Their absent unsupported events never become a low-power verdict or reason to cut native infrastructure. Typed resource/zone/payment behavior is tested, not universal native strategy quality.

Generic supported mechanisms use exact Oracle/type/context rules, not commander-name ratings. Card names in the benchmark specify controlled test inputs/removal hypotheses. The app does not rank decks by screenshots, prices, number of combos, modeled damage totals or an internal recovery tier.

## Verification and performance

- Baseline **306/306**, 121,511.586 ms. Focused final native/construction/recovery **68/68**, 1,580.935 ms. Full final suite **321/321**, zero failed/cancelled/skipped, **133,020.491 ms**, Node 24.19.0. Fifteen new regressions include actual interruptions/tax, token/zone/protection/unknown handling, no-op scopes, legal target choice/projections/horizon and default trace preservation.
- Final discovery **55,595 ms**, training **67,635 ms**, holdout **238,441 ms**; phase total **361,671 ms**, about six minutes. Training simulation/audit/replay ≈28.41/7.03/29.03 s; holdout ≈103.06/23.64/105.96 s. Deterministic replay intentionally doubles model execution. Controls are evaluated once per exact deck/policy/seed and reused in comparisons; there is no unbounded candidate×repair search or best-pilot cache reuse.
- Independent persisted audit: all **5,400 vectors**, **270 paired tables**, **900 selected-printing slots**, **nine complete decks**, **two proposal safeguard checks**, **12 fixed sample reaudits/replays**, **17 controlled fixture reaudits/replays** and **eight archived Stage 6 default full traces matched**. Source/cache/history fingerprints pass. The audit shares narrow grammar but independently conserves actual/positive projected payments, zones, stack and effect receipts.
- Disposable-cache offline server smoke: 32,197 audited cards, version 1.1.5, HTTP page/script 200; actual cached strategy-first Ulalek B3 output **100 cards / €174.24**, exact selected-record price audit/hard cap passed, **153,272 ms**. [Receipt](stage7/smoke.json). No original cache was refreshed or modified. This smoke preceded the no-op guard correction, which affects only explicit Stage 7 calls and is covered by the final full suite/default replay checks.
- Large comparison arrays/analysis are losslessly gzip-packed with SHA256 and preserved phase indexes to cap artifact growth. Only fixed samples and controlled receipts are full traces. Implementation and generated evidence are separate commits.

Development checks caught incorrect fixture assumptions (a Spawn could already have been legally spent; cascade could create an additional tutor), an unsupported initial stress mana setup, persisted JavaScript object-alias loss, and the two documented guard issues. Fixtures/metadata and guards were corrected and all affected checks rerun. No budget, mana, legality, combo, source or protection safeguard was bypassed to obtain a pass. Actual Windows BAT execution and interactive-browser testing remain local checks; launcher bytes are unchanged. No independent audit of complete MTG rules or rejected-plan optimality is claimed.

## Integration decision and smallest useful next work

**Evidence remains insufficient for an opt-in gameplay-aware construction trial.** Supported controls and individual action sequences improve, but target selection has no cohort opportunity, engine-loss cohorts often have no deployed engine, and important post-death resources remain unknown. Neither more spending nor a favorable access interval is adequate production promotion evidence.

The most informative missing rules mechanism is **bounded simultaneous death-trigger resource/access resolution**, including last-known source information, Spawn/Scion production and commander zone-choice ordering. That directly affects the creature sweeper and recovery hypothesis, and generalizes beyond Ulalek toward Wilhelt; it should not become a complete recursion engine at once. The most informative experimental/pilot follow-ups are a prospectively registered engine-loss checkpoint conditioned on actual deployment, and verified tutor-deployment→target→payable-follow-up planning. Both need new uninspected samples; do not reuse this analyzed holdout as fresh validation.

Keep the current manually observed lists available for further actual playtesting. Preserve external scores as observations and agree a reliability threshold before enabling the custom turn-six Pod profile. No merge, release, version change or production construction/selection change is authorized by these results.
