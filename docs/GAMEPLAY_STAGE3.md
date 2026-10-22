# Gameplay-aware shadow optimization

Stage 3 is an offline experiment on complete decks. It does not enter the server, generator, production objective or candidate selector. Version stays 1.1.5. PR #4 remains draft, stacked on draft PR #2. No automatic deck recommendation, release, combo timing certification or external power claim follows from these probes.

## Common inputs when cards change

`commonIdentityOrder` gives each physical card an independent SHA256 priority keyed by the experiment schema, seed, canonical exported card name and duplicate occurrence. Sort priorities to get a deck permutation. A retained card keeps its priority and its relative order among other retained cards, independent of input position or printing. Repeated basics have distinct exchangeable occurrence labels. Neither card price nor card utility enters the permutation.

A replacement gets its own priority; it is **not** placed into the outgoing card's draw slot. Common cards can shift absolute draw positions as cards are added or removed. Access, selection and different actions can diverge later draws, as they should. This is a reproducible coupling with approximately independent pseudorandom priorities per identity, not a guarantee of identical opening hands, identical game states or minimum-variance pairing. Hash ties use a deterministic identity tie-break.

All primary comparisons use **no mulligan**, eight turns, the same three fixed pilots, and disjoint `training` / `holdout` seed namespaces. Stage 2's free mulligan still exists, but its position-based redraw is not used in changed-deck pairing. Pilot choices retain Stage 2's rules, including slot-ID tie-breaks; changed membership can change those tie-breaks. This residual pilot sensitivity is a limitation, not grounds for choosing a different pilot per candidate. Commander normal casting does not stand in for ninjutsu/combat execution.

## Observations, hypotheses and uncertainty

An optional, cloned pre-action snapshot is taken after the initial land drop and before deployment actions. It includes supported exact commander/spell plans, joint optional-trigger plans, real source state and engine readiness. Preview queries neither commit receipts nor resolve triggers; a second evaluation without the hook must reproduce the entire trace and statistics exactly.

Payment diagnoses distinguish an unknown rule/bound, payable spell, colored/true-colorless constraint, combined pip constraint or supported mana shortfall. A diagnosis may test a **counterfactual** generic-pip relaxation against the same source restrictions and fees. Those queries are never legal payments, never enter a game state and never produce resources. A generic shortfall can also reflect restrictions or unavailable/tapped sources; it is not proof that another land fixes the deck.

Cohort diagnosis separates turn-five payments blocked under all three pilots from pilot-sensitive commander delays, unknown coverage and end-of-action exhaustion. A spell payable before actions but blocked afterward is labeled spent resources, not automatically a construction defect. Joint spell-plus-trigger failure is separate from ordinary spell affordability. Deployed-but-blocked supported engines and large native body payment opportunities are observable hypotheses; they do not measure arbitrary tutors, cascade, copied effects, combat or win conversion.

Complete-deck comparisons retain every fixed pilot separately. Paired bootstrap 95% intervals use 2,000 deterministic resamples of common-input differences. Eight training and sixteen holdout seeds per pilot are deliberately modest; intervals cover conditional-model sampling uncertainty only. Comparisons are exploratory, without multiplicity correction. All-tie intervals do not prove equivalence. No favorable-pilot maximization, spending bonus or replacement scalar is used.

Metrics include actual commander deployment, model survival, resolved access/net card accounting, paid top casts and original optional trigger payments. Mana maxima are independent queries, not simultaneous resources. Large-native cast observations are restricted to cards visible in the pre-action large-body observation and can miss a threat drawn later that turn. Unsupported execution is never assigned a win count. A nonexistent supported optional-payment mechanic is `null` / not applicable, not zero performance. Full Oracle coverage remains unquantified.

The exploratory verdict requires supported endpoint improvement in training **and** holdout for every pilot without observed interval losses. Search/action bounds force abstention. Any adverse interval is a supported-model regression, not a certified worse real deck. Otherwise retain tradeoffs/inconclusive status. Yuriko-, Wilhelt- and Zada-like incomplete native mechanics explicitly force native-coverage abstention, regardless of apparently favorable generic probes. Even a supported shadow improvement would still require hand review and a separately reviewed production integration.

