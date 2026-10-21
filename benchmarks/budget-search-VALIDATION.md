# Budget-search validation — 2026-10-21

## Verified checks

- Original v1.1.5 baseline: **147 tests passed, 0 failed** (82.10 s).
- Final source: **156 tests passed, 0 failed, 0 skipped/cancelled** (47.07 s).
- Focused investment/cache regressions: **13 passed, 0 failed**. The seven earlier adversarial cases run against the baseline yielded 1 pass and 6 failures, demonstrating concrete defects; the added high-output-mana case is covered by the final suite.
- Final application/API smoke: static UI assets served, audited 32,197-card catalog loaded, commander search worked, invalid budget rejected, and a real-cache Yuriko B4 request returned 100 cards with exact price reconciliation. Interactive browser rendering and native Windows BAT execution were not available. The BAT file is byte-for-byte identical to the baseline.
- Read-only live Scryfall bulk-metadata GET succeeded through the cloud Node proxy. Archidekt and Spellbook hosts responded. Fresh research/import, full catalog refresh and external evaluator automation were not run; these deck comparisons use supplied caches only.
- Original seven uploaded cache files were verified byte-for-byte against the archive. Data is excluded from Git; the server used a separate working copy. No local user cache was overwritten.

## Reproduction and limits

Input: supplied 32,197-card Scryfall cache, metadata saved 2026-10-21, eligible-printing screening v2, supplied cached community decks and recorded Spellbook variants. Budget **€191** throughout; B3 uses High, B4 uses its existing optimized profile; strategy-first with existing legacy fallback and automatic source selection. No live research requests enter these comparisons. Deterministic selection uses the existing fixed-seed hand diagnostics; these are not gameplay simulations.
Catalog SHA-256: `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`.
Baseline source is `baseline-v1.1.5` / `8544aa9`. The complete eight-case baseline run uses only the equivalent selection-count cache for speed, without changing construction or investment decisions. Its two Ulalek prices/count/audit outcomes match separate unmodified-baseline runs (€190.46 / €113.71); full original-run exports were not retained, so exact list equivalence to that separate run is unverified. Runtime figures were collected with concurrent work and are diagnostic, not a controlled performance claim.
All prices below are **cached Scryfall eligible-printing EUR estimates**, basics assumed owned, shipping excluded; they are not verified English NM offers. All 16 baseline/final outputs have 100 cards, no pricing anomalies and prices within €191. Existing final exact-record audits were used. Historical EDHCheck and EDHPowerLevel scores remain untouched. **No new external scores or measured gameplay-strength improvement are claimed.**

Reproduce: `node tools/compare-budget-search.mjs SOURCE_ROOT OUTPUT_DIR CACHE_DIR`. Use separate directories for baseline and development outputs. Source code, tests and Windows steps: [audit](../docs/BUDGET_SEARCH_AUDIT.md).

## Actual cached-deck outcomes

| Commander | Bracket | Baseline € | Final € | Cards added / cut | Early ramp before → after | Distinct candidate lists before → after | Final selection |
|---|---:|---:|---:|---:|---:|---:|---|
| Ulalek, Fused Atrocity | 3 | 190.46 | 171.21 | 19 / 19 | 16 → 13 | 7 → 7 | source:archidekt:14494014 |
| Ulalek, Fused Atrocity | 4 | 113.71 | 139.28 | 11 / 11 | 18 → 16 | 7 → 7 | source:archidekt:11395308 |
| Yuriko, the Tiger's Shadow | 3 | 81.31 | 25.62 | 2 / 2 | 10 → 10 | 3 → 3 | local:resilience |
| Yuriko, the Tiger's Shadow | 4 | 86.15 | 36.40 | 1 / 1 | 11 → 11 | 3 → 3 | local:resilience |
| Wilhelt, the Rotcleaver | 3 | 187.65 | 143.17 | 5 / 5 | 10 → 10 | 4 → 4 | local:threats |
| Wilhelt, the Rotcleaver | 4 | 187.83 | 143.18 | 6 / 6 | 11 → 11 | 4 → 4 | local:threats |
| Zada, Hedron Grinder | 3 | 57.70 | 57.70 | 0 / 0 | 23 → 23 | 4 → 4 | legacy-fallback |
| Zada, Hedron Grinder | 4 | 58.41 | 58.41 | 0 / 0 | 24 → 24 | 4 → 4 | legacy-fallback |

