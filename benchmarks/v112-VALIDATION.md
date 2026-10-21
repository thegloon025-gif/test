# CommanderOracle v1.1.2 — Pricing Integrity & Budget Regeneration

## Scope

This is a pricing and workflow correction over v1.1.1. The independent strategy-first constructor, Archidekt research, combo library, and old-generator fallback remain in place. **No external EDHCheck/EDHPowerLevel improvement is claimed.**

### Pricing eligibility

- Scryfall's `default_cards` bulk feed contains English card printings (or cards printed only in other languages). The importer reads each printing and retains the lowest **eligible observed EUR** price for each Oracle card.
- Eligible prices must come from paper, non-digital, standard-size, English printings with black/white/borderless borders. World Championship `wc*` editions, gold- and silver-bordered, acorn-stamped, and oversized printings are excluded.
- Gold-bordered printings remain excluded even when Oracle-level legalities say the underlying card is Commander-legal.
- Prints are recorded with source set, set name, collector number, border, language, and finish. The selected printing's matching Cardmarket product ID is retained alongside eligible alternatives.
- Old v1.1.1 caches lack printing metadata. Known World Championship/invalid cached printings have their EUR prices masked on load, but **unknown legacy copies cannot be retroactively certified**. The UI asks the user to re-sync Scryfall for audited pricing and the server blocks Scryfall and modeled EN NM generation from older catalogs.
- Scryfall's EUR price is a market estimate; it is not a verified, currently in-stock English Near Mint listing. "Scryfall eligible printing" therefore does not imply English NM purchasing eligibility.

### Pricing modes

1. **Scryfall EUR** — selected eligible English paper printing's reported EUR price, condition not independently checked.
2. **Modeled EN NM** — experimental four-tier multiplier or floor based on a Scryfall EUR printing. Based on user-supplied `pricing.zip`; no evidence that these coefficients predict all cards; no invented prices when base data is missing; basics assumed owned/free. Never claim verified offers.
3. **Cardmarket EN NM CSV** — existing separate user-provided quote import. Only supplied matching English Near Mint/Mint rows; no silent fallback to Scryfall. Snapshot data is not an authenticated live inventory check.

The final exported 100-card list gets its own server-side priced ledger. Unknown cards, missing prices, sums disagreeing with the generator, or an over-budget total fail the endpoint rather than returning an ostensibly verified deck. Each card includes the selected eligible printing (when synced) and a Cardmarket English NM search URL for user inspection. Shipping is excluded.

### Extra-budget regeneration

On the generated-deck pane the user can optionally enter an **actual cart total** and **extra € above the original ceiling**. Example: original €191, observed cart €160, extra €30 → regenerate with ceiling €221. The observed total is saved only in the current UI session as a comparison note: an aggregate number **cannot reliably replace 100 individual prices**. Both the prior decklist and added/removed names remain available for comparison. A regenerated deck still goes through final export-pricing checks.

### Coverage and known limits

- No Cardmarket live offer lookups, stock confirmation, delivery/shipping estimate, condition verification, or automatic recalibration from a single whole-cart quote.
- No direct empirical benchmark improvement claimed. The user-supplied v1.1.1 EDHCheck B4 deck appeared under-budget in Scryfall EUR while an external card valuation was much higher; printing selection was a plausible but not independently confirmed cause without the original local Scryfall snapshot.
- Budget remains a ceiling; regeneration may select the same deck if it scores highest by current heuristics.
- If copied from an earlier version, `data/` remains usable but requires a Scryfall **Update database** action before its printing eligibility is fully screened. Earlier bulk source is not retroactively trusted.
