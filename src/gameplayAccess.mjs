/** Explicit stateful access grammar. No role tags, scores or card-name cases. */
import {cardText, cardTypes, cardSubtypes, front, isColorless, isCreature} from './gameplayCards.mjs';
import {singletonName} from './deckValidation.mjs';
const numbers={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7};
const number=s=>numbers[s.toLowerCase()]||Number(s);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function withoutReminder(text) {
  let depth=0, out='';for(const ch of text){if(ch==='(')depth++;else if(ch===')')depth=Math.max(0,depth-1);else if(!depth)out+=ch;}
  return out.trim();
}
export function printedManaValue(card) {
  const cost=front(card).mana_cost;
  if(cost==null)return null;
  const symbols=[...cost.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]);
  if(symbols.some(s=>!/^\d+$|^[WUBRGC](?:\/[WUBRGC])?$/.test(s)))return null;
  return symbols.reduce((n,s)=>n+(/^\d+$/.test(s)?Number(s):1),0);
}
/** Parse an entire effect, not a draw substring inside quoted/granted text. */
export function accessEffects(input) {
  let text=withoutReminder(input).trim(), effects=[];
  while(text) {
    let m;
    if((m=text.match(/^(?:You )?(?:may )?draw (a|one|two|three|four|five|six|seven|[1-7]) cards?\b/i)))effects.push({kind:'draw',count:number(m[1])});
    else if((m=text.match(/^(scry|surveil) ([1-4])\b/i)))effects.push({kind:m[1].toLowerCase(),count:+m[2]});
    else if((m=text.match(/^discard (a|one|two|three|[1-3]) cards?\b/i)))effects.push({kind:'discard',count:number(m[1])});
    else if((m=text.match(/^put (a|one|two|[1-2]) cards? from your hand on top of your library\b/i)))effects.push({kind:'handTop',count:number(m[1])});
    else if((m=text.match(/^(?:you )?lose ([1-4]) life\b/i)))effects.push({kind:'loseLife',count:+m[1]});
    else if((m=text.match(/^exile the top card of your library\b/i)))effects.push({kind:'exileTop',count:1});
    else if((m=text.match(/^(?:Target opponent|The player to your right) gains control of (?:this creature|this artifact)\b/i)))effects.push({kind:'giveAway',count:1});
    else return null;
    text=text.slice(m[0].length).replace(/^(?:[.,]\s*(?:then |and )?|\s+and\s+)/i,'').trim();
  }
  return effects.length?effects:null;
}
function castFilter(descriptor) {
  let s=descriptor.toLowerCase().trim(), minMV=null;
  const mv=s.match(/ with mana value (\d+) or (?:greater|more)$/);if(mv){minMV=+mv[1];s=s.slice(0,mv.index);}
  s=s.replace(/^(?:a|an) /,'');
  if(!s.endsWith('spell'))return null;s=s.slice(0,-5).trim();
  const parts=s.split(/\s+/).filter(Boolean);if(parts.length>2)return null;
  const allowed=['creature','artifact','enchantment','noncreature','colorless','historic'];
  const subtype=parts.find(p=>!allowed.includes(p));
  if(subtype&&!/^[a-z]+$/.test(subtype))return null;
  return {parts,minMV};
}
export function matchesCastFilter(card, filter) {
  return (!filter.minMV||printedManaValue(card)!==null&&printedManaValue(card)>=filter.minMV)&&filter.parts.every(p=>{
    if(p==='noncreature')return !isCreature(card);
    if(p==='colorless')return isColorless(card);
    if(p==='historic')return cardTypes(card).includes('Artifact')||cardTypes(card).includes('Legendary')||cardSubtypes(card).includes('Saga');
    if(['creature','artifact','enchantment'].includes(p))return cardTypes(card).some(t=>t.toLowerCase()===p);
    return cardSubtypes(card).some(t=>t.toLowerCase()===p);
  });
}
export function accessModel(card) {
  const text=withoutReminder(cardText(card)), self=`(?:this (?:creature|artifact|enchantment|land)|${escape(front(card).name||card.name)})`;
  const triggers=[],abilities=[],unknown=[];let top=null, lookTop=false;
  const direct=accessEffects(text);
  for(const line of text.split('\n').map(s=>s.trim()).filter(Boolean)) {
    let m, handled=false;
    if(line==='You may look at the top card of your library any time.'){lookTop=true;handled=true;}
    if((m=line.match(/^You may cast (artifact spells and colorless spells|artifact spells|colorless spells|creature spells|spells) from the top of your library\.$/))) {top=m[1];handled=true;}
    const combined=line.match(new RegExp(`^When ${self} enters and whenever you cast (.+?), (.+)$`));
    if(combined) {
      const effects=accessEffects(combined[2]),filter=castFilter(combined[1]);
      if(effects&&filter){triggers.push({phase:'entrySelf',effects},{phase:'cast',filter,effects});handled=true;}
    }
    if(!handled&&(m=line.match(/^Whenever you cast (.+?), (.+)$/))) {
      const filter=castFilter(m[1]),effects=accessEffects(m[2]);if(filter&&effects){triggers.push({phase:'cast',filter,effects});handled=true;}
    }
    if(!handled&&(m=line.match(new RegExp(`^When ${self} enters, (.+)$`)))) {
      let effect=m[1],condition=null;const power=effect.match(/^if you control a creature with power (\d+) or greater, (.+)$/);
      if(power){condition={kind:'power',min:+power[1]};effect=power[2];}
      const effects=accessEffects(effect);if(effects){triggers.push({phase:'entrySelf',condition,effects});handled=true;}
    }
    if(!handled&&(m=line.match(/^Whenever (a|another) (nontoken )?creature you control( of the chosen type| with power \d+ or greater)? enters(?: or attacks)?, (.+)$/))) {
      let effect=m[4],singleton=false;
      const unique="if it doesn't have the same name as another creature you control or a creature card in your graveyard, ";
      if(effect.startsWith(unique)){singleton=true;effect=effect.slice(unique.length);}
      const effects=accessEffects(effect);
      if(effects){triggers.push({phase:'entry',another:m[1]==='another',nontoken:!!m[2],chosen:!!m[3]?.includes('chosen'),power:m[3]?.match(/power (\d+)/)?.[1]*1||0,singleton,effects});handled=true;if(/or attacks/.test(line))unknown.push({line,reason:'combat branch not simulated; entry branch supported'});}
    }
    if(!handled&&(m=line.match(/^(.+?): (.+)$/))&&!line.includes('"')) {
      let cost=m[1].replace(/^[\w ]+ — /,''),body=m[2],condition=null,once=false;
      const restrictions=[
        [/\. Activate only during your turn\.$/,()=>{}],
        [/\. Activate only once each turn\.$/,()=>{once=true;}],
        [/\. Activate only if you have exactly seven cards in hand\.$/,()=>{condition={kind:'hand',count:7};}],
        [/\. Activate only if you control a creature with power (\d+) or greater\.$/,m=>{condition={kind:'power',min:+m[1]};}]
      ];
      for(const [re,set]of restrictions){const match=body.match(re);if(match){set(match);body=body.slice(0,match.index)+'.';}}
      const effects=accessEffects(body),tap=cost.includes('{T}'),sacrifice=new RegExp(`Sacrifice ${self}`,'i').test(cost),life=+(cost.match(/Pay (\d+) life/i)?.[1]||0);
      cost=cost.replace(/\{T\}/g,'').replace(new RegExp(`Sacrifice ${self}`,'ig'),'').replace(/Pay \d+ life/ig,'').replace(/[,\s]/g,'');
      if(effects&&!cost.replace(/\{[0-9WUBRGC/]+\}/g,'')&&life<=4){abilities.push({cost,tap,sacrifice,life,condition,once,effects});handled=true;}
    }
    if(!handled&&/draw|scry|surveil|top .*library|look at|cards? into your hand/i.test(line)&&!direct)unknown.push({line,reason:'unsupported access prerequisites/effect'});
  }
  // Classes, levels and quoted/granted abilities must not become free engines.
  if(/\b(?:level up|Level \d|Class)\b/i.test(text))return {direct:null,triggers:[],abilities:[],top:null,lookTop:false,unknown:[{line:text,reason:'level/class prerequisites unmodeled'}]};
  return {direct,triggers,abilities,top,lookTop,unknown};
}
export function knownPower(slot,board=[]) {
  const text=cardText(slot.card),value=Number(front(slot.card).power);
  if(!Number.isFinite(value)||/counter|gets? [+-]|base power|becomes? /i.test(text)||board.some(s=>!s.consumed&&/creatures? (?:you control )?get|equipped creature gets|enchanted creature gets|base power/i.test(cardText(s.card))))return null;
  return value;
}
export function accessConditionStatus(condition,{hand,board}) {
  if(!condition)return 'met';if(condition.kind==='hand')return hand.length===condition.count?'met':'unmet';
  if(condition.kind==='power'){const powers=board.filter(s=>!s.consumed&&isCreature(s.card)).map(s=>knownPower(s,board));return powers.some(p=>p!==null&&p>=condition.min)?'met':powers.includes(null)?'unknown':'unmet';}
  return 'unknown';
}
export function accessCondition(condition,state) {
  return accessConditionStatus(condition,state)==='met';
}
export function entryMatches(trigger,source,entrant,{board,graveyard,chosenType}) {
  if(!isCreature(entrant.card)||trigger.another&&source.id===entrant.id||trigger.nontoken&&entrant.token)return false;
  if(trigger.chosen&&!cardSubtypes(entrant.card).includes(chosenType))return false;
  if(trigger.power&&(knownPower(entrant,board)===null||knownPower(entrant,board)<trigger.power))return false;
  if(trigger.singleton&&[...board.filter(s=>!s.consumed&&s.id!==entrant.id),...graveyard.filter(s=>!s.token)].some(s=>singletonName(s.card)===singletonName(entrant.card)))return false;
  return true;
}
export function topCastAllowed(card,top) {
  return !cardTypes(card).includes('Land')&&(top==='spells'||top==='creature spells'&&isCreature(card)||top==='artifact spells'&&cardTypes(card).includes('Artifact')||top==='colorless spells'&&isColorless(card)||top==='artifact spells and colorless spells'&&(cardTypes(card).includes('Artifact')||isColorless(card)));
}
