# Final builder experiment + Experimental Upgrader — unreleased 1.1.5

Branch `codex/experimental-upgrader-and-validation` starts at PR #9's actual head `ed88173` (the request's `6c61662` predates the completed shadow milestones). Implementation `91a6375`, separate independent audit `a11f169`, review UI/B5 follow-up `3f00d96`; evidence in a separate commit. Targets PR #9, with no edits to its branch. No merge, release, version change, Pod activation, automatic purchasing or new production ranking.

## Separate decisions

**Automatic builder: NOT YET.** The score-free ledger detects specific destroyed prerequisites and distinguishes repeated from one-shot printed functions. The bounded goldfish detects some mana/draw failures, but it cannot yet compare complete native execution, material renewal, paid repeatable access or winning paths. It has not demonstrated a superior complete deck. Keep the scalar selector unchanged; do not replace it with a new score. Pause broad simulator expansion and from-scratch builder tuning until a small labeled dependency/coverage issue can be tied to a real construction decision.

**Deck Upgrader: GO for a manual experimental review workflow, NOT for automatic “stronger deck” certification.** Import, coherent-function inspection, affordable atomic choices, reject/undo, combined validation and exact 100-card download work end to end. It gives understandable printed-property experiments. No actual gameplay improvement is established. Prioritize user-reviewed Upgrader trials and external assessment over another universal ranking formula. Expensive/new packages do not earn preference; unused purchase budget is correct when no justified choice is accepted.

## Actual complete-list workflows

Frozen eligible-printing Scryfall catalog (32,197 records), the same frozen research-enriched Spellbook library used by PR #9 and public generated/source archive; server runs in a disposable copy. No private preferred list is used to construct these proposals. All three outputs passed 100-slot, canonical singleton, commander/color, current local bracket and exact selected-printing gates. This is not certification against a freshly verified official bracket policy; see Issue #10.

| Deck / €40 purchase ceiling | Scripted review choice | Original value | Result value | New purchases | Remaining |
| --- | --- | ---: | ---: | ---: | ---: |
| Ulalek B3 | Solar Transformer → Liquimetal Torque | €174.24 | €175.89 | €1.73 | €38.27 |
| Wilhelt B3 | Village Rites → Vampiric Rites | €163.25 | €163.09 | €0.11 | €39.89 |
| Y'shtola B3 | Cast Away Doubt → Greed | €90.68 | €90.80 | €0.20 | €39.80 |

These are **scripted approvals of reviewable tradeoffs**, not the automatic choice of a superior complete deck. No cut funds a purchase. Original and resulting card values are separate from full acquisition costs. All were additionally tested with the incoming card marked owned (zero acquisition cost), zero budget (export blocked), reset/undo (original identical) and real API/backend validation. The global €191 generation cap is not silently repurposed as an Upgrader cap: this workflow spends additional money on a deck already owned.

Full plain-text lists:

