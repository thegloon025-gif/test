# Stage 5 — Bounded native execution and win-condition evidence

Stage 5 establishes more accurate, auditable **conditional execution**, not a superior complete deck. Structural sharing and bounded continuation resolve nine previously suspended lines with outlets disabled. Strictly supported player-damage effects establish finite lethal sequences, including a stipulated real-card T6 line. **No existing repair earns a robust complete-deck improvement verdict. Production construction/selection remain unchanged.** No external evaluator was called, no infinite loop was certified, and no reliable combo turn, real-game win rate or improved power is claimed.

App version remains **1.1.5**. PR #4 remains draft, stacked on draft PR #2; neither is merged or released. All Stage 1–4 archives, uploaded caches, historical external measurements and the Windows launcher are preserved.

## Review and reproduction

Implementation is separate from generated evidence: `a1ef037` adds structural sharing, exact outlet receipts and fixed decisions; `f000b75` protects copied engines from automatic sacrifice; `ce6baef` adds compact persisted audits and actual deployment/value observations. Final model/cohort source is **`f000b75e64d107d74bb9669d483e698b1400e6d0`**; helpers carry their own hashes. See [mechanics, limitations and Windows commands](../../docs/GAMEPLAY_STAGE5.md).

- [Prospective protocol and recorded correctness amendment](stage5/PROTOCOL.md).
- [Every fixed-policy/pilot paired interval](stage5/paired-measurements.md), [machine-readable comparisons](stage5/comparison.json), [compact vectors](stage5/vectors.json.gz).
- [Actual original-deck engine deployments, payments, draw and resolved value](stage5/original-observations.md), [all 576 original observation vectors](stage5/original-observations.json.gz).
- [Reviewed real-card, prior-loss and bounded-continuation sequences](stage5/sequence-reviews.md), linked to complete resource/zone/stack/outlet receipts.
- [All 51 historical problem cases and 20 Zhulodok diagnoses](stage5/diagnostics.json).
- [Independent persisted audit](stage5/independent-audit.json), [exact test results](stage5/test-results.json), [isolated server smoke](stage5/http-smoke.json).

## Why Stage 4 stopped

All **48 bounds** were the 128-object stack cap, reached while Ulalek copied the own stack. Every bounded stack contained spells, spell-copy abilities and Ulalek abilities; 44 also contained token effects, eleven access effects and four refill-to-seven effects. These overlapping categories are not separate runs. Repeated cascade was not the suspended-stack mechanism. The three completed model losses were empty-library draws from copied card-access effects.

The issue was not a declaration that the cards made an infinite. Paid copying can enlarge unresolved spells/abilities before their resource or damage effects resolve. Copying a pending Ulalek ability can produce more optional decisions; copied resource/access triggers can then change what later decisions can afford. Merely increasing a cap would not establish execution or a legal win.

## Exact sharing, no-op proofs and continuation

`CompactNativeStack` shares adjacent identical ability payloads and copied-spell payloads. Every logical identity, copy parent, source, cause and LIFO position survives. A copied permanent still resolves separately into a token, with real entry effects and legend processing. The independent ledger expands identities and does not use the executor's storage class.

Only adjacent, state-preserving no-ops are batched: a supported-source C upper bound below two; an explicitly conservative copied optional-payment decision; or a refill ability already seeing a full seven-card hand. The resource auditor independently recomputes the C overestimate; ignoring fees/restrictions makes the proof conservative within the supported ledger. Unknown mana mechanics remain unknown coverage. No batch crosses an effect or spends resources, and bounded payment search is never treated as impossible.

The resident limit remains **128 groups**; a separate **4,096 logical-identity cap** prevents unbounded compressed growth. Each quantum allows 192 exact resolutions, with at most three audited continuation checkpoints per turn. Each checkpoint preserves the ordered stack/pending identities and exact quantum count. Remaining resident/logical/work/payment/action exhaustion stays suspended/unknown. There is no cycle detector and no proven-infinite classification.

Controlled, hand-reviewed exact expansions check mana, zones and quantities with compression on/off and short/long quanta. In the small 12-C/Annie/Ulalek/Spawn fixture, initial spare four C pays twice; two resolved Spawn fund a later third payment. Four spell copies, six ability copies and five Spawn are produced; two Spawn are spent. Compression changes storage/work, not those results.

With **outlets disabled**, identical historical inputs and copy-first decisions:

