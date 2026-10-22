# Pod combo rules and Ulalek High B3 / Optimized B4 comparison

Unreleased continuation of draft PR #2, 2026-10-22 (Europe/Brussels). Version remains **1.1.5**. No merge/release, network research refresh, paid AI or new external evaluation. The existing standard combo-policy gates remain unchanged.

## Pod profile status

**No custom pod generation profile is enabled and no third “pod-approved” deck is exported.** This uses the fallback explicitly allowed in the assignment: [record the pod profile as a v1.2 implementation requirement](../docs/POD_COMBO_POLICY.md). Two-card infinites are not inherently too powerful for the pod. Their reliable execution timing is the missing evidence; card count, source bracket tags and a later possible line cannot replace it. Normal B3 conservatively excludes known compact infinite inventory; B4 permits compact packages. These are existing approximate profiles, not independently verified Wizards bracket rulings.

The cached source has 177 Ulalek variants, 164 with infinite results, but no validated earliest/reliable execution turns. Current deployment probes do not execute combo stacks, craft, tutors, sacrifice resources or extra-draw chains. Adding a pod option by simply removing the two-card gate would fail the requested timing distinction. The user's numerical definition of “reliably” also remains unspecified. The planned opt-in must allow turn-six/later two-card infinites, retain three-plus-card packages, reserve reliably fast turn-three-to-five lines for B4, and keep unknown timing unknown. Do not secretly select B4 rules for a B3 setting.

## Reproducible inputs and actual exports

Both decks are **fresh strategy-first generation**, €191 hard ceiling, same 32,197-record uploaded catalog, same 29 cached Archidekt sources, same local Spellbook library and no research refresh. Catalog SHA256: `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`. Full input and source-file fingerprints, exact selected printing IDs, per-card prices, complete candidates and requirements are retained in each audit. `sourceBaseCommit` is the starting PR revision; source-file hashes identify the unreleased audit additions used during generation.

Pricing is an **eligible-printing Scryfall EUR estimate**, with owned basics and shipping excluded. It is not a verified Cardmarket English Near Mint cart. Existing modeled/verified-offer modes are unchanged. Generator and final audit use the same selected records; no missing card is priced through an alternate-name lookup.

