/** Exact deployment/value observations for every predeclared original input.
 * Supplemental receipt pass; no seed/pilot selection, deck search or scoring.
 * node tools/observe-stage5-originals.mjs CACHE OUTPUT */
import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {evaluateGameplay} from '../src/gameplayState.mjs';import {auditGameplayTrace} from '../src/gameplayZoneAudit.mjs';import {commonIdentityOrder,shadowSeeds} from '../src/gameplayShadow.mjs';import {nativeModel} from '../src/gameplayNative.mjs';import {outletModel} from '../src/gameplayOutlets.mjs';
const [cache,out]=process.argv.slice(2);if(!out)throw Error('Supply CACHE OUTPUT');const begin=performance.now(),load=async p=>JSON.parse(await readFile(p)),sha=x=>createHash('sha256').update(x).digest('hex'),catalog=await load(cache+'/cards.json'),by=new Map(catalog.map(c=>[c.id,c])),seeds=shadowSeeds({training:8,holdout:16,namespace:'gameplay-native-stage5-v1-2026-10-22'}),rows=[];
for(const name of ['ulalek-b3-original','ulalek-b4-original']){const ledger=await load('benchmarks/v12/stage4/'+name+'-audit.json'),[commander,...cards]=ledger.selectedPrintings.map(p=>by.get(p.id));
 for(const decision of ['copy-first','resources-first','conservative','follow-up'])for(const [partition,set]of Object.entries(seeds))for(const seed of set)for(const policy of ['commander-first','development','native']){
  const options={commander,cards,seed,policy,order:commonIdentityOrder(cards,seed),nativeExecution:true,nativeStage5:true,nativeDecisionPolicy:decision},r=evaluateGameplay(options),proof=auditGameplayTrace(r,commander,cards);assert.ok(proof.valid,JSON.stringify(proof));assert.deepEqual(evaluateGameplay(options),r);
  const defs=new Map(cards.map((c,i)=>['deck-'+i,c]));defs.set('commander',commander);const objects=new Map(),deployments=[],resolved={};
  for(const e of r.trace){if(e.event==='copy-created')defs.set(e.id,defs.get(e.original));if(e.event==='stack-push')objects.set(e.id,e);
   if(e.event==='permanent-resolved'){const c=defs.get(e.id),m=nativeModel(c),outlet=outletModel(c),roles=[...(m.ulalek?['copy-payment']:[]),...(m.cascadeGrant?['cascade']:[]),...(m.multiplier.length?['multiply']:[]),...(m.castCopy?['copy-spell']:[]),...(m.triggers.some(t=>t.kind==='tutor')?['tutor']:[]),...(outlet.entryDamage||outlet.sacrificeDamage?['outlet']:[])];if(roles.length)deployments.push({id:e.id,card:c.name,turn:e.turn,copy:e.id.startsWith('copy-'),roles});}
   if(e.event==='stack-resolve-end'){const o=objects.get(e.id);if(o?.kind==='ability'){const k=(defs.get(o.source)?.name||o.source)+':'+o.effect.type;resolved[k]=(resolved[k]||0)+1;}}
  }
  rows.push({deck:name,decision,partition,seed,policy,commanderTurn:r.stats.commanderDeploymentTurn,outlets:r.outlets,lost:r.lost,bounded:r.nativeExecution.boundedUnknown,native:r.stats.native,paidOriginal:r.stats.optionalPayments.filter(p=>!p.copy).length,paidCopied:r.stats.optionalPayments.filter(p=>p.copy).length,deployments,resolvedAbilities:resolved,followups:r.trace.filter(e=>e.event==='native-followup-snapshot'),turns:r.observations.map(o=>({turn:o.turn,draws:o.effectDraws,hand:o.handSize,trueColorlessBefore:o.manaBeforeActions.max.C,payTriggeredCCBefore:o.manaBeforeActions.separateTriggeredCC,threats:o.threatsBeforeActions}))});
 }
 console.log(name,'observations complete');
}
await writeFile(out+'/original-observations.json.gz',gzipSync(JSON.stringify({toolSHA256:sha(await readFile(new URL(import.meta.url))),seeds,rows,audits:rows.length,replays:rows.length,runtimeMs:Math.round(performance.now()-begin)}),{level:9}));console.log('Audited and replayed',rows.length);
