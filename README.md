### Draft PR #9 — Compare supported plans and local research

The expandable **Why this deck?** view shows actual Oracle relationships,
prerequisites, unknowns and up to four genuinely different complete alternatives
when supported. Recommendations remain provisional where strategies are
incomparable. Price, popularity and combo counts do not earn a quality bonus.

The existing basic-land-owned assumption (including Wastes) is now explicit.
Optional €4 leeway is off by default; when enabled, target + €4 is the hard
maximum throughout construction and exact-printing reconciliation. Shipping is
excluded; estimates are not verified English NM offers. Original-target-plus-
extra regeneration applies tolerance once.

Optional user-supplied EDHREC JSON remains local and advisory. Conflicting
category statistics stay separate; alphabetical examples are not rankings.
No EDHREC scraping or imported-statistic ranking is enabled. See
[Stage 11 integration](docs/STRATEGY_STAGE11.md) and [local import](docs/EDHREC_STAGE12.md), and the [validation report](benchmarks/stage11-12-VALIDATION.md).
Version stays **1.1.5**; all work is draft and unmerged. This does not establish
stronger gameplay or readiness for an automatic deck upgrader.

### Draft PR #6 — Automatic research for your commander

Research & Generate independently checks commander-containing Spellbook candidates even when Archidekt returns no verified sources. Results separate discovery, source-deck inventory, advisory color-compatible suggestions and local Scryfall evidence, with cache age and offline/partial status. You still provide commander, EUR ceiling and bracket; manual deck import is optional.

Candidate counts do not prove execution or stronger decks. Version stays 1.1.5; nothing is merged or released. See [Stage 10 behavior](docs/RESEARCH_STAGE10.md) and [validation](benchmarks/stage10-VALIDATION.md).

### Unreleased PR #2 — combo execution review

Generated decks now include an expandable **Combo execution requirements** disclosure: named quantities, commander participation, starting zones/states, mana and resource instructions, alternate-face setup and published outcomes. Inventory matches remain unverified execution; infinite mana or tokens still need a usable win outlet. Reliable combo timing stays unknown.

The requested **Pod High-Power** preference (including turn-six two-card infinites) is recorded in [the pod-policy requirements](docs/POD_COMBO_POLICY.md). It is not enabled yet: cached loop instructions and a conditional turn-six example cannot establish reliable timing. Existing standard B3 and automatically Optimized B4 remain separate and unchanged. Fixed-cache exports and comparison: [Ulalek B3/B4 benchmark](benchmarks/pod-combo-VALIDATION.md).

### v1.1.5 — Quality-first full-budget investment

The requested budget is a **hard maximum**, not a cost-minimization target. Strategy-first construction now makes up to 16 additional candidate improvement swaps *after* all 99 cards (including lands) are built. The comparison removes the previous acquisition-price penalty from **card quality**, then prefers higher-quality feasible replacements while retaining a mild preference for better budget utilization among closely ranked full candidates.

No card is added merely because it costs more. Every proposed swap must improve on-strategy utility, preserve nondecreasing independent deck-role evidence, existing positive draw, critical ramp, shields, Game Changer and singleton rules, recorded Spellbook commitments, conservative B3 compact-combo policy and the exact-printing EUR ceiling. Existing lands remain fixed during this new pass. The local UI now shows the original/final deck estimate, unspent budget, and accepted swaps. **No verified Cardmarket English NM cart or external EDH power improvement is claimed.**

The first version of this stage uses an intentionally bounded pool and does not guarantee spending near the cap if no safe improvement is available. Our benchmark remains Ulalek €191 at B3 High and B4, with both cheap/expensive outputs and their actual card contents compared to v1.1.3/1.1.4. Keep the old `data/` folder when upgrading; a new Scryfall download is unnecessary if it already passed printing eligibility screening.

---

### v1.1.4 — Automatic source-quality screening and better mana/card-flow signals

Keep the existing `data/` directory from v1.1.3; if the local Scryfall catalog has already passed printing eligibility checks, **no second bulk refresh is required**. Select commander, budget and bracket and click Generate as usual. Automatic Archidekt research now screens available bracket-matched deck structures for functional ramp, card flow, answers, mana and unsupported dependencies (still not a power rating). Strategy-first candidates consider this evidence while keeping the same hard legality and budget gates.

The deck report shows low-cost ramp, temporary token bursts, conditionally accessible card flow and heavy-curve acceleration gaps separately. For Archidekt import, use **Copy Archidekt category list** to put a `[Commander]` category tag on the first card; Archidekt may still ask you to set the commander itself. Regular text export stays unchanged.

Direct EDHREC JSON scraping is intentionally **not implemented** without authorization for product use. The published EDHREC usage terms restrict scripted use of its data to make a competing service. This release instead improves the existing bounded Archidekt workflow. Any claims of stronger scores on EDHCheck or EDHPowerLevel require a real deck test.

### v1.1.3 hotfix: price reconciliation

v1.1.2 sometimes rejected a valid generated deck because its final pricing audit
looked up printed names in a map that could overwrite earlier records with
other card/printing records sharing the same name. v1.1.3 reconciles the deck
against the **exact card objects selected by the generator**, matched to the
active catalog and the exported names. Missing/mutated/overbudget cards still
fail closed; no budget limit has been relaxed. The model's EN NM prices remain
unverified estimates, not live Cardmarket offers.

## v1.1.2 quick start — pricing safety and budget regeneration

Run `start-windows.bat`, transfer your old `data/` directory, and **click Update database once**. The previous Scryfall cache lacks selected-printing eligibility metadata. During this refresh, non-playable collector printings are skipped before the cheapest remaining printing is priced. **Scryfall-based generation is blocked on unrefreshed older caches** rather than silently using the invalid-price data. A high-end card like Grim Monolith may therefore rise sharply in price.

Choose **Scryfall EUR** for preliminary estimates, **Modeled English NM** for an unverified markup model from the user-provided `pricing.zip`, or import your own EN NM Cardmarket CSV. They are distinct sources. No automatically retrieved current EN NM offers are promised. Open the **100 card prices** section under a generated deck to inspect the selected set and visit Cardmarket search links.

After generating, optionally enter the total you observed when checking the deck on Cardmarket, and an extra euro amount. Choose **Regenerate with extra budget** to run a new full build at **original budget + extra** (e.g. €191 + €30 = €221). The observed €160 actual cart total stays a reference note; it cannot infer all individual card prices. The previous deck remains visible for comparison in the browser session. Save any deck you like before closing the tab.

This release prioritizes honest budget constraints and pricing provenance, not a new power score. See `benchmarks/v112-VALIDATION.md` for limits and tests.

---

# CommanderOracle Independent v1.1.1 — Automatic research + strategy-first generation

**New construction engine (default browser option):** v1.1 builds competing 99-card decks independently from bracket-matched Archidekt full-deck structures (including lands) and multiple local strategic archetypes. It no longer needs to start from a single greedy filled deck for candidate construction. The v1.0 engine remains explicitly selectable as a comparison and failsafe; all source evidence is observational, not certified power.

## Upgrade and quick A/B

1. Close all running CommanderOracle servers. Extract this ZIP to a new permanent folder, then copy your old **`data/` directory** from v1.1.0 (preserves Scryfall, Archidekt, Spellbook and pricing caches). Run `start-windows.bat` with Node 22+ and verify `1.1.1` in the UI and `/api/status`.
2. Choose **Ulalek · €191 · Bracket 3 · High**. Leave automatic research, **Construction engine → v1.1 Strategy-first** and **Community-informed** on. Press **Research & generate**; inspect `Construction engine` diagnostics, full-source spell/land adaptation counts, and candidate scores, which are **internal heuristics only**.
3. Generate again with **Construction engine → Legacy v1.0** using the same parameters. Optionally repeat v1.1 with **Community mode → Local-only** to compare locally constructed archetypes without public sources.
4. Use free **EDHCheck** (dark) and **EDHPowerLevel** (white) to evaluate the actual exports; avoid wasting limited **Deckcheck** tokens on preliminary builds.

## Implemented and known limits

- Independent profile constructors and bracket-isolated source-deck templates make up to seven full-deck candidates. Strategy selection reserves repeatable early mana, evidence-backed draw, broad interaction, shielding and commander engine before completing the list. Land choices are made with the actual chosen spells, colored demands and `{C}` sources in mind.
- Validates exact 99 + commander, singleton names, price cap, Scryfall Commander legality, Game Changer ceiling, Snow casting requirements and response caps. Existing recorded Spellbook package suggestions are considered atomically; final combo inventory is rechecked and **never represented as a demonstrated executable win**.
- Transparent candidate scores and baseline comparison with conservative fallback if all candidates fail or underperform the previous engine's internal quality yardstick. These scores are not external evaluators or game simulations.
- The new engine currently reuses the old engine for a reference deck and reporting scaffold; **it does not use old greedy card choices to fill strategy-first lists**. Existing combo proposals are reused as optional sources of verified-inventory package candidates.
- Community decks have not been independently ranked for actual gameplay wins. Mechanical inference is conservative but incomplete: mulligans, turn-by-turn spell casting, taxes, interaction and exact infinite execution remain unmodeled.

**v1.1.0 historical baseline:** 123/123 tests passed. v1.1.1 adds automatic research and request-handoff tests; see `benchmarks/v111-VALIDATION.md` for the newer verification.

**No real-world performance claim:** The development sandbox does not contain your private full Scryfall catalog or imported Archidekt cache. Testing here uses synthetic catalogs and historical reports. See `benchmarks/v110-VALIDATION.md`.

---

# v1.1.1 — Three-input research-to-build workflow (experimental)

**Main action:** Choose a Commander, EUR budget and bracket, then press **Research & generate 100-card deck**. Automatic research is enabled by default when community mode is ON; the optional community search/import panel remains for diagnostics and manual intervention, never required for a normal build.

