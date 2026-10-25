# Stage 11 + 12 — Integration validation, v1.1.5

**Wilhelt B3 now selects €163.25 instead of €102.06 under the same €191
catalog/research conditions.** The decisive fix is conservative: the old deep
refinement erased an unmodeled native life-payment/sacrifice/Treasure engine,
then treated generic functional coverage as a certificate of improvement.
The new guard retains the legal input and records the rejected proposal.
There is no price bonus, new universal power score or proven gameplay gain.

**Generator/Deck Upgrader quality gate: UNVERIFIED; not ready for an automatic
upgrader or gameplay-ranking production trial.** Mechanical recognition,
pricing and explanations improve, but superiority to the personal references
has not been established. Y'shtola exposes a serious remaining construction
weakness: correct trigger matching can still produce a one-shot-draw-heavy
list instead of a balanced, executable strategy. More tests are not a power
certificate.

Work is in draft **PR #9**, branch `codex/stage11-12-strategy-integration`,
targeting `codex/stage12-local-edhrec-knowledge`, starting at exact PR #8 head
`85f1f2ce82a4de9150f06482827b750dba75c6a4`. PRs #2/#4/#6/#8 remain separate,
draft and unmerged. PR #4's stateful Stages 1–9 are **not integrated** here;
existing PR #2 probes remain. Version is **1.1.5**. No release, Pod activation,
EDHREC scraping, paid dependency or new external evaluation occurred.

## Reproducibility and evidence

- [Protocol/source hashes](stage11/protocol.json), [summary of every recorded
  build](stage11/summary.json), [comparisons and all card changes](stage11/deck-comparisons.md),
  [derived metrics](stage11/derived-comparisons.json), [test results](stage11/tests.json),
  [independent receipt audits](stage11/audit-summary.json), [preservation](stage11/preservation.json).
- **61 recorded deterministic full builds**, including **40 final-matrix/baseline
  cases and 21 superseded checkpoints**; **21 completed candidate exports across three constructor
  replays**. These are not simulated games, independent gameplay samples or
  website scores. Earlier exploratory mistakes are [retained separately](stage11/exploratory-checkpoints.json).
- **8,200 selected-printing slots** rechecked across primary builds and constructor
  replays; **145 alternative receipts** additionally reconstructed and checked.
  Every archived export has commander + 99, singleton/color/format checks,
  exact eligible-printing EUR, its hard effective cap and the cached standard
  compact-infinite policy. The policy helper is reused explicitly; this is not
  independent official bracket certification or combo-execution proof.
- Catalog: **32,197 records**, SHA-256
  `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`.
  Historical reproduction uses the frozen Stage 10 **45-source** cohort.
  Held-out runs use **44**, excluding confirmed `test2` and identifiable ≥80%
  nonbasic-name overlaps against the private pack (one actual exclusion).
  The same frozen library and eligible-printing records are retained.
- Original seven cache files and all original reference-ZIP members are unchanged.
  Private catalog/research/reference files are not committed. A private frozen
  input ZIP is retained outside Git for owner reproduction; public evidence
  alone is not a self-contained replacement for those inputs.
- Old Spellbook variant acquisition lineage is incomplete. Retaining known public
  combo knowledge is intentional, but reference-related discovery leakage cannot
  be ruled out. Do not call this a perfectly blind independent-quality experiment.
- Actual source versions are recorded per group. Cast-predicate repairs affect
  Y'shtola/Zada and were rerun; native-resource protection affects Wilhelt and
  was rerun. Historical checkpoints are not relabeled as final outputs. The
  printing-alias follow-up changes equivalence, with no second physical record
  of the affected engine in this frozen catalog; its negative regression is tested.

## Stage 12 — exact-branch validation and fixes

