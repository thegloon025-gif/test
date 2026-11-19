import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {cp,mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';

const card=(name,type_line,oracle_text='',cmc=2,eur=.1,extra={})=>({
 id:name,name,type_line,oracle_text,cmc,prices:{eur},legalities:{commander:'legal'},color_identity:[],...extra
});
const eldrazi=card('Fixture Eldrazi Commander','Legendary Creature — Eldrazi',
 'Whenever you cast an Eldrazi spell, you may pay {C}{C}. If you do, copy that spell.',5,.4);
const wizard=card('Fixture Wizard Commander','Legendary Creature — Wizard',
 'Whenever you cast an instant or sorcery spell, draw a card.',4,.4,{color_identity:['U']});
const catalog=[eldrazi,wizard,
 card('Wastes','Basic Land — Wastes','{T}: Add {C}.',0,0),
 card('Island','Basic Land — Island','{T}: Add {U}.',0,0,{color_identity:['U']}),
 ...Array.from({length:80},(_,i)=>card('Fixture Eldrazi '+i,'Creature — Eldrazi','When you cast this spell, create a 0/1 Eldrazi Spawn creature token.',2+i%5)),
 ...Array.from({length:25},(_,i)=>card('Fixture Mana '+i,'Artifact','{T}: Add {C}.')),
 ...Array.from({length:20},(_,i)=>card('Fixture Answer '+i,'Instant','Exile target creature.')),
 ...Array.from({length:20},(_,i)=>card('Fixture Draw '+i,'Sorcery','Draw two cards.')),
 ...Array.from({length:350},(_,i)=>card('Fixture Artifact '+i,'Artifact','Scry 1.',3))
];
const root=join(import.meta.dirname,'..');

test('combined generation endpoint returns separate audited, exportable bracket decks',{timeout:60_000},async t=>{
 const workspace=await mkdtemp(join(tmpdir(),'commander-combined-generation-'));
 t.after(()=>rm(workspace,{recursive:true,force:true}));
 await cp(join(root,'src'),join(workspace,'src'),{recursive:true});
 await cp(join(root,'server.mjs'),join(workspace,'server.mjs'));
 await mkdir(join(workspace,'data'));
 await writeFile(join(workspace,'data','cards.json'),JSON.stringify(catalog));
 await writeFile(join(workspace,'data','metadata.json'),JSON.stringify({printingEligibilityVersion:2,count:catalog.length}));
 const reservation=createServer().listen(0,'127.0.0.1');
 await once(reservation,'listening');
 const {port}=reservation.address();
 await new Promise(resolve=>reservation.close(resolve));
 const server=spawn(process.execPath,['server.mjs'],{cwd:workspace,env:{...process.env,PORT:String(port),TOPDECK_API_KEY:''}});
 t.after(async()=>{
  if(server.exitCode===null&&server.signalCode===null){const closed=once(server,'close');server.kill();await closed;}
 });
 let errors='';
 server.stderr.on('data',chunk=>{errors+=chunk;});
 await new Promise((resolve,reject)=>{
  server.on('error',reject);
  server.on('exit',code=>reject(Error('Local server exited with '+code+' '+errors)));
  server.stdout.on('data',chunk=>{if(chunk.toString().includes('running at'))resolve();});
 });
 const endpoint='http://127.0.0.1:'+port+'/api/generate';
 const payload={commanderId:eldrazi.id,bracket:'3+4',budget:20,budgetTolerance:4,
  powerTarget:'high',constructionMode:'legacy',communityMode:'off'};
 function generate(params={},stream=false){
  const headers={'Content-Type':'application/json'};
  if(stream)headers.Accept='application/x-ndjson';
  return fetch(endpoint,{method:'POST',headers,body:JSON.stringify({...payload,...params})});
 }
 function audit(deck,bracket,power,budget=20){
  assert.equal(deck.bracket,bracket);
  assert.equal(deck.powerTarget,power);
  assert.equal(deck.budget,budget+4);
  assert.equal(deck.budgetPolicy.target,budget);
  assert.equal(deck.budgetPolicy.tolerance,4);
  assert.equal(deck.totalCards,100);
  assert.ok(deck.price<=budget+4);
  assert.equal(deck.pricingAudit.total,deck.price);
  assert.equal(deck.pricingAudit.withinBudget,true);
  assert.equal(deck.pricingAudit.count,100);
  assert.equal(deck.deck.trim().split('\n').length,100);
  assert.match(deck.archidektImport,/Commander/);
 }
 const reply=await generate({},true);
 assert.equal(reply.status,200);
 const events=(await reply.text()).trim().split('\n').map(JSON.parse);
 assert.deepEqual(events.filter(event=>event.type==='progress').map(event=>[event.phase,event.bracket]),[['build',3],['build',4]]);
 assert.equal(events.at(-1).type,'result');
 const {version,results}=events.at(-1).result;
 assert.ok(version);
 assert.deepEqual(results.map(row=>row.bracket),[3,4]);
 assert.ok(results.every(row=>row.deck),results.map(row=>row.error).filter(Boolean).join(" | "));
 audit(results[0].deck,3,'high');
 audit(results[1].deck,4,'balanced');
 assert.equal(results[0].deck.commander,eldrazi.name);
 assert.equal(results[1].deck.commander,eldrazi.name);

 const single=await generate({bracket:3}).then(response=>response.json());
 assert.equal(single.results,undefined);
 assert.equal(single.deck,results[0].deck.deck);
 const second=await generate({commanderId:wizard.id,powerTarget:'balanced'}).then(response=>response.json());
 for(const row of second.results){
  audit(row.deck,row.bracket,'balanced');
  assert.equal(row.deck.commander,wizard.name);
 }
 const partial=await generate({powerTarget:'invalid'}).then(response=>response.json());
 assert.match(partial.results[0].error,/power target/i);
 assert.equal(partial.results[0].deck,undefined);
 audit(partial.results[1].deck,4,'balanced');

 const competitive=await generate({bracket:5,budget:750,powerTarget:'balanced',constructionMode:'strategy-first'});
 const b5=await competitive.json();
 assert.equal(competitive.status,200,b5.error);
 audit(b5,5,'balanced',750);
 assert.equal(b5.landCount,33);
 assert.ok(b5.landCount<results[1].deck.landCount);

 const rankings='http://127.0.0.1:'+port+'/api/cedh/rankings';
 assert.equal((await fetch(rankings).then(response=>response.json())).status,'setup');
 assert.equal((await fetch(rankings,{headers:{Origin:'https://example.org'}})).status,403);
});
