# v1.1.1 — Automatic Archidekt research-to-generate validation

This release makes the primary Generate action do bounded community research before construction, and checks one eligible source against Commander Spellbook. Existing v1.1.0 strategy-first/legacy engines, export guards, and locally recorded combo library remain in place.

## Scope and limits

- An explicit Generate button triggers online requests if the checked default option and Community ON are selected. Search checks up to 36 previews and 24 deck details, admits at most eight new candidate source lists after legality/commander/bracket/creator/near-duplicate checks.
- The server reuses successfully completed commander/bracket discovery for six hours in one running session. A failed lookup is NOT cached as success; online errors are surfaced and use saved research/local fallback.
- Spellbook checks **at most one** validated matching source per generation request and persists normalized API variants to the library. A source list's combo inventory does not prove that the combos can actually execute or win under correct mana, zones, timing, and interactions. Existing saved combo data is available offline.
- Archidekt bracket tags, estimated prices, source prevalence and mechanical heuristics are not reliable measurements of power or certified official brackets. The importer does not guarantee a deck actually costs the target amount.
- External EDHCheck/EDHPowerLevel scores and Deckcheck are **not automatically obtained**. Deck upgrading is future work.
- Runtime and regression tests use controlled catalog and API fixtures (not a real full user Scryfall snapshot or a claimed live server-to-Archidekt evaluation).

## Tests

See `tests/v111-auto-research.test.mjs` and `tests/v111-flow.test.mjs` for bounded scanning, near-duplicate exclusion, creator diversity, matching commander/bracket verification, rate-limit safety, research-to-generator data handoff, Spellbook one-source bound, offline fallback and six-hour-session reuse behavior. Previous tests cover legality and generator constraints.

**Result:** 131/131 Node tests passed, 0 failed, using `npm test` (~70 seconds). Server smoke returned API version `1.1.1` and correctly served the browser interface and JS with the new Generate action. Real live Archidekt reachability and actual external-power improvements remain unverified.
