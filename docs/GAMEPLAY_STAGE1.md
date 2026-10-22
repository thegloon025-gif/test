# Gameplay Intelligence — Stage 1 deployment foundation

This is an observational resource evaluator, independent of `strategyExecution.mjs` and **not imported by deck construction, ranking, or combo/bracket policy**. The application version remains 1.1.5. A paid cast under this subset does not establish complete rules legality, resolved Oracle effects, an executable combo, earliest turn, reliable timing, or power.

## Resource model

`src/gameplayMana.mjs` searches activation sequences and exact payments. Floating units have a fixed color/type, source identity and spending restriction. A rainbow source chooses a production mode when activated; its floating mana cannot change color afterward. A multi-unit mode is activated once. Fees must come from previously available units, before that source produces mana. Tapping or sacrificing consumes that source's opportunity; fees and spell/trigger payments cannot reuse a unit. Failed plans are atomic.

The supported cost grammar includes generic, colored, true `{C}`, and two single-pip hybrid alternatives, including `{C/W}`. Generic reductions cannot remove pips, activation fees or a later optional payment. Variable, snow, Phyrexian and monocolored `{2/W}` costs are unknown. Source/payment search is deterministic, memoized, limited to 4,000 search states per attempt, 40-unit costs/pool during activation and eight-unit production modes. A limit returns **unknown**, not a successful payment or proof of insufficient mana.

Restrictions supported per unit: unrestricted; activated abilities only; Powerstone (no nonartifact spells); creature spells; Eldrazi spells; commander spells. Activated-ability-only mana cannot pay Ulalek's **triggered** ability. Powerstone mana can. Restricted mana can fund a source's activation fee only when its restriction permits that **activation**. Unknown restrictions provide no mana. Pain-source damage reduces tracked life; lethal payments are rejected.

`src/gameplayCards.mjs` uses an explicit, limited Oracle grammar. It recognizes intrinsic basic land types, simple tapped entry, fixed/choice/commander-identity production, simple mana fees, self-sacrifice production, five-land activation thresholds, unconditional self haste, and non-untapping sources. Summoning sickness prevents creature tap abilities, including tap-and-sacrifice costs; it does not prevent a Spawn/Scion sacrifice without `{T}`. Conditional tapped entry is reported unknown and conservatively withholds entry-turn mana. Unsupported land conditions, milling, energy, counters, variable production and opponents' available colors supply no inferred mana. Independent supported modes remain usable (e.g. Solar Transformer's `{C}`, without inventing energy fixing).

Supported reductions are explicitly worded generic discounts for colorless spells, all creature spells, or the first creature spell each turn. They apply only after deployment, respecting earlier creature casts that turn. Simple standalone fixed-mana rituals resolve after their costs are paid; their floating mana expires. Precisely recognized unconditional self cast/entry Spawn/Scion creation resolves at a separate boundary, never during payment. Other token/resource triggers remain unknown.

## Turns, policy and traces

`src/gameplayDeployment.mjs` uses a seeded Fisher–Yates permutation of actual deck slots (including distinct basic copies), opening seven, **no mulligans**, a multiplayer-style natural draw on turns 1–8, at most one land per turn, and one main phase per turn. Permanents untap normally except recognized non-untapping sources. Remaining floating mana expires at turn end. Commander casting starts in the command zone; prior casts/tax may be supplied explicitly. No deaths, recasts, commander-zone choices, opponents, removal or combat are generated.

The automatic policy chooses an untapped land first, then affordable mana sources, commander, and cheapest permanents. At most 16 casts per turn are attempted. This is deliberately simple, not optimal sequencing or a representative pilot. Scripted actions and stipulated opening/draw order are also supported; these cannot estimate draw reliability.

For the recognized optional cast-payment pattern, an eligible spell and each optional trigger have **separate payments and contexts**. The planner reserves the later cost before resolving any resource trigger. If it cannot reserve the optional payment, normal policy may still cast the spell and explicitly decline it; a script may require reservation. This is one declared ordering policy, not a search of all legal stack orders. Ulalek's `{C}{C}` is recognized from its Oracle text, not its name. Casting Ulalek does not trigger itself from the command zone. Copy effects, extra triggers from Annie/Throne, and loops are unknown; no copied resources or spells are credited.

Traces record the opener, draws, land drops, individual activations, fee/spell/optional-payment receipts, pending and resolved token triggers, source sickness/tappedness, remaining hand payment status, pool expiry and life. “Payable but not selected” is distinct from blocked or unknown. The payment search explains total capacity, absent types, restriction/fee/source contention, unsupported costs and bound hits. The untap snapshot lists the actual modes and source state for diagnosing these results.

`src/gameplayAudit.mjs` independently replays receipts to check source availability, sickness, thresholds, fixed production choices, restrictions, exact pip matching, spending once, life and floating balances. It audits resource accounting, not all Magic rules, targets or card text. Traces and checks intentionally expose unsupported mechanics rather than labeling them as simulated successes.

## Reproduce locally (Windows or Node shell)

From the project directory with Node 22+ and the existing catalog in `data`. The full benchmark also expects Git and a checkout for source provenance; the standalone trace CLI needs only Node and the catalog:

```text
node --test tests/gameplay-deployment.test.mjs
npm test
node tools/trace-deployment.mjs data benchmarks/pod-combo/ulalek-b3.txt trace.json
node tools/trace-deployment.mjs data benchmarks/pod-combo/ulalek-b3.txt scripted-trace.json scripted-reservation benchmarks/v12/stage1-ulalek-script.json
node tools/benchmark-gameplay.mjs data benchmarks/v12/local-stage1
node tools/benchmark-gameplay.mjs data benchmarks/v12/local-generated --generate
```

The trace CLI accepts complete exports with `*CMDR*` or `[Commander]`. It requires unambiguous exact catalog names and verifies 100 cards, singleton and color legality; it emits the resolved current catalog printing prices and hash. A plain-text export lacks original printing identifiers: the CLI labels that provenance unknown and does not certify an original cart/printing total. Frozen benchmarking instead resolves archived selected-printing ledgers, including reversible export aliases (Wilhelt's selected Grimgrin is €10.77, not the other €1.33 catalog record). It verifies exact selected-record pricing and the €191 ceiling for fresh generation and checks input hashes remain unchanged. Neither tool alters policy or caches. Runtime fields are measurements; deterministic replays compare execution results without runtime fields. Outputs contain selected public card data, not the complete catalog or private account/cache content.

## Subsequent stages

Stage 2 now implements supported stateful access, multiple pilots and conservative mulligans separately; see [its model and limitations](GAMEPLAY_STAGE2.md). Stage 3 is the proposed construction-feedback stage, pending broader coverage and hand-reviewed validation. Remaining work includes tutors, conditional lands, richer mana abilities and cost interactions, alternate faces/craft, priority/trigger ordering, combat/ninjutsu, target-copy, sacrifice/death engines, win outlets and net loop resources. Keep unknowns explicit and validate paired common-input samples and alternative pilots against actual play. A favorable scripted turn-six line is not reliable execution. Agree pod reliability thresholds before enabling that profile. Any future construction feedback must preserve legality, source spines, combo commitments and exact pricing. No price bonus or replacement scalar is introduced here.
