# Bounded native execution and outlet evidence (opt-in)

Stage 5 uses `evaluateGameplay({nativeExecution:true,nativeStage5:true})`. Defaults and production construction/selection remain unchanged. Version stays 1.1.5. This is an observational supported-rules subset, not a complete rules engine, combo certifier or new ranking objective.

## Execution and bounds

Stage 4's 48 bounded vectors all hit the 128-object cap while copying the own stack. The three model losses were empty-library draws caused by copied access effects. Stage 5 separates these diagnostic replays from new prospective samples.

`CompactNativeStack` shares adjacent identical ability payloads and copied-spell payloads while retaining **every** distinct stack identity, copy parent, cause, card identity and LIFO position. Resolving a copied permanent still creates a separate token. It never adds mana, draws, casts, tokens or damage merely because a group exists. The independent audit replays the expanded identity ledger; it does not call this storage implementation.

Only provable adjacent no-ops may be batched: supported-ledger C production has an upper bound below two; a predeclared conservative policy declines copied optional payments; or a refill-to-seven ability already sees seven cards. A batch does not cross any resolving effect or state change. The C proof ignores fees/restrictions to overestimate supported production and retains source tappedness/sickness/land conditions. Unknown sources remain unknown coverage: this is not proof that a real deck has no other way to produce mana. Bounded payment search is never converted to impossibility.

The resident bound remains 128 groups, with a separate 4,096 logical identity cap. A quantum remains 192 exact resolutions. At most three explicit continuation checkpoints per turn preserve the complete ordered stack/pending identities; the independent audit checks the quantum count, order and unchanged state. This is bounded continuation plus structural/no-op compression, not unlimited execution. Remaining storage/work/payment/action bounds still suspend with unknown outcomes. No cycle detection or claim of a proven infinite is implemented. `nativeCompression:false`, `nativeOutlets:false` and shorter quanta exist for controlled equivalence/isolation checks.

## Verified outlet subset

Strict Oracle clauses support:

- Glaring Fleshraker: another colorless creature actually entering creates the supported 1-damage-to-each-opponent trigger. Self-entry and merely casting a creature do not. Supported Annie/Throne/Echoes multiplication and ability copies apply to qualifying triggers. Damage occurs on resolution, separately from token creation.
- Spawn-Gang Commander: `{1}{C}`, sacrifice one controlled Eldrazi, deal 2 damage to one chosen live opposing player. Reserve that victim before the exact fee search; it cannot supply mana for the same activation. Other Spawn/Scion can pay by sacrifice. Source self-sacrifice is legal and uses last-known identity. No tap cost is invented; summoning sickness does not prevent this non-tap activation.

The cohort has three inert player seats at 40 life. Controlled tests may stipulate 1..100 life per seat. Targets are fixed opposing players, not arbitrary creatures/planeswalkers/battles; protection, prevention, redirection, replacement damage, combat and opponent actions remain unsupported. Damage, target life before/after, sacrifice and elimination receipts are audited. Eliminating one seat is not a table win. A copied targeted effect retains its target; dead targets cannot receive additional credited damage.

`outlets.won` means **conditional lethal in this supported inert-opponent model**, not a certified multiplayer game win. Omitted native/death/target interactions can change real outcomes. A loss/win stops the model; pending effects earn no future value. Incomplete T8 primary endpoints remain null, rather than penalizing or rewarding early termination. Infinite mana, token growth, ETBs and damage are distinct; no infinite or combo-timing inference is made.

## Fixed decisions and follow-up observations

All three inherited deployment pilots remain fixed. Four separate Stage 5 decision configurations apply identically to each Ulalek list:

1. Copy-first, all affordable Ulalek payments.
2. Resources-first, all affordable payments.
3. Resources-first, conservative: decline copied Ulalek payments, permit originally triggered/additional triggers.
4. Resources-first/conservative plus priority for an actually payable colorless hand spell that qualifies for an already deployed cascade grant.

The fourth policy changes action order, not deck scoring, and retains the inherited one-setup-action commander guard. It is not multi-turn planning or tutor/priority search. All configurations use the same outlet rule: a lethal shot at the first live seat takes priority; otherwise use supported spare-mana shots after deployment/access, sacrificing Spawn/Scion tokens only, preserving copied native engines. Controlled scripts can explicitly sacrifice other legal Eldrazi.

Follow-up snapshots before and after actions distinguish absent qualifying hand spells, blocked/unknown payments and payable opportunities. They are ledger previews after supported stack resolution, not resources borrowed from pending triggers. Historical Stage 4 Zhulodok diagnosis uses its original pre-action probes and marks the missing same-turn post-deployment view explicitly. Horizons and incomplete execution are separate from mana deficiency.

## Independent auditing and preservation

Resource auditing validates exact fees, true C, tappedness/sickness, restrictions, no repeated mana units, reserved sacrifices and no-op upper bounds. Zone/stack auditing uses an expanded identity ledger for compression, continuation order, trigger/copy provenance and actual effects. Outlet auditing checks announced targets, paid fees, consumed victims, damage budgets, live seats, life totals and lethal timing. It shares the strict Oracle clause recognizer, so this is not an independent full-Magic rules certification.

Yuriko's combat/ninjutsu, Wilhelt's death/sacrifice/decayed/end-step and Zada's targeted-copy chains remain incomplete and require abstention. Their protected packages cannot be rejected by partial probes. Official bracket policy, source spines, combos, singleton/legality, exact selected-record Scryfall EUR budget, local caches/research/fallback and launcher remain unchanged. Pod High-Power remains deferred until complete timing and an agreed reliability threshold exist.

## Windows / offline reproduction

Node 22+, from repository root, with the **original** frozen cache separately backed up. A refreshed database is a different experiment. Output under `benchmarks-local` preserves historical archives.

```powershell
node --test tests/gameplay-stage5.test.mjs tests/gameplay-native.test.mjs tests/gameplay-deployment.test.mjs tests/gameplay-stage2.test.mjs tests/gameplay-shadow.test.mjs
npm test
New-Item -ItemType Directory -Force benchmarks-local\stage5 | Out-Null
Copy-Item benchmarks\v12\stage5\PROTOCOL.md benchmarks-local\stage5\PROTOCOL.md
node tools/trace-stage5-outlets.mjs C:\path\to\frozen-data benchmarks-local\stage5\sequences
node tools/benchmark-native-stage5.mjs C:\path\to\frozen-data benchmarks-local\stage5 --diagnostics
node tools/benchmark-native-stage5.mjs C:\path\to\frozen-data benchmarks-local\stage5
node tools/observe-stage5-originals.mjs C:\path\to\frozen-data benchmarks-local\stage5
node tools/audit-native-stage5.mjs C:\path\to\frozen-data benchmarks-local\stage5
node tools/explain-native-stage5.mjs benchmarks-local\stage5
```

The harness audits and replays every evaluation, checks exact printing prices/exports and old archive/cache/production fingerprints, then saves compact vectors/aggregate intervals. Existing Stage 4 exports are reused; it creates no new production deck. The unchanged `start-windows.bat` starts the usual application; native evaluation remains a developer tool.