Exact PR #8 baseline: **219/219**, 76.149 s, plus its **3/3** importer tests.
Early isolated Stage 12 fixes: **222/222**, 75.681 s. Final integration:
**246/246**, with the exact duration in tests.json. Focused regressions include
local import/persistence, Oracle predicates, source refinement and role safeguards.

Demonstrated fixes:

- Conflicting category observations remain separate; there is no first-category
  statistic promoted as a merged cohort. Identical duplicates are omitted;
  distinct-card counts and observation counts differ explicitly.
- Alphabetical examples are labeled **not ranked**. Numeric strings/nonfinite
  statistics/invalid fractions do not become percentages or quality scores.
- Schema-1 imports remain readable by rebuilding derived recommendations from
  category observations. Forged persisted suggestions are ignored; malformed,
  wrong-commander, oversized and invalid-date files fail closed as optional data.
- Bounded reads allocate at most 3 MB + 1 byte. Exclusive unique temporary files
  and atomic replacement preserve old data on failure and support concurrent
  complete writes. Local permission/path failures are surfaced; reimporting the
  unchanged source is the recovery path.
- Import time is separate from optionally user-supplied retrieval time. Unknown
  source age/coverage stays unknown; source dates are not independently verified.
- Actual CLI round trips exercise paths containing spaces, repeated flags and
  invalid destinations. File URLs are resolved portably with `fileURLToPath`.
  **Native Windows rename/launcher behavior remains untested on Linux.**

The importer is still local, optional and advisory. It cannot feed production
card selection, popularity/synergy ranking or bracket certification. `data/`
remains ignored. No automated EDHREC endpoint or paid scraper was introduced.

## Why Wilhelt changed

The exact original cohort reproduces these B3 candidates before changes:

| Complete candidate | Before EUR | Final EUR | Final decision |
|---|---:|---:|---|
| local engine | 102.06 | 137.66 | Cheap deep proposal quarantined; remaining candidate eliminated by existing functional frontier |
| source 3838228 | 160.38 | **163.25** | Selected under existing evidence/comparator after native-preserving abstention |
| source 24423895 | 136.78 | 159.91 | Incomparable survivor; existing scalar tie-break |
| source 2298582 | 186.47 | 186.47 | Retained input; €163.07 deep proposal quarantined; incomparable survivor |
| local threats | 143.17 | 143.17 | Functional frontier elimination |
| local resilience | 122.72 | 122.72 | Functional frontier elimination |
| local tempo | 107.51 | 107.51 | Functional frontier elimination |

The old €102.06 deck scored 168.82 versus the old €186.47 source's 168.50.
Those figures explained a tie-break; they never proved greater strength.
Now the safe source 3838228 scores 170.90, versus 168.81/168.50 for the retained
source alternatives. These remain **uncalibrated heuristics**, not a new power
objective. The old cheap proposal is retained as historical evidence rather
than presented as a proved inferior deck.

The critical finding was broader than one missing expensive upgrade. Deep
refinement removed **Warren Soultrader**, whose actual printed life payment and
creature sacrifice create Treasure. The simple outlet grammar does not establish
its legal timing, life availability, material or substitutability. Generic mana
and tap-draw totals could nevertheless certify its loss. The guard now abstains
when selected native death-strategy conversion is erased, preserving the legal
input, commitments, source floor and prices. It does **not** certify a loop,
free mana, lethal damage or a good card because it is expensive. Equivalent
physical-card printing aliases remain replaceable.

Refinement fairness also changes: preserve the old preferred/flow/mana starts,
then offer a fourth bounded turn to the remaining screened source. Final B3
expansion is source 3838228, local engine, source 24423895, source 2298582.
No candidate loses its old opportunity merely to make another list win.
All guarded proposals, actual costs and lost-resource reasons are retained in
compressed candidate evidence and shown in the browser.

### Actual before/after purchase lists

- [Wilhelt B3 before €102.06](stage11/baseline/wilhelt-b3-191-historical.txt)
  → [final €163.25](stage11/resource-history/wilhelt-b3-191-historical.txt),
  **€27.75 unused**. There are **24 additions and 24 cuts**, including lands.
