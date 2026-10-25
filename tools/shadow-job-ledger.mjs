/** Local read-only analysis; never called by the server or constructor.
 * node tools/shadow-job-ledger.mjs INPUT_JSON NEW_OUTPUT_JSON[.gz]
 * Input: {commander, cards:99 mainboard records, executionEvidence?:...}. */
import {open,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {buildCardJobLedger} from '../src/jobLedger.mjs';
const[input,output]=process.argv.slice(2);
if(!input||!output)throw Error('INPUT_JSON NEW_OUTPUT_JSON[.gz] required');
const file=await open(input,'r'),buffer=Buffer.alloc(2*1024*1024+1);let bytes=0;
try{while(bytes<buffer.length){const r=await file.read(buffer,bytes,buffer.length-bytes,null);if(!r.bytesRead)break;bytes+=r.bytesRead;}}finally{await file.close();}
if(bytes===buffer.length)throw Error('Shadow input exceeds 2 MiB; no output written');
const ledger=buildCardJobLedger(JSON.parse(buffer.subarray(0,bytes))),content=JSON.stringify(ledger)+'\n';
await writeFile(output,output.endsWith('.gz')?gzipSync(content):content,{flag:'wx',mode:0o600});
console.log(JSON.stringify({mode:ledger.mode,cards:ledger.totalCards,completeKnownInput:ledger.completeInput,observedDirections:ledger.plans.length,limitations:ledger.limitations,output}));
