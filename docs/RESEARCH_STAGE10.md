# Stage 10 — Automatic research by selected commander (draft)

Every **Research & Generate** action with community research enabled attempts a bounded lookup for the *selected supported single commander*, rather than requiring a pre-imported public deck. This is a research improvement only: production deck selection/scoring is unchanged on this draft branch. The app remains v1.1.5.

## Independent source channels

- Archidekt: search public title matches by full commander name and (only after no verified hits) a comma-shortened title alias. Both searches share a total maximum of 24 deck details. Only actual legal verified commander+99 lists with the declared bracket are accepted into the respective cohort. A title is not proof. Creator and duplicate filters remain.
- Commander Spellbook: a separate `GET /variants/` search for the actual commander card using `card="Name" legal:commander`; it runs even if Archidekt has zero results or fails, limited to two pages of 40. The request is cached locally for 24 hours under the actual commander identity and query; failed or malformed responses are **unknown/unavailable**, never reported as zero variants.
- Existing `POST /find-my-combos` for one saved validated 100-card deck is preserved. The new GET search stores variants as **candidate combos** in the same provenance-preserving Spellbook library. This does *not* certify a 100-card deck contains, can afford, can execute, or wins via any variant.
- Local Scryfall/Oracle records and eligible selected-printing EUR remain the existing source for construction hard gates. Research failure preserves the local engine/saved research and surfaced warning.

EDHREC is deliberately **not** fetched. Its site terms restrict automated access and we have no approved data license/API integration. Only integrate an authorized, permitted EDHREC feed in future.

## Scope and limitations

This is a dynamic **per-request** lookup, *not a background crawl of every commander in the card database*. Commander sets involving partners/backgrounds, commander-specific synergies not containing that commander, all legal color-identity combinations and unofficial/unlabeled community brackets need later review. A direct Spellbook card match is only one subset of available strategic combos. Archidekt uses a title-based undocumented endpoint; broad source coverage is not guaranteed.

Run focused tests: `node --test tests/stage10-commander-research.test.mjs tests/v111-flow.test.mjs tests/v111-auto-research.test.mjs`. The local v1.1.5 starter baseline also ran `npm test` successfully with 152/152 tests. These are mocked local network fixtures; **live Spellbook/Archidekt, Windows BAT, browser and actual PR #2 integration tests are not yet verified**. The review must verify current API response shapes, provenance, rate limits, auto enabled/offline conditions, and complete deck generation before merging.

No release, PR merge, power rating or Pod High-Power activation authorized. See [Stage 10 backlog](https://github.com/thegloon025-gif/test/issues/5) and Stage 9's no-go evidence.
