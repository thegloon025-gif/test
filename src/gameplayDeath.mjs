/** Stage 8 supported Oracle clauses only. No combat, recursion or general
 * replacement layers. Death matching uses pre-event battlefield information. */
import {cardText,cardSubtypes,isCreature} from './gameplayCards.mjs';
import {withoutReminder} from './gameplayAccess.mjs';
export function deathModel(card){
 const triggers=[],recognized=[];let endStep=false;
 for(const line of withoutReminder(cardText(card)).split('\n').map(l=>l.trim())){
  let effect=null,filter=null;
  if(line==="Whenever another Zombie you control dies, if it didn't have decayed, create a 2/2 black Zombie creature token with decayed."){
   filter={another:true,subtype:'Zombie',noDecayed:true};effect={type:'tokens',count:1,power:'2',toughness:'2',tribe:'Zombie',decayed:true};
  }else if(line==='Whenever this creature or another nontoken Zombie you control dies, create a 2/2 black Zombie creature token.'){
   filter={selfOrNontoken:true,subtype:'Zombie'};effect={type:'tokens',count:1,power:'2',toughness:'2',tribe:'Zombie',decayed:false};
  }else if(line==='Whenever this creature or another Zombie you control dies, you draw a card and lose 1 life.'){
   filter={subtype:'Zombie'};effect={type:'access',trigger:{phase:'death',effects:[{kind:'draw',count:1},{kind:'loseLife',count:1}]}};
  }else if(line==='Whenever another nontoken creature you control dies, draw a card.'){
   filter={another:true,nontoken:true};effect={type:'access',trigger:{phase:'death',effects:[{kind:'draw',count:1}]}};
  }else if(line==='Whenever another nontoken creature you control dies, create a 1/1 colorless Eldrazi Scion creature token. It has "Sacrifice this token: Add {C}."'){
   filter={another:true,nontoken:true};effect={type:'tokens',count:1,power:'1',toughness:'1',subtype:'Scion'};
  }else if(line==='Whenever this creature or another nontoken creature you control dies, you may create a 0/1 colorless Eldrazi Spawn creature token. It has "Sacrifice this token: Add {C}."'){
   filter={selfOrNontoken:true};effect={type:'tokens',count:1,power:'0',toughness:'1',subtype:'Spawn'};
  }else if(line==='At the beginning of your end step, you may sacrifice a Zombie. If you do, draw a card.'){endStep=true;recognized.push(line);}
  if(effect){triggers.push({filter,effect});recognized.push(line);}
 }
 return {triggers,endStep,recognized};
}
export function deathMatches(source,victim,filter){return isCreature(victim.card)&&(!filter.another||source.id!==victim.id)&&(!filter.nontoken||!victim.token)&&(!filter.selfOrNontoken||source.id===victim.id||!victim.token)&&(!filter.subtype||cardSubtypes(victim.card).includes(filter.subtype))&&(!filter.noDecayed||!/^Decayed\.?$/m.test(withoutReminder(cardText(victim.card))));}
/** Deliberately decline non-token sacrifices: preserving native infrastructure
 * is preferable to assuming every affordable draw is useful. No tap cost. */
export function endStepVictim(board,{allowSimpleCreature=false}={}){return board.filter(s=>s.id!=='commander'&&isCreature(s.card)&&cardSubtypes(s.card).includes('Zombie')&&(s.token||allowSimpleCreature&&['','This creature enters tapped.'].includes(withoutReminder(cardText(s.card))))).sort((a,b)=>Number(b.token||false)-Number(a.token||false)||a.id.localeCompare(b.id))[0]||null;}
export function tokenCard(e){return e.tribe==='Zombie'?{name:'Zombie',type_line:'Token Creature — Zombie',mana_cost:'',colors:['B'],power:e.power,toughness:e.toughness,oracle_text:e.decayed?'Decayed':''}:{name:'Eldrazi'+(e.subtype?' '+e.subtype:''),type_line:'Token Creature — Eldrazi'+(e.subtype?' '+e.subtype:''),mana_cost:'',power:e.power,toughness:e.toughness,oracle_text:e.subtype?'Sacrifice this token: Add {C}.':''};}

export function deathUnknown(board){return board.flatMap(s=>withoutReminder(cardText(s.card)).split('\n').map(l=>l.trim()).filter(l=>/\bdies?\b|graveyard|leaves (?:the )?battlefield|would.*(?:exile|leave)|regenerate|totem armor|shield counter/i.test(l)&&!deathModel(s.card).recognized.includes(l)).map(clause=>({card:s.card.name,clause})));}
