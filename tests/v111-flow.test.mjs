import test from 'node:test';
import assert from 'node:assert/strict';
import {researchForGeneration} from '../src/researchFlow.mjs';
const sample={key:'archidekt:400',sourceId:'400',validated:true,edhBracket:3,commanderIds:['cmr'],mainboard:[],owner:'sample'};
const args={commanderId:'cmr',commanderName:'Example Legend',bracket:3,budget:191,catalog:[],savedCommunity:[],record:async()=>{},lookup:async()=>({variants:[],total:0,truncated:false,fromCache:true,pages:1})};

test('one-click flow discovers, reloads verified sources, checks combo and returns refreshed cohort',async()=>{
 const events=[];
 const result=await researchForGeneration({...args,
  discover:async()=>{events.push('discover');return {added:[{id:'400'}],examined:12,eligible:5,skippedCount:7,rateLimited:false,pagesSearched:2,distinctValidated:1,distinctCreators:1};},
  reload:async()=>{events.push('reload');return [sample];},
  analyze:async(d,c,{onVerifiedResponse})=>{assert.equal(d.key,'archidekt:400');events.push('combos');await onVerifiedResponse({included:[],near:[]});return {counts:{complete:2,infiniteComplete:1},fromCache:false};},
  record:async(id)=>{assert.equal(id,'cmr');events.push('persist');}
 });
 assert.deepEqual(events,['discover','reload','persist','combos','persist']);
 assert.equal(result.community.length,1);
 assert.equal(result.report.matchingSaved,1);
 assert.equal(result.report.discovery.status,'completed');
 assert.equal(result.report.combos.complete,2);
 assert.equal(result.report.combos.infiniteInventory,1);
});

test('online discovery and combo failures leave saved deck data available',async()=>{
 const result=await researchForGeneration({...args,savedCommunity:[sample],
  discover:async()=>{throw Error('Network offline');},
  analyze:async()=>{throw Error('Spellbook not reachable');}
 });
 assert.deepEqual(result.community,[sample]);
 assert.equal(result.report.discovery.status,'unavailable');
 assert.equal(result.report.combos.status,'unavailable');
 assert.match(result.report.discovery.error,/Network offline/);
});

test('same-session reuse skips Archidekt but preserves bounded combo check',async()=>{
 let called=0;
 const result=await researchForGeneration({...args,savedCommunity:[sample],reuseDiscovery:true,
  discover:async()=>{called++;throw Error('should not run');},
  reload:async()=>{throw Error('should not reload');},
  analyze:async()=>({counts:{complete:0,infiniteComplete:0},fromCache:true})
 });
 assert.equal(called,0);
 assert.equal(result.report.discovery.status,'reused');
 assert.equal(result.report.combos.checkedSources,1);
 assert.equal(result.report.combos.fromCache,true);
});

test('research does not confuse a different commander or bracket with eligible combo sources',async()=>{
 const result=await researchForGeneration({...args,savedCommunity:[{...sample,commanderIds:['other']},{...sample,edhBracket:4}],
  reuseDiscovery:true,analyze:async()=>{throw Error('Should not check ineligible decks');}
 });
 assert.equal(result.report.matchingSaved,0);
 assert.equal(result.report.combos.status,'no-source');
});
