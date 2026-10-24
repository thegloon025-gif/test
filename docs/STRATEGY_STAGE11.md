# Stage 11/12 integration (draft, v1.1.5)

Based on PR #8 at 85f1f2c; gameplay PR #4 remains a separate sibling. No PR #4 stateful evaluator
or new gameplay-based ranking is integrated; existing PR #2 probes remain. Stage 12 is local advisory only.

## Strategy evidence and alternatives

`strategyRelations.mjs` derives conditional relationships from actual Oracle
text and the candidate inventory. It records cast/entry/top access, existing
native infrastructure, narrow sacrifice costs, material, death outcomes and
unknown recursion. Shared functions belong to one permanent and share its
survival/payments; tags are not independent engines. Named-card inventory does
not prove timing, affordability, a loop or a win. Unknown restrictions remain
explicit. Death relationships require an actual compatible outlet to qualify.

At most two additional engine hypotheses are discovered from a bounded pool
of 160 persistent, low-MV Oracle engine providers. Actual eligible support and
affordable anchor cards are required; anchors survive investment as strategy
commitments, separately from Spellbook commitments. This is exploratory bounded
discovery, not exhaustive strategy understanding. No private reference list,
price bonus, inclusion frequency or named commander recommendation enters it.

The existing functional comparator cannot discard a candidate while losing a
recognized relationship capability. No new scalar objective replaces the old
one: incomparable strategies retain a **provisional** heuristic recommendation
and competitive alternatives. Deeper atomic refinement is bounded to four
complete starts, preserving the prior preferred/mana/access starts and then adding a
distinct source/local plan. Reports identify expanded and unexpanded candidates.

The expandable **Why this deck?** panel explains actual selected relationships,
prerequisites, multi-role dependencies, unknowns, source and selection tradeoffs.
Up to four complete frontier alternatives require at least 12 nonland changes
and two changed engine identities; cosmetic land/card changes do not qualify.
Each exported alternative passes its own exact-selected-printing price audit.
No extra candidate is manufactured to fill the view.

## Purchasing assumptions

Default behavior remains v1.1.5: all basics (including Wastes) owned, commander
and nonbasics counted, shipping excluded. UI now explicitly shows that existing
assumption. Uncheck ownership to count selected Scryfall basic records; this is
currently rejected for offer/model modes that don't price basics independently.

`budgetTolerance` is 0 by default or explicitly 4 EUR. `budgetPolicy` reports
requested target, tolerance, effective hard maximum, actual value, unused and
over-target amounts. Construction, investment, legacy fallback, alternatives
and final reconciliation all use the effective maximum. Original-budget-plus-
extra regeneration still adds to the original target, with tolerance once.
Spending is never itself a benefit. Estimates are not verified EN NM quotes.

## Reproduction

Run `npm test`. Frozen generation tool:

```
node tools/benchmark-stage11.mjs ROOT CATALOG COMMUNITY LIBRARY JOBS OUT DEBUG
```

Use independent output/debug paths and immutable cache copies. Job JSON records
commander, bracket, budget, tolerance and basic ownership; no reference is read
by this tool. Output contains actual exports, exact records, candidate decisions,
refinement opportunity, runtime, process maximum RSS and input/source hashes.
Historical unfiltered reproduction and held-out research exclusion are separate
experiments; never relabel one as the other. See the validation report for actual
results, missing reference inputs and remaining gates. Do not merge/release or
activate gameplay/Pod ranking.
