function item(tag,value){
 const node=document.createElement(tag);
 if(value!==undefined)node.textContent=value;
 return node;
}
function list(root,label,values,ordered=false){
 if(!values?.length)return;
 const entries=item(ordered?'ol':'ul');
 for(const value of values)entries.append(item('li',value));
 root.append(item('strong',label),entries);
}
export function repercussionDamage(life,creatures,perCreature){
 if(!Number.isSafeInteger(life)||life<1||!Number.isSafeInteger(creatures)||creatures<0||!Number.isSafeInteger(perCreature)||perCreature<=0)return null;
 const damage=creatures*perCreature;
 if(!Number.isSafeInteger(damage))return null;
 return {damage,remaining:life-damage,lethalAt:Math.ceil(life/perCreature)};
}

function damageCalculator(root,perCreature){
 const panel=item('fieldset'),rows=item('div');
 panel.append(item('legend','Repercussion damage by player'),
  item('p','Enter current life and creatures that actually take '+perCreature+' damage. Totals assume unmodified damage and all triggers for that player resolving. Your triggers can remain on the stack if the last opponent loses first.'),rows);
 function player(name){
  const row=item('fieldset'),output=item('output');
  row.append(item('legend',name));
  function input(label,value,min){
   const wrapper=item('label',label),control=item('input');
   control.type='number';control.min=String(min);control.step='1';control.value=String(value);
   wrapper.append(control);row.append(wrapper);
   return control;
  }
  const life=input('Current life',40,1),creatures=input('Creatures dealt damage',0,0);
  function update(){
   const r=repercussionDamage(life.valueAsNumber,creatures.valueAsNumber,perCreature);
   output.textContent=r?r.damage+' damage · '+r.remaining+' life after all triggers'+(r.remaining<=0?' (lethal)':'')+' · lethal at '+r.lethalAt+' creature'+(r.lethalAt===1?'':'s')+'.':'Enter whole numbers for life and creatures.';
  }
  row.addEventListener('input',event=>{event.stopPropagation();update();});row.append(output);rows.append(row);update();
 }
 player('You');
 let opponents=0;
 function opponent(){player('Opponent '+(++opponents));}
 for(let i=0;i<3;i++)opponent();
 const add=item('button','Add opponent');add.type='button';add.addEventListener('click',opponent);
 panel.append(add);root.append(panel);
}
function instructions(root,v){
 root.append(item('p',v.pieceCount+' distinct named piece'+(v.pieceCount===1?'':'s')+' · '+(v.commander?'Commander involved':'Commander independent')+' · '+v.tempo));
 list(root,'Required cards and starting zones',v.setup);
 if(v.templateSlots?.length){list(root,'Template requirements',v.templateSlots);list(root,'Named and matched pieces',v.cards);}
 root.append(item('p','Starting mana · '+v.mana));
 list(root,'Prerequisites',v.prerequisites);
 list(root,v.classification==='INCOMPLETE'?'Published steps for the complete package':'Execution',v.steps,true);
 root.append(item('p',(v.classification==='INCOMPLETE'?'Published outcome · ':'Outcome · ')+v.outcome));
 if(v.damagePerCreature)damageCalculator(root,v.damagePerCreature);
 list(root,'Sequencing and tutors',v.guidance);
 const source=item('p',v.verification+' ');
 if(v.url&&/^https:\/\/commanderspellbook\.com\/combo\/[\d-]+\/$/.test(v.url)){
  const link=item('a',v.source);link.href=v.url;link.target='_blank';link.rel='noopener noreferrer';source.append(link);
 }else source.append(document.createTextNode(v.source));
 root.append(source);
 if(v.oracle.length){
  const details=item('details');details.append(item('summary','Selected card text and costs'));
  for(const f of v.oracle)details.append(item('p',f.name+' '+f.cost+' · '+(f.text||'No rules text recorded.')));
  root.append(details);
 }
}
export function renderWinConditions(root,analysis){
 root.replaceChildren();
 if(!analysis)return;
 root.append(item('h3','Win Conditions'),item('p',analysis.cardCount+' cards analyzed · '+analysis.coverage));
 list(root,'Independent win paths with disjoint named pieces',analysis.independent);
 if(!analysis.independent.length)root.append(item('p','No independent winning path established.'));
 for(const [state,title] of [['DIRECT WIN','Direct winning lines'],['NEEDS PAYOFF','Needs payoff'],['CONDITIONAL FINISHER','Conditional finishers'],['VALUE ENGINE','Value engines'],['INCOMPLETE','Incomplete packages']]){
  const groups=analysis.groups.filter(g=>g.classification===state);
  root.append(item('h4',title+' ('+groups.length+')'));
  for(const group of groups){
   const detail=item('details');
   detail.append(item('summary',group.name+(group.variants.length>1?' · '+group.variants.length+' variants':'')));
   detail.addEventListener('toggle',()=>{
    instructions(detail,group.variants[0]);
    for(const variant of group.variants.slice(1)){
     const alternative=item('details');alternative.append(item('summary','Alternative · '+variant.name));instructions(alternative,variant);detail.append(alternative);
    }
    if(group.shared?.length)detail.append(item('p','Also required by another finish · '+group.shared.join(', ')));
    const sim=group.simulation;
    detail.append(item('p',sim?'All named pieces accessible by turn '+sim.turn+' in '+sim.piecesSeenPct+'% of '+sim.trials+' trials (commander starts accessible). Starting state · '+(sim.startingStatePct===null?'Not modeled':sim.startingStatePct+'%')+'. Execution · Not modeled':'Assembly · Not modeled. Execution · Not modeled.'));
   },{once:true});
   root.append(detail);
  }
 }
 if(analysis.omittedPartial)root.append(item('p',analysis.omittedPartial+' additional partial variants omitted.'));
 list(root,'Architect quality review',analysis.findings);
}
