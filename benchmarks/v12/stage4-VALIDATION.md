# Stage 4 — Native strategy execution validation

The opt-in model now resolves supported Ulalek-native stack events and actual library/resource changes. **No repair demonstrates a robust complete-deck improvement.** Two B3 comparisons remain inconclusive; the other ten require abstention because native expansion reaches a bound in at least one paired cohort. Production construction and candidate selection remain unchanged. No external evaluator was called, and no improved power, reliable combo turn or win rate is claimed.

## Review and reproduction

Review implementation separately from these generated artifacts: commits `f569604` (native executor, independent audits and controlled tests), `9ba4fc2` (suspended/loss prefixes) and `0943eca` (persisted-artifact auditing and readable explanations). The final cohort used source commit `9ba4fc2f257daae5b4403fa127d648565cc3f100`; its complete source/cache/archive SHA256 manifest is in [comparison.json](stage4/comparison.json). The final helper audit records its own source hash in [independent-audit.json](stage4/independent-audit.json).

- [Mechanics, assumptions and Windows/offline commands](../../docs/GAMEPLAY_STAGE4.md).
- [Protocol fixed before the full comparison](stage4/PROTOCOL.md).
- [Every repair's paired measurements, uncertainty and pilot tradeoffs](stage4/paired-measurements.md).
- [Human-readable real-card turn sequences](stage4/sequence-reviews.md), with complete linked stack/resource/zone receipts.
- [All complete before/after exports, additions/cuts and selected-printing audit paths](stage4/exports.json).
- [Test outcomes](stage4/test-results.json), [independent audit](stage4/independent-audit.json) and [isolated server smoke](stage4/http-smoke.json).

Stage 1/2/3 archives, historical external measurements, the seven uploaded cache files and the Windows launcher are byte-preserved. App version remains **1.1.5**. PR #4 remains stacked on draft PR #2; neither is merged or released.

## What changed in the model

`gameplayNative.mjs` adds strict Oracle-text templates for supported effects, with distinct stack identities and actual LIFO resolution. Ulalek pays its separate `{C}{C}` only at resolution from resources available then. Annie Joins Up, Roaming Throne and Echoes of Eternity add qualifying triggers according to their source-zone/type restrictions; multipliers are additive. Copies preserve provenance and do not become casts. Copied permanent spells become tokens and can produce supported entry effects; legends retain the physical original under a fixed choice.

Cascade reveals actual library cards and may cast only its first qualifying hit; an unsupported hit is declined with an unknown reason. Actual free casts produce cast triggers, while spell copies do not create fresh cascade. Supported tutors move real inventory to hand or library top, then shuffle where required. Searches are distinct from cards obtained. Spawn/Scion mana appears only after the producing effect resolves; generic cost reductions and first-creature limits apply only to actual casts. Refill-to-seven and existing supported card-access effects move actual cards.

`gameplayNativeAudit.mjs` independently replays resource/zone/stack receipts without calling the pilot, executor or payment planner. It verifies payment authorization, distinct casts/copies, trigger provenance/multiplication, LIFO conservation, real cascade hits, tutor inventory/destinations, token budgets, reductions, legends and end snapshots. Counter totals must match receipts. It shares the narrow Oracle grammar with execution, so this is independent ledger auditing, not independent certification of every Magic rule. Controlled expectations and tamper tests cover that shared boundary.

The mode defaults off. Existing generator, package investment, strategy-first objective, selected-record pricing, research, API/UI and launcher behavior are unchanged. Native measurements add explanations, not a price bonus or replacement ranking objective.

## Fixed inputs and comparison design

The pristine uploaded catalog contains 32,197 cards; `cards.json` SHA256 is `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`. The same 29 cached community sources, Spellbook files and frozen selected-printing ledgers are used throughout. No fresh research, catalog refresh, production generation or repricing occurred.

Compare the two frozen Ulalek originals and exactly the twelve Stage 3 proposals in both Stage 3 and Stage 4 modes. Yuriko, Wilhelt and Zada receive native-mode coverage checks on their frozen originals. Budget is €191 under the original standard B3/B4 policies. Exact prices are eligible selected-record **Scryfall EUR estimates**, using the frozen owned-basic assumptions; these are not verified Cardmarket English Near Mint offers. Wilhelt retains its selected reversible Grimgrin record (€10.77), rather than the cheaper name alias.

The cohort uses **16 training and 32 disjoint holdout seeds per pilot**, extending Stage 3's 8/16 samples without relabeling them. All three fixed pilots—commander-first, development and native—run every list. No mulligans, per-deck best-pilot selection or new repair search. The fixed order is copy-first, with 192 resolution steps per turn, 128 concurrent objects and the inherited 4,000-node exact mana-search limit. Only controlled tests contrast a resources-first ordering.

Common-card coupling uses SHA256 priorities keyed by schema, seed, canonical card identity and duplicate occurrence. A retained card keeps its relative priority, independent of printing or deck position; replacements receive their own priority rather than the outgoing card's slot. Absolute positions and later draws can diverge. Tutor/cascade shuffle priorities also depend on the effect context, so diverging effect sequences can diverge later order. This is reproducible identity coupling, not identical hands or guaranteed variance reduction.

The original Stage 3 primary endpoints/verdict recipe is preserved. Paired bootstrap intervals use 2,000 deterministic resamples, nominal 95%, separately by pilot and partition. They are exploratory, without multiplicity correction. Native copy/token/tutor/cascade counts are explanatory only. Runs from different pilots share seeds and must not be pooled as independent probability samples. Unsupported outcomes remain unknown. Bounded seeds are retained with null incomplete endpoints, never dropped for a favorable complete-case estimate.

## Complete-deck outcomes

Every linked list is a complete 100-card export. All original/proposal audits pass exact selected-printing €191 ceilings, singleton/color legality, source-spine floors, native infrastructure and committed combo protection. These are unchanged Stage 3 proposals, **not new recommended decks**. Bounds below are training / holdout pilot-run counts (48 / 96 runs per list).

| Complete deck | Incoming versus original | Outgoing | Price / unused | Native bounds T/H | Native verdict |
| --- | --- | --- | --- | --- | --- |
| [ulalek-b3-original](stage4/ulalek-b3-original.txt) | — | — | €174.24 / €16.76 | 0/0 | original / coverage check |
| [ulalek-b3-repair-01](stage4/ulalek-b3-repair-01.txt) | City of Brass | Temple of Malady | €182.52 / €8.48 | 0/0 | inconclusive-tradeoffs |
| [ulalek-b3-repair-03](stage4/ulalek-b3-repair-03.txt) | Up the Beanstalk, City of Brass | Gideon Blackblade, Temple of Malady | €184.22 / €6.78 | 0/2 | abstain-search-bound |
| [ulalek-b3-repair-04](stage4/ulalek-b3-repair-04.txt) | Birds of Paradise, Up the Beanstalk, City of Brass | Arcane Signet, Gideon Blackblade, Temple of Malady | €186.84 / €4.16 | 2/0 | abstain-search-bound |
| [ulalek-b3-repair-11](stage4/ulalek-b3-repair-11.txt) | Forbidden Orchard | Temple of Malady | €179.30 / €11.70 | 0/0 | inconclusive-tradeoffs |
| [ulalek-b3-repair-13](stage4/ulalek-b3-repair-13.txt) | Up the Beanstalk, Forbidden Orchard | Gideon Blackblade, Temple of Malady | €181.00 / €10.00 | 0/2 | abstain-search-bound |
| [ulalek-b3-repair-14](stage4/ulalek-b3-repair-14.txt) | Birds of Paradise, Up the Beanstalk, Forbidden Orchard | Arcane Signet, Gideon Blackblade, Temple of Malady | €183.62 / €7.38 | 2/0 | abstain-search-bound |
| [ulalek-b4-original](stage4/ulalek-b4-original.txt) | — | — | €173.88 / €17.12 | 0/5 | original / coverage check |
| [ulalek-b4-repair-01](stage4/ulalek-b4-repair-01.txt) | City of Brass | Forest | €182.31 / €8.69 | 0/5 | abstain-search-bound |
| [ulalek-b4-repair-02](stage4/ulalek-b4-repair-02.txt) | Birds of Paradise | Arcane Signet | €176.50 / €14.50 | 0/4 | abstain-search-bound |
| [ulalek-b4-repair-03](stage4/ulalek-b4-repair-03.txt) | Up the Beanstalk, City of Brass | Gideon Blackblade, Forest | €184.01 / €6.99 | 0/6 | abstain-search-bound |
| [ulalek-b4-repair-04](stage4/ulalek-b4-repair-04.txt) | Birds of Paradise, Up the Beanstalk, City of Brass | Arcane Signet, Gideon Blackblade, Forest | €186.63 / €4.37 | 1/6 | abstain-search-bound |
| [ulalek-b4-repair-13](stage4/ulalek-b4-repair-13.txt) | Up the Beanstalk, Forbidden Orchard | Gideon Blackblade, Forest | €180.79 / €10.21 | 0/6 | abstain-search-bound |
| [ulalek-b4-repair-14](stage4/ulalek-b4-repair-14.txt) | Birds of Paradise, Up the Beanstalk, Forbidden Orchard | Arcane Signet, Gideon Blackblade, Forest | €183.41 / €7.59 | 1/6 | abstain-search-bound |

All twelve larger-sample **Stage 3-mode** verdicts remain `inconclusive-tradeoffs`. Stage 4 supplies no robust promotion: B3 repair-01 and repair-11 remain inconclusive, four B3 and all six B4 proposals abstain. A bound in the B4 original also blocks its otherwise unbounded comparisons. Reaching a bound is neither evidence of an infinite nor a reason to reject a deck as weak.

For example, B3 repair-01's holdout commander-tempo differences are +0.031 [-0.156, 0.219], +0.063 [-0.063, 0.188] and +0.031 [-0.188, 0.250] across the three pilots; all include zero. Its net physical-card differences also span zero. For B3 repair-03, development holdout shows commander tempo +0.156 [0.031, 0.281] and net physical cards +0.500 [0.000, 1.125], but other pilots encounter unresolved bounds, and training tempo is -0.188 [-0.625, 0.125]. Selecting that one favorable result would not establish a robust improvement. See the full paired tables for every repair rather than treating these illustrations as a selection rule.

The other frozen originals cost Yuriko €126.04, Wilhelt €102.06 and Zada €158.68. Their missing native mechanics still require abstention; zero observed Ulalek-native events is not zero strategy performance.

## Hand-reviewed deterministic decisions

These stipulated opening/draw/script sequences use the real cached card records and complete decks; they demonstrate supported mechanics, not occurrence probabilities or earliest combo turns. All have audited deterministic replays.

| Sequence | Actual result and decision evidence |
| --- | --- |
| Paid copy and entry resources | Commander T5, Spawn-Gang Commander T6, Drowner of Hope T7. Two separately paid Ulalek triggers produce two spell copies, one trigger copy and ten actual tokens: six Spawn and four Scion. Resources exist only after resolution. |
| Multiplied trigger sequence | Annie T4, commander T5, Spawn-Gang T6. Two paid and one declined copy-trigger resolutions yield two spell copies, three trigger copies and nine Spawn. This fixed line terminates; it is not an inferred infinite. |
| True-colorless shortfall | Commander T5 and Endbringer T6, with only Mind Stone supplying true C. Colored lands can fix spells, but spending the C on the spell leaves no separate `{C}{C}`. The trigger is declined; no copy is credited. |
| Actual cascade | Zhulodok T3 and Devourer T4 generate two real cascade casts: Annie Joins Up and Basking Broodscale. Copied spells do not trigger new cascade. |
| Native engine versus generic mana | Replacing Zhulodok with Worn Powerstone gives extra mana after untapping, but loses both cascade casts in the paired script. Counterfactual price €133.20 versus €174.24. This cut fails native-infrastructure protection and is not an eligible repair or recommendation. It proves a lost function, not overall superiority of the original. |
| Echoes and cascade | Echoes T3, Zhulodok T4, Devourer T5. Four actual cascade casts—Basking Broodscale, Blisterpod, Chittering Dispatcher and Conduit of Ruin—plus six resolved spell copies, two actual tutor-to-top movements and three additional multiplied triggers. |
| Tutor/copy deployment | Commander T4, Conduit T5, Devourer T6, using actual top-of-library movement and next draw. Four tutor searches, eleven spell copies and nine trigger copies are recorded separately; generic-only reductions do not pay C. |
| Fixed access/deployment tradeoff | Previously fixed B4 holdout:9/development: original commander T5, one effect-drawn card, no paid Ulalek trigger; repair-03 commander T6, 22 effect-drawn cards and eight paid triggers. Access has a real deployment cost; neither one trace nor a draw count establishes the better complete deck. |

The [sequence review](stage4/sequence-reviews.md) links each full receipt and exact deck. The native/generic counterfactual is isolated from the eligible repair cohort. Both access-tradeoff traces are held fixed from the Stage 3 review.

Across original holdout prefixes, B3 records 150 resolved spell copies, 69 trigger copies, 19 tutor searches, 143 tokens and 108 paid original/additional triggers. B4 records 380 created spell copies but only 152 resolved, 681 trigger copies, 255 tokens and 124 paid original/additional triggers. B4 has five bounded holdout runs and one supported model-loss run, so created copies are not assumed to resolve and counters are definite prefixes only.

Neither original has an observed cascade in this **holdout** cohort; B3 training does have eight cascade casts. Zhulodok is actually cast seven times in B3 holdout and thirteen in B4 holdout, but no qualifying follow-up is cast within the remaining modeled horizon before termination. Controlled sequences demonstrate what those engines can do with a follow-up. An eight-turn/pilot-specific absence is insufficient evidence to remove protected cascade infrastructure. Full partition/pilot observations are in [observations.json](stage4/observations.json).

## Audits, tests and runtime

- Baseline: **253/253 passed**, 0 failed/cancelled/skipped; 135.277837848 s.
- Focused deployment/access/shadow/native suite: **78/78 passed**, 0 failed/cancelled/skipped; 3.286824947 s.
- Final full suite: **273/273 passed**, 0 failed/cancelled/skipped; 151.633478441 s. Twenty native tests include payment failures, additive multipliers, copies versus casts, cascade order, tutors, token timing, reductions, independent tamper detection, bounds, model losses and unfamiliar-commander abstention.
- Cohort: **4,464 evaluations** = (14 Ulalek lists × 2 modes + 3 other originals) × 48 seeds × 3 pilots. Plus 31 representative full-trace reruns: **4,495 resource/zone/stack audits and 4,495 identical replays**. Nine additional real-card sequence/tradeoff evaluations are also audited and replayed.
- Persisted independent audit: **24 exact 100-card exports**, **3,100 selected-printing checks**, **40 representative full receipt audits**, **4,464 serialized cohort vectors**, **48 native bounded vectors** and **3 native model-loss vectors**. Bounded/loss endpoints remain incomplete, not fabricated T8 values.
- Foundation preservation: **160 Stage 1 hashes**, **15 Stage 2 full traces** and **1,008 old Stage 3 metric vectors** match. Cache/archive/production-selection fingerprints pass.
- Final cohort wall time: **257.067 s**, measured while the test suite also ran. Stage 3 evaluator aggregate time 98.055 s; Stage 4 144.551 s (65.318 simulation, 18.351 audit, 56.774 replay, with key/summary overhead). This is environment/load-specific, not a production latency guarantee. Cache storage is bounded at 128 entries; zero hits in this deliberately unique-input cohort, so no cache speedup is claimed.
- Persisted independent audit: **4.340 s**. Server smoke used an isolated disposable cache: `/`, `/app.js`, `/style.css` returned HTTP 200, version 1.1.5, 32,197 cached records and successful cached Ulalek lookup; no network research. Native Windows BAT/browser execution was unavailable on Linux; launcher bytes are unchanged.

Development audits caught a mid-copy object-bound prefix that had been presented as completed and a mandatory copied draw exhausting the library. Both now emit explicit suspension/loss-abortion receipts, receive regression tests and pass the final independent audit. A synthetic unit fixture exceeding the existing per-source mana bound was corrected to an explicit supported ritual; production mana limits were not relaxed. No final test, export or receipt audit remains failing.

## Remaining risks and next steps

This is a supported own-stack subset. Unparsed targets, removal, counters, combat, death, alternate faces/costs, conditional untaps/mana, graveyard recursion, craft and arbitrary copy choices can change actual gameplay. Strionic Resonator/holding-priority lines and full pod combo execution are not implemented. Fixed tutor choices are cheapest eligible MV then name, not expert planning. Fixed trigger order and pilots can miss a legal resource-first line or pay optional copies that an informed player would decline.

When a bound interrupts an ability, the prefix is explicitly suspended; unresolved effects earn no value. Supported empty-library/life losses stop further actions and leave incomplete endpoints null, with model survival zero. Unmodeled damage/outlets may have won earlier in a real game: Glaring Fleshraker token creation is supported, damage/win conversion is not. These are conditional-model losses, not certified game losses. Tokens leaving the battlefield cease in the ledger; intermediate graveyard/death-trigger processing remains unsupported.

Yuriko requires combat, unblockability/attack decisions, ninjutsu timing/payments, damage triggers and top-card reveal outcomes. Wilhelt requires sacrifice/death/decayed/end-step ordering and actual recursive resources. Zada requires legal targets, spell/target-copy propagation and resolved per-creature cantrip effects. Their native packages must remain protected from partial-model optimization until those prerequisites are audited.

Next work should first improve bounded stack continuation or semantics-preserving compression, then review optional-copy choices and trigger ordering under a prospectively fixed pilot policy. Add actual outlet/target behavior and supported follow-up planning before interpreting growth or deck-out as strength. Keep future samples prospectively separate; these enlarged holdouts are now observed, not a reusable unseen test set. Any production-selection integration still requires a separate explicit review, fuller native coverage and external gameplay validation. Historical EDHCheck/EDHPowerLevel observations remain unchanged.
