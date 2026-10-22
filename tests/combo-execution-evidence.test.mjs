import test from 'node:test';
import assert from 'node:assert/strict';
import {auditComboExecutions} from '../src/comboExecutionEvidence.mjs';
import {normalizeVariant} from '../src/combos.mjs';
const card=(name,text='',extra={})=>({id:name,name,type_line:'Artifact',oracle_text:text,mana_cost:'{2}',cmc:2,color_identity:[],...extra});
const commander=card('Commander','',{type_line:'Legendary Creature — Eldrazi'}),a=card('Mana engine','{T}: Add {C}{C}{C}.'),b=card('Copy engine','{2}: Copy target activated ability.');
const variant=(id='1-2',extra={})=>normalizeVariant({id,uses:[{card:{name:a.name},zoneLocations:['B'],battlefieldCardState:'is untapped'},{card:{name:b.name},zoneLocations:['B']}],manaNeeded:'{2}{C}{C}',description:'Activate Mana engine by tapping it.\nHolding priority, pay {C}{C} and sacrifice a token.',produces:[{feature:{name:'Infinite colorless mana'}}],...extra});
const audit=(v,opts={})=>auditComboExecutions(v,{commander,cards:[a,b],catalog:[commander,a,b],...opts});

test('retains exact starting zones, quantities, costs, stack actions and separate true-colorless payments',()=>{
 const r=audit([variant()],{proposedIds:['1-2']}).combinations[0];
 assert.equal(r.inventoryComplete,true);assert.equal(r.proposed,true);
 assert.deepEqual(r.requirements[0].startingZones,[{code:'B',name:'battlefield'}]);
 assert.equal(r.requirements[0].battlefieldCardState,'is untapped');
 assert.equal(r.initialMana.trueColorlessSymbols,2);assert.equal(r.initialMana.spellbook,'{2}{C}{C}');
 assert.equal(r.actions[0].requiresTap,true);assert.equal(r.actions[1].priority,true);
 assert.ok(r.actions[1].resources);assert.equal(r.conversion.publishedDirectWinRoute,false);
 assert.equal(r.executionVerified,false);assert.equal(r.timing.reliableTurn,null);
});
test('commander participation differs from the explicit must-be-commander restriction',()=>{
 const v=variant('1-3',{uses:[{card:{name:commander.name},zoneLocations:['C']},{card:{name:b.name}}]});
 let r=audit([v]).combinations[0];assert.equal(r.commanderRequired,true);assert.equal(r.inventoryComplete,true);
 assert.equal(r.requirements[0].isCommander,true);assert.equal(r.requirements[0].mustBeCommander,false);
 r=audit([variant('1-4',{uses:[{card:{name:a.name},mustBeCommander:true}]})]).combinations[0];
 assert.equal(r.inventoryComplete,false);assert.match(r.missing[0].reason,/must be commander/);
});
test('owned names cannot satisfy extra quantities or distinct template slots for free',()=>{
 const v=variant('1-5',{uses:[{card:{name:a.name},quantity:2}],requires:[{template:{name:'An Artifact'},quantity:2,zoneLocations:['E']}]});
 const r=audit([v]).combinations[0];assert.equal(r.inventoryComplete,false);assert.equal(r.requiredNamedQuantity,2);assert.equal(r.requiredTemplateQuantity,2);
 assert.equal(r.missing[0].available,1);assert.equal(r.templateInventory.satisfied,false);
 assert.equal(r.templates[0].startingZones[0].name,'exile');
});
test('a referenced back face exposes the real craft setup rather than its cheap front cost',()=>{
 const crafted=card('Puzzle // Transformed engine','Craft with four nonlands {8}{U}',{layout:'transform',card_faces:[{name:'Puzzle',mana_cost:'{U}',oracle_text:'Craft with four nonlands {8}{U}.'},{name:'Transformed engine',oracle_text:'Whenever you activate an ability, copy it.'}]});
 const v=variant('1-6',{uses:[{card:{name:crafted.name}},{card:{name:a.name}}],description:'Activate Mana engine. Transformed engine triggers, copying the ability.'});
 const r=audit([v],{cards:[a,crafted],catalog:[a,crafted,commander]}).combinations[0];
 assert.equal(r.inventoryComplete,true);assert.equal(r.requirements[0].castCost,'{U}');
 assert.match(r.requirements[0].setupWarnings[0].setupOracle,/\{8\}\{U\}/);
 assert.equal(r.timing.status,'unknown');assert.equal(r.executionVerified,false);
 const modal={...crafted,layout:'modal_dfc'};const m=audit([v],{cards:[a,modal],catalog:[a,modal,commander]}).combinations[0];
 assert.match(m.requirements[0].setupWarnings[0].detail,/does not require a transform action/);
});
test('a two-card count, upstream bracket or invented timing property never assigns a pod bracket',()=>{
 for(const v of [variant('1-7',{bracket:4,estimatedTurn:6}),variant('1-8',{uses:[{card:{name:a.name}},{card:{name:b.name}},{card:{name:commander.name}}]})]){
  const r=audit([v]).combinations[0];assert.equal(r.podPolicyAssessment.status,'unknown');assert.equal(r.podPolicyAssessment.assignedBracket,null);
  assert.equal(r.timing.earliestTurn,null);assert.equal(r.timing.reliableTurn,null);
 }
});
test('infinite mana and an outlet needing extra resources are not certified as a win',()=>{
 const outlet=card('Resource outlet','{1}{C}, Sacrifice a creature: This artifact deals 2 damage to any target.');
 const r=audit([variant()],{cards:[a,b,outlet]}).combinations[0];
 assert.equal(r.conversion.status,'not verified');assert.equal(r.conversion.publishedDirectWinRoute,false);
 assert.equal(r.conversion.outletCandidates[0].needsReview,true);
 assert.match(r.conversion.outletCandidates[0].cost,/Sacrifice a creature/);
});
test('redundant piece sets preserve each condition rather than create independent wins or mutate inputs',()=>{
 const v=variant(),w=variant('1-9',{other_prerequisites:'A creature has haste.'}),before=JSON.stringify([v,w]);
 const r=audit([v,w]);assert.deepEqual(r.redundantPieceSetGroups,[['1-2','1-9']]);assert.equal(r.independentWinConditions,null);
 assert.equal(r.combinations[1].prerequisites.includes('A creature has haste.'),true);
 assert.equal(JSON.stringify([v,w]),before);
});

