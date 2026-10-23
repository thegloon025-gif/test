/** Lossless, hash-checked phase storage; the phase index stays present so the
 * benchmark's no-overwrite guard still protects an archived experiment. */
import {readFile} from 'node:fs/promises';import {dirname,join} from 'node:path';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
export const evidenceSHA=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function readOpportunityJSON(path){const index=JSON.parse(await readFile(path));if(!index.reportFile)return index;const bytes=await readFile(join(dirname(path),index.reportFile));if(evidenceSHA(bytes)!==index.reportSHA256)throw Error('Archived phase hash mismatch: '+path);return JSON.parse(gunzipSync(bytes));}
