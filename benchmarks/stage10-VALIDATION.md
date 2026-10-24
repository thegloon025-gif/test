# Stage 10 — Commander research, coverage and actual construction

**Research coverage now works without manual deck imports.** Live Wilhelt
research obtains eight verified B3 sources and eight verified B4 sources, plus
35 commander-containing Spellbook candidates. The original cache had neither.
The browser separates candidate discovery, source-deck inventory, advisory
color-compatible suggestions and local card evidence, with retrieval dates,
cache age and honest unknown/partial/offline status.

**This does not establish stronger decks.** Wilhelt B3 still selects €102.06,
despite affordable complete source candidates. Wilhelt B4 changes from €97.18
to a €181.80 source-backed list, with useful native additions but material
losses. It is a concrete manual benchmark, not a proven power improvement.

PR #6 stays draft on `codex/stage10-any-commander-research`, based on draft PR
#2 separately from gameplay PR #4. No PR is merged or released, version remains
**1.1.5**, and Pod High-Power remains inactive. Production ranking/scoring,
standard policy, selected-printing pricing, legacy fallback and Windows launcher
are unchanged. New live research deliberately changes construction inputs.
Historical external scores and frozen gameplay-branch archives are untouched.

## Review and reproduction

Review implementation `a9f9ee7`, provider cooldown/auditor follow-up `cdb4e04`
and display-age correction `a69b4e2` separately from benchmark evidence. Read
[behavior and Windows commands](../docs/RESEARCH_STAGE10.md), [live requests and
complete matrix](stage10/validation.json), [independent audit](stage10/independent-audit.json),
[full tests](stage10/tests.json), [actual additions/cuts](stage10/deck-differences.md)
and [Wilhelt candidate decisions](stage10/wilhelt-selection.json).

The full branch baseline is **200/200**; final **216/216 tests pass**, not the
starter-only 152 tests previously reported in PR #6. This research branch is
stacked on PR #2; it does not contain PR #4's separate 349-test gameplay tree.

## Real API findings and fixes

- Spellbook's live variant response contains **count: null** and a pagination
  link. The initial slice incorrectly substituted one page's length as the
  total and stopped. Traversal now validates pagination and constructs its own
  bounded requests. Unknown totals remain unknown; no arbitrary host/redirect
  is followed. A final-code [Ghave live probe](stage10/pagination-live-probe.json)
  retrieves **80 candidates in exactly two successful pages**, with total
  unknown and coverage explicitly truncated.
- Archidekt ignores the requested small page size in the observed response,
  returning 60 records. Client preview, page, detail and byte caps remain
  authoritative. Missing-bracket records are counted/excluded. Partial listing
  failures retain earlier previews. Full-name discovery has a bounded alias
  fallback tested with controlled fixtures; the live Wilhelt run did not need
  that fallback.
- Live Spellbook Commander legality uses booleans, and colorless identity is
  `C`. Both are handled. The [colorless query probe](stage10/colorless-live-probe.json)
  returns HTTP 200 with C identities. Exact quoted-name research also works:
  Henzie returns 24 named-commander candidates.
- A later-page failure retains known first-page candidates as partial. An
  expired cache survives a failed refresh with its original retrieval date.
  Malformed schemas, denied access and failures never become certified zeros.
  Completed/partial query TTLs are one day/ten minutes. Older derived files and
  the original library remain; new cache metadata is validated before reuse.
- GET and POST share pacing. Retry-After/public-access denial blocks additional
  provider requests without waiting out a long blocking sleep. Negative fixtures
  cover this, including a multi-day Retry-After. Actual rate limits were not
  intentionally provoked. Streamed byte caps, scoped cache checks, concurrent
  query coalescing and serialized library writes have regression coverage.
- Source-deck inventory checking remains separate from commander discovery.
  Cached POST provenance uses the original retrieval timestamp, not today's
  read/write date. Archidekt being busy does not suppress independent Spellbook
  work or allow an older cohort to overwrite a newer import.

No EDHREC scraping or undocumented JSON access is added; authorized data access
has not been established. No background index of every commander is run.

## Inputs, scope and evidence boundaries

Original **32,197-card** catalog, 29 saved public sources and Spellbook caches;
catalog SHA256 `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`
is recorded in the machine manifest. All original file hashes pass before/after. Research/cache
writes go to a disposable copy. No catalog refresh, user-cache overwrite or
catalog redistribution occurs. Prices are the same exact selected-record
**Scryfall EUR estimates**, not verified Cardmarket English NM offers.

The explicit 2026-10-24 validation runs live GET scopes for Ulalek, Wilhelt,
Yuriko, Zada and Henzie, B3/B4. Only Wilhelt refreshes Archidekt; other source
cohorts are explicitly reused, including their missing coverage. At most one
eligible source deck per action receives Find My Combos; empty cohorts do not
prevent commander discovery. The matrix records **56 HTTP calls, all 200**.
Separate small API/pagination probes are not extra deck-comparison samples.

