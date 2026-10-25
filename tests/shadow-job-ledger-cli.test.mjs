import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import os from 'node:os';
const cli=fileURLToPath(new URL('../tools/shadow-job-ledger.mjs',import.meta.url));
test('real read-only CLI round trip supports spaces and refuses to overwrite existing evidence',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'shadow jobs with spaces '));
 try{const input=path.join(dir,'input records.json'),output=path.join(dir,'output ledger.json.gz'),data={commander:{id:'cmd',name:'Local Commander',type_line:'Legendary Creature — Human',oracle_text:''},cards:Array.from({length:99},(_,i)=>({id:'c'+i,name:'Card '+i,type_line:'Sorcery',oracle_text:'Scry 1.'}))};
  const original=JSON.stringify(data);await writeFile(input,original);const first=spawnSync(process.execPath,[cli,input,output],{encoding:'utf8'});assert.equal(first.status,0,first.stderr);const bytes=await readFile(output),ledger=JSON.parse(gunzipSync(bytes));assert.equal(ledger.totalCards,100);assert.equal(ledger.mode,'read-only shadow');assert.equal(await readFile(input,'utf8'),original);
  const second=spawnSync(process.execPath,[cli,input,output],{encoding:'utf8'});assert.notEqual(second.status,0);assert.deepEqual(await readFile(output),bytes);
  await writeFile(input,Buffer.alloc(2*1024*1024+1,32));const tooBig=spawnSync(process.execPath,[cli,input,path.join(dir,'not written.json')],{encoding:'utf8'});assert.notEqual(tooBig.status,0);assert.match(tooBig.stderr,/exceeds 2 MiB/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
