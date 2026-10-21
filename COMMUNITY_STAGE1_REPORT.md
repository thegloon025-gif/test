# Community Deck Intelligence — Stage 1 Implementation Report

Date: 2026-10-19. Independent CommanderOracle v0.7 experimental branch.

## Implemented

- `src/community.mjs`: strict public Archidekt URL validation, read-only public deck fetch, no cross-host redirects, timeout/429 handling, response cap, conservative request pacing, 24-hour local reimport cache, Scryfall normalized ID matching, correct commander/mainboard/non-deck exclusion, deck acceptance validation, local storage, inclusion/pair/cluster exploratory statistics.
- `server.mjs`: `/api/community/decks`, `/api/community/import` (POST single user-supplied public URL), `/api/community/insights?commanderId=<oracle-id>`. No automatically scheduled harvesting.
- `public/index.html`, `public/app.js`, `public/style.css`: Community intelligence panel, source attribution, import feedback, basic local comparisons and coverage warnings. Existing generator code was not modified.
- `tests/community.test.mjs`: eight tests (safe URL, normalization/exclusion, incomplete/missing handling, 429/private deck cases, repeat-import caching, two distinct archetypes not merged by staples, small sample warnings, schema failures).
- `prompts/`: current Google AI Studio and OpenCode prompts preserve the earlier roadmap.

## Verification

- `node --test tests/*.test.mjs` — 29/29 pass.
- `node --check` of new and changed JS modules — pass.
- HTTP smoke test with user-provided Scryfall benchmark: 32,198 cards loaded, commander lookup Ulalek succeeds, new `/api/community/decks` reports no imports, `/api/community/insights` reports zero samples without fabricated results.
- Live Archidekt GET — NOT VERIFIED. Runtime DNS for `archidekt.com` unavailable.
- Legacy full-catalog deck-generator benchmark — TIMED OUT in this environment. Stage 1 intentionally did not alter the generator; this remains an open performance and deck-quality investigation.

## Limitations & follow-ups

The feature is opt-in diagnostics only. It does not yet inject community data into card selection. The sample statistics are only meaningful for the same commander and are provisional at low deck counts. Clustering uses a lightweight thresholded Jaccard graph and may merge or split related builds incorrectly, especially with sparse or highly similar lists. Basic commander legality checks are not exhaustive; two-commander decks are stored but excluded from stats until partner/background legality can be validated. Archidekt's API is undocumented and can change. No unauthorized scraping or mass collecting is enabled.

Next: test one real Archidekt URL on the user's machine; validate the source schema, import several intentionally selected same-commander public decks; inspect co-occurrence outputs against human knowledge; only afterward consider candidate-ranking integration with sample confidence and mechanical checks. Commander Spellbook remains a separate future milestone.
