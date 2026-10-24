/** Explicit local file import. This CLI NEVER makes an HTTP request. */
import {readFile,stat} from 'node:fs/promises';
import {importEdhrecCommanderJson,MAX_EDHREC_BYTES} from '../src/edhrecKnowledge.mjs';
const args=process.argv.slice(2);
const get=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]};
if(args.includes('--help')||!get('--commander')||!get('--file')){
 console.log('node tools/import-edhrec-json.mjs --commander "Wilhelt, the Rotcleaver" --file path/to/snapshot.json');
 if(!args.includes('--help'))process.exitCode=1;
}else{
 try{
  const source=get('--file'),info=await stat(source);
  if(info.size>MAX_EDHREC_BYTES)throw Error('Input JSON exceeds 3MB; import refused.');
  const payload=JSON.parse(await readFile(source,'utf8'));
  const {saved}=await importEdhrecCommanderJson({commanderName:get('--commander'),payload});
  console.log('Imported '+saved.cardCount+' distinct recommendation cards across '+saved.categories.length+' categories for '+saved.commanderName+'.');
  console.log('Stored locally in data/edhrec-imports. No EDHREC network request made; does not alter production selection.');
 }catch(e){console.error('Local EDHREC import failed: '+e.message);process.exitCode=1;}
}
