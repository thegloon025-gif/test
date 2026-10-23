# Stage 10 — Automatic research for the selected commander

PR #6 is separate from gameplay PR #4 and stacked on draft PR #2. Version stays
1.1.5. Construction objectives, bracket gates and legacy fallback are unchanged.
New research changes the available evidence, not the definition of power. See
[validation](../benchmarks/stage10-VALIDATION.md) for actual coverage, complete
exports, runtime and remaining checks.

A normal **Research & Generate** action attempts commander-specific research
without requiring a saved public deck. Turning research off or choosing community
mode off remains local-only. This supports the existing single-commander
workflow, not partner/background commander sets.

## Independent channels and bounded coverage

- Archidekt: full-name title search plus a comma-shortened alias if no qualifying
  full-name result survives. Up to three listing pages per query, 24 shared
  detail checks and eight new examples. Actual content, single commander,
  legality and declared bracket are checked. B3/B4 and unlabeled lists never
  silently mix. Unknown-bracket previews, source screening, partial failures
  and creator diversity remain explicit. Title/popularity is not strength.
- Commander Spellbook candidates: GET search containing the actual selected
  commander runs even with zero Archidekt results, capped at two pages of 40.
  Live totals are nullable. Pagination evidence determines bounded traversal;
  one page never fabricates the total. Exact named identity, upstream legality
  and spoilers are screened.
- Other color-compatible candidates: independent one-page/40-result query,
  bounded to three named-card slots. Upstream identity, including Spellbook's
  `C` colorless notation, and actual local card legality/colors are checked.
  Unknown cards, foreign commander requirements and off-color/spoiler records
  are excluded. These are **advisory**: `colorCandidates` are stored separately
  and cannot displace constructor `.variants` or automatically enter combo
  packages. Contextual support needs review before future integration.
- Source-deck Spellbook inventory: preserve POST Find My Combos for at most one
  validated matching source. Inventory matches are distinct from discovery.
  Quantities, templates, starting zones, states, mana and published steps are
  preserved. Having the cards is not execution, timing or a win.
- Scryfall: existing local Oracle/color/legality evidence and exact selected
  printing audit remain. Final prices use the selected records and chosen
  pricing mode. Estimates are never relabeled as verified EN NM offers.

The browser separates these channels, dates, cache age, bounded/partial coverage
and stale fallback. Missing/failed research differs from zero verified results.
The source-quality examples and existing price/export controls remain.

## Failure and persistence

Completed GET searches cache one day; partial searches cache ten minutes. Stale
successful data survives a failed refresh with its original retrieval timestamp.
Cache identity/query/schema/scoped variants are revalidated. Older files and the
original combo library are not deleted. A new derived schema avoids trusting
the earlier null-count pagination assumption; existing library reading remains
backward compatible. Corrupt derived snapshots are retried; storage failures
stay explicit.

A later-page failure retains verified first-page candidates as partial. The
client constructs every URL, validates pagination, and never follows arbitrary
hosts or redirects. Actual streamed UTF-8 size caps are 1.5 MB/GET and 3 MB/POST,
with per-request timeouts. GET and POST share provider request spacing.
Same-query concurrent requests coalesce, and single-process library writes
serialize. Provenance distinguishes retrieval time from library write time.
Existing storage limits remain; advisory queries cannot evict known variants.

Archidekt session/search caching and bounded request spacing remain. Busy
Archidekt discovery does not block Spellbook; stale concurrent cohorts cannot
overwrite newer imports. Partial listing errors retain earlier previews.
Archidekt's undocumented endpoint can ignore page size; client preview/detail/
byte caps stay authoritative. API drift/access denials are reported, never bypassed.

## Reproduce

Node 22+, no application dependencies:

```bat
npm test
node --test tests/stage10-commander-research.test.mjs tests/stage10-research-quality.test.mjs tests/v111-flow.test.mjs tests/v111-auto-research.test.mjs tests/discovery.test.mjs tests/combos.test.mjs
start-windows.bat
```

For explicit bounded live validation, use separate scratch/output directories.
The tool copies working state, reads the original inputs only and checks their
hashes. It pairs Ulalek/Wilhelt B3/B4 builds and runs after-only B3/B4 legality/
budget regressions for Yuriko, Zada and Henzie. Only Wilhelt refreshes Archidekt;
other source cohorts are explicitly reused. This takes several minutes.

```bat
node tools/validate-stage10-research.mjs data scratch-stage10 output-stage10
```

This cloud Node 24 host needs ordinary proxy routing with `NODE_USE_ENV_PROXY=1`;
that is not an access workaround or a Windows runtime requirement. Keep original
caches unchanged for the fixed-catalog/price comparisons.

Optional `tools/smoke-stage10-browser.mjs` uses development-installed Playwright/
Chromium with explicitly controlled research responses wrapped around an actual
audited API deck. It is not an application dependency or live browser research
claim. Native Windows launcher/startup behavior still needs a Windows check.

## Remaining boundaries

No EDHREC automation: an authorized license/feed is not established. Its absence
never blocks building. No Moxfield circumvention, background commander crawl,
partner/background semantics, pod activation, gameplay-ranking integration or
new universal score is included. Broad advisory queries may miss larger packages.
Official bracket approximations and incomparable strategy selection remain
existing limitations; candidate counts do not prove stronger decks.