- The Generate request performs a bounded public Archidekt title search (up to 36 previews / 24 full list checks), verifies actual commander identity, declared bracket, 100-card legality, creator diversity and deduplication; saves up to eight eligible list examples per click. New verified lists immediately inform strategy-first construction. No indiscriminate top-eight import.
- To avoid repeatedly querying public websites, a successful discovery for the selected commander/bracket is reused for six hours **within the running server session**. Manual auto-research remains available for a fresh attempt; restarted apps may search again.
- Before building, the application checks **at most one eligible saved source** with Commander Spellbook, uses its result cache when available, and persists verified API variants to the local combo library. Existing combo intelligence is still inventory-level, NOT an executable win guarantee. Checking one source does not imply the entire cohort has been evaluated.
- If Archidekt or Spellbook is offline, unavailable or rate-limiting, build from saved research and existing local combo data; the output includes an explicit online-research status and any failure warnings. A genuinely empty research cohort falls back to local strategy-first construction, not an invented community package.
- The local-only A/B mode bypasses online research even if the checkbox is checked; users may uncheck automatic research for purely offline generation. Pricing remains Scryfall EUR estimates or user-provided Cardmarket EN/NM snapshot, with no invented live Cardmarket prices.
- This feature does **not** automatically submit decks to EDHCheck/EDHPowerLevel, rate community decks by actual gameplay or implement the eventual automatic **deck upgrader**. Those are separate future milestones. The complete community research-to-build workflow and new API handoff are validated using controlled fixtures; live Archidekt and actual power gains still require local verification.

## Safe install

Exit previous server; extract into a new folder, copy over the old **`data/` folder**, run `start-windows.bat` using Node.js 22+, and check that browser and server both show **v1.1.1**. Keep old installations as backups.

---

# CommanderOracle Independent v1.0.0 — Community-informed deck construction

**New in v1.0:** Public Archidekt decks saved through the v0.9 research engine can now inform **actual deck construction**, not just the analysis dashboard. CommanderOracle looks for recurring **bracket-matched, creator-diverse, source-attributed nonland card packages** and constructs a deck with those cards before completing the normal strategy-engine and filler stages. It does not claim that public deck popularity proves synergy, legality of every game-state interaction, or higher EDH power ratings.

## Safe upgrade (Windows)

1. Exit the previous CommanderOracle server. Extract this v1.0.0 ZIP into a **new folder**.
2. Copy the **entire `data/` folder** from your v0.9 installation into the new folder. This preserves the Scryfall snapshot, eight or more imported Archidekt lists, Spellbook library and user pricing snapshots. Never overwrite your only backup.
3. Launch `start-windows.bat` (Node.js 22+). Check that the header and `/api/status` report `1.0.0`.

## A/B deck quality check

1. Select **Ulalek, Fused Atrocity**, **€191**, **Bracket 3**, **Power target: High**. Keep **Community-informed when eligible** selected. The **Community archetype** menu lists available strategies and how many source lists support each; choose one or leave **Automatic**.
2. Generate once and copy the full 100-card export. In the deck checks, review **Community construction**: source strategy, number of newly seeded cards, complete committed packages, excluded groups and the later optimization changes. Package evidence describes only observed co-occurrence.
3. Switch to **Local-only baseline (A/B comparison)**, use the *same* commander/bracket/budget/power settings, and generate a second deck. This bypasses the community seeding path, preserving v0.8.11 construction behavior for comparison.
4. If you want, compare both decks on **EDHCheck (dark)** and **EDHPowerLevel (white)**, which are free for your workflow. **Deckcheck** requires tokens; hold those for major verified milestones. Share both exports and their two external scores to determine whether v1.0 helps in practice.

### How the community seed works

- Requires at least **three distinct validated decks** in the *same declared bracket* with at least **two named creators**; eight or more builds raise statistical confidence but cannot certify deck strength.
- Takes bounded candidate packages and strategy cards that exist in the local catalog, are legal for the commander, have a usable EUR price and show mechanical relevance. It excludes land cards from the current **package-seeding** stage; the pre-existing demand-aware land optimizer remains active. Reported packages containing land components are not silently treated as complete nonland packages.
- Commits supported **multi-card packages atomically**, protecting every member—including already-selected cards—through later refinements. Batch checks prevent cumulative Game Changer, card-selection, curve, singleton and budget violations.
- Reserves acceleration, useful answers, draw, shielding and primary engine slots independently of popularity, then uses normal offline Spellbook combo packages, whole-deck refinement and land checks.
- When evidence is absent, unreliable or ineligible, automatically uses the **local-only fallback**. Local analyses make no network calls; Archidekt searches/imports are explicit, paced, cached and read-only.

**Validation:** 116/116 automated tests passed and the 1.0.0 server/UI smoke passed. The smoke used an empty Scryfall cache, so it was not a live catalog quality test.

**Current limit:** This is a source-attributed package-seeding builder, **not** a full independent reconstruction of alternative 100-card archetypes and **not** gameplay simulation. A high internal score does not imply an external power gain. The synthetic regressions are designed to show that eligible community evidence can actually change the resulting deck without violating mechanical constraints. Full Scryfall / genuine user Archidekt collections remain to be independently scored.

See `benchmarks/v100-VALIDATION.md` and `docs/ROADMAP.md` for test evidence, limitations and next development priorities.

---

# CommanderOracle Independent v0.9.0 — Community Knowledge Engine

**What this release is:** v0.9.0 extends the existing verified Archidekt imports into an **offline, attributed research engine** for commander/bracket-specific deck packages. It does **not** inject inferred packages into the deck generator yet. That construction stage is scheduled for v1.0; the v0.8.11 generator mechanics, Spellbook cache, quality checks, budgets and safety gates remain in place.

## Upgrade safely on Windows

1. **Close the old CommanderOracle server** (port 4285). Extract v0.9.0 into a **new permanent folder**.
2. **Copy the entire `data/` directory** from your previous installation into the new folder. It contains your local Scryfall catalog, verified Archidekt lists, user-priced offers and recorded Spellbook data. Keep a backup; a release ZIP does not include your private/local data.
3. Launch `start-windows.bat`, or run `node server.mjs` (Node 22+), then open `http://127.0.0.1:4285`.
4. Confirm **v0.9.0** in both the browser header and `/api/status`. An older server on port 4285 is an error, not proof the upgrade started.

## Community research workflow

1. Sync/load Scryfall, select a Commander, set Bracket 2/3/4 and its matching community bracket (or choose All, clearly mixing brackets).
2. Click **Find public decks**. The search is on demand, uses **Archidekt title matches**, and does *not* prove commander identity. Optionally choose a later search-result page (2 or 3) to look beyond the first 12 previews; import only decks you explicitly select, at most four per batch.
3. The importer validates the actual commander, mainboard/sideboard handling, 100-card count, singleton and local Scryfall legality. Only verified lists appear in statistical cohorts. Creator-declared bracket metadata, if present, is checked again on import.
4. The v0.9 evidence lab shows **deduplicated sample size**, provisional **card-package co-occurrence**, **adjusted lift** and uncertainty intervals, **distinct archetype groups**, generic-staple checks against other commanders **only when that baseline exists**, and **links to the public lists** used as evidence.
5. If there are fewer than **8 distinct source decks**, packages remain exploratory. More independent-looking decks and creators improve confidence, but neither popularity nor lift proves deck strength or game-winning synergy. Generator output is not automatically altered by community packages in v0.9.

**Network/privacy:** Local analysis makes no requests. Search and import require your explicit clicks. Requests are strictly scoped to public Archidekt endpoints, paced, cached, bounded and stop on rate limits. Undocumented endpoints may change or become inaccessible. Offline saved decks still work. Importing a deck never takes ownership of its source/author.

**Benchmarks:** The regression fixtures are synthetic and do not verify real Archidekt discovery coverage or game power. The supplied Ulalek v0.8.11 High B3 result was EDHCheck 5.6/10 and EDHPowerLevel 3.21/10; the best generated B3 benchmark in this project remains v0.8.8 at 6.0 / 5.31. **v0.9 cannot yet be claimed to improve those scores** because it does not modify deck generation. See `benchmarks/v090-VALIDATION.md`.

Run `npm test` for the automated tests. The previous release instructions remain below for provenance.

---

# CommanderOracle Independent v0.8.11 — Card selection & snow-mana safeguards

**Upgrade:** Close old CommanderOracle server windows, extract v0.8.11 into a **new permanent folder**, then copy the entire existing `data/` folder into this installation. Run `start-windows.bat` (Node.js 22+) and confirm the header reads **v0.8.11**. Never replace your only saved `data/` copy with an empty folder.

This release prioritizes independently castable and on-plan cards over redundant permission spells. It refuses {S}-cost spells when the selected lands contain no snow mana; conservative ceilings on narrow counters and overall instants apply to commander plans based on casting non-instant/sorcery spell types. Reliable answers, draw, commander shielding, essential ramp, the commander's primary strategy and combo packages retain their constraints. A new **Selection safeguards** line under Gameplay quality audit shows how many instant/counter/narrow slots were used, plus snow-cost warnings. This is an offline heuristic, **not** full game-state or spell-casting simulation.

Run `npm test` for the automated regressions, or `node tools/compare-v088-v089.mjs` for synthetic A/B diagnostics. The external benchmark scores remain user-supplied and do **not** establish that v0.8.11 is High B3 or stronger than v0.8.8 on real Scryfall data. See `benchmarks/v089-VALIDATION.md` and `docs/ROADMAP.md`.

---

## v0.8.7 — High Bracket 3 power target

