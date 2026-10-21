/** One-time export of PUBLIC cached Scryfall card metadata. No secrets or user files. */
import {readFile,writeFile,stat} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';

const here=dirname(fileURLToPath(import.meta.url));
const roots=[resolve(here,'..'),here];
let root, source;
for(const dir of roots){const candidate=join(dir,'data','cards.json');try{await stat(candidate);root=dir;source=candidate;break;}catch{}}
if(!source){console.error('Cannot find data/cards.json. Place this file beside server.mjs (or in its tools/ folder) inside your already-synced CommanderOracle installation.');process.exitCode=1;}
else {
 const raw=JSON.parse(await readFile(source,'utf8'));
 if(!Array.isArray(raw)||raw.length<10000)throw Error('Local catalog is absent or incomplete. Do not export a partial catalog.');
 const keep=['id','name','layout','type_line','card_faces','oracle_text','mana_cost','cmc','color_identity','produced_mana','legalities','prices','edhrec_rank','game_changer','power','keywords'];
 const cards=raw.map(c=>Object.fromEntries(keep.filter(k=>c[k]!==undefined).map(k=>[k,c[k]])));
 const payload={format:'CommanderOraclePublicCardBenchmark',schema:1,source:'Cached public Scryfall card metadata; NOT Cardmarket offers',exportedAt:new Date().toISOString(),cards};
 const bytes=gzipSync(Buffer.from(JSON.stringify(payload)),{level:9});
 const outfile=join(root,'CommanderOracle-benchmark-cards.json.gz');
 await writeFile(outfile,bytes);
 const original=(await stat(source)).size;
 console.log(`Exported ${cards.length.toLocaleString()} public cards.`);
 console.log(`Size: ${(bytes.length/1048576).toFixed(2)} MB (from ${(original/1048576).toFixed(2)} MB).`);
 console.log(`UPLOAD THIS FILE ONCE: ${outfile}`);
 console.log('Contains only Scryfall public card metadata and prices; no app settings, API keys or personal data.');
}
