# v0.8.2 build validation — synthetic tests, not a real-card benchmark

Performed on 2026-10-20 with Node.js 22.16.0 and the **uploaded v0.8.1 source ZIP**. No bundled Scryfall catalog or local `data/` directory was present in the ZIP. No live upstream access was possible (DNS resolution failed for backend.commanderspellbook.com, api.scryfall.com and archidekt.com).

| Evidence | Result | Scope |
| --- | --- | --- |
| Baseline v0.8.1 `npm test` | 54/54 passed | original ZIP |
| v0.8.2 `npm test` | 61/61 passed | original tests + seven new fixture tests |
| Ulalek, Bracket 3, €191 | baseline €8.25 / v0.8.2 €9.99 | **synthetic fake-price** card catalog only; *not* the requested real-card budget benchmark |
| Ulalek actual generated synthetic deck | 100 cards, 37 lands, early acceleration 26 baseline / 24 new | inspected exported text/uniqueness/legality, template assignment, 1 local combo inventory match and explicit `executionVerified: false` |
| Ulalek optional package | 2 new cards: `Kozilek's Unsealing` and synthetic `Eldrazi combo partner`; a separate synthetic Eldrazi MV 5 spell satisfies template | fixture data; *not proof these form a real Spellbook combo* |
| Yuriko, Wilhelt, Light-Paws | 100-card synthetic lists within €191; every noncommander spell checked against synthetic catalog/Commander color identity | **synthetic only** |
| Cardmarket verified English NM | not tested with offers | no seller/offer dataset supplied |
| Live Spellbook `test2` count of 10 | **not verified** | no live API response or independently captured fixture |
| Real Scryfall snapshot v0.8.1/v0.8.2 comparison | **not run** | genuine full catalog absent |

The A/B reference engine is frozen as source in `benchmarks/generator-v081-reference.mjs`. To execute a genuine Scryfall benchmark after downloading the catalog locally, run `node tools/export-benchmark.mjs` per its documented arguments to export a snapshot, then `node tools/compare-v081-v082.mjs <path-to-snapshot.json.gz>`. The comparison tool fails closed if fewer than 10,000 records are supplied and writes full decklists and legality checks.

Caution: simulated tests use invented cards/prices expressly for testing invariants. There are no fabricated actual card or pricing claims in this report. Combo inventory coverage does not verify that spells can be cast from required zones or that a player can produce required mana.