Use **Bracket 3** and **Power target: High** (default in the browser) for an upgraded, efficiency-focused build. The original **Balanced** mode remains selectable, and Brackets 2/4 use their existing settings. High reserves practical interaction, dedicated commander protection and affordable draw, avoids some low-impact taxing counters, favors early mana and updates its independent heuristic audit. Real bracket power **is not guaranteed**; compare your actual Deckcheck runs and inspect the 100-card export. See `benchmarks/v087-VALIDATION.md` and `docs/ROADMAP.md`.

**Upgrade:** close all running CommanderOracle server windows; extract the archive into a new permanent folder, copy over the **entire** `data/` folder, run `start-windows.bat`, and verify the header displays **v0.8.7**. Do not overwrite your only copy of `data/`.

## v0.8.7 gameplay-quality diagnostics

When you generate a deck, see **Gameplay quality audit** for separately counted repeatable early mana, burst tokens, Powerstones, effective interaction, commander shielding and accessible card draw. The deckbuilder now reserves functional supporting slots first and evaluates land color restrictions using the actual proposed strategy. A heuristic target being met is **not** proof of actual turns, win rate or Commander-bracket compliance. Validate the exported cards and mana with your real Scryfall catalog and playtests. See `benchmarks/v086-VALIDATION.md` for synthetic A/B limits.

# CommanderOracle Independent v0.8.5 — Full export-name singleton fix

**v0.8.5 patch:** A second confirmed bug in v0.8.4 allowed different database names such as `Sol Ring` and `Sol Ring // Sol Ring` to pass internal selection and then export as *two copies of `Sol Ring`*. The generator now canonicalizes duplicated-face names consistently for deck selection, validation, and export, with an additional independent export-name check. Automated regressions reproduce failure on v0.8.4 and pass after repair.

**How to upgrade:** Close **all previous CommanderOracle server command windows**, then extract v0.8.5 into a *new* permanent directory and copy the full `data/` folder from your current installation. Run `start-windows.bat`. If port 4285 already has a server, the launcher refuses to open the old one; close that old process and retry. Confirm the website header says **v0.8.5**. Generate a *new* Ulalek €191 B3 deck and confirm the exported list includes no more than one Sol Ring. An old copied deck cannot be repaired by refreshing the page.

**Scope:** 72/72 Node tests passed with controlled synthetic fixtures and a local server smoke test. The user's genuine Scryfall bulk snapshot was not supplied, so the real Ulalek result, game-state execution of combos, Cardmarket EN/NM offers and official bracket compliance are not independently verified here. The separate source-driven combo scoring and conservative warnings from v0.8.4 are retained.

**Earlier v0.8.3 patch:** v0.8.2 discarded valid Spellbook IDs containing template placeholders (for example `5637-5642-5657--34`). v0.8.3 retains these IDs, recognizes Spellbook's actual Eldrazi MV 4–6 / Changeling template query, and distinguishes inventory matches from the required **in-hand cast** and **mana and battlefield conditions**. It automatically attempts a **local-only repair** at server startup using an exact, previously cached Spellbook response for each **saved, validated Archidekt deck** (never a background API request). If either the saved deck or response cache is missing, use **Check combos with Commander Spellbook** again to repopulate your library.

Package proposals now penalize adding unrelated enablers, favor the commander's actual strategy and existing pieces, and expose the package's named cards and reported outcomes. These are deckbuilding heuristics, **not verification of a playable infinite loop or official bracket legality**. Manual public deck discovery/selection and combo lookup are still user-triggered; fully automated community research belongs to v0.9/v1.0.

**Historical v0.8.3 upgrade:** Extract v0.8.3 in a permanent folder. Copy **the entire `data/` folder** from v0.8.2 into it **before first launch** to preserve Scryfall, community imports, pricing, and Spellbook caches. Start via `start-windows.bat`. Check the startup log for `Local Spellbook cache repair` if saved data is present. Never copy a fresh empty `data/` over saved data; keep v0.8.2 as a backup.

**Tests:** 67/67 Node tests pass, including six new regressions derived from the real user-supplied `test2` Spellbook capture (10 included, 115 near). No genuine Scryfall database or exported generated `test2` list was available in this environment for a real-card €191 B3 A/B build comparison. No network API requests were needed for these tests. See `benchmarks/v083-VALIDATION.md`.

---

# CommanderOracle Independent v0.8.2 — Combo-aware local construction

**New:** A successful user-initiated **Check combos with Commander Spellbook** action on an imported and validated community deck now saves normalized variants to `data/combo-library.json`. Subsequent deck generation for the same commander can optionally select one strategically appropriate combo package *from that recorded library* without any external API call during generation. Packages must pass available-card, Commander identity/legality, budget, role, bracket heuristic, card-game-changer and curve filters; ramp, card advantage, interaction and commander strategy are selected first. Combos are *never guaranteed executable*: required in-game zones, casting permissions, mana and timing still require manual verification.

A fresh installation with no recorded Spellbook responses continues to use the **old local strategy generator**, without inventing combo data. The full Scryfall bulk database is deliberately not in this source ZIP; update it through the UI, or migrate an existing `data/` folder. Imported Cardmarket English NM/Mint offer mode remains separate from unverified Scryfall EUR estimates.

**Build validation:** 61 Node.js tests passed (seven new synthetic regression tests); no real-card v0.8.2 benchmark can be claimed from this archive because no cached public Scryfall snapshot or actual `test2` Spellbook payload was supplied and outbound DNS was unavailable. See `benchmarks/v082-VALIDATION.md`, `docs/ROADMAP.md` and `CHANGELOG.md`. Node.js 22+; `npm test` and `npm start`.

---

# CommanderOracle Independent v0.8.1 — Spellbook API fix

**Fix:** v0.8 sent bare card-name string arrays to Commander Spellbook, which rejected the request (HTTP 400). v0.8.1 sends the documented `{card, quantity}` items for `commanders` and `main`, normalizes camelCase / nested variant result groups, and surfaces bounded validation feedback rather than reporting zero combos. The interface separates infinite-result combos from other known combos and shows full upstream group counts separately from the displayed subset. Automated fixtures verify the shape; a live `test2` lookup must still be performed on your PC, since outbound DNS is unavailable in the build environment.

**Upgrade:** Extract into a new folder, copy `data/` from v0.8, and run `start-windows.bat`. Choose your saved `test2` deck and click **Check combos with Commander Spellbook**. The request format changes its cache key, so a prior failure will not hide the new lookup. Do not interpret complete-card matches as proof their prerequisites can be executed.

---

# CommanderOracle Independent v0.8

**New: Community Combo Intelligence.** Choose a verified imported Archidekt deck, then click **Check combos with Commander Spellbook**. The app makes an on-demand request for existing combos and one-card-away lines, shows prerequisites and Scryfall estimated missing-card prices, and caches responses. It also separates distinctive card pairings from ubiquitous mana-staple combinations.

**Important:** Live Commander Spellbook connectivity was not verifiable in this container; on your Windows PC the remote API might reject a request if its current schema differs. In that case, send the exact UI error and we'll fix the adapter. This is not a card selection upgrade; the v0.7.4 generator remains unchanged.

See [`COMBO_INTELLIGENCE_V08.md`](COMBO_INTELLIGENCE_V08.md) for details, limitations and installation.

# CommanderOracle Independent v0.8 — bracket-aware Archidekt community discovery

**New:** When you choose a Commander Bracket for deck generation, community discovery defaults to matching that bracket. In the **Community deck bracket** selector you may choose **Match selected deckbuilding bracket**, **All brackets**, **Bracket 2**, **Bracket 3**, or **Bracket 4** independently. Each search retrieves a bounded set of public deck-title matches and filters by Archidekt's `edhBracket` metadata; names containing “B3” but tagged B4 do not count as B3.

**Important limitations:** Archidekt's current search API is undocumented, so the implementation does **not** claim to use a verified server-side bracket parameter. Instead, it requests up to **three title-search pages** (20 records each, maximum 60 listings) and filters returned bracket metadata. Only 12 previews are presented and at most four user-selected decks are fetched and validated. Search requires an explicit click, honors 2-second request spacing, and cannot bypass rate limits. If the listings don't expose bracket metadata, no B3/B4 results are invented; choose All brackets to see such entries. Search is not exhaustive and titles may omit commander names.

**Import safety:** At import time, the full deck's actual commander, size and Scryfall identities are still checked, and an explicit bracket search additionally checks the deck detail's `edhBracket`. Inaccurate or missing bracket metadata cannot silently become a B3 or B4 observation. Bracket labels reflect Archidekt's metadata and **do not independently verify** that the deck meets official bracket restrictions.

**Separate community cohorts:** Community statistics can now be filtered to the same bracket. Existing imported decks remain saved. Older imported entries may have no stored bracket; click **Refresh deck / bracket** on their saved-deck card once to retrieve that metadata. Choose **All brackets** to continue seeing mixed and untagged community observations.

**Prices:** A public B4 deck's purchase price does **not** need to match your EUR budget to teach CommanderOracle card pairings. The generated 100-card deck must independently respect the budget and your selected pricing mode. This version only improves community discovery/analysis; community patterns still do **not** automatically influence generation.

**Upgrade:** Unzip in a new folder and copy your existing `data/` folder from v0.8, then run `start-windows.bat` (Node.js 22+). Preserve the previous installation for rollback. No existing community card data is cleared.

**Verification:** `npm test` exercises import, bracket previews, metadata revalidation, cache separation, and bracket-scoped observations. Outbound network access is not available in this build environment, so live Archidekt bracket search requires your first click on Windows. Other modules and the original generator are unchanged.

---

# CommanderOracle Independent v0.8 — bounded Archidekt deck discovery

