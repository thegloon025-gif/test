# Stage 9 — Generalized strategy and deck-quality checkpoint

**No production integration is justified.** Two distinct coherent Wilhelt
challengers pass every existing shadow construction safeguard, but neither
establishes a robust complete-deck improvement. The new sacrifice/death/access
lines work and pass independent audits in controlled real-card scenarios;
their voluntary activations do not occur in this small natural cohort. This is
a failed improvement experiment with a useful product decision: **pause broad
simulator expansion and prioritize generator/source quality, manual external
deck comparisons and release readiness.**

PR #4 remains draft on `codex/v1.2-gameplay-intelligence`, stacked on draft PR
#2. Neither is merged or released. Version stays **1.1.5**; standard B3/B4,
inactive Pod High-Power, production construction/selection, APIs, original
caches, historical external observations, local fallback and Windows launcher
are unchanged. There is no fresh EDHCheck/EDHPowerLevel result or external
power-improvement claim. This work adds developer tools and model semantics;
it deliberately does not change what the browser selects.

## Reviewable changes and reproduction

Review implementation commits `78e79e1` and `39cf997` separately from the
generated evidence commit. Read
[supported semantics and Windows commands](../../docs/GAMEPLAY_STAGE9.md), the
[prospective protocol](stage9/protocol.json), [exact frozen inputs and package
gates](stage9/inputs.json), [independent audit](stage9/independent-audit.json),
[test outcomes](stage9/tests.json) and [HTTP/API smoke](stage9/smoke.json).

[All paired tradeoffs](stage9/candidate-tradeoffs.md), [opportunity panels with
uncertainty/censoring](stage9/opportunity-panels.md), and [actual death/access
and recovery receipts](stage9/native-events.md) retain every prespecified pilot
and partition. Training/holdout reports and vectors are losslessly packed;
`tools/opportunity-evidence.mjs` verifies and reads their JSON indexes. The
complete checksum manifest preserves reproducibility without adding large
expanded trace archives. The original catalog is not copied into Git.

## Why the €102.06 Wilhelt deck leaves €88.94 unused

A fresh cached strategy-first High B3/€191 generation reproduces **the same 100
selected records and €102.06**, choosing `local:engine`. It is not a stale
export or a missing-price reconciliation error. The same 32,197-card catalog,
29 saved community sources and Spellbook cache are used; **zero saved sources
contain Wilhelt and zero cached Wilhelt combo variants exist**. No network
research is refreshed into this frozen experiment.

The diagnostic [generation archive](stage9/generation.json.gz) includes complete
candidate/path/watch records, selected printings and role evidence:

| Generated complete candidate | EUR | Actual selection explanation |
|---|---:|---|
| local:engine | 102.06 | Selected; scalar 168.82 after functional frontier |
| local:threats | 143.17 | Functional frontier eliminates it; selected deck has more recognized access/mana, no measured-vector losses |
| local:resilience | 150.14 | Incomparable surviving strategy; legacy scalar 158.20 loses |
| local:tempo | 106.34 | Incomparable surviving strategy; legacy scalar 133.60 loses |

These scalars explain current selection, not strength. The existing deployment
probe explicitly abstains from comparing `death-tribal`. It cannot certify the
selected deck's native engine quality. The engine's single-card balanced/value
paths reach €137.66 and its quality path €137.93; atomic expansion instead
retains a cheaper frontier result. Thus this is not simply failure to find any
more expensive cards.

Search remains bounded: 12,691 eligible pool records, an 850-card single-card
shortlist and three feasible finalists per round. Engine package expansion
evaluates 280 proposals; accumulated proposal rejection counters include 1,749
budget, 39 support-dependency, 42 singleton/count, 21 commander-role-floor and
nine no-complete-functional-dominance rejections. Counts include proposals
pruned before evaluation and are not independent card-quality judgments.

The final engine watch says Grim Haruspex, Dark Prophecy, Phyrexian Arena,
Viscera Seer, Diregraf Ghoul and Dimir Signet are **outside the functional
frontier** (zero evaluated final-frontier proposals each). Kindred Discovery is
considered 20 times, with accepted paths as well as budget/support rejections,
yet is absent from the selected result. Being accepted within an intermediate
path does not mean that complete path wins.

