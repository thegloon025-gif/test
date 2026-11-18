const eur=value=>'€'+value.toFixed(2);
const bracketName=value=>value?'Bracket '+value:'Bracket not declared';
const zones={B:'battlefield',H:'hand',G:'graveyard',E:'exile',L:'library',C:'command zone',S:'stack'};
function element(tag,text,className){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(className)node.className=className;
 return node;
}
function details(title){
 const node=element('details');
 node.append(element('summary',title));
 return node;
}
function sourceLink(source,text=source.title){
 const link=element('a',text);
 link.href=source.url;
 link.target='_blank';
 link.rel='noopener noreferrer';
 return link;
}
function list(parent,lines){
 const group=element('ul');
 for(const line of lines)if(line.trim())group.append(element('li',line));
 if(group.childElementCount)parent.append(group);
}
function startingState(piece){
 const states=[piece.battlefieldCardState,piece.exileCardState,piece.libraryCardState,piece.graveyardCardState].filter(Boolean);
 const zone=piece.zoneLocations.map(code=>zones[code]||code).join(' / ');
 return [zone?'Starting zone — '+zone:'',...states].filter(Boolean).join(' · ');
}

export async function findRankedDecks(payload,onProgress){
 const response=await fetch('/api/community/discover',{
  method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},
  body:JSON.stringify({...payload,ranked:true})
 });
 if(!response.ok){
  const message=await response.json();
  throw Error(message.error||response.statusText);
 }
 const text=response.body.pipeThrough(new TextDecoderStream());
 let pending='',result;
 for await(const chunk of text){
  pending+=chunk;
  const lines=pending.split('\n');
  pending=lines.pop();
  for(const line of lines){
   const event=JSON.parse(line);
   if(event.type==='progress')onProgress(event);
   if(event.type==='result')result=event.result;
   if(event.type==='error')throw Error(event.error);
  }
 }
 if(!result)throw Error('Deck search ended before the results arrived. Try again.');
 return result;
}

function comboDetail(line){
 const title=line.pieces.map(piece=>(piece.quantity>1?piece.quantity+' × ':'')+piece.name).join(' + ');
 const node=details(title);
 const requirementCount=line.requiredCards===line.namedPieces?'':` · ${line.requiredCards-line.namedPieces} wildcard card(s)`;
 const finish=line.directWin?'Direct win':line.delayedWin?'Documented delayed win':'Engine or value';
 node.append(element('p',`${line.namedPieces} named piece(s)${requirementCount} · ${finish} · ${line.contribution.toFixed(2)} ranking points`, 'tiny'));
 node.append(element('p',`Outcome — ${line.results.join(' · ')}`));
 if(line.payoff)node.append(element('p',line.payoff,'tiny'));
 list(node,line.pieces.map(piece=>{
  const assignment=piece.mustBeCommander?' (must be commander)':piece.inCommandZone?' (your commander)':'';
  return [`${piece.quantity} × ${piece.name}${assignment}`,startingState(piece)].filter(Boolean).join(' · ');
 }));
 if(line.templateRequirements.length){
  node.append(element('strong','Wildcard requirements'));
  list(node,line.templateRequirements.map(t=>[`${t.quantity} × ${t.name}`,startingState(t)].filter(Boolean).join(' · ')));
  node.append(element('p','Deck matches — '+line.templateMatches.join(', '),'tiny'));
 }
 if(line.manaNeeded)node.append(element('p',`Starting mana — ${line.manaNeeded}`,'tiny'));
 if(line.prerequisites.some(text=>text.trim())){
  node.append(element('strong','Setup and prerequisites'));
  list(node,[...new Set(line.prerequisites.flatMap(text=>text.split('\n')))]);
 }
 for(const support of line.supportingCards)node.append(element('p',
  `Supporting cards · ${support.zone.toLowerCase()} — ${support.cards.join(', ')}`,'tiny'));
 node.append(element('p',`${line.relationship} · ${line.fit.deploymentMana} total printed mana value · ${line.fit.tutors} matching tutor(s) · ${line.fit.standalones} pieces with a recognized standalone role.`, 'tiny'));
 if(line.variantCount>1)node.append(element('p',`${line.variantCount} published variants share these requirements.`, 'tiny'));
 node.append(sourceLink(line,'Instructions on Commander Spellbook'));
 return node;
}

