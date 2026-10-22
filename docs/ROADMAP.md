# CommanderOracle Independent — development roadmap

Last revised: 2026-10-22. Local, deterministic Commander generator: **no paid AI API** is needed to build a deck.

## v1.2 Gameplay Intelligence (draft PR #4, no release)

- [x] Stage 0: freeze user-observed B3/B4 external measurements without overwriting their historical meaning.
- [x] Stage 1 foundation: independent bounded turns 1–8 resource ledger, actual seeded hands/draws, land/ramp timing, exact mana/restrictions/fees, sickness, separate optional cast-trigger payments and post-resolution token resources.
- [x] Reproducible execution traces, independent receipt audit, unknown mechanics and search bounds; fixed-cache Ulalek B3/B4, Yuriko, Wilhelt and Zada validation. No ranking integration or version change.
- [x] Stage 2: execute supported draw/activated/entry/cast access, scry/surveil and top casting in actual card zones; audit movement and exact fees/prerequisites.
- [x] Compare three deterministic pilots, conservative free mulligans, optimized payment search and common-seed card-flow/deployment observations with unknowns and sampling uncertainty. Keep ranking unchanged.
- [ ] Expand hand-reviewed tutor, conditional source, alternate-face, combat/ninjutsu, target-copy and sacrifice/death coverage before claiming complete strategy execution or reliable combos.
- [x] Stage 3 foundation: bounded shadow-only full-deck repairs, common-card-identity coupling, all fixed pilots, separate holdout seeds, audited payment/zone traces and exact-printing exports. Preserve native engines and incomplete-strategy abstention; production selection stays unchanged.
- [x] Stage 4 foundation: opt-in supported own-stack native copying/multiplication, cascade, tutor destinations and resolved Spawn/Scion, with independent event/zone/resource replay. Keep incomplete native strategies and bounded outcomes unknown; no production integration.
- [x] Stage 5: proof-backed native stack compression/continuation and narrowly verified damage outlets; conditional execution and remaining unknowns stay separate from real-game power.
- [x] Stage 6: genuinely new source/Oracle-backed complete shadow challengers, coordinated support, terminal-aware paired evidence, all fixed pilots, fresh holdouts and independent selected-printing/resource/zone/stack/outlet audits. See `GAMEPLAY_STAGE6.md` and the Stage 6 validation report.
- [ ] Stage 6 follow-up: retain production selection; prospectively test earlier supported access and tutor-target/follow-up planning, then manually evaluate shortlisted complete decks. Do not promote a partial-model improvement or a higher spend to a power claim.
- [ ] Stage 3 integration decision: expand native mechanics/pilot coverage, larger prospective holdouts and external evaluation before explicitly reviewing any production feedback hook. See `GAMEPLAY_STAGE3.md` and the Stage 3 validation report.

See [Stage 1 model](GAMEPLAY_STAGE1.md) and [validation](../benchmarks/v12/stage1-VALIDATION.md). Existing PR #2 deployment probes remain unchanged; this stricter foundation is separate.

Stage 2 model and local commands: [GAMEPLAY_STAGE2.md](GAMEPLAY_STAGE2.md). Fixed-deck evidence, limitations and the Stage 3 proposal: [validation](../benchmarks/v12/stage2-VALIDATION.md).

## Pod combo rules and v1.2 execution groundwork

- [x] Preserve the existing standard combo-policy option and all pricing/source/commitment constraints.
- [x] Audit complete/proposed infinite requirements: quantities, commander, zones/states, alternate-face setup, exact mana symbols, actions, resource and outlet review.
- [x] Expose requirements without claiming inventory is executable; record a conditional paid turn-six example separately from unknown earliest/reliable timing.
- [ ] Implement an explicit Pod High-Power opt-in **after** validated complete-deck timing/reliability evidence exists. Two-card turn-six and later infinites must be allowed; reliably fast turn-three-to-five lines belong to B4; unknown stays unknown.
- [ ] Model alternate faces, craft/additional resources, actual stack order, sickness, source expenditure, net loop resources and win conversion without count-based timing guesses.
- [ ] Agree a definition of reliable execution and measure it against the selected deck. Invalidate evidence after relevant swaps or catalog changes.

See `docs/POD_COMBO_POLICY.md` and `benchmarks/pod-combo-VALIDATION.md`. The pod profile is documented, not enabled, and no pod-approved deck is exported yet.

