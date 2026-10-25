# Experimental Upgrader evidence

These six TXT files are complete public archived-deck workflows, not personal reference lists. Scripted approval demonstrates functionality, not improved power. `receipts.json.gz` losslessly retains exact printing/price audits, package Oracle/jobs and all paired goldfish traces. See ../experimental-upgrader-VALIDATION.md.

To extract raw receipts for the independent audit from repository root (Node >=22):

```js
// Save as a local .mjs script or run via node --input-type=module.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const base='benchmarks/experimental-upgrader',out='NEW-upgrader-evidence';
await mkdir(out);
const bundle=JSON.parse(gunzipSync(await readFile(base+'/receipts.json.gz')));
for(const [id,data] of Object.entries(bundle)){
  await writeFile(out+'/'+id+'-receipts.json',JSON.stringify(data),{flag:'wx'});
  for(const suffix of ['original','proposed'])await copyFile(base+'/'+id+'-'+suffix+'.txt',out+'/'+id+'-'+suffix+'.txt');
}
```

Then `node tools/audit-upgrader-evidence.mjs NEW-upgrader-evidence data/cards.json NEW-audit.json`. Use the frozen eligible catalog with the hashes in provenance; a refreshed catalog legitimately changes pricing and is a new input, not this replay. Do not replace user caches just to reproduce an old number.
