# Pod High-Power combo policy — v1.2 implementation requirement

This records the user's playgroup preference. **It is not an active generation profile**, a Wizards bracket ruling, or a weakening of the existing conservative policy. The normal B3 and B4 controls and their current behavior remain available unchanged. No custom-pod export is labeled as validated in this change.

## Requested behavior

The explicit future opt-in is **High B3 / Pod High-Power**:

- Three-or-more-card infinite combinations are allowed.
- Two-card infinites executable on turn seven or later are allowed.
- Two-card infinites executable on turn six are allowed and desirable.
- Reliably executable turn-three-to-five infinites belong to the B4 target.
- Judge execution, cohesion and useful outcomes rather than raw combo count. Never reject a combo solely because its named core has two cards.
- Unknown timing remains unknown. Do not infer B3/B4 from two names, printed mana values, a source bracket tag, a theoretical turn-six line, or inventory completion.

A nominal two-card loop must still expose every additional setup/resource card. Do not rename it a three-plus-card combo to evade timing review because it needs craft fuel, a mana creature, counters or other resources. Count the commander, quantities and template slots separately and preserve every prerequisite.

## Why the profile is deferred

The existing proposal filter (`src/comboConstruction.mjs`) rejects compact infinites in normal B3 by required-piece count. The independent constructor and investment passes also check completed known compact inventory (`conservativeComboViolation`). Those are conservative policy gates, not an execution/timing model; they remain unchanged for the standard option.

Cached Commander Spellbook records specify zones, resources, loop instructions and outcomes, but have no validated earliest/reliable execution turn. Current deployment probes deliberately omit combo resolution, tutors, much conditional mana, alternate-face setup, extra draw and several other required mechanics. A controlled turn-six example can be checked, but cannot establish how often it occurs, whether the same deck reliably wins on turns three through five, or where the pod's reliability threshold belongs. Using the existing partial probes to enable a pod option would silently substitute a different policy.

The current change adds `comboPlan.executionAudit` and a browser disclosure: quantities, commander participation, source zones/states, casting costs, Oracle faces, back-face setup warnings, activation/resource actions, source mana symbols, supported-template inventory and potential outlets for manual review. Timing, conversion and execution stay explicitly unverified. The B3/B4 benchmark includes one conditional, paid turn-six example; it does not certify a deck's combo turn or activate this planned profile.

## Required v1.2 work

1. Add an explicit policy identifier and UI option. Keep existing B3 separately selectable and never implement pod mode by secretly passing bracket four to generation.
2. Preserve named quantities, commander restrictions, distinct template matches, all starting zones and alternate-face state transitions. Model the cost and resources of craft, counters, tokens and tapped states.
3. Record a complete executable line: actual casting order, exact colored/hybrid/true-colorless allocation, stack/priority order, sickness/haste and all additional costs. Distinguish setup, per-loop costs, replenished resources and net output. A resource cannot fund two costs.
4. Model the **selected complete deck** with deterministic sampling and an agreed reliability definition/threshold. Report feasible example, earliest known line and measured reliability separately. Mulligans/tutors/extra draw and source availability must be explicit. Unknown cases require review and no automatic pod bracket assignment.
5. Trace conversion: infinite mana, casts, ETBs and tokens are different resources; show legal, available outlets and their colors, creatures, counters, tap or attack requirements. Do not call redundant variations independent wins.
6. Apply the same opt-in policy to proposals, complete candidate construction, all swap/investment paths, final inventory auditing and legacy fallback. Retain source spines, commitments, legality, exact printing prices, hard budget, true-colorless requirements and the unchanged Windows launcher.
7. Test turn-six acceptance, later acceptance, reliably fast exclusion to B4, unknown timing, nominal two-card cores with additional prerequisites, commander/template quantities, stale timing evidence after swaps, and unchanged standard B3 behavior. A changed catalog/deck/prerequisite set invalidates any stored execution certificate.

The user has not supplied a numerical definition of “reliably.” Do not invent a probability cutoff. Obtain/record that definition when the execution engine can measure it. No paid AI or external scraping is needed for this work.
