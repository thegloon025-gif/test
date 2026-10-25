/** Local shadow observations only. No constructor imports, opponent model or power score. */
import {createHash} from 'node:crypto';
import {isLandSlot,castFaces,castHasType} from './cards.mjs';
import {oracleText} from './roleEvidence.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const cost=c=>castFaces(c)[0]?.mana_cost??c.mana_cost;
const permanent=c=>/Creature|Artifact|Enchantment|Planeswalker|Battle/.test(c.type_line||'');
const basic={Plains:'W',Island:'U',Swamp:'B',Mountain:'R',Forest:'G',Wastes:'C'};
export function sourceGrammar(c){
 const text=oracleText(c);if(c.catalogMissing)return null;
 const subtype=(c.type_line||'').split('—')[1]?.trim();
 if(isLandSlot(c)&&!text.trim()&&basic[subtype])return {options:[basic[subtype]],units:1,tapped:false};
 // Entire simple mana line only: no activation payment, restrictions, counters or consumed sources.
 const lines=text.replace(/[()]/g,'').split('\n');const abilities=lines.filter(l=>/^\{T\}: Add /.test(l));
 if(abilities.length!==1||lines.some(l=>l.trim()&&!/^\{T\}: Add /.test(l)&&!/^.*enters (?:the battlefield )?tapped\.$/.test(l)))return null;
 const m=abilities[0].match(/^\{T\}: Add ((?:\{[WUBRGC]\})+)(?: or ((?:\{[WUBRGC]\})+))?\.$/);
 if(!m)return null;
 const options=[...m[1].matchAll(/\{(.)\}/g)].map(x=>x[1]);
 if(new Set(options).size!==1)return null;
 if(m[2]){const other=[...m[2].matchAll(/\{(.)\}/g)].map(x=>x[1]);if(other.length!==options.length||new Set(other).size!==1)return null;options.push(other[0]);}
 if(lines.some(l=>/\bif\b|doesn't untap|does not untap|can't untap/i.test(l)))return null;
 return {options:[...new Set(options)],units:[...m[1].matchAll(/\{/g)].length,tapped:/enters (?:the battlefield )?tapped/i.test(text)};
}
/** Bounded exact assignment: activate a physical source once, float only its chosen output. */
export function allocateMana(printed,sources,{limit=20000}={}){
 if(typeof printed!=='string'||printed.replace(/\{[^}]+\}/g,'').trim())return {status:'unknown',reason:'unrecognized cost'};
 const symbols=[...printed.matchAll(/\{([^}]+)\}/g)].map(x=>x[1]);
 if(symbols.some(s=>!/^\d+$|^[WUBRGC](?:\/[WUBRGC])?$/.test(s)))return {status:'unknown',reason:'variable/snow/phyrexian cost'};
 let generic=symbols.filter(s=>/^\d+$/.test(s)).reduce((n,s)=>n+Number(s),0);const pips=symbols.filter(s=>!/^\d+$/.test(s)).sort((a,b)=>a.length-b.length);
 let nodes=0,bounded=false;const failed=new Set();
 function walk(i,g,available,pool,receipt){
  if(++nodes>limit){bounded=true;return null;}if(i===pips.length&&!g)return {pool,available,receipt};
  const key=JSON.stringify([i,g,available.map(s=>s.id),pool.slice().sort()]);if(failed.has(key))return null;
  const need=i<pips.length?pips[i].split('/'):null;
  for(let j=0;j<pool.length;j++)if(!need||need.includes(pool[j])){const next=pool.slice();next.splice(j,1);const r=walk(i+(need?1:0),g-(need?0:1),available,next,receipt);if(r)return r;}
  for(let j=0;j<available.length;j++)for(const color of available[j].options){const s=available[j],rest=available.filter((_,k)=>k!==j);const r=walk(i,g,rest,[...pool,...Array(s.units).fill(color)],[...receipt,{source:s.id,color,units:s.units}]);if(r)return r;}
  failed.add(key);return null;
 }
 const r=walk(0,generic,sources.filter(s=>!s.floating),sources.filter(s=>s.floating).flatMap(s=>Array(s.units).fill(s.options[0])),[]);
 return r?{status:'supported',...r,nodes}:{status:bounded?'unknown':'unsupported',reason:bounded?'payment search bound':sources.reduce((n,s)=>n+s.units,0)<generic+pips.length?'insufficient supported mana quantity':'colored/true-colorless allocation conflict in supported sources',nodes};
}
const drawGrammar=c=>!permanent(c)&&/^(?:Draw (a|two|three) cards?\.)$/.test(oracleText(c))?({a:1,two:2,three:3}[oracleText(c).match(/^Draw (\w+)/)[1]]):0;
export function goldfishTrial({commander,cards,seed='functional-v1',trial=0,turns=8,policy='commander-first',disabled=[],recastTurns=[]}){
 if(cards?.length!==99||!commander)throw Error('Exactly commander + 99 required');
 if(!Number.isInteger(turns)||turns<1||turns>12||!['commander-first','development-first'].includes(policy))throw Error('Invalid bounded protocol');
 const slots=cards.map((card,i)=>({card,id:(card.oracle_id||card.name)+'#'+cards.slice(0,i).filter(c=>(c.oracle_id||c.name)===(card.oracle_id||card.name)).length}));
 const order=attempt=>slots.slice().sort((a,b)=>hash(`${seed}:${trial}:${attempt}:${a.id}`).localeCompare(hash(`${seed}:${trial}:${attempt}:${b.id}`)));
 let library,hand,attempt=0,bottom=[];
 // First multiplayer mulligan free; at most two further mulligans, always draw seven.
 for(;attempt<=3;attempt++){library=order(attempt);hand=library.splice(0,7);const lands=hand.filter(s=>isLandSlot(s.card)).length;if(lands>=2&&lands<=4||attempt===3)break;}
 const bottomCount=Math.max(0,attempt-1);hand.sort((a,b)=>Number(isLandSlot(b.card))-Number(isLandSlot(a.card))||String(a.id).localeCompare(b.id));
 // Bottom excess spells first; deterministic, not an optimal mulligan claim.
 for(let i=0;i<bottomCount;i++)bottom.push(hand.pop());library.push(...bottom);
 const initialHand=hand.map(s=>s.id);const board=[],grave=[],events=[],observations=[];let commandZone=true,casts=0,commanderTurn=null,terminal=null;
 const draw=(n,turn,why)=>{for(let i=0;i<n;i++){const s=library.shift();if(!s){terminal={turn,kind:'empty-library-draw loss',why};break;}if(s){hand.push(s);events.push({turn,kind:'draw',id:s.id,why});}}};
 const unknown=[...new Set([commander,...cards].filter(c=>c.catalogMissing||oracleText(c)&&!sourceGrammar(c)&&!drawGrammar(c)).map(c=>c.name))];
 for(let turn=1;turn<=turns;turn++){
  if(recastTurns.includes(turn)){const i=board.findIndex(s=>s.commander);if(i>=0){board.splice(i,1);commandZone=true;events.push({turn,kind:'scripted-command-zone-return',unknown:'external intervention, not opponent simulation'});}}
  draw(1,turn,'multiplayer draw step');if(terminal)break;
  const lands=hand.filter(s=>isLandSlot(s.card));lands.sort((a,b)=>Number(sourceGrammar(a.card)?.tapped??true)-Number(sourceGrammar(b.card)?.tapped??true)||a.id.localeCompare(b.id));
  if(lands[0]){const s=lands[0];hand.splice(hand.indexOf(s),1);board.push({...s,entered:turn});events.push({turn,kind:'land',id:s.id});}
  let available=board.flatMap(s=>{const g=disabled.includes(s.card.name)?null:sourceGrammar(s.card);return g&&(!g.tapped||s.entered<turn)&&(!castHasType(s.card,'Creature')||s.entered<turn)?[{...g,id:s.id}]:[];});
  let actionsPerformed=0;const startMana=available.map(s=>({id:s.id,options:s.options,units:s.units}));let throughput=0,immediateDraw=0;const blocked=[];
  for(let action=0;action<20;action++){
   const cmd={card:commander,id:'command-zone',commander:true};let candidates=hand.filter(s=>!isLandSlot(s.card));if(commandZone)candidates.push(cmd);
   candidates.sort((a,b)=>{const priority=s=>s.commander?(policy==='commander-first'?0:1):sourceGrammar(s.card)?(policy==='commander-first'?1:0):2;return priority(a)-priority(b)||a.id.localeCompare(b.id);});
   let played=false;for(const s of candidates){
    const c=s.card,t=oracleText(c);if(c.catalogMissing||!cost(c)||/additional cost|cast .*only|can't cast|as an additional|alternative cost|spells?[^.]*cost[^.]*\{|'?cast this spell'?/i.test(t)||c.card_faces?.length>1){blocked.push({card:c.name,status:'unknown',reason:'unsupported casting cost/restriction/face'});continue;}
    const p=allocateMana(cost(c)+(s.commander?`{${2*casts}}`:''),available);if(p.status!=='supported'){blocked.push({card:c.name,status:p.status,reason:p.reason});continue;}
    available=[...p.available,...p.pool.map((color,i)=>({id:`float-${turn}-${action}-${i}`,units:1,options:[color],floating:true}))];
    if(s.commander){commandZone=false;casts++;commanderTurn??=turn;}else hand.splice(hand.indexOf(s),1);
    actionsPerformed++;throughput++;events.push({turn,kind:'cast',id:s.id,card:c.name,cost:cost(c)+(s.commander?`{${2*(casts-1)}}`:''),payment:p.receipt,manaValue:c.cmc??null,types:c.type_line,commander:!!s.commander});
    if(permanent(c)){const b={...s,entered:turn};board.push(b);const g=disabled.includes(c.name)?null:sourceGrammar(c);if(g&&!g.tapped&&!castHasType(c,'Creature'))available.push({...g,id:s.id});}else grave.push(s);
    const n=disabled.includes(c.name)?0:drawGrammar(c);const obtained=Math.min(n,library.length);draw(n,turn,'supported immediate draw');immediateDraw+=obtained;played=true;break;
   }if(!played||terminal)break;
  }
  observations.push({actionBoundReached:actionsPerformed===20,status:actionsPerformed===20?'unknown remaining deployment after action bound':'bounded policy completed',turn,landDrop:!!lands[0],startMana,remainingMana:available,hand:hand.length,commanderOnBoard:!commandZone,throughput,immediateDraw,blocked,engines:board.filter(s=>sourceGrammar(s.card)).map(s=>s.card.name)});
  if(hand.length+library.length+board.filter(s=>!s.commander).length+grave.length!==99)throw Error('Zone conservation failed');if(terminal)break;
 }
 return {terminal,initialHand,finalZones:{hand:hand.map(s=>s.id),library:library.map(s=>s.id),battlefield:board.filter(s=>!s.commander).map(s=>s.id),graveyard:grave.map(s=>s.id)},seed,trial,policy,mulligans:attempt,bottomed:bottom.map(s=>s.id),commanderTurn,observations,events,coverage:{supported:['simple unconditional tap mana','exact colored/hybrid/generic/C','simple immediate draw','land timing','creature mana sickness','command zone/tax'],unknownCards:unknown,unsupported:['opponents','combat','triggers','recursion','restricted mana','cost reduction','top casting','alternative faces'],interpretation:'Absence of an unmodeled event is unknown, never zero strategy performance'}};
}
export function wilson(success,n){if(!n)return null;const z=1.96,d=1+z*z/n,c=(success/n+z*z/(2*n))/d,h=z*Math.sqrt(success/n*(1-success/n)/n+z*z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];}
export function runGoldfish(input,{trials=32,...options}={}){if(!Number.isInteger(trials)||trials<1||trials>512)throw Error('1–512 trials required');const runs=Array.from({length:trials},(_,trial)=>goldfishTrial({...input,...options,trial}));const deployed=runs.filter(r=>r.commanderTurn!==null).length;return {mode:'shadow only',trials,deployed,interval95:wilson(deployed,trials),runs};}
