# v0.8.7 High Bracket 3 target — verification, 2026-10-21

## Input and benchmark provenance

The user supplied a genuine exported **v0.8.6** Ulalek decklist, saved verbatim in `benchmarks/ulalek-v086-user.txt` (100 lines, 1 commander, 37 lands), plus a **single scan** screenshot from a third-party Deckcheck tool showing **23**, categorized as Bracket 3 / Upgraded Casual. This is a user-reported external evaluation, **not a result independently calculated here**, and one scan is not its unlocked aggregate score. A prior v0.8.5 deck had a single scan of 24 categorized as high Bracket 2. Those scores are not calibrated here or guaranteed comparable.

The v0.8.6 exported list demonstrates better generic answer density but still contains a large pile of counters, uneven direct commander protection and mana-base opportunity costs. Lack of a full local Scryfall snapshot prevents reproducing this exact deck at €191 or independently verifying prices, legality, high-Bracket-3 strength or Deckcheck categories.

## Changes

- New optional UI **Power target** for Bracket 3, defaulting to **High** in the UI. Balanced remains available; API defaults to Balanced to preserve backward compatibility. Brackets 2 and 4 require Balanced.
- High modifies ranking to favor low mana-value repeatable acceleration, unconditional affordable interaction, dedicated commander shielding and low-cost real card draw; weak `unless controller pays` counters no longer look equivalent to unconditional counters.
- High explicitly reserves **three direct protection cards**, **three permanent removal cards** and **five cheap card draw cards** when available, before adding primary-strategy cards. Remaining interaction, draw, ramp and curve limits are preserved. The budget reinvestment step may no longer swap these reserved roles away if that would breach the achieved floors.
- High reserves a larger *upper limit* for paid nonbasic land selection, and basics no longer use restricted Scryfall `produced_mana` as proof of reliable colored fixing when allocating lands. Prices remain the installed Scryfall EUR/verified import mode, and game-changer limits are unchanged.
- Generation continues without a paid API; community discovery and Spellbook requests are user-initiated. Existing local combo packages, legality, singleton and budget guards remain.
- New independent **High B3 quality audit** is displayed; heuristic floors are not validated game states or an official bracket estimate. The normal engine can still return a weak deck if the local priced catalog/budget lacks enough suitable cards.

## Tests

- Full Node suite: **87/87 tests passing**, 0 failures (including five new v0.8.7 cases).
- Deterministic, adversarial, **synthetic** catalog comparison (prices are fixture values, not real EUR offers) at Bracket 3: Balanced chose **0** dedicated shields and **0** permanent spot-removal cards; High chose **3** of each. Both kept the mandatory Eldrazi count, an exact 100-card output, singleton constraints, and the synthetic budget.
- Separate tests check that conditional tax counterspells score below hard counters, mismatched target/other-bracket requests are rejected, and a local Spellbook variant remains accepted and reported with execution unverified.
- Local server smoke: `/api/status` and served UI version v0.8.7 checked.

## Still required on user's computer

1. Shut down the previous server; extract v0.8.7 to a permanent folder; migrate full `data/` (including Scryfall card cache and Spellbook variants).
2. Confirm the UI version and the Bracket 3 **High** target, then generate Ulalek at **€191**. Inspect singleton, game-changer policy, price, actual interaction/removal/protection and mana sources. An audit warning is a real limitation to investigate, not an error to hide.
3. Run the new list through the same Deckcheck tool twice, capture the full category detail and compare gameplay evidence, not just headline Bracket 3 designation.
4. Do not report a verified high-Bracket-3 result until independent gameplay and bracket-policy checks support it.

No fabricated real-card prices, no claimed Deckcheck improvement, no paid AI API used.