## Coherent investment follow-up after merged PR #1

- [x] Preserve and reprice the reported €108.02 Ulalek deck under one eligible-printing catalog.
- [x] Trace individual-merit, shortlist, finalist, role, source, budget and fixed-mana barriers.
- [x] Evaluate atomic two/three-card packages, including colored engine plus land repair, without a spending bonus.
- [x] Compare full supported-function dominance before the legacy scalar; preserve input functions, exact colorless capacity, commitments and final budget.
- [x] Add guards against unsupported mana/draw, excessive ramp and unsupported high-curve investments; record candidate expansion limits and accepted/rejected outcomes.
- [ ] Calibrate independent/scalable draw, native support and threat capability against actual gameplay and permitted external evaluation. Static dominance is not certified strength.
- [x] Correct combined enter/cast and enter/attack recognition, singleton entry support and top-library eligibility; reserve bounded discovery slots by engine family.
- [x] Separate supported tutor, cascade, copying and cost-reduction capabilities in complete-deck dominance; record exact candidate elimination edges.
- [ ] Find safe outgoing choices and funding/land-repair packages beyond the bounded search, and validate actual draw access and retained strategic engines through gameplay.
- [x] Add bounded coordinated restoration of deficient paths with explicit surplus coverage limits and retained native infrastructure, raw true-colorless output and existing gates.
- [x] Add deterministic separate deployment probes, source/card hashes and per-candidate selection explanations; preserve distinct engine execution channels and separate fixed-candidate replays from fresh generation.
- [ ] Validate deployment probes against gameplay; model life costs, conditional lands, burst/Spawn mana, combat/ninjutsu, sacrifice/death draw and richer sequencing. Current probes do not certify power.
- [ ] Replace the remaining legacy scalar decisions between incomparable surviving strategies only when stronger validated evidence justifies it.

See `benchmarks/restoration-followup-VALIDATION.md` for the latest PR #2 follow-up and `benchmarks/engine-followup-VALIDATION.md` for its prior stage and `benchmarks/coherent-investment-VALIDATION.md` for its initial results. Prior reports below remain historical.

## Current development after v1.1.5

- [x] Preserve uploaded source as a tagged Git baseline and retain Windows launcher unchanged.
- [x] Replace the single investment trajectory with bounded complete-path comparison, including cheaper improvements and unchanged fallback; preserve existing evidence/policy gates.
- [x] Test pair-specific combo rejection, whole-deck support and fixed-land mana preservation, exact-record pricing and non-Ulalek investment scenarios.
- [x] Preserve high-output cheap sustained acceleration and strengthen the existing efficient-ramp floor after reviewing actual card swaps.
- [x] Correct observed draw-step and restricted-removal role false positives with explicit regressions.
- [x] Add request-scoped caching for unchanged selection-limit counts, with equivalent-gate regression coverage.
- [ ] Prioritize activation/loyalty timing, modal/adventure additional costs and whole-board versus single-target protection before treating further internal-score gains as card-quality improvements.
- [ ] Calibrate against measured gameplay and fresh external evaluation. Historical scores remain unchanged; cached-catalog results are not live quotes.
- [ ] Extend the new bounded atomic investment beyond its current frontier and land-repair limits, with realistic mana sequencing.
- [ ] Support and verify the complete current official bracket 1–5 policy; current implementation retains approximate 2–4 profiles.

The user has now supplied a 32,197-record Scryfall catalog and cached community/Spellbook data. Current offline comparisons and limitations are recorded in `benchmarks/budget-search-VALIDATION.md`; prior absence-of-data statements below describe historical releases.

## Status (v1.1.5)