## Card-level deltas and functional consequences

Card deltas include changes in basic-land quantities; repeated basic names represent additional or removed copies. Role counts are text-based evidence, not guaranteed usable effects. Correcting the draw-step and restricted-removal false positives can reduce reported counts without removing a real draw/answer effect. Early-ramp counts still do not capture deployment timing, mana quantity, color restrictions or required extra mana. Source selection can change lands because independently constructed source candidates compete; lands remain fixed within each investment path.

### Ulalek, Fused Atrocity B3

Deck exports: [baseline](budget-search-decks/ulalek_b3_before.txt), [final](budget-search-decks/ulalek_b3_after.txt). Runtime 123.6 → 93.4 s; local evidence score 174.05 → 179.19 (uncalibrated, not external power).

Added: Basking Broodscale, Blisterpod, Bountiful Landscape, Crib Swap, Deepfathom Skulker, Eldrazi Linebreaker, Exotic Orchard, Gideon Blackblade, It That Heralds the End, Nest Invader, Nightshade Dryad, Path of Ancestry, Plains, Propagator Drone, Spawning Bed, Swamp, Tranquil Landscape, Twisted Landscape, Wastescape Battlemage.

Cut: Arcane Signet, Eldrazi Displacer, Opal Palace, Rogue's Passage, Sifter of Skulls, Sowing Mycospawn, Talisman of Curiosity, Talisman of Dominance, Talisman of Resilience, The Grey Havens, Thespian's Stage, Three Steps Ahead, Ugin's Labyrinth, Urza's Mine, Urza's Power Plant, Urza's Tower, Valorous Stance, Vile Redeemer, Warping Wail.

Functional counts before → after: positiveDraw 3 → 2; conditionalDraw 10 → 10; cantrips 0 → 0; broadAnswers 10 → 8; conditionalAnswers 0 → 2; dedicatedShields 3 → 3.

Unsupported-card warnings: 1 → 1. Inventory-complete Spellbook matches: 12 → 12; execution remains unverified.

Remaining support warnings: Spell Satchel: spell-cast payoff has 5 instant/sorcery spells; repeated activation unproven.

Accepted investment swaps: Titans' Vanguard → Idol of False Gods (+0.08 EUR); Arcane Signet → Emrakul's Messenger (-0.18 EUR); Sowing Mycospawn → Propagator Drone (-1.44 EUR); Eldrazi Displacer → Blisterpod (-0.49 EUR); Bismuth Mindrender → Basking Broodscale (-0.06 EUR); World Breaker → Desolation Twin (+0.00 EUR); Herald of Kozilek → Nest Invader (-0.14 EUR); Talisman of Creativity → Conduit of Ruin (+2.68 EUR); Talisman of Curiosity → Zhulodok, Void Gorger (+40.94 EUR); Snapping Voidcraw → Nightshade Dryad (+0.04 EUR).

### Ulalek, Fused Atrocity B4

Deck exports: [baseline](budget-search-decks/ulalek_b4_before.txt), [final](budget-search-decks/ulalek_b4_after.txt). Runtime 112.5 → 90.0 s; local evidence score 164.41 → 172.51 (uncalibrated, not external power).

Added: Basking Broodscale, Blisterpod, Deepfathom Skulker, Gideon Blackblade, My Precious // Allure of Power, Nest Invader, Parting Thoughts, Propagator Drone, Sea Scryer, Ulamog, the Infinite Gyre, Your Temple Is Under Attack.

Cut: Ebony Fly, Eldrazi Linebreaker, It That Heralds the End, Snapping Voidcraw, Solar Transformer, Sowing Mycospawn, Stone by Sunlight, Thief of Existence, Twins of Discord, Valorous Stance, Warping Wail.

Functional counts before → after: positiveDraw 3 → 6; conditionalDraw 11 → 10; cantrips 0 → 0; broadAnswers 9 → 8; conditionalAnswers 1 → 2; dedicatedShields 4 → 5.

Unsupported-card warnings: 2 → 2. Inventory-complete Spellbook matches: 12 → 12; execution remains unverified.

Remaining support warnings: Spell Satchel: spell-cast payoff has 7 instant/sorcery spells; repeated activation unproven; The Enigma Jewel // Locus of Enlightenment: mana spending restrictions require a separate casting audit.