The frozen deck has **36 lands**, broadly tagged 50 fodder, 29 outlet, 15 payoff
and six recursion contributions. Those overlapping tags do not establish 29
good executable sacrifice engines. The recognized access vector mostly protects
**Archivist, Arcanis the Omnipotent and Insight Engine**, while contextual death
access is much less visible to its frontier. Sparse source structures, bounded
discovery and incomplete functional recognition are concrete reasons to inspect
the generator next. Preservation gates alone are not proved to be the sole
culprit: both new coordinated packages pass them without bypassing anything.
Nothing proves that spending the remaining €88.94 would be beneficial.

## Complete decks, actual differences and hard budgets

All nine exports have commander + 99, legal colors/format, singleton compliance,
standard bracket checks, preserved original source floors and commitments, and
exact selected eligible-printing Scryfall EUR reconciliation. Prices are
**market estimates, not verified Cardmarket English NM offers**. The auditor
checks **900 selected-printing slots**. The frozen reversible Grimgrin selected
record remains intact; no cheaper name lookup is substituted.

| Complete export | EUR estimate | Unused from €191 |
|---|---:|---:|
| [Wilhelt original](stage9/wilhelt-b3-original.txt) | 102.06 | 88.94 |
| [Wilhelt sacrifice/access](stage9/wilhelt-b3-sacrifice-access.txt) | 104.63 | 86.37 |
| [Wilhelt resilient access](stage9/wilhelt-b3-resilient-access.txt) | 114.62 | 76.38 |
| [Ulalek B3 original](stage9/ulalek-b3-original.txt) | 174.24 | 16.76 |
| [Ulalek B3 Stage 6 C1](stage9/ulalek-b3-challenger-1.txt) | 187.59 | 3.41 |
| [Ulalek B4 original](stage9/ulalek-b4-original.txt) | 173.88 | 17.12 |
| [Ulalek B4 Stage 6 C2](stage9/ulalek-b4-challenger-2.txt) | 175.39 | 15.61 |
| [Yuriko original](stage9/yuriko-b3-original.txt) | 126.04 | 64.96 |
| [Zada original](stage9/zada-b3-original.txt) | 158.68 | 32.32 |

**Sacrifice/access, +€2.57:** add Grim Haruspex (€2.35), Viscera Seer (€0.54),
Diregraf Ghoul (€0.07); cut Abattoir Ghoul, Accursed Horde, Boneyard Desecrator.
This supplies nontoken death access, a zero-mana scry sacrifice outlet and an
early expendable Zombie. It loses Horde's activated protection and other
combat/conditional effects that the model does not fully value. Haruspex does
not draw from token deaths. This is an incomparable shadow proposal rather
than complete static functional dominance.

**Resilient access, +€12.56:** add Dark Prophecy (€7.00), Kindred Discovery
(€5.51), Dimir Signet (€0.40); cut Boneyard Desecrator, Brain Gorgers, Gavony
Unhallowed. The enchantment death/tribal-entry engines survive creature wipes;
the Signet actually needs an activation payment and supplies colored fixing.
The variant loses three creatures and their conditional/combat/counter text.
BBB and 3UU setup and Prophecy life loss are real costs; surviving a wipe is
not the same as having a castable follow-up. Discovery's attack branch remains
unsupported. This declared package passes even the existing static dominance
gate but is not discovered/selected automatically in the frozen fresh build.

Both proposals use the existing atomic shadow interface and all unchanged
gates, with extra protection for Headless Rider, Undead Augur and Gutless Ghoul
alongside recognized access/native infrastructure. Wilhelt's frozen source
floor and committed-combo inventory are empty, not waived. Ulalek's original
source spines, combo commitments and true-colorless infrastructure remain
unchanged. No package is promoted because of price, combo count or an internal
power formula.

## Exact new supported lines

The explicit Stage 9 option supports narrowly parsed printed mana costs plus
`Sacrifice a creature: gain life` or `Scry N`, and Dark Prophecy's exact death
draw/life-loss clause. Victims cannot pay a second sacrifice or fund their own
sacrifice-mana cost. Last-known death sources and actual triggers use the
existing stack and zones. Unknown relevant death/replacement/restriction text
abstains. Commander sacrifice, recursion, combat and counter engines remain
unsupported. Reserving all victim mana modes is conservative and may omit a
legal tap-for-mana-then-sacrifice line; it is not a proof of optimal payment.

In [controlled fixture 1](stage9/fixtures/index.json), T4 Gutless Ghoul pays
`{1}` and sacrifices a real Diregraf Ghoul while Wilhelt and Undead Augur are
present. The cost dispatches Wilhelt's actual decayed Zombie and Augur's real
draw/life loss before Ghoul's gain-two-life ability resolves. End-step
sacrificing that token then produces Wilhelt's draw and another Augur
draw/life loss. **Three actual effect draws, two life lost, two gained, life
40**; the token cannot be reused. Same-turn Ghoul self-sacrifice is legal
without a tap symbol; the paid ability survives its source.

