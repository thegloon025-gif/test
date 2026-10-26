# Connected Architect: closer to the successful manual-brief workflow

Draft, unreleased, stacked on PR #16. This changes only the experimental
ChatGPT Architect workflow. It does **not** modify the deterministic production
generator, the already-frozen Ulalek/Wilhelt/Y'shtola lists, the mana-polish
Upgrader acceptance/undo gates, hard Commander/bracket/pricing checks, or the
pinned official ChatGPT DevKit.

## Observed failure and hypothesis

User tests with the same CommanderOracle research brief produced three
promising manually generated decks in a ChatGPT conversation, while one
connected Y'shtola output used roughly €70 of a €200 requested budget and
was notably basic-heavy. The selected €70 amount is a user observation, not
independently priced from the private catalog. There is no evidence that
the two contexts invoked the same model/effort or obtained equivalent reasoning.

This PR does not guarantee similar output, but removes two obvious sources
of avoidable quality loss:

1. Connected calls previously timed out at 90 seconds while the model was
   digesting as much as 46 KB of strategy evidence and producing an exact
   100-card result. The new **finite 165-second** application deadline remains
   below the official SDK's 180-second body bound.
2. A cheap but legal deck previously passed hard gates without visibility
   into remaining budget *and* identifiable functional gaps.

## One-request construction

The Builder prompt now asks the chosen eligible model to perform a
**single-response** internal holistic review: pick a coherent strategy, preserve
interdependent engines, assemble 100 cards, then scrutinize early land tempo,
colored mana, access, shields, interaction and real win conversion before
finalizing. It invites effective affordable alternatives beyond its *advisory*
retrieval sample but does **not** create any external catalog/API lookup,
score, spending quota, hidden second inference, or iterative optimizer.

The `strategy.budgetDecisions` field is an optional, bounded advisory
explanation. The actual card records, prices and missing mechanics are
still verified only by CommanderOracle's existing local validators.

## After hard validation

`architectBudgetOpportunity.mjs` reports selected-printing deck value,
budget, tolerance and remaining headroom. It combines that with *specific*
land-swap possibilities and existing read-only functional warnings.
Only decks with material headroom and grounded functional questions receive
an **optional revision instruction**. It does not automatically rank cards,
reject a frugal deck, assert a better deck can be purchased, or invent
historical prices. Headroom without observed gaps is not a reason to spend.

In the Architect UI, expand **Optional budget/strategy opportunity review**.
Clicking **Prepare optional strategic revision (does NOT send)** only fills
the existing revision textarea. User can edit the proposed instruction.
Only a subsequent explicit **Build / analyze with ChatGPT** click may consume
a connected request, and only for a previously locally validated deck.
The previous full deck remains in **Paste ChatGPT result** to serve as the
original revision reference. The local request counter, below-100% weekly
app confirmation, plan-only permission and no-paid-API fallback remain.

## Failure handling

The app distinguishes `timed_out` (165s finite deadline) from a deliberate
`cancelled` action and `response_too_large` (32 KB local output bound).
Timeout and excessive output stop connected AI for the same UTC day under
the existing stop latch. No automatic retry, automatic re-login, credit
purchase, or provider/model switch occurs.

If the selected model completes but hard validation fails, the Builder
returns its raw text as an **unvalidated local-only draft** in the immediate
HTTP response and populates the manual import textarea. This is not saved
to the on-disk usage history, and **cannot** be downloaded or counted as
a legal deck until a later explicit validation succeeds.

A deadline can still consume plan allowance even without a finished deck.
165s is a finite safeguard, not a guarantee of provider completion or
zero charges. Users must separately verify their ChatGPT Settings > Usage
credit and app-limit controls.

## Verification and limits

Added pure read-only headroom tests and mocked deadline, cancellation,
oversize and one-inference invalid-draft cases. Changes were independently
syntax-parsed in the GitHub connector's JS sandbox; a pure 70-of-200
headroom function smoke was executed. **Full `npm test`, real native Windows
sign-in, connected model calls, browser preview and external evaluator
comparison have not been run in this environment.** Run all before merging.

Commands on a disposable checkout:

```
node --test tests/architect-budget-opportunity.test.mjs tests/ai-architect.test.mjs tests/architect-quality.test.mjs tests/chatgpt-plan-only.test.mjs
npm test
```

Validate a known-good manually generated 100-card list through **Import
ChatGPT result** to inspect the new budget review without any connected AI
call. For the connected experiment, set an appropriately restricted app
limit, compare one new Y'shtola B4 €200 build against the archived
user test deck, and measure actual source/tempo differences in addition
to external evaluator ratings. Never treat evaluator numbers as game-win
proof.

Rollback: continue to use PR #16 or the earlier manual-prompt branch,
with backed-up `data/`. No schema migration or local data changes are
introduced by this feature.
