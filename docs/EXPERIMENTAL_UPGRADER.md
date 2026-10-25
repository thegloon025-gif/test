# Experimental Deck Upgrader — unreleased 1.1.5

Local Node >=22 app, opt-in interaction. Start normally (`start-windows.bat` on Windows, or `npm start`), open http://127.0.0.1:4285, follow **Experimental Deck Upgrader** and expand its panel. Load/update your local eligible-printing Scryfall catalog first. Back up your own `data/` folder as usual. Native Windows execution remains unverified here; launcher is unchanged.

1. Paste a 100-card export or select TXT. Supported quantity forms: `1 Name`, `1x Name`; markers `[Commander]` and `*CMDR*`, or Commander/Deck sections. Ordinary Moxfield `(SET) number` suffixes are removed. Front-face aliases resolve only when unique, exact full names take precedence over aliases, and MDFC full names remain canonical. Split-name and duplicate-basics handling uses the existing singleton gate. Unknown/ambiguous cards are never substituted. Partner/background pairs, arbitrary collection/category syntax and sideboards are not supported; disclose errors and provide only the main 100.
2. If multiple unmarked legendary cards qualify, choose a commander and analyze again. The original text remains in the input; canonical original export and selected-record valuation appear separately.
3. Select €20/40/60/custom **additional acquisition budget**, bracket and price mode. Newly purchased cards cost their full selected price. A cut supplies no cash by default. Existing basic lands are treated as already owned under the existing price convention. Shipping excluded.
4. Mark additions already owned by canonical name, one per line. Optional resale credit is an explicit user-supplied cash assumption and applies only if at least one original card was removed. Gross purchase, credit and net acquisition cost remain separate; unused credit does not increase the budget. Optional €4 tolerance applies exactly once to the acquisition ceiling.
5. Review a package's additions/cuts, actual Oracle text, incoming/outgoing jobs, supporting inventory and uncertainties. Accept/reject; undo all restores the original selection. Accepted packages are validated together. Errors/conflicts block export and retain your source. Input edits invalidate stale export availability; recalculate.
6. Optionally enter an atomic user-directed package (equal 1–3 cuts/additions). This supports experiments beyond the narrow automatic proposal grammar, with the same hard gates. It is not an alternative-direction auto-builder. Protected native engines/complete known combos and explicit locks cannot be removed.
7. Download only a validated complete 100-card proposed TXT. No purchase, marketplace request, remote overwrite or collection mutation occurs.

## What automatic proposals mean

The bounded enumerator uses **no scalar card merit**. It offers up to four mana-property experiments (no higher casting MV, preserved recognized output, earlier untapped availability or lower casting cost) and up to four one-shot-to-recurring access tradeoffs. It requires actual printed normal casting costs and a narrow fully parsed activated draw grammar; discard-then-draw, conditional forage, absent casting costs and unresolved faces do not qualify as automatic recurring-access upgrades. Printed sacrifice prerequisites require existing material inventory; they are not free or infinitely repeatable.

Each proposal includes exact selected addition prices, the outgoing jobs, incoming jobs, costs, potential supporters and unresolved mechanics. It does **not** claim the whole deck improves. For example, removing a tapped colorless rock with an energy-based fixing ability can accelerate colorless availability while sacrificing that conditional fixing. A persistent paid draw engine costs deployment, activation mana, life/material and tempo; one-shot draw can be the better choice. You make that decision.

Candidate enumeration is lexicographic/printed-cost bounded, not exhaustive: up to 12 outgoing rocks, 120 incoming mana records; 8 one-shot access inputs, 80 access records, 40 relationship examinations; 8 custom packages of at most three cards, 12 accepted packages. Repeated names/Oracle aliases may represent printing variants but singleton constraints apply to the final canonical names. Automatic proposals can conflict or fail final policy gates; accepting a suggestion is never permission to bypass validation. No forced spending.

## Validation and protection

The backend reparses the original text and regenerates proposal identities from the current priced catalog on every request. It trusts no client-supplied card objects, prices or export strings. It checks count, legal commander/color identity, singleton, known Game Changer allowance, current compact-infinite policy, price availability and exact selected-record reconciliation. Known mana channels cannot decrease; an existing recognized qualifying-input obligation cannot become unsupported. Recognized native/copy/tutor/cascade infrastructure, persistent access, resource tokens, death/cast payoffs, recovery/outlets, complete cached combo requirements/templates and explicit locks are protected. No official bracket certification: dated Game Changer/policy work remains Issue #10.

Imported text has no hidden source-spine metadata. Detected functions and supplied locks protect it; unrecognized source commitments cannot be inferred. Existing generator/research source-spine rules are unchanged. Arbitrary user-directed edits still have unknown mechanical consequences, disclosed with ledger changes. Incomplete combos and actual execution prerequisites are shown by the existing local Spellbook audit, never declared executable. No network research is triggered by Upgrader requests.

Pricing modes reuse Scryfall eligible estimates, modeled EN NM estimates (not verified quotes) and imported EN NM offer snapshots (not authenticated/live marketplace data). Missing quote coverage fails import/valuation; no price fallback. Imported offer printing metadata has the existing provenance limitations; do not represent it as independently verified physical inventory. Original value and result value are estimates of selected records, not the user's cart total or purchase budget. Text exports identify cards, not purchased editions; review the per-card selected-printing audit before buying.

## Evidence and limits

The completed job ledger, redundancy reports, all 15 held-out reference entries and prior destructive tests remain frozen on PR #9. This experiment reuses that evidence without constructing from personal references. The bounded goldfish remains a supported-subset projection; optional paired 16-trial traces use identity coupling and fixed policy/seed. Unknown native effects never become failed obligations or real win-rate estimates. No PR #4 machinery or gameplay ranking is activated.

The optional goldfish is not needed for proposals. Request-local ledgers are reused where the list is unchanged; catalog-name indices are weakly cached by catalog identity. Different deck contexts do not share derived relationship results. Timing separates analysis, proposal enumeration, combined validation and goldfish. Reported RSS is process-lifetime peak, not incremental request memory. All data are ephemeral unless the user downloads an export.

## Reproduce

```
node --test tests/deck-upgrader.test.mjs
npm test
node tools/validate-upgrader-workflows.mjs http://127.0.0.1:4285 "NEW evidence directory"
```

The workflow tool expects the frozen public archive in the repository; it exercises scripted approvals, not external gameplay endorsement. It writes complete original/proposed exports and exact-printing receipts. Run against a disposable copy of the app/catalog/library to preserve working caches during server startup (which retains existing local repair behavior).

Browser smoke optionally requires an installed Playwright and Chromium; these are developer test dependencies, not app dependencies. Set `PLAYWRIGHT_MODULE` to a local importable module path if needed and `CHROMIUM_PATH` to the installed browser, then:

```
node tools/smoke-upgrader-browser.mjs http://127.0.0.1:4285 "evidence directory" "NEW browser report.json"
```

See `benchmarks/experimental-upgrader-VALIDATION.md` for actual outcomes and the separate builder/upgrader decision gates. Forge #11, Karsten methodology and official-policy synchronization remain separate future work, never prerequisites to using this feature.
