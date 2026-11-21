// Local Oracle rules are deliberately narrow. Keep costs, zones and targets
// with the evidence, especially when extending a published resource loop.
import {castHasType,faces,isLandSlot,oracleId} from './cards.mjs';
import {allocateMana} from './functionalGoldfish.mjs';
import {manaProfile,battlefieldSources,auraTarget} from './architectMana.mjs';

import {alternateVictoryPaths} from './alternateVictory.mjs';

const firstText=c=>faces(c)[0].oracle_text||'';
const direct='DIRECT WIN',conditional='CONDITIONAL FINISHER',needs='NEEDS PAYOFF';
const ownETB=/^Whenever (?:another |a )?creature (?:you control enters|enters (?:the battlefield )?under your control), (?:this enchantment|[^,]+?) deals [1-9]\d* damage to each opponent\.$/i;
const ownDeath=/^Whenever (?:this creature or )?(?:another |a )?creature(?: you control)? dies, (?:each opponent|target player) loses [1-9]\d* life(?: and you gain [1-9]\d* life)?\.$/i;
const ownLTB=/^Whenever (?:another |a )?creature you control leaves (?:the battlefield|play), [^.,]+ deals [1-9]\d* damage to each opponent\.$/i;
const ownSac=/^Whenever you sacrifice (?:a|another) creature, (?:each opponent loses [1-9]\d* life|[^.,]+ deals [1-9]\d* damage to (?:each opponent|any target))\.$/i;
const ownCast=/^Whenever you cast (?:a|another) spell, (?:each opponent loses [1-9]\d* life|[^.,]+ deals [1-9]\d* damage to (?:each opponent|any target))\.$/i;

function canPay(sources,cost){
 const pips=[...cost.matchAll(/\{([WUBRGC])\}/g)].map(m=>m[1]);
 if(pips.some(p=>!sources.some(s=>s.options.includes(p))))return false;
 const needed=pips.length+[...cost.matchAll(/\{(\d+)\}/g)].reduce((sum,m)=>sum+Number(m[1]),0);
 if(sources.reduce((sum,s)=>sum+s.units,0)<needed)return false;
 const counts=new Map(),available=sources.filter(source=>{
  const key=JSON.stringify([source.options,source.units,source.outputs]);
  counts.set(key,(counts.get(key)||0)+1);
  return counts.get(key)<=needed;
 });
 return allocateMana(cost,available,{limit:4000}).status==='supported';
}

// An inventory witness assumes the named permanents have been deployed.
// Only lands untap on each Zacama cycle. Track every modifier used in the
// witness so tutoring, path protection and assembly measurements include it.
function paymentSetup(cards,cost,commander,landsOnly=false){
 const sources=[],effects=[];
 for(const card of cards){
  const profile=manaProfile(card,commander);
  if(profile.source&&(!landsOnly||profile.land))sources.push({card:profile,name:card.name,id:sources.length});
  if((profile.double||profile.aura)&&!profile.land&&/Enchantment|Artifact|Creature/.test(profile.types))
   effects.push({card:profile,name:card.name});
 }
 function witness(selected){
  const board=sources.map(s=>({...s,card:{...s.card,double:null},attached:[]}));
  const required=[];
  const choices=[...new Set(cost.match(/[WUBRG]/g)||['G'])];
  const coloredAuras=[];
  for(const effect of selected){
   if(effect.card.double){
    board.push({card:{...effect.card,source:null},attached:[]});
    required.push({name:effect.name,setup:effect.name+' · Battlefield'});
   }else{
    const target=auraTarget(board,effect.card.aura);
    if(!target)return null;
    const aura={...effect.card.aura};
    target.attached.push(aura);
    const entry={name:effect.name,setup:effect.name+' · Battlefield, enchanting '+target.name};
    required.push(entry);
    if(!aura.matching&&!aura.color)coloredAuras.push({aura,entry});
   }
  }
  let attempts=0;
  function assign(i){
   if(attempts>=64)return false;
   if(i===coloredAuras.length){
    attempts++;
    return canPay(battlefieldSources(board,1),cost);
   }
   const {aura,entry}=coloredAuras[i];
   for(const color of choices){
    aura.color=color;
    if(assign(i+1)){entry.setup+=' with {'+color+'} chosen';return true;}
   }
   return false;
  }
  return assign(0)?required:null;
 }
 const plain=witness([]);
 if(plain)return plain;
 // Try individually first. An Aura with no legal land cannot help a group.
 const applicable=effects.filter(e=>e.card.double||auraTarget(sources,e.card.aura));
 for(const effect of applicable){const alone=witness([effect]);if(alone)return alone;}
 if(applicable.length<2||!witness(applicable))return null;
 let needed=applicable;
 for(const effect of applicable){
  const fewer=needed.filter(e=>e!==effect);
  if(witness(fewer))needed=fewer;
 }
 return witness(needed);
}

