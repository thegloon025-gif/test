# Compact Architect evidence

`comparison.json.gz` is the lossless frozen-input comparison produced by
`tools/validate-architect-quality.mjs`, compressed with deterministic gzip mtime 0.
It contains no newly generated GPT deck or private preferred-reference list.

Read it with:

```sh
node --input-type=module -e "import fs from 'node:fs'; import z from 'node:zlib'; process.stdout.write(z.gunzipSync(fs.readFileSync('benchmarks/architect-quality/comparison.json.gz')))"
```

`checks.json`, `browser.json`, `independent-audit.json`, `runtime-egress.json`
and `preservation.json` record scoped checks and limitations. The public card
fixtures are under tests/fixtures/architect-quality; no original cache is bundled.
`sha256.json` hashes every other evidence file in this folder.