| Execution | Bound/unknown | Supported model loss | Completed normally |
| --- | ---: | ---: | ---: |
| Expanded storage, same continuation option | 48 | 3 | 0 |
| Shared storage and verified no-op batching | 39 | 8 | 4 |

Nine old bounds are resolved: four finish normally and five establish deck-out rather than inventing successful completion. The remaining 39 comprise 22 resident-cap, thirteen logical-cap and four quantum-budget cases (diagnostic peak/checkpoint classification).

The [shared-stack completion receipt](stage5/sequences/shared-stack-completion.json.gz) uses the unchanged observed B3 repair-03 / old holdout:27 / commander-first input, with outlets disabled. It completes with **262 logical identities at peak, 113 resident groups, 24 batched declines, 86 refill no-ops and one continuation**, resolving 154 spell copies within this subset. Its [Stage 4 counterpart](stage5/sequences/object-bound-stage4.json.gz) suspends at 128 objects. This is an explicitly selected historical illustration of continuation, not a new favorable holdout or deck-strength result.

## Verified outlet subset and controlled lines

Strict Oracle text recognizes Glaring Fleshraker's **another colorless creature entering → 1 damage to each opponent** and Spawn-Gang Commander's **`{1}{C}` + sacrifice an Eldrazi → 2 damage to any target**. The supported target subset is live opposing player seats. Own entry and merely casting a creature do not earn Fleshraker damage. Copies remain distinct from casts; supported multiplication/copying applies to qualifying damage triggers. Damage is credited only on resolution.

Gang's sacrifice is reserved **before** exact payment search. It cannot also supply mana for that fee; other Spawn/Scion can. Source self-sacrifice uses last-known identity. No tap requirement is invented. Automatic shots consume only Spawn/Scion tokens, preserving copied native engines; scripts may explicitly sacrifice another legal Eldrazi. Each shot has announcement, paid fee, victim-zone movement, target and damage receipts.

Three inert opponent seats start at 40 in all cohort runs. `outlets.won` means conditional supported-subset lethal to those seats. It is not a certified real-game win: prevention, redirection, opposing actions, unsupported own effects and native interactions can change the result. Infinite mana, token creation, ETBs and lethal damage remain distinct; none is inferred from a bound.

The [real-card sequence review](stage5/sequence-reviews.md) contains these checks:

- **Conditional T6 lethal:** frozen B3 €174.24 list, stipulated opening Forest/Mountain/Sol Ring/Thran Dynamo/Fleshraker/Gang/Arcane Signet; draws Plains/Island/Wastes/Mind Stone/Drowner/Wastes. Ring T1; Dynamo and Signet T2; commander T3; Fleshraker T4; Gang T5; Drowner T6. Three separately paid copying triggers and real entries deal each seat **1 on T4, 24 on T5 and the final 15 on T6**. This demonstrates a finite, resource-funded line under favorable specified inputs, **not reliable T6 combo timing or an earliest possible kill**.
- **Same-list generic-mana decision:** deploy Mind Stone instead of Fleshraker on T4 with the same deck/order. No supported passive damage or lethal is established; mana development alone does not substitute for an outlet. This is a play decision counterfactual, not an eligible native-engine cut.
- **Gang shots:** same generic line, T7 two separately paid shots sacrifice different Spawn to different player seats, dealing four total damage; no table lethal. Unit regressions also prove three Spawn can buy only one 1C shot when they must supply its fee and sacrifice.
- **True-C failure:** the prior Endbringer line remains unable to fund separate `{C}{C}`; no copy is credited.
- **Prior loss conversion:** old B4 original / holdout:16 / commander-first decks out in Stage 4. With the same copy-first decisions and supported damage, Stage 5 resolves 120 total player damage by T8 before the old mandatory-draw loss. All three previously lost variants have that conditional outcome. No historical measurement is rewritten.

On all 51 observed problem inputs, copy-first leaves 27 unknown, establishes twenty conditional lethals and completes four normally. Resources-first leaves six unknown, establishes 35 conditional lethals and completes ten. Conservative and follow-up configurations establish 41 conditional lethals and complete ten; no bounds/losses remain **in that selected historical diagnostic set**. These are not independent fresh success probabilities, and policies are not selected separately for each deck.

## Prospective complete-deck comparison

The unchanged originals remain directly importable: [Ulalek B3 €174.24, €16.76 unused](stage4/ulalek-b3-original.txt) and [Ulalek B4 €173.88, €17.12 unused](stage4/ulalek-b4-original.txt). Both exports have exactly 100 legal cards including the identified commander and their frozen exact-selected-printing audits.

