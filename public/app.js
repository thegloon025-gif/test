import {researchSummary} from './research.js';
function appendComboExecutionAudit(audit,parent){
 if(!audit?.combinations?.length)return;
 const panel=document.createElement('details'),title=document.createElement('summary');
 title.textContent='Combo execution requirements — timing unknown';panel.append(title);
 const note=document.createElement('p');note.textContent='Inventory is not execution. Starting zones, setup, payment and an available win outlet still need review. No reliable turn or pod-policy classification is established.';panel.append(note);
 for(const row of audit.combinations.filter(c=>c.inventoryComplete)){
  const detail=document.createElement('details'),label=document.createElement('summary');
  label.textContent=`${row.id}: ${row.requirements.map(r=>r.name).join(' + ')}`;detail.append(label);
  const text=document.createElement('p');text.textContent=`Starting mana recorded by Spellbook: ${row.initialMana.spellbook||'not specified (not assumed free)'}. Deployment costs are additional. Commander required: ${row.commanderRequired?'yes':'no'}.`;detail.append(text);
  const requirements=document.createElement('ul');
  for(const r of row.requirements){const item=document.createElement('li');item.textContent=`${r.quantity} × ${r.name}: ${r.startingZones.map(z=>z.name).join(' / ')||'starting zone unspecified'}; ${[r.battlefieldCardState,r.exileCardState,r.libraryCardState,r.graveyardCardState].filter(Boolean).join('; ')||'state not specified'}`;requirements.append(item);
   for(const warning of r.setupWarnings){const extra=document.createElement('li');extra.textContent=`Setup required for ${warning.face}: ${warning.setupOracle}`;requirements.append(extra);}}
  for(const r of row.templates){const item=document.createElement('li');item.textContent=`Additional template: ${r.quantity} × ${r.name}, starting ${r.startingZones.map(z=>z.name).join(' / ')||'zone unspecified'}. Inventory matches: ${row.templateInventory.matches.join(', ')}.`;requirements.append(item);}
  for(const requirement of row.prerequisites){const item=document.createElement('li');item.textContent=requirement;requirements.append(item);}detail.append(requirements);
  const actions=document.createElement('ol');for(const action of row.actions){const item=document.createElement('li');item.textContent=action.text;actions.append(item);}detail.append(actions);
  const result=document.createElement('p');result.textContent=`Recorded outcomes: ${row.outcomes.map(r=>r.text).join('; ')}. Win conversion is not verified; infinite mana or tokens still need usable outlets and their additional resources.`;detail.append(result);panel.append(detail);
 }
 parent.append(panel);
}
const $=id=>document.getElementById(id);
const APP_VERSION='1.1.5';
let selected=null,lastDeck=null,poll=null,searchSeq=0,regeneration=null,originalBudget=null;
async function pricingStatus(){try{const s=await get('/api/pricing/status');$('cm-status').textContent=s.cardmarket.available?`${s.cardmarket.matchedCards.toLocaleString()} priced cards · imported ${new Date(s.cardmarket.importedAt).toLocaleString()} · coverage ${s.cardmarket.coverage.priced.toLocaleString()}/${s.cardmarket.coverage.total.toLocaleString()}`:'No Cardmarket offers imported yet.';}catch(e){$('cm-status').textContent=e.message;}}
$('pricing-mode').addEventListener('change',()=>{const mode=$('pricing-mode').value,cm=mode==='cardmarket_en_nm';$('cm-import').hidden=!cm;$('pricing-description').textContent=cm?'Imported English NM/Mint offer snapshot; never silently falls back to Scryfall.':mode==='estimated_en_nm'?'Model-calculated EN NM purchasing estimate from Scryfall EUR. NOT live Cardmarket pricing, stock, or a verified quote.':'Automatic eligible-printing Scryfall EUR estimate; not guaranteed English Near Mint or current Cardmarket stock.';pricingStatus();});
$('cm-import-btn').addEventListener('click',async()=>{const file=$('cm-file').files?.[0];if(!file){notice('Choose a Cardmarket listing CSV first.');return;}if(file.size>5_000_000){notice('Cardmarket CSV is larger than 5 MB.');return;}notice('Filtering imported offers to English NM/Mint…');$('cm-import-btn').disabled=true;try{const data=await post('/api/pricing/import',{csv:await file.text()});notice(`Imported ${data.matchedCards} matching card prices. EN/NM or better only. This is a snapshot, not live verified.`);await pricingStatus();}catch(e){notice(e.message);}finally{$('cm-import-btn').disabled=false;}});
pricingStatus();
async function get(url){const r=await fetch(url);const data=await r.json();if(!r.ok)throw Error(data.error||r.statusText);return data;}
async function post(url,payload){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw Error(data.error||r.statusText);return data;}
function notice(s){$('action-message').textContent=s;}
let communityBuildSeq=0;
async function refreshCommunityBuildOptions(){
 const seq=++communityBuildSeq,choice=$('community-strategy');choice.replaceChildren();
 const generic=document.createElement('option');generic.value='auto';generic.textContent='Automatic: best supported package';choice.append(generic);
 if(!selected){$('community-build-status').textContent='Select a commander to inspect local research.';return;}
 try{
  const r=await get(`/api/community/build-options?commanderId=${encodeURIComponent(selected.id)}&bracket=${encodeURIComponent($('bracket').value)}`);
  if(seq!==communityBuildSeq)return;
  for(const item of r.candidates||[]){const opt=document.createElement('option');opt.value=item.id;opt.textContent=`${item.label} (${item.sourceCount} source lists)`;choice.append(opt);}
  $('community-build-status').textContent=r.status==='ready'?`${r.sampleSize} distinct validated lists. ${r.highConfidence?'Moderate':'Exploratory'} evidence; ${r.candidates.length} coherent research seed(s) available. Source patterns are not proven power.`:r.reason;
 }catch(e){if(seq===communityBuildSeq)$('community-build-status').textContent=e.message;}
}
$('community-mode').addEventListener('change',()=>{$('community-strategy').disabled=$('community-mode').value==='off';});