- Gains: Warren Soultrader, Gravecrawler, Cleaver Skaab, Sidisi, Skullclamp,
  Village Rites, Dimir Signet and different colored/utility lands.
- Losses/tradeoffs: Arcanis, Archivist, Insight Engine, Thran Dynamo,
  Corpse Augur and Vengeful Dead. Average spell MV is 2.98 → 2.75; efficient-ramp
  proxy 7 → 8. More native material/recursion/tutor possibilities replace some
  independent tap-draw and high-output mana. Timing, sacrifice payments,
  Skullclamp material and actual recovery still need gameplay validation.
- The unsafe source-2298582 proposal would have added generic tap-draw/mana while
  cutting Warren, several sacrifice outlets and other native cards. Its all-card
  changes remain in the checkpoint comparison. **It is not exported as an
  accepted improvement in the final constructor.**
- [Wilhelt B4 before research €97.18](stage10/wilhelt-b4-before.txt) and
  [Stage 10/final €181.80](stage11/resource-history/wilhelt-b4-191-historical.txt)
  remain separate historical research results. Stage 11 preserves the €181.80
  selected list; **€9.20 unused**. Its 36-card Stage 10 change and losses such as
  Mana Vault remain relevant, not silently repaired or called stronger.

Historical user-observed Wilhelt B4 scores are unchanged: EDHCheck **4.6 → 4.7**,
EDHPowerLevel **1.55 → 4.95**, with both sites assigning the later list **B2**.
These are site estimates with a large price/list confound, not proved B4 strength.
No fresh score is attached to the new Wilhelt B3 list.

## Oracle discovery, explanations and remaining regressions

Discovery uses actual commander Oracle predicates, legal local support and
bounded persistent-engine hypotheses, not commander-name recipes or private
reference themes. Supported relationships retain enablers/material/outlets,
printed costs, native infrastructure, shared multi-role dependencies and unknowns.
It remains a narrow grammar, not general strategy understanding or a rules engine.

Y'shtola exposed literal-type matching of `noncreature` and a missing printed
MV threshold. The generic predicate now requires a nonland noncreature spell
with the real **MV ≥3** condition. The €160 held-out output changes
[€85.39](stage11/references-checkpoint/yshtola-b3-160-heldout.txt) →
[€90.68](stage11/cast-correction/yshtola-b3-160-heldout.txt), **46 adds/cuts**
including one basic swap. Qualifying inventory grows **11 → 53**.
This means potential trigger support, **not 53 casts, draws or damage events**.

The new Y'shtola list gains actual qualifying spells, but loses Valeria/Blood
Funnel infrastructure and many creatures. It overconcentrates on Divination-like
one-shot access; average spell MV rises 2.40 → 2.97 and efficient-ramp proxy
10 → 9. Its end-step life-loss draw and actual spell sequencing are not resolved.
This is a corrected mechanical match with a **credible construction regression
risk**, not a demonstrated stronger deck. The budget plateau does not prove
there are no worthwhile higher-cost options.

Zada's `targets only` qualifier must not turn arbitrary instants/sorceries into
native cast support. That unparsed qualifier now abstains while the existing
target-copy need is retained. Final [€152.66](stage11/zada-final/zada-b3-191-heldout.txt)
versus [€159.95 checkpoint](stage11/references-checkpoint/zada-b3-191-heldout.txt)
has **14 adds/cuts**; targeting-text candidates 10 → 15, ramp proxy 20 → 17,
MV 2.21 → 2.13. It loses Young Pyromancer, Harmonic Prodigy and Krark, among
others. Actual copy/combat execution remains unsupported. The intermediate
€169.94 generic-cast result is explicitly superseded, not cherry-picked as a win.

