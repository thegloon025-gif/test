/** Reproducible internal benchmarking on an uploaded PUBLIC Scryfall snapshot. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {generateDeck} from '../src/generator.mjs';
import {isCommander} from '../src/cards.mjs';
import {independentlyHasCastableEldrazi,independentlyValidDeckCount} from '../src/benchmarkOracle.mjs';

const source=process.argv[2];
if(!source){console.error('Usage: node tools/run-benchmark.mjs path/to/CommanderOracle-benchmark-cards.json.gz [output-dir]');process.exit(2);}
const output=resolve(process.argv[3]||join(import.meta.dirname,'..','benchmarks','out'));
const bytes=await readFile(resolve(source));
const snapshot=JSON.parse(gunzipSync(bytes).toString('utf8'));
if(snapshot.format!=='CommanderOraclePublicCardBenchmark'||snapshot.schema!==1||!Array.isArray(snapshot.cards)||snapshot.cards.length<10000)throw Error('Unrecognized or incomplete benchmark catalog');
const cards=snapshot.cards;
const cardIndex=new Map(cards.map(c=>[c.name,c]));
const subjects=['Ulalek, Fused Atrocity',"Yuriko, the Tiger's Shadow",'Wilhelt, the Rotcleaver',"Light-Paws, Emperor's Voice",'Krenko, Mob Boss','Zada, Hedron Grinder'];
const selected=process.env.BENCH_COMMANDERS?process.env.BENCH_COMMANDERS.split(';').map(s=>s.trim()).filter(Boolean):subjects;
const budget=Number(process.env.BENCH_BUDGET||191);
if(!Number.isFinite(budget)||budget<=0)throw Error('Invalid BENCH_BUDGET');
await mkdir(output,{recursive:true});
const outputRows=[];
for(const name of selected){
 const commander=cards.find(c=>c.name.toLowerCase()===name.toLowerCase()&&isCommander(c));
 if(!commander){outputRows.push({commander:name,error:'Commander not found in snapshot'});continue;}
 const records=[];
 for(const bracket of [2,3,4]){
  try {
   const began=Date.now();
   const result=generateDeck({cards,commander,budget,bracket});
   const spellNames=new Set(result.sections.spells);
   const eldrazi=result.sections.spells.filter(n=>{const c=cardIndex.get(n);return c&&independentlyHasCastableEldrazi(c);});
   const row={commander:name,bracket,independentDeckCount:independentlyValidDeckCount(result.deck),runtimeMs:Date.now()-began,price:result.price,totalCards:result.totalCards,landCount:result.landCount,earlyAcceleration:result.earlyAcceleration,sevenPlusSpells:result.sevenPlusSpells,gameChangers:result.gameChangers,plan:result.plan,qualityVerdict:result.qualityVerdict,colorlessSources:result.colorlessSources,eldraziSpells:eldrazi.length,needs:result.needs,warnings:result.warnings.filter(x=>!x.startsWith('Budget estimates')&&!x.startsWith('Brackets are')),reinvestments:result.reinvestment?.swaps||[],deck:result.deck,spellSet:[...spellNames]};
   records.push(row);
   await writeFile(join(output,`${name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()}_b${bracket}.txt`),result.deck+'\n');
   console.log(`${name} B${bracket}: €${result.price}, ${result.totalCards} cards, ${result.earlyAcceleration} early ramp, ${eldrazi.length} Eldrazi spells, ${result.qualityVerdict} (${row.runtimeMs} ms)`);
  }catch(e){records.push({commander:name,bracket,error:e.message});console.log(`${name} B${bracket}: ERROR ${e.message}`);}
 }
 for(const row of records){if(row.error)continue; const others=records.filter(x=>x!==row&&!x.error);row.changedSpellCards=Object.fromEntries(others.map(x=>[`B${x.bracket}`,row.spellSet.filter(c=>!x.spellSet.includes(c)).length]));}
 for(const row of records)delete row.spellSet;
 outputRows.push(...records);
}
const compact=outputRows.map(({deck,...rest})=>rest);
await writeFile(join(output,'benchmarks.json'),JSON.stringify({cardCount:cards.length,sourceDate:snapshot.exportedAt,budget,results:outputRows},null,2));
let report=`# CommanderOracle independent real-card benchmark\n\nSource: ${snapshot.cards.length} cached public Scryfall card records, snapshot ${snapshot.exportedAt}. Bracket 2/3/4 at €${budget}.\n\n**Caveat:** The engine's role scores are NOT independent gameplay validation, no full goldfish simulation has been run, and Scryfall EUR is not live Cardmarket English NM.\n\n| Commander | Bracket | Price | Lands | Early ramp | Eldrazi spells | 7+ MV | Verdict |\n|---|---:|---:|---:|---:|---:|---:|---|\n`;
for(const r of outputRows)report+=`| ${r.commander} | ${r.bracket??'-'} | ${r.price??'-'} | ${r.landCount??'-'} | ${r.earlyAcceleration??'-'} | ${r.eldraziSpells??'-'} | ${r.sevenPlusSpells??'-'} | ${r.qualityVerdict||r.error} |\n`;
report+='\n## Warnings and bracket sensitivity\n';
for(const r of outputRows){report+=`\n### ${r.commander} Bracket ${r.bracket}\n`;if(r.error){report+=`ERROR: ${r.error}\n`;continue;}report+=`Plan: ${r.plan}. Changed selected spells vs other brackets: ${JSON.stringify(r.changedSpellCards)}.\nWarnings:\n${r.warnings.length?r.warnings.map(w=>'- '+w).join('\n'):'- None reported (not proof of quality)'}\n`;}
await writeFile(join(output,'BENCHMARK_RESULTS.md'),report);
console.log(`Benchmark outputs saved to ${output}`);