Accepted investment swaps: Arcane Signet → Kozilek's Command (+6.59 EUR); Akroma's Will → Your Temple Is Under Attack (-14.75 EUR); Sowing Mycospawn → Idol of False Gods (-1.38 EUR); Teferi's Protection → My Precious // Allure of Power (-27.14 EUR); Crib Swap → Parting Thoughts (+0.25 EUR); Eldrazi Linebreaker → Propagator Drone (-0.22 EUR); World Breaker → Desolation Twin (+0.00 EUR); Thief of Existence → Blisterpod (-0.09 EUR); Snapping Voidcraw → Emrakul's Messenger (+0.11 EUR); It That Heralds the End → Basking Broodscale (-0.03 EUR); Path to Exile → Gideon Blackblade (-0.06 EUR); Nightshade Dryad → Nest Invader (+0.12 EUR); Solar Transformer → Zhulodok, Void Gorger (+41.19 EUR).

### Yuriko, the Tiger's Shadow B3

Deck exports: [baseline](budget-search-decks/yuriko_b3_before.txt), [final](budget-search-decks/yuriko_b3_after.txt). Runtime 34.5 → 19.3 s; local evidence score 165.4 → 152.2 (uncalibrated, not external power).

Added: Staff of Compleation, Symmetry Sage.

Cut: Mana Vault, Teferi's Response.

Functional counts before → after: positiveDraw 8 → 7; conditionalDraw 13 → 13; cantrips 0 → 0; broadAnswers 7 → 7; conditionalAnswers 1 → 1; dedicatedShields 3 → 3.

Unsupported-card warnings: 1 → 2. Inventory-complete Spellbook matches: 0 → 0; execution remains unverified.

Remaining support warnings: Spell Satchel: spell-cast payoff has 6 instant/sorcery spells; repeated activation unproven; Symmetry Sage: spell-cast payoff has 6 instant/sorcery spells; repeated activation unproven.

Accepted investment swaps: .

### Yuriko, the Tiger's Shadow B4

Deck exports: [baseline](budget-search-decks/yuriko_b4_before.txt), [final](budget-search-decks/yuriko_b4_after.txt). Runtime 15.8 → 12.6 s; local evidence score 168.4 → 168.4 (uncalibrated, not external power).

Added: Beamsaw Prospector.

Cut: Mana Vault.

Functional counts before → after: positiveDraw 8 → 8; conditionalDraw 14 → 13; cantrips 0 → 0; broadAnswers 8 → 8; conditionalAnswers 1 → 1; dedicatedShields 4 → 4.

Unsupported-card warnings: 1 → 1. Inventory-complete Spellbook matches: 0 → 0; execution remains unverified.

Remaining support warnings: Spell Satchel: spell-cast payoff has 7 instant/sorcery spells; repeated activation unproven.

Accepted investment swaps: Parting Thoughts → Teferi's Response (+10.37 EUR).

### Wilhelt, the Rotcleaver B3

Deck exports: [baseline](budget-search-decks/wilhelt_b3_before.txt), [final](budget-search-decks/wilhelt_b3_after.txt). Runtime 23.1 → 18.0 s; local evidence score 164.14 → 165.82 (uncalibrated, not external power).

Added: Corpse Augur, Graveborn Muse, Mana Cylix, Tsabo's Assassin, Vengeful Dead.

Cut: Boneyard Desecrator, Brain Gorgers, Mana Vault, Qutrub Forayer, Unliving Psychopath.

Functional counts before → after: positiveDraw 3 → 5; conditionalDraw 9 → 8; cantrips 0 → 0; broadAnswers 11 → 10; conditionalAnswers 0 → 0; dedicatedShields 3 → 3.

Unsupported-card warnings: 1 → 1. Inventory-complete Spellbook matches: 0 → 0; execution remains unverified.

Remaining support warnings: Spell Satchel: spell-cast payoff has 2 instant/sorcery spells; repeated activation unproven.

Accepted investment swaps: Beamsaw Prospector → The Soul Stone (+49.96 EUR); Undercity Necrolisk → The Ghoul, Gunslinger (+9.84 EUR); Nim Shambler → Rotlung Reanimator (+16.50 EUR); Boneyard Desecrator → Graveborn Muse (+4.81 EUR); Gavony Unhallowed → Warren Soultrader (+14.78 EUR).

