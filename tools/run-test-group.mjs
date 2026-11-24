// Use explicit files so the same scripts work under cmd.exe and POSIX shells.
import {readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const group=process.argv[2];
if(!['fast','slow','all'].includes(group))throw Error('Choose fast, slow, or all.');
const slow=new Set(['v110-strategy.test.mjs','engine.test.mjs','combo-construction.test.mjs','v089-selection.test.mjs','architect-investment.test.mjs','v100-construction.test.mjs','combined-generation.test.mjs']);
const files=(await readdir(new URL('../tests/',import.meta.url))).sort()
  .filter(f=>f.endsWith('.test.mjs')&&(group==='all'||slow.has(f)===(group==='slow')));
function run(files,timeout=0){
  return new Promise((resolve,reject)=>{
    const args=files.map(f=>'tests/'+f);
    if(!timeout)args.unshift('--test','--test-concurrency=2');
    const child=spawn(process.execPath,args,{stdio:timeout?['inherit','inherit','inherit','ipc']:'inherit',cwd:new URL('../',import.meta.url)});
    let timer;
    function watchdog(label,limit){
      clearTimeout(timer);
      timer=setTimeout(()=>{
        console.error('Wall-clock time limit exceeded: '+label);
        child.kill('SIGKILL');
      },limit);
    }
    if(timeout){
      watchdog(files[0],timeout);
      child.on('message',message=>{
        if(message?.kind==='strategy-case'){
          console.log('Running '+message.name);
          watchdog(message.name,120_000);
        }
      });
    }
    child.once('error',reject);
    child.once('exit',code=>{clearTimeout(timer);resolve(code??1);});
  });
}
if(group!=='slow' && await run(files.filter(f=>!slow.has(f))))process.exitCode=1;
if(group!=='fast'){
  for(const file of files.filter(f=>slow.has(f))){
    console.log('Running '+file);
    if(await run([file],300_000))process.exitCode=1;
  }
}