## Bounded coherent proposals and safeguards

The shadow adapter reuses `refinePackageInvestments`' atomic proposal and full-deck validation infrastructure. The opt-in observer cannot vote in its returned production winner. With default options, construction and selection are unchanged. A separate `shadowOnly` proposal frontier adds land, access/land and acceleration/access/land packages, reserves different package sizes, and schedules inexpensive-to-deploy setups before large threat bundles. That is bounded hypothesis discovery, not a deck-quality objective. No price term earns merit.

The shadow adapter gives repeated references to one basic-land catalog object distinct physical slots. The historical proposer removes object references; without that adapter, cutting one repeated basic could erase multiple slots and fail count validation. This does not change production behavior or the catalog.

Every shadow-eligible package passes existing count/singleton, legality/castability, game-changer, bracket inventory, source-spine, combo commitment, response, support-dependency, mana-demand and functional floors. Shadow also retains distinct native infrastructure and existing access engines individually, unsupported native triggers/tutors, conditional high-output mana capabilities and on-plan support for incomplete native strategies. True-colorless floors remain intact. Known complete combo inventory and recorded commitments are protected; no inventory match is labeled executable. Missing research stays missing.

One round, at most 40 fully scheduled proposals per deck, one-to-three simultaneous substitutions; at most six mechanically safe distinct incoming bundles go to gameplay, round-robin sizes before outcomes are inspected. Remaining safe proposals are explicitly unevaluated. Preliminary budget/ramp screening has aggregate rejection counts; the report's individually documented proposals are the scheduled full decks, not every combinatorial draft. Holdout results never feed discovery or scheduling. Every scheduled full deck has an export and exact selected-record audit; rejected safeguards do not become recommended repairs.

The harness evaluates each original once per seed/pilot and reuses those observations across all repairs. A 128-entry LRU caches only audited immutable summaries, keyed by schema, full exact records/prices, model/source fingerprint, seed and policy. Cache outputs are copied. Failed audits are never cached. CPU times separate key serialization, simulation, independent audit, deterministic replay and diagnostic aggregation. No persistent cache or original data is written.

## Reproduce locally on Windows

Use Node.js 22 or newer and Git. Keep a backup of the original data directory and the frozen cache snapshot. A refreshed catalog or repaired research cache may no longer match the frozen fingerprints; the comparison deliberately stops rather than silently repricing or rebuilding the benchmark.

```powershell
git switch codex/v1.2-gameplay-intelligence
node --test tests/gameplay-shadow.test.mjs tests/gameplay-stage2.test.mjs tests/gameplay-deployment.test.mjs
npm test
node tools/benchmark-shadow-gameplay.mjs C:\path\to\frozen-data C:\path\to\shadow-results
```

Optional discovery-only check:

```powershell
node tools/benchmark-shadow-gameplay.mjs C:\path\to\frozen-data C:\path\to\shadow-screen --screen-only
```

The harness reads the archived exact printing ledger, catalog and cached research, and performs no network requests. Outputs include complete before/after `.txt` imports, exact-printing audits, all scheduled proposal explanations/capabilities, paired statistics, per-turn observations and representative full resource/zone traces. Original archived Stage 1/2 outputs and user-observed external scores are fingerprinted before/after. Startup/UI behavior remains available through the unchanged `start-windows.bat`; the UI does not adopt shadow repairs.

## What is required before production integration

Expand and audit actual native execution and unknown source/engine coverage, review pilot disagreements and payment/trigger order, test larger independent seed cohorts and hostile controlled substitutions, then prospectively compare genuinely different full strategies and source-backed repairs. Validate improvements externally with permitted EDHCheck/EDHPowerLevel evaluations. Only a separate explicit review may connect trustworthy measurements to production construction or candidate selection. Timed pod combo eligibility still needs complete prerequisite/outlet execution and a user-agreed reliability rule.
