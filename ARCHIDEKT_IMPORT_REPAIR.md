# Archidekt Import Repair — v0.7.2

## User reproduction

Public Archidekt deck: https://archidekt.com/decks/26715826/test2

Archidekt reports a 100-card Commander deck, but v0.7.1 imported 96. Its new diagnostics named the exact four excluded card entries, all under primary category `Tokens`:

- Chittering Dispatcher
- Glaring Fleshraker
- Writhing Chrysalis
- Spawn-Gang Commander

These are ordinary castable Eldrazi creature cards. Their *abilities* relate to generating Eldrazi Spawn tokens. Their placement under a custom category named `Tokens` is **not** evidence that those entries are sideboard token cards.

## Root cause

`src/community.mjs` previously used:

```js
const nonDeck = EXCLUDED.test(primary) || defined?.included === false;
```

This unconditionally excluded a category with the name `Tokens`, even if Archidekt explicitly reported that category as `includedInDeck: true`. It confused user-organized strategic labels with deck membership.

## Fix

The importer now stores inclusion as `true`/`false`/`unknown` rather than collapsing missing metadata into `true`. It gives an **explicit** `includedInDeck` value priority. Conventional non-deck category names are a conservative fallback only when metadata is unavailable. `entry.inDeck === false` still excludes an entry.

The change is generic: no commander or card-name exceptions, and no need to rename user categories.

## Verification

- 35 / 35 `npm test` tests passed, 0 failures.
- New fixtures reproduce the four Eldrazi labeled `Tokens` and confirm they are included when `includedInDeck: true`.
- Tests verify explicitly excluded sideboard, maybeboard and token zones remain excluded.
- The live Archidekt API JSON could not be fetched in this environment, so exact results for the supplied URL still need the app-side **Recheck from Archidekt**.

## Upgrade and recheck

Extract the v0.7.2 package, copy the existing local `data` directory, start the app, and click **Recheck from Archidekt** beside `test2`. Recheck bypasses the old cached 96-card import. The desired result is 100 matched and eligible, assuming no other separate issues are surfaced.
