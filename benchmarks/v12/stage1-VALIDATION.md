# Gameplay Intelligence Stage 1 — deployment foundation

Work for Issue #3 on `codex/v1.2-gameplay-intelligence`, stacked draft PR #4. Deployment core: `5d9b344`; stricter independent context/printing validation: `1747261`. No merge, release, version bump, ranking change or new external power claim. This is a bounded resource/deployment foundation, not the complete Issue #3 roadmap.

## Inputs and preservation

The [frozen user-observed external measurements](external-baseline-2026-10-22.json) and their B3/B4 exports are unchanged. In particular, the recorded €174.24 B3 results (EDHCheck 5.7; EDHPowerLevel 5.33) and €173.88 B4 results (5.6; 5.48) remain historical user observations, not measurements rerun here. The €108.02 regression remains separate. Earlier pricing assumptions are not treated as equal-cost comparisons.

All cases use the original uploaded 32,197-record Scryfall catalog, 29 cached community lists, cached Spellbook library, €191 ceiling, owned basics and the existing standard B3/B4 policies. Catalog SHA256: `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`.

Full input/source fingerprints and selected-printing ledgers are in [frozen-replay.json](stage1/frozen-replay.json) and [fresh-generation.json](stage1/fresh-generation.json). The benchmark verifies archived selected-printing metadata, actual quantities, 100 cards, singleton/color legality and exact selected-record EUR prices. Fresh generation additionally passes the existing final export-pricing auditor. Cached estimates are not verified Cardmarket English NM offers. No cached input is written; the server smoke test uses a disposable copy because existing startup repair can update its combo-library metadata.

## What changed

Four new isolated modules implement an exact-unit mana ledger, a limited supported Oracle grammar, bounded turns 1–8 deployment and independent receipt replay. They do not replace PR #2's deployment probes or enter the ranking path. Existing generation, strategies, source spines, combo commitments, legality/bracket gates, pricing, research, fallback, UI and Windows launcher are untouched.

The evaluator records opening seven, actual seeded draws, land drops and tapped entry; source taps and sacrifice, creature sickness, paid ramp deployment, source activation fees, fixed production choices, per-unit spending restrictions, exact colored/generic/hybrid/true-colorless costs, generic reductions, simple rituals and post-resolution Spawn/Scion resources. Spell and optional cast-trigger payments remain separate. Activation-only mana cannot fund Ulalek's triggered payment. Powerstone mana may fund abilities, but cannot fund a nonartifact spell.

Failed payment attempts leave state unchanged. Unsupported effects and search limits remain unknown. An independent audit checks source availability, sickness, thresholds, production modes, spending restrictions, pip matching, no repeated expenditure, life and floating-mana balances. It is a resource audit, not proof of complete Magic rules execution.

## Fixed replay versus fresh generation

Frozen replays use the exact archived outputs, not reconstructed candidate swaps. Five fresh strategy-first generations use identical catalog/research/budget/bracket inputs, with B3 High and B4's existing Optimized profile. New generated exports and old exports are compared by actual quantities. No investment/candidate objective was changed; no improved card selection is claimed.

| Actually generated deck | Exact EUR / unused | Count / hard budget | Adds / cuts versus archived output | Generation runtime | Export |
| --- | --- | --- | --- | ---: | --- |
| ulalek-b3 | €174.24 / €16.76 | 100 / pass | 0 / 0 | 166.761 s | [Complete list](stage1/ulalek-b3-generated.txt) |
| ulalek-b4 | €173.88 / €17.12 | 100 / pass | 0 / 0 | 148.024 s | [Complete list](stage1/ulalek-b4-generated.txt) |
| yuriko-b3 | €126.04 / €64.96 | 100 / pass | 0 / 0 | 47.155 s | [Complete list](stage1/yuriko-b3-generated.txt) |
| wilhelt-b3 | €102.06 / €88.94 | 100 / pass | 0 / 0 | 49.759 s | [Complete list](stage1/wilhelt-b3-generated.txt) |
| zada-b3 | €158.68 / €32.32 | 100 / pass | 0 / 0 | 44.319 s | [Complete list](stage1/zada-b3-generated.txt) |

