/** Text-only research disclosures shared with tests; no source HTML is rendered. */
export function researchSummary(a,{now=()=>Date.now()}={}){
 const d=a.discovery||{},lines=[],age=r=>{const stamp=Date.parse(r.fetchedAt),elapsed=Number.isFinite(stamp)&&now()>=stamp?now()-stamp:null;const ms=elapsed===null?r.cacheAgeMs:Math.max(elapsed,r.cacheAgeMs||0);return Number.isFinite(ms)?Math.floor(ms/60000)+' min old':'age unknown';};
 lines.push('Archidekt: '+(d.status||'not-attempted')+' · '+(a.matchingSaved??'unknown')+' saved bracket-matched sources · '+(d.added||0)+' newly saved · '+(d.unknownBracket??'unknown')+' unlabeled previews excluded'+(d.truncated?' · bounded/truncated':'')+' · '+age(d));
 for(const source of d.structuralExamples||[])lines.push('Research source screening: '+source.title+' · structure '+(source.score??'unknown')+' / 100 · early ramp '+(source.earlyRamp??'unknown')+' (heuristic, not power).');
 for(const [label,r]of [['Commander-containing Spellbook candidates',a.commanderLookup],['Other color-compatible Spellbook candidates',a.colorLookup]]){
  const value=r||{status:'not-attempted'};lines.push(label+': '+value.status+' · '+(value.variants??'unknown')+' retrieved'+(value.total==null?' · total unknown':' / '+value.total+' query results')+(value.truncated?' · bounded/truncated':'')+(value.partial?' · incomplete response':'')+(value.fromCache?' · cached':'')+(value.stale?' · refresh failed; stale fallback':'')+' · '+age(value));
  if(label.startsWith('Other color'))lines.push('Other color-compatible candidates are advisory; they do not enter automatic combo packages.');
  if(value.fetchedAt)lines.push(label+' retrieved: '+value.fetchedAt+(value.query?' · query '+value.query:''));
  if(value.error)lines.push(label+' unavailable/partial: '+value.error+'; saved combo knowledge retained.');
 }
 const c=a.combos||{};lines.push('Spellbook source-deck inventory check: '+(c.status||'not-attempted')+(c.checkedSources?' · '+c.complete+' complete inventory matches in '+c.checkedSources+' source deck':' · no source deck checked')+'. Inventory is not executable timing or a win.');
 if(d.error)lines.push('Archidekt unavailable: '+d.error+'; saved sources/local cards retained.');
 for(const e of d.errors||[])lines.push('Archidekt partial research: '+e);
 for(const s of d.searches||[])lines.push('Archidekt title query: '+(s.query||'unknown')+' · '+(s.fromCache?'cached':'online')+' · '+(s.fetchedAt||'retrieval date unknown'));
 if(a.scryfall)lines.push('Scryfall: '+a.scryfall.status+' · '+a.scryfall.records+' local records · exact selected-printing final price audit; estimates are not verified English NM offers.');
 lines.push('Research coverage is bounded. Retrieved candidates do not certify deck inclusion, execution, strength or official bracket compliance.');
 return lines;
}
