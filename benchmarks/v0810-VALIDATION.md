# CommanderOracle v0.8.10 — Validation and known limits

Date: 2026-10-21.

## Real user-provided external benchmarks (NOT measured by this build)

The user supplied the following *screenshots* and full exports in the conversation. Dark theme = **EDHCheck**; white theme = **EDHPowerLevel**. Treat the websites' different algorithms and import/category discrepancies as limitations.

| Deck and release | EDHCheck /10 | EDHPowerLevel /10 | EDHPowerLevel /1000 | Notes |
|---|---:|---:|---:|---|
| Curated Ulalek `test2` | 6.9 | 6.41 | 507 | 10 Spellbook included combos; bracket 4 in EDHCheck due two-card infinite, bracket 3 in EDHPowerLevel |
| Generator v0.8.8 High B3 | 6.0 | 5.31 | 435 | 4 EDHCheck combos |
| Generator v0.8.8 B4 | 6.0 | 5.76 | 458 | 5 EDHCheck combos |
| Generator v0.8.9 High B3 | 5.7 | 4.11 | 384 | 11 EDHCheck combos; some template-dependent |
| Generator v0.8.9 B4 | 5.8 | 4.44 | 398 | 11 EDHCheck combos |

**This release has no EDHCheck or EDHPowerLevel result yet.** The user has not supplied a full Scryfall catalog snapshot to the build environment. The stored raw Spellbook cache and variant library are useful for parsing regressions but do not substitute for the Scryfall catalog.

## Algorithm and safeguards

The original v0.8.9 deterministic generator creates one playable candidate with its existing Spellbook packages, mana, draw, interaction and protection safeguards. The new `wholeDeckOptimizer` compares that unmodified candidate with three locally constructed full-deck refinements (cohesion, tempo and resilience), using a bounded deterministic shortlist. It scores all 99 cards together for commander-centric synergy, ramp/draw, protective interaction, tempo, unsupported dependencies and diminishing Spellbook coverage. Some catalogs may yield identical candidates or no beneficial swaps; in that case the original generator wins unchanged.

Each proposed swap must preserve 99 noncommander cards, exact land slots, canonical singleton identities, EUR budget, Game Changer constraints, conservative known combo policy, castability under selected snow lands, narrow-counter/instant limits, combo-locked parts, and the achievable floor for each commander strategy target and essential role. The final v0.8.9 singleton/export and legality guards still run after refinement.

The displayed candidate 'score' is **an internal, uncalibrated utility function** (larger is better within one run only); it is **not** EDHCheck, EDHPowerLevel, a bracket judgment, expected win rate or a simulated game outcome. Deliberately limited `scoreWholeDeck` checks use only available static Oracle-text heuristics and recorded Spellbook variants; game-state execution of combos remains unverified. The candidate search does not invoke external services.

## Synthetic comparisons

Run: `node tools/compare-v089-v0810.mjs`.

The comparator preserves the entire v0.8.9 generator as `benchmarks/generator-v089-reference.mjs`. It uses explicitly invented generic card records and invented prices, not real Scryfall or Cardmarket prices. The static synthetic catalog shown in `benchmarks/v0810-synthetic-compare.json` is already strong under the internal objective and therefore may show **zero beneficial swaps**. This is valid behavior, not proof of improvement.

An independent adversarial portfolio regression in `tests/v0810-portfolio.test.mjs` starts with a full 99-card deck intentionally containing 12 unsupported filler artifacts, then supplies useful on-plan alternatives. It requires the new optimizer to improve its internally scored full deck while respecting 100-card, land, EUR, singleton and role constraints. This test demonstrates the optimization path is active; it does **not** establish that users' real Ulalek decks score higher on third-party sites.

## Measured build results

- Full sequential regression run of all test files: **99 tests, 99 passed, 0 failed**. This includes 96 inherited tests plus three new adversarial portfolio tests.
- Server smoke test: `node server.mjs` started, `GET /api/status` returned `version: 0.8.10`, and the root HTML contained `v0.8.10`. Card count was zero because the ZIP deliberately excludes the user's downloaded Scryfall database.
- The frozen v0.8.9-vs-v0.8.10 synthetic A/B fixture produced the **same output score** in both tested brackets (no beneficial swaps). The adversarial prebuilt 99-card regression explicitly exercised real constrained replacements, with a strictly improved *internal* score. These outcomes should not be misrepresented as a measured external power increase.

## Still required

- Generate and inspect real Ulalek lists for €191 High B3 and B4 with the user's actual Scryfall cache; verify marked cards really cast, interact and support the commander. Compare against preserved v0.8.9 and curated `test2`.
- Repeat with real Yuriko, Wilhelt and unfamiliar commander lists, rather than only synthetic catalogs.
- Confirm that UI API version is v0.8.10 and that no old local server is still listening on 4285.
- Evaluate the resulting decks externally **after** manually reviewing deck quality; do not spend third-party analysis tokens on synthetic or obviously invalid decks.
- Stronger unknown casting restrictions, timing and tactical play simulation remain future work.
