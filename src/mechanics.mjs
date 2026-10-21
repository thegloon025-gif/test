import {castHasSubtype,castHasType,isCreatureSpell,playableLand,trueColorlessSource,castOracle} from './cards.mjs';
const lower=s=>String(s||'').toLowerCase();
const text=c=>castOracle(c);
export function planFor(commander){
 const t=text(commander),s=lower(t),needs=[];
 // Detect *which* objects are needed to activate the commander's actual triggers.
 const cast=t.match(/whenever you cast (?:a|an|another)\s+([A-Za-z]+)(?:\s*,\s*([A-Za-z]+))?(?:\s*,?\s*or\s+([A-Za-z]+))?\s+spell/i);
 if(cast){const types=[cast[1],cast[2],cast[3]].filter(Boolean);needs.push({kind:'typed-cast',types});}
 if(/whenever an aura enters/i.test(t)&&!/aura/i.test(needs.map(n=>n.types).join(' ')))needs.push({kind:'typed-cast',types:['Aura']});
 if(/commander ninjutsu|\bninjutsu\s*\{/i.test(s))needs.push({kind:'ninjutsu'});
 const death=t.match(/whenever (?:another|a|one or more)\s+([A-Za-z]+)\s+you control dies/i);if(death)needs.push({kind:'death-tribal',type:death[1]});
 if(/whenever you gain life|whenever you gain [a-z0-9]+ life/i.test(s))needs.push({kind:'lifegain'});
 if(/landfall|whenever a land enters (?:the battlefield )?under your control|whenever a land you control enters/i.test(s))needs.push({kind:'landfall'});
 if(/copy that spell|copy it for each|copy that instant or sorcery/i.test(s)&&/target[s]? only|that targets only|only targets/i.test(s))needs.push({kind:'target-copy'});
 if(/exile (?:another )?target creature/i.test(s)&&/return (?:that card|it) to the battlefield/i.test(s))needs.push({kind:'blink'});
 if(/create (?:x|that many|a number of) [^.]*?\b(goblin|elf|soldier|saproling|zombie|spirit)\b/i.test(s))needs.push({kind:'token-tribal',type:(s.match(/create [^.]*?\b(goblin|elf|soldier|saproling|zombie|spirit)\b/i)||[])[1]});
 if(/experience counter/i.test(s)&&/power 2 or less|power 2 or fewer/i.test(s))needs.push({kind:'small-creature-counters'});
 if(/\+1\/\+1 counter/i.test(s)&&!needs.some(n=>n.kind==='small-creature-counters'))needs.push({kind:'counters'});
 if(/whenever another creature you control dies/i.test(s)&&/graveyard|return target creature/i.test(s))needs.push({kind:'recursion'});
 if(/whenever you cast a spell from exile|play cards from exile|you may play that card this turn/i.test(s))needs.push({kind:'exile-cast'});
 if(!needs.length)needs.push({kind:'unknown'});
 const pay=t.match(/\bpay\s+(?:\{\d+\}\s*)?(\{C\}(?:\s*\{C\})*)/i);
 const needsColorless=pay?(pay[1].match(/\{C\}/gi)||[]).length:0;
 return {needs,needsColorless,label:needs.map(n=>n.kind==='typed-cast'?`Cast ${n.types.join('/')} spells`:n.kind.replaceAll('-',' ')).join(' + '),confidence:needs[0].kind==='unknown'?'low':'heuristic'};
}
export function analysis(c){
 const t=lower(text(c)),type=lower(c.card_faces?.[0]?.type_line||c.type_line),creature=isCreatureSpell(c);
 const ramp= /\badd\s+\{[wubrgc]\}|add (?:one|two|three) mana|search your library for (?:a|up to).*land card|put (?:a|that) land card onto the battlefield/i.test(t)&& !/spend this mana only to cast|addendum/i.test(t);
 const draw=/\bdraw (?:a|one|two|three|x|that many|[1-9]\d*|cards?)\b/i.test(t);
 const removal=/destroy target|exile target|counter target|return target (?:spell|creature|permanent)|destroy all|exile all|each creature gets -/i.test(t);
 const protection=/hexproof|indestructible|phases? out|protection from|ward \{/i.test(t);
 const sacrifice=/sacrifice another|sacrifice (?:a|one|two|three|x|any number of|up to) (?:creature|artifact|permanent|zombie)/i.test(t);
 const recursion=/return target .*from (?:your|a) graveyard|from your graveyard to (?:your hand|the battlefield)|you may cast .*from your graveyard|escape\b|flashback\b|unearth\b/i.test(t);
 const lifegain=/gain (?:\d+|x|that much|life)|gains? life|lifelink/i.test(t);
 const tokens=/create (?:a|two|three|x|that many|a number of) [^.]*token/i.test(t);
 const blink=/exile (?:another )?target creature[^.]*return/i.test(t);
 const etb=/when(?:ever)? [^.]*enters (?:the battlefield|,)/i.test(t);
 const topdeck=/put [^.]* on top of (?:your|the|its) library|scry \d+|surveil \d+|look at the top card/i.test(t);
 const directTopdeck=/put [^.]* on top of (?:your|the|its) library|put [^.]* from your hand on top/i.test(t);
 const win=/each opponent loses|each opponent takes|damage to each opponent|you win the game|player loses the game|annihilator|infect|trample/i.test(t);
 const freeEvasion=creature&&(/\bflying\b|\bshadow\b|\bhorsemanship\b|can't be blocked(?! (?:this turn|until|as long|unless))/i.test(t)||(c.keywords||[]).some(k=>['Flying','Shadow','Horsemanship'].includes(k)))&&!/\{[0-9wubrgc]+\}[^.]*can't be blocked|discard a card[^.]*can't be blocked/i.test(t);
 const cheapOpener=freeEvasion&&c.cmc<=1;
 const targetOnly=/target creature you control|target creature gains|target creature gets \+/i.test(t)&&(castHasType(c,'Instant')||castHasType(c,'Sorcery'));
 return {ramp,draw,removal,protection,sacrifice,recursion,lifegain,tokens,blink,etb,topdeck,directTopdeck,win,freeEvasion,cheapOpener,targetOnly,creature,land:playableLand(c),manaC:trueColorlessSource(c),cmc:c.cmc||0};
}
export function synergy(c,plan,a=analysis(c)){
 const t=lower(text(c));const roles=new Set();let impact=0;
 for(const n of plan.needs)switch(n.kind){
 case 'typed-cast':if(n.types.some(x=>castHasType(c,x)||castHasSubtype(c,x))&&!a.land){roles.add('engine');impact+=8;}
 // A standalone engine that explicitly rewards casting the relevant spell
 // type is independently useful even if it isn't itself that type. For
 // example, generic tribal cast-trigger payoffs belong in their own plan.
 if(n.types.some(type=>new RegExp(`(?:whenever|when) you cast [^.\\n]{0,75}\\b${type.toLowerCase()}\\b`, 'i').test(t))){roles.add('payoff');impact+=8;}
 if(n.types.includes('Eldrazi')&&/eldrazi spawn|eldrazi scion|add \{c\}/i.test(t)){roles.add('enabler');impact+=4;}
 if(/(?:copy target triggered ability|triggered ability[^.]*triggers an additional time|triggered abilities[^.]*trigger an additional time)/i.test(t)){
  roles.add('payoff');impact+=5;
 }

 // Generic tribal-cast finishers need to be castable on-plan creature spells,
 // not an expensive nontribal spell or a transformation's back face.
 if(roles.has('engine')&&a.creature&&a.cmc>=6&&(Number(c.power)>=5||/annihilator|when you cast|whenever you cast|trample|indestructible/i.test(t))){roles.add('finisher');impact+=7;}break;
 case 'ninjutsu':if(castHasSubtype(c,'Ninja')){roles.add('engine');impact+=10;}if(a.cheapOpener){roles.add('opener');impact+=20;}else if(a.freeEvasion&&a.cmc<=2){roles.add('late-opener');impact+=5;}if(a.directTopdeck){roles.add('topdeck');impact+=8;}else if(a.topdeck){roles.add('filter');impact+=2;}break;
 case 'death-tribal':if(castHasSubtype(c,n.type)&&a.creature){roles.add('fodder');impact+=12;}if(a.sacrifice){roles.add('outlet');impact+=7;}if(/whenever [^.]*\bdies|whenever you sacrifice/i.test(t)){roles.add('payoff');impact+=5;}if(a.recursion){roles.add('recursion');impact+=3;}break;
 case 'lifegain':if(a.lifegain){roles.add('engine');impact+=11;}if(/whenever you gain/i.test(t)){roles.add('payoff');impact+=5;}break;
 case 'landfall':if(a.ramp||/additional land|put [^.]*land [^.]*onto the battlefield/i.test(t)){roles.add('engine');impact+=10;}if(/landfall|whenever a land enters/i.test(t)){roles.add('payoff');impact+=8;}break;
 case 'target-copy':if(a.targetOnly){roles.add('engine');impact+=12;}if(a.creature&&a.cmc<=3){roles.add('fodder');impact+=10;}if(a.tokens){roles.add('fodder');impact+=4;}break;
 case 'blink':if(a.blink){roles.add('engine');impact+=9;}if(a.etb){roles.add('payoff');impact+=9;}break;
 case 'token-tribal':if(castHasSubtype(c,n.type)){roles.add('engine');impact+=11;}if(a.tokens){roles.add('payoff');impact+=6;}break;
 case 'small-creature-counters':if(a.creature&&Number(c.power)<=2){roles.add('engine');impact+=11;}if(/\+1\/\+1 counter|proliferate/i.test(t)){roles.add('payoff');impact+=8;}break;
 case 'counters':if(/\+1\/\+1 counter|proliferate/i.test(t)){roles.add('engine');impact+=8;}break;
 case 'recursion':if(a.sacrifice){roles.add('outlet');impact+=8;}if(a.creature&&a.cmc<=3){roles.add('fodder');impact+=6;}if(a.recursion){roles.add('recursion');impact+=8;}break;
 case 'exile-cast':if(/exile [^.]*you may (?:cast|play)|play [^.]*from exile/i.test(t)){roles.add('engine');impact+=10;}break;
 }
 return {roles:[...roles],impact};
}
