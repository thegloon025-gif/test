# ChatGPT Architect validation fixtures

These are complete **archived decks used as scripted manual-result inputs**, not new ChatGPT-generated decks. No user account was authorized. The lossless `manual-receipts.json.gz` contains per-card selected-printing/price audits, supported-source payment evidence and three advisory package previews. No personal reference lists or credentials are published.

Run `node tools/validate-architect-workflows.mjs http://127.0.0.1:4285 NEW_OUTPUT_DIRECTORY` against a disposable copy with the frozen catalog/library to reproduce raw receipts. Then `node tools/audit-architect-fixtures.mjs NEW_OUTPUT_DIRECTORY data/cards.json NEW_AUDIT.json` independently checks all 500 physical slots. The catalog/library hashes are in provenance; updated prices are a different experiment. Do not overwrite user caches merely to reproduce old prices.

The official SDK is optional and separately installed; no inference is performed by these manual tests. See ../chatgpt-architect-VALIDATION.md and ../../docs/CHATGPT_ARCHITECT.md for live-verification limits and account-setting preflight.
