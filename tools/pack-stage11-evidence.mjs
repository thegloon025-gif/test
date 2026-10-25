/** Pack generated evidence, never raw catalog, caches or personal deck files.
 * node tools/pack-stage11-evidence.mjs CONFIG_JSON OUT
 * config.groups = {name:{directory,debug,phase,implementation}}.
 * Plain generated exports stay directly importable; ledgers are losslessly packed.
 */
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import path from 'node:path';
const[configFile,out]=process.argv.slice(2),config=JSON.parse(await readFile(configFile)),ledgers={},measurements={},summary=[];
const sha=x=>createHash('sha256').update(x).digest('hex');await mkdir(out,{recursive:true});
for(const[name,group]of Object.entries(config.groups)){
 assert.match(name,/^[a-z0-9-]+$/);const files=await readdir(group.directory),target=path.join(out,name);await mkdir(target,{recursive:true});
 for(const file of files){
  if(file.endsWith('.txt')){const raw=await readFile(path.join(group.directory,file),'utf8');assert.equal(raw.trim().split('\n').length,100,file);await copyFile(path.join(group.directory,file),path.join(target,file));}
  if(file.endsWith('-records.json')){const raw=await readFile(path.join(group.directory,file),'utf8');assert.equal(JSON.parse(raw).records.length,100,file);ledgers[name+'/'+file]={sha256:sha(raw),content:raw};}
 }
 if(files.includes('measurements.json')){const raw=JSON.parse(await readFile(path.join(group.directory,'measurements.json')));measurements[name]={...raw,phase:group.phase,implementation:group.implementation};for(const row of raw.results)summary.push({group:name,phase:group.phase,implementation:group.implementation,...Object.fromEntries(Object.entries(row).filter(([k])=>!['comparison','candidates','roleCounts','discovered'].includes(k))),export:row.export?name+'/'+row.export:undefined});}
 if(files.includes('independent-audit.json'))await copyFile(path.join(group.directory,'independent-audit.json'),path.join(target,'independent-audit.json'));
 if(files.includes('comparison.json')){const c=JSON.parse(await readFile(path.join(group.directory,'comparison.json')));measurements[name]={phase:group.phase,implementation:group.implementation,selected:c.selected,price:c.price,results:c.results,refinement:c.report.packageExpansion,comparison:c.report.comparison,candidates:c.report.candidates.map(r=>({id:r.id,price:r.price,score:r.score,status:r.status,sourceSpells:r.sourceSpells,sourceLands:r.sourceLands,refinementAbstention:r.packageInvestment?.abstention||null,proposedPrice:r.packageInvestment?.proposedPrice??null,lostNativeResources:r.packageInvestment?.abstainedForNativeResources||[],proposedPackages:r.packageInvestment?.proposedPackages||[]})),runtimeMs:c.runtimeMs};}
}
for(const[key,value]of Object.entries({'printing-ledgers.json.gz':ledgers,'measurements.json.gz':measurements})){const zipped=gzipSync(JSON.stringify(value),{level:9});assert.deepEqual(JSON.parse(gunzipSync(zipped)),value);await writeFile(path.join(out,key),zipped);}
await writeFile(path.join(out,'summary.json'),JSON.stringify({schema:1,groups:config.groups,results:summary,primaryMeasurements:summary.length,archivedSelectedPrintingSlots:Object.keys(ledgers).length*100,limitations:'Generated outputs only. Original catalog, research and private references are not redistributed. Match input hashes for exact reproduction; runtime is under concurrent cloud load, not a controlled speed comparison.'},null,2)+'\n');
const hashes={};async function walk(dir,prefix=''){for(const item of await readdir(dir,{withFileTypes:true})){const key=prefix+item.name;if(item.isDirectory())await walk(path.join(dir,item.name),key+'/');else if(key!=='sha256.json')hashes[key]=sha(await readFile(path.join(dir,item.name)));}}await walk(out);await writeFile(path.join(out,'sha256.json'),JSON.stringify(hashes,null,2)+'\n');console.log({primaryMeasurements:summary.length,ledgerFiles:Object.keys(ledgers).length,files:Object.keys(hashes).length});