The model uses the same 32,197-card catalog (cards SHA256 `6add2c5dd20809fd787438d3c8825f8dd21a74e7d3fc429f83c7a9a091045f6c`), 29 community sources, cached Spellbook files, selected records and €191 standard B3/B4 constraints. No new construction, repair discovery, live research or repricing occurs. All original/proposal 100-card exports retain singleton/color legality, official bracket inventory, source floors, protected native infrastructure and committed combo cards.

New namespace **`gameplay-native-stage5-v1-2026-10-22`** has training:0–7 and holdout:0–15. It is disjoint from Stage 1–4; observed older holdouts are diagnostic only. SHA256 card-identity priorities retain common-card relative order; replacements receive independent priorities, not outgoing draw slots. Absolute draws and later shuffle/effect sequences can diverge. This is reproducible coupling, not identical hands or guaranteed variance reduction.

All three fixed pilots and all four fixed decisions run every Ulalek list: copy-first; resources-first; resources-first/conservative copied payments; and the latter plus payable hand cascade-follow-up priority. No per-deck best pilot, endpoint, seed or decision selection. Initial partial execution was discarded when code review found generic-token ammunition could sacrifice copied engines; the protocol records the Spawn/Scion correction before fresh outcomes were inspected, and **all configurations were rerun**.

The unchanged Stage 3 promotion recipe remains conservative. Early conditional lethal leaves unfinished T8 primary endpoints null rather than adding a bonus or treating future draws as zero. Its existing endpoint recipe cannot safely rank some early-terminated versus complete eight-turn lines; those verdicts abstain. Supported lethal is reported separately with uncertainty, not substituted as a new score. Every interval is paired by fixed pilot/decision/partition with 2,000 deterministic bootstrap resamples, nominal 95%, exploratory without multiplicity correction. Bounds are retained, not dropped for favorable complete-case estimates.

| Complete after deck | Incoming / outgoing versus original | Price / unused | Copy-first | Resources-first | Conservative | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| [ulalek-b3-repair-01](stage4/ulalek-b3-repair-01.txt) | City of Brass / Temple of Malady | €182.52 / €8.48 | bound → abstain | incomplete T8 → abstain | incomplete T8 → abstain | incomplete T8 → abstain |
| [ulalek-b3-repair-03](stage4/ulalek-b3-repair-03.txt) | Up the Beanstalk, City of Brass / Gideon Blackblade, Temple of Malady | €184.22 / €6.78 | bound → abstain | incomplete T8 → abstain | incomplete T8 → abstain | incomplete T8 → abstain |
| [ulalek-b3-repair-04](stage4/ulalek-b3-repair-04.txt) | Birds of Paradise, Up the Beanstalk, City of Brass / Arcane Signet, Gideon Blackblade, Temple of Malady | €186.84 / €4.16 | bound → abstain | incomplete T8 → abstain | incomplete T8 → abstain | incomplete T8 → abstain |
| [ulalek-b3-repair-11](stage4/ulalek-b3-repair-11.txt) | Forbidden Orchard / Temple of Malady | €179.30 / €11.70 | bound → abstain | incomplete T8 → abstain | incomplete T8 → abstain | incomplete T8 → abstain |
| [ulalek-b3-repair-13](stage4/ulalek-b3-repair-13.txt) | Up the Beanstalk, Forbidden Orchard / Gideon Blackblade, Temple of Malady | €181.00 / €10.00 | bound → abstain | incomplete T8 → abstain | incomplete T8 → abstain | incomplete T8 → abstain |
| [ulalek-b3-repair-14](stage4/ulalek-b3-repair-14.txt) | Birds of Paradise, Up the Beanstalk, Forbidden Orchard / Arcane Signet, Gideon Blackblade, Temple of Malady | €183.62 / €7.38 | bound → abstain | incomplete T8 → abstain | incomplete T8 → abstain | incomplete T8 → abstain |
| [ulalek-b4-repair-01](stage4/ulalek-b4-repair-01.txt) | City of Brass / Forest | €182.31 / €8.69 | bound → abstain | bound → abstain | inconclusive | inconclusive |
| [ulalek-b4-repair-02](stage4/ulalek-b4-repair-02.txt) | Birds of Paradise / Arcane Signet | €176.50 / €14.50 | bound → abstain | bound → abstain | inconclusive | inconclusive |
| [ulalek-b4-repair-03](stage4/ulalek-b4-repair-03.txt) | Up the Beanstalk, City of Brass / Gideon Blackblade, Forest | €184.01 / €6.99 | bound → abstain | bound → abstain | incomplete T8 → abstain | incomplete T8 → abstain |
| [ulalek-b4-repair-04](stage4/ulalek-b4-repair-04.txt) | Birds of Paradise, Up the Beanstalk, City of Brass / Arcane Signet, Gideon Blackblade, Forest | €186.63 / €4.37 | bound → abstain | bound → abstain | inconclusive | inconclusive |
| [ulalek-b4-repair-13](stage4/ulalek-b4-repair-13.txt) | Up the Beanstalk, Forbidden Orchard / Gideon Blackblade, Forest | €180.79 / €10.21 | bound → abstain | bound → abstain | incomplete T8 → abstain | incomplete T8 → abstain |
| [ulalek-b4-repair-14](stage4/ulalek-b4-repair-14.txt) | Birds of Paradise, Up the Beanstalk, Forbidden Orchard / Arcane Signet, Gideon Blackblade, Forest | €183.41 / €7.59 | bound → abstain | bound → abstain | inconclusive | inconclusive |