async function status(){try{const s=await get('/api/status');if(s.version!==APP_VERSION){$('catalog-status').textContent=`Version mismatch: server ${s.version||'older than v1.1.5'}, page ${APP_VERSION}. Close old CommanderOracle server windows, restart this release, and hard-refresh.`;$('generate').disabled=true;return s;}$('catalog-status').textContent=s.count?`${s.count.toLocaleString()} cards • ${s.metadata?.savedAt?new Date(s.metadata.savedAt).toLocaleDateString():'local cache'}${s.printingAudit?.audited?' • pricing printings screened':' • RE-SYNC FOR PRINTING PRICE CHECK'}`:s.syncing?'Downloading Scryfall catalog…':'No catalog installed';$('status-dot').className='dot'+(s.count?' ready':'');$('sync').disabled=s.syncing;
 if(s.syncing){$('progress').hidden=false;const p=s.update;const percent=p.totalBytes?Math.min(100,Math.round(100*p.bytes/p.totalBytes)):0;$('progress-bar').style.width=percent+'%';$('sync-note').textContent=`${p.phase||'working'} • ${p.bytes?Math.round(p.bytes/1024/1024)+' MB':'waiting'} • ${p.parsed||0} cards parsed`;}else {$('progress').hidden=true;$('sync-note').textContent=s.update?.error||'Scryfall data is cached locally; refresh when prices or legalities change.';}
 $('generate').disabled=!selected||!s.count;return s;
 }catch(e){$('catalog-status').textContent='Server unavailable';$('sync-note').textContent=e.message;}}
