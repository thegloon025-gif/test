# Native strategy execution (opt-in shadow model)

Stage 4 extends `evaluateGameplay` only when `nativeExecution: true`. Default Stage 2/3 behavior, production construction/selection, pricing, research and version 1.1.5 remain unchanged. It is a supported own-stack subset, not a complete Magic rules simulator or a combo/win certifier.

## Supported mechanics

- Exact spell payments use the existing ledger. Ulalek's separate `{C}{C}` payment happens when its triggered ability resolves, from resources actually available then. Mana restricted to activated abilities cannot pay it. A preview may reserve resources but cannot resolve a trigger or produce mana.
- Strict Oracle clauses implement Annie's legendary-creature trigger multiplication, Roaming Throne's other-creature/chosen-type multiplication and Echoes' colorless-spell/other-colorless-permanent multiplication. Each qualifying replacement adds **one** trigger; they do not multiply exponentially. Annie/Throne apply to creature permanents, not creature spells. Echoes explicitly applies to colorless spells. Chosen type is the deterministic commander-native type used by the existing model, fixed throughout the run for these replacement tests. Broader dynamic type-changing interactions with other cards remain outside this subset.
- Ulalek copies supported spells and other supported activated/triggered abilities still on our stack; Echoes copies its qualifying spell. A copy is not a cast: no new cast draw, cast Spawn or cascade merely from copying. Copies of permanent spells become tokens, can have real entry triggers, obey the legend rule and are tracked separately from physical cards. Copies retain original targets; unsupported targeting/new-target choices are unknown.
- Keyword cascade and the exact hand-only colorless/MV grant resolve using actual library/exile cards. The first qualifying nonland is the only possible hit. Known supported spells are cast from exile without paying mana, under the resolving cascade's permission, and do generate actual cast triggers. Additional/alternate costs outside the grammar are declined with an unknown reason; the pilot cannot skip that hit to a nicer supported card. Revealed leftovers return to the bottom in deterministic pseudo-random order. Free casting and queued triggers complete in the correct resolution order.
- Supported cast/entry tutor clauses search actual library inventory and reveal/move the selected eligible card to **top of library** or **hand** as specified. Default selection is lowest eligible printed MV, then canonical name, held fixed across pilots. Searches, cards obtained and destinations are separate counters; a search finding nothing earns no card. Shuffles preserve physical inventory and use identity-based priorities. Cast copies do not generate another cast tutor; copied tutor abilities can search again.
- Explicit self-cast/self-entry and supported global cast/second-draw Spawn/Scion effects include Repurposer's cast branch, Spawn-Gang, Drowner, Fleshraker, Unsealing and Messenger clauses, plus simple 10/10 Eldrazi creation. The parser follows text, not these names. Tokens become available only after their producing effect resolves. Non-tap Spawn/Scion sacrifice mana is available immediately; creature tap sources still respect summoning sickness.
- Supported cast refill-to-seven and the existing direct/activated/cast/entry access grammar move actual cards. A second-draw trigger waits until the resolving draw effect finishes. Entry singleton conditions are checked both when triggered and at resolution where applicable. Existing exact reductions apply only to actual casts, with per-turn first-creature limits and generic-only discounts.

## Event order, bounds and unknowns

Every spell/ability has a distinct stack identity. Events record trigger provenance/multipliers, stack push, LIFO resolution, copy parent, cascade reveal/cast/bottom, tutor destination, token creation, payment and resulting zones. Cast-generated triggers wait until the current resolving effect finishes before being put onto the stack. Mana abilities resolve through receipts, never become copyable stack objects.

All cohort pilots retain their existing deployment priorities. Fixed ordering places Ulalek payments above spell-copy triggers, above the remaining supported triggers in stable generation order. A separate `resources-first` option is used only in controlled tests; no candidate gets a favorable trigger order selected after observing outcomes. Different legal ordering can change a line. The model does not search priority/trigger permutations or hold activated abilities on the stack while casting another spell.