- [x] v0.8.1: repair `find-my-combos` quantity-object POST format and camelCase response decoding (fixtures tested; live backend still unverified in offline sandbox).
- [x] v0.8.2 code: normalize Spellbook `uses`/`requires` with quantities, zones, states, mana requirements and source data; conservative local type/MV/template matching; separate *named inventory*, *template inventory* and *execution (never certified)*.
- [x] v0.8.2 code: save successful API variants to a bounded, source-labeled local library, then propose at most one useful, affordable combo package after core deck roles have priority. The generator does not call Spellbook or require a paid AI provider. Keep existing budget/pricing modes.
- [x] v0.8.2 regression suite: 61 tests passing in build environment, including the existing 54. Source-inspection/synthetic construction tests for Ulalek, Yuriko, Wilhelt and Light-Paws; frozen v0.8.1 engine A/B fixture comparison.
- [x] v0.8.3: **actual user-recorded Spellbook response** supplied for `test2`: 10 included variants, 115 near. Fixed five valid template IDs containing `--34` / `--46` rejected by v0.8.2. Exact Eldrazi MV 4–6/Changeling query handled fail-closed, and a local-only startup recovery from matching old cached requests is implemented.
- [x] v0.8.3: New package scoring rejects off-plan added enablers, favors native commander strategy and existing overlap; UI exposes selected outcome and package members. Recorded offline fixture validation and 67/67 passing tests.
- [x] v0.8.4: repaired genuine user-reported duplicate `Sol Ring` by name-based nonbasic selection and final validation. Current UI lists individual inventory-complete combos separately from deliberately selected package. Same synthetic catalog replay: original v0.8.3 selected two Sol Rings, patched version one. 70/70 automated tests pass.
- [x] v0.8.5: fix duplicated-face names colliding after export (`Sol Ring // Sol Ring` → `Sol Ring`), with both failing-before/passing-after synthetic tests; enforce final exported-name singleton audit, expose running server version and detect already-occupied Windows port to avoid silently using a previous build. 72/72 automated tests pass.
- [x] **v0.8.6 — conservative gameplay-quality heuristics:** separate durable repeatable ramp from Scion/Spawn/Treasure bursts and restricted Powerstone mana; evaluate usable five-color land fixing with tribe, Gate and Cave requirements; reserve practical interaction/draw/commander protection before generic filler. Generate a visible per-deck diagnostic without claiming a certified bracket or gameplay simulation. Added synthetic v0.8.5 A/B reference; 82/82 tests pass. See `benchmarks/v086-VALIDATION.md`.
- [x] **v0.8.7 — High Bracket 3 optimization (experimental):** added Balanced / High power targets (browser defaults to High for B3). High protects dedicated shielding, real spot removal and cheap card advantage through budget upgrades, penalizes weak taxing counters and uses reliable land source evaluation for basic allocation. Preserves combo/singleton/pricing/gc constraints. Real user-supplied v0.8.6 export and one-scan Deckcheck score 23 (middle B3) archived; 87/87 local tests pass on synthetic mechanics fixtures. Independent high-B3 rating **NOT verified**. See `benchmarks/v087-VALIDATION.md`.
- [x] **v0.8.8 — Overlapping package optimization (experimental):** move bounded Spellbook package planning after protected utility floors and before primary-engine fill; greedily rank overlapping noncommander components and actual additional inventory-complete combos. B3 High allows up to 3 proposed packages / 6 new cards while retaining conservative compact-combo policy; B4 optimized allows up to 4 / 8 and can evaluate an on-plan-for-colorless-mana compact engine, not arbitrary unrelated cards. Locks selected components during reinvestment, uses no paid API, and displays network evidence separately from execution certainty. Frozen v0.8.7 generator, local A/B synthetic fixture and 91/91 tests. **Real Scryfall-backed score gain unverified.** See `benchmarks/v088-VALIDATION.md`.
- [x] **v0.8.9 — strategy-balanced selection and castability gate:** reject snow-cost spells without an already selected snow-producing land; differentiate narrow activated-ability counters, soft permission, and general counters; count cantrips separately from card advantage. Enforce whole-deck counter/instant/narrow-response ceilings for typed-cast strategies during initial choice, combo package commits and reinvestment (with role floors preserved). Give card-independent tribal-cast engines additional plan credit. Expose selection diagnostics to the UI and API. Maintain B3 High/B4 limits, recorded combo library, Scryfall budget and singleton checks. Frozen v0.8.8 generator with deterministic A/B on synthetic prices, plus five new regressions: **96/96 tests passed**. Genuine Scryfall-catalog and EDHCheck/EDHPowerLevel improvement not measured. See `benchmarks/v089-VALIDATION.md`.
- [x] **v0.8.10 — whole-deck candidate portfolio (experimental):** preserve the deterministic v0.8.9 constructor as a baseline, then evaluate three bounded full-deck one-for-one refinement paths (cohesion, tempo, resilience) using all 99 cards simultaneously. Explicit penalties for redundant role counts, off-strategy slots and insufficiently supported effects; diminishing returns for overlapping Spellbook inventory matches. Hard gates enforce identical land slots, commander-strategy roles, early mana, targeted removal/shields, budget, castability, Game Changers, Bracket 3 compact-combo policy and singleton names. Report candidate scores and swaps transparently as **internal heuristics, not EDHCheck, EDHPowerLevel or measured game wins**. Frozen v0.8.9 A/B reference, deliberately weak synthetic 99-card adversarial regression, **99/99 passing automated tests** and recorded user-supplied score baselines. See `benchmarks/v0810-VALIDATION.md`.
- [x] **v0.8.11 — evaluation foundation correction:** strict role evidence separates positive draw from cantrips/conditional value; whole-deck support dependency warnings; bounded spell-demand-sensitive land swaps; protected broad-answer/draw/shield floors in late swaps. UI exposes new audits separately from the legacy fuzzy checks. Frozen v0.8.8 reference retained. Real-catalog performance improvement NOT VERIFIED. See `benchmarks/v0811-VALIDATION.md`.
- [x] **v0.9.0 — Community evidence engine:** deduplicated validated source lists, bracket-isolated cohorts, shrunk pair lifts, cross-commander generic staple baseline when sufficient, stable complete-link archetype groups, bounded recurring card packages with evidence/provenance, source page 1–3 choice, UI uncertainty. **Does not yet power automatic deck generation.** 113/113 tests pass on controlled catalogs; live Archidekt and real quality improvements unverified. See `benchmarks/v090-VALIDATION.md`.
- [x] **v1.0.0 — source-backed construction (first stage):** optional bracket-isolated community package seeding with explicit source-deck attribution and protected atomic multi-card commitments. Candidate groups cannot exceed combined singleton, curve, Game Changer, budget, role/selection and snow gates. Public UI supports local-only A/B vs eligible community strategy, and strict fallback. 116/116 tests passing and smoke check passed. Synthetic A/B confirms exports actually differ; land-containing community packages and full independently rebuilt archetypes remain future work. See `benchmarks/v100-VALIDATION.md`.
- [x] **v1.1.0 — strategy-first reconstruction:** multiple independent whole-deck candidates using complete bracket-matched Archidekt source structures or local profiles; card/land joint optimization; robust fallback/A-B against old engine, optional Spellbook package integration, price/legal/name/GC/casting constraints and provenance reporting. This is *not* a demonstrated external power increase. See `benchmarks/v110-VALIDATION.md`.
- [x] **v1.1.1 — one-click public research before generation:** bounded Archidekt discovery, validated source list imports, one source Spellbook inventory check per build, cached replay and explicit offline fallback all triggered by Generate with three core inputs. Manual research is now optional. Does not claim live power certification or an upgrader.
- [x] **v1.1.2–v1.1.3 — pricing integrity:** screen eligible Scryfall printings, distinguish unverified modeled English NM estimates from EN NM CSV offers, enforce full-list budget reconciliation using exact selected printings and provide original-budget + extra regeneration.
- [x] **v1.1.4 — grounded research and timing signals:** source-deck structural screening within automatic Archidekt selection, fractional card-flow evidence, ramp affordability assessment for heavy curves and an optional commander-marked Archidekt category export. No live EDHREC scraping or verified improved power score.
- [x] **v1.1.5 — invest toward the requested ceiling:** post-land complete-deck candidate upgrades with cost-neutral quality evaluation, narrow budget-utilization preference among comparable candidate decks, comprehensive policy gates and transparent estimated-price differences. Upgrades are *not forced* when no credible improvement exists. Correctness tested on synthetic decks; Ulalek real-catalog A/B and external ratings remain open.
- [ ] **Authorized EDHREC data integration:** assess licensed/authorized access. EDHREC public frontend JSON is not a general-purpose licensed API; do not silently crawl it for a competing deckbuilder.
- [ ] **Real integration gate remains open:** Recheck on the user's actual validated `test2` deck and real Scryfall cache; confirm 10 named+template inventory matches from the repaired saved response (actual casting-zone/mana timing still unverified), compare full genuine-card decks at €191 Bracket 3, and inspect actual changes against baseline. The generated Ulalek list and user-supplied Deckcheck screenshots were supplied; no real Scryfall snapshot was supplied to this build environment.

