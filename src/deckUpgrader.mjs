/** Experimental, local, score-free and stateless. Never invokes production selection. */
import {createHash} from 'node:crypto';
import {oracleId,isCommander,isBasic,isLandSlot,legalFor,priceOf} from './cards.mjs';
import {normalizedName} from './combos.mjs';
import {singletonName,exportCardName,validateCommanderSingleton} from './deckValidation.mjs';
import {buildCardJobLedger,compareJobLedgers} from './jobLedger.mjs';
import {dependencyAnalysis} from './functionalAblation.mjs';
import {sourceGrammar,runGoldfish} from './functionalGoldfish.mjs';
import {auditComboExecutions} from './comboExecutionEvidence.mjs';
import {conservativeComboViolation} from './strategyFirst.mjs';
import {withSelectedCards} from './deckSelection.mjs';
import {auditExportPricing} from './pricing.mjs';
const euro=n=>Math.round(n*100)/100, cents=c=>{const p=priceOf(c);if(p===null)throw Error('Missing eligible selected price: '+c.name);return Math.round(p*100);};
const key=c=>String(oracleId(c));
const indices=new WeakMap();
export function parseUpgradeDeck(text,catalog,{commanderId=null}={}){
 if(typeof text!=='string'||text.length>100000)throw Error('Paste a decklist of at most 100 KB.');
 let lookup=indices.get(catalog);if(!lookup){lookup=new Map();for(const c of catalog)for(const alias of [c.name,...(c.card_faces||[]).map(f=>f.name)]){const n=normalizedName(alias),xs=lookup.get(n)||[];if(!xs.some(x=>key(x)===key(c)))xs.push(c);lookup.set(n,xs);}indices.set(catalog,lookup);}
 const rows=[],errors=[],marked=[];let section='main';
 for(const [i,raw] of text.split(/\r?\n/).entries()){
  let line=raw.trim();if(!line||line.startsWith('#')||line.startsWith('//'))continue;
  if(/^(?:\/\/\s*)?commander:?$/i.test(line)){section='commander';continue;}if(/^(?:deck|mainboard|main):?$/i.test(line)){section='main';continue;}
  if(/^(?:sideboard|maybeboard|considering):?$/i.test(line)){errors.push('Remove sideboard/maybeboard sections before import.');section='excluded';continue;}if(section==='excluded')continue;
  const marker=/\*CMDR\*|\[(?:Commander|CMDR)\]|\[(?:[\w ]*Commander[\w ]*)\]/i.test(line)||section==='commander';
  line=line.replace(/\*CMDR\*|\[(?:Commander|CMDR)\]/gi,'').trim();const m=line.match(/^(\d+)\s*x?\s+(.+?)$/i);if(!m){errors.push(`Line ${i+1}: expected quantity and card name.`);continue;}
  const n=Number(m[1]);if(n<1||n>100){errors.push(`Line ${i+1}: invalid quantity.`);continue;}
  let name=m[2].replace(/\s+\([A-Za-z0-9]+\)\s+[A-Za-z0-9★-]+(?:\s+\*F\*)?$/,'').replace(/\s+\*F\*$/,'');
  let xs=lookup.get(normalizedName(name))||[];const exact=xs.filter(c=>normalizedName(c.name)===normalizedName(name));if(exact.length===1)xs=exact;if(xs.length!==1){errors.push(`Line ${i+1}: ${xs.length?'ambiguous identity':'unresolved card'}: ${name}`);continue;}
  if(rows.length+n>100){errors.push('More than 100 physical cards.');continue;}for(let j=0;j<n;j++){rows.push(xs[0]);if(marker)marked.push(xs[0]);}
 }
 let commander=null;const candidates=[...new Map(rows.filter(isCommander).map(c=>[key(c),c])).values()];
 if(commanderId){commander=rows.find(c=>key(c)===commanderId);if(!commander||!isCommander(commander))errors.push('Chosen commander must be a legal commander in the imported list.');}
 else if(marked.length===1&&isCommander(marked[0]))commander=marked[0];
 else if(marked.length)errors.push('A single legal commander marker is required; partners/backgrounds are not supported yet.');
 if(!commander&&candidates.length===1&&!marked.length)commander=candidates[0];
 const cards=rows.slice();if(commander)cards.splice(cards.indexOf(commander),1);
 if(rows.length!==100)errors.push(`Expected 100 cards, resolved ${rows.length}.`);
 if(commander){const s=validateCommanderSingleton(commander,cards);errors.push(...s.violations);for(const c of cards)if(!legalFor(c,commander))errors.push('Commander/color legality: '+c.name);}
 return {commander,cards,candidates:candidates.map(c=>({id:key(c),name:c.name})),errors:[...new Set(errors)],needsCommander:!commander&&candidates.length>1,originalText:text};
}
const exportText=(c,cards)=>[`${'1 '+exportCardName(c)} *CMDR*`,...cards.map(x=>'1 '+exportCardName(x))].join('\n');
function manaProfile(c,commander){
 const simple=sourceGrammar(c);if(simple)return simple;
 const raw=c.oracle_text||'';const line=raw.split('\n').find(l=>/^\{T\}: Add /.test(l));
 if(line&&!/Spend this mana|mana.*only|doesn't untap|does not untap|if you|unless/i.test(raw)){const isolated=sourceGrammar({...c,oracle_text:line});if(isolated)return {...isolated,tapped:/enters (?:the battlefield )?tapped/i.test(raw)};}
 const text=c.oracle_text||'';
 if(/^\{T\}: Add one mana of any color in your commander's color identity\.$/.test(text))return {units:1,options:commander.color_identity||[],tapped:false};
 return null;
}
function gates(commander,cards,{bracket,variants,catalog}){
 const errors=[];if(cards.length!==99)errors.push('Not commander + 99.');if(!isCommander(commander))errors.push('Illegal commander.');errors.push(...validateCommanderSingleton(commander,cards).violations);
 if(cards.some(c=>!legalFor(c,commander)))errors.push('Illegal card/color identity.');
 const gc=[commander,...cards].filter(c=>c.game_changer).length;if(gc>(bracket<=2?0:bracket===3?3:Infinity))errors.push('Known Game Changer allowance exceeded.');
 const compact=conservativeComboViolation(cards,commander,variants,bracket===5?4:bracket);if(compact)errors.push(compact.rule+': '+compact.id);
 for(const c of [commander,...cards]){const active=catalog.find(x=>key(x)===key(c));if(!active||JSON.stringify(active.printing)!==JSON.stringify(c.printing)||priceOf(active)!==priceOf(c))errors.push('Selected printing mismatch: '+c.name);if(priceOf(c)===null)errors.push('Unpriced card: '+c.name);if(c.pricingWarning||(!isBasic(c)&&c.printing?.eligibleVersion!==2&&c.pricingMethod!=='imported-en-nm-quote'))errors.push('Unverified eligible printing: '+c.name);}
 return [...new Set(errors)];
}
function value(commander,cards,catalog){const all=[commander,...cards],price=all.reduce((n,c)=>n+cents(c),0)/100,deck=withSelectedCards({deck:exportText(commander,cards),price,budget:price},commander,cards),audit=auditExportPricing(deck,commander,catalog);if(audit.anomalies.length||!audit.agreesWithGenerator||audit.count!==100||!audit.withinBudget)throw Error('Exact selected-printing audit failed.');return {value:price,audit,deck:deck.deck};}
const recurringDraw=c=>(c.oracle_text||'').split('\n').some(l=>/^(?:\{[WUBRGC0-9]+\})+(?:, \{T\})?(?:, Pay [12] life)?(?:, Sacrifice (?:a|another) creature)?: (?:You gain [12] life and )?[Dd]raw (?:a|two) cards?\.$/.test(l));
const protectedJob=j=>j.kind==='native:infrastructure'||j.kind==='recovery:zone-access'||j.kind==='payoff:death'||j.kind==='payoff:cast-pressure'||j.kind==='win:printed-outlet'||j.kind.startsWith('access:')&&j.sourceIsPersistent||j.provides.some(p=>p.kind==='token');
export function upgradeDeck({text,commanderId,bracket=3,budget=40,budgetTolerance=0,owned=[],locked=[],accepted=[],customPackages=[],resaleEnabled=false,resaleCredit=0,compare=false}={},catalog,variants=[]){
 if(![2,3,4,5].includes(Number(bracket)))throw Error('Bracket must be 2–5.');bracket=Number(bracket);
 if(!Number.isFinite(budget)||budget<0||budget>100000||euro(budget)!==budget||![0,4].includes(budgetTolerance))throw Error('Upgrade budget must be EUR with at most two decimals; tolerance 0 or 4.');
 if(![owned,locked,accepted,customPackages].every(Array.isArray)||owned.length>100||locked.length>100||accepted.length>12||customPackages.length>8)throw Error('Bounded choices exceeded.');
 if(typeof resaleEnabled!=='boolean'||!Number.isFinite(resaleCredit)||resaleCredit<0||resaleCredit>100000||euro(resaleCredit)!==resaleCredit)throw Error('Invalid explicit resale credit.');
 const parsed=parseUpgradeDeck(text,catalog,{commanderId});if(parsed.errors.length||!parsed.commander)return {stage:'import',...parsed,cards:undefined,commander:undefined,errors:parsed.errors};
 const {commander,cards}=parsed,ctx={bracket,variants,catalog},inputErrors=gates(commander,cards,ctx);if(inputErrors.length)return {stage:'validation',errors:inputErrors};
 const start=performance.now(),original=value(commander,cards,catalog),ledger=buildCardJobLedger({commander,cards}),combo=auditComboExecutions(variants,{commander,cards,catalog});
 const analysisDone=performance.now();
 const comboRows=combo.combinations.filter(c=>c.inventoryComplete),protectedNames=new Set([...locked.map(normalizedName),...comboRows.flatMap(r=>[...r.requirements.map(q=>normalizedName(q.name)),...(r.templateInventory.matches||[]).map(normalizedName)])]);
 for(const row of ledger.cards)if(row.jobs.some(protectedJob))protectedNames.add(normalizedName(row.card));
 const normalizedOwned=new Set(owned.map(normalizedName)),seenNames=new Set([commander,...cards].map(singletonName));
 const safeCuts=cards.filter(c=>!isLandSlot(c)&&!isBasic(c)&&!protectedNames.has(singletonName(c))&&/Artifact/.test(c.type_line)&&!/Creature/.test(c.type_line)&&/\bAdd\b/.test(c.oracle_text||''));
 const pool=catalog.filter(c=>legalFor(c,commander)&&!seenNames.has(singletonName(c))&&priceOf(c)!==null&&manaProfile(c,commander)&&!isLandSlot(c)&&!/Creature/.test(c.type_line)&&typeof c.mana_cost==='string'&&c.mana_cost.length>0&&!/\{[XS]\}|\/P/.test(c.mana_cost));
 // Bounded lexicographic enumeration. No merit, weighted roles, popularity or price reward.
 const proposals=[];const idFor=(cuts,adds)=>createHash('sha256').update(JSON.stringify([cuts.map(key),adds.map(key)])).digest('hex').slice(0,16);
 function propose(cuts,adds,reason,confidence='unverified'){
  const id=idFor(cuts,adds);if(proposals.some(p=>p.id===id))return;
  const test=buildCardJobLedger({commander,cards:cards.filter(c=>!cuts.includes(c)).concat(adds)});const incomingJobs=test.cards.filter(r=>adds.some(c=>singletonName(c)===normalizedName(r.card))).flatMap(r=>r.jobs);const properties=j=>({kind:j.kind,status:j.status,provides:j.provides,requires:j.requires,cost:j.cost,repeatability:j.repeatability,unresolved:j.unresolved});
  proposals.push({id,cuts:cuts.map(c=>({id:key(c),name:c.name,price:priceOf(c)})),adds:adds.map(c=>({id:key(c),name:c.name,price:priceOf(c),printing:c.printing})),reason,confidence,incomingJobs:incomingJobs.map(properties),enabledBy:[...new Set(incomingJobs.flatMap(j=>j.supportingCards))],outgoingJobs:ledger.cards.filter(r=>cuts.some(c=>singletonName(c)===normalizedName(r.card))).flatMap(r=>r.jobs.map(j=>({kind:j.kind,status:j.status,provides:j.provides,requires:j.requires,oracle:j.oracle}))),supportingCards:ledger.cards.filter(r=>cuts.some(c=>singletonName(c)===normalizedName(r.card))).flatMap(r=>r.jobs.flatMap(j=>j.supportingCards)),uncertainties:['Goldfish does not evaluate full native strategy, opponents or winning performance','Any unparsed outgoing Oracle function remains uncertain'],purchaseCost:euro(adds.reduce((n,c)=>n+(normalizedOwned.has(singletonName(c))?0:cents(c)),0)/100),oracle:{cuts:cuts.map(c=>({name:c.name,text:c.oracle_text})),adds:adds.map(c=>({name:c.name,text:c.oracle_text}))}});
 }
 for(const cut of safeCuts.sort((a,b)=>a.name.localeCompare(b.name)).slice(0,12))for(const add of pool.sort((a,b)=>a.name.localeCompare(b.name)).slice(0,120)){
  const a=manaProfile(add,commander),b=manaProfile(cut,commander);if(!b)continue;const lower=(add.cmc??100)<(cut.cmc??100),untap=b?.tapped&&!a.tapped;
  if(!normalizedOwned.has(singletonName(add))&&priceOf(add)>budget+budgetTolerance)continue;
  if((add.cmc??100)<=(cut.cmc??0)&&(lower||untap)&&(!b||a.units>=b.units&&b.options.every(x=>a.options.includes(x))))propose([cut],[add],b?'Earlier supported mana deployment with the recognized output preserved; review additional lost Oracle abilities':'Optional ramp replacement: lower casting cost; old conditional output remains uncertain',b?'supported mana property; whole-deck improvement unverified':'unverified');
  if(proposals.length>=12)break;
 }proposals.splice(12);
 // A one-shot/persistent access tradeoff is an experiment, never an automatic superiority claim.
 proposals.splice(4);
 const oneShotCuts=cards.filter(c=>!protectedNames.has(singletonName(c))&&ledger.cards.find(r=>normalizedName(r.card)===singletonName(c))?.jobs.some(j=>j.kind.startsWith('access:')&&!j.sourceIsPersistent)).sort((a,b)=>Number(!/^Draw /.test(a.oracle_text||''))-Number(!/^Draw /.test(b.oracle_text||''))||a.name.localeCompare(b.name)).slice(0,8);
 const accessPool=catalog.filter(c=>legalFor(c,commander)&&!seenNames.has(singletonName(c))&&/Creature|Enchantment|Artifact/.test(c.type_line)&&recurringDraw(c)&&typeof c.mana_cost==='string'&&c.mana_cost.length>0&&priceOf(c)!==null&&(normalizedOwned.has(singletonName(c))||priceOf(c)<=budget+budgetTolerance)).sort((a,b)=>Number(!/^\{[^\n]*:.*draw/i.test(a.oracle_text||''))-Number(!/^\{[^\n]*:.*draw/i.test(b.oracle_text||''))||(a.cmc??100)-(b.cmc??100)||a.name.localeCompare(b.name)).slice(0,80);
 let evaluatedAccess=0;
 for(const cut of oneShotCuts){for(const add of accessPool){
  if(evaluatedAccess++>=40||proposals.length>=8)break;if((add.cmc??100)>(cut.cmc??0)+1)continue;
  const lines=(add.oracle_text||'').split('\n');const recognized=lines.some(l=>/^(?:\{[WUBRGC0-9]+\})+(?:, \{T\})?(?:, Pay [12] life)?(?:, Sacrifice (?:a|another) creature)?: (?:You gain [12] life and )?[Dd]raw (?:a|two) cards?\.$/.test(l));if(!recognized||add.card_faces?.length>1||/Sacrifice (?:a|another) creature/i.test(cut.oracle_text||'')&&!/Sacrifice (?:a|another) creature/.test(add.oracle_text||''))continue;
  const testCards=cards.filter(c=>c!==cut).concat(add),next=buildCardJobLedger({commander,cards:testCards}),row=next.cards.find(r=>normalizedName(r.card)===singletonName(add)),old=ledger.cards.find(r=>normalizedName(r.card)===singletonName(cut));
  if(!row?.jobs.some(j=>j.kind.startsWith('access:')&&j.sourceIsPersistent&&(j.status==='supported'&&j.supportingCards.length||j.cost&&!j.cost.unparsed&&j.repeatability.startsWith('activation')&&(j.supportingCards.length||j.cost.resources.every(r=>['mana','life','tap-source'].includes(r.kind))))))continue;
  const special=old.jobs.filter(j=>j.kind.startsWith('consume:')||j.kind.startsWith('utility:'));if(special.some(j=>!row.jobs.some(x=>x.kind===j.kind)))continue;
  if(ledger.obligations.filter(o=>o.id.endsWith('|qualifying-input')&&(o.satisfiedBy||[]).includes(cut.name)).some(o=>{const anchor=next.cards.flatMap(r=>r.jobs).find(j=>j.id===o.anchor);return !anchor?.supportingCards.includes(add.name);}))continue;
  propose([cut],[add],'Optional one-shot access → persistent conditional engine tradeoff with qualifying support in this deck; loses immediate access/tempo and requires deployment, survival and paid follow-ups');
 }}
 // User-directed coordinated packages are never described as certified improvements.
 for(const p of customPackages){if(!Array.isArray(p.cuts)||!Array.isArray(p.adds)||p.cuts.length!==p.adds.length||p.cuts.length<1||p.cuts.length>3)throw Error('Custom packages require equal 1–3 cuts/additions.');const resolve=(n,xs)=>{let found=xs.filter(c=>singletonName(c)===normalizedName(n));const exact=found.filter(c=>normalizedName(c.name)===normalizedName(n));if(exact.length===1)found=exact;if(found.length!==1)throw Error('Unresolved/ambiguous package card: '+n);return found[0];};propose(p.cuts.map(n=>resolve(n,cards)),p.adds.map(n=>resolve(n,catalog)),'User-directed atomic strategy experiment; review printed functions and prerequisites');}
 const proposalsDone=performance.now();
 const byId=new Map(catalog.map(c=>[key(c),c]));let result=cards.slice();const usedCuts=new Set(),usedAdds=new Set();
 for(const id of accepted){const p=proposals.find(p=>p.id===id);if(!p)throw Error('Proposal expired or unknown; analyze again.');for(const cut of p.cuts){if(usedCuts.has(cut.id))throw Error('Conflicting packages remove the same card.');if(protectedNames.has(normalizedName(cut.name)))throw Error('Protected native engine, locked card or combo commitment: '+cut.name);const i=result.findIndex(c=>key(c)===cut.id);if(i<0)throw Error('Cut not present.');result.splice(i,1);usedCuts.add(cut.id);}for(const add of p.adds){if(usedAdds.has(add.id))throw Error('Conflicting packages add the same card.');result.push(byId.get(add.id));usedAdds.add(add.id);}}
 const errors=gates(commander,result,ctx);const afterLedger=accepted.length?buildCardJobLedger({commander,cards:result}):ledger;
 // Preserve actual recognized mana channels, not price or generic role superiority.
 for(const color of ['W','U','B','R','G','C']){const capacity=xs=>xs.reduce((n,c)=>n+(manaProfile(c,commander)?.options.includes(color)?manaProfile(c,commander).units:0),0);if(capacity(result)<capacity(cards))errors.push('Lost recognized '+color+' mana availability.');}
 for(const old of ledger.obligations.filter(o=>o.id.endsWith('|qualifying-input')&&o.status==='supported')){const next=afterLedger.obligations.find(o=>o.id===old.id);if(next?.status==='unsupported')errors.push('Disconnected existing supported strategy input: '+old.id);}
 const afterCombo=auditComboExecutions(variants,{commander,cards:result,catalog});for(const old of comboRows)if(!afterCombo.combinations.some(r=>r.id===old.id&&r.inventoryComplete))errors.push('Broken existing combo commitment: '+old.id);
 const added=result.filter(c=>!seenNames.has(singletonName(c))),removed=cards.filter(c=>!result.some(x=>key(x)===key(c))),gross=added.reduce((n,c)=>n+(normalizedOwned.has(singletonName(c))?0:cents(c)),0)/100;
 const credit=resaleEnabled&&removed.length?resaleCredit:0,net=Math.max(0,euro(gross-credit)),ceiling=euro(budget+budgetTolerance);if(net>ceiling)errors.push('Incremental purchase cost exceeds upgrade ceiling.');
 const proposed=value(commander,result,catalog),delta=compareJobLedgers(ledger,afterLedger);
 const validationDone=performance.now(),goldfish=compare?{original:runGoldfish({commander,cards},{trials:16,seed:'upgrader-v1'}),proposed:runGoldfish({commander,cards:result},{trials:16,seed:'upgrader-v1'}),warning:'Conditional supported projections only; unknown native effects cannot be compared.'}:null;
 return {stage:'review',experimental:true,commander:{id:key(commander),name:commander.name},originalText:text,original:{value:original.value,deck:original.deck,audit:original.audit},proposed:{value:proposed.value,deck:errors.length?null:proposed.deck,audit:proposed.audit},budget:{target:budget,tolerance:budgetTolerance,ceiling,grossPurchaseCost:euro(gross),resaleCredit:credit,netAcquisitionCost:net,remaining:euro(ceiling-net),shippingIncluded:false,ownedNewCards:added.filter(c=>normalizedOwned.has(singletonName(c))).map(c=>c.name)},proposals,accepted,errors,canExport:errors.length===0,analysis:{ledger,dependencies:dependencyAnalysis(ledger),combos:combo,changes:delta,knownPolicy:'Current local Game Changer/compact-combo gates only; not current official bracket certification (Issue #10)',protectedNames:[...protectedNames]},goldfish,runtime:{analysisMs:Math.round(analysisDone-start),proposalMs:Math.round(proposalsDone-analysisDone),validationMs:Math.round(validationDone-proposalsDone),goldfishMs:Math.round(performance.now()-validationDone),peakRSSKiB:process.resourceUsage().maxRSS,peakScope:'process lifetime, not incremental allocation'}};
}