Yuriko **€126.04** and Henzie **€133.67** retain their Stage 10 estimates.
Held-out Aesi **€47.29** and Osgir **€122.58** pass construction/audits; no broad
quality claim follows. Teval, Zacama and Osgir still expose incomplete native
classification. Missing mechanics are unknown, not zero performance.

The expandable **Why this deck?** view explains actual selected cards,
prerequisites, multi-role dependencies, uncertain win conversion, each complete
candidate and guarded proposal. Up to four separate exports require substantial
nonland and engine differences. Ulalek produces four; some commanders produce
one. This diversity heuristic can hide meaningful differences that its grammar
does not recognize; all completed Wilhelt candidates are available in benchmark
exports even when only one meets the app's separate-plan threshold.

## Budget ladder and explicit purchasing assumptions

All following values exclude basics **including Wastes**, include commander and
nonbasics, exclude shipping and use the same frozen eligible-printing Scryfall
EUR records. They are **not verified Cardmarket English NM quotes**. Existing
basic-owned default is now explicit; unowned basics can be counted using the
catalog mode, while unsupported offer/model basic valuation returns a client error.

| Strict B3 target | Ulalek estimate / unused | Wilhelt estimate / unused | Y'shtola estimate / unused |
|---:|---:|---:|---:|
| €160 | €154.61 / €5.39 | €159.91 / €0.09 | €90.68 / €69.32 |
| €180 | €165.01 / €14.99 | €163.25 / €16.75 | €90.68 / €89.32 |
| €200 | €174.24 / €25.76 | €163.25 / €36.75 | €90.68 / €109.32 |
| €220 | €174.24 / €45.76 | €163.25 / €56.75 | €90.68 / €129.32 |
| €240 | €223.88 / €16.12 | €163.25 / €76.75 | €90.68 / €149.32 |

B4 endpoints: Ulalek €159.99 at €160 and €173.88 at €240; Wilhelt €147.16 and
€187.54. Ulalek changes source plan at €180 and later returns to a different
adaptation at higher caps; all consecutive additions/cuts are recorded. A more
expensive list is not assigned greater quality, and these plateaus are not
proofs of global optimality or absence of meaningful upgrades.

Tolerance is explicitly **0 or €4**, never a spending target. Separate slices:
Ulalek €160+4 still €154.61; Wilhelt €240+4 still €163.25. The real API smoke
exercises **€160 target, €164 maximum, €163.25 selected**, **€3.25 above target**,
**€0.75 unused**. An exact-record synthetic boundary also accepts €160.01 only
with tolerance and fails the same export against a €160 cap. No audit bypass.

Original-target-plus-extra regeneration applies tolerance once. Browser checks
verify €160 + €30 → €190 target + €4 → €194 maximum; an actual-cart total stays
informational and never fabricates individual prices. The previous deck remains.

## All seven held-out personal references

Full personal files stay local; public results contain derived metrics only.
The confirmed Ulalek URL was independently fetched through the supported public
Archidekt API, not replaced with an old TXT. At retrieval it has the same canonical
100-card multiset as the separately labeled later €208 upload; their provenance
is retained separately. Historical ratings are not freshly assigned to this fetch.
Betor's command zone is explicitly user-confirmed **Ancestor's Voice**.

| Reference | Comparison target | Frozen reference estimate | Independent generated estimate | Coverage/limitation |
|---|---:|---:|---:|---|
| Ulalek `test2` | €191 | €167.62 | €174.24 | Exact held-out generation; residual library lineage caveat |
| Teval | €180 | €371.27 | €140.95 | Reference exceeds target; native graveyard execution unknown |
| Yuna | €204 | €185.35 | €193.04 | Counter transfer/summon execution incomplete |
| Betor, Ancestor's Voice | €232 | unknown | €178.27 | 98/100 resolved; no fabricated total |
| Wilhelt preferred | €220 | €120.61 | €163.25 | Different engines; neither proved stronger |
| Y'shtola | ladder | unknown | €90.68 | 97/100 resolved; end-step/access/native value incomplete |
| Zacama | €160 | €239.53 | €103.47 | Reference exceeds low-end target; untap/activation plan unknown |

