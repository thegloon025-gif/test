# v1.1.5 validation — quality-first budget investment

## Motivating user evidence

Ulalek €191 v1.1.4 generated B3 at €103.09 and EDHCheck 5.6, B4 at €71.77 and EDHCheck 5.9. The user expressly wants the app to maximize deck quality **using the available budget**, rather than minimizing deck cost. These are user-provided historical screenshots, not reproduced tests in this build environment.

## New acceptance tests

- `tests/v115-budget-investment.test.mjs`: 4 tests; a synthetic, affordable higher-quality upgrade consumes substantial budget headroom, a €240 candidate is rejected under a €90 cap, additional spending is not forced without utility improvement, committed Spellbook components are immutable, and a Bracket 3 candidate cannot introduce an inventory-complete recorded two-card infinite.
- 11 related test files (prior v1.1.x construction, printing reconciliation, research, evidence and v0.8.9 limits) passed: **53 tests, 0 failures** under Node's bounded-concurrency test runner.
- Source card values in the synthetic fixture are intentionally invented and must not be interpreted as current European marketplace prices or EDH power ratings.

## Limits

- Optimization is greedy and bounded: up to 16 legal positive-quality single-card replacements per complete deck, with an 850-card shortlist. It does not prove global optimality, does not guarantee spending all money, and does not yet refine lands.
- Previous Scryfall printing eligibility and exact-card final price verification remain in force. Scryfall EUR is **not** verified Cardmarket English Near Mint. User should A/B test real Ulalek €191 B3 High and B4 and send actual price and free-site power results before declaring gameplay gains.
