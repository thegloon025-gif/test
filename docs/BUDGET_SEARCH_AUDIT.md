# Budget search audit — development after v1.1.5

The active application is the uploaded CommanderOracle Independent v1.1.5, extracted directly into the checkout root. The initial cloud checkout had no source files or commits; its origin advertised no refs. The source was preserved in commit `8544aa9`, tagged `baseline-v1.1.5`. `AGENTS.md`, `CODEX_HANDOFF.md`, historical benchmarks and the Windows launcher are preserved. This is an unreleased development change; application version remains 1.1.5.

## Findings

The old investment pass was greedy, not a search over whole investment plans: up to 16 substitutions, an 850-card quality shortlist, and the first acceptable card per outgoing slot. It prohibited cheaper improvements, rewarded spending slightly in swap and candidate selection, and stopped at the cap. A rejected swap removed the incoming card globally, even if replacing a different outgoing card would avoid the problem. Candidate affordability was frozen to initial headroom, preventing later released funds from expanding the search. Its final check allowed a small decrease in deck evidence; support was checked only for the incoming card against the old deck. Game Changer accounting excluded lands.

The new pass retains existing strategy-first construction and the legacy reference/fallback. It compares unchanged, absolute-utility, intermediate-investment and utility-per-euro paths. Each path considers three alternatives per outgoing slot, up to three fully feasible finalists per round, and at most 16 accepted swaps by default (24 hard maximum). Existing price-neutral card merit and complete-deck evidence select the result; there is no new gameplay scoring model. Cheaper and equal-cost improvements remain eligible at the cap. No swap gets a reward merely for spending money.

Each proposed swap preserves locked combo pieces, source-spine floors, functional roles, positive draw, early-ramp floors, response ceilings, singleton, legality, Game Changer accounting including lands, known conservative bracket-combo restrictions, and snow requirements. Support evidence is checked for every remaining card against the proposed deck, and fixed-land mana evidence and complete-deck score cannot decrease. Price is summed from the actual commander and selected card objects, without rounding each step. The existing final exact-printing audit remains authoritative.

The investment report includes each path's price, score, accepted swaps and aggregate utility change. This is bounded exploration, not global optimization. The 850-card shortlist and fixed lands remain limitations. Invalid shortlisted choices can crowd out deeper alternatives. Atomic multi-card substitutions and temporary quality regressions are not searched.

## Other construction weaknesses still open

- Profiles can converge on similar lists because role/merit preferences overlap. Multiple paths are not proof of strategically different decks.
- Draw and dependency recognition remain conservative text heuristics, with incomplete support checks for sacrifice, combat and commander-specific triggers. A conditional engine is not guaranteed card advantage.
- Early ramp counts do not simulate deployment, land sequencing, available colored mana or retaining two usable true-colorless mana after casting an Eldrazi spell for Ulalek.
- Mana checks preserve existing land evidence; they do not jointly buy new lands during this pass or certify casting probability.
- Existing bracket profiles support 2–4, with approximate Game Changer/known-combo policies. They do not implement all current official 1–5 rules. No bracket meaning was changed.
- Automatic Archidekt research, request caps, caches, source screening and Spellbook provenance remain in place. Inventory matches remain distinct from executable combinations. No EDHREC/Moxfield scraping or paid AI service was added.

## Oracle-role corrections found during card-level review

The original role classifier counted a trigger mentioning a **draw step** as a draw engine even when its effect only dealt damage. It also classified creature exile with a power/toughness restriction as broad removal. Requiring an actual card-draw instruction and excluding `creature with/that` targeting restrictions corrects these concrete false positives. Oracle-shaped regressions cover both, plus genuine upkeep draw and unrestricted removal. This changes the evidence available to existing scorers; it does not add a scoring layer.

## Performance

Profiling a full-catalog baseline showed repeated response/advantage recounts inside selection-limit checks. A request-scoped selection checker caches response counts while the chosen member references are unchanged, including detection of same-length replacements. It uses the same inequalities as the original gate and is tested against it. Catalog objects are treated as immutable during each synchronous generation call; no cache persists between generation requests. Windows/Node 22 compatibility and the original uncached helper remain.

## Reproduce locally on Windows

1. Keep the existing installation and `data` backed up. Extract the development branch into a separate permanent folder; copy the existing `data` folder into it. Do not overwrite the old installation or delete caches.
2. Use Node.js 22 or newer. In that new folder, run `npm test` from PowerShell or Command Prompt. No third-party npm dependencies are needed.
3. Close any old CommanderOracle server. Run the unchanged `start-windows.bat`; this unreleased build still reports 1.1.5. Use the branch/commit identity to distinguish it from the release.
4. Generate Ulalek at €191, B3 High and B4; repeat with Yuriko, Wilhelt and Zada. Leave strategy-first enabled. Compare the actual exported lists, investment swaps, role/mana warnings and the 100-card price ledger. Check exact total remains <= €191.
5. For repeatable offline comparison: `node tools/compare-budget-search.mjs C:\path\to\source C:\temp\results C:\path\to\data`. It runs B3 High and B4 with cached research/Spellbook and no external requests. Run once for each source version into different output folders. Output contains generated decklists and public selected-printing details; keep it outside the cache. It never rewrites the input caches.
6. Check the actual exported Ulalek lists manually with permitted external evaluators. Report observed results and pricing mode; internal scores and inventory matches do not establish gameplay gains. A verified cart total remains informational; extra-budget regeneration retains original-budget-plus-extra semantics.

See `benchmarks/budget-search-VALIDATION.md` for this session's actual outcomes and limitations.
