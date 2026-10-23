# Stage 8 — Meaningful strategy opportunities and recovery

Opt-in shadow model, version 1.1.5. No production construction/ranking change,
release, Pod activation or merge. Read [protocol](../benchmarks/v12/stage8/PROTOCOL.md)
and [results](../benchmarks/v12/stage8-VALIDATION.md) before interpreting evidence.

## Supported state and event boundaries

Use the existing native Stage 5 + Stage 7 options and add
`stage8:{conditioned:true,requirements:{eventId:'commander'}}`. The explicit
Stage 7 event's turn becomes a minimum turn; the checkpoint waits for its target
on the actual battlefield at an empty stack, after draw or a completed action.
`requirements` optionally requires the commander already deployed (for a
strategy-relevant wipe/artifact loss). Otherwise the target alone is sufficient.
Every event fires at most once. Engines are not inserted or guaranteed to draw.
A missing target remains not reached; unknown removal semantics remain unknown.
No responses or opponent spell/payment are invented.

Control and intervention must share complete selected records, order, seed and
fixed pilot. `opportunityPair` verifies their **entire actual pre-checkpoint trace
prefix** matches, not just numeric shuffle seeds. The common-identity order also
couples original/challenger cards as in Stage 3; different deck membership still
changes absolute opening membership and downstream draws/shuffle labels. Do not
call different-list comparisons identical starting states.

Unconditional tutor/deployment incidence and opportunity-conditioned response
are separate denominators. The +2-own-turn window is censored past T8, terminal
or unknown execution. Wilson intervals describe sampled opportunity incidence;
bootstrap intervals describe paired supported observations, not real-game power.
Policies/scenarios share seeds and cannot be pooled as independent trials.

## Death, sacrifice and end-step subset

The strict reusable Oracle grammar supports Wilhelt's other-Zombie/no-decayed
trigger, Sifter of Skulls, Pawn of Ulamog, Grim Haruspex, Headless Rider and
Undead Augur. Matching uses physical identities, token status, printed subtypes
and pre-death decayed information. A simultaneous destruction moves all victims
before token/commander state-based actions. Death triggers retain last-known
sources and multiplier information even when those sources die together. Then
the supported controller's ordered triggers enter the existing audited stack.
This is one controlled player; general APNAP/other players' death triggers are
not implemented. Copies are distinct objects and permanent copies are tokens.

Actual Spawn/Scion mana sacrifices, outlet sacrifices, supported self-sacrifice
access costs and copied-legend deaths dispatch their own death receipts at the
appropriate event. A source cannot pay mana and another sacrifice cost twice.
Mana abilities still resolve immediately; death triggers wait for the current
spell/ability action to finish and do not fund its payment. Token graveyard entry
is represented by the cost/death receipt and immediate cessation; destruction
has separate destination/cessation receipts. No token recursion is inferred.

Wilhelt's actual end-step trigger optionally sacrifices an available Zombie,
then really draws on resolution. The default conservative policy sacrifices
**tokens only**, declines without a token, and never pays with the commander.
An explicit controlled-fixture option `allowSimpleCreature:true` also permits a
noncommander Zombie with empty Oracle text or only "This creature enters tapped."
This demonstrates creature costs without treating arbitrary native engines as
expendable. The prospective full-deck cohort uses the default tokens-only pilot.
Copies of the end-step ability each require another still-available sacrifice.
Draw/death/mana-trigger receipts remain distinct from combat wins.

Unsupported graveyard replacement, recursion, death/damage/counter/targeting
clauses remain disclosed and conservatively block affected interventions/costs.
If omitting uncertain creature-sacrifice mana prevents payment, result is
**unknown**, not impossible. No death-damage prevention, combat/decayed attacks,
variable-X death draws, counters, general creature-type layers, exploit, generic
sacrifice outlets or graveyard abilities are invented. A new legend spell with
an existing same-name legendary permanent is unknown; native copied-legend
state-based deaths are supported. Yuriko/ninjutsu/combat and Zada targeted-copy
abstain. Wilhelt has useful supported events but still full-strategy abstention.

Explicit card colors take precedence over an absent mana cost: black Zombie tokens cannot create colorless-entry damage.

Auditors share strict Oracle grammar but independently reconstruct zones, costs,
LKI identity batches, commander moves, triggers, stack order, token budgets,
resolved draw/life receipts and resource conservation. Positive tutor projections
retain independent exact payment checks. They do not certify optimal target
choice, maximized diagnostic mana or real-game strategy completeness.

## Reproduce locally on Windows

Node 22+, no dependency install. Keep the original `data` backed up and unchanged;
updated caches intentionally fail frozen-record/hash reconciliation.

```powershell
npm test
$stage8Output = Join-Path $env:TEMP ('commanderoracle-stage8-' + [guid]::NewGuid())
New-Item -ItemType Directory $stage8Output
Copy-Item benchmarks/v12/stage8/PROTOCOL.md $stage8Output
$env:STAGE8_FIXTURE_DIR = Join-Path $stage8Output 'fixtures'
node --test tests/gameplay-stage8.test.mjs
Remove-Item Env:STAGE8_FIXTURE_DIR
node tools/benchmark-opportunity-gameplay.mjs data $stage8Output training
node tools/benchmark-opportunity-gameplay.mjs data $stage8Output holdout
node tools/extract-opportunity-example.mjs data $stage8Output
node tools/audit-opportunity-gameplay.mjs data $stage8Output
node tools/summarize-opportunity-gameplay.mjs $stage8Output
node tools/pack-opportunity-evidence.mjs $stage8Output
```

Use unchanged `start-windows.bat` for the app and check version 1.1.5 and a legal
100-card budget-audited export. Linux validation does not certify native Windows
execution or interactive browser behavior. Shadow benchmarks never replace the
application's chosen deck. Historical external evaluations remain unchanged.

Phase indexes retain lossless hash-checked gzip reports; summary and audit tools accept both forms. The benchmark still refuses to overwrite them. The extra natural-recovery illustration is explicitly post-hoc, chosen from an existing registered vector; it adds no statistical sample or promotion evidence.
