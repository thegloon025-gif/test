import {oracleId,castHasType,isLandSlot} from './cards.mjs';
import {sourceGrammar,allocateMana,wilson} from './functionalGoldfish.mjs';
import {roleEvidence,oracleText} from './roleEvidence.mjs';
import {manaRole} from './deckQuality.mjs';

const COLORS='WUBRG'.split('');
const TURNS=10;
const round=n=>Math.round(n*100)/100;
const count=(rows,pred)=>rows.filter(pred).length;
const seedHash=text=>{
 let h=2166136261;
 for(const ch of text)h=Math.imul(h^ch.charCodeAt(0),16777619);
 return h||1;
};
function nextRandom(seed){
 let state=seedHash(seed);
 return n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return Math.floor((state>>>0)*n/4294967296);};
}
const manaCost=/^(?:\{(?:\d+|[WUBRGC](?:\/[WUBRGC])?)\})+$/;
function compile(card,commander){
 const text=oracleText(card),land=isLandSlot(card),creature=castHasType(card,'Creature');
 const permanent=['Artifact','Creature','Enchantment','Planeswalker','Battle'].some(type=>castHasType(card,type));
 const single=!card.card_faces?.length;
 let source=single?sourceGrammar(card):null;
 const lines=text.split('\n');
 const unrestricted=!/spend this mana|only|unless|can't untap|doesn't untap|does not untap/i.test(text);
 if(!source&&single&&unrestricted){
  const manaLine=lines.find(line=>/^\{T\}: Add (?:one|two|three) mana of any (?:one )?color(?: in your commander's color identity)?\.$/.test(line));
  if(manaLine)source={options:manaLine.includes("commander's")?commander.color_identity||[]:COLORS,units:({one:1,two:2,three:3})[manaLine.match(/Add (\w+)/)[1]]};
 }
 if(source&&!source.options.length)source=null;
 const ramp=single&&text.match(/^Search your library for (?:a|up to (one|two)) (basic land|Plains|Island|Swamp|Mountain|Forest|Plains, Island, Swamp, or Mountain) cards?, put (?:it|them|that card|those cards) onto the battlefield( tapped)?, then shuffle\.(?:\s*\([^\n]*\))?$/i);
 const cultivate=single&&/^Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle\.$/i.test(text);
 const aura=single&&text.match(/^Enchant (land|Forest)\n(?:As this Aura enters, choose a color\.\n)?Whenever enchanted (?:land|Forest) is tapped for mana, (?:its controller adds|add) (?:an additional )?(\{[WUBRGC]\}|(?:one|two) mana of (?:any|that|the chosen) color)\.$/i);
 const double=single&&lines.some(line=>/^Whenever (?:you tap a land for mana, add|a player taps a land for mana, that player adds) (?:one|an additional|one additional) mana of any type that land produced\.$/i.test(line))?'plus':
  single&&lines.some(line=>/^If you tap a land for mana, it produces twice as much of that mana instead\.$/i.test(line))?'twice-land':
  single&&lines.some(line=>/^If you tap a permanent for mana, it produces twice as much of that mana instead\.$/i.test(line))?'twice-all':null;
 const earliestUntap=single&&lines.some(line=>/^When .+ enters(?: the battlefield)?, if you cast it, untap all lands you control\.$/.test(line));
 const draws=single&&text.match(/^Draw (a|one|two|three) cards?\.$/);
 const cost=single&&manaCost.test(card.mana_cost||'')&&!/additional cost|costs? .+ less|can't cast|cast this spell only/i.test(text)?card.mana_cost:null;
 const tapped=!!source?.tapped||/(?:^|\n)[^\n]+ enters(?: the battlefield)? tapped\.(?:$|\n)/.test(text);
 // Conditional land entry and alternative faces are held outside the casting model.
 if(land&&/enters[^\n]*(?:unless|if)|(?:as .* enters|enters.*you may pay)/i.test(text))source=null;
 const roles=roleEvidence(card);
 const modeled=!!(source||ramp||cultivate||aura||double||draws||earliestUntap);
 const residual=lines.some(line=>line.trim()&&!/^\{T\}: Add |^Enchant (?:land|Forest)$|^Whenever enchanted land is tapped|^When .+ enters(?: the battlefield)?, if you cast it, untap all lands you control\.|enters(?: the battlefield)? tapped\.$/.test(line));
 return {name:card.name,id:oracleId(card),colors:card.color_identity||[],land,creature,permanent,source,tapped,cost,
  basic:/\bBasic Land\b/.test(card.type_line||''),types:card.type_line||'',mv:card.cmc||0,
  ramp:cultivate?{quantity:2,type:'basic land',tapped:true,secondToHand:true}:ramp?{quantity:ramp[1]==='two'?2:1,type:ramp[2],tapped:!!ramp[3]}:null,
  aura:aura?{type:aura[1],color:aura[2].match(/\{(.)\}/)?.[1],units:aura[2].startsWith('two')?2:1,matching:/that color/i.test(aura[2])}:null,
  double,earliestUntap,draws:draws?({a:1,one:1,two:2,three:3}[draws[1]]):0,
  interaction:roles.removal==='broad'||roles.removal==='conditional',drawRole:roles.draw==='positive'||roles.draw==='engine-conditional',
  rampRole:!!(ramp||cultivate||aura||double||!land&&source||manaRole(card).effective),tutor:/search your library for (?:a|an|any) (?!basic |land |Forest |Island |Mountain |Plains |Swamp )[^.\n]*card/i.test(text),
  unsupported:!!text&&(!modeled||earliestUntap&&residual||!!double&&residual||!!source&&!sourceGrammar(card)&&residual&&lines.length>1)};
}

export function simulationSettings({trials=1000,seed='architect-v1'}={}){
 if(![100,500,1000].includes(trials)||typeof seed!=='string'||!seed.trim()||seed.length>100)
  throw Error('Choose 100, 500 or 1,000 trials and a seed of 1–100 characters.');
 return {trials,seed};
}
const affordable=(cost,sources)=>cost&&payment(cost,sources);
function payment(cost,sources){
 const symbols=cost.slice(1,-1).split('}{');
 const pips=symbols.filter(s=>!/^\d+$/.test(s));
 if(sources.reduce((n,s)=>n+s.units,0)<pips.length+symbols.filter(s=>/^\d+$/.test(s)).reduce((n,s)=>n+Number(s),0))return null;
 if(pips.some(p=>!sources.some(s=>p.split('/').some(c=>s.options.includes(c)))))return null;
 const out=allocateMana(cost,sources,{limit:240});
 return out.status==='supported'?out:null;
}
const hasC=(card,kind)=>card.types.split('—').at(-1).trim().split(/\s+/).some(type=>type.toLowerCase()===kind.toLowerCase());

function trial(compiled,commander,seed,index,combos){
 // Sorting beforehand makes the decklist's textual order immaterial. Both
 // compared decks use the same per-trial and per-mulligan random stream.
 let library,hand,attempt=0,opening=0,bottomed=0;
 for(;attempt<=3;attempt++){
  library=compiled.slice();
  const random=nextRandom(seed+':'+index+':'+attempt);
  for(let i=library.length-1;i>0;i--){const j=random(i+1);[library[i],library[j]]=[library[j],library[i]];}
  hand=library.splice(0,7);
  opening=count(hand,c=>c.land);
  if(opening>=2&&opening<=4||attempt===3)break;
 }
 bottomed=Math.max(0,attempt-1);
 for(let n=0;n<bottomed;n++){
  const excessLands=count(hand,x=>x.land)>3;
  const choices=hand.map((c,i)=>({c,i})).filter(({c})=>c.land===excessLands);
  choices.sort((a,b)=>b.c.mv-a.c.mv||a.i-b.i);
  library.push(hand.splice(choices[0]?.i??(hand.length-1),1)[0]);
 }
 const keptLands=count(hand,c=>c.land);
 const effectRandom=nextRandom(seed+':effects:'+index);
 const availableRoles=compiled.reduce((roles,card)=>{for(const role of roles.keys())if(card[role])roles.get(role).add(card.id);return roles;},new Map(['rampRole','drawRole','interaction','tutor'].map(role=>[role,new Set()])));
 const observed=new Set();
 const seen=new Map(),board=[],grave=new Map(),seenByTurn=[];
 const see=c=>{seen.set(c.id,(seen.get(c.id)||0)+1);for(const [role,ids] of availableRoles)if(ids.has(c.id))observed.add(role);};
 hand.forEach(see);
 let commanderTurn=null,drawn=0,rampTurn=null,postCastMana=0,landsSeen=count(hand,c=>c.land);
 const comboSeen=combos.map(()=>null),comboReady=combos.map(()=>null);
 for(let turn=1;turn<=TURNS;turn++){
  const draw=()=>{
   const c=library.shift();if(!c)return;
   hand.push(c);see(c);if(c.land)landsSeen++;
  };
  draw();
  const place=(card,tapped)=>board.push({card,tapped,id:board.length,entered:turn,attached:[]});
  for(const item of board)item.tapped=false;
  const landOptions=hand.map((c,i)=>({c,i})).filter(({c})=>c.land);
  // Prioritize usable untapped lands and currently missing commander colors.
  const colorNeed=new Set((commander.cost||'').match(/[WUBRGC]/g)||[]);
  for(const item of board)for(const c of item.card.source?.options||[])colorNeed.delete(c);
  const rank=({c})=>c.source?20-12*Number(c.tapped)+2*count(c.source.options,color=>colorNeed.has(color))+c.source.units:0;
  landOptions.sort((a,b)=>rank(b)-rank(a)||a.i-b.i);
  if(landOptions.length){const c=hand.splice(landOptions[0].i,1)[0];place(c,c.tapped);}
  let pool=[];
  function available(){
   const allDoubles=count(board,({card})=>card.double==='twice-all');
   const landDoubles=count(board,({card})=>card.double==='twice-land');
   const plus=count(board,({card})=>card.double==='plus');
   return [...pool,...board.flatMap(item=>{
    const {card,tapped,id,entered,attached}=item;
    if(tapped||!card.source||card.creature&&entered===turn)return [];
    const matching=attached.filter(a=>a.matching).reduce((n,a)=>n+a.units,0);
    const units=card.source.units*2**(allDoubles+(card.land?landDoubles:0))+(card.land?plus:0)+matching;
    const bonus=attached.filter(a=>!a.matching).flatMap(a=>Array(a.units).fill(a.color));
    if(!bonus.length)return [{id,options:card.source.options,units}];
    const outputs=card.source.options.map(color=>[...Array(units).fill(color),...bonus]);
    return [{id,options:[...new Set([...card.source.options,...bonus])],units:units+bonus.length,outputs}];
   })];
  }
  function pay(cost){
   const paid=affordable(cost,available());
   if(!paid)return false;
   for(const activation of paid.receipt){if(board[activation.source])board[activation.source].tapped=true;}
   pool=paid.pool.map((color,i)=>({id:'float-'+i,units:1,options:[color],floating:true}));
   return true;
  }
  const start=available(),mana=start.reduce((n,s)=>n+s.units,0);
  function tryCommander(){
   if(commanderTurn!==null||!pay(commander.cost))return;
   commanderTurn=turn;place(commander,false);
   if(commander.earliestUntap){for(const item of board)if(item.card.land)item.tapped=false;}
   postCastMana=available().reduce((n,s)=>n+s.units,0);
  }
  tryCommander();
  for(let action=0;action<6;action++){
   const candidates=hand.filter(c=>!c.land&&c.cost&&(c.ramp||c.aura||c.double||c.source||c.draws||
    combos.some(line=>line.pieces.some(piece=>piece.id===c.id&&piece.zoneLocations.includes('B')))));
   candidates.sort((a,b)=>Number(!a.rampRole)-Number(!b.rampRole)||a.mv-b.mv||a.name.localeCompare(b.name));
   let played=false;
   for(const c of candidates){
    const target=c.aura&&board.find(item=>item.card.land&&item.card.source&&(c.aura.type.toLowerCase()==='land'||hasC(item.card,c.aura.type)));
    if(c.aura&&!target||!pay(c.cost))continue;
    hand.splice(hand.indexOf(c),1);
    if(c.permanent)place(c,c.tapped);
    else grave.set(c.id,(grave.get(c.id)||0)+1);
    if(target)target.attached.push({...c.aura,color:c.aura.color||[...colorNeed].find(color=>color!=='C')||commander.colors[0]||'G'});
    if(c.ramp){
     for(let n=0;n<c.ramp.quantity;n++){
      const landIndex=library.findIndex(x=>x.land&&(c.ramp.type.toLowerCase()==='basic land'?x.basic:c.ramp.type.replace(', or ', ', ').split(', ').some(kind=>hasC(x,kind))));
      if(landIndex<0)break;
      const land=library.splice(landIndex,1)[0];see(land);landsSeen++;
      if(n===1&&c.ramp.secondToHand)hand.push(land);
      else place(land,land.tapped||c.ramp.tapped);
     }
     for(let i=library.length-1;i>0;i--){const j=effectRandom(i+1);[library[i],library[j]]=[library[j],library[i]];}
    }
    if(c.ramp||c.source||c.aura||c.double)rampTurn??=turn;
    for(let n=0;n<c.draws;n++){if(library.length){draw();drawn++;}}
    played=true;break;
   }
   if(!played)break;
   tryCommander();
  }
  for(let i=0;i<combos.length;i++){
   const line=combos[i];
   if(comboSeen[i]===null&&line.pieces.every(p=>p.inCommandZone||(seen.get(p.id)||0)>=p.quantity))comboSeen[i]=turn;
   if(comboReady[i]!==null||!line.simulatable||comboSeen[i]===null)continue;
   const zonesOK=line.pieces.every(p=>{
    const zones=p.zoneLocations.length?p.zoneLocations:['B'];
    const physical=(zones.includes('B')?count(board,x=>x.card.id===p.id):0)+(zones.includes('H')?count(hand,x=>x.id===p.id):0)+
     (zones.includes('G')?(grave.get(p.id)||0):0)+(zones.includes('C')&&p.inCommandZone&&commanderTurn===null?1:0);
    return physical>=p.quantity;
   });
   if(zonesOK&&(!line.manaNeeded||affordable(line.manaNeeded,available())))comboReady[i]=turn;
  }
  seenByTurn.push({lands:count(board,x=>x.card.land),mana,landsSeen,ramp:observed.has('rampRole'),draw:observed.has('drawRole'),
   interaction:observed.has('interaction'),tutor:observed.has('tutor')});
 }
 return {opening:keptLands,bottomed,attempt,commanderTurn,drawn,rampTurn,postCastMana,seenByTurn,comboSeen,comboReady,
  flood:seenByTurn[5].landsSeen>=8,screw:seenByTurn[3].lands<3};
}

export function simulateArchitectDeck({commander,cards,combos=[]},options={}){
 return simulateArchitectSample({commander,cards,combos},options).result;
}

function alignedSlots(compiled,referenceCards){
 const available=new Map();
 for(const card of compiled){
  const copies=available.get(card.id)||[];
  copies.push(card);
  available.set(card.id,copies);
 }
 // Shared cards occupy the same pre-shuffle indices in both decks. A
 // replacement takes a vacant slot without moving the rest of the library.
 const ids=referenceCards.map(oracleId).sort((a,b)=>String(a).localeCompare(String(b)));
 const slots=ids.map(id=>available.get(id)?.pop());
 const replacements=[...available.values()].flat();
 return slots.map(card=>card??replacements.shift());
}

export function simulateArchitectSample({commander,cards,combos=[]},options={}){
 if(!commander||cards?.length!==99)throw Error('Simulation requires a validated commander and 99 cards.');
 const {trials,seed}=simulationSettings(options);
 const cmd=compile(commander,commander);
 const sorted=cards.map(c=>compile(c,commander)).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const compiled=options.referenceCards?alignedSlots(sorted,options.referenceCards):sorted;
 const lines=combos.slice(0,12).map(line=>({...line,simulatable:!line.templateRequirements.length&&!line.prerequisites.some(s=>s.trim()&&s.trim()!==line.manaNeeded)&&
  line.pieces.every(p=>p.zoneLocations.every(z=>['B','H','G','C'].includes(z))&&!p.battlefieldCardState&&!p.graveyardCardState)&&
  (!line.manaNeeded||manaCost.test(line.manaNeeded))&&new Set(line.pieces.map(p=>p.id)).size===line.pieces.length}));
 const runs=Array.from({length:trials},(_,i)=>trial(compiled,cmd,seed,i,lines));
 const pct=n=>round(n*100/trials);
 const average=values=>values.length?round(values.reduce((a,b)=>a+b,0)/values.length):null;
 const turns=Array.from({length:TURNS},(_,i)=>{
  const rows=runs.map(r=>r.seenByTurn[i]);
  return {turn:i+1,lands:average(rows.map(r=>r.lands)),mana:average(rows.map(r=>r.mana)),
   rampSeenPct:pct(count(rows,r=>r.ramp)),drawSeenPct:pct(count(rows,r=>r.draw)),interactionSeenPct:pct(count(rows,r=>r.interaction)),tutorSeenPct:pct(count(rows,r=>r.tutor))};
 });
 const cast=runs.map(r=>r.commanderTurn).filter(n=>n!==null);
 const byCombo=lines.map((line,i)=>{
  const seen=runs.map(r=>r.comboSeen[i]).filter(n=>n!==null),ready=runs.map(r=>r.comboReady[i]).filter(n=>n!==null);
  return {id:line.id,url:line.url,pieces:line.pieces.map(p=>p.name),outcomes:line.results,
   prerequisites:line.prerequisites,requiredMana:line.manaNeeded,commander:line.commanderInvolved,relationship:line.relationship,
   kind:line.directWin?'Direct win':line.delayedWin?'Delayed win':'Engine or value',piecesSeenPct:pct(seen.length),
   averagePiecesTurn:average(seen),startingStatePct:line.simulatable?pct(ready.length):null,averageStartingStateTurn:average(ready)};
 }).sort((a,b)=>(b.startingStatePct??-1)-(a.startingStatePct??-1)||b.piecesSeenPct-a.piecesSeenPct);
 const result={trials,seed,turnLimit:TURNS,turns,commander:cmd.name,opening:{
   averageLands:average(runs.map(r=>r.opening)),twoToFourLandsPct:pct(count(runs,r=>r.opening>=2&&r.opening<=4)),averageMulligans:average(runs.map(r=>r.attempt)),
   averageCardsKept:average(runs.map(r=>7-r.bottomed))},
  commanderCastPct:pct(cast.length),commanderCastInterval95:wilson(cast.length,trials).map(p=>round(p*100)),
  averageCommanderTurn:average(cast),averageManaAfterCommander:average(runs.filter(r=>r.commanderTurn!==null).map(r=>r.postCastMana)),
  averageExtraCardsDrawn:average(runs.map(r=>r.drawn)),rampPlayedByTurnThreePct:pct(count(runs,r=>r.rampTurn!==null&&r.rampTurn<=3)),
  screwPct:pct(count(runs,r=>r.screw)),floodPct:pct(count(runs,r=>r.flood)),
  manaCurve:Object.fromEntries(Array.from({length:8},(_,n)=>[n===7?'7+':n,count(compiled,c=>!c.land&&Math.min(7,Math.floor(c.mv))===n)])),
  supported:{castUntapsLands:cmd.earliestUntap,manaSources:count(compiled,c=>!!c.source),landSearch:count(compiled,c=>!!c.ramp),landAuras:count(compiled,c=>!!c.aura),doublers:count(compiled,c=>!!c.double)},
  combo:byCombo,unsupportedCards:[...new Set([cmd,...compiled].filter(c=>c.unsupported).map(c=>c.name))]};
 return {result,runs};
}
