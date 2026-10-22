# Coherent investment after merged PR #1

Latest follow-up: [functional restoration and deployment evidence](../benchmarks/restoration-followup-VALIDATION.md). The [previous engine report](../benchmarks/engine-followup-VALIDATION.md) and initial report remain historical.

Base: merged PR #1, `b7070d2`. Development remains an unreleased extension of v1.1.5. The Windows launcher, price-source semantics, automatic Archidekt/Spellbook research, source caches and strategy-first constructors are retained.

## What the regression exposed

The user supplied a complete Ulalek High B3 list priced at €108.02, leaving €82.98 of €191 unused. Every card resolves in the supplied eligible-printing catalog, and that exact list reprices to €108.02. This establishes a fixed-price replay of the actual list, not an independently reproduced external rating.

The old search rejects a card unless its **individual** merit improves by more than 1.5. Its 850-card merit shortlist and three-feasible-finalist limit hide useful alternatives. It has no atomic way to replace two cards where one restores a function lost by the other, or to change a land alongside a colored engine. Its scalar deck score mostly saturates role counts; it does not distinguish one from three usable mana, reliable activation from unsupported resource conditions, or a larger protected threat from another nominal threat slot. The initial constructor still has an acquisition-price penalty. These are construction/search/objective problems; a low price does not itself establish quality or the absence of upgrades.

Raw text roles can also be misleading: a quoted token mana ability is not the artifact's own mana; an ability that grants draw-on-damage is not direct draw; cycling a permanent back on top of the library is not repeatable card advantage; suspend, legendary-permanent requirements, Treasure spending, counters, Adventure-only and wrong-tribe triggers need support. An observational trace records these boundaries rather than asserting excluded cards are weak.

## New search and comparison

`src/packageInvestment.mjs` evaluates atomic one-, two- and three-card replacements, including spell/mana-base packages. A package can cross a support threshold or fund a more expensive component by removing redundant costly cards. No incoming component must beat the outgoing component's old individual merit. Price is used only for feasibility and finding funding cuts; it earns no quality bonus.

Complete-deck comparison removes candidates dominated on the complete supported-function vector. Surviving complete strategies also receive separate paired deployment probes; only nondecreasing endpoints with a paired significant improvement can prune a strategy. Ninjutsu, death/sacrifice and targeted-spell strategies keep diagnostic probes but cannot be pruned by that incomplete model. Incomparable tradeoffs still consult the existing scalar scorer. A core-role surplus alone cannot erase losses in threats or native support. Evidence records explicit net mana output, fixing, true-colorless output, independent/scalable draw, supported native engines/copy support, meaningful threat slots, printed power among the top eight threats, unconditional threat protection, annihilator and cast-time answers. These are conservative static features, **not calibrated gameplay strength, probabilities or external power ratings**.

The PR #2 follow-up also keeps supported cascade streams, cast copying, passive/activated trigger copying, cost reduction and eligible tutors in distinct uncapped channels. Generic role surplus cannot erase losses in those channels. Between independent strategies, surplus generic quantities alone also cannot prune an alternative: the certificate needs a strategic/card-quality improvement or an unmet coverage target improved. Within one seed, safe full-vector mana improvements remain available. This conserves observable infrastructure rather than assigning a new weighted power score.

`src/engineSupport.mjs` matches each draw/cast-access trigger to eligible cards in the complete deck. Triggered access remains conditional, distinct from independent activations. Bounded discovery reserves places by trigger/access family so tap-to-draw creatures cannot hide every tribal entry or top-library engine. Same-name, emblem, Class-level and coven conditions need separate support and are conservatively excluded.

Ordinary improvements preserve the evidence vector after capping surplus coverage at policy targets. A separate restoration transaction can repair an inadmissible starting path: up to three additions/cuts, at most ten incoming alternatives and twelve outgoing slots, with twenty of the forty full evaluations reserved across repair bundles. It must satisfy all original functional floors and retain every recognized native infrastructure card/kind. Required coverage is the lesser of existing input and the targets (eight early sources, eight flow, seven answers, three shields, one wide shield, four threats, two cast-time answers); other capability floors are retained in full. These are explicit heuristics, not certified adequacy for every strategy. The final result preserves original raw true-colorless land and nonland capacity when relevant. Existing commander strategy roles (including ninjutsu openers), high-output cheap acceleration, combo commitments, source-spine floors, response limits, known bracket-combo restrictions, Game Changer limits, Commander legality, singleton and exact selected-record prices remain gates. Additional high-mana spell burden needs a mana/cost-reduction partner. Ramp-source ceilings prevent solving every deficit by adding more small mana rocks.

