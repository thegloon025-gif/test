# v0.8.5 — Singleton output and stale-process validation

- Source: v0.8.4 archive from this conversation; live Scryfall cache not included.
- New tests model Scryfall-style double-faced name `Sol Ring // Sol Ring` + standard `Sol Ring`, both with distinct IDs. Previous internal checks saw different names while export collapsed both to `1 Sol Ring`.
- Tests `tests/v085-canonical.test.mjs` on unmodified v0.8.4: **2 failed** (direct validation and end-to-end generated deck export).
- Same tests after shared output-name canonicalization and independent exported-name check: **2 passed**.
- Full patched Node test suite: **72 passed, 0 failed**.
- Local server API/UI smoke test: see release notes, version provided as `0.8.5` in API and UI.
- Root cause has been demonstrated in a synthetic replay. Whether exactly this duplicate-faced record is present in the user's downloaded Scryfall cache **remains unverified**; the identical list might also be an old server result, hence added startup/version checks.
- A successful synthetic regression is not a real deck-building benchmark; budget, bracket, gameplay and repeated-use mana claims still require real-data testing.