## Additional v0.8.x follow-up

- [x] Add an independent strategy-first constructor and preserve the old engine as an explicit baseline.
- [ ] Calibrate full-deck scoring against genuine benchmark decks and gameplay evidence before certifying improvement.

- [x] Replace the inflated acceleration counter with conservative repeatable-mana reporting and separate burst/Powerstone counters.
- [ ] Extend the conservative snow/mana-feasibility gate beyond {S} to nonland resource prerequisites, alternate mana costs, color timing, and adaptive snow-land selection.
- [ ] Extend ramp analysis to account for tappedness, turn-by-turn timing, hybrid mana and activated-only source spending in draw simulations.
- [x] Initial five-color land access audit with independent land fixtures, including tribe-only rainbow abilities, Gate and Cave dependency.
- [ ] Reproduce gameplay-quality and singleton results with the full real Scryfall snapshot and updated deck export; simulate realistic opening hands and verify bracket power independently.
- [ ] Consider bulk-data backup and one-click export/import to protect against temporary extraction loss.

## Planned releases

- **Next — automated deck evaluation and in-app upgrader:** evaluate community source lists with more reliable local playability evidence, authorize external evaluator automation only when allowed, and let users import their own deck and request a bracket/budget-aware strategy-preserving upgrade with proposed swaps and price deltas. These are **not implemented** in v1.1.1.

