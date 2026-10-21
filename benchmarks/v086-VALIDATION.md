# v0.8.6 verification — 2026-10-20

## Scope and provenance

This release is a modification of the user's working v0.8.5 source archive. Existing local Scryfall sync, EUR pricing modes, Bracket 2/3/4 controls, Archidekt workflows, Spellbook offline library/repair, and singleton/export validation are retained. The user's Deckcheck screenshots described a high-Bracket-2 result (score 24 on one scan), with low interaction/protection, dubious land choices and restricted Powerstone mana. This is a **user-reported baseline**, not an external power assessment reproduced in the build environment.

We did **not** have the user's full local Scryfall card catalog, its live prices, or a way to run the full Deckcheck evaluation programmatically. Therefore **no real Ulalek €191 B3 deck result, price improvement, gameplay win-rate change, or new Deckcheck tier is claimed**.

## Shipped changes

- `src/deckQuality.mjs`: independent *heuristic* diagnostics for repeatable early mana, burst Spawn/Scion/Treasure mana, Powerstone generation, removal, protection, draw and land color access. Effects and conditions are derived from Oracle wording with conservative parsing.
- The builder reserves additional **effective** interaction, commander shielding, and low-cost draw before filling tribal needs. Original curve, combo, EUR budget, legality and singleton guards stay in force. Card selection never calls an AI model.
- The five-color mana selection no longer rates a land as five-color fixing merely because its Oracle text mentions "one mana of any color" when it is restricted to unrelated creature types. Gate and Cave utility interactions are treated as conditional, not unconditional fixing.
- A fixed-seed 600-trial seven-card/no-mulligan opening-hand sample reports how often simple resources are *seen* by turns 3–5. It does **not** simulate paying mana costs, playing lands, extra draws or interaction.
- The deck output now reports separate effective/conditional mana sources and what it still needs for a realistic game plan. Unmet quality floors produce warnings; meeting them is **not** proof of actual strength.
- A synthetic v0.8.5 reference and A/B script are bundled to aid repeatable comparisons and future tests. It uses synthetic EUR costs, not a verified offer snapshot.

## Executed checks

- `npm test`: **82 tests pass, 0 fail**, including ten new independently specified regression cases (including two deterministic hand-sampling checks).
- `node tools/compare-v085-v086.mjs` (synthetic Ulalek cards only):

| Metric | v0.8.5 | v0.8.6 |
|---|---:|---:|
| Cards / lands | 100 / 37 | 100 / 37 |
| EUR total (synthetic!) | €16.50 | €16.85 |
| Repeatable early mana | 13 | 14 |
| Effective interaction | 10 | 10 |
| Commander protection | 3 | 3 |
| Accessible draw | 9 | 9 |
| Oracle-dependent unsupported land fixes | 1 | 0 |
| Castable Eldrazi | 27 | 26 |
| Name singleton check | Pass | Pass |

The A/B fixture has generic made-up prices and cards, and is **not** a real-world efficiency or gameplay benchmark. Do not extrapolate its differences to the user's Scryfall installation.

## Known limits and next acceptance checks

1. On the user's real cached Scryfall catalog, run Ulalek at **€191, Bracket 3**, inspect the full output and check for singletons, actual castability and real prices.
2. Look at the new **Gameplay quality audit**: reported ramp should no longer count one-shot tokens or Powerstone generators as unrestricted turn-1–3 mana. It is still approximate (e.g. tappedness, color timing and conditional effects need more mechanics).
3. Verify meaningful protection, interaction and card draw; record the precise cards. A high role count alone does not mean adequate coverage.
4. Run Deckcheck again twice with the resulting actual exported deck and compare its detailed categories, not just a single tier label.
5. Check archidekt/Spellbook imported user data persists across upgrades when the `data/` folder is copied to the new installation.

No paid AI API required. Scryfall cached EUR estimates are not verified Cardmarket EN NM offers.