Direct queries cap at 2×40 records; the other-color query caps at 1×40 and three
named-card slots. Other-color results must pass local named-card legality and
identity checks and exclude foreign commander requirements. Templates and
execution still need review. These suggestions are **advisory**, stored outside
constructor `.variants`; they neither evict known variants nor force generic
loops into decks. Direct commander-containing variants likewise still need
catalog/color/template/bracket checks before construction, not just a name hit.

Paired builds use the same catalog, printings, ceiling and bracket, with original
versus updated research. This deliberately changes a bundle of community and
combo evidence; it is not an isolated causal attribution to one channel. Live
service inputs vary over time. Exact working snapshots remain in disposable
scratch, while Git retains compact provenance, hashes, final selected records
and exports, not a full copy of the user's database.

**Measurement disclosure:** the matrix process imported implementation
`a9f9ee7`; its startup source hashes are pinned. The final provider follow-up
changes only rate/auth failure handling; all measured responses were 200, so
those guards were dormant. Display-age correction is separately browser/unit
tested. Early harness wiring for B4 power-target/startup-community preparation
was corrected before the final matrix; incomplete earlier runs are not extra
samples or a claimed second experiment. The final harness follows actual API
community preparation and local cached-library repair. No favorable deck,
pilot, website score or seed was selected after outcomes.

## Observed research coverage

Counts are retrieved candidates, not complete/executable combos or strength.
All broader color queries return 40 retained suggestions and explicitly hit
bounded coverage; totals remain unknown. B4 reuses each commander's fresh query
cache with its original date. Cached source counts are not fresh Archidekt
searches, and zero cached sources is not evidence none exist online.

| Commander | Commander-containing candidates | B3 verified sources | B4 verified sources | Source acquisition |
|---|---:|---:|---:|---|
| Ulalek | 39 | 15 | 13 | Existing frozen cache |
| Wilhelt | 35 | 8 | 8 | Live, eight distinct creators per cohort |
| Yuriko | 4 | 0 | 0 | Existing cache only |
| Zada | 10 | 0 | 0 | Existing cache only |
| Henzie | 24 | 0 | 0 | Existing cache only |

Wilhelt B3 checks 24 details/18 eligible lists; B4 checks 12/11. Both searches
observe 122 unlabeled preview entries across bounded pages; these are not
certified distinct decks and none is silently admitted as B3/B4. Creator labels
and structural heuristics do not establish official bracket compliance or power.

## Actual complete exports and exact budgets

Every export has exactly 100 cards including commander, singleton/color/format
checks and exact eligible-printing reconciliation. The independent audit checks
**1,400 selected-printing slots**, five adapted source-spine instances, all ten
post-research policy checks against the final known library, and protected core/
pricing/launcher hashes. No newly discovered conservative-policy violation is
found in the four before lists either. These checks are not official rulings.

| Commander / bracket | Before export and EUR | After export and EUR | After unused / €191 |
|---|---|---|---:|
| Ulalek B3 | [174.24](stage10/ulalek-b3-before.txt) | [174.24](stage10/ulalek-b3-after.txt) | 16.76 |
| Ulalek B4 | [173.88](stage10/ulalek-b4-before.txt) | [173.88](stage10/ulalek-b4-after.txt) | 17.12 |
| Wilhelt B3 | [102.06](stage10/wilhelt-b3-before.txt) | [102.06](stage10/wilhelt-b3-after.txt) | 88.94 |
| Wilhelt B4 | [97.18](stage10/wilhelt-b4-before.txt) | [181.80](stage10/wilhelt-b4-after.txt) | 9.20 |
| Yuriko B3 | After-only regression | [126.04](stage10/yuriko-b3-after.txt) | 64.96 |
| Yuriko B4 | After-only regression | [116.38](stage10/yuriko-b4-after.txt) | 74.62 |
| Zada B3 | After-only regression | [159.95](stage10/zada-b3-after.txt) | 31.05 |
| Zada B4 | After-only regression | [170.72](stage10/zada-b4-after.txt) | 20.28 |
| Henzie B3 | After-only regression | [133.67](stage10/henzie-b3-after.txt) | 57.33 |
| Henzie B4 | After-only regression | [146.94](stage10/henzie-b4-after.txt) | 44.06 |

Both Ulalek after exports are **byte-identical** to the historical frozen B3/B4
exports on PR #4, independently [hash compared](stage10/frozen-ulalek-comparison.json).
Other after-only results are not paired improvement/regression claims.

### Wilhelt B3: source absence is fixed; comparison is not

Seven complete candidates now exist. The €102.06 local engine still wins.
Three complete source strategies survive at **€136.78, €160.38 and €186.47**;
the existing comparator calls them incomparable and uses its legacy scalar.
The €186.47 candidate scores 168.50 versus 168.82 for the selected local deck.
Those numbers explain selection, not quality. All source paths passed the
constructor's guards; source inputs are no longer absent. Local threat,
resilience and tempo paths are eliminated by existing functional dominance.