- **v1.1 released — independent archetype reconstruction:** up to seven independently built complete lists using full source deck structures or local strategies, with explicit reference-engine fallback. Empirical power calibration remains open.
- **v1.2 — Deeper mechanics + mana/price optimization:** more robust Oracle/Scryfall casting state, simulation of mana sequencing, Cardmarket evidence, and support-prerequisite correctness.
- **v1.2 — Mana and price optimization:** hypergeometric hand/curve evaluation; better colorless and colored-source handling; robust B2/B3/B4 analysis; distinguish Scryfall EUR estimates from user-imported Cardmarket EN Near Mint offers.
- **v1.3 — Gameplay benchmarks:** genuine independently computed gameplay tests and comparisons against MTGOracle.gg; never certify playability based on the generator's own score.
- **v1.4 — Usability/release:** desktop builds, UI refinement and performance hardening.
- **Later — Deck Upgrade Advisor:** analyze an imported real deck, propose affordable, constraint-aware cuts and adds, and retain user preferences.

## Acceptance gates for future work

1. Run the full `npm test` suite and preserve all existing API/UI features.
2. With a genuine cached public Scryfall snapshot, run `node tools/compare-v081-v082.mjs <benchmark-cards.json.gz>` (the script applies to archived earlier versions; use `node tools/compare-v089-v0810.mjs` for the latest synthetic A/B test). Verify deck legality, exact 100 cards, price and bracket policy; inspect actual exported 99 + commander lists.
3. Check `test2` through the normal imported-deck Spellbook workflow. Count named and template matches based on **actual API variants**, not a fixed expectation of 10.
4. Investigate generic replacements and their zone/mana prerequisites in the game rules; static card inventory is not executable gameplay.
5. Record known fixture origins/limitations, not invented price snapshots or claimed live-card benchmarks.

### v1.1.2 pricing integrity checkpoint

- [x] Filter non-playable printings before choosing a lowest observed EUR source.
- [x] Separate Scryfall EUR, modeled EN NM and user-provided EN NM quote snapshot.
- [x] Itemized deck price audit; fail closed on unknown card, missing price or final cap breach.
- [x] Optional actual-cart reference and extra-budget full regeneration with session comparison.
- [ ] Obtain verified live Cardmarket English NM offers and multi-seller shipping where officially available and permitted.
- [ ] Calibrate tiered EN NM estimate against diverse verified per-card quotes before calling it predictive.
- [ ] External real-Scryfall budget and EDHCheck/EDHPowerLevel validation after user refreshes printing provenance.
- [ ] Build durable saved-deck history and in-app guided strategy-preserving upgrade flow.

### Stage 5 native execution (development, version unchanged)

Structural stack compression/continuation and narrowly audited outlet execution remain opt-in shadow tools. Resolve remaining expansion bounds, unknown native interactions and fixed-pilot limitations before a separately reviewed production integration. Pod High-Power timing/reliability policy remains deferred. See `GAMEPLAY_STAGE5.md` and `../benchmarks/v12/stage5-VALIDATION.md` for actual outcomes and limitations.
