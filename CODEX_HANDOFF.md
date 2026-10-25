> Experimental Upgrader continuation: see [workflow and limits](docs/EXPERIMENTAL_UPGRADER.md). Branch targets PR #9; no production constructor or selection changes.

> Current milestone: [read-only shadow job ledger](docs/SHADOW_JOB_LEDGER.md). Production scalar selection remains unchanged pending validation; incomplete legacy exports now fail closed. Historical measurements below remain frozen.

# CommanderOracle Independent — Codex handoff

**Starting source version:** v1.1.5 (2026-10-21). This handoff records prior human-observed benchmarks and project priorities; do not confuse them with independently reproduced tests. This is a local-first Node.js 22+ Commander deckbuilder, not a paid-AI wrapper.

## User's product goal

The complete ordinary workflow must be **commander + euro budget + target Commander bracket → automatically research relevant community builds, analyze synergy/combo context, construct and compare coherent legal 100-card decks, honor the hard purchasing budget, and export**. No user should have to manually choose eight Archidekt lists. A deck upgrader is desired later, but the near-term priority is consistently good automatically generated decks. Budget must be invested intelligently for **best attainable quality within ceiling**, not minimized. Never insert expensive filler just to reach the cap.

Reference: Ulalek, Fused Atrocity, €191, High Bracket 3 or Optimized Bracket 4. Do **not** hardcode Ulalek: keep Yuriko, Wilhelt, Light-Paws and unrelated commanders in regression fixtures as available.

## Important code map

- `src/strategyFirst.mjs`, `src/deckSelection.mjs`, `src/generator.mjs`: independent strategy-first candidate construction, candidate selection, older engine fallback, budget reinvestment.
- `src/sourceQuality.mjs`, `src/autoResearch.mjs`, `src/researchFlow.mjs`, `src/communityKnowledge.mjs`, `src/communityConstruction.mjs`, `src/community.mjs`: automatic Archidekt screening/import, creator diversity, archetypes, source evidence and use in generation.
- `src/comboLibrary.mjs`, `src/comboConstruction.mjs`, `src/comboTemplates.mjs`, `src/combos.mjs`: Commander Spellbook inventory/combo logic; card presence **does not** certify executable win conditions.
- `src/scryfall.mjs`, `src/printingEligibility.mjs`, `src/pricing.mjs`, `src/deckValidation.mjs`, `src/deckExport.mjs`: local catalog, eligible printing selection, EUR vs modeled EN NM vs imported EN NM offers, exact-printing reconciliation, deck validity.
- `src/roleEvidence.mjs`, `src/playabilityEvidence.mjs`, `src/manaBaseOptimizer.mjs`, `src/handSampling.mjs`, `src/deckQuality.mjs`: functional roles, mana/castability estimates, candidate evaluation.
- `server.mjs`, `public/`: server/API/browser UI; `tests/`, `benchmarks/`, `docs/ROADMAP.md`, `CHANGELOG.md` hold history and tests.

## Setup / commands

Use **Node.js >=22**. From repository root: `npm test` (`node --test --test-concurrency=2 tests/*.test.mjs`) and `npm start` or `start-windows.bat`. Check `http://127.0.0.1:4285` and `/api/status`. Some past combined test runs stalled under load; investigate actual hanging processes rather than treating a stall as a passing suite. At v1.1.5, the release reported **53/53 targeted tests passed**, not a verified clean run of every historical test.

The user's **`data/` folder lives in their Windows installation**, is absent from the source ZIP and contains a genuine Scryfall catalog plus cached Archidekt and Spellbook research. Keep it local, backed up and ignored by Git. Synthetic tests cannot substantiate full-catalog gameplay improvements.

## User-observed benchmarks (not reproduced by the development environment)

- Curated reference `test2` (Ulalek, ~€191 budget) scored **EDHCheck 6.9/10** (dark site), **EDHPowerLevel 6.41/10** (white site); evaluators may differ in bracket. It had ~10 Spellbook inventory matches, not necessarily all actionable wins.
- v0.8.x often regressed despite increasing internal heuristic scores; e.g. seven 3-mana Lockets with bad performance. **Avoid optimizing the metric instead of playability.**
- v1.1.1 High B3: **EDHCheck 6.1**, **EDHPowerLevel 5.26**. B4: **6.7 / 5.53** but external deck pricing showed ~€503.65 despite a nominal €191 cap due ineligible collector printing selection / pricing mismatch. **Do not use v1.1.1 B4 as a fair equal-budget win.**
- v1.1.3 High B3: generated **€182.50** Scryfall eligible-printing estimate against €191 cap; Archidekt showed **€180.88 estimated** and estimated Bracket 3. This is not a verified English Near Mint cart. Final price auditor formerly mismatched by exact-printing vs name-based lookup; v1.1.3 fixed this.
- v1.1.4 High B3: **EDHCheck 5.6, price €103.09**, B4: **EDHCheck 5.9, price €71.77** on €191 target. Constructor favored cheap modest-impact acceleration instead of evaluating full deck utility.
- v1.1.5: adds bounded **post-construction budget-investment pass** to choose meaningful improvements within cap, preserve combo/roles/bracket/pricing; **no real user-catalog A/B results available yet**.
- EDHCheck and EDHPowerLevel are free for user to check manually. Deckcheck uses limited tokens. Do not automatically scrape third-party evaluators without determining allowed access.

## Non-negotiable correctness constraints

