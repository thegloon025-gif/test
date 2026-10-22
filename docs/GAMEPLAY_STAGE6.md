# Stage 6 — Gameplay-informed shadow construction

Stage 6 discovers genuinely new complete decks and measures supported execution. It does **not** replace production construction, candidate selection or the investment objective. App version stays 1.1.5; draft PR #4 stays stacked on draft PR #2. See the [fixed-cache validation](../benchmarks/v12/stage6-VALIDATION.md) and [prospective protocol](../benchmarks/v12/stage6/PROTOCOL.md).

## Implementation boundaries

- `src/gameplayChallengers.mjs` uses existing strategy plans, cached same-commander/bracket sources, narrowly parsed Oracle effects and complete-deck package gates. It has no gameplay outcome/seed input. Explicit catalog tutors disclose zero source appearances when applicable. It searches coordinated one-to-three-card packages, at most two rounds and four final family representatives. It preserves native/access channels as physical cards, committed combos, source floors, early high-output mana, input functional floors, true C, land count, legality, bracket policy and exact selected-record prices. Incoming cards do not earn merit for their prices.
- `src/packageInvestment.mjs` accepts bounded explicit package requests only with `shadowOnly:true`; the normal schedule and winner do not change. All existing full-deck gates still run. The observer can retain a safe incomparable experiment without overriding the production dominance gate. Shadow-protected cards cannot be removed through explicit requests.
- `src/gameplayComparison.mjs` defines the eight-turn terminal contract and paired comparisons, without a scalar quality score. Existing Stage 5 gameplay, pilots, payments, native effects and stack/outlet audits are unchanged.
- `tools/benchmark-construction-gameplay.mjs` separates discovery, training and holdout. It refuses to overwrite frozen phase files, fingerprints implementation/protocol/catalog/research/history, exports exact records, audits every run and checks deterministic replay with/without diagnostic observers. A bounded discovery phase precedes all new simulation, and every discovered frontier deck receives every predeclared pilot, decision and seed.
- `tools/audit-construction-gameplay.mjs` independently reads persisted exports, printing ledgers and vectors, recomputes paired comparisons and reaudits/replays the fixed receipts. Its independence is from summary/selection bookkeeping; it shares the existing strict Oracle grammar with the resource/zone/stack/outlet audit, not a second complete Magic rules engine.
- `tools/summarize-construction-gameplay.mjs` aggregates actual prefix receipts, the old Stage 5 diagnoses and the prospectively specified integration evidence screen. It cannot vote in production selection.

## Terminal outcomes and uncertainty

Search bounds and runtime unsupported-rule events take precedence over otherwise claimed completion or terminal outcomes. Static unsupported clauses remain disclosed even for an ordinary completed simulation: `completed-t8` means completion of the supported model, not full Oracle coverage.

Conditional lethal, its actual turn, supported model loss and complete T8 observations are separate. A lethal/lost/unknown run has `t8:null`. T3/T5/T7 observations require an actual complete preterminal landmark. Payment bounds lacking a timed receipt conservatively withhold all landmarks. Prefix payments, damage and resolved effects describe only what occurred before termination; they are never extrapolated to T8.

Paired terminal event incidence includes all seeds, with full [0,1] uncertainty for unknown outcomes. Nonterminal contrasts disclose the identities and count of omitted pairs and are conditional subset descriptions. Every fixed pilot/decision has separate deterministic nominal 95% bootstrap intervals; pilots are correlated, not additional independent samples. The small exploratory cohort has no multiplicity correction, and all-tie intervals can understate population uncertainty. No real-game win percentage follows from three inert 40-life seats.

Identity coupling gives common physical card names/occurrence labels stable random priorities across changed decks. It preserves common-card relative order, not absolute draw slots, mulligans, subsequent actions or downstream tutor/cascade shuffle labels. Replacing a card can legitimately change every later action.

## Offline Windows reproduction

Use Node.js 22+ and run from the repository root. Keep your original `data` directory backed up. These scripts read it without refreshing it. They require the original frozen catalog/research hashes; an updated database deliberately fails reconciliation rather than pretending to reproduce these results. No dependencies need installation.

```powershell
npm test
$stage6Output = Join-Path $env:TEMP ('commanderoracle-stage6-' + [guid]::NewGuid())
New-Item -ItemType Directory $stage6Output
Copy-Item benchmarks/v12/stage6/PROTOCOL.md $stage6Output
node tools/benchmark-construction-gameplay.mjs data $stage6Output discover
node tools/benchmark-construction-gameplay.mjs data $stage6Output training
node tools/benchmark-construction-gameplay.mjs data $stage6Output holdout
node tools/summarize-construction-gameplay.mjs $stage6Output
node tools/audit-construction-gameplay.mjs data $stage6Output
```

Start the unchanged application with `start-windows.bat`, check the 1.1.5 header and import a linked full deck into Archidekt/EDHCheck/EDHPowerLevel for manual evaluation. Those generated shadow lists do not automatically replace the application's ordinary output. Scryfall EUR amounts are eligible selected-printing estimates with owned basics; they are not verified Cardmarket English NM offers or current purchase quotes.

## Remaining limits and integration decision

Read the validation report before interpreting candidate totals. Missing combat/opponent interaction, unsupported tutor choices/targets, triggered life effects and native strategy gaps can favor one package in the partial model. Yuriko, Wilhelt and Zada still require abstention. No combo reliability threshold or custom Pod High-Power profile is enabled. Stage 6's conservative evidence screen is a review gate, not a new deck-ranking formula. Any opt-in gameplay-aware construction trial needs a separate explicit review; this implementation leaves production unchanged.
