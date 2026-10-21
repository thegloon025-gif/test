# PR #2 follow-up: strategy infrastructure and supported card access

This continues draft PR #2 from `b55cc01`. Historical results in [the initial report](coherent-investment-VALIDATION.md) remain unchanged. No new EDHCheck or EDHPowerLevel scores were obtained. Static evidence, prices and changed lists below do not certify gameplay improvement.

## Why €131.88 won

This was an indirect Pareto-frontier failure. The €152.92 `local:threats` deck dominated both the €170.59 `source:archidekt:23460147` and €177.71 source according to the old vector. That deleted the €170.59 source with scalar 187.78. The €131.88 source (183.69) then won among the remaining candidates. The cheap local deck did **not** directly dominate the €131.88 winner.

The old `supportedEngines` and `copySupport` capped at six and two. They merged different effects. The threats list retained a tutor and a cascade creature but lost the cast-spell copier and a passive trigger multiplier; another copy artifact could fill the nominal quota. The cascade parser also missed `from your hand` wording. A higher count of generic functions could therefore erase a coherent engine tradeoff.

The corrected comparison adds separate, uncapped capability channels for supported cascade streams, cast copying, passive triggered-ability multiplication, activated trigger copying, cost reduction and tutors with real eligible targets. Target/support lists come from actual selected cards, including relevant land infrastructure. The channels are conservation evidence, not extra weighted merit or execution-certified combos. Extra generic ramp cannot compensate for a lost channel in a dominance claim. Across independent strategies, an otherwise nondecreasing vector must additionally improve a strategic/card-quality capability or close an unmet existing coverage target (eight early sources, eight flow functions, seven answers, three shields or four threats). Surplus generic quantities above those targets alone keep both decks for the existing scorer. Safe full-vector improvements within one seed still compete normally. This conservatively changes pruning, not merit weights; price earns nothing. Existing combo commitments and legality/bracket/mana/budget gates remain in place.

An isolated replay reconstructs **all eight exact completed candidates**, asserts 99 main-deck cards, singleton and exact cached prices, and changes only the evidence used for selection. Old evidence reproduces €131.88; corrected evidence selects the existing **€170.59 source**. The other three commanders retain their previously selected candidates in this isolated comparison. This separates a selection fix from any new cards acquired during regeneration.

[Old evidence and dominance edges](engine-followup/old-candidate-evidence.json) · [Corrected evidence on the same complete lists](engine-followup/new-evidence-on-old-candidates.json).

## Card access recognition and bounded discovery

The shared `src/engineSupport.mjs` matches qualifying cards rather than counting the word “draw.” On the frozen €131.88 list:

| Card | Eligible support | Classification and limit |
| --- | ---: | --- |
| Kindred Discovery | 35 tribal creatures | Supported entry branch; the additional attack branch does not invalidate entry support. Requires the commander's inferred tribe; combat-only text stays conditional. |
| Guardian Project | 40 unique creatures | Supported nontoken entry engine under singleton names. Repeated creature names do not establish this support. Graveyard/board sequencing is not simulated. |
| Mystic Forge | 55 spells | Artifact or genuinely colorless top-library spell access, excluding lands and colored nonartifacts. This is conditional access, not unconditional draw. |
| Up the Beanstalk | 20 spells | Supports its separate mana-value-five cast trigger. Its own entry cantrip is not used as proof of repeatable value. |

Supported trigger/activation counts remain distinct: none of these four is promoted to independent unconditional draw. Mystic Forge's life-cost exile ability is not treated as its card-advantage engine. Entry/cast support uses the existing minimum eight qualifying spells/creatures; top access requires sixteen. Infrastructure thresholds are conservative eligibility heuristics, not calibrated probabilities (cascade: at least four qualifying casts; tutors: at least one qualifying target).

Discovery now reserves separate bounded places for independent activated engines, broadly supported cast engines, low-mana cast engines, tribal entry engines, generic entry engines, top-library access and currently castable low-mana flow. Alternate records of a name still share a slot. At most ten distinct draw alternatives arise from those reservations; the original round/beam/forty-evaluation limits remain. `packageInvestment.discovery` records each state's frontier and color-casting warnings; `constructionEngine.comparison` records full candidate vectors, named infrastructure and dominance edges.

