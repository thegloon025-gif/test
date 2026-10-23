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


## Stage 6 continuation (draft PR #4; version still 1.1.5)

Stage 6 adds bounded source/Oracle-backed complete shadow challengers and terminal-aware paired comparison, without production construction/selection changes. Read `docs/GAMEPLAY_STAGE6.md`, `benchmarks/v12/stage6-VALIDATION.md` and the frozen protocol before continuing. Six new Ulalek complete challengers pass existing construction safeguards; 306/306 tests and 3,192 independently audited/replayed prospective runs pass. None establishes robust complete-deck improvement across both partitions and all fixed pilots/decisions. Keep PR #4 stacked on draft PR #2, unmerged/unreleased. Exact original selected-printing decks, caches, Stage 1–5 outputs and human external scores are preserved. The report identifies manual-testing lists and the smallest follow-up: verified prospective tutor-target/follow-up planning and lower-setup supported access. Do not treat increased draw/damage totals, conditional lethal, higher spending or a favorable pilot as a production promotion decision. Pod High-Power remains inactive.


## Stage 7 continuation (draft PR #4; version still 1.1.5)

Read `docs/GAMEPLAY_STAGE7.md`, `benchmarks/v12/stage7-VALIDATION.md` and its protocol/amendments. Core `18d7415` adds opt-in typed interruption checkpoints, command-zone choices/cumulative tax, distinct recovery receipts and state-aware supported tutor targets with independent positive payment/zone audits. Legacy defaults and production construction/selection remain unchanged; eight archived Stage 6 default full traces match. Final 321/321 tests, 5,400 audited/replayed registered vectors, 17 controlled receipts and 900 selected-printing slots pass. The final same-seed cohort is an explicitly documented correctness reanalysis, not a second fresh holdout. No new proposal meets the shortlist screen; all 216 tutor-policy panels tie and the cohort has no supported tutor resolution, despite controlled target-choice correctness. Most informative gaps: simultaneous death-trigger resources/access, deployed-engine-conditioned experiments, and tutor deployment/follow-up planning. New human external observations remain separately frozen in `stage7-human-observations-2026-10-23.json`; do not rewrite old baselines or tune to DeckCheck's hypothetical three turns. Keep both PRs draft/unmerged, version 1.1.5, Pod profile inactive; no release or production integration.


## Stage 8 continuation (draft PR #4; version still 1.1.5)

Read `docs/GAMEPLAY_STAGE8.md`, `benchmarks/v12/stage8-VALIDATION.md`, the registered protocol/amendments and independent audit. Implementation `8b7ffbd` / `38ae0e8` adds explicit deployed-state checkpoints, exact matched-prefix conditional recovery, narrow LKI simultaneous-death/SBA/end-step sacrifice/resource execution, real tutor inventories and independent audits. Explicit colors prevent black Zombie tokens becoming colorless damage events. Final 339/339 tests and 2,976 registered audited/replayed runs pass; 700 printing slots, 43 first-occurrence receipts, 19 controlled fixtures, one explicitly post-hoc descriptive example and eight unchanged archived Stage 6 traces are verified. Stage 8 is a correctness reanalysis of registered samples, not a pristine blind holdout. Natural tutors resolve but all 24 policy panels still tie. Wilhelt now demonstrates actual death/end-step recovery beyond Ulalek; its full strategy and Yuriko/Zada still abstain. C1/C2 remain tradeoffs, no robust complete-deck improvement or new package recommendation. Keep production selection unchanged, PRs #2/#4 draft/unmerged, Pod inactive and version 1.1.5. Next work should cover already observed native/death/tutor-follow-up opportunities rather than add bulk samples or a score. Historical external observations and caches remain untouched.


## Stage 9 continuation — bounded product checkpoint

Read `docs/GAMEPLAY_STAGE9.md`, `benchmarks/v12/stage9-VALIDATION.md` and its release-readiness assessment. Stage 9 adds opt-in exact creature-sacrifice life/scry costs and Dark Prophecy death access with independent receipt audits. Final 349/349 tests, 1,080 audited/replayed registered vectors, 900 exact selected-printing slots, nine controlled/actual-catalog outcome matches, eight archived default traces and 24 Ulalek opt-in trace matches pass. Fresh Wilhelt generation exactly reproduces €102.06; zero cached Wilhelt community sources/Spellbook variants, bounded discovery and incomplete contextual death-access recognition remain concrete construction limitations. Two gate-valid complete Wilhelt shadow packages (€104.63 sacrifice/access and €114.62 resilient access) do not establish robust improvement; no new voluntary sacrifice activation occurs naturally in this sample. There is no demonstrated complete-deck improvement for multiple commanders and no production trial. Pause broad simulator expansion; prioritize source/generator quality, manual external deck comparisons and review/Windows/browser readiness. Preserve both draft PRs, inactive Pod, version 1.1.5, all historical scores/caches and production selection. The final same-sample harness diagnostic reanalysis retains byte-identical vector archives, not a second fresh holdout.
