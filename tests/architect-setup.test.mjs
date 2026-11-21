import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {cp,mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';

const root=join(import.meta.dirname,'..');
const printing={eligibleVersion:2,language:'en',border:'black'};
const catalog=[
 {id:'fixture',name:'Fixture Commander',type_line:'Legendary Creature',mana_cost:'{G}',cmc:1,oracle_text:'',
  color_identity:['G'],legalities:{commander:'legal'},prices:{eur:1},printing},
 {id:'forest',name:'Forest',type_line:'Basic Land — Forest',mana_cost:'',cmc:0,oracle_text:'{T}: Add {G}.',
  color_identity:['G'],legalities:{commander:'legal'},prices:{eur:0},printing},
];

const scenarios=[
 {name:'a missing catalog',version:null,message:/No card catalog is installed.*Update database/},
 {name:'an older catalog',version:1,message:/Update database.*refresh the pricing and printing data/},
 {name:'an eligible catalog',version:2,message:/operation stopped \(disabled\)/},
];

for(const {name,version,message} of scenarios)test('Architect handles '+name,{timeout:20_000},async t=>{
 const directory=await mkdtemp(join(tmpdir(),'commander-architect-setup-'));
 let child;
 t.after(async()=>{
  if(child&&child.exitCode===null&&child.signalCode===null&&child.pid){
   const closed=once(child,'close');
   child.kill();
   await closed;
  }
  await rm(directory,{recursive:true,force:true});
 });
 await cp(join(root,'server.mjs'),join(directory,'server.mjs'));
 await cp(join(root,'src'),join(directory,'src'),{recursive:true});
 if(version!==null){
  const data=join(directory,'data');
  await mkdir(data);
  await writeFile(join(data,'cards.json'),JSON.stringify(catalog));
  await writeFile(join(data,'metadata.json'),JSON.stringify({printingEligibilityVersion:version}));
 }
 const reservation=createServer().listen(0,'127.0.0.1');
 await once(reservation,'listening');
 const {port}=reservation.address();
 await new Promise(resolve=>reservation.close(resolve));
 child=spawn(process.execPath,['server.mjs'],{cwd:directory,env:{...process.env,PORT:String(port)}});
 let stderr='';
 child.stderr.on('data',chunk=>{stderr+=chunk;});
 await new Promise((resolve,reject)=>{
  child.on('error',reject);
  child.on('exit',code=>reject(Error('Local server exited with '+code+' '+stderr)));
  child.stdout.on('data',chunk=>{if(chunk.toString().includes('running at'))resolve();});
 });

 const base='http://127.0.0.1:'+port+'/api/architect/';
 const readStatus=()=>fetch(base+'status').then(response=>response.json());
 const {csrf}=await readStatus();
 const request=action=>fetch(base+action,{method:'POST',headers:{'Content-Type':'application/json','x-commander-ai-session':csrf},
  body:JSON.stringify({mode:'builder',commanderName:'Fixture Commander',budget:220,bracket:3})});
 const run=await request('run');
 assert.equal(run.status,version===2?400:409);
 const result=await run.json();
 assert.match(result.error,message);
 if(version===2)assert.equal(result.code,'disabled');
 else {
  const manual=await request('request');
  assert.equal(manual.status,409);
  assert.equal((await manual.json()).error,result.error);
 }
 assert.equal((await readStatus()).requestsToday,0);
});
