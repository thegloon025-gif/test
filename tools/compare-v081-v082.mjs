/** Compare actual cached Scryfall snapshot outputs; never populate cards from guesses. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {generateDeck as oldGenerate} from '../benchmarks/generator-v081-reference.mjs';
import {generateDeck as newGenerate} from '../src/generator.mjs';
import {readComboLibrary} from '../src/comboLibrary.mjs';
import {isCommander,legalFor,isLandSlot,oracleId,priceOf} from '../src/cards.mjs';
const input=process.argv[2];
if(!input){console.error('Usage: node tools/compare-v081-v082.mjs benchmarks/cards.json.gz [output-dir]');process.exit(2);}
const raw=await readFile(resolve(input)),snapshot=JSON.parse(gunzipSync(raw).toString('utf8'));
if(snapshot.format!=='CommanderOraclePublicCardBenchmark'||snapshot.schema!==1||!Array.isArray(snapshot.cards)||snapshot.cards.length<10000)throw Error('Real cached Scryfall benchmark export required (10,000+ cards).');
const names=['Ulalek, Fused Atrocity',"Yuriko, the Tiger's Shadow",'Wilhelt, the Rotcleaver',"Light-Paws, Emperor's Voice"];
const library=await readComboLibrary();const out=resolve(process.argv[3]||'benchmarks/v082-comparison');await mkdir(out,{recursive:true});
const report=[];
for(const name of names){
 const commander=snapshot.cards.find(c=>c.name===name&&isCommander(c));
 if(!commander){report.push({name,error:'commander missing'});continue;}
 for(const b of (name.startsWith('Ulalek')?[3]:[2,3,4])){
  const base=oldGenerate({cards:snapshot.cards,commander,budget:191,bracket:b});
  const current=newGenerate({cards:snapshot.cards,commander,budget:191,bracket:b,comboVariants:library.find(x=>x.commanderId===oracleId(commander))?.variants||[]});
  const inspect=d=>{
   const lines=d.deck.split(/\r?\n/).filter(Boolean);
   const cardByName=new Map(snapshot.cards.map(c=>[c.name,c]));
   const errors=[];const seen=new Set();let total=0;
   for(const line of lines){const m=line.match(/^(\d+) (.+?)(?: \*CMDR\*)?$/);if(!m){errors.push('bad line '+line);continue;}const c=cardByName.get(m[2]);total+=Number(m[1]);if(!c){errors.push('unknown card '+m[2]);continue;}if(!line.endsWith('*CMDR*')&&!legalFor(c,commander))errors.push('illegal '+c.name);if(seen.has(c.name)&&!/^Basic Land/.test(c.type_line))errors.push('duplicate nonbasic '+c.name);seen.add(c.name);}
   if(total!==100)errors.push('wrong size: '+total);
   if(d.price>191)errors.push('budget overrun');
   return {errors,price:d.price,lands:d.landCount,earlyAcceleration:d.earlyAcceleration,colorless:d.colorlessSources,sevenPlus:d.sevenPlusSpells,quality:d.qualityVerdict,comboPlan:d.comboPlan};
  };
  const row={name,bracket:b,v081:inspect(base),v082:inspect(current),changedSpells:current.sections.spells.filter(x=>!base.sections.spells.includes(x))};
  report.push(row);
  await writeFile(join(out,name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+`_b${b}_v081.txt`),base.deck+'\n');
  await writeFile(join(out,name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+`_b${b}_v082.txt`),current.deck+'\n');
  console.log(name,'B'+b,'v081/v082',row.v081.price,row.v082.price,'errors',row.v081.errors.length,row.v082.errors.length,'changed',row.changedSpells.length);
 }
}
await writeFile(join(out,'results.json'),JSON.stringify({snapshotDate:snapshot.exportedAt,cards:snapshot.cards.length,source:'cached public Scryfall (not EN/NM verified)',results:report},null,2));
console.log('Wrote',out);