function requireManaSetup(route,support){
 for(const {name,setup} of support||[]){
  if(!route.cards.includes(name))route.cards=[...route.cards,name];
  if(!route.setup.includes(setup))route.setup=[...route.setup,setup];
 }
 if(support?.length)route.name=route.cards.join(' + ');
}

function manaOutlet(card,production,available,commander){
 const text=firstText(card),cost=faces(card)[0].mana_cost||card.mana_cost||'';
 if(card.card_faces?.length>1||/additional cost|activate (?:this ability )?only|once each turn|only during|spend only|cast this spell only/i.test(text))return null;
 if(cost==='{X}{X}'&&/^This creature enters with X \+1\/\+1 counters on it\.$/m.test(text)&&
    /^Remove a \+1\/\+1 counter from this creature: It deals 1 damage to any target\.$/m.test(text))
  return {zone:'Hand',step:'During your main phase, cast '+card.name+' for {X}{X}. Choose X at least equal to the combined opposing life totals. After it enters, remove counters one by one to deal lethal damage to each opponent.'};
 const activ=text.match(/^(\{(?:\d+|[WUBRGCX])\}(?:\{(?:\d+|[WUBRGCX])\})*): [^.\n]+? deals (\d+|X) damage to (each opponent|any target)\.$/im);
 if(activ){
  const subject=activ[0].split(': ')[1].split(' deals ')[0].toLowerCase();
  if(!['it','this creature','this artifact','this enchantment',card.name.toLowerCase(),card.name.split(',')[0].toLowerCase()].includes(subject))return null;
 }
 const drain=/^Each opponent loses X life\. You gain life equal to the life lost this way\.$/i.test(text.trim());
 const spell=drain||/^[^.\n]+ deals X damage to each opponent\.$/i.test(text.trim());
 if(!activ&&!(spell&&cost.includes('{X}')&&(castHasType(card,'Sorcery')||castHasType(card,'Instant'))))return null;
 const payment=activ?.[1]||cost;
 if(activ&&((activ[2]==='X'&&!payment.includes('{X}'))||Number(activ[2])===0))return null;
 if(payment.replace(/\{(?:\d+|[WUBRGCX])\}/g,''))return null;
 const fixed=[...payment.matchAll(/\{([WUBRGC])\}/g)].filter(([,pip])=>!production.includes(pip)).map(m=>m[0]).join('');
 const support=fixed&&spell?paymentSetup(available,fixed,commander):[];
 if(fixed&&(!spell||!support))return null;
 return {fixed,support,zone:activ?'Battlefield':'Hand',step:activ?
  'Spend the generated mana on '+card.name+'’s '+payment+' ability. Choose lethal damage for each opponent, repeating the activation as needed.':
  'In your main phase, cast '+card.name+' for '+cost+' with X at least the highest opposing life total. Resolve it.'};
}

