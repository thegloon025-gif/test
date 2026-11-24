import {castHasType,isLandSlot} from './cards.mjs';
import {oracleText} from './roleEvidence.mjs';
import {sourceGrammar} from './functionalGoldfish.mjs';

const COLORS='WUBRG'.split('');
const count=(rows,pred)=>rows.filter(pred).length;
export function manaProfile(card,commander){
 const text=oracleText(card),land=isLandSlot(card),single=!card.card_faces?.length;
 let source=single?sourceGrammar(card):null;
 const lines=text.split('\n');
 const unrestricted=!/spend this mana|only|unless|can't untap|doesn't untap|does not untap/i.test(text);
 if(!source&&single&&unrestricted){
  const manaLine=lines.find(line=>/^\{T\}: Add (?:one|two|three) mana of any (?:one )?color(?: in your commander's color identity)?\.$/.test(line));
  if(manaLine)source={options:manaLine.includes("commander's")?commander.color_identity||[]:COLORS,units:({one:1,two:2,three:3})[manaLine.match(/Add (\w+)/)[1]]};
 }
 if(source&&!source.options.length)source=null;
 const aura=single&&text.match(/^Enchant (land|Forest)\n(?:As this Aura enters, choose a color\.\n)?Whenever enchanted (?:land|Forest) is tapped for mana, (?:its controller adds|add) (?:an additional )?(\{[WUBRGC]\}|(?:one|two) mana of (?:any|that|the chosen) color)\.$/i);
 const double=single&&lines.some(line=>/^Whenever (?:you tap a land for mana, add|a player taps a land for mana, that player adds) (?:one|an additional|one additional) mana of any type that land produced\.$/i.test(line))?'plus':
  single&&lines.some(line=>/^If you tap a land for mana, it produces twice as much of that mana instead\.$/i.test(line))?'twice-land':
  single&&lines.some(line=>/^If you tap a permanent for mana, it produces twice as much of that mana instead\.$/i.test(line))?'twice-all':null;
 const tapped=!!source?.tapped||/(?:^|\n)[^\n]+ enters(?: the battlefield)? tapped\.(?:$|\n)/.test(text);
 // Conditional land entry and alternative faces are held outside the casting model.
 if(land&&/enters[^\n]*(?:unless|if)|(?:as .* enters|enters.*you may pay)/i.test(text))source=null;
 return {land,creature:castHasType(card,'Creature'),types:card.type_line||'',source,tapped,double,aura:aura?{type:aura[1],color:aura[2].match(/\{(.)\}/)?.[1],units:aura[2].startsWith('two')?2:1,matching:/that color/i.test(aura[2])}:null};
}

export const hasLandSubtype=(card,kind)=>card.types.split('—').at(-1).trim().split(/\s+/).some(type=>type.toLowerCase()===kind.toLowerCase());
export function auraTarget(board,aura){
 return board.find(item=>item.card.land&&item.card.source&&(aura.type.toLowerCase()==='land'||hasLandSubtype(item.card,aura.type)));
}

export function battlefieldSources(board,turn){
 const allDoubles=count(board,({card})=>card.double==='twice-all');
 const landDoubles=count(board,({card})=>card.double==='twice-land');
 const plus=count(board,({card})=>card.double==='plus');
 return board.flatMap(item=>{
  const {card,tapped,id,entered,attached}=item;
  if(tapped||!card.source||card.creature&&entered===turn)return [];
  const matching=attached.filter(a=>a.matching).reduce((n,a)=>n+a.units,0);
  const units=card.source.units*2**(allDoubles+(card.land?landDoubles:0))+(card.land?plus:0)+matching;
  const bonus=attached.filter(a=>!a.matching).flatMap(a=>Array(a.units).fill(a.color));
  if(!bonus.length)return [{id,options:card.source.options,units}];
  const outputs=card.source.options.map(color=>[...Array(units).fill(color),...bonus]);
  return [{id,options:[...new Set([...card.source.options,...bonus])],units:units+bonus.length,outputs}];
 });
}
