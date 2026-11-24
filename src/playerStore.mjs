import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export function playerStore(dir){
  const file=path.join(dir,'player-library-v1.json');
  let queue=Promise.resolve();
  async function read(){
    try{return JSON.parse(await readFile(file,'utf8'));}
    catch(e){if(e.code==='ENOENT')return {versions:[],collection:{enabled:false,rows:[]}};throw e;}
  }
  return {
    async get(){await queue;return read();},
    update(change){
      const result=queue.then(async()=>{
        const state=await read(),value=await change(state);
        await mkdir(dir,{recursive:true});
        const tmp=file+'.'+randomUUID()+'.tmp';
        await writeFile(tmp,JSON.stringify(state));await rename(tmp,file);return value;
      });
      queue=result.catch(()=>{});return result;
    }
  };
}
