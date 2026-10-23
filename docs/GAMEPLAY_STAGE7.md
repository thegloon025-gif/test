# Stage 7 — Explicit recovery and supported tutor planning

This extension is opt-in, shadow-only. Version stays 1.1.5, PR #4 stacked on draft PR #2, no release/merge or production ranking feedback. Read the [Stage 7 protocol](../benchmarks/v12/stage7/PROTOCOL.md) and [validation](../benchmarks/v12/stage7-VALIDATION.md). The [new human observations](../benchmarks/v12/stage7-human-observations-2026-10-23.json) are additional user-supplied evaluator estimates, not independently rerun game results; previous baselines remain unchanged.

## Explicit event experiments

`evaluateGameplay({...existingNativeStage5Options, stage7:{tutorPolicy:'legacy'|'state-aware',disruptions:[...]}})` enables the layer. Default `stage7:null` preserves existing traces. At most four unique events, turns 1–8, execute after the natural draw/resolution and before the land drop at an empty stack. These are stipulated unanswered external effects, not casts of a named sweeper with inferred opponent mana or response choices.

Each specification requires `id`, `turn`, `effect:'destroy'|'exile'`, `commanderDestination:'command'|'remain'` and an explicit scope:

- `commander`: only the actual commander; targeted protection/ward remains unknown.
- `creatures`: all modeled creature permanents, preserving unaffected artifacts/enchantments/lands (artifact creatures are creatures).
- `nonland-types`: specified union of Artifact/Creature/Enchantment/Planeswalker, excluding lands.
- `commander-and-mana`: commander plus nonland parsed mana/reduction permanents and explicit Add/cost-reduction text, including quoted Spawn/Scion mana text on token producers. It therefore removes some indirect-ramp/native outlet permanents too. This compound hypothesis is not attributed to one generic sweeper.
- `engine`: all modeled battlefield instances of the specified exact card name. If absent, the event is not applicable.

The injection records checkpoint state, exact affected physical identities/types, survivors and actual graveyard/exile moves. An owned commander may then move from graveyard/exile to command under the explicit choice; leaving it there does not create a free recast. Tokens first enter the destination zone, then cease. Real command-zone casts accumulate tax +2 each; spell/trigger copies do not. Existing generic reductions apply to generic tax where legal, and recasts pay actual exact costs. New commander instances untap/get summoning sickness normally. Hand/library, lands, life and other survivors are preserved.

Intrinsic `Indestructible` and exact `Artifacts you control have indestructible.` protect the appropriate destroy targets, not exile. Applicable unsupported death/leave/replacement/recursion/protection/ward effects suspend as unknown before zone mutation. The guard is conservative and can abstain on effects that would prove irrelevant with more rules coverage. It does not implement a response pilot from hand, targeted opponent spell colors, recursion or general continuous-effect layers. Outcomes are conditional on the stipulated unanswered event; unknown responses must not become a claim of poor real protection.

## Recovery observations are distinct

`manaRestored` compares supported independent generic/C lower-bound maxima to the pre-event snapshot; capped at 16 and not simultaneous mana. Its numeric maximization is diagnostic, not independently optimized by the receipt auditor. Exact actual subsequent spell/trigger payments are independently replayed.

`commanderRecast`, `firstNativeOrAccess`, `firstExecutedOutlet` and conditional table lethal are separate. Native/access is a paid copy-trigger or supported card draw/tutor/cascade receipt; actual resolved copies and damage must be checked as well. Recasting alone is not strategy recovery. Damage to one inert seat is not a game-winning threat; combat/response win-threat availability remains unknown. No universal recovery grade or “three-turn recovery” claim follows.

Not reached, not applicable, unsupported unknown, terminal-before-evidence and censoring by T8/next event remain separate. No missing turn is imputed as a loss or zero. The ordinary terminal contract also marks interrupted unknown runs unknown and leaves T8 null. Unparsed static mechanics remain disclosed even for a completed supported-model run.

## State-aware supported tutors

The legacy minimum-MV/name target remains the default. The opt-in alternative examines up to 24 real legal library targets. It uses ordered supported tactical channels: payable cascade follow-up, supported access, compatible mana/reduction, exact supported engine protection, entry-outlet setup, then payable commander-native follow-up. No price or scalar power merit is used. Unsupported card text gets no tactical utility; when no supported payable channel exists the legal legacy target remains fallback.

Current and next-own-untap payment projections use currently deployed sources, exact restrictions/fees/life/sickness and reductions, including reset first-creature reduction. They do not invent a land drop, future draw beyond the actual tutor-to-top destination, pending-stack mana/token resources or opponent-dependent benefits. Top destinations require controlled top permission now or time for a later draw; T8 cannot use a fictional T9. A “setup” channel is not a promise that the target's later activation, follow-up or win conversion occurs. Actual downstream execution is measured separately.

`native-tutor-choice` retains identities, reasons and positive/blocked/unknown planning receipts. Resource auditing independently replays positive projections without invoking the payment planner or choice policy. Zone auditing independently checks legal inventory, destination, shuffle and actual chosen identity. It checks supported utility prerequisites, not optimality among rejected targets. Projection bounds remain in those receipts, distinct from actual-action bounds; the cohort does not comprehensively aggregate every planning-bound occurrence. Unknown projections do not become proven impossibility or successful casts.

## Reproduction on Windows

Node.js 22+, no dependency installation. Run from repository root, keep `data` backed up. Inputs must be the unchanged frozen catalog/research; updated caches deliberately fail reconciliation. Neither the benchmark nor audit refreshes caches.

```powershell
npm test
$stage7Output = Join-Path $env:TEMP ('commanderoracle-stage7-' + [guid]::NewGuid())
New-Item -ItemType Directory $stage7Output
Copy-Item benchmarks/v12/stage7/PROTOCOL.md $stage7Output
node tools/benchmark-recovery-gameplay.mjs data $stage7Output discover
$env:STAGE7_FIXTURE_DIR = Join-Path $stage7Output 'fixtures'
node --test tests/gameplay-stage7.test.mjs
Remove-Item Env:STAGE7_FIXTURE_DIR
node tools/benchmark-recovery-gameplay.mjs data $stage7Output training
node tools/benchmark-recovery-gameplay.mjs data $stage7Output holdout
node tools/summarize-recovery-gameplay.mjs $stage7Output
node tools/audit-recovery-gameplay.mjs data $stage7Output
```

The archived large comparison arrays are losslessly gzip-packed behind hash-checked phase indexes after completion; summary/audit tools accept both forms. The benchmark itself refuses to overwrite frozen phase outputs. Continue using `start-windows.bat` for the unchanged application. Linux checks cannot claim native Windows BAT or interactive-browser validation. No new shadow deck automatically replaces the application's output. Keep the Pod profile inactive pending complete timing and an agreed reliability threshold.
