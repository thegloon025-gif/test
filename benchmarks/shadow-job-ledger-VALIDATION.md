# Stage 11 — Shadow job ledger and strategy obligations

**Delivered a read-only, score-free validator; production selection remains
unchanged.** It identifies concrete lost functions and missing recognized inputs
without selecting a stronger deck, summing job counts or treating unknown game
execution as failure. The isolated production fix refuses incomplete legacy
exports/fallbacks, including the documented 64-card Wilhelt result.

Date: 2026-10-25. Branch `codex/stage11-12-strategy-integration`, draft PR #9,
base `codex/stage12-local-edhrec-knowledge`; version **1.1.5**. No merge, release,
Pod activation, gameplay-ranking change or automatic Upgrader occurred. The
previous uncommitted production rewrite was preserved outside Git when the user
changed this milestone; it is not integrated here.

## Implementation boundary and review

Read `AGENTS.md`, handoff/roadmap/README/changelog and the complete existing
relationship, engine-support, lightweight execution and role-evidence modules,
alongside construction, investment and final selection. Their fingerprints and
the preserved caches are recorded in [provenance](shadow-job-ledger/provenance.json).

- `src/jobLedger.mjs`: physical-card jobs, supplied/consumed resources, printed
  costs, timing, repeatability, beneficiaries, uncertain clauses and plan-specific
  obligation observations. Multiple jobs share one physical dependency. Removed
  anchors are flagged separately; unknown execution stays unknown even after removal.
- `compareJobLedgers`: descriptive baseline-function losses and support changes;
  no winner, acceptance decision, price reward or universal score.
- `tools/shadow-job-ledger.mjs`: bounded local CLI, paths with spaces, exclusive
  output creation; no overwrite, network request, cache write or generation.
- Frozen benchmark/audit tools: complete generated/mutated ledgers and private
  reference graphs, plus independent record/printing/cents/cost/reference checks.
- New controlled semantic, mutation, CLI and incomplete-legacy regression tests.

Production files for strategy construction, investments, relationships, engine
support, execution, roles, pricing, research, optional knowledge, browser and
Windows launcher match `6c61662`. **Only the generator's completeness guard changes.**
It still permits an incomplete private scaffold to inform a separately complete
strategy-first build; it refuses that scaffold as a direct or fallback export.
It does not alter the scoring objective or replace candidates with new lists.

Review commits separately: `8fb7aee` (legacy guard), `d4ac625` (shadow foundation),
`a94a4c6` (land/end-step corrections), `663a722` (private graph audit),
`a0cbc4c` (exact cost quantities and partial-grammar uncertainty), `f264eca` (unknown-readiness preservation after anchor removal). Generated
benchmark evidence follows those implementation commits.

## Evidence semantics

**Supported** describes recognized printed semantics or an inventory prerequisite,
not resolved gameplay. **Unsupported** describes a particular recognized predicate
with no matching known provider, not a bad-deck verdict. **Unknown** covers missing
catalog data, undeclared choices, unparsed costs/mechanics and actual state,
funding, sequencing, throughput, recovery or win conversion.

There are no mandatory global ramp/draw/protection quotas. A single qualifying
card can establish a conditional relationship; the existing helper's eight-card
heuristic is not an obligation. Independent utility needs no closed combo.
Directions may coexist or compete, and source protection/recovery candidates
remain unverified target/zone/timing questions. See the
[complete schema and migration audit](../docs/SHADOW_JOB_LEDGER.md).

## Complete decks and private references

[Full ledgers/obligations](shadow-job-ledger/ledgers.json.gz) are losslessly
compressed; [extraction and reproduction](shadow-job-ledger/README.md) and
[the compact index](shadow-job-ledger/summary.json) are directly accessible.
These are fixed-list replays, **not fresh generation or new blind quality trials**.
Historical versus held-out input conditions remain those of their original archives.

| Archived complete list | Frozen selected-record EUR | Original ceiling |
|---|---:|---:|
| Y'shtola | 90.68 | 160 |
| Wilhelt B3 current guarded | 163.25 | 191 |
| Wilhelt B3 old local | 102.06 | 191 |
| Original Wilhelt source 24423895 | 136.78 | 191 |
| Original Wilhelt source 3838228 | 160.38 | 191 |
| Original Wilhelt source 2298582 | 186.47 | 191 |
| Wilhelt B4 | 181.80 | 191 |
| Ulalek B3 / B4 | 174.24 / 173.88 | 191 |
| Yuriko / Zada / Henzie | 126.04 / 152.66 / 133.67 | 191 |

