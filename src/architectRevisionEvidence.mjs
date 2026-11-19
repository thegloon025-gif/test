// Deltas are expressed in the displayed metric's units. The minimum effect
// sizes keep tiny changes from driving adoption even in a large sample.
const checks=[
 {label:'Mana available on turn 4',unit:'mana',minimum:.1,read:r=>r.seenByTurn[3].mana},
 {label:'Ramp played by turn 3',unit:'pp',minimum:2,read:r=>100*Number(r.rampTurn!==null&&r.rampTurn<=3)},
 {label:'Commander cast by turn 10',unit:'pp',minimum:2,read:r=>100*Number(r.commanderTurn!==null)},
 {label:'Commander turn when both decks cast',unit:'turns',minimum:.25,lowerIsBetter:true,read:r=>r.commanderTurn},
 {label:'Mana left after casting when both decks cast',unit:'mana',minimum:.5,read:r=>r.commanderTurn===null?null:r.postCastMana},
 {label:'Extra cards drawn per game',unit:'cards',minimum:.1,read:r=>r.drawn},
 {label:'Draw seen by turn 5',unit:'pp',minimum:2,read:r=>100*Number(r.seenByTurn[4].draw)},
 {label:'Interaction seen by turn 5',unit:'pp',minimum:2,read:r=>100*Number(r.seenByTurn[4].interaction)},
 {label:'Missing third battlefield land on turn 4',unit:'pp',minimum:2,lowerIsBetter:true,read:r=>100*Number(r.screw)},
];
const round=n=>Math.round(n*100)/100||0;

export function assessArchitectRevision(before,after){
 const gains=[],regressions=[];
 for(const {label,unit,minimum,read,lowerIsBetter} of checks){
  const differences=before.flatMap((trial,i)=>{
   const original=read(trial),revised=read(after[i]);
   return original===null||revised===null?[]:[revised-original];
  });
  const pairs=differences.length;
  if(pairs<30)continue;
  const delta=differences.reduce((sum,difference)=>sum+difference,0)/pairs;
  if(Math.abs(delta)+1e-9<minimum)continue;
  const squaredError=differences.reduce((sum,difference)=>sum+(difference-delta)**2,0);
  const margin=1.96*Math.sqrt(squaredError/(pairs*(pairs-1)));
  if(Math.abs(delta)<=margin)continue;
  const entry={label,unit,delta:round(delta),pairs,interval95:[round(delta-margin),round(delta+margin)]};
  const direction=lowerIsBetter?-delta:delta;
  (direction>0?gains:regressions).push(entry);
 }
 return {status:regressions.length?'regression':gains.length?'supported':'inconclusive',gains,regressions};
}
