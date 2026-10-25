/** node tools/functional-goldfish.mjs INPUT.json NEW_OUTPUT.json */
import {readFile,writeFile,stat} from 'node:fs/promises';
import {runGoldfish} from '../src/functionalGoldfish.mjs';
import {buildCardJobLedger} from '../src/jobLedger.mjs';
import {dependencyAnalysis} from '../src/functionalAblation.mjs';
const [input,output]=process.argv.slice(2);if(!output)throw Error('INPUT.json NEW_OUTPUT.json required');
if((await stat(input)).size>2*1024*1024)throw Error('Input exceeds 2 MiB');
const x=JSON.parse(await readFile(input)),ledger=buildCardJobLedger(x),result={ledger,dependencies:dependencyAnalysis(ledger),goldfish:runGoldfish(x,x.protocol||{})};
await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
