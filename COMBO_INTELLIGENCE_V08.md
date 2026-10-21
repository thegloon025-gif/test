# v0.8.1 correction

The live `test2` lookup returned HTTP 400. Root cause: request lists were bare strings instead of `{card, quantity}` objects expected by the Spellbook `/find-my-combos` endpoint. Fixed the JSON body, added support for camelCase and nested response lists, displayed field validation errors on 400/422, and added infinite-outcome reporting with upstream totals. Real live results still need to be verified on the user's PC. The expected ~10 infinity lines must NOT be hardcoded or claimed verified without a successful live response.

---

# CommanderOracle Independent v0.8 — Combo Intelligence

## Included in v0.8

- The **Commander Spellbook** `find-my-combos` integration is user initiated. Click **Check combos with Commander Spellbook** beside a **validated** imported Archidekt deck. No background combo lookups or deck scraping.
- Exact deck identity: builds the combo request from Scryfall-verified commander and 99-card mainboard, not from user-supplied raw JSON.
- Shows named-card complete combos and one-card-away suggestions separately, with card lists, prerequisites, steps, effects, missing-card Scryfall EUR estimates and links to Commander Spellbook.
- Explicitly distinguishes **all named cards present** from a **playable/executable combo**. Cards can still require specific zones, mana, timing, counters, and other resources. Spellbook combos with generic templates, spoiled cards or non-Commander legal cards are not reported as complete.
- Optional **24-hour disk cache** (`data/spellbook-cache/`) keyed by the deck's exact cardlist. One request per user click, with polite request spacing and clear errors for 429, 400, and schema changes.
- Community insights report the actual distinct-card and repeated-pair counts rather than fixed 150-item display ceilings. A separate exploratory **above-independence pair lift** leaderboard helps move ubiquitous staple pairs out of the main synergy list; no claim of causal/mechanical combo proof.
- Old generator, budgets, bracket filters, Cardmarket import mode and V54 source references are unchanged.

## How to use

1. Extract into a **new** folder; copy `data/` from v0.7.4 into it. Do not merge application source folders.
2. Run `start-windows.bat` (Node.js 22+). Your imported Archidekt decks should be available.
3. Under **Saved community decks**, click **Check combos with Commander Spellbook** for a verified deck.
4. Read **Known combos** below the community insights. Names in the deck do not guarantee a combo can actually be executed.
5. If the online request fails, the app explains whether the API refused it, rate-limited it or returned an unexpected shape. No zero-count results are fabricated after failure.

## Validation and limits

- **51 passing Node tests** including eight new combo and lift tests.
- Local server and HTML smoke tested. The sandbox's DNS cannot access `backend.commanderspellbook.com`: **live upstream request/schema is not yet verified**. The tested Find My Combos request has string arrays for `commanders` and `main`. If Spellbook's actual API expects a different request format, the UI will report an HTTP 400/422 and that format will need to be adjusted against its current Swagger schema.
- The cached Scryfall catalog supplies EUR estimates only; no verified Cardmarket English NM listing prices are claimed.
- No automated combo inclusion or card swapping. That belongs to a future, separately validated, budget/bracket-aware construction milestone.
- This is NOT independent multiplayer game simulation or confirmation that a combo is rules-executable.
- Source attribution: https://commanderspellbook.com/about/ and API docs https://backend.commanderspellbook.com/schema/swagger/.