No repair is promoted. Copy-first abstains on all twelve comparisons; resources-first has six bound and six incomplete-endpoint abstentions; conservative and follow-up each have eight incomplete-endpoint abstentions and four inconclusive B4 comparisons. This does not establish that alternatives are worse. It establishes that the current evidence/promotion contract cannot prove a robust improvement.

Across **4,248** prospective vectors, 4,166 finish normally, 46 establish conditional supported lethal, 32 suspend and four establish a supported model loss. These include overlapping pilots/policies and must not be interpreted as independent game-win samples. All 32 remaining prospective native bounds are retained; no payment-search or action-bound vectors occurred. Every vector still has unimplemented native clauses; unsupported absence is not zero performance.

## Deployment, access and Zhulodok consequences

[Original observations](stage5/original-observations.md) report every pilot/configuration separately, including commander by T5, originally triggered versus copied paid abilities, physical draws, resolved spell copies, actual Zhulodok deployment and real cascade casts. [576 supplemental vectors](stage5/original-observations.json.gz) contain turn-by-turn available true C, separate-trigger CC status, remaining hand size, payable/blocked/unknown native threats and actual engine/copy deployments. These repeat the fixed original inputs for detailed receipt observation and match the main vectors.

For holdout n=16 per pilot, original B3 commander deployment by T5 is 8/6/7 across commander-first/development/native; B4 is 10/9/10. These counts are unchanged by the four decision configurations in this sample, not a universal deployment probability. B3 copy-first pays 28/24/24 originally triggered abilities and 2/0/0 copied abilities, resolving 69/27/27 spell copies. Resources-first pays 26/23/23 originals plus 3/1/1 copies and resolves 73/32/32 copies. Conservative/follow-up pays no copied abilities and resolves 53/32/32. More copies alone do not establish stronger strategy execution.

Original B3 holdout realizes only 3/6/2 effect draws summed over each pilot's sixteen runs; original B4 9/10/9. These are supported physical draws, not all possible real card advantage. No B3 holdout run deploys Zhulodok. One B4 seed deploys it for each pilot, at T7/T6/T7 (including transient legendary-copy entries), but no qualifying hand spell appears afterward, and no original holdout cascade casts occur under any decision. Deployment and theoretical cascade support therefore earn no automatic resolved value.

The separate **twenty Stage 4 Zhulodok cases** explain the prior holdout absence: ten later-turn probes have no qualifying hand spell, seven deployments occur at the T8 horizon, and three show an actual mana shortfall. The latter are B4 old holdout:9 across all three pilots, with Devourer of Destiny blocked on T8 even after relaxing colored/true-C pips diagnostically. Historical pre-action probes cannot reconstruct every same-turn line, so those limitations remain explicit; they do not prove the card is inherently weak.

The fixed follow-up policy changes a hand-checked controlled case by casting an affordable seven-MV spell before a cheaper native body consumes its mana. It changes **zero** measured prospective vectors versus conservative decisions across all twelve repairs and two originals. Priority alone cannot supply an absent or unaffordable follow-up. More reliable access/planning remains a construction hypothesis, not an authorized change to production or justification to cut protected Zhulodok.

## Validation, performance and preservation