### Wilhelt, the Rotcleaver B4

Deck exports: [baseline](budget-search-decks/wilhelt_b4_before.txt), [final](budget-search-decks/wilhelt_b4_after.txt). Runtime 20.6 → 16.1 s; local evidence score 162.34 → 167.02 (uncalibrated, not external power).

Added: Beamsaw Prospector, Corpse Augur, Gavony Unhallowed, Graveborn Muse, Solar Transformer, Tsabo's Assassin.

Cut: Abattoir Ghoul, Boneyard Desecrator, Mana Cylix, Mana Vault, Qutrub Forayer, Unliving Psychopath.

Functional counts before → after: positiveDraw 3 → 5; conditionalDraw 9 → 8; cantrips 0 → 0; broadAnswers 12 → 11; conditionalAnswers 0 → 0; dedicatedShields 4 → 4.

Unsupported-card warnings: 1 → 1. Inventory-complete Spellbook matches: 0 → 0; execution remains unverified.

Remaining support warnings: Spell Satchel: spell-cast payoff has 2 instant/sorcery spells; repeated activation unproven.

Accepted investment swaps: Mana Cylix → The Soul Stone (+49.92 EUR); Nim Shambler → Graveborn Muse (+4.84 EUR); Undercity Necrolisk → The Ghoul, Gunslinger (+9.84 EUR); Vengeful Dead → Rotlung Reanimator (+16.39 EUR); Abattoir Ghoul → Warren Soultrader (+14.70 EUR).

### Zada, Hedron Grinder B3

Deck exports: [baseline](budget-search-decks/zada_b3_before.txt), [final](budget-search-decks/zada_b3_after.txt). Runtime 25.0 → 15.3 s; local evidence score None → None (uncalibrated, not external power).

Added: none.

Cut: none.

Functional counts before → after: positiveDraw 8 → 8; conditionalDraw 16 → 16; cantrips 1 → 1; broadAnswers 5 → 5; conditionalAnswers 4 → 4; dedicatedShields 1 → 1.

Unsupported-card warnings: 1 → 1. Inventory-complete Spellbook matches: 0 → 0; execution remains unverified.

Remaining support warnings: Ivora, Insatiable Heir: cycling/discard payoff has only 2 cycling cards.

### Zada, Hedron Grinder B4

Deck exports: [baseline](budget-search-decks/zada_b4_before.txt), [final](budget-search-decks/zada_b4_after.txt). Runtime 22.0 → 13.8 s; local evidence score None → None (uncalibrated, not external power).

Added: none.

Cut: none.

Functional counts before → after: positiveDraw 8 → 8; conditionalDraw 16 → 16; cantrips 1 → 1; broadAnswers 5 → 5; conditionalAnswers 4 → 4; dedicatedShields 1 → 1.

Unsupported-card warnings: 1 → 1. Inventory-complete Spellbook matches: 0 → 0; execution remains unverified.

Remaining support warnings: Ivora, Insatiable Heir: cycling/discard payoff has only 2 cycling cards.

## Remaining risks

Actual B4 exports still contain questionable choices: Teferi's Protection → My Precious // Allure of Power changes whole-board phasing to equipment shielding plus a sacrifice-cost adventure; Path to Exile → Gideon Blackblade changes immediate removal to a loyalty-gated effect. Existing role/merit heuristics do not model those tradeoffs adequately. These are explicit unresolved quality risks, not claimed upgrades. Actual exports require gameplay review. Broader candidate diversity, reliable conditional draw, coherent engine support, activated-mana restrictions, early land sequencing, true-colorless availability after casting Eldrazi, exact combo execution and current official bracket 1–5 certification remain incomplete. The selected deck may retain pre-existing unsupported cards; preserving rather than worsening their support does not repair them. Zada exercises an unfamiliar commander and may retain the explicit legacy fallback rather than demonstrating improved strategy classification. Fixed-land one-card search and an 850-card shortlist can miss better package/land investments. Full-catalog generation is still synchronous and can take substantial time.

The strong-early-mana preservation gate was added after an intermediate comparison exposed an unsafe acceleration cut. Intermediate outputs (€167.90 / €170.86 Ulalek B3) are **not** the final validated results in the table above. Do not represent increased local scores as proof of stronger decks.