test('the documented turn-six example pays actual spell costs and reserves true-colorless without certifying reliability',async()=>{
 const {ulalekTurnSixExample}=await import('../tools/lib/ulalek-turn-six-example.mjs');
 const cmd=card('Ulalek, Fused Atrocity','',{mana_cost:'{C/W}{C/U}{C/B}{C/R}{C/G}',color_identity:['W','U','B','R','G']});
 const mana=card('Mind Stone','{T}: Add {C}.',{mana_cost:'{2}'}),fix=card('Arcane Signet',"{T}: Add one mana of any color in your commander's color identity.",{mana_cost:'{2}'});
 const annie=card('Annie Joins Up','If a triggered ability of a legendary creature you control triggers, that ability triggers an additional time.',{mana_cost:'{1}{R}{G}{W}'});
 const spawn=card('Spawn-Gang Commander','When you cast this spell, create three tokens.\n{1}{C}, Sacrifice an Eldrazi: This creature deals 2 damage to any target.',{mana_cost:'{3}{R}{R}'});
 const lands=['Forest','Plains','Mountain','Island','Wastes','Wastes'].map(n=>card(n));
 const r=ulalekTurnSixExample(cmd,[...lands,mana,fix,annie,spawn]);
 assert.equal(r.conditionalTurn,6);assert.equal(r.reliableTurn,null);assert.equal(r.earliestTurn,null);assert.equal(r.executionVerified,false);
 assert.equal(r.payments.at(-1).additionalUlalekPayment,'{C}{C}');assert.equal(r.payments.at(-1).remainingUnits,1);
 assert.equal(ulalekTurnSixExample(cmd,[...lands.slice(0,5),mana,fix,annie,spawn]).status,'unavailable in selected deck');
});