- Commander + 99; 100 final cards, Commander color identity and legality; singleton nonbasics (normalize MDFCs/printed names), game-changer / target-bracket rules; no fake combo execution certifications.
- True `{C}` production and payments (including Ulalek copy trigger); don't count Powerstones as generic mana for nonartifact spells, no unsupported snow costs or conditional rainbow lands.
- Price a **real eligible printing**: reject gold-border collectors, digital-only and other non-tournament-legal prints. Recalculate the **exact selected printings** after all swaps; budget is a hard ceiling. Scryfall EUR is a market estimate; modeled EN NM is *not* verified Cardmarket EN NM; imported price CSV is a source-specific snapshot; do not conflate. Basic lands may be treated as owned only when UI assumption says so.
- Deck quality isn't just combo count or ramp-count threshold; promote coherent gameplans, sufficient actual card advantage, good early acceleration, source-color feasibility, ability to cast threats + pay additional ability costs.
- Preserve auto Archidekt research and offline fallback; no manual deck-curation prerequisite.
- Respect external website usage requirements: no unauthorized direct EDHREC JSON scraping; no invented live marketplace quotes, no claims that EDHCheck/EDHPowerLevel results were automated.
- Keep user able to enter an actual observed cart total and regenerate using **original budget + added amount**, preserving prior deck for comparison. A cart total cannot tell prices of all individual cards.

## Recommended first Codex work session

1. Initialize Git and preserve v1.1.5 as a tagged baseline without modifying `data/` or the user's saved decks.
2. Read `README.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, `benchmarks/v115-VALIDATION.md`; map and review actual current code, not only these notes.
3. Run the tests, diagnose any stalls, and run server smoke checks; establish reproducible test status.
4. Audit the v1.1.5 budget-reinvestment logic for underuse of budget and quality pitfalls: fixed search shortlist, card-value price bias, mana/role constraints, choice of full-deck candidates. Add realistic deterministic multi-commander regression cases. Keep exact-printing final audits intact.
5. With the user's permission/local data available, benchmark Ulalek at €191 for High B3 and B4. Report **actual export, price mode and selected printings, gameplan, internal diagnostics, external-score status**; no invented scores. Compare price/strength to v1.1.3 and v1.1.4 baselines. Improve the engine if the evidence warrants it.
6. Prefer small, reviewable commits. Preserve the user interface and Windows launcher. Update docs, tests and changelog before a new numbered release. Do not claim stronger decks based solely on internal heuristic gains.

## Broader next features (not authorization to do everything at once)

More reliable EDHREC-like insights **only from authorized sources**; functional Scryfall tagging/role evidence; genuine mana sequencing and hand simulation; stronger source-deck quality evaluation, hidden-gem recommendations; comparison of generated alternatives; later a strategy-preserving in-app upgrader. Moxfield authenticated push and live Cardmarket EN NM acquisition remain unimplemented.


## Stage 10 — PR #6 research continuation

Work is on codex/stage10-any-commander-research, based on draft PR #2 separately from gameplay PR #4. Read Issue #5, docs/RESEARCH_STAGE10.md and benchmarks/stage10-VALIDATION.md. Commander GET discovery runs without Archidekt, with nullable-total-safe pagination and partial/stale provenance. Other locally legal color candidates are advisory colorCandidates, separate from constructor variants, and cannot evict known combo knowledge. Existing source-deck POST, exact pricing, bracket/source/commitment rules, local fallback and Windows launcher remain. No EDHREC rights assumption/scraping, commander sets, Pod activation, gameplay ranking, release, version change or stronger-deck claim is authorized. Full branch tests and live/browser/Windows limits are in the report; this branch has a different test baseline from gameplay PR #4.


## Stage 11/12 — draft PR #9 integration continuation

Branch `codex/stage11-12-strategy-integration` starts at exact PR #8 head
`85f1f2ce82a4de9150f06482827b750dba75c6a4` and targets
`codex/stage12-local-edhrec-knowledge`. Existing PRs #2/#4/#6/#8 remain draft,
unmerged and preserved. Read `docs/STRATEGY_STAGE11.md` and the new validation
report before drawing quality conclusions. Stage 12 fixes are separate commits
from construction/UX and generated evidence.

No PR #4 stateful evaluator is integrated; existing PR #2 bounded probes remain.
The local importer cannot affect production selection. Complete candidates now
have a bounded additional refinement opportunity, engine/dependency explanations
and audited alternatives. The existing scalar still resolves incomparable
survivors provisionally; do not present this as a solved quality objective.
Personal references remain private/local and excluded from their held-out
research cohort; historical unfiltered reproduction is a separate experiment.
Betor's intended commander is user-confirmed **Betor, Ancestor's Voice**.

Version stays 1.1.5. Preserve target/tolerance/effective-maximum accounting,
exact selected printing audits, basics-owned default, standard B3/B4, inactive
Pod, source/commitment/colorless constraints, original caches and Windows
launcher. Native Windows, unsupported Oracle mechanics and external strength
remain explicit validation limits; no automatic Deck Upgrader is authorized.


Final Stage 11 audit found that deep refinement erased Warren Soultrader's
unmodeled native life/sacrifice/Treasure conversion, including the path to the
old €102.06 Wilhelt B3. The new generic uncertainty guard retains safe input
paths, with canonical-name printing equivalence and explicit proposal receipts.
Under the frozen €191 cohort the recommendation becomes source 3838228,
**€163.25**, not a certified power improvement. Ulalek stays €174.24/€173.88 and
Wilhelt B4 €181.80. Y'shtola's observed noncreature/MV prerequisite and Zada's
unparsed targets-only restriction are handled generically; no reference recipes
or commander-name bonuses enter construction. Read all checkpoint tradeoffs
before treating this as a solved quality objective; an automatic Upgrader and
production gameplay ranking remain unjustified.
