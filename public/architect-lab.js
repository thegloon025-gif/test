function item(tag,text){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 return node;
}
const pct=n=>n===null?'Unsupported':n+'%';
const norm=n=>n===null?'Unavailable':n;
const eur=n=>n===null?'Price coverage incomplete':'€'+n.toFixed(2);
const delta=n=>n===null?'Unavailable':(n>0?'+':'')+n;
const measures=[
 ['Average lands on turn 4',x=>x.turns[3].lands,'landsTurnFour'],
 ['Average available mana on turn 4',x=>x.turns[3].mana,'manaTurnFour'],
 ['Commander cast by turn 10',x=>pct(x.commanderCastPct),'commanderCastPct'],
 ['Average commander turn when cast',x=>norm(x.averageCommanderTurn),'averageCommanderTurn'],
 ['Average mana available after casting commander',x=>norm(x.averageManaAfterCommander)],
 ['Extra cards drawn per game',x=>x.averageExtraCardsDrawn,'extraCardsDrawn'],
 ['Interaction seen by turn 5',x=>pct(x.turns[4].interactionSeenPct),'interactionSeenTurnFivePct'],
 ['Supported ramp played by turn 3',x=>pct(x.rampPlayedByTurnThreePct)],
 ['Kept hands with 2–4 lands',x=>pct(x.opening.twoToFourLandsPct)],
 ['Average lands in kept hand',x=>x.opening.averageLands],
 ['Average mulligans taken',x=>x.opening.averageMulligans],
 ['Missing third battlefield land on turn 4',x=>pct(x.screwPct),'screwPct'],
 ['Eight or more lands seen by turn 6',x=>pct(x.floodPct),'floodPct'],
 ['Lines reaching a modeled starting state',x=>x.combo.filter(line=>line.startingStatePct>0).length,'linesWithModeledStartingState'],
 ['Spells with mana value seven or more',x=>x.manaCurve['7+']]
];
function table(root,headings,rows){
 const wrap=item('div');wrap.className='table-wrap';
 const table=item('table'),head=item('thead'),heading=item('tr'),body=item('tbody');
 heading.append(...headings.map(label=>item('th',label)));
 head.append(heading);
 for(const row of rows){const line=item('tr');line.append(...row.map(value=>item('td',String(value))));body.append(line);}
 table.append(head,body);wrap.append(table);root.append(wrap);
}
function comparison(root,base,other,heading){
 const cols=other?['Metric','Original',heading,'Change']:['Metric','Original'];
 table(root,cols,measures.map(([label,read,key])=>[label,read(base.result),
  ...(other?[read(other.result),key?delta(other.deltas[key]):'—']:[])]));
}
function showDeck(root,deck,heading){
 const out=deck.result;
 root.append(item('h4',heading+' · '+out.commander));
 root.append(item('p',eur(deck.price)+(deck.withinBudget?' · within the selected ceiling':'')+
  (deck.bracketIssue?' · exceeds the Bracket 3 Game Changer allowance':'')+' · '+deck.comboCoverage));
 const counts=deck.combos;
 root.append(item('p',counts.twoCard+' two-card lines · '+counts.threeCard+' three-card lines · '+counts.directWins+' direct wins · '+counts.engines+' engines/value · '+counts.delayedWins+' delayed wins · '+deck.independentRoutes+' independent scored routes'));
 const detail=item('details');detail.append(item('summary','Turn-by-turn development, combos and model coverage'));
 table(detail,['Turn','Lands','Available mana','Ramp seen','Draw seen','Tutor seen','Interaction seen'],
  out.turns.map(row=>[row.turn,row.lands,row.mana,pct(row.rampSeenPct),pct(row.drawSeenPct),pct(row.tutorSeenPct),pct(row.interactionSeenPct)]));
 detail.append(item('p','Mana curve, MV 0–7+ · '+Object.entries(out.manaCurve).map(([key,value])=>key+' = '+value).join(' · ')));
 detail.append(item('p','Modeled sources · '+out.supported.manaSources+' tap sources · '+out.supported.landSearch+' land-search spells · '+out.supported.landAuras+' land Auras · '+out.supported.doublers+' mana multipliers'+(out.supported.castUntapsLands?' · cast-triggered land untap':'')));
 detail.append(item('p','Commander cast estimate 95% interval · '+out.commanderCastInterval95.join('–')+'%'));
 if(out.combo.length)table(detail,['Line','Pieces seen by turn 10','Avg. turn seen','Modeled starting state','Avg. turn ready'],
  out.combo.map(line=>[line.pieces.join(' + ')+' · '+line.kind+(line.commander?' · commander involved':'')+(line.relationship?' · '+line.relationship:''),pct(line.piecesSeenPct),norm(line.averagePiecesTurn),pct(line.startingStatePct),norm(line.averageStartingStateTurn)]));
 for(const line of out.combo){
  const note=item('p',line.outcomes.join(' · ')+(line.requiredMana?' · starting mana '+line.requiredMana:'')+
   (line.prerequisites.length?' · '+line.prerequisites.join(' · '):'')+' ');
  const link=item('a','Spellbook');link.href=line.url;link.target='_blank';link.rel='noopener noreferrer';note.append(link);detail.append(note);
 }
 if(deck.incomplete.length)detail.append(item('p','Incomplete commander lines, missing named cards · '+deck.incomplete.map(line=>line.missing.join(', ')).join(' | ')));
 if(deck.unmodeledComboRequirements)detail.append(item('p',deck.unmodeledComboRequirements+' lines have unresolved requirements.'));
 if(out.unsupportedCards.length)detail.append(item('p','Some card effects omitted · '+out.unsupportedCards.join(', ')));
 root.append(detail);
}
export function renderArchitectLab(root,analysis,choose){
 root.replaceChildren();
 const {original,comparison:other,upgrade}=analysis;
 root.append(item('p',original.result.trials+' seeded goldfish trials per deck · seed '+original.result.seed+' · turn 10 horizon · '+analysis.ceiling.toFixed(2)+' EUR ceiling'));
 root.append(item('p','Commander uses a free first London mulligan, then up to two paid mulligans. Goldfish models own turns, card access and supported payments. Opponents, combat, tutor decisions, most triggers, and combo execution are outside this model.'));
 if(analysis.snapshotStatus==='stale')root.append(item('p','Combo matching used a saved Spellbook snapshot.'));
 if(analysis.snapshotStatus==='unavailable')root.append(item('p','The Spellbook snapshot was unavailable. Only saved variant definitions were checked.'));
 showDeck(root,original,'Original');
 if(other)showDeck(root,other,'Comparison');
 comparison(root,original,other,'Comparison');
 if(analysis.observations.length){
  const list=item('ul');list.append(...analysis.observations.map(text=>item('li',text)));root.append(list);
 }
 if(upgrade){
  showDeck(root,upgrade,'Suggested revision');
  root.append(item('p',upgrade.reason+' · full-deck cost change '+(upgrade.priceChange===null?'unavailable':delta(upgrade.priceChange)+' EUR')));
  if(upgrade.swaps.length)table(root,['Cut','Add','Reason','Change in card value','Isolated effect'],
   upgrade.swaps.map(swap=>[swap.cut,swap.add,upgrade.reason,swap.priceChange===null?'Unavailable':delta(swap.priceChange)+' EUR',
    delta(swap.impact.manaTurnFour)+' mana on turn 4 · '+delta(swap.impact.commanderCastPct)+' pp commander cast']));
  if(upgrade.lostCombos.length)root.append(item('p','Previously recorded combo lines lost · '+upgrade.lostCombos.join(', ')));
  comparison(root,original,upgrade,'Suggested');
  if(upgrade.eligible){
   const use=item('button','Use this revision after validation');use.type='button';use.onclick=()=>choose(upgrade.deck);root.append(use);
  }
 }
}
