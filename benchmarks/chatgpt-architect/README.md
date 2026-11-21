# ChatGPT Architect validation fixtures

These are complete **archived decks used as scripted manual-result inputs**, not new ChatGPT-generated decks. No user account was authorized. The lossless `manual-receipts.json.gz` contains per-card selected-printing/price audits, supported-source payment evidence and three advisory package previews. No personal reference lists or credentials are published.

Run `node tools/validate-architect-workflows.mjs http://127.0.0.1:4285 NEW_OUTPUT_DIRECTORY` against a disposable copy with the frozen catalog/library to reproduce raw receipts. Then `node tools/audit-architect-fixtures.mjs NEW_OUTPUT_DIRECTORY data/cards.json NEW_AUDIT.json` independently checks all 500 physical slots. The catalog/library hashes are in provenance; updated prices are a different experiment. Do not overwrite user caches merely to reproduce old prices.

The official SDK is optional and separately installed; no inference is performed by these manual tests. See ../chatgpt-architect-VALIDATION.md and ../../docs/CHATGPT_ARCHITECT.md for live-verification limits and account-setting preflight.

## Budget optimization replay

The replay used the [saved Zacama list](../stage11/references-checkpoint/zacama-b3-160-heldout.txt) with Bracket 3, a €220 ceiling, owned basic lands, and the Scryfall EUR printing catalog from 18 November 2026. The local Spellbook snapshot was version 7.4.4 from the same date. The deterministic search evaluated 429 proposals and accepted 15. The 100-card list went from €108.69 to €204.74, leaving €15.26. Accepted additions included Prismatic Vista, Harrow, Wild Growth, Heroic Intervention and Fauna Shaman.

To replay, paste the saved list into Architect with those settings, enable **Look for upgrades within the budget after validating this list**, and validate. The alternate [saved list](../stage11/references-checkpoint/zacama-b3-160-heldout-alternative-2.txt) checked at Bracket 4 went from €136.38 to €169.06 after 96 proposals and two accepted changes. Later catalog snapshots can change eligible prices and candidates.
