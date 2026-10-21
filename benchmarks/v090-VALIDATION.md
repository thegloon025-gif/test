# v0.9.0 — Community Knowledge Engine validation

## Release scope

v0.9.0 introduces a **read-only, locally computed, provenance-backed community research engine**, NOT a replacement for the current greedy generator. Archidekt deck discovery and user-selected imports already existed in 0.8.11; this version extends the statistical quality of the analysis and source-page exploration. All MTG card construction, legality, singleton, budget, and existing saved Spellbook behaviors remain based on the prior generator. Do not infer gameplay-quality improvement from knowledge-engine scores.

## New evidence model

- Restricts cohorts to verified one-commander, 100-card source imports, then suppresses identical source keys and near-identical same-bracket/same-commander lists (96% Jaccard threshold on nonbasic mainboard). Bracket 2, 3, 4, and untagged are separate when a specific bracket is selected; all-bracket mode is intentionally mixed.
- Explicitly filters basic-land Oracle identities passed from the local Scryfall catalog, preventing generic basic-land supply from looking like strategic packages.
- Computes per-card inclusion, 95% Wilson intervals, co-occurrence counts, independence lift, and a sample-size-shrunk lift, with cautious evidence labeling. Supports repeated 2–3-card packages with actual matching source deck keys; **no mechanical combo or causal synergy claims**.
- Builds an optional generic-staple reference using at least six independently deduplicated other-commander decklists spanning at least two other commanders in the same bracket scope. If that baseline is absent, results state unknown rather than inventing generic-card priors.
- Uses deterministic complete-link deck clustering to prevent a single bridging deck from chaining two otherwise dissimilar strategy clusters. Removes universal cards before cluster comparison.
- Includes creator diversity and per-deck provenance (public deck URL, title, author, declared bracket, import date) and cautions when evidence is sparse or dominated by one creator. High-confidence candidate tags require at least eight distinct source lists and multiple known creators.
- Provides manually selected Archidekt search pages 2/3 while respecting 12 previews per search, up to 4 verified selected imports per batch, local caches, 2 s pacing, host-restricted requests and immediate rate-limit stop.

## Automated regressions

- Baseline v0.8.11 tests: 104. Added 9 targeted community tests on source duplicates, card baselines, inclusion uncertainty, source package provenance, declared-bracket stratification, complete-link chain safety, single-creator caution, basic-land filtering and page-scoped imports.
- Targeted checks: `node --test tests/v090-knowledge.test.mjs`, `node --test tests/community.test.mjs tests/discovery.test.mjs`.
- Full suite: `node --test --test-concurrency=4 tests/*.test.mjs`. **113/113 tests PASSED, 0 failures, 0 skips** (clean run; approx. 43.5 seconds).
- Local server smoke: `PORT=4399 node server.mjs`, `GET /api/status` returned `"version":"0.9.0"` and count=0 (expected because no actual user's Scryfall cache is bundled); `/` served the v0.9.0 header, `/api/community/insights?commanderId=test` returned v2 knowledge structure with no sampled decks. JavaScript syntax checks passed.

## Open gates / honest limitations

1. **No live Archidekt integration test** was run in this build environment. Archidekt's unofficial endpoints could change, reject access, or not expose enough declared bracket metadata. Title matches always require commander confirmation during import; public sources are not inherently high-quality decks.
2. **No genuine Scryfall-backed €191 Ulalek benchmark** was available in this environment; no EDHCheck or EDHPowerLevel result is attributed to v0.9.0 because generated decks should be unchanged by inferred community packages.
3. The cross-commander baseline is a rough generic-staple comparison, not a matched playgroup, not the expected quality of a decklist, and not a win-rate metric. Co-occurrence cannot establish mechanical synergy or combo viability. Small or highly correlated samples may mislead.
4. **v1.0 must implement community-informed package-seeded generation** with guarded budget/legality/role constraints and external A/B validation on Ulalek, Yuriko, Wilhelt and an unfamiliar commander. Do not unlock community automation as the default on insufficient or unavailable evidence; preserve a complete offline path.