This isolates a concrete next bottleneck: candidate evidence and the scalar
choice among different strategies. Stage 10 does not override it with price,
combo-count or incomplete gameplay bonuses. A manually reviewed comparison of
these strategies and permitted external/playgroup evaluation is justified;
automatically calling the expensive candidate stronger is not.

### Wilhelt B4: a genuinely different list, with tradeoffs

The selected source becomes **archidekt:24246712**, retaining 21 source spells
and 35 source lands. The estimate rises **€84.62**, leaving €9.20. There are
36 additions and 36 cuts; [every change](stage10/deck-differences.md) is recorded.

Important gains include Arcane Signet, Talisman of Dominance, Thran Dynamo,
Cryptbreaker, Gravecrawler, Diregraf Colossus, Relentless Dead, Poxwalkers,
Rot Hulk and Sidisi, Undead Vizier. These offer colored development, repeatable
or conditional access, Zombie recursion/engine support and a real tutor.
They still have mana, timing, sacrifice and support prerequisites.

Important losses include **Mana Vault**, Diregraf Captain, Archghoul of Thraben,
Corpse Augur, Liliana's Standard Bearer, Gutless Ghoul and Nantuko Husk. The
existing early-acceleration tag falls **11 → 10**; strict directly-positive draw
**4 → 3**, conditional draw **7 → 6**, broad answers **11 → 9**, dedicated
shields **4 → 3**. Tap engines/cantrips and different recursive native support
are tradeoffs, not guaranteed reliable draw. Recognized inventory-complete
combos remain **0 → 0**, with execution unverified. More candidates and a higher
price do not establish a win, combo timing or stronger complete gameplay.

## Tests, browser, runtime and remaining limits

- Baseline **200/200**, 74.245 s; final **216/216**, 72.057 s; focused
  **47/47**, 0.169 s. No failed, cancelled or skipped final tests.
- Negative regressions cover null totals, bounded pagination, hostile next URLs,
  partial/rate/schema failures, stale/cache identity, actual byte limits,
  duplicate concurrent requests, scoped legality/foreign commander constraints,
  advisory knowledge isolation, concurrent persistence and retrieval timestamps.
  Provider cooldown respects numeric/date Retry-After without more requests;
  browser age includes time spent constructing the deck after research.
- [Real disposable-cache HTTP/API smoke](stage10/api-smoke.json): HTML, script,
  new research module and status 200; v1.1.5/32,197 records. Real local-only
  Wilhelt generation returns **100 cards, €102.06**, exact-selected-record
  provenance, within budget and no anomalies; 31.136 s. Research-off makes no
  research call and preserves offline fallback.
- [Actual Chromium/Playwright interaction](stage10/browser-smoke.json) passes
  default Research & Generate, independent candidates with zero Archidekt
  sources, unknown totals, unavailable channel, stale age and 100-card
  commander-identified Archidekt clipboard export; no page errors. Research
  responses are explicitly controlled fixtures around an actual audited API
  deck. This is not a claim of live third-party browser research.
- Fourteen recorded builds total **757.238 s**; explicit research **105.297 s**.
  Single builds range roughly 24–101 s under concurrent test/CPU load. These
  are observations, not a controlled speedup claim. The existing generator is
  still slow. More source candidates increase work; advisory broad combos are
  excluded from package search to avoid an unrelated search explosion.
- Native Windows execution remains **not performed** on Linux. BAT hash/syntax
  and portable Node tools are preserved; actual Windows startup, path-with-space,
  old-server guard and browser/pricing workflows still need a local check.

No external evaluator was scraped or run, and historical ratings are unchanged.
No multi-commander/background implementation, authorized EDHREC feed, full
bracket 1–5 implementation, new combo reliability threshold or Pod activation
is claimed. The existing legality/inventory gates and static role evidence do
not prove castability, recovery, wins or optimal strategy selection.

## Local testing and next decision

On Windows, back up the original data folder, close older server windows,
check out/pull `codex/stage10-any-commander-research`, run `npm test`, then
`start-windows.bat`. Keep the existing catalog; do not refresh while trying to
reproduce these prices. Research & Generate should display separate commander
candidates, advisory color candidates, source-inventory status and cache age.
The new `/research.js` asset distinguishes this draft UI from an older server
also labeled v1.1.5. Test disabled research/offline mode, price ledger, copying,
actual-cart informational input and original-budget-plus-extra regeneration.
Live counts may change; that is not a new historical benchmark.

**Next:** review the documented B3 candidate-comparison gap and manually test the
actual B4 export under current prices before changing ranking. Profile candidate
work and improve context-sensitive generator decisions with concrete complete
lists. Keep gameplay feedback and broad advisory-package integration gated.
Do not merge PR #2/#4/#6, release, bump the version or promise stronger decks on
this evidence alone.
