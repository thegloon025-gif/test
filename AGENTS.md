# AGENTS.md — CommanderOracle Codex working instructions

Read `CODEX_HANDOFF.md`, `README.md`, `docs/ROADMAP.md`, and `CHANGELOG.md` before making major changes. Version at handoff: v1.1.5.

## Project operating rules

- Node.js >=22, ES modules. Run `npm test` and meaningful targeted tests; if test runner hangs, isolate test files and report incompleteness rather than claiming the suite passed. Test startup and `start-windows.bat` compatibility.
- Improve the **actual deck-building and budget user experience**, not just an internal scoring number. Generate 100 legal cards incl commander. Preserve true `{C}` requirements, brackets, rules safeguards and relevant on-plan Spellbook commitments.
- User supplies only commander, euro cap and bracket for standard generation: Archidekt research and combo evaluation must be automatic when accessible, cached/offline fallback when not.
- Budget is a HARD CEILING. Seek strongest deck attainable within budget; invest meaningful spare budget in quality. Never spend only to consume budget. Verify exact selected playable printings and completed deck price. Clearly separate Scryfall EUR estimates, modeled EN NM, and verified imported offers.
- Do not mutate or commit the user's `data/` cache, card snapshots, personal or account information. Avoid secrets/log dumps; `.gitignore` excludes `data/`.
- Preserve strategy-first construction and the legacy A/B selection, existing APIs/UI, export behavior, source provenance, and backward-compatible cache reading unless a proven defect requires change.
- Evidence matters: scripted tests are not measured gameplay. Record reproducible benchmark inputs, deterministic seed, source/pricing mode, cardlists and concrete deltas. Real EDHCheck and EDHPowerLevel are human-provided unless their authorized automation is established.
- Do not scrape EDHREC's frontend JSON for competitive product use without proper permission, nor circumvent Archidekt/Moxfield/Cardmarket or evaluator restrictions.
- Don't hardcode Ulalek. Regression-test a varied commander set and B3 vs B4 outputs. Update changelog and roadmap for substantive work.
- When assigned implementation, actually edit source, add regression tests, run them, and summarize changed files/results/remaining limitations. Ask only for missing essential data.