- [Ulalek original](experimental-upgrader/ulalek-original.txt) / [proposed](experimental-upgrader/ulalek-proposed.txt)
- [Wilhelt original](experimental-upgrader/wilhelt-original.txt) / [proposed](experimental-upgrader/wilhelt-proposed.txt)
- [Y'shtola original](experimental-upgrader/yshtola-original.txt) / [proposed](experimental-upgrader/yshtola-proposed.txt)

### Functional improvements and losses

**Ulalek:** Torque has the same two-mana deployment cost and taps for true C immediately, versus Transformer's enters-tapped timing. It also has a separate target-to-artifact ability; using that taps the same object. Transformer supplies three energy on entry and can spend energy to fix a color. That conditional fixing is lost. The proposal preserves the recognized unconditional C channel, not every Oracle function; the user must consider their colors. No engine, tutor, cascade, copying infrastructure or existing complete known combo is cut. The native copying ability still requires separate CC after an Eldrazi cast; no such payment/execution success is invented by this experiment.

**Wilhelt:** Village Rites pays a creature plus B once to draw two cards. Vampiric Rites is a persistent enchantment costing B to deploy; each activation costs 1B plus an actual creature, gaining one life and drawing one card. Wilhelt/Zombie material and death payoffs remain available as inventory support. This creates a repeatable sacrifice/access option but loses burst efficiency and needs surplus creatures, repeated mana and survival. It does not certify a sustainable recursion loop, free draws or win conversion. Known death/recursion/payoff engines are protected.

**Y'shtola:** Cast Away Doubt is one-shot draw plus two damage to every player. Greed is a persistent four-mana enchantment; each draw costs B and two actual life. It retains a qualifying noncreature MV3+ cast and introduces paid repeated access. It loses the immediate two-card burst and direct table pressure. Life payments are not damage to opponents. This is an especially uncertain strategic tradeoff, not “every generic draw engine is better.” The existing ledger does not fully protect every unrecognized damage/pressure interaction; its raw Oracle loss is displayed for review.

## Goldfish observations: do not confuse them with wins

Same identity-coupled seed `upgrader-v1`, fixed commander-first pilot, 16 paired eight-turn trials per before/after deck. No pilot was chosen after outcomes. The original shadow model and unknown coverage are unchanged.

| Deck | Commander deployed by horizon, before → after | Supported immediate cards drawn, total before → after |
| --- | ---: | ---: |
| Ulalek | 2/16 → 1/16 | 0 → 0 |
| Wilhelt | 9/16 → 9/16 | 0 → 0 |
| Y'shtola | 9/16 → 10/16 | 4 → 2 |

These tiny samples **do not establish improvement**. Ulalek shows a sampled deployment regression; Y'shtola shows less supported immediate draw even with one more commander deployment. Native energy fixing and recurring activated access are unmodeled; missing events remain unknown rather than zero native value. Shared-card identity priorities couple shuffles, but different card membership and mulligan decisions can alter what is seen. Wilson intervals and all traces are retained; no significance/real win-rate claim. Optional simulation is informational and never chooses packages.

## Track A coverage and ablation checkpoint

The complete read-only job ledger and plan obligations from PR #9 are reused byte-for-byte, including archived Wilhelt source variants, Y'shtola €90.68, Ulalek B3/B4, Yuriko, Zada, Henzie and **all 15** available held-out preferred entries, including Zacama and distinct Ulalek/Wilhelt versions. Those are previously recorded trials, **not freshly counted independent samples**. Personal decks remain outside Git and are not candidate recipes. No presumption of flawless references or constructor-overlap training.

See [job-ledger destructive diagnostics](shadow-job-ledger-VALIDATION.md) and [functional ablation/redundancy calibration](functional-shadow-VALIDATION.md). Existing six negative mutations and shared-physical-dependency analysis identify specific losses while retaining unknown execution. The Upgrader displays those jobs/dependencies and protects recognized native infrastructure. It does not claim that missing graveyard material, all sacrifice-loop conversions or three nominal combos sharing mana are fully evaluated. Yuriko and Zada retain native-coverage abstention.

## Tests, negative workflows and independent checks

- **301/301 full tests**, zero failures/skips, **116.259 s**. Includes existing 64-card legacy fail-closed regressions.
- **13/13 new focused tests**, final source recheck **353.884 ms**: import/marker/commander ambiguity, MDFC alias/suffix parsing, singleton/color, unknown/missing price, Game Changer count, acquisition versus deck value, ownership, explicit resale, exactly-once tolerance, budget rejection, true-C channel loss, protected engines and complete combo inventory, conflicting packages, forged IDs, atomic two-card application, B5/B4 inventory allowance versus B3 conservatism and original preservation.
- Real HTTP three-deck workflows verify approval, owned cards, zero-budget rejection and undo. Additional real API checks exercise ambiguous commander resolution, unknown names and conflicting approvals; failures do not alter the original.
- Actual Chromium clicks over the real disposable server/catalog/library: TXT upload, all three imports, acceptance/rejection, 100-card download, undo, stale-budget export invalidation; **zero page errors**. No mocked Upgrader responses.
- Independent export receipt audit checks **600 physical slots** (three original/result pairs), exact chosen printing metadata/cents, canonical singleton, commander/color, known Game Changer count, full new-card purchase cost and hard acquisition cap. It does not import the Upgrader and does not certify full Oracle execution.
- Prototype testing initially exposed overly broad mana matching, absent-casting-cost ramp and discard/conditional access misclassification. Narrowed grammars exclude them; no intermediate suggestions are final evidence. UI stale-response revision checks preserve export safety after edits.

## Runtime and practical boundaries

Actual accepted requests, milliseconds by subphase (not end-to-end browser latency):

| Deck | Analysis | Proposals | Combined validation | Optional 32 traces | Process peak RSS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ulalek | 68 | 395 | 127 | 59 | 423.5 MiB |
| Wilhelt | 66 | 221 | 118 | 67 | 507.3 MiB |
| Y'shtola | 81 | 602 | 113 | 65 | 631.1 MiB |

`analysisMs` starts after import/initial hard gates. RSS is cumulative process lifetime, not incremental request memory or a leak diagnosis. Only a small serial workload was measured. Name indices are weakly cached by catalog identity; unchanged final ledgers are reused within a request. Context-dependent relationships are not shared across different decks. The bounded grammar scans no network and has explicit proposal/trial limits. No simulation is needed to inspect or export packages.

Automatic discovery currently covers mana-property and simple paid repeated-access experiments. Atomic 1–3-card user-directed packages are supported, but automatic complete recursion packages, source-quality research discovery, alternative-direction redesign and full conditional-resource castability are not delivered. Unknown imported source spines must be supplied as locks; text exports do not carry original generator commitment metadata. No feature claims certified improvement beyond these bounds.

## Preservation and next action

Version 1.1.5, normal generator/selection, €191 generation cap and optional €4 tolerance, historical external scores, pricing/research/cache formats, source-spine/combo gates and Windows launcher remain unchanged. Only the explicitly requested new UI/API path uses the Upgrader. Original caches were not served from the working checkout; smoke uses a separate copy. Native Windows execution remains unverified. No PR #4 machinery, paid AI, Forge dependency, marketplace write, Pod activation or automatic Upgrader selection.

Review the new implementation separately from the compact generated bundle. Locally: follow [the workflow and reproducible commands](../docs/EXPERIMENTAL_UPGRADER.md). Manually assess these complete exports on the user's platform/pod and external evaluators before describing them as stronger. If those choices are not useful in practice, improve a small supported dependency/price workflow rather than expanding a full rules simulator.

The initial uploaded cache contained only Ulalek (177 variants). Final workflows also use PR #9's frozen enriched five-commander library, including Wilhelt (SHA-256 in provenance). Exact exports and goldfish observations match the initial cache check. Neither original cache was edited. The larger cache increases process-lifetime peak memory; broader workload profiling remains necessary.