export function specializeLoop(line,route,deck){
 const cards=[deck.commander,...deck.cards],inLoop=new Set(route.cards);
 const usedIds=new Set(line.pieces.map(piece=>piece.id));
 const remaining=cards.filter(c=>!inLoop.has(c.name)&&!usedIds.has(oracleId(c)));
 const extras=[...new Map(remaining.map(c=>[c.name,c])).values()];
 const added=[];
 const addOutlet=(card,zone,step,classification,mechanism,prerequisites=[])=>{
  added.push({...route,classification,cards:[...route.cards,card.name],setup:[...route.setup,card.name+' · '+zone],
   steps:[...route.steps,step],prerequisites:[...route.prerequisites,...prerequisites],
   name:route.name+' + '+card.name,outcome:'Eliminate all opponents through '+card.name+' once the stated setup is met.',
   family:'conversion:'+route.cards.slice().sort().join('|')+':'+mechanism,
   verification:'Published loop with a conversion checked against the selected Oracle text.'});
 };
 if(line.id==='2484-4083'){
  route.classification=conditional;
  route.damagePerCreature=13;
  route.prerequisites.push('At 40 life, three creatures taking 13 each leave their controller at 1 life. Four deal 52, enough for lethal damage if all four triggers resolve.');
  route.sequencing=['Hold Blasphemous Act until the creature counts favor you. If you delay deploying Repercussion, budget its {1}{R}{R} as well.'];
  route.prerequisites.push('Check life totals, creatures actually dealt damage and prevention for every player, including yourself.');
  route.mana='{R} plus max(0, 8 minus the number of creatures on the battlefield) generic mana, before other modifiers.';
  route.steps=['With Repercussion on the battlefield, cast Blasphemous Act in your main phase.',
   'The Act deals 13 damage to each creature. Repercussion triggers once per creature actually dealt damage.',
   'Stack triggers for your creatures first so opposing triggers resolve first. Each trigger damages that creature’s controller.'];
  route.outcome='Potentially lethal to several players. Your own creatures can cause lethal damage to you before all opponents lose.';
  return [route];
 }
 if(line.id==='1368-3518-4856'){
  route.classification=conditional;
  route.sequencing=['Keep Underworld Breach in hand until the combo turn. Stage Lion’s Eye Diamond and graveyard fuel first. Activate Diamond with priority before casting from the graveyard.'];
  route.mana='No outside mana once Breach and Diamond are on the battlefield. Pay {1}{R} to deploy Breach.';
  route.prerequisites.push('Use your main phase with priority. Keep six expendable cards besides both escape spells available after discarding. Breach is sacrificed at the beginning of the end step.');
  route.outcome='Finite graveyard fuel and storm can mill opponents. Each must try to draw from an empty library to lose. Check remaining libraries, reshuffle effects and available copies.';
  route.steps.push('Reserve enough copies to replenish escape fuel. Send surplus copies at opponents only while enough fuel remains.');
  for(const card of extras)if(/whenever you cast a noncreature spell,[^.\n]*deals 1 damage to each opponent/i.test(firstText(card))){
   addOutlet(card,'Battlefield','Count each actual noncreature cast for '+card.name+'’s damage trigger. Storm copies are not casts.',conditional,'cast damage',
    ['Check that remaining casts and graveyard fuel cover every opponent’s life total.']);
  }
  return [route,...added];
 }
 const zacama=line.id==='215-2226',zaxara=line.id==='1835-4222';
 if(zaxara){
  route.sequencing=['Deploy Zaxara early enough to tap. Hold Freed from the Real until Zaxara can use it and consider protecting Zaxara while the Aura is on the stack.'];
  route.mana='No floating mana once the Aura is attached to an untapped Zaxara that can tap.';
  route.steps.push('Bank blue mana first. Then alternate producing other colors with spending banked blue to untap.');
 }
 const initial=route.simpleSetup&&line.manaNeeded?paymentSetup(remaining,line.manaNeeded,deck.commander):[];
 requireManaSetup(route,initial);
 if(!initial){
  route.simpleSetup=false;
  route.prerequisites.push('The selected cards do not establish the starting payment '+line.manaNeeded+' in the supported mana model.');
  if(route.classification===direct){
   route.classification='INCOMPLETE';
   route.missing.push('Starting mana prerequisite unresolved.');
  }
 }
 let cycle=null,surplus=null;
 if(zacama){
  route.sequencing=['Develop reusable land mana first. Deploy Sabertooth and the payoff before starting the recasts. Keep protection for the creature and its return ability.'];
  cycle=paymentSetup(cards,'{7}{R}{G}{G}{W}',deck.commander,true);
  surplus=paymentSetup(cards,'{8}{R}{G}{G}{W}',deck.commander,true);
  route.prerequisites.push('Recast from hand in your main phase with an empty stack. Only a cast Zacama untaps the lands. Its own damage ability targets creatures.');
 }
 const unbounded=(pattern)=>line.results.some(r=>pattern.test(r));
 let producer=null;
 if(zaxara||unbounded(/^Infinite mana of any colou?r\.?$/i))producer='WUBRG';
 else if(unbounded(/^Infinite colorless mana\.?$/i))producer='C';
 else if(zacama||unbounded(/^Infinite (?:colored )?mana\.?$/i))producer=''; // The result alone does not specify which colors.
 if(route.classification!==needs)return [route];
 for(const card of extras){
  const outlet=producer!==null&&manaOutlet(card,producer,remaining.filter(c=>c!==card&&!zacama),deck.commander);
  if(outlet){
   const ready=zaxara||zacama&&surplus;
   addOutlet(card,outlet.zone,outlet.step,ready?direct:conditional,'mana damage',
    [...(!ready?['Check mana spending restrictions and a legal exit from the loop with that mana available for the outlet.']:[]),
     ...(outlet.fixed?['Reserve '+outlet.fixed+' from separate sources for the fixed part of the outlet cost.']:[])]);
   requireManaSetup(added.at(-1),[...(outlet.support||[]),...(surplus||[])]);
  }
  const text=firstText(card);
  const triggers=[
   [ownETB,/^Infinite creature ETB\.?$/i,'enters under your control'],
   [ownDeath,/^Infinite death triggers\.?$/i,'dies'],
   [ownLTB,/^Infinite creature LTB\.?$/i,'leaves your battlefield'],
   [ownSac,/^Infinite creature sacrifice triggers\.?$/i,'is sacrificed by you'],
   [ownCast,/^Infinite storm count\.?$/i,'is cast by you']
  ];
  const trigger=triggers.find(([ability,event])=>text.split('\n').some(l=>ability.test(l))&&unbounded(event));
  if(trigger){
   const event=trigger[2],subject=event==='is cast by you'?'spell':'creature';
   addOutlet(card,'Battlefield','Resolve '+card.name+'’s trigger each time a qualifying '+subject+' '+event+'. Choose opponents for targeted triggers and repeat until all opponents lose.',
    zacama&&cycle?direct:conditional,event,['Confirm the loop repeatedly produces the required event while the payoff remains on the battlefield.']);
   if(zacama)requireManaSetup(added.at(-1),cycle);
   if(zacama&&trigger[0]===ownETB){
    const win=added.at(-1);
    win.mana='{7}{R}{G}{G}{W} from reusable lands per cycle (11 total). The published surplus-mana version needs 12.';
    win.prerequisites=['Control Zacama, Sabertooth and the payoff. Untapped lands must pay both costs each cycle.',
     'Recast from hand during your main phase. Only a cast Zacama untaps the lands.',
     cycle?'Selected land sources can supply the cycle once deployed.':'Land production at the required colors and quantity needs confirmation.'];
    if(!cycle){
     win.classification='INCOMPLETE';
     win.missing=['The reusable land payment has not been established.'];
     win.verification='Land payment unresolved in the supported source model.';
    }
    win.steps=['Tap lands for at least {7}{R}{G}{G}{W}. Pay {1}{G} to Sabertooth and return Zacama to hand.',
     'Cast Zacama from hand for {6}{R}{G}{W}. Let Zacama enter and resolve its land-untap trigger.',win.steps.at(-1)];
   }
  }
 }
 if(zacama)requireManaSetup(route,surplus);
 return [route,...added];
}

