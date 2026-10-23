# Reviewability and release-readiness decision

**No merge, release or production-ranking trial is proposed.** This is a review
plan, not authorization to rewrite branches or delete evidence. Version stays
1.1.5; both PRs remain draft.

The [GitHub inventory snapshot](pr-review-snapshot.json) is from the Stage 8
head, before Stage 9 additions. PR #2 had **91 files, 250,439 additions, five
commits**; 69 files were benchmark evidence, seven core, four tests and six
tools. PR #4 had **780 files, 1,608,958 reported additions, 31 commits**; 710
files were evidence, 21 core, eight tests and 29 tools. Remaining files are
docs/config. These are GitHub's reported totals and file classifications, not
a count of authored executable lines or a claim that every generated patch is
renderable in GitHub. Stage 9 adds a small opt-in model slice and compact
experiment rather than another expanded trace archive.

A reviewer should not need to read historical million-line reports to approve
mana receipts. Proposed integration structure, subject to a separate review:

1. Review PR #2's atomic investments, preserved strategy infrastructure,
   coordinated restoration and comparator tests against the application
   baseline first. Keep exact pricing/bracket/source/commitment gates explicit.
   Its legacy-score tie-break and missing contextual native access are still
   product risks. No gameplay ranking integration is included.
2. Review PR #4 core incrementally by dependency: exact ledger/deployment;
   stateful access and pilots; stack/copy/cascade/tutors/outlets; typed
   interventions/death/recovery; narrow Stage 9 sacrifice costs. Keep the
   small deterministic unit fixtures and independent corruption tests beside
   each slice, with default behavior preservation tests. The current opt-in
   stage flags and long state/stack/audit modules are maintenance liabilities;
   stabilize/document their contracts before another broad feature rather
   than undertake an unmeasured refactor in this task.
3. Keep a small reproducibility manifest, exact 100-card exports/printing
   ledgers, controlled receipts and one regression example per behavior in the
   core review. Put bulky historical cohorts into a separately reviewed,
   immutable evidence branch/archive, pinned by commit and SHA256. Preserve
   original archives/history and the reader/packing tools; never silently
   drop cohorts, unknowns or unfavorable outcomes. An explicit later review
   can decide storage migration. Nothing is deleted/moved here.
4. Make production selection a separate future PR only after an explicit
   go/no-go review. It must retain a static fallback, unknown-strategy
   abstention and no price/combo bonuses. Stage 9 does not meet that gate.

The benchmark runner reads local cached input only. Stage 9 discovery/cohorts
hash-check all original uploaded cache files and Stage 1–8 archives. Lossless
phase compression avoids duplicating large human-readable statistical JSON;
plain full-deck exports stay directly importable. The pinned catalog hash is
required for reproduction but the user's complete catalog/data is not
committed or redistributed. The evidence auditor recomputes tables, selected
printing constraints and saved resource/zone/event receipts separately from
pilot execution. Shared Oracle grammar remains a common failure risk.

## Checks completed here

- 349/349 full tests, focused Stage 8+9 tests and independent persisted audits.
- Disposable-cache Linux startup; HTTP HTML/JS/CSS/status and actual Wilhelt
  API generation. No modification of the user's original catalog/cache.
- Version remains 1.1.5; production generator, candidate selection, standard
  bracket policy, research/fallback and launcher hashes remain unchanged.
- `start-windows.bat` still changes to its own directory, requires Node,
  rejects a server already using port 4285, launches `node server.mjs` and
  opens the local browser. Its original Windows command syntax is preserved.

## Remaining manual checks before any release decision

Native Windows command execution and an interactive browser are unavailable
in this Linux environment; HTTP checks are not a browser or BAT pass. On a
backed-up Windows installation with the original data folder:

```bat
git fetch origin
git switch codex/v1.2-gameplay-intelligence
git pull --ff-only
npm test
start-windows.bat
```

Confirm header/status v1.1.5, existing-cache loading, commander search, ordinary
three-input generation, automatic research/offline fallback, explicit pricing
modes and the exact 100-card ledger. For the frozen Scryfall cache, Wilhelt High
B3 €191 still selects €102.06: Stage 9 intentionally changes no production
winner. Check Cardmarket filtered links/printing details, copy/save/Archidekt
commander import, actual-cart informational input and original-budget-plus-€30
regeneration. Verify stale-server guard and restart from a path containing
spaces. Use the shadow exports for manual challenger comparisons; the app does
not automatically generate them. Record new permitted external observations
separately from historical scores. No such fresh scores are claimed here.