function deckResult(deck){
 const article=element('article',undefined,'ranked-deck');
 const pick=element('input');
 pick.type='checkbox';
 pick.className='discovery-pick';
 pick.value=deck.id;
 pick.setAttribute('aria-label','Select '+deck.title+' for import');
 const source=element('div',undefined,'discovery-preview');
 const heading=element('div');
 heading.append(sourceLink(deck),element('small',`${deck.commander} · ${bracketName(deck.edhBracket)} · ${deck.owner||'Public author'}`));
 source.append(pick,heading);
 article.append(source);
 const price=deck.estimatedEur!==null?eur(deck.estimatedEur):`${eur(deck.knownEur)} priced · ${deck.unpricedCards} unpriced`;
 const budgetState=deck.budgetStatus==='over-budget'?' · over budget':deck.budgetStatus==='unconfirmed'?' · budget unconfirmed':'';
 article.append(element('p',`${price}${budgetState} · ${deck.score.toFixed(2)} / 100 discovery score`, 'discovery-score'));
 const {counts,status,scoring,support}=deck.combo;
 if(counts){
  const delayed=counts.delayedWins?` · ${counts.delayedWins} delayed win`:'';
  article.append(element('p',`${counts.twoCard} two-card · ${counts.threeCard} three-card · ${counts.directWins} direct win${delayed} · ${counts.engines} engine/value${status==='partial'?' · known matches (partial coverage)':''}`, 'tiny'));
 }else article.append(element('p','Combo analysis unavailable.','tiny'));
 const review=details('Score and combo details');
 const score=deck.scoreBreakdown;
 review.append(element('p',`${score.structure.toFixed(2)} structure and mana + ${score.budget.toFixed(2)} budget efficiency${score.combos===null?' · combo points unavailable':` + ${score.combos.toFixed(2)} combo points`}.`, 'tiny'));
 const roles=deck.structure;
 review.append(element('p',`${roles.lands} lands · ${roles.earlyRamp} early ramp · ${roles.positiveDraw} positive draw · ${roles.broadAnswers} broad answers · ${roles.dedicatedShields} protection · ${deck.mana.penalty.toFixed(2)} fixing penalty.`, 'tiny'));
 if(deck.sources.length>1){
  review.append(element('p','Identical cardlist also listed under these sources', 'tiny'));
  const copies=element('ul');
  for(const copy of deck.sources.slice(1)){
   const item=element('li');
   item.append(sourceLink(copy),document.createTextNode(' · '+bracketName(copy.edhBracket)));
   copies.append(item);
  }
  review.append(copies);
 }
 if(counts){
  review.append(element('p',`${scoring.independent} independent scored route(s) · ${support.tutors} recognized tutor(s) · ${scoring.maxPoints} maximum combo points. Inventory matches still require the recorded setup, mana and timing.`, 'tiny'));
  if(deck.combo.unresolvedTemplates)review.append(element('p',`${deck.combo.unresolvedTemplates} potential variant(s) have wildcard requirements the app could not verify.`, 'tiny'));
  if(deck.combo.unresolvedPrerequisites)review.append(element('p',`${deck.combo.unresolvedPrerequisites} potential variant(s) require battlefield support the app could not verify.`, 'tiny'));
  if(!counts.total)review.append(element('p','No complete combo found in the analyzed snapshot.', 'tiny'));
  for(const line of deck.combo.details)review.append(comboDetail(line));
  if(counts.total>deck.combo.details.length)review.append(element('p',`Showing ${deck.combo.details.length} of ${counts.total} complete lines.`, 'tiny'));
 }
 article.append(review);
 return article;
}

export function renderRankedDecks(root,result){
 root.replaceChildren();
 const budgetCount=result.results.filter(deck=>deck.budgetStatus==='within-budget').length;
 root.append(element('p',`${result.pricingLabel} · ${eur(result.budgetMaximum)} ceiling · ${budgetCount} within budget. Shipping excluded.`, 'tiny'));
 if(result.pricingWarning)root.append(element('p',result.pricingWarning,'tiny'));
 const feed=result.spellbook;
 if(feed.timestamp){
  const message=feed.status==='stale'?'Using the saved Spellbook snapshot after a refresh failure.':'Commander Spellbook snapshot';
  root.append(element('p',`${message} · ${new Date(feed.timestamp).toLocaleDateString()} · ${feed.variants.toLocaleString()} variants.`, 'tiny'));
  if(feed.skipped)root.append(element('p',`${feed.skipped} published definition(s) lacked usable structured data.`, 'tiny'));
 }else if(feed.status==='unavailable'){
  root.append(element('p',`Spellbook unavailable. Results are ranked on structure, mana and budget. ${feed.error||''}`, 'tiny'));
 }
 if(feed.cacheWarning)root.append(element('p',feed.cacheWarning,'tiny'));
 const other=details(`Over budget or price unconfirmed (${result.results.length-budgetCount}) · available for research`);
 for(const deck of result.results){
  if(deck.budgetStatus==='within-budget')root.append(deckResult(deck));
  else other.append(deckResult(deck));
 }
 if(result.results.length>budgetCount)root.append(other);
 if(result.skipped.length||result.error){
  const rejected=details('Search limits and skipped listings');
  if(result.error)rejected.append(element('p',result.error,'tiny'));
  list(rejected,result.skipped.map(item=>`Deck #${item.id} — ${item.reason}`));
  root.append(rejected);
 }
}