The search is bounded: up to three rounds, two continuation beams and forty complete evaluations per state by default; Incoming alternatives are deduplicated by playable name before limiting frontiers, so alternate printing records cannot crowd out a different card. Incoming functional frontiers, cut combinations and three-card support packages are bounded too. All complete constructors retain their three original single-card paths and unchanged baseline. The coverage leader and mana/card-flow alternatives seed **at most three** atomic expansions, and the complete legacy reference can compete as a re-invested candidate. The legacy scalar fallback cannot veto a documented functional improvement. Explicit legacy A/B mode remains unchanged.

The source selection sort now preserves structural ordering within preference groups; the prior second sort accidentally replaced it with source-key ordering. Structural source evidence remains observational, not proof of strength.

## Diagnostics and reproduction

- `budgetInvestment.candidates`: original quality/balanced/value/unchanged path prices, scores and bounded diagnostics, including watched-card rejection reasons and (when requested) complete path lists.
- `packageInvestment`: accepted atomic cuts/additions, estimated price differences, before/after/protected-input capabilities, rejection counts, bounded per-state engine discovery and watched-card outcomes.
- `constructionEngine.comparison`: named infrastructure, supported access, full vectors, per-kind deployment endpoints/samples and functional/paired selection edges; a scalar decision is labeled as a remaining incomparable tradeoff.
- `packageInvestment.functionalFloors`, `restoration`, `restoredPaths`: actual preserved minimums, starting deficits, bounded repair frontier and all validated repairs, distinct from the selected path.
- `constructionEngine`: all complete candidate outcomes and which three received atomic expansion. A nonexpanded candidate is a search-limit decision, not proof it has no upgrade.
- The browser adds coordinated-upgrade summaries. Pricing ledgers, actual-cart notes and original-budget-plus-extra regeneration retain their existing behavior.

From PowerShell in the source root, with Node 22 or later:

```powershell
npm test
node tools/trace-investment.mjs .\data .\benchmarks\ulalek-reported-108.txt "$env:TEMP\CommanderOracle-investment" empty
```

The trace uses €191/B3 and Scryfall estimates, reads the cache without changing it, and writes before/after exports, exact printing ledger and JSON diagnostics outside the checkout. Use `cached` instead of `empty` to apply the supplied recorded combo policy. Plain imported text does not contain formal generator combo commitments; normal generation preserves its actual commitments.

For complete automatic construction under fixed cached research:

```powershell
$env:BENCH_COMMANDERS = 'Ulalek, Fused Atrocity'
$env:BENCH_BRACKETS = '3'
node tools/compare-budget-search.mjs (Get-Location).Path "$env:TEMP\CommanderOracle-generated" .\data
```

Use separate output folders for the merged baseline and development source. Empty-research and cached-research runs must not be presented as interchangeable reproductions.

For the UI, retain the old installation and data backup, check out this PR in a separate folder, copy the data, close the old server, and run the unchanged `start-windows.bat`. Use strategy-first, Ulalek, €191 and High B3; retain automatic research for ordinary use. Record source commit, research mode, full export and construction/investment diagnostics. An unchanged version string alone cannot distinguish two development checkouts.

## Pricing and remaining limits

The regression replay deliberately uses one fixed Scryfall catalog and exact selected printings. These are **not verified Cardmarket English Near Mint quotes**. The existing modeled EN NM option remains an unverified estimate; verified/user-imported per-card offers require actual offer data. A single actual cart total is never spread across individual cards.

Recognition is intentionally incomplete. Opponent-dependent tax engines, unsupported triggers and unmodeled effects can be missed; exclusion is not an independent assessment that a card is weak. Static capacity is separate from `strategyExecution`: 128 deterministic no-mulligan eight-turn probes spend setup mana, recognize simple sustained sources, tapped entry and mana-creature sickness, and pay colored/hybrid/{C} costs jointly, including an optional commander payment. Distinct cascade/copy/tutor/reducer endpoints require a supported affordable follow-up. A one-sided paired exact sign test with Bonferroni correction and nondecreasing counts on every endpoint can prune a survivor; it adds no scalar weights. These separate policies are not one simultaneous game, and omit opponents, life costs, most conditional lands, bursts, tokens, tutor resolution, extra draw, ninjutsu, combat and sacrifice sequencing. Shared card records use the same seeded draw priorities. Engine recognition and the setup policy remain conservative approximations. Life/upkeep risks of scalable draw remain unmodeled. The frontiers and beams can miss non-dominating intermediate states and globally stronger decks. Brackets retain existing approximate 2–4 policies, not complete current official 1–5 certification. Real generated decks still require external validation; no fresh EDHCheck/EDHPowerLevel scores are invented.

Actual outcomes and the supplied historical regression evidence are in `benchmarks/coherent-investment-VALIDATION.md`.
