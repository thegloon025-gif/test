/** v1.0 -- locally sourced, bracket-isolated strategy seeds. No network calls.
 * Community co-occurrence is OBSERVATIONAL. This module prepares competing
 * coherent packages; the generator must still enforce all hard legality gates.
 */
import {analyzeCommunityKnowledge,independentCommunityDecks} from './communityKnowledge.mjs';
import {isLandSlot,isBasic,oracleId,legalFor,priceOf} from './cards.mjs';
import {analysis,planFor,synergy} from './mechanics.mjs';
import {roleEvidence} from './roleEvidence.mjs';

const round=n=>Math.round(n*100)/100;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const sorted=(a,b)=>String(a).localeCompare(String(b));
const listIds=d=>new Set((d.mainboard||[]).filter(x=>Number(x.quantity)>0).map(x=>String(x.id)));

/**
 * Derives *alternative* package seeds from independent creator-attributed
 * community decks. No popularity->power claims and no forced weak inclusions.
 * Bracket-declared cohorts never include unknown or cross-bracket lists.
 */
export function prepareCommunityConstruction({decks=[],commander,bracket,catalog=[],mode='auto'}={}){
 const empty=(status,reason,extra={})=>({status,reason,selected:null,candidates:[],sampleSize:0,highConfidence:false,...extra});
 if(mode==='off')return empty('disabled','Community-guided construction disabled by user.');
 if(!commander||![2,3,4].includes(Number(bracket)))return empty('unavailable','Missing commander or valid bracket.');
 const id=oracleId(commander),b=Number(bracket);
 const basics=new Set(catalog.filter(isBasic).map(oracleId));
 const stats=analyzeCommunityKnowledge(decks,{commanderId:id,bracket:b,basicIds:basics});
 const common={sampleSize:stats.sampleSize,highConfidence:stats.highConfidence,provenance:stats.provenance,
  caution:stats.cautions.filter(x=>!x.startsWith('Public deck popularity'))};
 if(stats.sampleSize<3)return empty('insufficient',`Only ${stats.sampleSize} distinct validated B${b} deck(s). At least 3 needed; local generator retained.`,common);
 if(stats.independentCreatorCount<2)return empty('insufficient','Fewer than two identified independent creators; community input withheld.',common);
 const cohort=independentCommunityDecks(decks,{commanderId:id,bracket:b}).decks;
 const legal=new Map(catalog.filter(c=>!isLandSlot(c)&&legalFor(c,commander)&&priceOf(c)!==null)
  .map(c=>[String(oracleId(c)),c]));
 const plan=planFor(commander),evidence=new Map(stats.inclusion.map(c=>[c.id,c]));
 const known=new Map();
 function merit(id){
  if(known.has(id))return known.get(id);
  const c=legal.get(id),inc=evidence.get(id);
  if(!c||!inc||inc.genericStaple){known.set(id,-Infinity);return -Infinity;}
  const s=synergy(c,plan,analysis(c)),r=roleEvidence(c);
  const primary=s.impact>=4,solidDraw=r.draw==='positive',broad=r.removal==='broad',shield=r.shield==='dedicated';
  // Generic 3-mana fixing/delayed draw is not a strategy package even if common.
  const practical=primary||solidDraw||broad||shield||s.impact>0;
  if(!practical){known.set(id,-Infinity);return -Infinity;}
  const val=12*Math.min(1,inc.rate)+Math.min(26,s.impact*1.7)+
    (primary?14:0)+(solidDraw?9:0)+(broad?8:0)+(shield?7:0)-
    Math.max(0,(c.cmc||0)-4)*4-Math.min(9,(priceOf(c)||0)*.35);
  known.set(id,val);return val;
 }
 const candidates=[],seen=new Set();
 function addCandidate(id,label,sources,packages){
  const matching=cohort.filter(d=>sources.includes(d.key));
  if(matching.length<2)return;
  const frequencies=new Map();for(const d of matching)for(const cid of listIds(d))frequencies.set(cid,(frequencies.get(cid)||0)+1);
  const grouped=packages.filter(p=>p.cards.every(cid=>legal.has(cid)&&Number.isFinite(merit(cid)))&&p.count>=3)
   .sort((a,b)=>b.score-a.score||b.count-a.count).slice(0,3);
  // Expose each package as an ATOMIC unit to the constructor. Choosing a
  // partial package should never be mistaken for having imported the pattern.
  const uniquePackages=[],packageSeen=new Set();
  for(const pkg of grouped){const ids=pkg.cards.filter(cid=>!packageSeen.has(cid));if(ids.length<2)continue;
   for(const cid of ids)packageSeen.add(cid);
   uniquePackages.push({ids,sourceDecks:pkg.supportingDecks.filter(k=>sources.includes(k)),support:pkg.count,score:pkg.score});
  }
  const ids=[...frequencies].filter(([cid,count])=>count>=2&&count/matching.length>=.4&&Number.isFinite(merit(cid)))
   .sort((a,b)=>(merit(b[0])+8*b[1]/matching.length)-(merit(a[0])+8*a[1]/matching.length)||sorted(a[0],b[0]))
   .map(([cid])=>cid).slice(0,16);
  const together=new Set([...uniquePackages.flatMap(x=>x.ids),...ids]);
  const onPlan=[...together].filter(cid=>{const c=legal.get(cid);return c&&synergy(c,plan,analysis(c)).impact>=4;}).length;
  if(together.size<2||onPlan<1)return;
  const signature=[...together].slice(0,5).map(cid=>legal.get(cid)?.name||cid);
  const signatureKey=[...together].slice(0,10).sort(sorted).join('|');if(seen.has(signatureKey))return;seen.add(signatureKey);
  const score=round([...together].reduce((s,cid)=>s+Math.max(0,merit(cid)),0)/Math.sqrt(Math.max(2,together.size))+
   matching.length*3+uniquePackages.length*12+onPlan*3);
  candidates.push({id,label,cardIds:ids,packages:uniquePackages,sourceDecks:sources,sourceCount:matching.length,
   score,signature,onPlanCandidates:onPlan});
 }
 for(let i=0;i<stats.archetypes.length;i++){
  const cluster=stats.archetypes[i];
  const relevant=stats.packages.filter(p=>p.supportingDecks.filter(k=>cluster.sourceDecks.includes(k)).length>=2);
  addCandidate(`cluster:${i}`,`Archetype ${i+1}: ${cluster.signature.slice(0,3).map(x=>legal.get(x.id)?.name).filter(Boolean).join(' / ')||'community cluster'}`,cluster.sourceDecks,relevant);
 }
 for(let i=0;i<Math.min(4,stats.packages.length);i++){
  const pkg=stats.packages[i];
  if(pkg.count<3)continue;
  addCandidate(`package:${i}`,`Package ${i+1}: ${pkg.cards.map(cid=>legal.get(cid)?.name).filter(Boolean).join(' + ')}`,pkg.supportingDecks,[pkg]);
 }
 candidates.sort((a,b)=>b.score-a.score||sorted(a.id,b.id));
 if(!candidates.length)return empty('no-packages','Community decks are available, but no mechanically relevant recurring strategy package passed the evidence filters; local generator retained.',common);
 return {status:'ready',reason:'Community strategies are observational seeds, not proof of win rate or power.',
  selected:candidates[0],candidates:candidates.slice(0,6),...common,
  cardIndex:legal, // server-only map, stripped before JSON output
  maxSeedCards:stats.highConfidence?12:clamp(Math.floor(stats.sampleSize/2)+2,4,7)};
}

/** API/report-safe data: never serialize a full Scryfall catalog or Map. */
export function communityStrategySummary(prepared){
 return {status:prepared.status,reason:prepared.reason,sampleSize:prepared.sampleSize||0,
  highConfidence:!!prepared.highConfidence,maxSeedCards:prepared.maxSeedCards||0,
  candidates:(prepared.candidates||[]).map(x=>({id:x.id,label:x.label,sourceCount:x.sourceCount,score:x.score,
   signature:x.signature,packageCount:x.packages.length})),caution:prepared.caution||[]};
}
