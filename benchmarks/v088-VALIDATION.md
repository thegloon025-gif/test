# CommanderOracle v0.8.8 — Package-network validation

Date: 2026-10-21. Version source: v0.8.7 release archive, not a rebuild.

## Corrected evaluator identities and known user observations

The **dark** site is **EDHCheck**; the **white** site is **EDHPowerLevel**. Do not reverse these labels. User-reported observations, without retesting, include:

| Deck / scan | EDHCheck (dark) | EDHPowerLevel (white) |
|---|---|---|
| Generated Ulalek v0.8.7 B4 | 5.3/10, 2 detected infinite combos, labeled B3 | 4.33/10, 393/1000, labeled B3 |
| User-curated Ulalek `test2` | 6.9/10, 10 combos, labeled B4 (early two-card loop) | 6.41/10, 507/1000, labeled B3 |

The white evaluator displayed a card-type total inconsistent with one exported generated deck, so these are **external observations, not an independently reconciled apples-to-apples dataset**. A separate v0.8.6 Deckcheck single scan gave 23 (middle B3). Scores from different services are not interchangeable.

## What the code now does

1. Enforce original ramp/answer/draw/shield reservations, then consider only **locally recorded and validated** Commander Spellbook variants.
2. Use named cards and fail-closed wildcard-template predicates to determine eligible cards; reject spoilers, illegal color identities, unaffordable additions, unsupported cards and excessive or off-plan packages.
3. Rank linked packages by shared **noncommander** components (sharing only Ulalek does not create a link). Reward extra inventory-complete eligible variants, with capped bonuses so a high variant count cannot dominate all utility slots.
4. Plan up to 3 packages / 6 added cards for B3 High; 4 packages / 8 added cards for B4. Recompute each candidate's marginal additions after previous selections. Keep enough slots to fulfill the commander strategy and refuse to compromise size, curve, price, singleton, and saved critical utility roles.
5. Report network counts and separate inventory-complete from game-state or combo-execution verification. The optimizer never says a combo will execute or that the result is officially bracket compliant.

## Controlled A/B regression

`node tools/compare-v087-v088.mjs` builds a synthetic ~500-card fixture with made-up small EUR prices **only for exercising code paths**, not actual Scryfall or market values. The user-provided real Spellbook cache remains represented in `tests/fixtures/ulalek-spellbook-recorded.json` and earlier recorded-repair tests. It does not contain the full Scryfall catalog.

| Bracket | Version | Planned packages | Inventory-complete | Early repeatable mana | Effective interaction | Real EUR estimate |
|---|---|---:|---:|---:|---:|---|
| B3 High | v0.8.7 | 1 | 1 | 12 | 16 | Not measured |
| B3 High | v0.8.8 | 3 | 3 | 12 | 16 | Not measured |
| B4 Optimized | v0.8.7 | 1 | 1 | 15 | 13 | Not measured |
| B4 Optimized | v0.8.8 | 4 | 4 | 12 | 16 | Not measured |

Both versions exported 100 cards within the **synthetic** €191 ceiling and met the fixture commander core quota. The simulated B4 case trades some early mana for protection/answers. This is not a power improvement certification.

## Independent acceptance still required on user's computer

- Retain old `data/` folder, regenerate **Ulalek at €191**, Bracket 3 **High**, and Bracket 4. Check copy-count, mana, exact exported deck, budget, combo coverage and mandatory role warnings.
- Inspect selected packages for actual prerequisites, including specific {C} sources, starting zones, spell casting timing, and realistic ways to convert infinite mana or triggers into a win.
- Score only after checking complete 100-card imports, and record the evaluator/site name: dark EDHCheck; white EDHPowerLevel. No external website was automatically contacted for a score.
- Check Yuriko, Wilhelt and a less familiar commander using real Scryfall records to ensure the generic graph is robust.
- Bracket rules vary over time; Game Changer and compact-combo policies used here are **heuristic approximations**, not authoritative rulings.

The recorded regression fixture and synthetic test outcomes are genuine local observations; the package is **not independently playtest-verified**.
