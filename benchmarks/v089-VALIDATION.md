# CommanderOracle v0.8.9 — validation and real-world limitations

Date: 2026-10-21. Based on the **actual v0.8.8 release ZIP**. `benchmarks/generator-v088-reference.mjs` contains the frozen predecessor generator with imports pointing to shared current support modules; it is useful for controlled regressions, not a byte-for-byte entire-app comparison.

## User-provided baseline (do not reverse evaluator names)

**Dark = EDHCheck. White = EDHPowerLevel.** User screenshots show:

| Deck | EDHCheck (dark) | EDHPowerLevel (white) |
|---|---|---|
| v0.8.8 generated Ulalek **High B3**, €191 input | 6.0/10; 4 listed combos; tool marked B2 | 5.31/10; 435/1000; tool marked B2 |
| v0.8.8 generated Ulalek **B4**, €191 input | 6.0/10; 5 listed combos; tool marked B2 | 5.76/10; 458/1000; tool marked B4 |
| User-curated `test2` (earlier scan) | 6.9/10; 10 listed combos; tool marked B4 | 6.41/10; 507/1000; tool marked B3 |

These are **user reports**, not new test outputs. External classifiers disagree on bracket policy. EDHPowerLevel displayed inconsistent land/nonland tallies for some imported decks, so category statistics are provisional. No additional scans were requested or consumed by this development.

The v0.8.8 B3/B4 exports contained **Arcum's Astrolabe** despite no snow-producing lands, plus repeated narrow activated-ability counters and many incidental one-card cantrips. They are the input problems targeted by this patch. The updated generator avoids asserting any spell is playable merely because it passes these partial checks.

## Local source changes and test coverage

- `src/selectionPolicy.mjs`: conservative snow-cost feasibility. A spell face requiring `{S}` is blocked unless the chosen land set contains a mana-producing snow land. A modal two-face card is not blocked merely because one castable face needs snow; if at least one castable face does not, the conservative gate does not claim that face uncastable. Support for snow production from cards not in the land base remains open future work.
- Interaction: general and narrow counters are distinguished; typed-cast strategies cap overall instants at 20, total counters at 4 (B3) / 5 (B4), and narrow counters at 2. Generic engine slots, true protection and draw floors are still preserved; non-typed-cast spell-heavy commanders do **not** receive the same instant ceiling.
- Card advantage: one-shot "draw a card" cantrips are not credited as additional cards; cards with multiple or repeatable draws are ranked separately.
- Separate final-export API/UI diagnostics on the above limits. Legality, budget, multiple combo packages, singleton validation and locally cached community metadata remain.
- Unit tests cover the supplied real-world snow/counter cases via independently hand-written Oracle-style text, both B3 and B4 final exports, deterministic repeats, and combo-library proposals; they use **synthetic prices**.

`npm test`: **96/96 passed** in this build environment. The `test2` Spellbook fixture regression is included in the suite. Server/UI smoke tests must be reported from actual run outputs; unit tests alone do not prove user-play power.

## Controlled synthetic comparison

Run `node tools/compare-v088-v089.mjs`. Exact output is saved to `benchmarks/v089-synthetic-compare.json`. A deliberately adversarial catalog with fictional names and prices tests both policies on precisely the same entries. These are **not** real card prices, live API results, EDHCheck/EDHPowerLevel scores, or simulated turn outcomes.

| Bracket/version | Instants | Counters | Narrow counters | Unpayable `{S}` spells | Typed-cast engine count | Total cards |
|---|---:|---:|---:|---:|---:|---:|
| B3 High v0.8.8 | 25 | 9 | 9 | 1 | 25 | 100 |
| B3 High v0.8.9 | 19 | 3 | 0 | 0 | 27 | 100 |
| B4 v0.8.8 | 26 | 10 | 10 | 1 | 25 | 100 |
| B4 v0.8.9 | 19 | 5 | 0 | 0 | 26 | 100 |

Tests maintained the synthetic budget and mana/protection requirements. Reduced reaction counts reflect intentional tradeoffs, not necessarily improved win probability. The different versions share support functions such as `mechanics.mjs`, so this is a generator-policy A/B, not a fully isolated release environment.

## Still needed for acceptance

1. Retain your v0.8.8 `data/` directory; regenerate **Ulalek at €191, B3 High and B4** on the genuine cached Scryfall snapshot, preserving the same variant library.
2. Examine actual 100-card exports for Arcum's Astrolabe, unsupported cards, the count of Eldrazi spells, functional protection, meaningful draw and legitimate combos. Confirm the program's **Selection safeguards** line and real spell issues.
3. Inspect **Yuriko, Wilhelt and an unfamiliar commander** with genuine card pools. Synthetic past tests alone cannot certify universality.
4. Only if promising, use an external EDHCheck/EDHPowerLevel scan; report them by their corrected names. Do not claim high-B3 strength or compare different tools' numerical scales as equal.
5. Retain distinct Scryfall EUR estimate and independently verified Cardmarket EN Near Mint pricing provenance. No Cardmarket verification was performed here.