**New:** Select a commander, then click **Find public decks for selected commander** under Community Intelligence. This performs a **single public Archidekt deck-title search** (one page, 20 requested records, at most 12 previews). You can inspect the previews and select **up to four** for verification and importing with a second click. The server downloads each selected deck through the existing read-only Archidekt endpoint and saves it **only if** the actual commander's Scryfall identity matches and all 100 cards pass the existing basic checks. Incorrect commanders, incomplete decks and API failures are reported and skipped. Already-imported matching decks are reused.

**Important limitation:** The observed public search query (`/api/decks/v3/?name=...&deckFormat=3`) filters **deck titles**, NOT validated commander identity. It can miss perfectly valid commander decks whose titles omit the commander. The importer verifies the real commander before storing anything; do not read the number of title hits as the number of available decks. This API is undocumented and may change without notice. **Live discovery/import from this machine could not be tested.** If search fails on your PC, the original single-URL importer remains available.

**Safeguards:** User-triggered only; no background requests, no multi-page harvest, no third-party login, no Moxfield/EDHREC scraping. The search preview is cached for two hours; imports are bounded at four per request and require IDs returned by the recent search. Requests are sequentially paced; HTTP 429 stops the batch, no automatic retry. Imported decklists remain local with source attribution, and community data still does **not** influence deck generation. Community stats are exploratory until multiple independently validated decks are available.

**Upgrade:** Extract into a new folder, copy your previous installation's `data/` folder into it, then run `start-windows.bat`. The 100-card `test2` import and saved Scryfall catalog should still be available. Node.js 22+ required. Do not overwrite your working v0.8 installation before checking this version.

**Tests:** Newly added discovery tests cover bounded URL generation, result parsing and deduplication, search cache, rate-limit handling, actual commander verification, incomplete deck rejection, import deduplication and prevention of out-of-preview or duplicate IDs. Run `npm test` or `node --test tests/*.test.mjs`.

**Roadmap unchanged:** Real Scryfall-backed deck quality, commander-first gameplay engines, mana simulation, pricing-source honesty including Cardmarket EN NM offer data, genuine bracket differentiation, authorized community relationships, Commander Spellbook validation and later Deck Upgrade Advisor all remain goals. This release is an importer/discovery improvement, not a claim of stronger generated decks.

---

# CommanderOracle Independent v0.8 — Fix custom Archidekt “Tokens” category

**Fixed:** An Archidekt deck that had 100 cards was imported as 96 because four real Eldrazi creatures were assigned the user-defined **Tokens** category. Card category names are user labels; the importer now gives Archidekt’s explicit `includedInDeck` flag priority over category names. Actual non-deck categories still stay out.

**Your reproduction:** `https://archidekt.com/decks/26715826/test2` — affected: Chittering Dispatcher, Glaring Fleshraker, Writhing Chrysalis and Spawn-Gang Commander. Archidekt displays **Size: 100**. The four cards were excluded because of a label, not because the Scryfall catalog couldn't match them.

**Testing:** 35 / 35 local automated tests passed, including a fixture with the four affected cards. The specific live Archidekt API response is not available from this environment, so **click Recheck from Archidekt** to verify the actual 100/100 result on your PC.

**Upgrade:** Extract this ZIP into a new folder; copy the whole `data` folder from your v0.7.1 folder; run `start-windows.bat`; under Saved community decks click **Recheck from Archidekt**. Your saved deck and public Scryfall catalog will be reused. If it still isn't 100, share the full import diagnostics; don't alter your Archidekt categories merely to work around our importer.

No changes to generation, bracket behavior, Scryfall pricing or Cardmarket import mode. Existing V54/V55 installations are unaffected.

---

# CommanderOracle Independent v0.7.1 — import diagnostic patch

**New:** Archidekt 100-vs-96 import diagnosis and recheck. See `ARCHIDEKT_IMPORT_REPAIR.md`.

**Upgrade:** Extract into a new folder, copy your existing `data/` directory from v0.7, then run `start-windows.bat`. Use **Recheck from Archidekt** next to your saved deck. Do not import hundreds of decks; v0.7.1 is a manual, read-only URL importer.

---

# CommanderOracle Independent — experimental v0.7

A **separate**, local-first Commander deckbuilding prototype created from the lessons of the V55 project. It does **not** replace V55 and does not use paid AI APIs for generating decks.

**What is real in this release:** a Node web server, functional browser UI, official Scryfall API commander searches, automated Scryfall bulk-data acquisition and local caching, Oracle-ID/printing deduplication, card-face-aware mechanical helpers, heuristic commander-gameplan packages, bracket-dependent selection and budget limits, export, and automated rules tests.

**What is NOT established:** the full Scryfall catalog could not be downloaded inside the build environment (outbound DNS unavailable). Thus **no live 100-card real-catalog deck has been benchmarked yet**. This generator is experimental and should not be trusted for purchases until real-deck evaluations pass. No Windows portable `.exe` is included. Complex commander mechanics and accurate official bracket compliance are not fully implemented.

## New in v0.7 — Public Archidekt Community Intelligence (Stage 1)

**What's implemented:**

- A read-only importer for a single public Archidekt deck URL entered by the user. The server uses only `https://archidekt.com/api/decks/{numeric-id}/`, never an arbitrary URL, and handles failures, private decks, timeout, 429 throttling, response-size limits, safe origin and source attribution. Imports are locally cached for 24 hours; one request is paced at least 2 seconds from the prior request.
- Cardlist normalization against the local Scryfall Oracle-ID cache, with commander identification and separation of the main deck from Archidekt actual non-deck zones (including maybeboard and sideboard). Custom category names such as “Tokens” do not automatically make real included cards into non-deck entries. Unmatched cards, missing category metadata, incomplete 100-card decks, unverified two-commander decks and basic Commander legality errors are flagged, NOT entered into statistics.
- Local-only storage: `data/community-decks.json`. Read-only imported source references retain original Archidekt deck URLs and optional non-email author attribution.
- Per-commander card inclusion and pair co-occurrence across **validated imported decks only**. A deck is one observation, even if a card appears twice. The UI shows sample count, recurring pairs and an exploratory strategy-clustering view that suppresses nearly universal staples when comparing whole decks.
- New interface section **Community intelligence** with import URL, saved decks and community patterns for the currently selected commander. Imported data does **not yet influence auto-generated decklists**. The feature is diagnostic, not a claim of stronger generation.
- Eight additional community tests: URL/SSRF guard, category filtering, commander normalization, rejection of incomplete decks, rate limits, cache, co-occurrence, and separation of Poison and counters archetypes on synthetic Atraxa-style fixtures. **29 tests pass** with the existing suite.

**Actual external integration limitation:** This build environment cannot resolve `archidekt.com`. Live remote imports were not verified here. The URL fetch uses the undocumented public deck API that Archidekt developers have allowed read-only users to access with rate-limit respect, but schema/availability may change. Official developer discussions: https://archidekt.com/forum/thread/2832338 and https://archidekt.com/forum/thread/40353. Source deck authors retain credit; no bulk collection is enabled.

**Real-card smoke test:** The user-provided public Scryfall benchmark snapshot (32,198 cards) successfully loaded into the local server; commander search for Ulalek and the empty community-insights API worked. The existing full real-card **deck-generation** benchmark timed out in this environment; do not treat it as a successful deck-quality benchmark. This is separate from the community import tests.

### How to use v0.7

1. Extract v0.7 to a new folder and copy the previous `data/` folder into it alongside `server.mjs`. All existing Scryfall cards and imported Cardmarket offers stay local.
2. Run `start-windows.bat` (Node.js >=22 required) and open http://127.0.0.1:4285.
3. Choose your commander if you want to view matching community patterns. In the new **Community intelligence** panel, paste one public Archidekt deck URL and click **Import deck**.
4. Repeat with other *specific deck URLs you choose*. Three or more **valid, same-commander** decks are required before community metrics are presented as exploratory rather than extremely sparse. More are needed for credible archetype clustering.
5. The module does not touch V54/V55 or CommanderOracle Next. No Moxfield API connection, EDHREC scraping, Spellbook integration or account write access has been implemented.

**Two copyable `.txt` prompts are included in `prompts/`** for continuing equivalent work with Google AI Studio and OpenCode. Their future roadmap preserves your previous ideas about combos, functional Scryfall tags, better mana math, budget/bracket optimization, and later Deck Upgrade Advisor.

## New in v0.5 — V55 source comparison + budget-aware marginal upgrades

I inspected the actual user's uploaded V55 source-only archive (mechanics, relationships, gameplan, quality and optimizer). V55 has significantly richer mechanical relationships and role analysis, but its Phase 8 source still contains the *known* type-face and circular-validation risks described by the GLM audit. It has **not** been copied verbatim into this independent generator.

The first directly useful transferable idea is **budget reinvestment without breaking an existing gameplan**. After constructing a deck, the generator now considers higher-impact replacements using a price-neutral comparison of card merit. Each replacement must stay under the budget, maintain relevant commander-critical role counts and generic utility floors, preserve early mana acceleration quality, respect curve caps, and honor Game Changer limits. The algorithm will not spend unused euros unless the replacement offers a measurable improvement. Results include `reinvestment.spentBefore`, `.spentAfter` and exact `.swaps`, and the UI shows the count and EUR figures.

Two manually authored regression tests cover a higher-impact but initially unaffordable-looking candidate replacing an inferior answer when budget permits, and refusal to exceed the budget. **All 18 local synthetic tests pass.** This has **not** been validated against the real Scryfall catalog in this environment; an actual before/after deck review remains necessary. Cardmarket strict English NM/Mint mode still requires externally sourced offer CSV data.

**V55 source findings and next steps:** See `V55_SOURCE_REVIEW.md` for what was worth retaining and what remains risky. We still need true deck-level conditional-support checks, commander-specific color/payment sequencing, more complete card-role semantics, bracket policy verification, and real-catalog benchmarks. v0.5 is not a production-ready deckbuilder.

