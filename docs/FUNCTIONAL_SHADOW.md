# Score-free functional shadow testing (unreleased, 1.1.5)

This extends the completed job ledger; no production importer, constructor, selector, API or export calls it. It does not replace PR #4's separate native-engine work. A trace is a **conditional projection of the supported subset**, not certification that the entire Oracle game is executable. Unsupported static/trigger effects can invalidate a projection in a full game. Do not compare unfamiliar strategies as if ignored native mechanics were zero value.

## Reproduction

Node >=22, offline, from repository root (also PowerShell; quote paths with spaces):

```
node --test tests/functional-goldfish.test.mjs
npm test
node tools/functional-goldfish.mjs "local input.json" "new local output.json"
node tools/benchmark-functional-shadow.mjs "data/cards.json" "PRIVATE reference-analysis-private.json" "NEW PRIVATE output directory"
```

Input is `{commander, cards:[99 full selected catalog records], protocol:{trials:32,turns:8,seed:"fixed",policy:"commander-first"}}`. Exact selected records, legality and prices must be audited before testing; CLI accepts diagnostic inputs and does **not** certify legality, pricing or brackets. It produces observations, never exports an edited deck. No input/cache changes. Output is exclusive-create and private permissions where supported; native Windows not verified.

## Protocol and supported model

Commander starts in command zone. 99 physical mainboard slots have identity+occurrence keys; SHA256 priorities give reproducible identity-coupled permutations, including different lists. This is deterministic pseudorandom sampling, not proof of uniformly independent real games; duplicated basics have distinct occurrence keys. Changed membership may alter mulligan decisions and therefore the coupled redraw used. No per-deck seed/pilot optimization.

Multiplayer London: draw seven, keep 2–4 lands, first redraw free, at most three total mulligans. After later mulligans bottom one then two; deterministic bottom policy retains lands before spells. This intentionally simple policy may keep poor colors or excess land. Draw on turn one in multiplayer. One normal land drop per turn; untap/new turn resets supported sources and empties floating mana. Eight turns default (1–12), 1–512 trials, at most 20 casts per turn. A 20-action trace may be truncated; it is not proof of exhausting all possible plays. Empty-library draw terminates the projection as a loss, not an invented card.

Recognized unconditional `{T}: Add …` abilities support colored, C and repeated single-color output, simple two-choice sources, plain basic mana and unconditional enters-tapped. One physical activation commits its output choice; exact colored/hybrid/C/generic payments leave floating mana, not untapped sources. Mana creatures wait a turn; haste is not modeled. Search has memoized failure states and a 20,000-node bound: bound exhaustion is unknown, not impossible. Paid, conditional, restricted, consumable and multi-face sources are unknown. Sources with additional unparsed lines are conservatively excluded. No fetchland, treasure or land-search-ramp fiction.

Policies: commander-first, or supported mana development before commander. Other spells follow stable identity ordering. Instant/sorcery timing uses the goldfish main phase; unrecognized restrictions/additional/variable/alternative costs are blocked unknown. No simulated opponents. Commander tax is two generic per previous command-zone cast; `recastTurns` is an explicitly scripted test intervention, not implicit removal. Only an entire unconditional `Draw a/two/three card(s).` nonpermanent spell resolves draw. Cards actually move library→hand. Other draw engines, selection, recursion, tokens, triggers, attacks, activation payments, copy/cascade and finishing paths remain unknown.

Traces include opening/bottom cards, draws, physical land/cast/payment receipts, cost, mana value/type, per-turn available/remaining supported mana, hand size, missed land drops, blocked reasons and final zones. Blocked payment is a deficit **within supported mana**, not proof the real deck cannot pay. Remaining exhausted mana is not next-turn capacity. Inventory-qualified cast observations do not assert a trigger resolved. Commander deployment Wilson 95% intervals describe this sampled model/pilot only, never win rate. Paired mean-difference intervals are approximate; constant/one-sample data yield null intervals rather than spurious certainty.

## Dependencies and destructive diagnostics

`dependencyAnalysis` collapses nominal job links onto physical slots and lists shared obligations. Distinct slots are only potentially independent: shared mana/material/timing remains unknown. No quota for finishers or universal obligation count.

`pairedAblation` disables chosen mana/draw effects without changing physical deck, prices, legality or shuffle identity. This is an explicitly counterfactual relationship intervention, not a legal Oracle edit. It compares deployment, actual draw, casts and missed land drops individually. No detected effect is not uselessness. `ablateRelationships` names removed printed functions and affected prerequisite edges; unknown execution stays unknown. The benchmark disables persistent access, death payoffs, recursion permissions, C, fixing and printed outlets where recognized; no opportunity means unknown. Prior ledger evidence supplies legal-size physical destructive replacements, including persistent Forge→one-shot Brilliant Plan. This stage does not certify every recursion-material or finishing-path break: grammar cannot yet trace all such dependencies.

## Future integrations and integration gate

Karsten: first implement documented 99-card hypergeometric source-availability tables; specify fixed land counts, cards seen/draw-on-first-turn, mulligan assumptions and conditional-on-land-drops versus unconditional probabilities. Availability is not castability; tapped/restricted sources need separate treatment. No numbers are imported or presented as Karsten methodology here.

Forge remains separate opt-in external benchmarking per Issue #11, user-installed and bounded; no automatic download or real-win-rate claim. Issue #10 governs dated authoritative Game Changers/bracket snapshots and unknown/stale behavior. Neither roadmap item changes present bracket gates.

No production trial is justified: exact own-board cost modifiers, reusable card access, strategy engines, recursion materials and actual finish conversion remain major missing coverage. More simulation volume does not repair those gaps. Preserve all scalar selection pending separately reviewed migration.