Conservative exclusions remain for combat-only, Treasure/payment, discard, unsupported Adventure/zone triggers, wrong tribes and insufficient mana-value support. Real-catalog traces caught false positives involving coven-qualified top casting, Class-level casting, planeswalker ultimate emblems and a named-creature trigger in a singleton deck. All were excluded before final verification, with regression cases. Power conditions after the draw instruction filter real creatures; forced end-step hand discard is not promoted to a reliable engine. Zero mana values on reversible records use the casting-face mana cost locally for engine support/discovery, without mutating the selected printing or its price. Other legacy heuristics still consume raw catalog mana values; broad catalog normalization is outside this change. Temporary spell effects and land-only top access do not become repeatable draw engines. Supported access still does not simulate deployment, blockers, life loss, removal, or actual top-card availability.

## Reproduction and fixed inputs

All real-catalog comparisons use the same uploaded 32,197-card catalog, SHA256 `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`, same 29 cached public decks and recorded combo library, €191 and High B3. No network research is refreshed. Prices are eligible-printing Scryfall EUR estimates, owned basics, no shipping; **not verified Cardmarket English NM offers**. Original uploaded caches and the Windows launcher remain unchanged.

From PowerShell in the source root (Node 22+):

```powershell
npm test
$env:BENCH_COMMANDERS = 'Ulalek, Fused Atrocity'
$env:BENCH_BRACKETS = '3'
node tools/compare-budget-search.mjs (Get-Location).Path "$env:TEMP\CommanderOracle-engine-followup" .\data
node tools/compare-candidate-evidence.mjs (Get-Location).Path .\data .\benchmarks\coherent-investment\current-cached.json "$env:TEMP\CommanderOracle-selection-replay.json"
```

Retain a backup of the installation/data, test the PR checkout in a separate directory and run unchanged `start-windows.bat` after closing any older server. Select strategy-first, Ulalek, €191 and High B3. Ordinary UI use can retain automatic research; it will not exactly match the frozen-cache experiment if sources change. Review named infrastructure, exported prices and the complete list, not just the internal scalar. Windows execution and fresh permitted external scoring remain local checks.

## Final regenerated outputs and tradeoffs

Fresh construction is a separate experiment from the frozen-candidate selection replay. It reruns the same fixed catalog/research, old single-card paths and bounded atomic search. **Ulalek changes €131.88 → €134.21**, leaving **€56.79**, with the same selected public source `14494014`. All outputs below contain 100 cards and reconcile against the exact selected printing records; every budget audit passes with zero anomalies.

| Commander / B3 | b55cc01 | Follow-up | Unused | New candidate |
| --- | ---: | ---: | ---: | --- |
| Ulalek | €131.88 | €134.21 | €56.79 | `source:archidekt:14494014` |
| Yuriko | €113.61 | €126.04 | €64.96 | `local:resilience` |
| Wilhelt | €171.33 | €102.06 | €88.94 | `local:engine` |
| Zada | €166.39 | €158.68 | €32.32 | `local:tempo` |

Ulalek has three changes relative to the original PR #2 export: **Insight Engine → Mystic Forge**, **Tablet of Compleation → Elven Chorus**, and **Deepfathom Skulker → Archivist**. This trades scalable activated draw and tribal combat-draw/evasion support for two conditional top-library access engines and a free tap-to-draw activation. The top-access engines overlap in eligible cards: their counts are not additive draw rates. Archivist is slower than an immediate draw spell because it must survive summoning sickness. Elven Chorus also grants creature mana abilities; the conservative mana-capacity parser does not certify that grant as immediately available mana. This is a real functional change, not just a scalar increase, but it is **not established stronger gameplay**.

The three accepted atomic changes are Spell Satchel → Mystic Forge (+€1.80), Tablet of Compleation → Elven Chorus (+€2.61), and Deepfathom Skulker → Archivist (+€0.02). The before export had already changed Satchel to Insight Engine; hence the final before/after net price increase is €2.33. The selected source retains modeled nonland true-colorless output 14 and 23 recognized true-colorless land sources; these static counts do not certify on-turn availability. Exact exports: [before](engine-followup/ulalek-before.txt), [after](engine-followup/ulalek-after.txt).

Yuriko changes eight cards, replacing several cheap evasive creatures (including Pit Imp, Ravine Raider and Blight Keeper) with draw/selection spells and larger acceleration, including Thran Dynamo and Staff of Compleation. The seed preserves its opener floor, but fewer excess openers can still weaken actual ninjutsu consistency. This needs playtesting. Wilhelt changes twenty-four cards and loses The One Ring and Graveborn Muse while adding more Zombies and sacrifice/death support such as Carrion Feeder, Phyrexian Ghoul, Diregraf Captain, Headless Rider and Plague Belcher. The rules now conservatively reject unmodeled sacrifice-cost draw as reliable access; that can **undervalue genuine synergy in a sacrifice commander**, and the much cheaper replacement list must not be called a quality win. Zada changes one card, Canoptek Spyder → Mystic Forge, trading a restricted artifact-entry draw trigger for top-library access. Its mana and top-card blocking risks remain unmodeled.

