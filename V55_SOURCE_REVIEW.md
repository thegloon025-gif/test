# CommanderOracle V55 source-only code review — October 2026

This review is based on the user's uploaded `New folder.zip`. The archive includes `src/synergy/*`, `src/v55/*`, tests and additional legacy source. No local bulk Scryfall database was included. It is the **pre-GLM Stage A** snapshot and should not be treated as already incorporating GLM's audit findings.

## Subsystems worth keeping / learning from

- `src/synergy/mechanics.ts`: richer extraction of timing, conditional effects, resource producers/consumers, cost restrictions, spell and face semantics, than our independent prototype.
- `src/synergy/relationships.ts`: explicit producer→payoff, resource→consumer, commander→amplifier relationships; guards against treating unrelated doubling effects as live synergies.
- `src/synergy/gameplan.ts`: a deck-level `criticalNeeds` representation; a useful interface between what a commander requires and what its candidate cards supply.
- `src/synergy/mana.ts`: extensive modeling of commander cost and colored source consistency. Important design reference for our future cast-plus-activation simulation.
- `src/synergy/quality.ts`: EDHREC/effect magnitude plus conditional support quality, a useful counterweight to picking the cheapest cards.
- `src/synergy/optimizer.ts`: iterative swaps and budget handling, not merely an initial greedy top-99 selection.
- Numerous `phase*.test.ts` fixtures: useful examples of rules and deck-level negative tests, though not necessarily independent or complete.

## Important issues NOT to transfer unchanged

1. GLM's audit of this development stage found type leakage across transformed faces (e.g. Cryptolith Fragment counted as castable Eldrazi) and land-report leakage. Our existing action-specific `castFaces`/`landFaces` implementation already distinguishes those contexts; we must preserve it.
2. The same classifier is sometimes used by both optimizer and validation. Passing tests alone are not an independent oracle for card correctness. Continue authoring hand-verified fixtures.
3. `criticalNeeds` checks such as `ramp-to-commander` can be the only critical checks for other commander strategies; that does not prove that a blink/token/counter/recursion strategy functions.
4. Hardcoded minima (for example 12 typed spells) can be useful provisional guardrails but are not a performance model.
5. Neither engine has yet demonstrated strong play in independent real-catalog benchmarks, or verified live Cardmarket EN NM offer pricing.

## Changes actually made in v0.5

A small, *general* post-construction budget reinvestment search: compare nonland replacements on merit while preserving critical roles, early mana, curve, Game Changer caps and budget. This is an incremental transfer of a design principle, **not** a port of V55's classifier or optimizer.

## Recommended next engineering priority

Build an **independent executable gameplan evaluator** measuring ability activation in sample opening hands/turn sequences, starting with Ulalek `{C}{C}` after casting Eldrazi and Yuriko turn-two ninjutsu. Test against both positive and negative hand-crafted card fixtures, then apply to previously untested commanders. Also add a support-need evaluator so conditional draw/death/Equipment cards cannot pass solely on keywords.