Bounds are 192 resolution steps per turn and 128 concurrent supported objects, with 4,000 exact payment-search nodes and inherited action/source/cost bounds. They are configurable within explicit caps for testing. Reaching a bound preserves an **unknown suspended prefix**. A partly executed copy ability emits `stack-resolve-suspended`, not a successful completion. No unresolved copied trigger, mana, draw or future permanent is credited. T8 shadow endpoints are null for a suspended run; no bounded seed is discarded to obtain favorable intervals. No infinite-combo or win inference is made from growth or hitting a bound. Empty-library draws or supported life loss can instead terminate the model: the interrupted frame emits an explicit loss abortion, no later cleanup/stack action completes, and incomplete T8 endpoints remain null while model survival is recorded as zero. Unmodeled outlets may have won first in a real game; this is not a real-game loss certification.

The stack covers supported own effects only. Unparsed target/removal/combat/death/counter/alternate-face/tutor/copy clauses remain identified unknowns; it is not the full physical stack. Such omitted effects can change later real gameplay. Unknown-source absence is not zero strategy performance. Replacing protected native infrastructure remains forbidden in actual repair proposals. Yuriko combat/ninjutsu, Wilhelt sacrifice/death/end-step engines and Zada targeted-copy chains still force native-strategy abstention.

Copies of legendary permanents retain the physical original under the fixed legend choice. Tokens that leave the battlefield are recorded as ceased; intermediate graveyard/death-trigger processing remains outside this subset. Three inert opponent seats do not establish target availability, removal effectiveness, combat damage or actual wins. Glaring Fleshraker token generation is supported; damage/outlet conversion is still unknown. Strionic Resonator activation/holding-priority lines, arbitrary copied targets, complete conditional untap/mana, cascade alternate-face/X choices, craft, graveyard recursion and full pod combo timing remain unsupported.

## Independent checks

`gameplayAudit.mjs` independently checks exact mana units, source taps/sacrifice, sickness, fees, restrictions, life and true-colorless triggered payments. `gameplayNativeAudit.mjs` replays physical zones and a separate stack ledger without invoking the pilot, stack executor or payment planner. It checks distinct casts/copies, trigger quantity/source/zone, LIFO order, paid copy authorization, token/effect budgets, tutor inventory, actual cascade hits, free-cast permissions, shuffles, reductions, legend removals and end snapshots. Native event counters are reconciled against receipts. Both executor and audit share the narrow Oracle grammar helpers; controlled expectations and tamper regressions guard that common boundary. This is not independent certification of every MTG rule.

Default foundation traces remain archived and replayable. The Stage 4 protocol fixes seeds, pilots, endpoints, lists and ordering before the final cohort; native counts explain strategy execution, not a replacement score. Originally triggered payments (including additional triggers) are distinct from payments for copied abilities. Physical net-card accounting excludes permanent-copy tokens; copied bodies and Spawn/Scion resources are reported separately.

## Windows / offline reproduction

Node.js 22+ and Git, from repository root. Keep the frozen data snapshot separate from any refreshed catalog or startup repair; original fingerprints must match. No network research or paid service is needed.

```powershell
node --test tests/gameplay-native.test.mjs tests/gameplay-deployment.test.mjs tests/gameplay-stage2.test.mjs tests/gameplay-shadow.test.mjs
npm test
New-Item -ItemType Directory -Force benchmarks-local\stage4 | Out-Null
Copy-Item benchmarks\v12\stage4\PROTOCOL.md benchmarks-local\stage4\PROTOCOL.md
node tools/trace-native-sequences.mjs C:\path\to\frozen-data benchmarks-local\stage4\sequences
node tools/benchmark-native-gameplay.mjs C:\path\to\frozen-data benchmarks-local\stage4
node tools/audit-native-artifacts.mjs C:\path\to\frozen-data benchmarks-local\stage4 benchmarks-local\stage4\sequences
node tools/explain-native-results.mjs benchmarks-local\stage4
```

The benchmark expects the committed `stage4/PROTOCOL.md`. Use a separate output copy containing that protocol to preserve the committed validation archive. It replays fixed existing lists and Stage 3 proposals; it does not generate, reprice or select a new production deck. The standard UI and unchanged `start-windows.bat` still use production construction. Native BAT/browser execution requires a Windows check.