Full multisets of cuts/adds (including basic-land quantities) and price differences: [deck differences](engine-followup/deck-differences.json). All four before/after exports, eligible selected-printing details and full construction/investment traces are in [final generation](engine-followup/generated-after.json).

## What still prevents the preferred investments

The false strategic dominance edge is fixed, but **the full-budget/gameplay regression is not demonstrated resolved**. Fresh generation still omits Zhulodok and Conduit of Ruin from the winner. Two separate barriers are now visible:

1. The regenerated source `23460147` still creates €170.59 balanced/value paths and a €171.20 quality path. All fail its existing protected-input checks: early-mana count 9 versus required 10, repeatable output 14 versus 15, fixing 0 versus 1, wide shielding 0 versus 1, and cast-time answers 2 versus 3. The unchanged €127.52 seed is admissible and can acquire Mystic Forge. Selecting the €170 list directly would bypass preserved functional constraints; a successful multi-card restoration package is still needed. These floors may overprotect surplus counts, but this change does not silently relax them.
2. The complete €177.71 cascade/tutor source now survives dominance. It is incomparable with the €134.21 winner, and the existing scalar tie-breaker favors the latter (185.51 versus 170.13). The separate capability channels expose the strategic tradeoff; they cannot establish which list wins games. This remains an objective/calibration risk rather than a hidden claim that generic ramp replaces a tutor.

[Final candidate evidence and starting-path deficits](engine-followup/final-candidate-evidence.json) records these checks. The safe next work is restoring required functions around valuable native packages and validating whole strategies, rather than adding a price bonus or bypassing the safeguards.

## Supplied €108.02 list, empty research

The same read-only replay now finishes **€114.66**, unused **€76.34**, swapping Spell Satchel → Eladamri, Korvecdal (+€6.64). Its creature top-library access is supported, but the extra activation/cheat ability is not counted as a certified cast-trigger combo. The original draft's €157.71 replay chose Mana Vault instead. The new result trades that burst for conditional card access; reduced spending is neither proof of efficiency nor proof of stronger gameplay. The missing-investment problem remains open.

All four requested engines are now actually considered in this replay: Kindred Discovery 14 complete proposals, Guardian Project 15, Mystic Forge 8 and Up the Beanstalk 10. Guardian Project, Forge and Beanstalk have accepted intermediate states, but none reaches the selected final branch. Other combinations fail mana-demand, ramp-count, budget or coverage gates. Counts are events across states, not independent trials or exclusive reasons. [Full replay and exact printing ledger](engine-followup/supplied-list-replay.json) · [before](engine-followup/supplied-before.txt) · [after](engine-followup/supplied-after.txt).

## Verification and limits

- Baseline `npm test` on b55cc01: **168 passed, 0 failed**.
- Final focused engine/package suite: **24 passed, 0 failed**.
- Full regression suite on final production code: **180 passed, 0 failed**, no skipped/cancelled tests, 127.024 seconds. The final fixture-only refinement was also rerun in the focused suite.
- The new regression reconstructs saturated old role counts: a generic mana replacement used to dominate away each of a tutor, cascade source and cast copier. Separate capabilities block each incorrect edge. Another test preserves independent candidates when only surplus generic mana differs, while retaining deficit improvements and safe within-seed upgrades. No price bonus is tested or introduced.
- Four B3 fixed-cache exports pass card-count, budget and exact-selected-printing audits. The diagnostic CLI also reconstructs and reprices every complete candidate, verifies singleton, and independently reproduces final selection.
- Final server/HTTP smoke: 32,197 cards loaded; HTML and existing browser script load; Yuriko B4 returns HTTP 200, **100 cards / €116.38**, exact selected-record price agreement, within cap and zero anomalies; new comparison diagnostics are present. [Smoke result](engine-followup/http-smoke.json).
- Module syntax and `git diff --check` pass. Original instruction/handoff files and Windows launcher are unchanged; actual Windows batch execution and interactive browser testing were not available here.
- Recognition remains a bounded Oracle grammar. It misses some supported effects and can undervalue death/sacrifice or combat strategies. Support is not deployment probability, actual life cost, top-card availability, or the ability to cast an Eldrazi and retain two usable {C}. Existing approximate bracket policies and combo commitment checks are preserved, not newly certified against all official current rulings.

**Keep PR #2 in draft.** No external power improvement, complete spending optimum or resolved gameplay regression is claimed.
