/** Independent receipt/printing/price arithmetic over frozen full-deck outputs.
 * node tools/audit-stage11-benchmarks.mjs CATALOG COMMUNITY LIBRARY OUT DEBUG
 * Policy helper is reused explicitly; arithmetic/identity checks are recomputed.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {conservativeComboViolation} from '../src/strategyFirst.mjs';
const[catalogFile,communityFile,libraryFile,out,debug]=process.argv.slice(2),load=async f=>JSON.parse(await readFile(f));
const catalog=await load(catalogFile),raw=await load(communityFile),decks=raw.decks||raw,lib=await load(libraryFile),library=lib.entries||lib;
const norm=s=>s.normalize('NFKC').trim().toLowerCase(),name=c=>{const ns=String(c.name).split(/\s*\/\/\s*/);return ns.length===2&&norm(ns[0])===norm(ns[1])?ns[0]:c.name;};
const basic=c=>/^Basic\b/.test(c.card_faces?.[0]?.type_line||c.type_line||''),value=c=>basic(c)?0:c.prices?.eur;
const byId=new Map(catalog.map(c=>[c.oracle_id||c.id,c])),measurement=await load(path.join(out,'measurements.json'));
let slots=0,alternatives=0,sourceSpines=0,comboCommitments=0;const errors=[];
function validate(cards,commander,total,cap,bracket,sourceKey,commitments=[]){
 assert.equal(cards.length,100);assert.equal(cards[0].oracle_id||cards[0].id,commander.oracle_id||commander.id);
 const counts=new Map();for(const c of cards){const key=norm(name(c));counts.set(key,(counts.get(key)||0)+1);if(!basic(c))assert.equal(counts.get(key),1,'singleton '+key);assert.ok(c.color_identity.every(x=>commander.color_identity.includes(x)));assert.equal(c.legalities.commander,'legal');assert.equal(c.printing.eligibleVersion,2);assert.ok(Number.isFinite(value(c)));}
 const cents=cards.reduce((n,c)=>n+Math.round(value(c)*100),0);assert.equal(cents,Math.round(total*100));assert.ok(cents<=Math.round(cap*100));
 assert.ok(cards.filter(c=>c.game_changer).length<=(bracket===3?3:bracket===2?0:100));
 if(sourceKey){const source=decks.find(d=>d.key===sourceKey);assert.ok(source?.validated);assert.ok(source.commanderIds.includes(commander.oracle_id||commander.id));assert.equal(Number(source.edhBracket),bracket);const ids=new Set(source.mainboard.map(x=>String(x.id)));assert.ok(cards.slice(1).filter(c=>!String(c.type_line).includes('Land')&&ids.has(String(c.oracle_id||c.id))).length>=20);sourceSpines++;}
 const names=new Set(cards.map(c=>norm(name(c))));for(const p of commitments)for(const n of [...(p.namedCards||p.cards||[]),...(p.added||[])]){assert.ok(names.has(norm(name({name:n}))),'lost commitment '+n);comboCommitments++;}
 assert.equal(conservativeComboViolation(cards.slice(1),commander,library.find(x=>x.commanderId===(commander.oracle_id||commander.id))?.variants||[],bracket),null);
}
for(const row of measurement.results){if(row.status!=='ok'){errors.push({id:row.id,status:row.status,error:row.error});continue;}
 const records=await load(path.join(out,row.id+'-records.json')),response=await load(path.join(debug,row.id+'.json'));
 const selected=records.records.map(r=>{const c=byId.get(r.id);assert.ok(c);assert.equal(name(c),r.name);assert.equal(value(c),r.price);assert.deepEqual(c.printing,r.printing);slots++;return c;});
 validate(selected,selected[0],records.price,row.effectiveMaximum,row.bracket,response.constructionEngine.selectedSource,response.comboPlan.selected);
 const text=await readFile(path.join(out,row.id+'.txt'),'utf8');assert.equal(text,'1x '+name(selected[0])+' [Commander]\n'+selected.slice(1).map(c=>'1x '+name(c)).join('\n')+'\n');
 for(const alt of response.alternatives||[]){
  const physical=alt.pricingAudit.cards.map(r=>{const matches=catalog.filter(c=>name(c)===r.card&&value(c)===r.price&&JSON.stringify(c.printing)===JSON.stringify(r.printing));assert.ok(matches.length,'no physical printing '+r.card);return matches[0];});
  validate(physical,selected[0],alt.price,row.effectiveMaximum,row.bracket,alt.sourceKey,alt.committedCombos);assert.equal(alt.deck.split('\n').length,100);const exported=alt.deck.split('\n').map(x=>x.replace(/^1 /,'').replace(/ \*CMDR\*$/,''));assert.deepEqual(exported,physical.map(name));alternatives++;
 }
}
const report={implementation:'independent receipt arithmetic and catalog identity/printing reconstruction; existing standard combo-policy helper reused',primaryDecks:measurement.results.filter(x=>x.status==='ok').length,primaryPrintingSlots:slots,alternativeReceiptsAudited:alternatives,sourceSpines,commitmentMembershipChecks:comboCommitments,failedOrUnverifiedJobs:errors,inputs:measurement.inputs,catalogSHA256:createHash('sha256').update(await readFile(catalogFile)).digest('hex'),limitations:'Alternative physical records reconstructed from full name/price/printing equality, not independently retained selected IDs; indistinguishable duplicate catalog records remain possible. No strength, executable combo, mana sequencing or official bracket certification.'};
await writeFile(path.join(out,'independent-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
