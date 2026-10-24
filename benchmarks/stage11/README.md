# Reading Stage 11/12 evidence

Start with [the validation report](../stage11-12-VALIDATION.md) and
[complete card differences](deck-comparisons.md). All `.txt` files are complete
100-card generated exports. Personal full references and original caches are
not redistributed here.

Current Wilhelt outputs are in `resource-history` and `resource-ladder-a/b`.
Ulalek uses `historical-final`, `ladder-ulalek` and matched `ulalek-reference`.
Y'shtola uses `cast-correction`; **its Zada row is superseded** by `zada-final`.
`references-checkpoint` retains the other personal/unrelated builds, and the
original Y'shtola/Zada outputs for fair comparisons. Earlier snapshots are
explicit checkpoints, not claimed improvements. `candidates-guarded` is the
final Wilhelt constructor replay; `candidates-after` retains rejected unsafe
refinements. `candidates-before` and `baseline` use exact PR #8 source.

`printing-ledgers.json.gz` contains a dictionary keyed by original group/file.
Each entry has the lossless original JSON string in `content` and its SHA-256.
`measurements.json.gz` holds per-build source/input hashes, full comparisons,
refinement participation and controlled candidate diagnostics. It is compact
review evidence, not a replacement for the private frozen inputs.

Portable Node example (PowerShell/cmd/Linux, with quoted paths as needed):

```
node --input-type=module -e "import{readFileSync,writeFileSync}from'node:fs';import{gunzipSync}from'node:zlib';const a=JSON.parse(gunzipSync(readFileSync('benchmarks/stage11/printing-ledgers.json.gz')));writeFileSync('chosen-records.json',a['resource-history/wilhelt-b3-191-historical-records.json'].content)"
```

Materialize an array from `jobs.json` into a separate JSON file before passing
it to `tools/benchmark-stage11.mjs`. Use the private bundle's unfiltered community
for historical jobs and held-out community for held-out jobs. Use exact baseline
worktree 85f1f2c only for before results. Do not overwrite active data.

`sha256.json` checks every other public evidence file. Source/cache preservation
is separately checked in `preservation.json`. Runtime/RSS are concurrent-cloud
observations; repeats are not independent gameplay trials. Every uncertainty,
checkpoint, missing reference price and external-validation limit remains in the
main report. No release, merge or power-improvement claim follows from these files.
