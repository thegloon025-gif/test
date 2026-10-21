import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
const script=path.resolve(import.meta.dirname,'..','export-benchmark.mjs');
test('one-time public exporter creates compressed complete snapshot and strips private fields',async()=>{
 const tmp=await mkdtemp(path.join(tmpdir(),'commander-export-test-'));
 try{
  await mkdir(path.join(tmp,'data'));
  const cards=Array.from({length:10001},(_,i)=>({id:`card${i}`,name:`Card ${i}`,type_line:'Creature — Test',prices:{eur:0.2},oracle_text:'Draw a card.',private_user_notes:'SECRET NEVER EXPORTED',api_key:'SECRET NEVER EXPORTED'}));
  await writeFile(path.join(tmp,'data','cards.json'),JSON.stringify(cards));
  await cp(script,path.join(tmp,'export-benchmark.mjs'));
  const proc=spawnSync(process.execPath,[path.join(tmp,'export-benchmark.mjs')],{encoding:'utf8'});
  assert.equal(proc.status,0,proc.stderr);
  const unpacked=JSON.parse(gunzipSync(await readFile(path.join(tmp,'CommanderOracle-benchmark-cards.json.gz'))));
  assert.equal(unpacked.cards.length,10001);
  assert.equal(unpacked.cards[42].name,'Card 42');
  assert.ok(!JSON.stringify(unpacked).includes('SECRET NEVER EXPORTED'));
 }finally{await rm(tmp,{recursive:true,force:true});}
});