$('sync').addEventListener('click',async()=>{notice('');try{await post('/api/sync',{});await status();if(poll)clearInterval(poll);poll=setInterval(async()=>{const s=await status();if(!s?.syncing){clearInterval(poll);poll=null;}},1000);}catch(e){notice(e.message);}});
let debounce=null;$('search').addEventListener('input',()=>{clearTimeout(debounce);const q=$('search').value.trim();if(q.length<2){$('results').replaceChildren();return;}debounce=setTimeout(()=>search(q),320);});
async function search(q){const seq=++searchSeq;try{const cards=await get('/api/commanders?q='+encodeURIComponent(q));if(seq!==searchSeq)return;const list=$('results');list.replaceChildren();for(const card of cards){const btn=document.createElement('button');btn.className='search-item';const n=document.createElement('span');n.textContent=card.name;const small=document.createElement('small');small.textContent=(card.color_identity||[]).join('')||'Colorless';btn.append(n,small);btn.addEventListener('click',()=>{selected=card;$('commander-name').textContent=card.name;$('commander-meta').textContent=`Identity: ${(card.color_identity||[]).join('')||'C'} • Estimated €${card.price??'unknown'}`;$('commander-image').src=card.image_url||'';$('selected').hidden=false;$('results').replaceChildren();$('search').value=card.name;notice('');status();refreshCommunityBuildOptions();});list.append(btn);}if(!cards.length)list.textContent='No matches. Try a shorter commander name.';}catch(e){if(seq===searchSeq)notice(e.message);}}
$('bracket').addEventListener('change',()=>{const onlyThree=$('bracket').value==='3';$('power-target').disabled=!onlyThree;$('power-target').value=onlyThree?'high':'balanced';refreshCommunityBuildOptions();});
$('generate').addEventListener('click',async()=>{if(!selected)return;const pending=regeneration;regeneration=null;const previousDeck=lastDeck;if(!pending)originalBudget=Number($('budget').value);const autoResearch=$('research-on-generate').checked&&$('community-mode').value!=='off';notice(autoResearch?'Researching this commander on Archidekt and Spellbook, then building… This may take a few minutes.':'Generating locally…');$('generate').disabled=true;try{const r=await post('/api/generate',{commanderId:selected.id,budget:Number($('budget').value),bracket:Number($('bracket').value),powerTarget:$('power-target').value,pricingMode:$('pricing-mode').value,constructionMode:$('construction-engine').value,communityMode:$('community-mode').value,communityStrategy:$('community-strategy').value,autoResearch});if(r.version!==APP_VERSION)throw Error(`Generator version mismatch (expected ${APP_VERSION}, got ${r.version||'unknown'}). Restart the correct local server.`);lastDeck=r;render(r);if(pending&&previousDeck)showRegenerationComparison(previousDeck,r,pending);notice([r.automaticResearch?.discovery,r.automaticResearch?.commanderLookup,r.automaticResearch?.colorLookup,r.automaticResearch?.combos].some(c=>['unavailable','partial','cached-fallback'].includes(c?.status))?'Some online research was unavailable or incomplete; saved evidence/local fallback was retained. See research details.':'');}catch(e){notice(e.message);}finally{status();}});
function render(r){$('empty').hidden=true;$('deck-result').hidden=false;$('deck-price').textContent=`€${r.price.toFixed(2)}`;renderPriceLedger(r);$('comparison-result').textContent='';$('previous-deck').hidden=true;updateBudgetPreview();$('price-source').textContent=`Pricing: ${r.pricing?.label||'Scryfall EUR estimate'} · ${r.pricing?.updatedAt?new Date(r.pricing.updatedAt).toLocaleDateString():'date unknown'} · no shipping`;$('deck-count').textContent=r.totalCards;$('deck-lands').textContent=r.landCount;$('deck-colorless').textContent=r.colorlessSources;$('plan-title').textContent=r.plan;$('verdict').textContent=r.qualityVerdict;$('verdict').className='verdict'+(r.warnings.some(w=>w.includes(': ')&&!w.includes('Budget'))||r.qualityVerdict.includes('INCOMPLETE')?' problem':'');$('checks').replaceChildren();if(r.edhrecKnowledge){
 const k=r.edhrecKnowledge,el=document.createElement('span');el.className='check';
 el.textContent=k.status==='local-import'
 ? 'Local EDHREC JSON: '+k.cardCount+' distinct recommendations, '+k.categories.length+' overlapping category groups · imported '+k.importedAt+' ('+(k.ageHours??'unknown')+' hours since local import) · advisory only, not a power or bracket assessment.'
 : k.status==='not-imported'?'Local EDHREC JSON: not imported; no online EDHREC fetch performed.'
 : 'Local EDHREC JSON: unavailable ('+(k.error||'invalid cache')+'); other research and generation unaffected.';
 $('checks').append(el);
 if(k.status==='local-import'&&k.topCards?.length){const p=document.createElement('span');p.className='check';
  p.textContent='Imported recommendation examples: '+k.topCards.slice(0,5).map(x=>x.name+(x.synergy!=null?' (synergy '+Math.round(x.synergy*100)+'pp)':'')).join(', ')+'. Inclusion is observational, not independent combo execution.';
  $('checks').append(p);}
}if(r.automaticResearch){for(const message of researchSummary(r.automaticResearch)){const e=document.createElement('span');e.className='check';e.textContent=message;$('checks').append(e);}}for(const q of r.needs){const x=document.createElement('span');x.className='check'+(q.actual<q.target?' missing':'');x.textContent=`${q.label}: ${q.actual}/${q.target}`;$('checks').append(x);}if(r.earlyAcceleration!==undefined){const x=document.createElement('span');x.className='check';x.textContent=`Early mana acceleration: ${r.earlyAcceleration}`;$('checks').append(x);const y=document.createElement('span');y.className='check';y.textContent=`Mana value ≥5: ${r.highManaValueSpells} · ≥7: ${r.sevenPlusSpells}`;$('checks').append(y);}if(r.communityConstruction){const q=r.communityConstruction;const x=document.createElement('span');x.className='check';x.textContent=q.mode==='community-informed'?`Community construction: ${q.strategyLabel} · ${q.newCardCount||0} newly seeded cards · ${q.committedPackages.length} atomic packages · ${q.sourceDecks.length} attributed source decks · ${q.highConfidence?'moderate evidence':'exploratory evidence'} (NOT power proof)`:`Community construction: local-only (${q.evidence||r.communityKnowledge?.reason||'insufficient eligible evidence'})`;$('checks').append(x);for(const pkg of q.committedPackages){const y=document.createElement('span');y.className='check';y.textContent=`Source-supported package: ${pkg.cards.join(' + ')} · ${pkg.observedDecks} observed lists · not playtest certified`;$('checks').append(y);}if(q.added.length){const z=document.createElement('span');z.className='check';z.textContent=`Community-seeded: ${q.added.join(', ')}`;$('checks').append(z);}if(q.sourceDecks?.length){const sources=document.createElement('span');sources.className='check';sources.textContent=`Community sources: ${q.sourceDecks.join(', ')} · co-occurrence, not game results`;$('checks').append(sources);}if(q.skipped?.length){const skipped=document.createElement('span');skipped.className='check';skipped.textContent=`Community candidates skipped (${q.skipped.length}): ${q.skipped.slice(0,5).map(s=>s.label+': '+s.reason).join('; ')}`;$('checks').append(skipped);}}if(r.constructionEngine){const e=r.constructionEngine;const p=document.createElement('span');p.className='check';p.textContent=`Construction engine: ${e.mode} · selected ${e.selected} · ${e.complete??0}/${e.generated??0} full candidates · ${e.distinct??0} distinct · local score ${e.legacyScore??'n/a'} (legacy) → ${e.selectedScore??'n/a'} (selected). ${e.reason||''} (NOT verified game power)`;$('checks').append(p);if(e.adaptedSourceSpells){const l=document.createElement('span');l.className='check';l.textContent=`Adapted full source structure: ${e.adaptedSourceSpells} spells + ${e.adaptedSourceLands} lands from ${e.selectedSource}`;$('checks').append(l);}}if(r.packageInvestment?.accepted?.length){for(const p of r.packageInvestment.accepted){const x=document.createElement('span');x.className='check';x.textContent=`Coordinated upgrade: ${p.cuts.join(' + ')} → ${p.adds.join(' + ')} · estimated change €${p.extraCost.toFixed(2)}`;$('checks').append(x);}}if(r.budgetInvestment){const b=r.budgetInvestment;const e=document.createElement('span');e.className='check';e.textContent=`Budget investment: €${b.startingPrice.toFixed(2)} → €${b.finalPrice.toFixed(2)} / €${b.ceiling.toFixed(2)} · ${b.swaps.length} on-strategy upgrades · €${b.remaining.toFixed(2)} unspent (never forced). Not a verified Cardmarket cart.`;$('checks').append(e);for(const change of b.swaps.slice(0,8)){const line=document.createElement('span');line.className='check';line.textContent=`Budget investment swap: ${change.out} → ${change.in} (+€${change.extraCost.toFixed(2)}, heuristic gain ${change.qualityGain})`;$('checks').append(line);}}if(r.reinvestment){const z=document.createElement('span');z.className='check';z.textContent=`Budget improvements: ${r.reinvestment.swaps.length} swaps (€${r.reinvestment.spentBefore.toFixed(2)} → €${r.reinvestment.spentAfter.toFixed(2)})`;$('checks').append(z);}if(r.wholeDeckOptimization){const q=r.wholeDeckOptimization;const w=document.createElement('span');w.className='check';w.textContent=`Whole-deck search: ${q.candidates.length} profiles (${q.distinctCandidates} distinct decks) · ${q.selected} chosen · ${q.swaps.length} legal swaps · internal heuristic ${q.baselineScore.toFixed(1)} → ${q.selectedScore.toFixed(1)} (NOT external power)`;$('checks').append(w);for(const change of q.swaps){const item=document.createElement('span');item.className='check';item.textContent=`Whole-deck improvement: ${change.out} → ${change.in} (heuristic +${change.scoreGain})`;$('checks').append(item);}}if(r.manaOptimization){const q=r.manaOptimization;const w=document.createElement('span');w.className='check';w.textContent=`Mana-base review: ${q.swaps.length} land swap(s) · demand-aware land score ${q.baselineScore} → ${q.selectedScore} (NOT castability proof)`;$('checks').append(w);for(const change of q.swaps){const item=document.createElement('span');item.className='check';item.textContent=`Land replacement: ${change.out} → ${change.in}`;$('checks').append(item);}}if(r.comboPlan){const x=document.createElement('span');x.className='check';x.textContent=`Spellbook offline knowledge: ${r.comboPlan.knownVariants} variants · ${r.comboPlan.selected.length} optional package(s) added · ${r.comboPlan.inventoryComplete} inventory-complete (${r.comboPlan.inventoryInfinite} infinite outcomes; execution NOT verified)`;$('checks').append(x);for(const pkg of r.comboPlan.selected){const y=document.createElement('span');y.className='check';y.textContent=`Combo ${pkg.id}: ${pkg.namedCards?.join(', ')||pkg.added.join(', ')} · ${pkg.results?.slice(0,2).join(', ')||'Spellbook documented outcome'} · ${pkg.added.length?'added '+pkg.added.join(', '):'no new pieces needed'} · ${pkg.templateMatches?.length?'template: '+pkg.templateMatches.map(x=>x.card).join(', ')+' · ':''}prerequisite review required`;$('checks').append(y);}for(const v of (r.comboPlan.inventoryCombinations||[])){const y=document.createElement('span');y.className='check';y.textContent=`Inventory match ${v.id}: ${v.namedCards?.join(', ')||'unnamed combination'} · ${v.templateMatches?.length?'template '+v.templateMatches.join(', ')+' · ':''}${v.results?.slice(0,2).join(', ')||'Spellbook outcome'} · execution prerequisites NOT verified`;$('checks').append(y);}}appendComboExecutionAudit(r.comboPlan?.executionAudit,$('checks'));if(r.comboPlan?.network?.packagesCommitted){const n=r.comboPlan.network;const net=document.createElement('span');net.className='check';net.textContent=`Combo network: ${n.packagesCommitted} planned packages · ${n.newCards} new card(s) · ${n.completeEligibleNetworks} eligible inventory-complete networks (execution NOT verified)`;$('checks').append(net);}if(r.coloredMana){for(const [color,count] of Object.entries(r.coloredMana.sources||{})){const pips=r.coloredMana.demand?.[color]||0;if(!pips)continue;const x=document.createElement('span');x.className='check';x.textContent=`${color}: ${count} sources · ${pips} mana symbols`; $('checks').append(x);}}
const quality=$('quality-audit');quality.replaceChildren();
if(r.tempoEvidence){const t=r.tempoEvidence;const x=document.createElement('p');x.textContent=`v1.1.5 timing evidence: efficient ≤2-MV repeatable ramp ${t.efficientRamp} · 3-MV ramp ${t.threeManaRamp} · Spawn/Scion/Treasure bursts ${t.burstSources} · weighted draw access ${t.weightedCardFlow.toFixed(2)} · 7+ MV spells ${t.sevenPlusSpells} · heavy-curve acceleration gap ${t.heavyCurveAccelerationGap}. Non-simulated heuristics, not real turn-by-turn castability.`;$('quality-audit').append(x);}
if(r.selectionAudit){const a=r.selectionAudit,t=a.totals,l=a.limits;const p=document.createElement('p');p.textContent=`Selection safeguards: ${t.instants} instant(s)${Number.isFinite(l.maxInstants)?'/'+l.maxInstants:''} · ${t.counters} counter(s)${Number.isFinite(l.maxCounters)?'/'+l.maxCounters:''} · ${t.narrow} narrow counter(s)${Number.isFinite(l.maxNarrow)?'/'+l.maxNarrow:''} · ${t.cardAdvantage} loose card-advantage candidates (not verified) · ${t.snowDependent} spells requiring snow mana. ${a.castabilityIssues.length?'CASTABILITY ISSUES: '+a.castabilityIssues.map(x=>x.card+': '+x.issue).join('; '):'No unsupported snow costs found.'} (Heuristic, not complete rules verification)`;quality.append(p);}

if(r.roleAudit){const e=r.roleAudit,c=e.counts;const p=document.createElement('p');p.textContent=`Strict role evidence: ${c.positiveDraw} directly positive draw · ${c.conditionalDraw} conditional draw engines · ${c.cantrips} cantrips/uncertain draw · ${c.broadAnswers} broad answers · ${c.conditionalAnswers} conditional answers · ${c.dedicatedShields} dedicated shields. These are text-evidence classifications, not game simulation.`;quality.append(p);for(const x of e.unsupported.slice(0,8)){const line=document.createElement('p');line.textContent=`Dependency review: ${x.card} — ${x.reasons.join('; ')}`;quality.append(line);}}if(r.highPowerAudit){const h=r.highPowerAudit;const hp=document.createElement('p');hp.textContent=`${r.bracket===4?'Optimized B4':'High B3'} goals (not certification): efficient ≤2-MV ramp ${h.efficientMana}/${h.targets.efficientMana} · dedicated shields ${h.directShield}/${h.targets.directShield} · hard answers ${h.hardAnswers}/${h.targets.hardAnswers} · permanent removal ${h.spotRemoval}/${h.targets.spotRemoval} · affordable draw ${h.cheapDraw}/${h.targets.cheapDraw} · weak tax-counters ${h.softCounters}. ${h.warnings.length?'Review: '+h.warnings.join('; '):'Heuristic floors met.'}`;quality.append(hp);}if(r.qualityAudit){const q=r.qualityAudit;
 const messages=[`Legacy broad-role status (not power certification): ${q.status}`,`Repeatable early mana ${q.earlyMana}/${q.targets.early}; bursts ${q.burstMana}; Powerstone makers ${q.powerstoneMakers}`,
 `Loose Oracle-text candidates: interaction ${q.interaction}/${q.targets.interaction} · protection ${q.protection}/${q.targets.protection} · draw mentions ${q.draw}/${q.targets.draw} (${q.conditionalDraw} conditional)`,
 ...q.landIssues.slice(0,6).map(x=>`Land review: ${x.card} — ${x.reasons.join('; ')}`),
 ...q.spellIssues.slice(0,6).map(x=>`Engine review: ${x.card} — ${x.reason}`),q.method];
 if(r.openingHands){const o=r.openingHands;messages.push(`No-mulligan ${o.trials}-hand sample: 2–4 opening lands ${o.openingTwoToFourLandsPct}% · ≥3 lands by turn 3 ${o.threeLandsByTurnThreePct}% · early mana seen ${o.earlyRampSeenByTurnThreePct}% · interaction by turn 4 ${o.interactionSeenByTurnFourPct}% · protection by turn 5 ${o.protectionSeenByTurnFivePct}%`);messages.push(o.assumptions);}
 for(const msg of messages){const p=document.createElement('p');p.textContent='• '+msg;quality.append(p);}
}
const w=$('warnings');w.replaceChildren();for(const msg of r.warnings){const p=document.createElement('p');p.textContent='• '+msg;w.append(p);}$('deck-text').value=r.deck;}
$('copy-archidekt').addEventListener('click',async()=>{if(!lastDeck?.archidektImport)return;try{await navigator.clipboard.writeText(lastDeck.archidektImport);$('copy-archidekt').textContent='Copied Archidekt list!';setTimeout(()=>$('copy-archidekt').textContent='Copy Archidekt category list',1400);}catch(e){notice('Could not copy Archidekt import: '+e.message);}});
$('copy').addEventListener('click',async()=>{if(!lastDeck)return;try{await navigator.clipboard.writeText(lastDeck.deck);$('copy').textContent='Copied!';setTimeout(()=>$('copy').textContent='Copy Moxfield-format list',1300);}catch(e){notice('Could not copy: '+e.message);}});
$('save').addEventListener('click',()=>{if(!lastDeck)return;const blob=new Blob([lastDeck.deck],{type:'text/plain;charset=utf-8'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='CommanderOracle-'+lastDeck.commander.replace(/[^a-z0-9]+/gi,'-')+'-B'+lastDeck.bracket+'.txt';a.click();URL.revokeObjectURL(href);});
status();

// Community intelligence: local, read-only import of user-specified public decks.
function appendMsg(container,text,cls=''){const p=document.createElement('p');p.className=cls;p.textContent=text;container.append(p);return p;}
async function communityList(){
 try{
  const state=await get('/api/community/decks');const box=$('community-decks');box.replaceChildren();
  if(!state.decks.length)appendMsg(box,'No community decks imported.','tiny');
  for(const d of state.decks.slice().reverse()){
   const card=document.createElement('div');card.className='community-entry';
   const a=document.createElement('a');a.textContent=d.title;a.href=d.url;a.target='_blank';a.rel='noopener noreferrer';
   const title=document.createElement('strong');title.append(a);card.append(title);
   appendMsg(card,`${d.commanderNames?.join(' + ')||'Commander unknown'} · ${d.edhBracket?'B'+d.edhBracket+' · ':''}${d.totalCards} matched cards · ${d.validated?'verified for basic deck checks':'not eligible for statistics'}`);
   if(d.owner)appendMsg(card,`Source: Archidekt · ${d.owner}`,'tiny');
   if(d.issues?.length){
    appendMsg(card,d.issues.slice(0,4).join(' • '),'community-warning');
    const breakdown=document.createElement('div');breakdown.className='community-breakdown';
    appendMsg(breakdown,`Archidekt included categories: ${d.sourceIncludedCards??'unknown'} cards; matched: ${d.totalCards}; excluded: ${d.sourceExcludedCards??d.excludedCount??'unknown'}.`,'tiny');
    for(const item of (d.unmatched||[]).slice(0,15))appendMsg(breakdown,`UNMATCHED: ${item.quantity||1}× ${item.name} [${item.primary||'no category'}] — ${item.reason}`,'tiny');
    for(const item of (d.excluded||[]).slice(0,15))appendMsg(breakdown,`EXCLUDED: ${item.quantity||1}× ${item.name} [${item.primary||'no category'}] — ${item.reason}`,'tiny');
    card.append(breakdown);
    const refresh=document.createElement('button');refresh.className='secondary';refresh.type='button';refresh.textContent='Recheck from Archidekt';
    refresh.addEventListener('click',async()=>{refresh.disabled=true;$('community-message').textContent='Checking live deck and refreshing the saved import…';try{const r=await post('/api/community/import',{url:d.url,forceRefresh:true});$('community-message').textContent=`Rechecked: ${r.deck.totalCards} verified cards. ${r.deck.issues?.join(' • ')||'Complete import.'}`;await communityList();await communityInsights();await refreshCommunityBuildOptions();}catch(e){$('community-message').textContent=e.message;refresh.disabled=false;}});
    card.append(refresh);
   }else{
    // A valid deck imported before bracket support may have no saved metadata.
    // Let users re-read its declared bracket without editing the 100-card deck.
    if(d.edhBracket==null)appendMsg(card,'Bracket not yet recorded. Refresh this deck to read its current Archidekt bracket.','tiny');
    const refresh=document.createElement('button');refresh.className='secondary';refresh.type='button';refresh.textContent='Refresh deck / bracket';
    refresh.addEventListener('click',async()=>{refresh.disabled=true;$('community-message').textContent='Refreshing deck and bracket from Archidekt…';try{const r=await post('/api/community/import',{url:d.url,forceRefresh:true});$('community-message').textContent=`Refreshed: ${r.deck.totalCards} cards · ${r.deck.edhBracket?'Bracket '+r.deck.edhBracket:'no bracket declared'}.`;await communityList();await communityInsights();await refreshCommunityBuildOptions();}catch(e){$('community-message').textContent=e.message;refresh.disabled=false;}});
    card.append(refresh);
   }
   if(d.validated){
    const combo=document.createElement('button');combo.className='secondary';combo.type='button';combo.textContent='Check combos with Commander Spellbook';
    combo.addEventListener('click',async()=>{
     combo.disabled=true;const panel=$('combo-results');panel.replaceChildren();$('combo-status').textContent=`Checking ${d.title} against Commander Spellbook…`;
     try{const result=await post('/api/community/combos',{deckKey:d.key});renderCombos(result);}
     catch(e){$('combo-status').textContent=e.message+' (Live lookup may require a working Internet connection and the current Spellbook API schema.)';}
     finally{combo.disabled=false;}
    });card.append(combo);
   }
   box.append(card);
  }
 }catch(e){$('community-message').textContent=e.message;}
}
function renderCombos(result){
 const panel=$('combo-results');panel.replaceChildren();
 $('combo-status').textContent=`${result.deckTitle}: ${result.counts.complete} named+template inventory-complete combo(s) (${result.counts.infiniteComplete??0} infinite outcomes), ${result.counts.oneAway} one-card-away combo(s) (${result.counts.infiniteOneAway??0} infinite outcomes). Spellbook reports ${result.counts.sourceIncluded} included and ${result.counts.sourceNear} near entries; ${result.counts.namedComplete??0} have all named cards; ${result.counts.templatePending??0} need unresolved templates. ${result.fromCache?'(cached)':''} Named cards plus supported templates are inventory checks, NOT game-state execution guarantees.`;
 for(const [label,items] of [['Named cards + templates present (execution unverified)',result.complete],['Named cards present; template pending',result.templatePending||[]],['Missing exactly one card',result.oneAway]]){
  const header=document.createElement('h4');header.textContent=label;panel.append(header);
  if(!items.length){appendMsg(panel,'No matching known combos reported in this category.','tiny');continue;}
  for(const combo of items.slice(0,12)){
   const node=document.createElement('div');node.className='community-entry';
   const link=document.createElement('a');link.href=combo.url;link.textContent=combo.cards.join(' + ');link.target='_blank';link.rel='noopener noreferrer';node.append(link);
   if(combo.isInfinite)appendMsg(node,'Infinite outcome reported by Commander Spellbook (verify prerequisites).','tiny');
   if(combo.missing.length)appendMsg(node,`Missing: ${combo.missing.join(', ')} · Scryfall estimate €${combo.missingPriceEstimate??'unknown'} · color identity ${combo.withinColorIdentity?'eligible':'not verified'}`,'community-warning');
   if(combo.templates.length)appendMsg(node,`Template requirements: ${combo.templates.join(', ')} · ${combo.templateSatisfied?'inventory matched: '+combo.templateMatches.join(', '):'unmatched or unsupported'}`,'community-warning');
   for(const x of combo.results.slice(0,3))appendMsg(node,`Result: ${x}`,'tiny');
   for(const x of combo.prerequisites.slice(0,3))appendMsg(node,`Prerequisite: ${x}`,'tiny');
   for(const x of combo.steps.slice(0,2))appendMsg(node,`Steps: ${x}`,'tiny');
   if(combo.requiresReview)appendMsg(node,'Execution requires additional prerequisites or manual rules verification.','tiny');
   panel.append(node);
  }
 }
 appendMsg(panel,result.warning,'tiny');
}

async function communityInsights(){
 const box=$('community-insights');box.replaceChildren();
 if(!selected){$('community-insight-status').textContent='Select a commander to explore community statistics.';return;}
 try{
  const b=communityBracket();const stats=await get(`/api/community/insights?commanderId=${encodeURIComponent(selected.id)}${b===null?'':'&bracket='+b}`);
  $('community-insight-status').textContent=`${stats.sampleSize} distinct validated ${b===null?'all-bracket':'Bracket '+b} deck(s) for ${selected.name}. ${stats.highConfidence?'Enough samples for candidate patterns; not proof of gameplay strength.':'Low-sample exploratory research, not ready for automatic deckbuilding.'}`;
  const metric=document.createElement('div');metric.className='community-metric';
  metric.textContent=`${stats.sampleSize} source list(s) · ${stats.duplicatesExcluded} near-duplicate(s) excluded · ${stats.independentCreatorCount} known creator(s) · ${stats.baseline.available?stats.baseline.referenceDecks+' other-commander reference decks':'no credible staple baseline'} · ${stats.archetypes.length} clusters`;
  box.append(metric);
  if(!stats.sampleSize){appendMsg(box,'Import verified public decks to build an evidence-backed cohort. No card suggestions can be made yet.','tiny');return;}
  for(const warning of stats.cautions||[])appendMsg(box,warning,'tiny');
  if(stats.packages?.length){
   const title=document.createElement('h4');title.textContent='Recurring card packages (co-occurrence, NOT guaranteed synergy)';box.append(title);
   const list=document.createElement('div');list.className='community-listing';
   for(const pkg of stats.packages.slice(0,8)){
    const wrap=document.createElement('div');wrap.className='community-metric';
    appendMsg(wrap,`${pkg.cardNames.join(' + ')} — in ${pkg.count}/${stats.sampleSize} lists · conservative lift ${pkg.adjustedLift}× · ${pkg.evidence==='candidate'?'candidate pattern':'exploratory only'}`);
    const cite=document.createElement('small');cite.textContent=`Source decks: ${pkg.supportingDecks.slice(0,4).join(', ')}${pkg.supportingDecks.length>4?' …':''}`;wrap.append(cite);
    list.append(wrap);
   }box.append(list);
  }else appendMsg(box,'No defensible recurring packages in the saved cohort. Add more distinct verified decks; we will not invent synergies.','tiny');
  if(stats.inclusion.length){
   const title=document.createElement('h4');title.textContent='Common card choices · bracket-matched cohort';box.append(title);
   const list=document.createElement('div');list.className='community-listing';
   for(const item of stats.inclusion.slice(0,12)){
    const compared=stats.baseline.available?` · other commanders ${Math.round(100*item.baselineRate)}%${item.genericStaple?' · generic staple':''}`:' · baseline unavailable';
    appendMsg(list,`${item.name} — ${item.count}/${stats.sampleSize} lists · inclusion interval ${Math.round(item.interval.lower*100)}–${Math.round(item.interval.upper*100)}%${compared}`);
   }box.append(list);
  }
  if(stats.distinctivePairings?.length){
   const title=document.createElement('h4');title.textContent='Above-independent-frequency pairs (adjusted for sample size)';box.append(title);
   const list=document.createElement('div');list.className='community-listing';
   for(const item of stats.distinctivePairings.slice(0,8))appendMsg(list,`${item.nameA} + ${item.nameB} — ${item.count} lists · raw ${item.lift}× / shrunk ${item.adjustedLift}× · ${item.evidence}`);
   box.append(list);
  }
  if(stats.archetypes.length){
   const title=document.createElement('h4');title.textContent='Distinct strategy clusters (complete-link similarity)';box.append(title);
   for(const cluster of stats.archetypes.slice(0,8)){
    const card=document.createElement('div');card.className='community-metric';
    appendMsg(card,`${cluster.size} similar decks · characteristic cards: ${cluster.signature.slice(0,5).map(s=>s.name).join(', ')}`);
    appendMsg(card,`List keys: ${cluster.sourceDecks.slice(0,4).join(', ')} · similarity cohesion ${cluster.cohesion}`,'tiny');box.append(card);
   }
  }
  const provenance=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`View ${stats.provenance.length} public deck source(s)`;provenance.append(summary);
  for(const src of stats.provenance){const line=document.createElement('div');const a=document.createElement('a');a.textContent=src.title||src.key;a.href=src.url||'#';a.target='_blank';a.rel='noopener noreferrer';line.append(a);const small=document.createElement('small');small.textContent=` · ${src.owner||'owner not given'} · ${src.edhBracket?'B'+src.edhBracket:'no bracket'} · imported ${src.importedAt?new Date(src.importedAt).toLocaleDateString():'unknown date'}`;line.append(small);provenance.append(line);}box.append(provenance);
 }catch(e){$('community-insight-status').textContent=e.message;}
}
$('community-import').addEventListener('click',async()=>{
 const url=$('community-url').value.trim();if(!url){$('community-message').textContent='Enter a public Archidekt deck URL first.';return;}
 $('community-import').disabled=true;$('community-message').textContent='Importing one public deck…';
 try{
  const result=await post('/api/community/import',{url,forceRefresh:true});
  $('community-message').textContent=`${result.fromCache?'Loaded cached':'Imported'}: ${result.deck.title} · ${result.deck.totalCards} verified cards · ${result.deck.validated?'eligible for exploratory statistics':'needs review; excluded from statistics'}. ${result.deck.issues?.join(' • ')||''}`;
  await communityList();await communityInsights();await refreshCommunityBuildOptions();
 }catch(e){$('community-message').textContent=e.message;}finally{$('community-import').disabled=false;}
});
// Public community discovery. Search matches TITLES only, not verified commanders.
let discoveryCommander=null,discoveryBracket=null,discoveryPage=null;
function communityBracket(){const x=$('community-bracket').value;return x==='any'?null:x==='match'?Number($('bracket').value):Number(x);}
function resetCommunityDiscovery(){discoveryCommander=null;discoveryBracket=null;discoveryPage=null;$('discovery-results').replaceChildren();$('discovery-import').hidden=true;$('discovery-status').textContent=selected?'Ready to find public decks for '+selected.name+'.':'Select a commander above first.';}
$('community-bracket').addEventListener('change',()=>{resetCommunityDiscovery();communityInsights();});
$('community-page').addEventListener('change',resetCommunityDiscovery);
$('bracket').addEventListener('change',()=>{if($('community-bracket').value==='match'){resetCommunityDiscovery();communityInsights();}});
$('community-discover').addEventListener('click',async()=>{
 if(!selected){$('discovery-status').textContent='Select a commander first.';return;}
 const target={id:selected.id,name:selected.name,bracket:communityBracket(),startPage:Number($('community-page').value)};
 $('community-discover').disabled=true;$('discovery-import').hidden=true;
 $('discovery-results').replaceChildren();$('discovery-status').textContent=`Searching Archidekt for ${target.name} ${target.bracket?'Bracket '+target.bracket:'(all brackets)'} decks…`;
 try{
  const result=await post('/api/community/discover',{commanderId:target.id,bracket:target.bracket,startPage:target.startPage});
  if(!selected||selected.id!==target.id||communityBracket()!==target.bracket||Number($('community-page').value)!==target.startPage)return;
  discoveryCommander=target.id;discoveryBracket=target.bracket;discoveryPage=target.startPage;
  $('discovery-status').textContent=`${result.previews.length} matching bracket preview(s) from ${result.inspected} titles across ${result.pagesSearched} page(s)${result.fromCache?' (cached)':''}. ${result.unknownBracket} entries had no declared bracket. Commander identity is verified on import; select up to four.`;
  for(const deck of result.previews){
   const line=document.createElement('label');line.className='discovery-preview';
   const check=document.createElement('input');check.type='checkbox';check.className='discovery-pick';check.value=deck.id;
   const wrap=document.createElement('span');const a=document.createElement('a');a.textContent=deck.title;a.href=deck.url;a.target='_blank';a.rel='noopener noreferrer';
   const details=document.createElement('small');details.textContent=`${deck.owner||'Public author'} · ${deck.cardCount??'?'} cards · ${deck.edhBracket?'Bracket '+deck.edhBracket:'Bracket not declared'}`;
   wrap.append(a,details);line.append(check,wrap);$('discovery-results').append(line);
  }
  $('discovery-import').hidden=!result.previews.length;
 }catch(e){$('discovery-status').textContent=e.message;}
 finally{$('community-discover').disabled=false;}
});
$('community-auto').addEventListener('click',async()=>{
 if(!selected){$('community-auto-status').textContent='Select a commander first.';return;}
 const target={id:selected.id,name:selected.name,bracket:communityBracket(),budget:Number($('budget').value)};
 if(![2,3,4].includes(target.bracket)){$('community-auto-status').textContent='Choose a specific community bracket (2, 3 or 4), not All brackets.';return;}
 $('community-auto').disabled=true;$('community-discover').disabled=true;
 $('community-auto-status').textContent=`Researching ${target.name} Bracket ${target.bracket}… verifying up to 24 lists, paced to respect Archidekt. Please wait; no clicking needed.`;
 try{
  const r=await post('/api/community/auto-research',{commanderId:target.id,bracket:target.bracket,budget:target.budget});
  const summary=`Added ${r.added.length} source-backed deck(s) after checking ${r.examined} new detail(s) (${r.eligible} validated); ${r.alreadyStored} already saved. Research pool now ${r.distinctValidated} distinct matching deck(s) from ${r.distinctCreators} known creator(s). ${r.skippedCount} rejected or duplicates${r.rateLimited?' · Archidekt rate limit; stopped early':''}.`;
  $('community-auto-status').textContent=summary;
  const reasons=document.createElement('details');const title=document.createElement('summary');title.textContent='Review research choices and skipped sources';reasons.append(title);
  for(const d of r.added)appendMsg(reasons,`Saved #${d.id} (${d.owner||'unknown creator'}): ${d.title} · ${d.landCount} lands · approx €${d.estimatedEur} Scryfall excluding unpriced cards`,'tiny');
  for(const d of r.skipped.slice(0,15))appendMsg(reasons,`Skipped #${d.id}: ${d.reason}`,'tiny');
  $('community-auto-status').after(reasons);
  await communityList();await communityInsights();await refreshCommunityBuildOptions();
 }catch(e){$('community-auto-status').textContent=e.message;}
 finally{$('community-auto').disabled=!selected;$('community-discover').disabled=!selected;}
});
$('discovery-import').addEventListener('click',async()=>{
 if(!selected||selected.id!==discoveryCommander||communityBracket()!==discoveryBracket||Number($('community-page').value)!==discoveryPage){$('discovery-status').textContent='Commander changed; run the search again.';return;}
 const ids=[...document.querySelectorAll('.discovery-pick:checked')].map(e=>e.value);
 if(ids.length<1||ids.length>4){$('discovery-status').textContent='Choose between 1 and 4 decks.';return;}
 $('discovery-import').disabled=true;$('discovery-status').textContent=`Verifying ${ids.length} deck(s) against Scryfall and commander identity…`;
 try{
  const result=await post('/api/community/discover-import',{commanderId:selected.id,bracket:discoveryBracket,startPage:discoveryPage,ids});
  const reasons=result.skipped.map(x=>`#${x.id}: ${x.reason}`);
  $('discovery-status').textContent=`Imported ${result.added.length} verified deck(s). ${result.skipped.length} skipped.${reasons.length?' '+reasons.join(' | '):''}`;
  await communityList();await communityInsights();await refreshCommunityBuildOptions();
 }catch(e){$('discovery-status').textContent=e.message;}
 finally{$('discovery-import').disabled=false;}
});
// Hook into commander selection without changing the generator.
const originalCommunitySearch=search;
// Commander changes trigger a stats refresh through the selected DOM box.
const communityObserver=new MutationObserver(()=>{communityInsights();discoveryCommander=null;discoveryBracket=null;discoveryPage=null;$('discovery-results').replaceChildren();$('discovery-import').hidden=true;$('community-discover').disabled=!selected;$('community-auto').disabled=!selected;$('discovery-status').textContent=selected?`Ready to find public decks matching ${selected.name}.`:'Select a commander above first.';});
communityObserver.observe($('commander-name'),{childList:true,characterData:true,subtree:true});
communityList();

function renderPriceLedger(r){
 const root=$('pricing-lines');root.replaceChildren();
 const audit=r.pricingAudit;
 $('print-warning').textContent=(r.pricingCatalog?.warning||'Eligible printing metadata screened on catalog refresh. ')+' Prices are estimates or user-imported offers; not verified live EN NM inventory.';
 if(!audit){root.textContent='Price breakdown unavailable for this deck.';return;}
 for(const item of audit.cards){
  const row=document.createElement('div');row.className='price-row';const link=document.createElement('a');
  link.href=item.cardmarketUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.card;
  const meta=document.createElement('span');const set=item.printing?.set?.toUpperCase()||'legacy cache';const condition=item.printing?.border||'unknown border';
  meta.textContent=`€${item.price===null?'UNPRICED':item.price.toFixed(2)} · ${set} · ${condition}`;row.append(link,meta);root.append(row);
 }
 const p=document.createElement('p');p.textContent=`Export recheck: ${audit.count}/100 cards, €${audit.total.toFixed(2)} · ${audit.withinBudget?'within requested ceiling':'PRICE REVIEW FAILED'}. Basic lands assumed owned.`;root.prepend(p);
}
function updateBudgetPreview(){
 if(!lastDeck)return;
 const base=Number.isFinite(originalBudget)?originalBudget:Number(lastDeck.budget);
 const extra=Number($('extra-budget').value);
 const cart=$('actual-cart').value.trim();
 $('budget-preview').textContent=`Original ceiling €${base.toFixed(2)} + €${Number.isFinite(extra)&&extra>0?extra.toFixed(2):'0.00'} = €${(base+(Number.isFinite(extra)&&extra>0?extra:0)).toFixed(2)}. ${cart!==''?'Reported current cart total €'+Number(cart).toFixed(2)+' (reference only).':''}`;
}
$('actual-cart').addEventListener('input',updateBudgetPreview);
$('extra-budget').addEventListener('input',updateBudgetPreview);
$('regenerate-extra').addEventListener('click',()=>{
 if(!lastDeck){notice('Generate a deck before regenerating.');return;}
 const extra=Number($('extra-budget').value),cartText=$('actual-cart').value.trim(),cart=cartText===''?null:Number(cartText);
 if(!Number.isFinite(extra)||extra<=0||extra>100000){notice('Enter a positive additional budget (up to €100,000).');return;}
 if(cart!==null&&(!Number.isFinite(cart)||cart<0||cart>1000000)){notice('Enter a valid cart total or leave it blank.');return;}
 const base=Number.isFinite(originalBudget)?originalBudget:Number(lastDeck.budget);
 const next=Math.round((base+extra)*100)/100;
 if(next>100000){notice('Total ceiling exceeds €100,000.');return;}
 regeneration={originalBudget:base,extraBudget:extra,reportedActualCart:cart};
 $('budget').value=String(next);$('generate').click();
});
$('copy-previous').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('previous-deck-text').value);}catch(e){notice('Could not copy previous deck: '+e.message);}});
function showRegenerationComparison(before,after,context){
 $('previous-deck-text').value=before.deck;$('previous-deck').hidden=false;
 const oldNames=new Set([...before.sections.spells,...before.sections.lands]);
 const newNames=new Set([...after.sections.spells,...after.sections.lands]);
 const added=[...newNames].filter(n=>!oldNames.has(n));const removed=[...oldNames].filter(n=>!newNames.has(n));
 const priceChange=after.price-before.price;
 $('comparison-result').textContent=`New cap €${after.budget.toFixed(2)} (original €${context.originalBudget.toFixed(2)} + €${context.extraBudget.toFixed(2)}).
`+
  `Previous estimated deck €${before.price.toFixed(2)} → new €${after.price.toFixed(2)} (${priceChange>=0?'+':''}€${priceChange.toFixed(2)}).
`+
  (context.reportedActualCart===null?'No actual cart total supplied.\n':`Previous actual cart reported: €${context.reportedActualCart.toFixed(2)} (not applied to individual card pricing).\n`)+
  `${added.length} added / ${removed.length} removed unique noncommander names. Added: ${added.slice(0,12).join(', ')||'none'}. Removed: ${removed.slice(0,12).join(', ')||'none'}.
`+
  'Internal comparisons do not certify increased gameplay power. Save both lists if you want to compare them externally.';
}
