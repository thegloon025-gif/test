# v1.0.0 — Community-informed construction validation

Date: 2026-10-21. Source: local deterministic synthetic fixtures, prior project benchmarks and user-observed v0.9 research screenshots.

## What was tested

- v0.9 knowledge unit regression: distinct verified creator/deck selection, bracket isolation, uncertain co-occurrence, provenance, staple checks and basic exclusions.
- v1.0 strategy preparation: candidate seeds from one commander and one bracket, source attribution and disabled/insufficient fallback.
- Full 99-card generator: same synthetic cards, same commander, same budget/bracket/power; **community ON and OFF produce distinct exported decks**. Eligible atomic groups survive reinvestment, whole-deck optimization, final canonical singleton checks and EUR cap.
- Combined package constraint boundary: two simultaneous Game Changers do not bypass Bracket 2 zero-Game-Changer policy. The group is rejected without partially mutating the deck.
- Determinism: identical catalogs and community source lists produce identical exports.
- Existing recorded and synthetic mechanical constraints (Scryfall legality, combined names, snow-source, Spellbook prerequisites, mana sources, role floors and Cardmarket price policy) are verified by the cumulative regression suite.

## Findings and limits

- This is **demonstrated construction influence**, NOT demonstrated strength improvement. The synthetic cards are not real card recommendations, and no external EDHCheck/EDHPowerLevel comparisons were executed in this environment.
- The user's screenshot shows eight distinct validated Ulalek Bracket 3 lists from eight creators. There was **no cross-commander staple baseline**, so a v1.0 selection from those lists must remain subject to caution. A source co-occurrence is not a verified synergistic interaction.
- Community package construction currently seeds nonlands only, within a small bounded number of slots. Lands are managed by a separate demand-aware optimizer, not by complete imported land packages. This intentionally does not claim multiple independent ground-up 100-card constructors.
- Real acceptance: generate **Ulalek B3 High, €191** twice with Community ON/OFF on the exact same local Scryfall snapshot; inspect cardlist changes, package diagnostics and strict audit; optionally score both on EDHCheck and EDHPowerLevel. Reserve token-limited Deckcheck for later milestones.

## Automated tests

- **116/116 passing** Node tests (`node --test --test-concurrency=2 tests/*.test.mjs`), no skipped or failed tests; elapsed ~77 seconds in the local runner. The v1.0 construction tests add three test cases.
- Server smoke: `PORT=14285 node server.mjs` responded on `/api/status` with `version: "1.0.0"`, served the page and JavaScript with the community A/B controls and reported the offline saved community deck list.
- The smoke environment had **zero cached Scryfall cards**. Real-catalog generation, public Archidekt discovery and independent external power scores were **not** exercised by that smoke test.
