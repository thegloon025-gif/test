/** Explicit local file import. This CLI NEVER makes an HTTP request. */
import {open} from 'node:fs/promises';
import {importEdhrecCommanderJson,MAX_EDHREC_BYTES} from '../src/edhrecKnowledge.mjs';
const args=process.argv.slice(2),allowed=new Set(['--commander','--file','--directory','--retrieved-at']);
if(args.length===1&&args[0]==='--help'){
 console.log('node tools/import-edhrec-json.mjs --commander "Wilhelt, the Rotcleaver" --file "C:\\My Decks\\snapshot.json" [--directory "local imports"] [--retrieved-at ISO_DATE]');
}else{
 try{
  const values=new Map();for(let i=0;i<args.length;i+=2){if(!allowed.has(args[i])||values.has(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw Error('Invalid or repeated import option. Use --help.');values.set(args[i],args[i+1]);}
  if(!values.has('--commander')||!values.has('--file'))throw Error('Both --commander and --file are required.');
  const handle=await open(values.get('--file'),'r');let raw;
  try{const bytes=Buffer.alloc(MAX_EDHREC_BYTES+1);let used=0,n=1;while(n&&used<bytes.length){n=(await handle.read(bytes,used,bytes.length-used,null)).bytesRead;used+=n;}if(used>MAX_EDHREC_BYTES)throw Error('Input JSON exceeds 3MB; import refused.');raw=bytes.subarray(0,used).toString('utf8');}finally{await handle.close();}
  const {saved}=await importEdhrecCommanderJson({commanderName:values.get('--commander'),payload:JSON.parse(raw),directory:values.get('--directory'),retrievedAt:values.get('--retrieved-at')??null});
  console.log('Imported '+saved.cardCount+' distinct recommendation cards across '+saved.categories.length+' categories for '+saved.commanderName+'.');
  console.log('Stored locally. No EDHREC network request made; does not alter production selection.');
 }catch(e){console.error('Local EDHREC import failed: '+e.message);process.exitCode=1;}
}
