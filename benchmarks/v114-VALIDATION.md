# v1.1.4 validation — scoped release, not EDH power certification

## Starting point

Frozen v1.1.3 user benchmark: Ulalek High B3, €191 cap, CommanderOracle eligible-printing estimate €182.50; external Archidekt estimate €180.88. This release does not reproduce the real Scryfall catalog or external third-party power ratings.

## New behavior

1. Automatic Archidekt candidates receive structural source evidence from *validated* local catalog identities: early repeatable/land ramp, reliable/conditional draw, interaction and shielding, land count, expensive curve, missing identities and unsupported dependencies. This changes ranking among otherwise eligible sources; it does not call an external power oracle or assert a source deck is strong.
2. Strategy-first construction keeps bracket/budget/legality/printing/singleton gates, and uses a stronger premium for repeatable mana <=2 MV and fractional evidence for expensive/conditional draw. It does not automatically shorten an Eldrazi mana curve.
3. New output mode marks the commander's card with `[Commander]` for Archidekt text imports. The existing plain list is unchanged; Archidekt may still require the user to designate a commander after import.
4. No EDHREC auto JSON acquisition: public terms restrict automated gathering for competing websites without permission. No live Cardmarket offers or automated EDHCheck claims.

## Verification performed

- Focused new/source/strategy tests: 14 assertions/subtests passed across `v114`, `v110`, `v111-auto-research` test files.
- Additional existing pricing and import/construction regression files passed: 32 tests covering printing-price identity, end-of-deck budget verification, modeled EN NM, v0.9 community knowledge, v1.0 package construction, v1.1 research-to-generate flow, v0.8.6 hand availability, and v0.8.9 selection limits.
- Total verified **46 passed across 11 individually selected test files**; full historical suite not certified. An older `combo-construction.test.mjs` hangs after the first two subtests in this environment, and a separate heavy `engine.test.mjs` also did not finish within the individual timeout. This is a runner stall, not a claimed passing result.
- `node --check` for server, UI and strategy-first engine; server smoke HTTP status version 1.1.4, current HTML version and new export control.

## Known limits

- No turn-by-turn casting simulation; opening-hand sampling is still simplified.
- Source structural evidence is a local heuristic, not playtest wins, and Scryfall Oracle classification may misread complex cards.
- Existing old-cache printing eligibility rules still apply; if previously refreshed with v1.1.2/1.1.3, no new bulk download is required.
- No observed score gain claimed. Run the user benchmark `Ulalek / €191 / B3 High`, plus B4, and compare both ratings, real budget estimates and deck structure against v1.1.3 before calling the version better.