- Baseline: **273/273 passed**, 0 failed/cancelled/skipped, 130.170411142 s.
- Final focused deployment/access/native/shadow suite: **99/99 passed**, 0 failed/cancelled/skipped, 3.715968980 s.
- Final full suite: **294/294 passed**, 0 failed/cancelled/skipped, 155.099419266 s, Node v24.19.0 (project requires >=22). Twenty-one Stage 5 tests cover exact expansions, compression proofs, continuation/tamper checks, damage/multiplier/target/life conservation, reserved sacrifices, engine protection, follow-up order and unfamiliar-strategy abstention.
- Prospective **4,248** cohort evaluations plus five fixed full-trace repetitions: **4,253 resource/zone/stack/outlet audits and deterministic replays**. Historical diagnostics: **377 audits/replays**; detailed original receipt observations: **576**; controlled/prior-problem sequences: **eight**. Total **5,214 audited evaluations and 5,214 identical replays**, separately labeled rather than pooled as samples.
- Persisted independent audit: **17 unchanged complete legal exports**, **2,200 selected-printing checks**, **4,248 vectors**, **13 representative new full receipt audits**, all **576 original vectors matched**. Checks preserve source spines, native/combo commitments and standard bracket inventory. Prices are exact eligible selected-record Scryfall EUR estimates with frozen owned basics, **not verified Cardmarket English Near Mint offers**. Wilhelt retains the selected €10.77 reversible Grimgrin record.
- Preservation: **160 Stage 1 hashes**, **15 Stage 2 full traces** match; **31 Stage 4 representative traces** re-audit. All Stage 1–4 archive, cache, historical external-score, production source and launcher fingerprints pass. Yuriko (€126.04), Wilhelt (€102.06) and Zada (€158.68) retain native-strategy abstention.
- Final prospective cohort runtime **418.258 s**, measured under concurrent test/diagnostic/observation load. Historical diagnostics **77.375 s**; supplemental original observations **84.611 s**; persisted independent audit **2.787 s**. Timing is environment/load-specific. Copy-first evaluator spends 48.100 s simulating, 53.481 s auditing and 45.111 s replaying; conservative spends 29.693/8.493/26.142 s. They execute different effects, so this is not a like-for-like speedup claim. The model is not faster simply because limits increased; resident sharing and exact completed effects are the substantive gains. Remaining large copy-first prefixes are costly.
- Isolated server/API/static smoke: `/`, `/app.js`, `/style.css` HTTP 200, cached commander lookup, 32,197 records, version 1.1.5, no network research. Disposable cache protects originals from startup repair. Windows BAT/browser execution remains untested on Linux; launcher bytes are unchanged.

All final tests, audits and export checks pass. Development caught an audit bookkeeping mutation through deterministic replay and corrected it before final cohort generation. A small continuation fixture initially exceeded its chosen work/storage bounds; a smaller hand-checked finite fixture now verifies equivalence, while the larger case remains an explicit unknown test. The protocol amendment and full rerun for copied-engine sacrifice protection are recorded rather than concealing the interrupted partial run.

## Remaining risks and next work

No infinite execution is proven. Remaining copy-first/resident/logical/work bounds require further semantics-preserving sharing or verified local cycle analysis, not a success label. Targets beyond inert players, prevention/redirection, combat, death/leave recursion, complete temporary-mana/untap effects, alternate faces/costs, priority/holding activation and arbitrary copied targets remain unknown. Fleshraker/Gang damage is a narrow supported subset, not every outlet or Spellbook line.

Fixed conservative choices can decline profitable copied payments. The follow-up rule is immediate and retains the inherited commander guard; it is not turn-by-turn expert planning. Automatic token ammunition is deliberately limited; it cannot decide to sacrifice a less valuable real creature or a spare copied engine. Tutor choices remain lowest eligible MV/name. Unmodeled own effects or opponents can invalidate conditional lines; there is no full rules certification.

Yuriko still needs combat/ninjutsu/damage reveal; Wilhelt sacrifice/death/decayed/end-step recursion; Zada legal targeting and per-creature copy/cantrip resolution. Their native packages remain protected from partial-model optimization. **Pod High-Power remains deferred** until complete timing measurements and an agreed reliability threshold exist.

Next work should improve long-stack audit/storage costs and genuinely missing follow-up access/planning, add only exact source-backed native/outlet prerequisites, and prospectively review how early conditional terminal outcomes can be compared without inventing future eight-turn values. New samples must remain unseen: these holdouts are now observed. Any construction/selection integration requires a separate explicit review; external deck-power claims require fresh external validation. Historical EDHCheck/EDHPowerLevel measurements stay unchanged.
