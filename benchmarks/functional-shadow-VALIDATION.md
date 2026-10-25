# Functional shadow checkpoint — version 1.1.5

Implementation `2089818`, continuing draft PR #9. Read-only extension; no production selection, export, catalog, price or policy changes. No gameplay-power claim. The original full ledgers and destructive physical deck mutations remain archived in [shadow validation](shadow-job-ledger-VALIDATION.md).

## What is delivered

- Simultaneous, deterministic supported-subset hand/mana projection, command zone, multiplayer London mulligans, land timing, exact colored/hybrid/C/generic spending, simple rocks/creatures, tax and actual immediate draw movements.
- Two prospectively fixed pilots, card-identity coupling, Wilson deployment intervals, paired relationship ablations with endpoint-specific differences and approximate uncertainty.
- Physical shared-dependency inventory and counterfactual relationship failures; no independent-finisher certification, universal quotas or score.
- All **15** available preferred entries held out, including both preferred Wilhelt and Ulalek versions. References are not flawless ground truth. Twelve generated/source archives also replayed. Missing catalog cards stay unknown. Personal lists/traces remain private.
- Six adversarial relationship categories: persistent access, sacrifice payoff, recursion permission, C mana, fixing and printed outlet. These report specific lost jobs/edges, not simulated lethal. Missing opportunities are unknown. Prior Forge→Brilliant Plan mutation remains the persistent-versus-one-shot physical edit test.

## Actual observations

Protocol: 8 turns, 16 baseline trials for each of two fixed policies; 16 paired trials under commander-first with a separate seed, disabling up to two recognized nonland mana sources. **1,728** trace receipts checked independently for physical source reuse, printed output quantities/colors, sickness/tappedness, payments, hand transitions and 99-slot zone conservation. Benchmark wall time **4214 ms**. These are bounded model observations, not games or table win rates. Independent audit does not implement omitted Oracle effects.

| Archived deck | Commander-first deployment | Development-first | Unmodeled-text cards |
| --- | --- | --- | --- |
| yshtola-90 | 4/16 | 4/16 | 70 |
| wilhelt-163 | 6/16 | 6/16 | 76 |
| wilhelt-102 | 5/16 | 5/16 | 71 |
| wilhelt-source-136 | 10/16 | 10/16 | 74 |
| wilhelt-source-160 | 4/16 | 4/16 | 76 |
| wilhelt-source-186 | 5/16 | 5/16 | 77 |
| wilhelt-b4 | 12/16 | 12/16 | 69 |
| ulalek-b3 | 1/16 | 1/16 | 84 |
| ulalek-b4 | 1/16 | 1/16 | 87 |
| yuriko | 12/16 | 12/16 | 71 |
| zada | 0/16 | 0/16 | 69 |
| henzie | 6/16 | 6/16 | 69 |

The low modeled deployment in many decks is a coverage/pilot warning, **not evidence those decks are weak**. Many conditional/flexible lands, mana, engines and cost effects are excluded. For example Y’shtola 4/16 has Wilson interval approximately [0.102, 0.495]; native throughput remains unmodeled. Zada's zero deployment cannot justify rejecting its package. Full endpoint intervals and all 15 anonymized reference panels are in [summary.json](functional-shadow/summary.json).

Disabling recognized mana changed commander deployment in one paired case each for Wilhelt €102.06, source €136.78 and Ulalek B3 (−1/16); other generated panels had no deployment difference. This does not establish an improvement, robustness or uselessness. Printed graph deletions identify native losses where the simulator is insensitive: Wilhelt €163.25 has 13 recognized death-payoff jobs, nine recovery jobs; removing those edges affects 29 and 28 obligations respectively, with execution still unknown. Y’shtola's 18 persistent-access jobs affect 46 obligations when disabled. These are overlapping jobs, not independent engines.

## Calibration answer and gaps

Mana destruction and exact draw/resource checks are sensitive on controlled fixtures. The goldfish model is **not calibrated for strategy quality**. A removed recursion permission is identified; missing actual graveyard recursion material is not fully modeled. A broken printed outlet is identified; complete finishing-path execution remains unknown. The same applies to sacrifice payoff, repeated draw engines and win conversion. These are explicit incomplete adversarial outcomes, not passed tests. Static dependency loss does not establish its gameplay size. No constructor/reference-overlap training or per-deck pilot selection occurs.

Confidence intervals describe sampling under these policies. Constant paired outcomes use null intervals rather than claiming certainty. Trials share a model and ignored mechanics; model error dominates sampling uncertainty. Resource demand, held cards and post-action exhausted mana are reported separately; no failed obligation is inferred from an absent native event.

## Reproduction and remaining work

See [functional protocol and commands](../docs/FUNCTIONAL_SHADOW.md). Private bundle contains complete reference-ledger dependency receipts, individual representative turn traces and endpoint panels; no personal lists published. CLI does not certify legality and emits no deck export. Existing generation still enforces 100 cards, singleton, color, bracket, selected printing and budget/tolerance. No production module imports the new layer. API/status and homepage return 200 in an isolated empty worktree; Windows BAT remains unchanged, native Windows unverified. No new browser control was added.

Before migration: validate own-board cost modifiers/restrictions, repeatable access, material renewal and finishing-path execution against labeled cases. Do not compensate with a universal score or more trial volume. Karsten methodology, optional Forge (#11) and dated authoritative brackets (#10) remain separate documented integrations.

## Verification results

- Full regression suite at implementation `2089818`: **288/288**, zero failures/skips/cancellations, **115.382 s**.
- Strict printed-cost/tax audit follow-up `735fe54`: **15/15** focused tests, **128.544 ms**; all **1,728** frozen trace receipts rechecked in **4.123 s**, semantic outputs identical to the initial audit.
- The initial work-in-progress run found an immediate-draw overcount near empty library; fixed to move/count actual cards and terminate on an empty-library draw. That superseded run was interrupted after its failure rather than claimed successful.
- CLI path spaces, parsed roundtrip and overwrite refusal passed. Isolated empty-cache server returned HTTP 200 for homepage/status and was stopped. No new browser UI; native Windows unverified.
- Production selection, pricing, bracket and launcher files have no diff from the preceding shadow milestone. No generated deck or user cache changed.