All meaningful card choices and their functions are unchanged: no gained/lost engines, ramp, draw, answers, source packages or combos. The distinct original strategies remain distinct; this stage does not decide which plays better. All five fresh seed-zero deployment traces also match their corresponding fixed replays exactly.

The first three completed actual generations were retained with their measured runtimes and original source fingerprints while correcting benchmark export/printing resolution; Wilhelt and Zada were then actually generated. Later validation resumes re-audit exact records and re-run deployment traces, not label saved lists as newly generated again. Per-row generation provenance is separate from the final replay-tool provenance.

The harness correctly stopped on Wilhelt’s reversible Grimgrin alias before reporting a result: its selected printing costs €10.77, whereas name-only lookup finds a €1.33 normal record. Frozen replays now resolve archived selected records and compare canonical exported quantities, preserving the original €102.06 total. A transient harness variable-shadowing error in resume handling was also corrected; the completed five-case run passes. No original list or catalog record was repriced or overwritten.

The source hashes identify the committed foundation used. Runtime includes CPU contention from the regression suite; it is a measured development run, not a hardware-independent performance promise.

## Execution samples

Every fixed deck runs 32 deterministic seeds (`gameplay-stage1-2026-10-22:0` through `:31`), each reproduced byte-for-byte a second time. The first run per seed passes independent resource auditing. Each turn covers one main phase, no mulligan, one natural draw including turn one and at most one land. The automatic pilot deploys affordable ramp, then commander, then cheaper permanents. It does not model optimal play, extra draw, opponents or complete strategy engines.

| Fixed deck | Commander cost paid by T8 (of 32) | Runs paying an optional trigger | Total paid optional triggers | Unknown bound attempts / runs | Replay + deterministic verification |
| --- | ---: | ---: | ---: | --- | ---: |
| ulalek-b3 | 29 | 23 | 43 | 7 / 5 | 0.806 s |
| ulalek-b4 | 32 | 21 | 31 | 21 / 9 | 0.634 s |
| yuriko-b3 | 30 | 0 | 0 | 0 / 0 | 0.201 s |
| wilhelt-b3 | 27 | 0 | 0 | 0 / 0 | 0.423 s |
| zada-b3 | 31 | 0 | 0 | 0 / 0 | 0.198 s |

These are **sample counts under this policy**, not gameplay probabilities, infinite-combo timing, reliability estimates or comparative deck strength. Bound hits count payment attempts (including policy previews and blocked-card diagnostics); multiple attempts can occur in one run. A hit is unknown and may miss a feasible line. Optional payment counts are paid original triggers only; copying/extra triggers/loop effects are not credited.

Complete turn traces: [Ulalek B3](stage1/ulalek-b3-trace.json), [Ulalek B4](stage1/ulalek-b4-trace.json), [Yuriko](stage1/yuriko-b3-trace.json), [Wilhelt](stage1/wilhelt-b3-trace.json), [Zada](stage1/zada-b3-trace.json). See [readable turn summaries](stage1/sample-turns.md) for draws, payments and blocked plays.

### Stipulated Ulalek reservation example

[Script](stage1-ulalek-script.json) and [full audited trace](stage1/ulalek-b3-scripted-reservation-trace.json). The opener/draws are stipulated from the actual B3 list; this is not a sampled favorable-line frequency or an earliest-turn claim.

| Turn | Land / deployment | Resource consequence |
| --- | --- | --- |
| 1 | Forest | No free setup mana. |
| 2 | Plains; Arcane Signet | Pays two actual land units. |
| 3 | Mountain; Mind Stone | Pays two land units; untapped artifacts are available immediately. |
| 4 | Island; Annie Joins Up | Pays `{1}{R}{G}{W}` from Mountain, Forest, Plains and Signet. Annie's copying effects remain unknown. |
| 5 | Wastes; Ulalek | Pays five separate hybrid pips from Mind Stone, Plains, Signet, Mountain and Forest. Ulalek does not trigger itself. |
| 6 | Second Wastes; Spawn-Gang Commander | Pays `{3}{R}{R}` from Signet, Mountain, Forest, Plains and Mind Stone. Both Wastes remain untapped, then pay the **separate** `{C}{C}` trigger. Only afterward does the original cast trigger create three Spawn. Island remains unused. |
| 7–8 | Natural draws; no scripted actions | Mana resets; no copied resources or infinite outcome is invented. |

