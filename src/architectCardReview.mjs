import {castFaces,castHasSubtype,hasTypeLine,isCommander,isLandSlot,landFaces,landManaQuality,legalFor} from './cards.mjs';
import {snowManaSource} from './selectionPolicy.mjs';

const colors={W:'white',U:'blue',B:'black',R:'red',G:'green',C:'true colorless',S:'snow'};
const quantities={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
const quantity=word=>quantities[word.toLowerCase()]??Number(word);
const amount='a|an|one|two|three|four|five|six|seven|eight|nine|ten|[1-9][0-9]*';
const boardCost=new RegExp(
 '^(tap|sacrifice) (?:(another) |('+amount+') )(?:untapped )?(?:(nontoken) )?(?:(white|blue|black|red|green|colorless) )?(creatures?|artifacts?|enchantments?|lands?|permanents?)(?: you control)?(?=[,.]|$)','i');
const tokenOutput=new RegExp('^(?:up to )?('+amount+'|X|that many) (.+)$','i');
const drawCount=new RegExp('^draw ('+amount+') cards?\\b','i');
const drawsCards=new RegExp('\\bdraw ('+amount+') cards?\\b','i');
const discardCount=new RegExp('\\bdiscard ('+amount+')(?: [\\w-]+){0,2} cards?\\b','i');
const discardExchange=/\b(?:discard (?:up to )?[^.;\n]*?cards?, then draw that many cards|draw (?:up to )?[^.;\n]*?cards?, then discard that many cards)\b/i;
const sameNamedCard=/\b(?:discard|exile|reveal) (?:a|an) (?:legendary )?card with the same name as (?:an?|another) (legendary )?(?:card|permanent|creature) you control\b/i;
const emptyHand=/\bdraw[^.\n]*\bif (?:you (?:had|have) no cards in hand|your hand (?:was|is) empty)|\bif (?:you (?:had|have) no cards in hand|your hand (?:was|is) empty)[^.;\n]*\bdraw/i;
const graveyardPayoff=/\b(?:madness|dredge|disturb|escape|retrace|flashback|unearth|jump-start|embalm|eternalize)\b|when(?:ever)? (?:you discard|[^.\n]* is discarded)|\b(?:return|cast|play|put) [^.\n]*(?:from your graveyard|in your graveyard (?:to|onto|without))|\bfor each card in your graveyard/i;
const teamCounters=/\b(?:put|distribute) [^.\n]*\+1\/\+1 counter[^.\n]*(?:on each creature you control|among creatures you control)/i;
const counterPayoff=/\bwhenever [^.\n]*counter[^.\n]* (?:placed|put)|counters? (?:would be|are) put|proliferate|creature[^.\n]*with (?:a|one or more) \+1\/\+1 counter/i;
const bodyPayoff=/creature tokens?|creatures you control get|for each creature (?:token )?you control/i;
const lifeReset=/each player's life total becomes the number of creatures they control/i;
const variableFinish=/\b(?:deals? X damage to (?:each opponent|any target|each of them)|each opponent loses X life|creatures you control get \+X\/\+X[^.\n]* gain (?:haste|trample))\b/i;
const opposingDrawTrigger=/\bwhenever (?:an opponent|a player|one or more opponents) draws?\b/i;
const predefinedArtifact=/\b(?:Blood|Clue|Food|Gold|Incubator|Junk|Map|Powerstone|Scrap|Treasure)\s*$/i;
const impactRoles={
 mana:'Mana development',ramp:'Ramp',draw:'Card access',tutor:'Tutoring / assembly',
 protection:'Protection',interaction:'Interaction',finish:'Win conversion',
};

function colorNames(face,card){
 const printed=face.colors??(face===card||castFaces(card).length===1?card.colors:undefined);
 if(Array.isArray(printed))return printed.length?printed.map(color=>colors[color]).filter(Boolean):['colorless'];
 if(/(?:^|\n)Devoid\b/i.test(face.oracle_text||''))return ['colorless'];
 const pips=[...(face.mana_cost||'').matchAll(/\{([^}]+)\}/g)].flatMap(([,symbol])=>symbol.split('/'));
 const names=[...new Set(pips.filter(pip=>pip in colors&&pip!=='C'&&pip!=='S').map(pip=>colors[pip]))];
 return names.length?names:['colorless'];
}

