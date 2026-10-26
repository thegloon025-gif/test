# Experimental read-only mana reliability and optional polish

This unmerged draft stacks on PR #14. It **does not** alter deck construction,
candidate ranking, GPT requests, AI response schema, hard export gates, SDK,
credits, local counters, bracket policy, or the production generator. Existing
strong builds remain unchanged.

## Review location and interpretation

After **locally valid AI Architect Builder** results, expand **Mana reliability
and optional land-swap review**. The panel shows actual printed land-entry
conditions as separate categories:

- Forced tapped on entry.
- Conditional tapped entry (not counted as always tapped).
- Delayed tapped-land fetches, which impose development delays but are not
  themselves tapped-entry lands.
- Other unknown/costed entries.
- No recognized tapped-entry clause (not a promise of unconditional mana).

The review also reports printed colored-land channels, conditional access,
true-colorless land channels and the early printed nonland/commander color-pip
inventory. Printed channels are potential, not usable mana at every turn.
Hybrid requirements, land utility, opponents, conditional fetch targets and
turn sequencing require further review. No invented turn-three percentages,
deck power numbers or maximum-tapland quotas.

## Optional suggestions

The local, priced full catalog is searched for bounded **single-land swaps**.
Candidates must satisfy the exact local commander color identity, be absent
from the deck, have a known eligible printing and price, and preserve the
original land's printed colors and true-colorless channel. Only straightforward
non-tapped entries and explicitly recognized early-untapped fastlands can
appear. The complete-deck price is recalculated in cents under the same
Builder budget and tolerance. The original list is never modified by this
read-only analysis.

The displayed proposal warns that utilities such as scrying can be lost, and
early fastlands depend on their printed timing conditions. Other conditional
entry costs or card-specific interactions may still be unknown. Proposals
are **not** mechanically certified upgrades and have **no power score**.

**Review this swap in Upgrader** is an explicit user action. If the Upgrader
contains a different deck, the browser requests confirmation before replacing
the Upgrader *input* with the unchanged validated Architect list. It preloads
only the requested 1-for-1 cut/add package, bracket and pricing mode. It does
not accept the package. The standalone Upgrader recalculates its own legality,
known bracket, protected combos, recognized mana-channel preservation and
incremental acquisition budget. **Accept package**, **Undo all changes** and
download remain existing separate controls. A rejected proposal remains
rejected. No approval or undo state is shared with the Architect.

The optional Upgrader purchase budget is distinct from the Builder's
whole-deck ceiling. The preview's reported Builder price is not a substitute
for Upgrader's incremental cost calculation; inspect both.

## Baselines, tests and rollback

The three exact ChatGPT-assisted 100-card external test decks reported by the
user on 2026-10-26 are frozen at
[benchmarks/architect-quality/user-tests](../benchmarks/architect-quality/user-tests).
They are **not** the archived manual fixtures used by PR #14 and are **not**
new connected-model output from the development environment. Their external
ratings are not proof of wins, current official bracket or price validity.

Tests cover tapped/conditional/delayed entry, finite bounded prices, dual-color
preservation, true colorless and immutable source arrays. Exact fixture count
and SHA checks guard against silent edits.

Run: `node --test tests/mana-polish.test.mjs tests/mana-polish-fixtures.test.mjs`
Then: `npm test`

Native Windows and browser handoff need user verification before merging.
Do not run connected inference merely to test this feature: manual import of a
previously locally valid deck is sufficient. Revert the draft branch to roll
back; no local user caches or production deck choices are changed.

## Deferred generation integration

There is deliberately **no** automatic first-pass mana optimization. Evaluate
real user-approved swaps and measure their concrete early-mana tradeoffs first.
Only after deck-specific evidence supports them should the builder consider
printed land timing *during* construction, without a universal percentage
penalty or sacrificing Ulalek's `{C}{C}` payment channels.