This establishes the chosen mana/deployment line under the stated subset, **not** the full Annie/Ulalek/Spawn-Gang infinite. The existing Spellbook execution audit and unresolved timing/outlet questions remain separate.

## Validation and environment

Node v24.19.0 (Node 22+ required), Linux. [Exact test outcomes and preservation fingerprints](stage1/test-results.json):

| Check | Passed / total | Failed / cancelled / skipped | Runtime |
| --- | ---: | --- | ---: |
| Original full baseline | 195/195 | 0 / 0 / 0 | 121.811 s |
| New focused suite | 18/18 | 0 / 0 / 0 | 0.166 s |
| Final full regression suite | 213/213 | 0 / 0 / 0 | 118.682 s |

All required suites passed on the committed core. Two intermediate benchmark runs were deliberately interrupted while tightening the model/search bound and activated-versus-triggered restriction; they are not the reported final run. No unresolved test failures. No new external evaluator runs were performed.

The new regression cases cover exact colored/C/hybrid costs, single production choice, repeated-source prevention, fee funding, restricted mana including activated-versus-triggered payments, reserved `{C}{C}`, generic-only discounts, bounded atomic failure, land timing/drop limits, sickness, immediate artifact use, non-untapping rocks, post-resolution Spawn, temporary mana expiry, first-creature discount usage, commander tax, unsupported conditional mana/costs, deterministic non-Ulalek replay and tamper detection by the independent auditor. A test exposed a sickness overrestriction on non-tap Spawn sacrifice; it was corrected. Review also caught and corrected activation-only mana being offered for a triggered payment.

[Server/UI smoke result](stage1/http-smoke.json): isolated copied cache; `/`, `/app.js`, `/style.css` and `/api/status` passed. Version remains 1.1.5; 32,197 records loaded. Separate **legacy fallback** API generation returned 100 cards, €130.92, a reconciled selected-record audit and budget compliance in 43.914 seconds. This is not one of the fresh strategy-first comparisons. Automatic network research was disabled for this controlled smoke. The Windows launcher is byte-identical; actual BAT execution cannot be tested in this Linux environment.

Reproduce with the commands in [GAMEPLAY_STAGE1.md](../../docs/GAMEPLAY_STAGE1.md). Original catalog/research snapshots must match the archived printing ledgers for frozen comparisons; use the general trace CLI for another local export. No catalog refresh or paid service is needed.

## Remaining risks and Stage 2

- Conditional entry is unknown with conservative entry-turn withholding, not a solved land-sequencing condition. Unsupported sources are omitted. Search bounds and the simple pilot can miss valid lines; they cannot prove a card or deck is unplayable.
- Draw, top-library access, tutoring, cascade, copying, trigger multiplication, craft/alternate faces, most static interactions, counters/energy, combat/ninjutsu and sacrifice/death engines remain unimplemented. Yuriko uses ordinary casting only; Wilhelt gains no invented death resources/draw; Zada gains no invented copies/cantrip cards. Their results are regression checks, not strategy execution evaluations.
- No opponent actions, targets, protection effectiveness, win conversion, commander deaths/recasts or full priority/stack-order search. Tax is an explicit input. Source untap abilities are not executed. Generic reductions support only the documented exact clauses. Variable/snow/Phyrexian/monocolored-hybrid costs stay unknown.
- Optional payments use the explicit reserve-before-resource-trigger policy. A different legal order can produce a different result. Paid triggers do not certify a combo, independent win condition, earliest turn, reliable turn-six execution or pod eligibility.
- The evaluator intentionally leaves the previously weak/incomparable deck-selection decisions untouched. All price/card preservation here is a non-regression result, not a gameplay improvement.

Stage 2 should first expand stateful supported access/engine and action coverage, validate traces against hand-reviewed play and alternative pilots, and track unknown coverage and paired samples. Then use demonstrated deployment bottlenecks to inform package construction without collapsing distinct strategies into another scalar. Preserve source/combo/legality/pricing gates and validate actual changed lists. The custom pod policy still needs an agreed reliability definition and supported whole-combo/outlet execution; it is not enabled by this foundation. Fresh EDHCheck/EDHPowerLevel evidence remains required before claiming external power improvement. PR #2 and PR #4 remain draft and unmerged.
