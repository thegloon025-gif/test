/** Text-only explanations; no scores or generic commander archetype labels. */
export function whyRows(result){
 const why=result.whyThisDeck,policy=result.budgetPolicy,rows=[];
 if(policy)rows.push(`Card-value target €${policy.target.toFixed(2)}; tolerance €${policy.tolerance.toFixed(2)}; hard maximum €${policy.effectiveMaximum.toFixed(2)}; estimate €${policy.selectedCardValue.toFixed(2)}; unused €${policy.unused.toFixed(2)}; above target €${policy.overTarget.toFixed(2)}. ${policy.assumption}. Shipping excluded.`);
 if(!why){rows.push('Detailed strategy relationships are unavailable for this fallback or legacy build.');return rows;}
 rows.push(why.selection);
 for(const d of why.discovered||[])rows.push(`Considered ${d.engine}: ${d.kind}, ${d.support} eligible catalog interactions. ${d.basis}. Construction may reject this hypothesis; it is not an established archetype.`);
 const r=why.relations;
 for(const e of r?.relationships||[])rows.push(`${e.card} → ${e.kind}: ${e.support.length} inventory supports (${e.support.slice(0,6).join(', ')||'none'}). ${e.outcome}. Requires: ${e.prerequisites.join('; ')}.${e.outlets?.length?' Available sacrifice outlets: '+e.outlets.join(', ')+'.':''} ${e.qualified===false?'Support insufficient or condition unverified.':''}`);
 for(const m of r?.multiRole||[])rows.push(`${m.card}: ${m.functions.join(', ')}. ${m.note}.`);
 if(!r?.relationships?.some(x=>x.kind==='death:life-pressure'))rows.push('No win-conversion line is certified by this relationship grammar. Inspect threats, combat, outlets and the combo execution requirements below.');
 for(const u of r?.unknowns||[])rows.push(`${u.card}: ${u.reason}.`);
 rows.push(r?.limitations||'Native mechanic coverage unknown.');
 rows.push('Scryfall Oracle facts and local mechanical inference are separate from community source observations. Imported EDHREC statistics are advisory and never determine these choices. Inventory-complete combos still require the separately displayed zones, payments and timing.');
 return rows;
}
export function renderStrategy(result,container){
 container.replaceChildren();
 for(const message of whyRows(result)){const p=document.createElement('p');p.textContent=message;container.append(p);}
 for(const deck of result.alternatives||[]){
  const details=document.createElement('details'),summary=document.createElement('summary');
  summary.textContent=`${deck.recommended?'Recommended (provisional)':'Competitive alternative'}: ${deck.id} · €${deck.price.toFixed(2)}`;details.append(summary);
  const note=document.createElement('p');note.textContent=deck.explanation+'. '+(deck.relations?.capabilities.join(', ')||'Supported capabilities unknown')+'. '+(deck.sourceKey?'Source: '+deck.sourceKey+'. ':'')+'Exact selected-printing audit: '+deck.pricingAudit.count+' cards; within hard maximum '+deck.pricingAudit.withinBudget+'.';details.append(note);
  const diff=deck.comparison?.selection;if(diff){const p=document.createElement('p');p.textContent='Recommendation gains: '+(diff.selectedGains.join(', ')||'none recognized')+'. Tradeoffs against this alternative: '+(diff.selectedLosses.join(', ')||'none recognized')+'. Counts are inventory evidence, not gameplay strength.';details.append(p);}
  const text=document.createElement('textarea');text.value=deck.deck;text.readOnly=true;text.setAttribute('aria-label',deck.id+' complete decklist');details.append(text);
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Copy this complete deck';button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(deck.deck);button.textContent='Copied';}catch{button.textContent='Select and copy the list above';}});details.append(button);container.append(details);
 }
}