In controlled fixture 5, T4 destruction removes Gutless Ghoul, Diregraf Ghoul
and Wilhelt simultaneously. Dark Prophecy survives and draws three actual
cards, losing three life; last-known Wilhelt makes two decayed Zombies before
the resulting resources become usable. Commander movement follows the death
batch. This distinguishes real recovery resources from theoretical tags.
Independent checks replay all nine controlled receipts against both minimal
fixtures and the user's actual cached Oracle records; economic/zone outcomes
match. Basic-land mode representations have different optional defaults, so
that second check is not falsely described as byte-identical trace equality.

These are scripted correct lines, **not naturally occurring frequency,
reliable combo timing, recursion or a game-win certificate**. The automatic
pilot permits at most one safe conversion after ordinary deployment and
preserves an end-step Zombie unless death replaces it. That incomplete pilot
can miss strategically important sacrifice windows.

## Prospective complete-deck experiment and actual outcomes

Fresh namespace `gameplay-quality-stage9-v1-2026-10-23`: four training and 16
disjoint holdout seeds, all three fixed pilots, conservative optional payments,
one fixed state-aware tutor policy. No more tutor-target optimization. Opening
seven/no mulligan, T1 draw, T8 horizon, inert 40-life opponents. Common card
identity/occurrence hash priorities couple lists; numeric seed equality alone
does not. Membership changes still alter absolute hands and later shuffles.

Each Wilhelt deck has intact, commander-only exile, shared deployed Undead
Augur exile and commander-present simultaneous creature destruction scenarios.
All four Ulalek decks plus Yuriko/Zada have control regressions. No tutor,
engine, favorable opening or death is inserted into random games. Unknowns
retain identification bounds; nonterminal metrics disclose conditional
subsets. Small bootstrap/Wilson intervals describe this sampled model, not
tabletop probabilities; pilots/scenarios sharing seeds are correlated.

**Correctness disclosure:** the initial wipe unit fixture fired before the
commander; its deployment requirement was corrected before final tests/cohorts.
Post-run review corrected the benchmark's community-count field from singular
`commanderId` to the actual `commanderIds` array. Independent inspection still
finds zero Wilhelt sources. The final diagnostic/cohorts are recomputed under
the same registered samples with that harness correction; this is a
**same-sample diagnostic reanalysis, not a second fresh holdout**. Simulator,
packages, policies and criteria did not change. Both final vector archives
are byte-identical to the initial run; repeated runs are not counted as extra
evidence.

**Wilhelt sacrifice/access:** training T7 draw/access/commander contrasts tie.
Holdout intact commander presence changes **−0.0625 [−0.1875, 0]** for each
pilot; draw differences are −0.125 [−0.3125, 0] for commander/development and
−0.0625 [−0.25, 0.125] for native. After wipe, mutually observed T7 commander
presence is **−0.222 [−0.556, 0]**, nine pairs per pilot. This is an observed
regression in supported deployment, with uncertainty reaching a tie, not
proof that the deck is universally weaker. No promotion.

**Wilhelt resilient access:** training T7 draws improve +0.75 [0, 2.25] but
**holdout T7 draws tie for all three pilots**. Intact net-card differences are
−0.125 [−0.3125, 0], −0.0625 [−0.25, 0.125], −0.125 [−0.3125, 0]. At T8 the
observed control prefixes have two more actual Kindred Discovery draws per
pilot in a single holdout seed; this late event is real but does not establish
a repeated T7 access/recovery advantage. Removing Gavony's unsupported clause
also reduces some unknown wipe outcomes; fewer unknowns are **coverage**, not
extra deck strength. No promotion.

New voluntary creature-sacrifice activations and Dark Prophecy death draws
are absent in the complete random cohort. They remain **unexposed mechanics**,
not zero-valued deck potential. Existing Wilhelt death/end-step mechanics do
occur: holdout original wipes produce seven supported death triggers/tokens
and one end-step sacrifice per pilot. Resilience produces 9/6/9 death triggers
and tokens and one end-step sacrifice each; sacrifice/access produces five
and zero end-step sacrifices. Those are observed correlated event totals,
not complete-deck success probabilities. See all recovery receipts separately.