### Upgrade from v0.4

Extract this ZIP into a new folder and **copy only your previous `data` folder** into it. Run `start-windows.bat`. No repeated Scryfall download should be needed when your existing cache is valid. Keep your previous v0.4 backup.

## New in v0.4 — expensive Eldrazi / early mana correction

The user's second real €191/Bracket 3 Ulalek deck contained **100 cards, 37 lands, and 62 other spells**. While the deck was finally Eldrazi-focused, it included too many expensive threats, too little efficient early acceleration, and a draft-only land whose printed mana ability is unusable in ordinary Commander.

This update addresses **general rules**, without special-casing Ulalek or Paliano:

- Draft-dependent land colors are never treated as available in an ordinary constructed Commander game. Such lands cannot pass the mana-base scoring gate.
- Efficient early acceleration is explicitly reserved **before** choosing the full tribe/finisher package, and its mana-per-turn, mana value, and single-use nature affect ranking. Cheap acceleration can no longer be crowded out just by meeting a tribal quota.
- For commanders needing castable spells of a specified type, the selected deck gets a curve-aware cap on spells with mana value 5+ and 7+, adjusted to the real count of early accelerators. Higher-MV reveal strategies such as Yuriko are excluded from this particular cap.
- A filled tribe requirement has increased diminishing returns, making room for actual draw, removal, fixing and protection.
- The result panel shows the number of early accelerators and cards costing 5+/7+ mana. The existing real-color source warnings remain.
- Added **two manually verified regression tests** (draft-only lands and an oversized, expensive tribal card pool). All **16 tests pass** on synthetic fixtures. **This is NOT a claim that a new real-Scryfall Ulalek deck has already passed deck-quality review.**

The **same** Scryfall EUR vs. strict imported Cardmarket EN NM/Mint pricing options remain available as in v0.3. No automatic live Cardmarket offers or full gameplay simulation has been added. A subsequent release still needs to assess correct five-color mana fixing, robust interaction, conditional mana and opponent-aware strategy strength against the user's real Scryfall cache.

### Upgrade from v0.3

Keep v0.3 backed up. Extract v0.4 into a new folder, copy your previous `data/` folder beside `server.mjs`, then run `start-windows.bat`. Check which pricing source is selected before generating. The Scryfall cache does not need downloading again.

## New in v0.3 — price source and English Near Mint filter

The app now has an explicit **Pricing source** selector:

- **Scryfall EUR estimate (automatic)**: the original Scryfall-supplied euro price field. No automatic Cardmarket language/condition verification. This mode works immediately after Scryfall sync.
- **Cardmarket offers — English NM/Mint (CSV)**: an optional, **strict** local filter for offer data you obtain separately. Only listings with language `English`/`EN` and condition `NM`/`Near Mint`/`Mint` and positive price and available quantity count. When multiple qualifying offers exist for one card, the cheapest imported offer is used. Only these priced cards can be selected; missing offers **never** fall back to Scryfall EUR. This is an imported snapshot, **not a live Cardmarket API integration**, and excludes shipping. Availability can change.