export function oracleFinishers({commander,cards},published=[]){
 const routes=[];
 const creatures=cards.filter(c=>castHasType(c,'Creature')).length;
 const tokens=cards.some(c=>/create [^.\n]*creature tokens?/i.test(firstText(c)));
 for(const card of new Set([commander,...cards])){
  for(const face of faces(card)){
   const text=face.oracle_text||'',cost=face.mana_cost||card.mana_cost;
   const spells=/Instant|Sorcery/.test(face.type_line||card.type_line);
   const create=(kind,requirement,step,outcome,clause=text)=>{
    const route={name:card.name+' · '+kind,classification:conditional,cards:[card.name],
     setup:[card.name+' · '+(spells?'Hand':'Battlefield')+(face.name!==card.name?' · use '+face.name:'')],
     prerequisites:[requirement],steps:[step,clause].filter(Boolean),mana:cost?'Deployment '+cost+'. See the ability for additional payments.':'See Oracle costs.',
     outcome,source:'Scryfall Oracle · '+face.name,verification:'Conditional route inferred from printed text.',family:null};
    if(kind==='Alternate victory')routes.push(...alternateVictoryPaths(route,text,card,{commander,cards},published));
    else routes.push(route);
   };
   if(/\byou win the game\b/i.test(text)&&!/target opponent wins|that player wins/i.test(text)){
    create('Alternate victory','Meet the printed win condition at its specified time, including any intervening “if”.','Set up the printed condition and resolve the spell, trigger or replacement effect.','Win when the printed condition is fulfilled.');
   }
   else if(castHasType(card,'Creature')&&Number(face.power)>=7&&
    (card.keywords||[]).some(k=>['Trample','Flying','Infect','Annihilator','Double strike'].includes(k))){
    const poison=card.keywords.includes('Infect');
    create(poison?'Poison combat':'Combat damage','The creature must be able to attack. Check blockers, prevention and the defending player’s '+(poison?'poison counters.':'life total.'),
     'Deploy the attacker and arrange a combat in which it can connect.',
     poison?'A player loses at ten poison counters. Infect deals damage to players as poison counters.':'Repeated unblocked combat damage can reduce an opponent to zero life.');
   }
   else if(/(?:there is|you get) an additional combat phase/i.test(text)&&(creatures>=3||tokens))
    create('Extra combat','Have enough attackers able to attack in each combat. Check the printed untap instruction and restrictions.',
     'Meet the printed trigger or cost, then allocate attackers again during the additional combat.','Successive combat steps can eliminate opponents whose defenses are exhausted.');
   else if((creatures>=3||tokens)&&/creatures you control (?:get \+[X1-9]|gain (?:double strike|infect|trample))|creatures you control (?:gain|have) trample and get \+/i.test(text))
    create('Combat finisher','Deploy enough attackers that can attack. Account for blockers, prevention and opposing life totals.','Resolve the team effect before the relevant combat damage step, then allocate attacks.','Lethal combat if sufficient damage connects.');
   else if(/each opponent loses (?:X|life equal to)|deals X damage to each opponent|deals damage (?:to each opponent )?equal to [^.\n]+to each opponent/i.test(text))
    create('Group damage or life loss','Check the available value of X or the printed scaling resource against each opponent’s life total.','Set the resource or X, pay the printed costs and resolve the effect.','Opponents at or below the resulting damage or life loss can be eliminated.');
   else if(/whenever you cast (?:a noncreature spell|an instant or sorcery spell), [^.\n]*deals [1-9]\d* damage to each opponent/i.test(text)){
    const fuel=cards.filter(c=>/instant or sorcery spell/i.test(text)?castHasType(c,'Instant')||castHasType(c,'Sorcery'):!isLandSlot(c)&&!castHasType(c,'Creature'));
    if(fuel.length)create('Spellcasting damage','Check the number of qualifying casts available and each opposing life total.',
     'Deploy the payoff before casting the qualifying spells. Resolve its trigger for each actual cast.','Enough qualifying casts can eliminate all opponents.');
   }else if(text.split('\n').some(l=>ownDeath.test(l))&&(creatures>=3||tokens))
    create('Death-trigger lifedrain','Supply enough qualifying deaths and legal targets. Check each opponent’s life total.',
     'Deploy the payoff before the creatures die. Resolve and distribute each trigger.','Repeated death triggers can drain opposing life totals.');
   else if(/\bstorm\b/i.test(text)&&/target (?:player|opponent) (?:mills|loses)|(?:damage to any target|damage to target (?:opponent|player))/i.test(text))
    create('Storm finisher','Count spells cast before this spell this turn. Assign targets and check life totals or remaining library sizes.',
     'Cast the spell after building storm. Resolve the storm trigger and each copy.',
     /\bmills?\b/i.test(text)?'A player who attempts to draw from an empty library loses.':'Enough resolved copies can eliminate the targeted opponents.');
   else if(/(?:target (?:opponent|player)|each opponent) mills (?:half|X cards|a number of cards equal to)|(?:mill|mills) (?:their|his or her) (?:entire )?library/i.test(text))
    create('Mill finisher','Check every opposing library, legal targets, repeated uses and the next draw.','Resolve the mill effect for each intended opponent.','An opponent loses on attempting to draw from an empty library.');
  }
 }
 // A small commander can still close through equipment or an Aura. Keep
 // the actual support piece in the path and cite its attachment cost.
 const power=Number(commander.power);
 if(castHasType(commander,'Creature')&&power>0)for(const gear of new Set(cards)){
  const text=firstText(gear),equipment=/\bEquipment\b/.test(gear.type_line||'');
  if(!equipment&&!/^Enchant creature(?: you control)?$/im.test(text))continue;
  const bearer=equipment?'Equipped':'Enchanted';
  if(!new RegExp(bearer+' creature (?:gets \\+(?:[3-9]|[1-9][0-9]+|X)\\/|has double strike|can.t be blocked)','i').test(text))continue;
  routes.push({name:commander.name+' + '+gear.name+' · Commander damage',cards:[commander.name,gear.name],
   classification:conditional,setup:[commander.name+' · Battlefield',gear.name+' · Battlefield, attached to the commander'],
   prerequisites:['The commander must be able to attack and connect. Meet all printed attachment and combat restrictions.'],
   steps:[equipment?'Deploy the Equipment and pay its equip cost targeting your commander at sorcery speed.':'Cast the Aura targeting your commander and let it resolve.',
    'Attack and track the combat damage from this same commander separately for each opponent.'],
   mana:'Deploy '+commander.name+' for '+commander.mana_cost+' and '+gear.name+' for '+gear.mana_cost+'. '+(text.match(/^Equip .+$/m)?.[0]||''),
   outcome:'An opponent loses after taking 21 cumulative combat damage from this commander.',
   source:'Commander combat-damage rule (CR 903.10a) and Scryfall Oracle',verification:'Conditional combat assessment.',family:'commander damage:'+commander.name});
 }

 const evasion=/flying|trample|double strike|can.t be blocked/i.test(firstText(commander));
 if(castHasType(commander,'Creature')&&(power>=7||power>=4&&evasion||/commander damage|deals combat damage as though its power/i.test(firstText(commander)))){
  routes.push({name:commander.name+' · Commander damage',cards:[commander.name],classification:conditional,
   setup:[commander.name+' · Battlefield'],mana:commander.mana_cost||'See commander casting cost.',
   prerequisites:['Attack legally with haste or after controlling your commander since the turn began. Check evasion, blockers and prevention.'],
   steps:['Deploy and protect your commander. Choose the opponent it can connect with.','Track combat damage dealt by this same commander separately for each player.'],
   outcome:'Each opponent loses after taking 21 cumulative combat damage from this commander.',source:'Commander combat-damage rule (CR 903.10a) and Scryfall Oracle',
   verification:'Conditional combat assessment.',family:null});
 }
 return routes;
}
