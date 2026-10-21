# v0.8.3 recorded-API regression and build validation

Date: 2026-10-20. This patch was implemented against the user's v0.8.2 ZIP and their **actual saved** Ulalek `test2` Commander Spellbook response JSON and `combo-library.json`. It was not verified through a live API call in this sandbox.

## Observed source versus previous persisted result

| Material | Included variants | Almost-included variants | Total stored variants | Template-related variants |
|---|---:|---:|---:|---:|
| User-supplied raw `find-my-combos` cache | **10** | **115** | should be 125 after persist | 2 included `--34`; 3 near templates |
| User-supplied v0.8.2 library | 8 represented | 112 represented | **120** | **0** |
| v0.8.3 normalized and re-persisted (recorded fixture) | **10** | **115** | **125** | **5** |

The missing included IDs are `5637-5642-5657--34` (Ulalek, Echoes of Eternity, Kozilek's Unsealing) and `2751-5637-5657--34` (Ulalek, Strionic Resonator, Kozilek's Unsealing). Both require a separate Eldrazi creature card of MV 4, 5, or 6 **in hand**, plus the mana to cast it and required battlefield positions. The near variants missing from the library contain template suffixes `--34` and `--46`. The recorded Spellbook template-34 query also accepts Changeling creatures in the correct MV range. This is an **inventory** and Scryfall predicate check, not a guarantee the creature is in hand or the loop is executable.

## Tests actually performed

- 67/67 Node test cases passed (61 pre-existing + six added).
- Fixture reconstruction checks the full 10 included + 115 near API record structure, persistence of 125 non-duplicate IDs, five template requirements, positive/negative type + MV matches, and mana-state review markers.
- Automatic local-only startup repair was tested by placing an exact hashed response for a verified synthetic 100-card import, then checking recovery and idempotence. Different deck hash did not silently reuse an unrelated response.
- Package ranking synthetic check rejects Yarus-style newly added unrelated enablers and prefers a smaller commander-relevant package. Existing B3 €191 synthetic Ulalek, Yuriko, Wilhelt, Light-Paws construction tests still pass.
- Existing local server starts and serves the UI/status endpoint; inspected JavaScript syntax and generated ZIP structure.

## Remaining checks

- **No actual full Scryfall card catalog or exported v0.8.2 generated Ulalek decklist** was attached to this patch task. No genuine €191 B3 A/B build, card-level swaps, or real user-`test2` deck inventory recount can be claimed. Local follow-up is required; use the persistent `data/` from your PC.
- Spellbook's reported outcomes are not verified mechanical correctness or official bracket-policy compliance. Missing zones, mana, timings, protection and risk of interaction remain.
- A cached Spellbook response does not establish an up-to-date database; click **Check combos with Commander Spellbook** on `test2` when necessary to refresh it. v0.8.3 never scans or calls APIs automatically.
- Prices are Scryfall EUR unless the user explicitly imports suitable English NM/Mint Cardmarket offer snapshots.