Cardmarket currently does not accept new API access applications (see https://help.cardmarket.com/en/cardmarket-api). Without authorized offer data, no free Scryfall field proves which currently offered English NM card is cheapest. The old V54/55 EN NM-style prices were estimates and the CM-Low toggle did not affect V55 selection, per the prior project's Phase 6 report. We do not quietly relabel estimates as real NM offers.

### How to use English NM filtering

1. Start the application and download the Scryfall database automatically as usual (or copy the `data` folder from v0.2).
2. Select **Pricing source → Cardmarket offers · English NM/Mint (CSV)**.
3. Select an offers CSV containing your real listing data and click **Import Cardmarket offers**. The importer accepts commas or semicolons and quoted fields. Example **format only** (illustrative values, not observed prices):

```csv
card_name,language,condition,price_eur,quantity
Example Card,English,NM,1.25,1
Example Card,English,EX,0.45,1
Example Card,German,NM,0.75,1
```

Required: `language`, `condition`, `price_eur`, plus one card identifier: `card_name`, `oracle_id`, or `cardmarket_id` (mapped if its Scryfall printing is known). Optional `quantity` excludes out-of-stock offers. Accepts condition NM or Mint. Card names can be matched to existing caches even if they predate v0.3's Cardmarket ID storage; Cardmarket IDs may not cover every printing in the default Scryfall bulk data. The importer displays how many unique cards have matching offers.

**Important:** A small CSV is not a complete Commander card price database. The strict mode will refuse generation if the imported prices do not cover enough cards (or lack your commander). Choose Scryfall EUR mode for full automatic generation and treat the prices as estimates. Do not mistake an imported offer snapshot for a purchasable full-deck basket or shipping-inclusive total. Basic lands are assumed already owned and priced at zero in both modes.

Four new pricing tests verify condition/language/stock filtering, price selection, Cardmarket-ID retention and **no silent fallback**. **16 automated tests pass** in this build. The new mode still needs testing with your real offer data on your PC.

## What changed in v0.2 after the first real Ulalek benchmark

The first user-generated Ulalek deck had **100 cards / 36 listed lands**, strong Eldrazi type density, but too many low-impact Eldrazi and a worrying mix of colorless utility lands and five-color spell requirements. This release responds with the following **general scoring improvements** (not a prewritten Ulalek deck):

- Tribal type alone receives a smaller quality reward. Useful cast/ETB/token/ramp effects receive extra weight, and filling beyond the core requirement incurs diminishing returns.
- Four on-plan, high-impact creature finishers are sought in Brackets 3 and 4 (three in Bracket 2); the generator warns if it cannot obtain enough.
- Multicolor land choice penalizes lands with costly mana activation, one-shot fixing, unsuitable conditional mana, and no useful colored production. A true `{C}` source still matters where the commander's ability requires it.
- **Actual selected spells' colored mana symbols** now influence final basic-land allocation, and a color-source report flags weak availability. This is a rough heuristic, *not* a castability simulation.
- Mana-source classification reads production clauses instead of misreading mana symbols in ability costs. Duplicate-faced display names are normalized for exported lists.
- Three additional focused regression tests were added in v0.2. v0.3 includes four pricing tests; **16 tests passing** here.

**Not yet proven:** This environment still cannot reach the real Scryfall catalog, and these changes have not been benchmarked against the user's cached card database. This is not a certified strong Ulalek deckbuilder. More strategy validation, real pricing, game-action sequencing and stronger card evaluation are needed.

### Upgrade from v0.1 or v0.2 without downloading Scryfall again

1. Keep your existing installation folder as a backup.
2. Extract v0.3 to a separate folder.
3. Copy the **`data`** directory from your existing `CommanderOracle-Independent` folder into the new extracted folder, alongside `server.mjs`. This preserves your Scryfall cache and metadata.
4. Launch `start-windows.bat`. The automatic Scryfall pricing mode works immediately. Regenerate Ulalek with the **same €191 / Bracket 3** settings and compare both lists.

## Start on Windows

1. Install **Node.js 22 or later**, from https://nodejs.org/ (one-time, free). You don't need npm packages or an API key.
2. Unzip this folder.
3. Double-click `start-windows.bat` (or open a terminal in the folder and run `node server.mjs`).
4. In a browser, open **http://127.0.0.1:4285** if it doesn't open automatically.
5. Click **Update database** to automatically fetch the current Scryfall bulk dataset (the download can be large and take several minutes). This is **not** a manual import.
6. Search for a commander, set a budget and bracket, generate a deck, and export the list.
7. Data stays in `data/` for subsequent offline generation. Run Update database periodically to refresh legality and pricing.

The server binds only to `127.0.0.1`. Stop it by closing the terminal window or pressing Ctrl+C. Keep the terminal open while using the page.

### Why the Scryfall API plus a local cache?

The Scryfall API supports commander search and supplies an official, regularly refreshed bulk dataset. The program uses `https://api.scryfall.com/bulk-data` to discover the current `default_cards` download, supporting compressed `.jsonl.gz` or the older JSON array format, and downloads it from Scryfall's official data host. This avoids making tens of thousands of individual API calls during deck generation and respects Scryfall's request limits. See https://scryfall.com/docs/api and https://scryfall.com/docs/api/bulk-data.

No manual Scryfall import or recurring AI subscription is necessary. Network access is needed only for the initial download, searching before the catalog is loaded, and future updates.

## Quality and limitation notes

- The card model distinguishes **castable faces** from transforming back faces, and **playable lands** from transforming land backs. Do not interpret a deck's gameplan counters as proof of strength.
- Each deck requires 99 cards plus a commander, a fixed mana-base allocation, EUR-pricing eligibility, a package of relevant commander enablers and support cards; unmet package quotas are displayed as warnings.
- `BRACKETS` in `src/generator.mjs` are **approximate tuning profiles**; this is not a promise of official Commander Brackets compliance. Game Changers are checked when exposed in Scryfall data; policies may change.
- The cached Scryfall EUR price is used per Oracle ID; the default bulk catalog does not necessarily identify the globally cheapest printing. This is an estimate and may not represent live stock, shipping, condition, or the actual cheapest purchasable printing. Basic lands are treated as already owned, with price zero.
- The heuristics cannot yet interpret all mechanics accurately (e.g. replacement effects, special casting costs, complex combos, unusual commander restrictions). It does not simulate real multiplayer games, and mana restrictions need further validation.
- Some 100-card decks may be flagged **NEEDS REVIEW** or **UNCLASSIFIED COMMANDER** instead of falsely certified as strong. **Check every list before buying cards**.
- The engine is currently JavaScript modules (Node 22); it can be migrated to TypeScript/Electron after the gameplay logic passes real-deck tests. There is no fake mock catalog in production.

## Tests

Run `npm test` or `node --test tests/*.test.mjs` (no dependencies to install).

Tests check: transforming artifact faces do not leak Eldrazi or land types, MDFC lands, Kindred instants, Ulalek `{C}{C}` needs, conditional evasion, legality, exact card count/land slots against a synthetic **test-only** candidate pool, and JSON/JSONL Scryfall parsing. They are not a substitute for live-data quality benchmarks.

## Next acceptance benchmark

After downloading the actual Scryfall catalog, generate **Ulalek €191 Bracket 3**, then Yuriko, Wilhelt, Light-Paws, Krenko and Zada. Compare card-by-card against V55. Capture actual mana access, ability enablers and budget. Do not promote this prototype to replace V55 unless its real decklists are demonstrably better.

## Credit

Card information and price estimates from [Scryfall](https://scryfall.com). Magic: The Gathering is a trademark of Wizards of the Coast. This is an independent, unofficial application.

## Benchmark provenance

`benchmarks/ulalek-v01-user.txt` is the actual first Ulalek €191 / Bracket 3 exported list provided by the user. It is **not** a trusted strong deck, not a generator preset, and is only saved so we can compare real changes after rerunning v0.3 with the user's local database.
**Earlier v0.8.3 patch:** v0.8.2 discarded valid Spellbook IDs containing template placeholders (for example `5637-5642-5657--34`). v0.8.3 retains these IDs, recognizes Spellbook's actual Eldrazi MV 4–6 / Changeling template query, and distinguishes inventory matches from the required **in-hand cast** and **mana and battlefield conditions**. It automatically attempts a **local-only repair** at server startup using an exact, previously cached Spellbook response for each **saved, validated Archidekt deck** (never a background API request). If either the saved deck or response cache is missing, use **Check combos with Commander Spellbook** again to repopulate your library.

Package proposals now penalize adding unrelated enablers, favor the commander's actual strategy and existing pieces, and expose the package's named cards and reported outcomes. These are deckbuilding heuristics, **not verification of a playable infinite loop or official bracket legality**. Manual public deck discovery/selection and combo lookup are still user-triggered; fully automated community research belongs to v0.9/v1.0.

**Historical v0.8.3 upgrade:** Extract v0.8.3 in a permanent folder. Copy **the entire `data/` folder** from v0.8.2 into it **before first launch** to preserve Scryfall, community imports, pricing, and Spellbook caches. Start via `start-windows.bat`. Check the startup log for `Local Spellbook cache repair` if saved data is present. Never copy a fresh empty `data/` over saved data; keep v0.8.2 as a backup.

**Tests:** 67/67 Node tests pass, including six new regressions derived from the real user-supplied `test2` Spellbook capture (10 included, 115 near). No genuine Scryfall database or exported generated `test2` list was available in this environment for a real-card €191 B3 A/B build comparison. No network API requests were needed for these tests. See `benchmarks/v083-VALIDATION.md`.

---

# CommanderOracle Independent v0.8.2 — Combo-aware local construction

**New:** A successful user-initiated **Check combos with Commander Spellbook** action on an imported and validated community deck now saves normalized variants to `data/combo-library.json`. Subsequent deck generation for the same commander can optionally select one strategically appropriate combo package *from that recorded library* without any external API call during generation. Packages must pass available-card, Commander identity/legality, budget, role, bracket heuristic, card-game-changer and curve filters; ramp, card advantage, interaction and commander strategy are selected first. Combos are *never guaranteed executable*: required in-game zones, casting permissions, mana and timing still require manual verification.

A fresh installation with no recorded Spellbook responses continues to use the **old local strategy generator**, without inventing combo data. The full Scryfall bulk database is deliberately not in this source ZIP; update it through the UI, or migrate an existing `data/` folder. Imported Cardmarket English NM/Mint offer mode remains separate from unverified Scryfall EUR estimates.

**Build validation:** 61 Node.js tests passed (seven new synthetic regression tests); no real-card v0.8.2 benchmark can be claimed from this archive because no cached public Scryfall snapshot or actual `test2` Spellbook payload was supplied and outbound DNS was unavailable. See `benchmarks/v082-VALIDATION.md`, `docs/ROADMAP.md` and `CHANGELOG.md`. Node.js 22+; `npm test` and `npm start`.

---

# CommanderOracle Independent v0.8.1 — Spellbook API fix

**Fix:** v0.8 sent bare card-name string arrays to Commander Spellbook, which rejected the request (HTTP 400). v0.8.1 sends the documented `{card, quantity}` items for `commanders` and `main`, normalizes camelCase / nested variant result groups, and surfaces bounded validation feedback rather than reporting zero combos. The interface separates infinite-result combos from other known combos and shows full upstream group counts separately from the displayed subset. Automated fixtures verify the shape; a live `test2` lookup must still be performed on your PC, since outbound DNS is unavailable in the build environment.

**Upgrade:** Extract into a new folder, copy `data/` from v0.8, and run `start-windows.bat`. Choose your saved `test2` deck and click **Check combos with Commander Spellbook**. The request format changes its cache key, so a prior failure will not hide the new lookup. Do not interpret complete-card matches as proof their prerequisites can be executed.

---

# CommanderOracle Independent v0.8

**New: Community Combo Intelligence.** Choose a verified imported Archidekt deck, then click **Check combos with Commander Spellbook**. The app makes an on-demand request for existing combos and one-card-away lines, shows prerequisites and Scryfall estimated missing-card prices, and caches responses. It also separates distinctive card pairings from ubiquitous mana-staple combinations.

**Important:** Live Commander Spellbook connectivity was not verifiable in this container; on your Windows PC the remote API might reject a request if its current schema differs. In that case, send the exact UI error and we'll fix the adapter. This is not a card selection upgrade; the v0.7.4 generator remains unchanged.

See [`COMBO_INTELLIGENCE_V08.md`](COMBO_INTELLIGENCE_V08.md) for details, limitations and installation.

# CommanderOracle Independent v0.8 — bracket-aware Archidekt community discovery

**New:** When you choose a Commander Bracket for deck generation, community discovery defaults to matching that bracket. In the **Community deck bracket** selector you may choose **Match selected deckbuilding bracket**, **All brackets**, **Bracket 2**, **Bracket 3**, or **Bracket 4** independently. Each search retrieves a bounded set of public deck-title matches and filters by Archidekt's `edhBracket` metadata; names containing “B3” but tagged B4 do not count as B3.

**Important limitations:** Archidekt's current search API is undocumented, so the implementation does **not** claim to use a verified server-side bracket parameter. Instead, it requests up to **three title-search pages** (20 records each, maximum 60 listings) and filters returned bracket metadata. Only 12 previews are presented and at most four user-selected decks are fetched and validated. Search requires an explicit click, honors 2-second request spacing, and cannot bypass rate limits. If the listings don't expose bracket metadata, no B3/B4 results are invented; choose All brackets to see such entries. Search is not exhaustive and titles may omit commander names.

**Import safety:** At import time, the full deck's actual commander, size and Scryfall identities are still checked, and an explicit bracket search additionally checks the deck detail's `edhBracket`. Inaccurate or missing bracket metadata cannot silently become a B3 or B4 observation. Bracket labels reflect Archidekt's metadata and **do not independently verify** that the deck meets official bracket restrictions.

**Separate community cohorts:** Community statistics can now be filtered to the same bracket. Existing imported decks remain saved. Older imported entries may have no stored bracket; click **Refresh deck / bracket** on their saved-deck card once to retrieve that metadata. Choose **All brackets** to continue seeing mixed and untagged community observations.

**Prices:** A public B4 deck's purchase price does **not** need to match your EUR budget to teach CommanderOracle card pairings. The generated 100-card deck must independently respect the budget and your selected pricing mode. This version only improves community discovery/analysis; community patterns still do **not** automatically influence generation.

**Upgrade:** Unzip in a new folder and copy your existing `data/` folder from v0.8, then run `start-windows.bat` (Node.js 22+). Preserve the previous installation for rollback. No existing community card data is cleared.

**Verification:** `npm test` exercises import, bracket previews, metadata revalidation, cache separation, and bracket-scoped observations. Outbound network access is not available in this build environment, so live Archidekt bracket search requires your first click on Windows. Other modules and the original generator are unchanged.

---

# CommanderOracle Independent v0.8 — bounded Archidekt deck discovery

**New:** Select a commander, then click **Find public decks for selected commander** under Community Intelligence. This performs a **single public Archidekt deck-title search** (one page, 20 requested records, at most 12 previews). You can inspect the previews and select **up to four** for verification and importing with a second click. The server downloads each selected deck through the existing read-only Archidekt endpoint and saves it **only if** the actual commander's Scryfall identity matches and all 100 cards pass the existing basic checks. Incorrect commanders, incomplete decks and API failures are reported and skipped. Already-imported matching decks are reused.

**Important limitation:** The observed public search query (`/api/decks/v3/?name=...&deckFormat=3`) filters **deck titles**, NOT validated commander identity. It can miss perfectly valid commander decks whose titles omit the commander. The importer verifies the real commander before storing anything; do not read the number of title hits as the number of available decks. This API is undocumented and may change without notice. **Live discovery/import from this machine could not be tested.** If search fails on your PC, the original single-URL importer remains available.

**Safeguards:** User-triggered only; no background requests, no multi-page harvest, no third-party login, no Moxfield/EDHREC scraping. The search preview is cached for two hours; imports are bounded at four per request and require IDs returned by the recent search. Requests are sequentially paced; HTTP 429 stops the batch, no automatic retry. Imported decklists remain local with source attribution, and community data still does **not** influence deck generation. Community stats are exploratory until multiple independently validated decks are available.

**Upgrade:** Extract into a new folder, copy your previous installation's `data/` folder into it, then run `start-windows.bat`. The 100-card `test2` import and saved Scryfall catalog should still be available. Node.js 22+ required. Do not overwrite your working v0.8 installation before checking this version.

**Tests:** Newly added discovery tests cover bounded URL generation, result parsing and deduplication, search cache, rate-limit handling, actual commander verification, incomplete deck rejection, import deduplication and prevention of out-of-preview or duplicate IDs. Run `npm test` or `node --test tests/*.test.mjs`.

**Roadmap unchanged:** Real Scryfall-backed deck quality, commander-first gameplay engines, mana simulation, pricing-source honesty including Cardmarket EN NM offer data, genuine bracket differentiation, authorized community relationships, Commander Spellbook validation and later Deck Upgrade Advisor all remain goals. This release is an importer/discovery improvement, not a claim of stronger generated decks.

---

# CommanderOracle Independent v0.8 — Fix custom Archidekt “Tokens” category

**Fixed:** An Archidekt deck that had 100 cards was imported as 96 because four real Eldrazi creatures were assigned the user-defined **Tokens** category. Card category names are user labels; the importer now gives Archidekt’s explicit `includedInDeck` flag priority over category names. Actual non-deck categories still stay out.

**Your reproduction:** `https://archidekt.com/decks/26715826/test2` — affected: Chittering Dispatcher, Glaring Fleshraker, Writhing Chrysalis and Spawn-Gang Commander. Archidekt displays **Size: 100**. The four cards were excluded because of a label, not because the Scryfall catalog couldn't match them.

**Testing:** 35 / 35 local automated tests passed, including a fixture with the four affected cards. The specific live Archidekt API response is not available from this environment, so **click Recheck from Archidekt** to verify the actual 100/100 result on your PC.

**Upgrade:** Extract this ZIP into a new folder; copy the whole `data` folder from your v0.7.1 folder; run `start-windows.bat`; under Saved community decks click **Recheck from Archidekt**. Your saved deck and public Scryfall catalog will be reused. If it still isn't 100, share the full import diagnostics; don't alter your Archidekt categories merely to work around our importer.

No changes to generation, bracket behavior, Scryfall pricing or Cardmarket import mode. Existing V54/V55 installations are unaffected.

---

# CommanderOracle Independent v0.7.1 — import diagnostic patch

**New:** Archidekt 100-vs-96 import diagnosis and recheck. See `ARCHIDEKT_IMPORT_REPAIR.md`.

**Upgrade:** Extract into a new folder, copy your existing `data/` directory from v0.7, then run `start-windows.bat`. Use **Recheck from Archidekt** next to your saved deck. Do not import hundreds of decks; v0.7.1 is a manual, read-only URL importer.

---

# CommanderOracle Independent — experimental v0.7

A **separate**, local-first Commander deckbuilding prototype created from the lessons of the V55 project. It does **not** replace V55 and does not use paid AI APIs for generating decks.

**What is real in this release:** a Node web server, functional browser UI, official Scryfall API commander searches, automated Scryfall bulk-data acquisition and local caching, Oracle-ID/printing deduplication, card-face-aware mechanical helpers, heuristic commander-gameplan packages, bracket-dependent selection and budget limits, export, and automated rules tests.

**What is NOT established:** the full Scryfall catalog could not be downloaded inside the build environment (outbound DNS unavailable). Thus **no live 100-card real-catalog deck has been benchmarked yet**. This generator is experimental and should not be trusted for purchases until real-deck evaluations pass. No Windows portable `.exe` is included. Complex commander mechanics and accurate official bracket compliance are not fully implemented.

## New in v0.7 — Public Archidekt Community Intelligence (Stage 1)

**What's implemented:**

- A read-only importer for a single public Archidekt deck URL entered by the user. The server uses only `https://archidekt.com/api/decks/{numeric-id}/`, never an arbitrary URL, and handles failures, private decks, timeout, 429 throttling, response-size limits, safe origin and source attribution. Imports are locally cached for 24 hours; one request is paced at least 2 seconds from the prior request.
- Cardlist normalization against the local Scryfall Oracle-ID cache, with commander identification and separation of the main deck from Archidekt actual non-deck zones (including maybeboard and sideboard). Custom category names such as “Tokens” do not automatically make real included cards into non-deck entries. Unmatched cards, missing category metadata, incomplete 100-card decks, unverified two-commander decks and basic Commander legality errors are flagged, NOT entered into statistics.
- Local-only storage: `data/community-decks.json`. Read-only imported source references retain original Archidekt deck URLs and optional non-email author attribution.
- Per-commander card inclusion and pair co-occurrence across **validated imported decks only**. A deck is one observation, even if a card appears twice. The UI shows sample count, recurring pairs and an exploratory strategy-clustering view that suppresses nearly universal staples when comparing whole decks.
- New interface section **Community intelligence** with import URL, saved decks and community patterns for the currently selected commander. Imported data does **not yet influence auto-generated decklists**. The feature is diagnostic, not a claim of stronger generation.
- Eight additional community tests: URL/SSRF guard, category filtering, commander normalization, rejection of incomplete decks, rate limits, cache, co-occurrence, and separation of Poison and counters archetypes on synthetic Atraxa-style fixtures. **29 tests pass** with the existing suite.

**Actual external integration limitation:** This build environment cannot resolve `archidekt.com`. Live remote imports were not verified here. The URL fetch uses the undocumented public deck API that Archidekt developers have allowed read-only users to access with rate-limit respect, but schema/availability may change. Official developer discussions: https://archidekt.com/forum/thread/2832338 and https://archidekt.com/forum/thread/40353. Source deck authors retain credit; no bulk collection is enabled.

**Real-card smoke test:** The user-provided public Scryfall benchmark snapshot (32,198 cards) successfully loaded into the local server; commander search for Ulalek and the empty community-insights API worked. The existing full real-card **deck-generation** benchmark timed out in this environment; do not treat it as a successful deck-quality benchmark. This is separate from the community import tests.

### How to use v0.7

1. Extract v0.7 to a new folder and copy the previous `data/` folder into it alongside `server.mjs`. All existing Scryfall cards and imported Cardmarket offers stay local.
2. Run `start-windows.bat` (Node.js >=22 required) and open http://127.0.0.1:4285.
3. Choose your commander if you want to view matching community patterns. In the new **Community intelligence** panel, paste one public Archidekt deck URL and click **Import deck**.
4. Repeat with other *specific deck URLs you choose*. Three or more **valid, same-commander** decks are required before community metrics are presented as exploratory rather than extremely sparse. More are needed for credible archetype clustering.
5. The module does not touch V54/V55 or CommanderOracle Next. No Moxfield API connection, EDHREC scraping, Spellbook integration or account write access has been implemented.

**Two copyable `.txt` prompts are included in `prompts/`** for continuing equivalent work with Google AI Studio and OpenCode. Their future roadmap preserves your previous ideas about combos, functional Scryfall tags, better mana math, budget/bracket optimization, and later Deck Upgrade Advisor.

## New in v0.5 — V55 source comparison + budget-aware marginal upgrades

I inspected the actual user's uploaded V55 source-only archive (mechanics, relationships, gameplan, quality and optimizer). V55 has significantly richer mechanical relationships and role analysis, but its Phase 8 source still contains the *known* type-face and circular-validation risks described by the GLM audit. It has **not** been copied verbatim into this independent generator.

The first directly useful transferable idea is **budget reinvestment without breaking an existing gameplan**. After constructing a deck, the generator now considers higher-impact replacements using a price-neutral comparison of card merit. Each replacement must stay under the budget, maintain relevant commander-critical role counts and generic utility floors, preserve early mana acceleration quality, respect curve caps, and honor Game Changer limits. The algorithm will not spend unused euros unless the replacement offers a measurable improvement. Results include `reinvestment.spentBefore`, `.spentAfter` and exact `.swaps`, and the UI shows the count and EUR figures.

Two manually authored regression tests cover a higher-impact but initially unaffordable-looking candidate replacing an inferior answer when budget permits, and refusal to exceed the budget. **All 18 local synthetic tests pass.** This has **not** been validated against the real Scryfall catalog in this environment; an actual before/after deck review remains necessary. Cardmarket strict English NM/Mint mode still requires externally sourced offer CSV data.

**V55 source findings and next steps:** See `V55_SOURCE_REVIEW.md` for what was worth retaining and what remains risky. We still need true deck-level conditional-support checks, commander-specific color/payment sequencing, more complete card-role semantics, bracket policy verification, and real-catalog benchmarks. v0.5 is not a production-ready deckbuilder.

### Upgrade from v0.4

Extract this ZIP into a new folder and **copy only your previous `data` folder** into it. Run `start-windows.bat`. No repeated Scryfall download should be needed when your existing cache is valid. Keep your previous v0.4 backup.

## New in v0.4 — expensive Eldrazi / early mana correction

The user's second real €191/Bracket 3 Ulalek deck contained **100 cards, 37 lands, and 62 other spells**. While the deck was finally Eldrazi-focused, it included too many expensive threats, too little efficient early acceleration, and a draft-only land whose printed mana ability is unusable in ordinary Commander.

This update addresses **general rules**, without special-casing Ulalek or Paliano:

- Draft-dependent land colors are never treated as available in an ordinary constructed Commander game. Such lands cannot pass the mana-base scoring gate.
- Efficient early acceleration is explicitly reserved **before** choosing the full tribe/finisher package, and its mana-per-turn, mana value, and single-use nature affect ranking. Cheap acceleration can no longer be crowded out just by meeting a tribal quota.
- For commanders needing castable spells of a specified type, the selected deck gets a curve-aware cap on spells with mana value 5+ and 7+, adjusted to the real count of early accelerators. Higher-MV reveal strategies such as Yuriko are excluded from this particular cap.
- A filled tribe requirement has increased diminishing returns, making room for actual draw, removal, fixing and protection.
- The result panel shows the number of early accelerators and cards costing 5+/7+ mana. The existing real-color source warnings remain.
- Added **two manually verified regression tests** (draft-only lands and an oversized, expensive tribal card pool). All **16 tests pass** on synthetic fixtures. **This is NOT a claim that a new real-Scryfall Ulalek deck has already passed deck-quality review.**

The **same** Scryfall EUR vs. strict imported Cardmarket EN NM/Mint pricing options remain available as in v0.3. No automatic live Cardmarket offers or full gameplay simulation has been added. A subsequent release still needs to assess correct five-color mana fixing, robust interaction, conditional mana and opponent-aware strategy strength against the user's real Scryfall cache.

### Upgrade from v0.3

Keep v0.3 backed up. Extract v0.4 into a new folder, copy your previous `data/` folder beside `server.mjs`, then run `start-windows.bat`. Check which pricing source is selected before generating. The Scryfall cache does not need downloading again.

## New in v0.3 — price source and English Near Mint filter

The app now has an explicit **Pricing source** selector:

- **Scryfall EUR estimate (automatic)**: the original Scryfall-supplied euro price field. No automatic Cardmarket language/condition verification. This mode works immediately after Scryfall sync.
- **Cardmarket offers — English NM/Mint (CSV)**: an optional, **strict** local filter for offer data you obtain separately. Only listings with language `English`/`EN` and condition `NM`/`Near Mint`/`Mint` and positive price and available quantity count. When multiple qualifying offers exist for one card, the cheapest imported offer is used. Only these priced cards can be selected; missing offers **never** fall back to Scryfall EUR. This is an imported snapshot, **not a live Cardmarket API integration**, and excludes shipping. Availability can change.

Cardmarket currently does not accept new API access applications (see https://help.cardmarket.com/en/cardmarket-api). Without authorized offer data, no free Scryfall field proves which currently offered English NM card is cheapest. The old V54/55 EN NM-style prices were estimates and the CM-Low toggle did not affect V55 selection, per the prior project's Phase 6 report. We do not quietly relabel estimates as real NM offers.

### How to use English NM filtering

1. Start the application and download the Scryfall database automatically as usual (or copy the `data` folder from v0.2).
2. Select **Pricing source → Cardmarket offers · English NM/Mint (CSV)**.
3. Select an offers CSV containing your real listing data and click **Import Cardmarket offers**. The importer accepts commas or semicolons and quoted fields. Example **format only** (illustrative values, not observed prices):

```csv
card_name,language,condition,price_eur,quantity
Example Card,English,NM,1.25,1
Example Card,English,EX,0.45,1
Example Card,German,NM,0.75,1
```

Required: `language`, `condition`, `price_eur`, plus one card identifier: `card_name`, `oracle_id`, or `cardmarket_id` (mapped if its Scryfall printing is known). Optional `quantity` excludes out-of-stock offers. Accepts condition NM or Mint. Card names can be matched to existing caches even if they predate v0.3's Cardmarket ID storage; Cardmarket IDs may not cover every printing in the default Scryfall bulk data. The importer displays how many unique cards have matching offers.

**Important:** A small CSV is not a complete Commander card price database. The strict mode will refuse generation if the imported prices do not cover enough cards (or lack your commander). Choose Scryfall EUR mode for full automatic generation and treat the prices as estimates. Do not mistake an imported offer snapshot for a purchasable full-deck basket or shipping-inclusive total. Basic lands are assumed already owned and priced at zero in both modes.

Four new pricing tests verify condition/language/stock filtering, price selection, Cardmarket-ID retention and **no silent fallback**. **16 automated tests pass** in this build. The new mode still needs testing with your real offer data on your PC.

## What changed in v0.2 after the first real Ulalek benchmark

The first user-generated Ulalek deck had **100 cards / 36 listed lands**, strong Eldrazi type density, but too many low-impact Eldrazi and a worrying mix of colorless utility lands and five-color spell requirements. This release responds with the following **general scoring improvements** (not a prewritten Ulalek deck):

- Tribal type alone receives a smaller quality reward. Useful cast/ETB/token/ramp effects receive extra weight, and filling beyond the core requirement incurs diminishing returns.
- Four on-plan, high-impact creature finishers are sought in Brackets 3 and 4 (three in Bracket 2); the generator warns if it cannot obtain enough.
- Multicolor land choice penalizes lands with costly mana activation, one-shot fixing, unsuitable conditional mana, and no useful colored production. A true `{C}` source still matters where the commander's ability requires it.
- **Actual selected spells' colored mana symbols** now influence final basic-land allocation, and a color-source report flags weak availability. This is a rough heuristic, *not* a castability simulation.
- Mana-source classification reads production clauses instead of misreading mana symbols in ability costs. Duplicate-faced display names are normalized for exported lists.
- Three additional focused regression tests were added in v0.2. v0.3 includes four pricing tests; **16 tests passing** here.

**Not yet proven:** This environment still cannot reach the real Scryfall catalog, and these changes have not been benchmarked against the user's cached card database. This is not a certified strong Ulalek deckbuilder. More strategy validation, real pricing, game-action sequencing and stronger card evaluation are needed.

### Upgrade from v0.1 or v0.2 without downloading Scryfall again

1. Keep your existing installation folder as a backup.
2. Extract v0.3 to a separate folder.
3. Copy the **`data`** directory from your existing `CommanderOracle-Independent` folder into the new extracted folder, alongside `server.mjs`. This preserves your Scryfall cache and metadata.
4. Launch `start-windows.bat`. The automatic Scryfall pricing mode works immediately. Regenerate Ulalek with the **same €191 / Bracket 3** settings and compare both lists.

## Start on Windows

1. Install **Node.js 22 or later**, from https://nodejs.org/ (one-time, free). You don't need npm packages or an API key.
2. Unzip this folder.
3. Double-click `start-windows.bat` (or open a terminal in the folder and run `node server.mjs`).
4. In a browser, open **http://127.0.0.1:4285** if it doesn't open automatically.
5. Click **Update database** to automatically fetch the current Scryfall bulk dataset (the download can be large and take several minutes). This is **not** a manual import.
6. Search for a commander, set a budget and bracket, generate a deck, and export the list.
7. Data stays in `data/` for subsequent offline generation. Run Update database periodically to refresh legality and pricing.

The server binds only to `127.0.0.1`. Stop it by closing the terminal window or pressing Ctrl+C. Keep the terminal open while using the page.

### Why the Scryfall API plus a local cache?

The Scryfall API supports commander search and supplies an official, regularly refreshed bulk dataset. The program uses `https://api.scryfall.com/bulk-data` to discover the current `default_cards` download, supporting compressed `.jsonl.gz` or the older JSON array format, and downloads it from Scryfall's official data host. This avoids making tens of thousands of individual API calls during deck generation and respects Scryfall's request limits. See https://scryfall.com/docs/api and https://scryfall.com/docs/api/bulk-data.

No manual Scryfall import or recurring AI subscription is necessary. Network access is needed only for the initial download, searching before the catalog is loaded, and future updates.

## Quality and limitation notes

- The card model distinguishes **castable faces** from transforming back faces, and **playable lands** from transforming land backs. Do not interpret a deck's gameplan counters as proof of strength.
- Each deck requires 99 cards plus a commander, a fixed mana-base allocation, EUR-pricing eligibility, a package of relevant commander enablers and support cards; unmet package quotas are displayed as warnings.
- `BRACKETS` in `src/generator.mjs` are **approximate tuning profiles**; this is not a promise of official Commander Brackets compliance. Game Changers are checked when exposed in Scryfall data; policies may change.
- The cached Scryfall EUR price is used per Oracle ID; the default bulk catalog does not necessarily identify the globally cheapest printing. This is an estimate and may not represent live stock, shipping, condition, or the actual cheapest purchasable printing. Basic lands are treated as already owned, with price zero.
- The heuristics cannot yet interpret all mechanics accurately (e.g. replacement effects, special casting costs, complex combos, unusual commander restrictions). It does not simulate real multiplayer games, and mana restrictions need further validation.
- Some 100-card decks may be flagged **NEEDS REVIEW** or **UNCLASSIFIED COMMANDER** instead of falsely certified as strong. **Check every list before buying cards**.
- The engine is currently JavaScript modules (Node 22); it can be migrated to TypeScript/Electron after the gameplay logic passes real-deck tests. There is no fake mock catalog in production.

## Tests

Run `npm test` or `node --test tests/*.test.mjs` (no dependencies to install).

Tests check: transforming artifact faces do not leak Eldrazi or land types, MDFC lands, Kindred instants, Ulalek `{C}{C}` needs, conditional evasion, legality, exact card count/land slots against a synthetic **test-only** candidate pool, and JSON/JSONL Scryfall parsing. They are not a substitute for live-data quality benchmarks.

## Next acceptance benchmark

After downloading the actual Scryfall catalog, generate **Ulalek €191 Bracket 3**, then Yuriko, Wilhelt, Light-Paws, Krenko and Zada. Compare card-by-card against V55. Capture actual mana access, ability enablers and budget. Do not promote this prototype to replace V55 unless its real decklists are demonstrably better.

## Credit

Card information and price estimates from [Scryfall](https://scryfall.com). Magic: The Gathering is a trademark of Wizards of the Coast. This is an independent, unofficial application.

## Benchmark provenance

`benchmarks/ulalek-v01-user.txt` is the actual first Ulalek €191 / Bracket 3 exported list provided by the user. It is **not** a trusted strong deck, not a generator preset, and is only saved so we can compare real changes after rerunning v0.3 with the user's local database.