| Export / target | Estimate | Unused / €191 | Count | Runtime |
| --- | ---: | ---: | ---: | ---: |
| [B3 High, existing policy plain export](https://github.com/thegloon025-gif/test/blob/codex/coherent-package-investment/benchmarks/pod-combo/ulalek-b3.txt) | €174.24 | €16.76 | 100 | 174.281 s |
| [B4 Optimized plain export](https://github.com/thegloon025-gif/test/blob/codex/coherent-package-investment/benchmarks/pod-combo/ulalek-b4.txt) | €173.88 | €17.12 | 100 | 150.024 s |

Direct Archidekt category exports: [B3](https://github.com/thegloon025-gif/test/blob/codex/coherent-package-investment/benchmarks/pod-combo/ulalek-b3-archidekt.txt) · [B4](https://github.com/thegloon025-gif/test/blob/codex/coherent-package-investment/benchmarks/pod-combo/ulalek-b4-archidekt.txt). Exact audits: [B3](https://github.com/thegloon025-gif/test/blob/codex/coherent-package-investment/benchmarks/pod-combo/ulalek-b3-audit.json) · [B4](https://github.com/thegloon025-gif/test/blob/codex/coherent-package-investment/benchmarks/pod-combo/ulalek-b4-audit.json). Detailed combo prerequisites: [B3](https://github.com/thegloon025-gif/test/blob/codex/coherent-package-investment/benchmarks/pod-combo/ulalek-b3-combos.md) · [B4](https://github.com/thegloon025-gif/test/blob/codex/coherent-package-investment/benchmarks/pod-combo/ulalek-b4-combos.md). [Full card multiset differences](https://github.com/thegloon025-gif/test/blob/codex/coherent-package-investment/benchmarks/pod-combo/comparison.json).

All exports contain exactly 100 cards with the commander identified; singleton, Commander color identity, exact-price agreement and hard-budget checks pass, with zero anomalies. Both decks reproduce the previous PR #2 lists exactly (`cmp` passes): €174.24 B3 and €173.88 B4. No deck-strength change is claimed for this diagnostic-only implementation. B4 is the current generator's automatically Optimized B4 profile (`powerTarget: balanced` internally; the separate High selector is for B3). It is the selected complete candidate under existing scoring, **not a proven global optimum**. No manual card curation or extra combo-count bonus was added. Runtime overlapped automated checks and is not a controlled performance comparison.

## Actual strategy and card differences

| Measure (main deck, excluding commander) | B3 | B4 |
| --- | ---: | ---: |
| Lands | 37 | 36 |
| Average mana value, nonlands | 4.048 | 3.81 |
| Average mana value, all 99 | 2.535 | 2.424 |
| Recognized early simple mana sources | 8 | 10 |
| Simple sustained nonland output | 18 | 18 |
| Raw true-colorless nonland output | 17 | 14 |
| Recognized true-colorless land sources | 23 | 25 |
| Independent draw activations (strict proxy) | 1 | 2 |
| Supported top-library access engines | 1 | 2 |
| Role-audit positive draw | 4 | 5 |
| Role-audit conditional draw | 9 | 9 |
| Role-audit dedicated shields | 3 | 4 |
| Cached inventory infinite variants | 12 | 12 |

These are observable proxies, not simultaneous mana pools, reliable draw rates or gameplay scores. The strict investment vector and broader role audit use different exclusions: e.g. delayed loyalty removal and temporary/flash protection can receive different counts. Do not infer no protection from a zero strict shield proxy, or superior interaction from one more generic role tag.

B3 selects source `23460147`; B4 selects source `24772686`. Thirty-two slots differ in each direction, including lands and basic quantities. B4 gains Archivist, Eladamri, Curator's Ward, more small colored dorks, Sowing Mycospawn, Three Steps Ahead, World Breaker and Ugin. It loses B3's Conduit of Ruin, Roaming Throne, Thran Dynamo, Palladium Myr, Hedron Archive, Deepfathom Skulker and several native support/interaction cards, including Eldrazi Confluence and both Kozilek modal/board-control spells. Both retain Ulalek, Zhulodok, Echoes, Annie, Strionic Resonator, Unsealing, Glaring Fleshraker and Spawn-Gang.

Consequences: B4 has more early mana-source/fixing slots and a lower average mana value, but more mana creatures need to survive summoning sickness and removal. B3 retains stronger simple colorless output (17 versus 14), the Conduit tutor/reduction package and an additional passive multiplier. B4 adds free tap draw through Archivist (must survive sickness), creature top access through Eladamri and conditional protection/draw through Curator's Ward; these are not guaranteed extra cards. Its additional dorks and utility spells displace native bodies and flexible interaction. Neither the cheaper cost nor the larger nominal role counts establishes a stronger deck. Commander {C}{C} payments compete with spell casting and other activated costs; static capacities are not proof of simultaneous availability.

## Combo packages and complete prerequisites

Both decks have **12 cached infinite-inventory matches**, not 12 independent wins. B3 retains three committed packages around Annie/Chrysalis, Resonator/Spawn-Gang and Fleshraker/Roaming Throne. B4 retains four around Annie/Chrysalis, Echoes/Spawn-Gang, Resonator/Unsealing with an extra Eldrazi template, and Enigma Jewel/Basalt. Ulalek and any template are additional required cards even where abbreviated committed-package summaries omit the commander. The execution audit preserves their full quantities and zones. It also reviews every accepted infinite proposal again against the final deck: 27 B3 and 42 B4 proposals; missing proposals are not treated as available.

Eleven complete matches are shared. Most share the same Ulalek stack-copy/Spawn infrastructure and are redundant variants, not independent ways to win. B3 uniquely contains Fleshraker + Roaming Throne + Ulalek; B4 replaces that match with the nominal two-card Enigma Jewel / Basalt loop. The per-combo sheets include every named/template card and quantity, commander participation, starting zone/state, source starting mana, exact order/priority, outcomes, resource/sickness review and conversion status. Their reliable and earliest timing fields remain unknown.

Important execution distinctions:

- Ulalek must already be on the battlefield. Casting a relevant Eldrazi and paying {C}{C} are distinct costs. A future Spawn trigger cannot be spent before it resolves. An extra trigger or instant-cast line must be retained in the correct stack order; copies are not additional casts.
- Annie doubles the legendary commander's trigger; Roaming Throne requires the chosen tribe; Echoes and Unsealing require qualifying spells and, for Unsealing, an additional four/five/six-mana Eldrazi card. That card must actually be in hand, not merely in the deck.
- Resonator lines need an untapped Resonator, its {2} activation and the subsequent {C}{C} payment, in addition to the Eldrazi spell. The template and casting order remain required.
- Infinite ETB/token lines can convert through a **deployed** Glaring Fleshraker if their actual entrants meet its condition. Spawn-Gang damage additionally costs {1}{C} and an Eldrazi per activation; generated resources must be partitioned between mana and sacrifice fuel. Token/creature attacks need a later combat or haste. These are extra prerequisites when not in the named core.
- Published outcomes remain source claims. For example, the simple Annie/Chrysalis repeated step creates two Spawn and spends both to pay the next {C}{C}; that step has no net mana surplus. Do not promote a published “Infinite colorless mana” label for that variant into a verified mana-producing loop. Other cards/remaining triggers and final resource conversion need independent accounting. The cache is preserved unchanged.

### Shared conditional turn-six line

The selected decks contain the exact cards for the checked example in each audit. Commander starts in the command zone. Opening seven: Forest, Plains, Mountain, Arcane Signet, Mind Stone, Annie Joins Up, Spawn-Gang Commander. Draw Island on turn one, Wastes on two, a second Wastes on three; later draws unused. No disruption/taxes/replacement effects are assumed.

| Turn | Land and action | Payment/accounting |
| --- | --- | --- |
| 1 | Forest | No spell. |
| 2 | Plains; Arcane Signet | Pay {2} from the two lands. |
| 3 | Mountain; Mind Stone | Pay {2} from Forest/Plains. |
| 4 | Island; Annie | Forest/Plains/Mountain/Island pay {1}{R}{G}{W}. |
| 5 | Wastes; Ulalek | Forest, Mountain, Island, Wastes and Mind Stone pay all five {C/colour} symbols. |
| 6 | Wastes; Spawn-Gang | The four colored lands plus Signet pay {3}{R}{R}; retain the two Wastes for {C}{C}. Mind Stone remains available. |

Annie produces two Ulalek triggers. Resolve one, pay the reserved {C}{C}, copy the other Ulalek trigger and Spawn-Gang cast trigger. Resolve a copied cast trigger to make three Spawn; sacrifice two for the next {C}{C}, retaining one. Repeat an arbitrarily large finite number of times. End by declining optional payments and resolving spell copies. Now a Spawn-Gang permanent exists: for each 2 damage, two retained Spawn can supply {1}{C} and a third pays its Eldrazi sacrifice. These abilities have no tap/attack requirement and do not require haste. A single Spawn is never counted as both mana and sacrifice fuel.

This is **conditional turn-six feasibility under a specified favorable draw**, consistent with the cached loop and checked payment ledger. It is not a sampled rate, earliest turn, reliable turn, full-rules execution certificate or pod-policy approval. It also uses a three-card native core, not an excuse to classify every two-card loop.

### B4's nominal two-card craft loop: setup is substantial, timing still unknown

Enigma Jewel's cheap {U} front face does not supply the Locus effect. Before starting the cached loop, craft costs **{8}{U}**, exiling the Jewel and **four additional nonlands with activated abilities**. Basalt must remain a separate untapped battlefield object. The back face's inherited once-per-turn abilities are distinct from its trigger copying the external Basalt untap ability. A raw two-card inventory match hides these setup resources.

[Checked craft ledgers](pod-combo/b4-craft-example.json) expose both a deliberate T6 example and a more aggressive **conditional T4 example under the same stipulated draws**. Opener: Island, Wastes, Mountain, Enigma Jewel, Sol Ring, Mind Stone, Arcane Signet. Draw T1 Talisman of Curiosity, T2 Forest, T3 Basalt, T4 Plains, T5 another Wastes. All cards and consumed quantities are in the B4 export.

- T6 example: Jewel T1; Ring + Stone T2; Signet + Talisman T3; Basalt T4, kept untapped; craft T6. Pay {8}{U} using Island, Wastes, Ring, Stone, Signet, Talisman and Jewel's two mana. Jewel's restricted mana is used only for an activated ability. Tap the four fuel artifacts for mana before exiling them as the craft cost; they do not remain sources afterward.
- T4 example: after Ring and Stone on T2, immediately use the remaining floating mana plus Stone's mana to cast Signet. T3 cast Talisman and Basalt; T4 the same nine-mana craft payment is available. This illustrates why merely showing a T6 line cannot establish that a deck belongs to a later timing category.
- With Locus on the battlefield, tap Basalt for three {C}; pay three for its nonmana untap ability. Locus copies that ability. Resolve the copy, tap Basalt for three more {C} before the original untap resolves, resolve the original, repeat. This gives arbitrary colorless mana, **not an automatic win**.
- The four fuel cards are consumed. Extra colored mana, bodies/tokens, a deployed outlet and further casts are not free. Spawn-Gang still needs an Eldrazi for each shot; Archivist/Endbringer tap abilities do not become unlimited draws/damage from unlimited mana. No independent winning line from this pair alone is certified.

Both conditional timestamps have checked finite payment/setup ledgers. **Earliest and reliable turns remain unknown.** Neither example establishes reliably fast performance or custom-pod eligibility. The large setup burden and consumed support remain a real B4 selection risk; the current constructor is not newly calibrated for craft execution and was not changed to manufacture more combos.

## Implementation, tests and remaining limitations

- `src/comboExecutionEvidence.mjs` adds a requirement audit to both constructors, including fallback. `src/generator.mjs` attaches it without changing proposal, bracket, source, commitment, investment or scoring gates. `public/app.js` adds expandable disclosures using text content, retaining existing controls/export/pricing behavior.
- Baseline: **187 passed**, 0 failed, 126.249 seconds. Final full suite: **195 passed**, 0 failed/skipped/cancelled, **142.168 seconds**. Focused combo suite: **26 passed**, 0 failed, 11.078 seconds. Eight new regressions cover quantities/templates/commander restrictions, state and mana preservation, alternate faces including nontransforming modal cards, unknown timing despite alleged turn metadata, outlet resources, redundant piece sets, nonmutation and the paid T6 example.
- Both fresh exports pass exact selected-printing, count, singleton, color identity and hard-cap audits. Both reproduce the preceding PR exports exactly. Source-file/input hashes accompany the results, and the benchmark checks cache hashes again after both builds.
- Isolated server/API/static-page smoke: 32,197 cards, HTTP 200, **Ulalek B4 explicit legacy A/B at €122.84 / 100 cards**, exact pricing/budget checks pass and 41 requirement rows keep timing unknown/execution false. This is a separate smoke, not the strategy-first B4 benchmark. All server cache writes were confined to a disposable `/tmp` clone; original caches were not used as a writable server directory. Interactive browser and Windows execution remain unperformed.
- Syntax and whitespace checks pass. `AGENTS.md`, `CODEX_HANDOFF.md`, package/app version, Windows launcher and original cache files remain unchanged. No full catalog/account metadata is committed.
- A pilot benchmark was restarted after distinguishing modal-face setup from actual transformation. The initial isolated smoke launch failed because its temporary working directory did not yet exist; it was created, then the smoke passed. No unresolved automated failures are hidden.
- Timing and outlet review remain incomplete and are deliberately unverified. Oracle grammar can miss restrictions; source instructions/outcomes can also be incomplete or inconsistent. The two conditional examples assume exact draws and no disruption. They are not general gameplay simulation or external power validation.
- The current best-candidate selection still uses legacy scalar decisions between incomparable strategies; B4 sacrifices real native engines/interaction for other coverage and a state-heavy compact loop. This work exposes that tradeoff rather than claiming it stronger. No external EDHCheck/EDHPowerLevel score or gameplay improvement is asserted. **PR #2 remains draft.**

## Reproduce on Windows / next v1.2 work

Use a separate PR #2 checkout, retain/back up the old installation and local data, and install Node 22+. From PowerShell:

```powershell
npm test
node tools/benchmark-ulalek-combos.mjs .\data "$env:TEMP\CommanderOracle-pod-benchmark"
node tools/verify-b4-craft-example.mjs .\data "$env:TEMP\CommanderOracle-pod-benchmark\ulalek-b4.txt" "$env:TEMP\CommanderOracle-b4-craft-example.json"
```

Frozen-cache reproduction requires the same catalog/research/library; no refresh is needed. Close an older server and run unchanged `start-windows.bat` for UI review. Generate B3 High or B4 Optimized through existing controls, expand combo requirements, and import the linked complete exports manually into Archidekt/EDHCheck/EDHPowerLevel. A changed catalog/research set changes the experiment. External evaluation is still needed.

Next v1.2 work is the explicit pod-policy/timing contract, an agreed reliability definition, exact zone/alternate-face/resource and stack execution, net resource accounting and available win outlets, followed by complete-deck timing samples with real mulligan/tutor/draw sequencing. Add pod acceptance tests for turn-six and later two-card lines, fast reliable lines, and unknown timing while retaining the normal policy option, source/commitment constraints and exact-price budget enforcement. See [the full policy requirements](../docs/POD_COMBO_POLICY.md).
