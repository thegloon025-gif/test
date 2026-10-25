# Stage 12 — Free local commander recommendation adapter (draft)

Stage 12 is an **optional source adapter**. It accepts an **already obtained, user-supplied EDHREC-style commander JSON file**; there are NO automated requests to `json.edhrec.com` or `edhrec.com`, no Apify dependency, no Python dependency and no background scraping. Bracket choice, Scryfall pricing, source spines, hard gates, production card selection and v1.1.5 remain unchanged. PRs #2, #4 and #6 are draft/unmerged.

The endpoint `https://json.edhrec.com/pages/commanders/{slug}.json` has been described publicly by community tools, but it is **not a documented, authorized public API**. [EDHREC Terms](https://edhrec.com/terms) prohibit automated queries without separate authorization. Publicly sold scrapers do not establish permission for automated consumption. This code does NOT implement an online EDHREC collector. An officially licensed data feed can later implement a separate provider without changing the rest of this adapter.

## Import a local snapshot

Once you have a file you are entitled to use, run in Node 22+ from the repository root:

```bat
node tools/import-edhrec-json.mjs --commander "Wilhelt, the Rotcleaver" --file "C:\\Users\\Me\\Downloads\\wilhelt.json"
```

It expects the conventional `container.json_dict.card.name` and `container.json_dict.cardlists[].cardviews` shape. Commander identity must match exactly after Unicode/space/case normalization. The importer rejects malformed/empty/oversized data and writes a local hashed-name file under `data/edhrec-imports/`. It never sends an HTTP request or overwrites the original catalog/community/Spellbook caches.

On the next `Research & Generate` (or local generation), a report line discloses whether imported recommendations are available. The visible research section shows count, import age and a few descriptive examples. Neither the imported card rankings nor inclusion/synergy values enter the production ranking objective at this stage. Missing/corrupt imports do not block generation.

**Important provenance and numeric semantics:**

- The import timestamp means *when you loaded the file*, NOT when EDHREC collected it.
- `num_decks` is a count, not a percentage. An inclusion fraction is reported only when both numerator/denominator are present and valid.
- EDHREC `synergy` is relative community frequency, not playable payoff, win chance or official bracket power.
- Duplicated cards across categories are one distinct suggestion with multiple category tags. No card is incorrectly counted as both independent data points.
- This import is not guaranteed to contain all cards, all themes or partner/background commander combinations, nor any bracket-specific data.
- Original imported snapshot is not committed or redistributed. Git only contains tests, code and fixture-shaped examples.

## What remains for Stage 11 and later

The real full-deck quality bottleneck remains `local:engine` versus source-informed Wilhelt B3 strategy selection (legacy score differs by ~0.32), not absence of research. Stage 11 must evaluate coherent complete decks with independent manual comparisons, and if licensed inclusion/synergy data is available later can use it as **one attributed source of evidence**, not price, card popularity or combo-count merit. Keep a separate review for any future integration of a live licensed EDHREC provider.

Test: `node --test tests/stage12-edhrec-knowledge.test.mjs`; then `npm test`, Windows launcher and browser verification before considering any merge. No unverified claim of new deck strength, authorized endpoint access or production integration.

## Integration validation fixes

Schema 2 retains category-specific observations when statistics conflict; no
first-category statistic is promoted as a merged cohort. Examples are sorted
alphabetically and explicitly not ranked. Legacy schema-1 files are read by
rebuilding recommendations from validated category observations, never trusting
the persisted derived suggestions. Duplicate identical observations within a
category are omitted. Numeric strings, nonfinite values and invalid fractions
do not become percentages.

Imports use unique exclusive temporary files and atomic replacement; failed
writes preserve the prior snapshot. Reads allocate at most 3 MB + 1 byte, reject
oversize/corruption and validate commander and dates. Missing optional data does
not block generation. `--retrieved-at "2026-10-01T00:00:00Z"` optionally records
an explicitly supplied source date; otherwise source age is unknown regardless
of how recently the file was imported. A user-supplied date is not independently
verified. Run CLI commands with quoted Windows paths containing spaces. Native
Windows replacement semantics still require user-side verification.