Approximate personal purchase labels and shipped estimates are not equivalent
to these frozen card-only estimates. Zacama's separate verified purchase amount
was not supplied. The extra Betor Kin build (€129.73) is an unrelated commander
experiment, not the confirmed Betor reference. Other pack variants received
local identity/catalog checks but not full generated comparisons.

**Incomplete scope:** the full seven-commander × five-budget × B3/B4 matrix was
not run. The representative ladder covers Ulalek/Wilhelt and Y'shtola B3, B4
endpoints for the first two, matched personal targets and unrelated regressions.
Two references cannot be fully priced without changing the frozen catalog.
This bounded evidence does not fulfill a universal strategy-discovery or
purchase-quality certification claim.

## Checks, performance, review and next gate

### Reviewable changes and commits

Stage 12 fixes are isolated in `bdf2999`, `54505d1` and `ec91f77`; the portable
CLI-test follow-up is `00b4d49`. Stage 11 starts with `1d9be35`; fair refinement
is `d1e610d`, Oracle predicate corrections are `b65855a`/`82427dc`/`b730f86`,
native-resource abstention is `d2b764b`/`b140946`, and the final source/documentation
head is `b18ddc9ac0876dd592b2c4df0fe7f68af14beaa3`. Generated evidence is committed
separately after that head.

