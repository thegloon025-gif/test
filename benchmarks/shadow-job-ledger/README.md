# Read-only shadow evidence

Start with [validation and limitations](../shadow-job-ledger-VALIDATION.md) and
[the schema and six-point migration proposal](../../docs/SHADOW_JOB_LEDGER.md).

`ledgers.json.gz` losslessly contains:

- `decks`: 12 complete generated/source job ledgers, plan obligations, exact
  archived receipt keys and conditional probe context.
- `mutations`: six complete 100-card destructive diagnostic ledgers, exact cuts/
  additions/prices and full baseline-function differences. These are not approved
  construction alternatives or upgrades.
- `comparisons`: original Wilhelt €102.06/€136.78/€160.38/€186.47 versus €163.25
  observations. No winner or score is produced.
- Input/source hashes pin the original catalog, pricing archive and library.

`summary.json` is a compact index; detailed mutation losses stay in the bundle.
Job/obligation counts measure coverage, **not deck strength or independent engines**.
`independent-audit.json` independently checks physical records, cents, graph and
cost receipts, including private reference graphs without publishing their lists.
`provenance.json` records unchanged production files, preserved uploaded caches
and the working-cache startup incident. Tests and smoke checks are separate files.

Node 22+ extraction (PowerShell/cmd/Linux):

```
node --input-type=module -e "import{readFileSync,writeFileSync}from'node:fs';import{gunzipSync}from'node:zlib';const b=JSON.parse(gunzipSync(readFileSync('benchmarks/shadow-job-ledger/ledgers.json.gz')));writeFileSync('wilhelt-jobs.json',JSON.stringify(b.decks['wilhelt-163'].ledger,null,2),{flag:'wx'})"
```

Use `b.mutations['replace-forge-one-shot'].ledger` to extract a complete edited
ledger, or `.delta` for its specific losses. Original directly importable deck
exports remain under `benchmarks/stage11/`; no list was regenerated or changed
for this shadow analysis. The API smoke is a separately identified fresh run.

All seven full personal reference ledgers stay in the owner's private ZIP outside
Git. That ZIP includes the private analysis/identity map needed for reproduction.
Five cards in two references are absent from the frozen catalog and stay unknown.
Never republish the private ZIP or treat its partial prices as complete quotes.

Reproduce from repository root with separate new output directories:

```
node tools/benchmark-shadow-job-ledgers.mjs CATALOG LIBRARY PRIVATE_ANALYSIS NEW_PUBLIC_OUT NEW_PRIVATE_OUT
node tools/audit-shadow-job-ledgers.mjs CATALOG LIBRARY NEW_PUBLIC_OUT/ledgers.json.gz NEW_AUDIT.json NEW_PRIVATE_OUT/reference-ledgers.json.gz
```

Use frozen inputs, not refreshed live prices/research. A normal standalone input
for `tools/shadow-job-ledger.mjs` contains the actual commander/catalog objects
and 99 selected card objects; the archive's IDs/printing receipt alone is not
Oracle data. All analysis is local and read-only. `sha256.json` verifies every
other file in this evidence directory. Source and evidence commits are separate.
