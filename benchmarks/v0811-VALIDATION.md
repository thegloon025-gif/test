# CommanderOracle v0.8.11 — Foundation audit and validation

Date: 2026-10-21

## Why this release exists

The user's full Ulalek deck exports and third-party screenshots showed v0.8.10 optimising its own score while losing external power. In one recorded B4 result it gave +40.35 internal utility for **Collective Resistance → Spell Satchel** even though the resulting deck had a fragile, non-proactive plan. The previous app counted 39 cards with positive/repeatable draw and 23 hard answers, based partly on broad Oracle-text matches. The labels implied more reliability than was evidenced. The previously archived v0.8.8 generator has the strongest externally tested **generated** Ulalek result of the releases supplied. It remains frozen at `benchmarks/generator-v088-reference.mjs` and is used as a comparison, not asserted to be globally best.

## Implemented in v0.8.11

- New `src/roleEvidence.mjs` reports distinct *direct positive draw*, conditional engines and cantrip/filtering mentions. Separates broad answers from conditional targeting, and dedicated shields from generic counters. This is heuristic card-text evidence, not play simulation.
- Generic whole-deck dependency checking identifies unsupported cycling/discard payoffs, instant/sorcery-cast payoffs, and artifact-centric payoffs; cards are not excluded merely because they are conditional, but the whole-deck scorer penalizes inadequate support. These tests are card-name neutral.
- The existing optimizer now scores less speculative card advantage and narrow answers, and preserves the existing deck's achievable positive-draw/broad-answer/dedicated-shield counts as swap floors. Its internal score is **uncalibrated and not an external power number**.
- New `src/manaBaseOptimizer.mjs` runs after choosing spells, scores land options against the spells' actual colored-symbol demand, and can make bounded **land-slot** improvements. It preserves 99 cards, land count, budget, nonbasic singleton, the previous colorless floor and spell castability under the existing `{S}` gate. Land-source confidence remains conservative and does not model mana sequencing or activated conditions.
- The UI now displays **evidence-quality role counts**, potential payoff dependencies, and mana-base swaps separately from the legacy broad-matching audit. Existing Archidekt import/discovery, cached Spellbook variants, package selection, Commander brackets, prices and export safeguards are retained.

## Verification and limitations

- Run `node --test --test-concurrency=2 tests/*.test.mjs`.
- Run `node tools/compare-v088-v0811.mjs` for a **synthetic** comparison with the frozen v0.8.8 constructor. All cards/prices in this comparator are invented controlled fixtures; it provides no real power claim.
- No full user Scryfall snapshot is bundled. Neither an EDHCheck/EDHPowerLevel improvement nor a genuine €191 Ulalek B3/B4 deck result can be certified in this environment.
- Need real-catalog tests with Ulalek, Yuriko, Wilhelt and a new commander, plus per-card independent Oracle verification, before claiming improved gameplay quality.
- The current search still starts from one greedy constructed deck and compares bounded refinements. **It is not yet independent multi-seed full-deck construction.** Role evidence and mana optimisation are steps toward that architecture; unresolved game mechanics, timing, castability and real combo execution must still be reviewed.
- The prior external benchmark labels are: **EDHCheck = dark**, **EDHPowerLevel = white**. Curated `test2` scored 6.9 and 6.41 respectively; generated v0.8.8 High B3 scored 6.0 and 5.31, B4 6.0 and 5.76. Scores aren't calibrated between sites.

## Controlled frozen v0.8.8 comparison (synthetic)

`node tools/compare-v088-v0811.mjs` exited successfully. Under both simulated Bracket 3 High and Bracket 4, both references exported 100 cards. The new release selected 8 broad-answer spells versus 3 in frozen v0.8.8, selected zero narrow counters versus 9 (B3) or 10 (B4), and excluded the deliberately unpayable snow-mana fixture that v0.8.8 included. Strict directly positive draw was 8 in v0.8.11 versus 10 in the frozen reference — **not all comparison metrics improved**. The v0.8.11 land stage reported 2 swaps in each synthetic case. These counts use controlled invented cards and are explicitly not EDHCheck/EDHPowerLevel results or evidence of actual higher gameplay power.

## Completed verification in the release environment

- Full **final** test command: `node --test --test-concurrency=2 tests/*.test.mjs`: **104 passed, 0 failed**, including all inherited regression suites and five new foundation tests.
- Local server smoke: `GET /api/status` returned `version: "0.8.11"` and `count: 0`; the HTML entrypoint contained `v0.8.11`. Count zero is expected because the user's local Scryfall bulk catalog is not embedded in this distribution.
- The synthetic frozen-reference comparator completed successfully. The evidence counts above are measurements on that controlled synthetic catalog, not a gameplay power score.