| Area | Source and tests changed |
|---|---|
| Optional local knowledge | `src/edhrecKnowledge.mjs`, `tools/import-edhrec-json.mjs`, `tests/stage12-edhrec-knowledge.test.mjs` |
| Construction and explanation | `src/strategyRelations.mjs`, `src/strategyFirst.mjs`, `src/packageInvestment.mjs`, `src/engineSupport.mjs`, `src/mechanics.mjs`, `tests/stage11-strategy-relations.test.mjs` |
| Budget and complete exports | `src/budgetPolicy.mjs`, `src/cards.mjs`, `src/generator.mjs`, `server.mjs`, `tests/v110-strategy.test.mjs` |
| Browser | `public/strategy.js`, `public/app.js`, `public/index.html` |
| Reproduction and checks | `tools/{benchmark,capture,audit,check,pack,report,smoke}-stage11-*.mjs` and `tools/benchmark-stage11.mjs` (exact commands in the evidence README and jobs) |
| Development documentation | `README.md`, `CODEX_HANDOFF.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, `docs/STRATEGY_STAGE11.md`, `docs/EDHREC_STAGE12.md` |

### Actual checks and decision gate

- Final full suite **246/246**, focused **44/44**; all zero failures/skips/cancellations.
  Exact baseline/fix/final times are in tests.json. Early browser harness issues
  and exploratory unfair/unsupported discovery were corrected and retained as
  checkpoint limitations, not silently called passing product experiments.
- [Actual API](stage11/api-smoke.json): assets/status 200, invalid policy inputs
  400, real 100-card generation, effective cap and exact selected-printing audit.
  [Actual Chromium UI](stage11/browser-smoke.json): real server/catalog/search,
  controlled responses around that audited API deck, candidate export/clipboard,
  explanation and regeneration; no page errors. Controlled clicks are not new
  generation-quality measurements or live third-party research.
- Recorded full builds **23.808–157.187 s** under concurrent load; cumulative
  process peak RSS **526–872 MiB**. Sum of overlapping build durations is not
  wall time or a speedup claim. The generator is still slow.
- Implementation/fixtures/docs are separate from generated evidence. Selected
  ledgers and full measurement tables are losslessly compressed; directly
  importable text remains accessible. No raw catalog/cache/reference snapshot
  is redistributed in Git. PR #4's large archives stay separate: review core
  evaluator semantics, deterministic fixtures and bulky evidence independently.
- A separately reproduced **existing legacy-mode failure** returns only **64
  cards** for frozen Wilhelt High B3/€191 on both exact PR #8 and current code
  (36 lands; €97.60; INCOMPLETE). See [receipts](stage11/legacy-limitation.json).
  The final API 100-card audit fails closed; strategy-first independently builds
  complete decks and ignores an incomplete legacy reference. This is not fixed
  here and remains a fallback/A-B release blocker, rather than a passing check.
  `reference:legacy` elsewhere means a **generated** fallback, never a personal
  reference deck supplied as a construction answer.
- Native Windows startup, antivirus/locking behavior, browser workflow and actual
  marketplace availability remain **unverified**. Existing BAT/pricing/printing/
  selected-record helper hashes and original caches are preserved.

| Upgrader quality requirement | Verdict |
|---|---|
| Legal complete decks and hard selected-record budgets | Passed for controlled matrix |
| Independent discovery, multiple meaningful alternatives | Partial; bounded grammar and residual leakage limits |
| Functional engines, win conversion, preservation through upgrades | Partial; native loss prevented, execution/coverage incomplete |
| Quality across price bands and unfamiliar commanders | Unverified; plateaus/unclassified mechanics remain |
| Trustworthy explanations | Improved and tested; inventory/proxies explicitly conditional |
| Independent evidence of stronger complete gameplay | Unverified; no fresh external/playgroup validation |
| Automatic Deck Upgrader readiness | **UNVERIFIED — do not implement/enable yet** |

Next work should prioritize generator/package diversity and source coverage,
review actual alternatives under the same prices, and obtain permitted manual
external/playgroup evidence. Verify the specific native resource interaction
before relaxing its abstention. Do not restart open-ended simulator expansion
or replace the comparator with another uncalibrated formula. A later Upgrader
must preserve discovered strategy and original data, compare complete €20/€40/€60
packages, explain cuts/costs/uncertainty and require approval before applying them.

## Windows verification and reproduction

1. Back up your current installation/data and close old server windows. In a new
   checkout, fetch/switch to `codex/stage11-12-strategy-integration`; use Node **22+**.
   Keep the original frozen cache when reproducing prices; do not refresh it.
2. Run `npm test`, then `start-windows.bat`. Check `/api/status` is 1.1.5 and the
   page contains **Why this deck?** (`/strategy.js` must return 200). The version
   number alone does not distinguish an older server. Check the BAT's old-port guard.
3. Select commander/budget/bracket, keep normal B3/B4 policy, inspect research and
   printing ledger. Expand Why, read uncertainty/proposed rejections, copy complete
   alternatives and verify commander + 99 in your importer.
4. Test tolerance off/on and basics-owned assumption. A €160 target permits at
   most €164 only when explicitly checked. Verify ledger, actual-cart informational
   entry, +€30 regeneration and preserved previous deck.
5. For local knowledge: `node tools/import-edhrec-json.mjs --commander "Wilhelt, the Rotcleaver" --file "C:\My Decks\snapshot.json"`.
   Reimport a valid entitled snapshot after corruption; confirm missing/offline
   optional knowledge does not block generation. No EDHREC network fetch occurs.
6. For exact benchmarks extract the **private frozen-input ZIP into a new folder**,
   not over active `data/`. Materialize a job group from jobs.json and run:
   `node tools/benchmark-stage11.mjs ROOT CATALOG COMMUNITY LIBRARY JOBS OUT DEBUG`.
   Use unfiltered inputs only for historical reproduction and held-out inputs for
   reference comparisons. Node paths containing spaces must be quoted.
   The old baseline requires a worktree at 85f1f2c, not current-source replays.
   `tools/audit-stage11-benchmarks.mjs` checks receipts separately. Compression
   extraction instructions are in stage11/README.md.

No PR was merged or released; no historical external measurement was rewritten.