function tokenBodies(text,mv){
 const tokens=[];
 // A printed Create clause gives inventory evidence. Opponents' and quoted
 // token effects are not attributed to the card's controller.
 for(const line of text.split('\n')){
  const statements=line.replace(/"[^"]*"|“[^”]*”/g,'').split(/(?<=\.)\s+/);
  for(const statement of statements){
   if(/(?:opponents?|target player|each player) (?:may )?creates?\b/i.test(statement))continue;
   const make=statement.match(/(?:^|[:,]\s*(?:you may )?|\bthen |\band )create ([^.\n]*)\btokens?\b/i)?.[1];
   const descriptor=make?.match(tokenOutput);
   if(!descriptor)continue;
   const types=['artifact','enchantment','land','creature'].filter(type=>new RegExp('\\b'+type+'\\b','i').test(descriptor[2]));
   if(!types.includes('artifact')&&predefinedArtifact.test(descriptor[2]))types.push('artifact');
   if(!types.length)continue;
   const names=[...Object.values(colors),'colorless'].filter(color=>new RegExp('\\b'+color+'\\b','i').test(descriptor[2]));
   if(!names.length&&predefinedArtifact.test(descriptor[2]))names.push('colorless');
   const activatedMana=statement.split(':')[0].match(/\{([1-9][0-9]*)\}/g)?.reduce((n,symbol)=>n+Number(symbol.slice(1,-1)),0)||0;
   const late=/\b(?:at the beginning|attacks|dies|end step|upkeep|only if|unless|for each)\b/i.test(line)?1:0;
   tokens.push({types,colors:names,count:quantity(descriptor[1]),token:true,mv:mv+late+(statement.includes(':')?activatedMana:0),
    repeatable:/\bwhenever\b/i.test(line)||statement.includes(':')&&!/\bsacrifice\b/i.test(statement.split(':')[0])});
  }
 }
 return tokens;
}

