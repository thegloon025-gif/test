# v1.1.0 — Independent generator rebuild: test and acceptance report

Date: 2026-10-21. **Not evidence of externally measured game power.**

## Changed construction architecture

- A new `src/strategyFirst.mjs` constructs candidate decks independently; it does **not** use the previous greedy deck as a card-selection seed. Up to 3 distinct, bracket-matched, creator-attributed source-deck skeletons (where present) plus 4 local strategic profiles may contribute candidates.
- Candidate source skeletons influence **spells and mana-base choices** rather than reserving only 2–3 correlated cards. Role-aware construction includes commander engine, repeatable early acceleration, evidence-backed draw, broad answers and shields; it limits excessive three-mana ramp and huge creatures, and checks supporting effects.
- Each candidate contains 99 cards (commander excluded). Hard checks: actual oracle/name singleton, Scryfall Commander legality and color identity, bracket Game Changer limits, mandatory snow costs, price cap, land quota and basic selection-response caps. Bracket 3 High, B2 and B4 have separate profiles.
- Existing locally cached Spellbook engine supplies *proposed* combo groups to the new constructor, which accepts only fully legal, affordable, atomic groups; actual play timing, mana and game-state prerequisites are not certified.
- The v1.0 generator is preserved unchanged as `generateLegacyDeck` and selectable in the browser. It is executed as an independent reference and legacy reporting scaffold. A wholly independent candidate is selected only if it passes hard constraints and is not markedly worse than the legacy deck under one documented local evidence score. The reference is **not a gameplay oracle**.
- The UI reports independent source and local candidates, selected candidate, score comparison against the reference, and adapted source spells/lands. A manually chosen community archetype takes precedence over automatic source selection when it yields a feasible candidate.

## Automated verification

- Six focused v1.1 tests: distinct independently constructed candidate lists, exact 100-card exports, deterministic selection, full source spell/land adaptation, local-only and bracket isolation, manual source selection, B2 vs B4 construction, and atomic proposed Spellbook group handling.
- Historic regression suite continues to verify pricing, singleton/export, DFC faces, SNOW gating, colorless and colored mana, existing Spellbook inventory handling, UI/API references and previous construction paths.
- **123/123 automated Node tests passed** (`node --test --test-concurrency=2 tests/*.test.mjs`); 7 of these directly exercise the v1.1 constructor. Suite runtime ~72 seconds. Tests use **synthetic card data** and the previously supplied recorded Spellbook payload. No full private Scryfall database is shipped or accessible in the sandbox.
- HTTP `/api/status`, `/` and `/app.js` smoke verification checks version `1.1.0` and the new engine selector. A zero-card cache in the sandbox means HTTP smoke cannot generate a genuine card list.

## Outstanding limitations

1. **No proven external power gain.** A new constructor can pass mechanical gates while yielding low EDHCheck or EDHPowerLevel scores. Card-role classification and whole-deck scores remain heuristic.
2. Archidekt imports do not establish objective deck quality. There is no automatic deck-quality evaluation or live external evaluator submission in v1.1. Automated external checking remains a prospective project, subject to site authorization.
3. The initial mana stage is spell-demand-aware but is not a turn-by-turn casting or mulligan simulator; exact timing, fetches, conditional producer states, spell taxes, hybrid mana and color sequencing remain approximate.
4. Source decks can have expensive/unsupported cards. These are not copied blindly; budget and mechanical gates may reject them, producing a local archetype or the explicitly labelled fallback.
5. Optional Spellbook networks are still inventory-level evidence, not verification of battlefield prerequisites or turn of execution. The independent constructor currently inherits candidate lists from the preserved Spellbook-aware legacy engine.
6. The old engine is still executed to produce its reference and proposals; optimizing that runtime is further work. Power objective calibration across multiple real commanders has not been completed.

## User-side acceptance protocol (no Deckcheck tokens)

Run on the same Scryfall snapshot and saved Archidekt imports:

- Ulalek, Fused Atrocity, **€191**, Bracket 3 **High**, construction **v1.1 Strategy-first**, community **ON**.
- Repeat with construction **Legacy v1.0**; repeat with construction **v1.1 Strategy-first**, community **OFF**.
- Verify 100 entries, ≤€191 according to selected price mode, singleton and genuine `{C}` mana; compare source strategy and role-evidence diagnostics.
- Paste each deck into **EDHCheck (dark)** and **EDHPowerLevel (white)**; compare with v1.0 community-ON observed **5.4** and **3.62**, best prior generated B3 (v0.8.8) **6.0** and **5.31**, and curated `test2` **6.9** and **6.41**. Scores are independent website estimates, not win rates.
- When ready, validate other commanders (Yuriko, Wilhelt and an unfamiliar commander). Do not label v1.1 a power improvement until there are actual results across multiple commanders.
