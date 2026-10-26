# Architect strategy evidence and functional review (unreleased 1.1.5)

This branch is stacked on draft PR #13. Authentication, the pinned official SDK,
account confirmations, daily caps, cancellation, encrypted credentials and no
paid-provider/API-key fallback remain in place. No merge or release is implied.

## What the model receives

`architectEvidence.mjs` replaces the alphabetical first-80 context. It derives
commander needs from actual Oracle clauses and retrieves complementary evidence:

- Commander-qualified casts/events and separate optional true-colorless payments.
- Cast/enter access, top-library permissions, copying, cascade, tutors, reductions,
  sacrifice material, death payoffs and printed prerequisites where recognized.
- Complete cached Archidekt spell/land structures, restricted to the same commander
  and declared bracket, deduplicated and rechecked for 99-card mainboard structure,
  singleton and locally resolvable legal records. These are observations, not
  power endorsements or instructions to copy a source list. Total selected-record
  estimates may exceed the requested ceiling and are labeled accordingly.
- Cached Spellbook quantities, starting zones/states, initial mana, prerequisites,
  steps, outcomes, template requirements and conservative bracket risks. Inventory
  is not executable timing or a win; mana/tokens need an available conversion path.
- Native, fixing, true-colorless, acceleration, access, interaction, protection and
  recovery options with actual selected-record prices. Function groups are
  choices, not universal quotas.

Within a function, stable identity hashing and mana-value/price bands provide
bounded variety. Prices constrain affordability/diversity; they never earn a
quality bonus. No commander names, personal-reference recipes, popularity vote
or universal card score select the context. Published policy examples get a
reserved disclosure position, followed by commander-required, compact-risk,
native and source-only package channels. Numeric combo IDs only stabilize order
inside a channel, not rank strategy strength.

The Builder now targets 32 KB through shared exact Oracle/requirement references
and optional-example trimming, with a 46 KB hard cap. Selected engine packages,
critical combo prerequisites and priced function options remain. Upgrader retains
its original/protected context and bounded optional-discovery trimming. See
[deadline and recovery details](ARCHITECT_RECOVERY.md).
It never silently clips a selected combo's prerequisites. Oracle excerpts are
explicitly marked when clipped. Retrieval is incomplete, **not an allowed-card
whitelist**: any exact catalog-resolvable card can be proposed and is then
validated against full local records. No network research, SDK initialization or
inference occurs when copying a request. Missing cached research stays explicit.

The brief asks the model to choose a coherent direction first, keep its resource
producers/consumers together, fund deployment and additional payments, supply
card access, interaction/protection and a plausible finishing path, and explain
unknowns. It neither demands universal slot counts nor rewards spending.

## Published compact-combo evidence

`src/architectComboEvidence.json` is a small, attributed public Spellbook snapshot,
separate from user caches. Variant `1988-5641` requires Basking Broodscale and
Blade of the Bloodchief on the battlefield, Blade attached to Broodscale, and a
way to put the first +1/+1 counter on Broodscale. Broodscale's printed Adapt 1
can supply that counter for `{1}{G}` only if it has no +1/+1 counters; equipment
setup costs `{1}` at legal equip timing. Neither that payment nor equipment
setup is included in Spellbook's empty initial-mana field. A produced Spawn
must resolve before it can be sacrificed for `{C}`. Its death produces the next
counter through Blade; the same Spawn cannot also pay another sacrifice cost.

The published outcomes include repeatable true-colorless mana, counters and
ETB/death/sacrifice events. They are not automatically damage or a game win.
The Architect preserves the existing conservative compact-infinite B3 rejection
when both pieces are present; B4 permits that gate but does not certify execution.
No turn-three/six/reliable timing is invented. This is local policy, not current
Wizards certification. Issue #10 remains open and the custom pod profile inactive.
The supplement affects Architect prompt/result checks only; production generator
and existing Upgrader implementation/caches are unchanged.

## After hard validation

The exact 100-card, commander/color identity, singleton, selected printing,
known bracket and budget/tolerance gates still run first. Invalid output cannot
export. The existing conservative commander/follow-up mana-inventory check also
remains. Then `architectReview.mjs` attaches:

- The read-only card job ledger and plan-specific obligations.
- Separate dependency/physical-provider analysis and shared missing/complete
  combo-piece disclosures; nominal loops are not independent wins.
- Supported-source mana inventory and colored versus true-colorless concentration.
- Persistent versus one-shot access jobs and specific missing-material/input
  warnings. Conditional engines stay conditional, not guaranteed draw.
- Two fixed local goldfish pilots, eight deterministic turn-1–8 trials each,
  with independently audited payment and zone receipts and Wilson intervals for
  sampled commander deployment. Native triggers, combat, ninjutsu, sacrifice
  recovery, library access and restricted mana are outside this foundation.

Unobserved expensive follow-ups warn about an observed sample, **not proven
uncastability**: missing draws, poor pilot sequencing and unsupported sources
can explain absence. Zero modeled immediate draws does not mean zero actual
card advantage. No printed finishing job is an unknown coverage warning;
ordinary creature combat is not ruled out. Protection/recovery possibilities
are not certified successful saves. Shared resources remain unallocated unless
an actual supported trace pays them. A review/audit failure returns unknown
review coverage and never fabricates a result or changes a passed hard gate.

The review never ranks decks, changes cards, approves packages or starts another
model call. Complete ledger/probe evidence is expandable in the Architect UI.

## Requests and explicit revision

A Builder click allows **one request**, including on invalid output. Functional
warnings are returned for inspection, with no automatic strategic repair. To ask
again, enter an explicit bounded strategic revision instruction with the previous
locally valid deck in the result box, then click Build or copy the revised prompt.
The previous deck is revalidated and its warnings included. Every connected
revision still consumes the existing daily/account limits; no automatic model or
provider fallback exists. Manual prompt creation/import remains inference-free.

The Upgrader retains its at-most-two hard-validation repairs, separate package
acceptance and undo. Shorter original-card Oracle excerpts keep its context under
the same bound; full local records still determine validation.

## Local reproduction

```sh
node --test tests/architect-quality.test.mjs tests/ai-architect.test.mjs tests/chatgpt-plan-only.test.mjs
npm test
node tools/validate-architect-quality.mjs CATALOG_JSON COMMUNITY_JSON COMBO_LIBRARY_JSON NEW_OUTPUT_DIRECTORY
```

For Windows, keep the existing `data` folder and `start-windows.bat`, and run the
launcher normally after checking out this branch with all source files. Choose
commander/budget/bracket, expand Architect and use **Copy AI deckbuilding request**.
Inspect `deckbuildingBrief`, import a result, inspect functional warnings and
expand the full ledger. Test a 101-card import and confirm export stays disabled.
Optionally request an explicit revision; no AI is needed for manual checks.
Do not change account financial settings or authorize new inference merely to
run these tests. Native Windows execution still needs user verification.

Use disposable app/cache copies for server/browser smoke testing: startup has
existing cache-repair behavior. See the validation report for actual outcomes,
cache preservation, missing external comparison lists and remaining limitations.
