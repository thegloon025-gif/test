# v0.8.4 — independent regression and real-world follow-up

Date: 2026-10-20.

## User-provided observations (v0.8.3, real generated deck)

- Ulalek, Fused Atrocity, budget €191, Commander Bracket 3, Scryfall EUR mode.
- User-exported 100-card deck contained two copies of `Sol Ring`; not valid under ordinary Commander singleton rules.
- Essential gameplan screenshot: 125 recorded Spellbook variants; **one** intentionally added package (Echoes of Eternity completing Ulalek + Glaring Fleshraker + Echoes); **three** inventory-complete combinations (three infinite outcome labels); simulated price €152.41 after three budget swaps.
- Screenshot displayed **39** early acceleration cards, which is *not* proof of 39 efficient repeatable mana accelerators. It also displayed 24 color sources for several colors, which might include conditional/restricted sources. Both deserve separate audits.
- These observations are from a user screenshot/export, **not** an independent card-by-card Scryfall-backed replay in the build environment.

## Reproduction and repair

- Independent synthetic test catalog with two nonbasic `Sol Ring` records under distinct Oracle IDs and otherwise identical names:
  - Unmodified v0.8.3 generator: **2** Sol Rings, 100 cards, 37 lands.
  - Patched v0.8.4 generator: **1** Sol Ring, 100 cards, 37 lands.
- New regression tests: name-based singleton validation including commander and basic lands, explicit matching Oracle-text multiplicity exceptions, and end-to-end generator with two Sol Ring database records. Added a synthetic inventory-combo report assertion.
- Total Node test suite: **70 passed, 0 failed**, with the three added regression tests.
- The generator enforces distinct English names for nonbasic mainboard cards even if catalog IDs differ. Its independent post-build audit includes commander and rejects any non-singleton export. Exceptions are recognized only by explicit matching Oracle text; intentionally assembling multiple copies is still future scope.
- Reported complete combos are inventory matches only and not mechanically executed or confirmed under official bracket rules.

## Not verified yet

- **No full genuine Scryfall snapshot** in the attached source package, so this environment cannot truthfully claim the corrected real €191 B3 Ulalek output or its actual mana/playability.
- Live Archidekt/Spellbook API availability and full Cardmarket EN NM listings are not verified here; previously recorded Spellbook fixture is bundled in `tests/fixtures/`.
- Follow-up on Windows: preserve `data/`, regenerate with the actual catalog, verify exact 100 cards, only one `Sol Ring`, land/price legality, and all three inventory matches. Inspect the individual combos' mana/zone requirements.
