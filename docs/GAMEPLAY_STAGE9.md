# Stage 9 — Generalized deck-quality checkpoint

Stage 9 is an offline shadow experiment. It adds no production ranking, API,
browser flow, version change or custom pod policy. Read the
[validation report](../benchmarks/v12/stage9-VALIDATION.md) for the product
decision, complete decks and actual results.

`stage9: true` requires the existing Stage 8 native model. The default remains
off, preserving earlier archived execution. Supported new Oracle clauses are
strictly bounded:

- An optional printed mana fee followed by `Sacrifice a creature: You gain N
  life.` or `Sacrifice a creature: Scry N.` Gutless Ghoul and Viscera Seer are
  actual cached examples. No tap symbol means neither summoning sickness nor
  tappedness prevents the activation. A creature is a real paid cost, including
  legal self-sacrifice; commander sacrifice remains unsupported.
- Dark Prophecy's exact creature-death draw and life-loss clause. Last-known
  sources and simultaneous victim identities use the existing death queue.
  The draw and life loss resolve rather than awarding an access tag.

The sacrificed victim is reserved before exact fee search. It cannot also
produce mana. Death triggers from payment are placed above the activated
ability and resolve first. The original ability can resolve after its source
is sacrificed; an intervening loss ends execution before gaining life. Actual
draws, scry, life, zones, tokens and stack order have independent receipt checks.
Unrecognized relevant death/replacement/counter text blocks the proposed action
as unknown. Additional restrictions, targets and `another` costs are not parsed.

The conservative automatic pilot tries at most one supported conversion each
own turn after ordinary deployment. It sacrifices only a token or a simple
creature with an actual supported death payoff, reserves an end-step Zombie
unless death replaces it, and never sacrifices a commander or native engine.
This safety policy is intentionally incomplete: it is neither optimal sacrifice
play nor a loop/timing/infinite-combo certificate. Controlled scripts may name a
different legal noncommander victim. Combat, decayed attacks, recursion,
ninjutsu and targeted-copy strategy comparisons remain incomplete.

The protocol declares two coordinated Wilhelt recipes before fresh gameplay.
The existing `refinePackageInvestments` explicit shadow interface validates
every hard/functional/source/commitment gate; its production winner is ignored.
No construction or scalar objective is changed. The runner also performs a
fresh cached Wilhelt generation to distinguish reproducible underinvestment
from stale frozen-list artifacts.

Run with Node 22+ from the repository root. Keep original `data` backed up and
unchanged; all tools below read it only. The frozen outputs refuse overwriting.
For a new experiment, copy the protocol into a new output directory and change
the namespace prospectively; do not overwrite Stage 1–9 evidence.

```bat
npm test
node --test tests/gameplay-stage9.test.mjs tests/gameplay-stage8.test.mjs
set STAGE9_FIXTURE_DIR=benchmarks\v12\stage9\fixtures
node --test tests/gameplay-stage9.test.mjs
set STAGE9_FIXTURE_DIR=
node tools\benchmark-quality-checkpoint.mjs data benchmarks\v12\stage9 discover
node tools\benchmark-quality-checkpoint.mjs data benchmarks\v12\stage9 training
node tools\benchmark-quality-checkpoint.mjs data benchmarks\v12\stage9 holdout
node tools\audit-quality-checkpoint.mjs data benchmarks\v12\stage9
start-windows.bat
```

On an existing checkout with frozen evidence, run only tests and the audit, or
use a new output directory for the three benchmark phases. The launcher remains
unchanged. Linux HTTP verification does not establish native Windows execution
or interactive browser behavior.