function readCosts(text){
 const lines=text.split('\n');
 const board=[...text.matchAll(/as an additional cost to cast [^,.\n]+, ([^.\n]+)/gi)].map(([,cost])=>cost);
 const activated=lines.flatMap(line=>{
  const m=line.match(/^(?:[•−-]\s*)?((?:\{[^}]+\}|(?:tap|sacrifice|discard|exile|remove|pay)\b)[^.:\n]*):\s*(.+)/i);
  return m?[{cost:m[1],body:m[2]}]:[];
 });
 const alternateBoard=text.match(/\byou may ((?:tap|sacrifice) [^.\n]+?) rather than pay (?:this spell's|its) mana cost/i)?.[1];
 const alternate=/\b(?:rather than pay|without paying) (?:this spell's|its) mana cost|\b(?:convoke|delve|improvise)\b/i.test(text);
 return {board,activated,alternate,alternateBoard};
}

function accessTradeoffs(faces){
 const draw=faces.flatMap(face=>{
  const expense=face.board.reduce((n,cost)=>n+(quantity(cost.match(discardCount)?.[1]||'0')||0),0);
  return face.text.split(/\n|(?<=\.)\s+/).map(line=>line.trim().replace(/^•[^—\n]+—\s*/,'')).filter(line=>drawCount.test(line)).map(line=>({
   own:quantity(line.match(drawCount)[1]),expense:expense+(quantity(line.match(discardCount)?.[1]||'0')||0),
  }));
 });
 const opponent=faces.some(({text})=>/\b(?:target|each|an?|all) opponents? draws? (?:a|one|two|three|[1-9]) cards?\b/i.test(text));
 return {draw,opponent};
}

/** Conservative printed-cost and role audit. Known unsupported requirements
 * affect selection. Unmodeled game states remain advisory. */
export function createArchitectCardReview(commander,profileFor,onPlan){
 const facts=new Map();
 function inspect(card){
  if(facts.has(card))return facts.get(card);
  const mv=Number(card.cmc)||0;
  const fs=castFaces(card).filter(face=>!hasTypeLine(face.type_line||card.type_line,'Land'));
  const faces=fs.map(face=>{
   const text=face.oracle_text??card.oracle_text??'';
   return {text,printed:face.mana_cost??card.mana_cost??'',...readCosts(text),
    castingRestriction:/\bcast (?:this spell|this card|it) only (?:if|during|when|from|after|before|on|while)|\b(?:this spell|this card) can't be cast (?:except|unless)/i.test(text)};
  });
  const bodies=fs.flatMap(face=>{
   const typeLine=face.type_line||card.type_line;
   const types=['Artifact','Enchantment','Creature','Planeswalker','Battle','Land'].filter(type=>hasTypeLine(typeLine,type));
   return types.length?[{types:types.map(type=>type.toLowerCase()),colors:colorNames(face,card),count:1,mv}]:[];
  });
  if(isLandSlot(card))bodies.push({types:['land'],colors:['colorless'],count:1,mv:0});
  const text=faces.map(face=>face.text).join('\n');
  const mana=landManaQuality(card);
  const outputs=(!mana.restricted&&!mana.unusable?[...mana.colors,...(mana.canC?['C']:[])]:[])
   .concat(snowManaSource(card)?['S']:[]);
  const row={card,mv,faces,text,bodies:bodies.concat(tokenBodies(text,mv)),outputs,
   access:accessTradeoffs(faces),emptyHand:emptyHand.test(text),discardExchange:discardExchange.test(text),graveyard:graveyardPayoff.test(text),
   opposingDraw:opposingDrawTrigger.test(text),
   counterPayoff:counterPayoff.test(text),teamCounters:teamCounters.test(text),bodyPlan:bodyPayoff.test(text),
   lifeReset:lifeReset.test(text),variableFinish:variableFinish.test(text),
   blockerType:text.match(/\b(?:that were|that became) blocked by (?:target|an?) ([A-Z][A-Za-z]+)\b/)?.[1],
   colorShift:/\b(?:becomes?|(?:creatures?|permanents?|tokens?) (?:you control )?are) (?:all colors|the color|white|blue|black|red|green|colorless)\b/i.test(text)};
  facts.set(card,row);
  return row;
 }
 function context(cards,comboDetails,manaSources){
  const rows=[commander,...cards].map(inspect);
  const command=rows[0];
  const routeCards=new Set(comboDetails.flatMap(line=>[
   ...line.pieces.map(piece=>piece.name),...line.templateMatches,...line.supportingCards.flatMap(item=>item.cards)
  ]));
  const sources=new Map(Object.keys(colors).map(symbol=>[symbol,new Set()]));
  const copies=new Map();
  for(const row of rows)copies.set(row,(copies.get(row)||0)+1);
  for(const row of rows)for(const symbol of row.outputs)sources.get(symbol)?.add(row);
  return {rows,command,routeCards,sources,manaSources,copies,
   infiniteMana:comboDetails.some(line=>line.infinite&&line.kinds.includes('mana')),
   bodies:rows.filter(row=>row!==command&&row.bodies.some(body=>body.types.includes('creature'))).length,
   counterPayoffs:rows.filter(row=>row.counterPayoff).length,
   opposingDrawPayoffs:rows.filter(row=>row.opposingDraw).length,
   earlySpells:rows.filter(row=>row.mv>0&&row.mv<=2).length,
   emptyPayoffs:rows.filter(row=>row.emptyHand).length,
   graveyardPayoffs:rows.filter(row=>row.graveyard).length};
 }
 function boardEvidence(cost,row,deck,{casting=false}={}){
  const payment=cost.match(boardCost);
  if(!payment)return null;
  const verb=payment[1].toLowerCase(), count=payment[2]?1:quantity(payment[3]);
  const nontoken=!!payment[4], color=payment[5]?.toLowerCase(), type=payment[6].toLowerCase().replace(/s$/,'');
  const selfAllowed=!casting&&!payment[2];
  const needs=`${verb} ${count} ${[color,type].filter(Boolean).join(' ')}${count===1?'':'s'}`;
  const earlyCeiling=Math.max(4,row.mv+1);
  let early=0,total=0,variable=false;
  for(const provider of deck.rows){
   if(provider===row&&!selfAllowed)continue;
   const matches=provider.bodies.filter(body=>(!color||body.colors.includes(color))&&(!nontoken||!body.token)&&
    (type==='permanent'||body.types.includes(type)));
   // One physical card cannot be on the board as both of its faces.
   const available=eligible=>Math.max(0,...eligible.filter(body=>!body.token).map(body=>body.count))+
    eligible.filter(body=>body.token&&Number.isFinite(body.count)).reduce((n,body)=>n+body.count,0);
   total+=available(matches);
   early+=available(matches.filter(body=>body.mv<=earlyCeiling));
   variable||=matches.some(body=>body.repeatable||!Number.isFinite(body.count))||!!color&&provider.colorShift;
  }
  const evidence=`Requires you to ${needs}. The list has ${early} early and ${total} total qualifying bodies from its known cards and fixed token outputs.`;
  if(total<count&&!variable)return {state:'unsupported',reason:evidence};
  if(early<count||early<count*2)return {state:'situational',reason:evidence+(variable?' Variable or repeatable setup is possible.':' Setup depends on drawing a large share of that support.')};
  return {state:'supported',reason:evidence};
 }
 function manaEvidence(printed,row,deck,{casting=false}={}){
  const requirements=[...printed.matchAll(/\{([WUBRGCS](?:\/[WUBRGCS])?)\}/g)].map(([,symbol])=>symbol.split('/'));
  const missing=requirements.filter(pips=>!pips.some(symbol=>{
   const count=deck.sources.get(symbol).size-Number(casting&&deck.sources.get(symbol).has(row));
   return count>0||Number(deck.manaSources[symbol])>0;
  }));
  if(missing.length)return {state:'unsupported',reason:'No supported '+[...new Set(missing.flat())].map(symbol=>colors[symbol]).join('/')+' mana channel for '+printed+'.'};
  const costs=Object.fromEntries(Object.keys(colors).map(symbol=>[symbol,requirements.filter(pips=>pips.length===1&&pips[0]===symbol).length]));
  const thin=Object.entries(costs).filter(([symbol,n])=>n&&symbol!=='S'&&symbol!=='C'&&
   (deck.manaSources[symbol]??0)<Math.min(7,2+n*2));
  if(thin.length)return {state:'situational',reason:'Thin land coverage for '+thin.map(([symbol])=>colors[symbol]).join('/')+' mana in '+printed+'.'};
  return null;
 }
 function assess(card,deck){
  const row=inspect(card),{faces,text,access}=row, reasons=[],casting=[],activation=[];
  const effects={...profileFor(card).effects};
  const knownRoute=deck.routeCards.has(card.name);
  const strategy=onPlan(card);
  if(isLandSlot(card))effects.mana=1;
  if(strategy.roles.includes('finisher'))effects.finish=Math.max(.7,effects.finish||0);
  let status='strong',drawTradeoff=false;
  const land=isLandSlot(card);
  const casts=faces.map(face=>{
   const needs=face.board.map(cost=>boardEvidence(cost,row,deck,{casting:true})||
    {state:'situational',reason:'Additional casting cost: '+cost+'.'});
   const mana=manaEvidence(face.printed,row,deck,{casting:true});
   if(mana)needs.push(face.alternate?{...mana,state:'situational'}:mana);
   if(face.castingRestriction)needs.push({state:'situational',reason:'Oracle text restricts when or from where this spell can be cast.'});
   return needs;
  });
  casting.push(...casts.flat().map(item=>item.reason));
  for(const {alternateBoard} of faces){
   const condition=alternateBoard&&boardEvidence(alternateBoard,row,deck,{casting:true});
   if(condition)casting.push('Optional alternative cost. '+condition.reason);
  }
  if(!land&&casts.length&&casts.every(needs=>needs.some(item=>item.state==='unsupported'))){
   status='uncastable';
   reasons.push(...new Set(casting));
  }else if(!land&&casts.length&&casts.every(needs=>needs.some(item=>item.state!=='supported'))){
   status='situational';
  }
  const abilities=[...faces.flatMap(face=>face.activated),...landFaces(card).flatMap(face=>readCosts(face.oracle_text||'').activated)];
  const checks=abilities.map(({cost})=>{
   const board=cost.split(/,\s*/).map(part=>boardEvidence(part,row,deck)).filter(Boolean);
   const mana=manaEvidence((cost.match(/\{[0-9WUBRGCS/]+\}/g)||[]).join(''),row,deck);
   if(mana)board.push(mana);
   const matching=sameNamedCard.exec(cost);
   if(matching&&![...deck.copies].some(([provider,n])=>n>1&&(!matching[1]||hasTypeLine(provider.card.type_line,'Legendary')))){
    board.push({state:'unsupported',reason:'Activation needs matching card names in hand and on the battlefield. The list has no qualifying duplicates.'});
   }
   if(!board.length&&/\b(?:discard|exile|remove|sacrifice|pay)\b/i.test(cost))
    board.push({state:'situational',reason:'Activated ability requires '+cost+'.'});
   return board;
  });
  activation.push(...new Set(checks.flat().map(item=>item.reason)));
  if(status==='strong'&&(activation.length||casting.length))status='situational';
  if(!land&&!knownRoute&&status!=='uncastable'){
   const handPlan=deck.command.emptyHand||deck.emptyPayoffs>=3||deck.earlySpells>=30;
   const discardPlan=deck.command.graveyard||deck.graveyardPayoffs-(row.graveyard?1:0)>=4;
   const boardPlan=deck.command.bodyPlan||deck.bodies>=18||deck.counterPayoffs-(row.counterPayoff?1:0)>=3;
   if(row.emptyHand){
    drawTradeoff=true;
    status=handPlan?'situational':'weak-synergy';
    effects.draw=Math.min(effects.draw||0,handPlan?.65:0);
    reasons.push(handPlan?'Empty-hand draw has support from the deck’s resource plan.':
     'Draw requires starting the turn with an empty hand. The deck lacks a reliable empty-hand plan.'+
     (/deals? [^.\n]*damage to you/i.test(text)?' A missed trigger deals damage to you.':''));
   }else if(row.discardExchange||access.draw.length&&access.draw.every(mode=>mode.own-mode.expense<=1)&&access.draw.some(mode=>mode.expense>0)){
    const otherJob=Object.entries(effects).some(([role,value])=>role!=='draw'&&value>0)||strategy.roles.includes('outlet');
    drawTradeoff=true;
    status=discardPlan||otherJob?'situational':'weak-synergy';
    effects.draw=Math.min(effects.draw||0,discardPlan?.65:.18);
    reasons.push((row.discardExchange?'The draw replaces the discarded cards.':'After the spell and its discard cost, the draw only replaces the cards spent.')+
     (discardPlan?' Discard or graveyard synergies give the exchange a purpose.':otherJob?' The card also has another deck job.':' The list lacks a supported discard or graveyard payoff.'));
   }else if(access.opponent&&row.teamCounters){
    const drawSynergy=deck.command.opposingDraw||deck.opposingDrawPayoffs>=3;
    drawTradeoff=true;
    status=boardPlan||drawSynergy?'situational':'weak-synergy';
    effects.draw=Math.min(effects.draw||0,boardPlan||drawSynergy?.8:.35);
    reasons.push('The draw mode gives an opponent a card. '+(boardPlan?'The creature or counter plan supports the team mode.':
     drawSynergy?'The deck has triggered payoffs when opponents draw.':
      `The ${deck.bodies} creature or token-producing slots and counter support give the team mode few reliable targets.`));
   }
   const activeDraw=abilities.map(({cost,body},i)=>({cost,checks:checks[i]})).filter((_,i)=>drawsCards.test(abilities[i].body));
   const separateDraw=faces.some(face=>face.text.split('\n').some(line=>/\bdraw (?:a|two|three|four|[1-9]) cards?\b/i.test(line)&&
    !face.activated.some(({body})=>line.endsWith(body))));
   if(activeDraw.length&&!separateDraw){
    const available=activeDraw.filter(ability=>!ability.checks.some(item=>item.state==='unsupported'));
    const investment=available.map(({cost})=>[...cost.matchAll(/\{([^}]+)\}/g)].reduce((n,[,symbol])=>
     n+(/^\d+$/.test(symbol)?Number(symbol):symbol==='T'?0:1),0));
    if(!available.length||Math.min(...investment)>=3){
     drawTradeoff=true;
     effects.draw=Math.min(effects.draw||0,available.length?.3:0);
     reasons.push(available.length?'Card draw requires a separate activation of at least three mana.':
      'The list lacks the resources for this card’s draw activation.');
    }
   }
   if(row.blockerType&&!deck.rows.some(provider=>castHasSubtype(provider.card,row.blockerType))){
    status='weak-synergy';
    effects.interaction=0;
    reasons.push(`The answer depends on a ${row.blockerType} blocking in combat. The list has no card of that creature type.`);
   }
  }
  if(row.lifeReset&&status!=='uncastable'){
   status='situational';
   effects.finish=Math.max(effects.finish||0,.55);
   reasons.push('The symmetric life reset can convert a favorable creature board into a finish. Opponents’ creature counts determine the result.');
  }
  if(row.variableFinish&&status!=='uncastable'){
   status='situational';
   effects.finish=Math.max(effects.finish||0,deck.infiniteMana?1.6:.55);
   reasons.push(deck.infiniteMana?'This payoff can spend mana from a published infinite-mana route. Check the route’s colors and timing.':
    'This payoff needs a large mana investment to function as a finish.');
  }
  if(!knownRoute&&faces.length>0&&faces.every(face=>face.board.some(cost=>/^sacrifice\b/i.test(cost)))){
   // Preserve genuinely supported sacrifice plans. Other decks give up a
   // permanent whenever they cast this spell, even when payment is possible.
   const resupply=deck.command.bodyPlan||deck.bodies>=18;
   if(!resupply)for(const key of Object.keys(effects))effects[key]*=.65;
  }
  const primaryUnsupported=checks.length>0&&checks.every(items=>items.some(item=>item.state==='unsupported'))&&
   !land&&!knownRoute&&faces.every(face=>face.text.split('\n').every(line=>!line.trim()||
    face.activated.some(({cost})=>line.startsWith(cost+':'))||/^\(/.test(line)));
  if(primaryUnsupported&&status!=='uncastable'){
   status='weak-synergy';
   reasons.push('The card’s modeled value requires an unsupported activation.',...activation);
  }
  if(!(card===commander?isCommander(card):legalFor(card,commander)))status='illegal';
  if(status==='illegal')reasons.unshift('The current catalog or commander color identity excludes this card.');
  const inactive=status==='illegal'||status==='uncastable'||primaryUnsupported;
  if(inactive)for(const key of Object.keys(effects))effects[key]=0;
  const jobs=Object.entries(effects).filter(([,value])=>value>0).map(([key])=>impactRoles[key]);
  if(knownRoute)jobs.push('Published combo package');
  if(card===commander||strategy.roles.length)jobs.push('Commander strategy');
  if(!jobs.length&&status==='strong')status='situational';
  if(!reasons.length)reasons.push(knownRoute?'Has a role in a published combo supported by this list.':
   casting[0]||activation[0]||(jobs.length?'Contributes a supported deck function.':'The local rules could not establish a repeatable strategic role.'));
  return {card:card.name,status,reasons:[...new Set(reasons)],casting:[...new Set(casting)],activation,jobs,effects,inactive,drawTradeoff};
 }
 return {
  evaluate(cards,{details=[],manaSources={}}={}){
   const deck=context(cards,details,manaSources),byCard=new Map(),entries=[];
   for(const row of deck.rows){
    if(byCard.has(row.card)){byCard.get(row.card).quantity++;continue;}
    const entry={...assess(row.card,deck),quantity:1};
    byCard.set(row.card,entry);
    entries.push(entry);
   }
   const counts=Object.fromEntries(['illegal','uncastable','weak-synergy','situational','strong'].map(status=>[status,
    entries.filter(entry=>entry.status===status).reduce((n,entry)=>n+entry.quantity,0)]));
   const report={checked:deck.rows.length,counts,manaSources,entries:entries.map(({effects,inactive,drawTradeoff,...entry})=>entry),
    comboRoutes:new Set(details.map(line=>line.id)).size,
    winConditions:entries.filter(entry=>!entry.inactive&&entry.jobs.includes(impactRoles.finish)).map(entry=>entry.card)};
   return {report,byCard};
  },
 };
}