Original 100-card text exports remain available: [Y'shtola](stage11/cast-correction/yshtola-b3-160-heldout.txt),
[Wilhelt €163.25](stage11/resource-history/wilhelt-b3-191-historical.txt),
[Wilhelt €102.06](stage11/baseline/wilhelt-b3-191-historical.txt),
[€136.78](stage11/candidates-before/source-archidekt-24423895.txt),
[€160.38](stage11/candidates-before/source-archidekt-3838228.txt),
[€186.47](stage11/candidates-before/source-archidekt-2298582.txt),
[Ulalek B3](stage11/historical-final/ulalek-b3-191-historical.txt) and
[B4](stage11/historical-final/ulalek-b4-191-historical.txt).

All estimates use the unchanged 32,197-record frozen eligible-printing Scryfall
catalog: basics including Wastes owned, commander/nonbasics counted, shipping
excluded. These are not verified English NM Cardmarket offers. Prior €160–€240
ladders, tolerance/basics policy and historical external scores remain unchanged;
[this milestone does not regenerate the earlier matrix](stage11-12-VALIDATION.md).

All seven personal references receive full **private** job ledgers: confirmed
`test2`, Teval, Yuna, user-confirmed **Betor, Ancestor's Voice**, Wilhelt, Y'shtola
and Zacama. Each retains 100 physical slots. Betor has two missing catalog cards
and Y'shtola three; their full mechanics/price/legality remain unknown. No missing
price is fabricated. Private ledgers/identity analysis are delivered outside Git;
public evidence contains derived coverage only, not their full cardlists.

## Observations and concrete losses

Y'shtola's €90.68 list has **53 printed qualifying noncreature/MV≥3 cards** for
its cast-pressure predicate. The end-step draw remains **unknown**: the inventory
does not establish enough actual life loss during a particular turn. Cycling,
source consumption, Hithlain Rope's control transfer, Tablet's oil threshold and
Staff's life costs are explicit dependencies. This does not establish adequate
sustained card access or a stronger complete deck.

Wilhelt €163.25 adds recognizable life/creature→Treasure conversion, graveyard
permission and equipped-death access compared with the old €102.06 list, while
losing other tap-access providers. The complete comparisons retain those gains
and losses rather than ranking their counts. Its **19 cards with recognized
printed sacrifice-activation clauses** share finite material and varied payments;
they are not 19 independent, funded engines. Wilhelt's end-step sacrifice is
separately represented as a scheduled choice. Renewal, decayed attributes,
last-known information, commander movement and actual draw remain unresolved.
The three original source candidates retain their distinct jobs; none is declared
stronger than €163.25 or inferior merely for having a lower old scalar.

Ulalek keeps separate casting and optional **{C}{C} trigger-resolution** costs.
Potential-source edges are not allocations or proof that two payments can
share one source. Self-funding casts and obvious tap reuse are excluded; colored
Treasure is not treated as true colorless. Forge is top-library
access rather than free drawing. Copy/cascade/tutor outcomes and actual outlet
execution remain unknown. Fleshraker and Spawn-Gang retain their printed pressure,
activation/sacrifice costs and win-conversion questions without invented damage.
Yuriko, Zada and Henzie retain explicit unmodeled native/combat/zone coverage.

| Destructive diagnostic | Resulting estimate | Specific observation |
|---|---:|---|
| Remove Forge from Ulalek B3 | €172.34 | Original top-library access anchor disappears |
| Forge → Brilliant Plan | €172.46 | One-shot draw appears; it does not replace the persistent top-access function |
| Remove Warren | €148.41 | Life + another-creature → Treasure conversion and its dependent questions disappear |
| Remove Skullclamp | €158.76 | Conditional equipped-death access disappears; no automatic draw assumed |
| Remove 19 recognized sacrifice-activation cards | €135.45 | Many voluntary channels disappear; native scheduled end-step sacrifice and unknown death causes still exist |
| Remove all 53 Y'shtola qualifying casts | €57.02 | Exact cast-pressure inventory changes from supported to unsupported; unknown end-step throughput is not called a failed game |

Every edit preserves 100-card singleton/color/format, selected-record cents, its
hard cap and recorded standard compact-infinite policy in the independent audit.
These are intentionally destructive diagnostics, **not approved upgrades**; they
can erase source spines or combo commitments. The 19-card and 53-card edits are
heavily confounded and do not estimate the isolated causal value of one engine.
Full edited ledgers/deltas are in the bundle, not silently offered as exports.

## False positives, false negatives and model limits

Hand-reviewed cases exposed and corrected before delivery:

- Cycling/self-sacrifice is not independent persistent access; counter thresholds,
  unparsed costs and control transfer cannot become unconditional draw engines.
- World Breaker's land payment initially lacked land material providers. Actual
  lands now satisfy that inventory question; graveyard/state/payment remain unknown.
- Wilhelt's end-step sacrifice is a paid scheduled choice, not free draw or an
  activated outlet available at arbitrary times.
- Generic mana symbols retain their actual quantities; hybrid/variable payment
  choices stay explicit. Partially parsed alternative sacrifice costs cannot
  create a false failed material obligation.
- A produced token cannot bootstrap the same unresolved cost; quoted token
  abilities do not become abilities of the card producing them. Spawn/Scion mana
  requires its printed ability. Multiple faces and chosen types stay uncertain.

Important false-negative/coverage limits remain: Cryptbreaker's multi-creature tap
cost, equip/state-based deaths, Saga progression, counter/life inventories,
replacement/controller changes, recursive generated-material bootstrap, broader
trigger matching, tutor/cascade/copy resolution and sustained recovery. Plain
Oracle clauses outside the grammar are visible as unknown. Source candidates for
payments or protection are not simultaneous allocations or verified target matches.
There is no measured precision/recall, win rate, reliable combo timing, or general
proof that every disconnected payoff has been found.

Optional existing setup probes use 16 fixed trial indices per deck, seed
`shadow-job-ledger-v1`, eight turns. Their endpoints are separate model runs;
there is no aggregate gameplay sample-size claim. No `executionDominates` decision
is imported into the ledger. Missing/zero unmodeled endpoints never fail an
obligation or produce a deck comparison. PR #4's simulator remains separate.

## Validation, performance and preservation

- Full suite **273/273**, focused **27/27**, zero failures/skips/cancellations.
  [Exact durations](shadow-job-ledger/tests.json) are recorded; full suite 115.541 s.
- Independent static audits: **1,800 generated/mutated printing slots**, seven
  private graphs/700 slots (five catalog-unknown), **7,782 jobs**, **5,066 obligations**,
  **3,303 printed-cost receipts**, **3,692 potential-source links**; no audit failures.
  These are static graph/price checks, not live zone/resource execution audits.
  Existing compact-inventory policy helper reuse is explicit, not official certification.
- Standalone frozen analysis elapsed at summary creation: **1.314 s**, including
  input handling, conditional probes, references, mutations and public compression;
  final private-file compression/process startup are outside that timestamp; per original ledger
  **15.067–40.961 ms**, process peak observed by that point **367.4 MiB**. Catalog loading
  contributes to memory. These are cloud observations, not a gameplay or speedup claim.
- Real disposable-cache [API smoke](shadow-job-ledger/api-smoke.json): €160 target
  + €4 maximum → **€163.25**, exactly 100 cards/printing reconciliation. Its complete
  export, selected printings and strategy match the prior same-input API result
  [byte-for-byte](shadow-job-ledger/valid-output-noninterference.json). Generation
  remains approximately **51.86 s**; the shadow validator is not called by it.
- [Legacy request](shadow-job-ledger/legacy-fail-closed.json): HTTP **400**, explicitly
  reports **64/100**, no deck export. Valid strategy-first output still succeeds.
- [Chromium smoke](shadow-job-ledger/browser-smoke.json): existing real server/catalog,
  controlled audited-deck responses, complete alternative clipboard, original-target
  regeneration/tolerance once and previous deck preserved; no page errors. These
  controlled clicks are not new generation results at the regenerated ceiling.
- Uploaded catalog/research/cache originals and historical archives are byte-preserved.
  A smoke launch briefly used the working checkout; existing startup repair rewrote
  working-library metadata with `added=0`. Normalized original variant knowledge is
  preserved. Exact pre-launch working-copy bytes were not captured; incident copies
  remain private. Subsequent smoke ran in a disposable worktree. See provenance.
- Native Windows, file locking and actual marketplace availability remain unverified.
  Launcher/package version hashes are unchanged; no dependency or paid service added.

## Decision and next migration gate

The ledger detects specific static functional losses and exposes useful unknowns
across several commanders. It **does not yet validate a replacement deck selector**.
Most execution/funding/throughput obligations remain unknown, and no superior
complete deck or new external power measurement is established.

The six current scalar decision points, their effects and proposed staged migration
are documented in [the source audit](../docs/SHADOW_JOB_LEDGER.md). Validate more
real prerequisite/false-positive fixtures and resource-funded temporal paths before
using any partial-order dominance or deterministic-default policy in production.
Do not turn job/obligation counts into a new score. Issues #3/#5/#7 remain open:
this milestone preserves their research/import/gameplay boundaries and does not
claim their separate outstanding Windows, permission or execution gates are solved.

For Windows/local reproduction, use Node 22+, fetch this branch, run `npm test`,
then `start-windows.bat` for the unchanged app workflow. This milestone adds **CLI
analysis and artifacts, not a new browser panel**. Extract ledgers using the
[evidence README](shadow-job-ledger/README.md), or supply selected catalog objects
to the local CLI; run the independent auditor with the same frozen inputs. Keep
private references outside Git and use new output paths. No PR was merged/released.