For development holdout, commander/wipe opportunities occur in 14/16 seeds
for each Wilhelt list, including unknown rules. The shared Augur-engine
opportunity occurs in 3/16 original, 3/16 sacrifice and 2/16 resilience seeds;
only one observable +2-turn pair per list survives censoring. Wipe conditional
pairs number 7/6/8 respectively. No broad resilience claim follows from these
small differing conditional subsets.

**Ulalek controls remain mixed:** B3 C1 holdout T7 net-card intervals cross zero
for all pilots; development draw is slightly lower. B4 C2 has positive access
points but payable-threat intervals cross zero for all pilots. Training and
holdout do not jointly establish complete dominance. One supported conditional
lethal occurs in holdout; it is not an external power result. Eight archived
Stage 6 default full traces still match, and 24 same-input Ulalek opt-in/off
trace checks match exactly. Yuriko/Zada retain native abstention; missing
ninjutsu/combat and targeted-copy packages cannot be rejected by this model.

## Validation, performance and remaining limits

- Full **349/349 tests**, zero failed/cancelled/skipped, **72.616 s**. Focused
  Stage 8+9 **28/28**, **0.726 s**; new Stage 9 **10/10**, **0.381 s**.
- **1,080** registered vectors, each independently resource/zone/stack/death/
  outlet audited and deterministically replayed. The persisted audit recomputes
  20 paired tables, 54 opportunity panels, six first-opportunity full receipts,
  nine controlled receipts/actual-catalog outcome matches, eight archived
  default traces and 24 Ulalek opt-in trace comparisons. All 900 selected
  printings and all old cache/archive/production/launcher hashes pass.
- Final runtime profiles are retained in the phase report indexes and diagnostic;
  discovery generation takes **30.965 s**, training **9.269 s**, holdout
  **35.732 s**, and persisted independent audit **2.908 s** on this machine. This is a fixed two-package experiment, not a new unbounded
  candidate × simulation search.
- Training: 189 completed T8 / 27 unsupported-rule unknown. Holdout: 768
  completed T8 / 95 unknown / one conditional lethal; **no search-bound or
  model-loss vectors**. Unknown/censoring are retained, not imputed as losses.
- Disposable-cache HTTP serves HTML, JS, CSS and status 200; status reports
  v1.1.5 and 32,197 records. API generation returns **100-card €102.06 Wilhelt**
  with exact-selected-card reconciliation and no price anomalies. An initial
  smoke-client pricing spelling was correctly rejected 400; the supported
  `scryfall_eur` request passes. Native Windows and interactive browser tests
  are unavailable on Linux; the unchanged launcher is inspected/hash-checked.

Independent audits share strict Oracle grammar but replay actual receipts
without approving them via the pilot/payment planner. That does not prove a
full rules engine, optimal sacrifice/tutor/land sequencing, complete opponent
interaction, diagnostic mana maxima or unbiased coverage of unsupported
strategy text. The eight-turn horizon and rare opportunities are material
product limitations. See the [review/readiness assessment](stage9/release-readiness.md)
before contemplating integration.

## Mandatory go/no-go

1. **Different coherent Wilhelt decks? Yes, as shadow proposals.** Two actual
   100-card, gate-valid strategies add different access and recovery packages.
   They are not automatically selected production improvements.
2. **Credible complete-deck gameplay improvement? Not established.** Exact
   supported lines and a few actual late draws improve mechanical coverage;
   the prespecified complete-deck comparisons are mixed, tied or regress.
3. **Reusable beyond one commander? Mechanics yes; construction benefit no.**
   Sacrifice payments, LKI, simultaneous deaths, draw/life/selection are general
   grammar. Ulalek regressions pass, but there is still no demonstrated
   complete-deck improvement for two commanders.
4. **Safe opt-in production trial? No.** Incomplete native payoffs/combat,
   unknown-heavy recovery, conservative pilot omissions, sparse exposure and
   absent external/Windows/browser validation prevent a fair ranking trial.
   Preserve production selection and both draft PRs.
5. **What next? Pause broad simulation expansion.** The smallest useful next
   product task is better permitted/cached Wilhelt source coverage and a bounded
   generator audit of contextual death access, redundant bodies and package
   discovery. Manually import these complete challengers for external/playgroup
   evaluation under current exact prices; retain negative results. Review core
   implementation separately from archives, complete Windows/browser checks,
   and make an explicit integration decision later. Another larger seed count
   or unsupported-mechanic score cannot answer this stage's quality question.
