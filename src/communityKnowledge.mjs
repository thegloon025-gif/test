/**
 * v0.9: offline, evidence-limited learning from attributed, verified community decks.
 * This file NEVER fetches public data and NEVER votes on generated deck legality.
 * Observations are inclusion events in independent-ish source lists, not game results.
 */
const BASIC=/^(Plains|Island|Swamp|Mountain|Forest|Wastes|Snow-Covered (?:Plains|Island|Swamp|Mountain|Forest))$/i;
const MIN_BASELINE_DECKS=6, MIN_CONFIDENT_DECKS=8;
const finiteRatio=(a,b)=>b>0?a/b:0;
const rounded=(n,p=3)=>Number(n.toFixed(p));
const keySort=(a,b)=>String(a).localeCompare(String(b));
const pairKey=(a,b)=>JSON.stringify([a,b].sort(keySort));
const toSet=deck=>new Set((deck.mainboard||[]).filter(x=>x?.id&&Number(x.quantity)>0&&!BASIC.test(String(x.name||''))).map(x=>String(x.id)));
const jaccard=(a,b)=>{let match=0;for(const id of a)if(b.has(id))match++;return finiteRatio(match,a.size+b.size-match);};
const ownerKey=d=>String(d.owner||'').toLowerCase().trim();

/** Deduplicate same-key reimports and exact (or nearly exact) lists within a cohort.
 * Owners are tracked for independence warnings, not as a reason to discard distinct brews.
 * Near-identical lists are only collapsed at 96% overlap, preserving real archetype variants.
 */
export function independentCommunityDecks(decks,{commanderId=null,bracket=null}={}){
 const unique=[],ignored=[];
 const seenKeys=new Set(),sets=[];
 const pool=(Array.isArray(decks)?decks:[]).filter(d=>d?.validated===true&&d.commanderIds?.length===1&&(!commanderId||d.commanderIds[0]===commanderId)&&(bracket===null||d.edhBracket===bracket))
  .sort((a,b)=>String(a.key||'').localeCompare(String(b.key||'')));
 for(const deck of pool){
  const key=String(deck.key||'');if(key&&seenKeys.has(key)){ignored.push({key,reason:'duplicate source key'});continue;}
  if(key)seenKeys.add(key);
  const bag=toSet(deck);if(!bag.size){ignored.push({key,reason:'empty mainboard'});continue;}
  // Never collapse a tiny test list merely because some individual cards recur.
  const clone=sets.find(x=>x.commander===deck.commanderIds[0]&&x.bracket===(deck.edhBracket??null)&&bag.size>=8&&x.bag.size>=8&&jaccard(bag,x.bag)>=0.96);
  if(clone){ignored.push({key,reason:'near-identical cardlist',similarTo:clone.key});continue;}
  unique.push(deck);sets.push({key,bag,bracket:deck.edhBracket??null,commander:deck.commanderIds[0]});
 }
 return {decks:unique,ignored};
}

// Wilson interval for the unknown underlying inclusion probability.
export function wilsonInterval(successes,total,z=1.96){
 if(!total)return {lower:0,upper:1};
 const p=successes/total,z2=z*z,denom=1+z2/total;
 const center=(p+z2/(2*total))/denom;
 const margin=z*Math.sqrt(p*(1-p)/total+z2/(4*total*total))/denom;
 return {lower:rounded(Math.max(0,center-margin)),upper:rounded(Math.min(1,center+margin))};
}

const safeOwnerCount=decks=>new Set(decks.map(x=>ownerKey(x)).filter(Boolean)).size;

/** Stable cohort clusters: complete-link merge prevents single bridging decks from
 * joining otherwise dissimilar groups. Popular cards are omitted before similarity.
 */
export function communityClusters(decks,{threshold=0.23}={}){
 if(decks.length<2)return [];
 const bags=decks.map(toSet),counts=new Map();
 for(const bag of bags)for(const id of bag)counts.set(id,(counts.get(id)||0)+1);
 const reduced=bags.map(bag=>new Set([...bag].filter(id=>(counts.get(id)||0)/decks.length<0.8)));
 const groups=decks.map((_,i)=>[i]);
 while(true){
  let best=null;
  for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
   let minimum=1,average=0,n=0;
   for(const a of groups[i])for(const b of groups[j]){const sim=jaccard(reduced[a],reduced[b]);minimum=Math.min(minimum,sim);average+=sim;n++;}
   if(minimum<threshold)continue;
   average/=n;
   if(!best||minimum>best.minimum+1e-9||Math.abs(minimum-best.minimum)<1e-9&&average>best.average+1e-9)best={i,j,minimum,average};
  }
  if(!best)break;
  groups[best.i].push(...groups[best.j]);groups.splice(best.j,1);
 }
 return groups.filter(g=>g.length>=2).map(g=>{
  const countsIn=new Map();for(const i of g)for(const id of reduced[i])countsIn.set(id,(countsIn.get(id)||0)+1);
  const signature=[...countsIn].sort((a,b)=>b[1]-a[1]||keySort(a[0],b[0])).slice(0,8).map(([id,count])=>({id,count,rate:rounded(count/g.length)}));
  return {size:g.length,sourceDecks:g.map(i=>decks[i].key),signature,cohesion:rounded(g.reduce((sum,i,idx)=>sum+g.slice(idx+1).reduce((s,j)=>s+jaccard(reduced[i],reduced[j]),0),0)/Math.max(1,g.length*(g.length-1)/2))};
 }).sort((a,b)=>b.size-a.size||String(a.sourceDecks[0]).localeCompare(String(b.sourceDecks[0])));
}

/** Analyze one commander/bracket cohort; optional cross-commander reference is a
 * *different* and independent cohort, never a proxy for win rate or power level.
 */
export function analyzeCommunityKnowledge(allDecks,{commanderId,bracket=null,minSamples=3,basicIds=null}={}){
 if(bracket!==null&&![2,3,4].includes(Number(bracket)))throw Error('Invalid community bracket.');
 const bracketFilter=bracket===null?null:Number(bracket);
 // Scryfall-sourced identities of basic lands prevent 99-card source lists from
 // reporting "Forest + Wastes" as an archetype package. Also handle named test IDs.
 const catalogBasics=basicIds instanceof Set?basicIds:new Set();
 const observed=(Array.isArray(allDecks)?allDecks:[]).map(d=>({...d,mainboard:(d?.mainboard||[]).filter(x=>!catalogBasics.has(x.id)&&!BASIC.test(String(x.id||'')))}));
 const {decks,ignored}=independentCommunityDecks(observed,{commanderId,bracket:bracketFilter});
 const sampleSize=decks.length,cardSets=decks.map(toSet),occurrence=new Map(),pairCounts=new Map();
 for(const cards of cardSets){
  const ids=[...cards].sort(keySort);
  for(const id of ids)occurrence.set(id,(occurrence.get(id)||0)+1);
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
   const key=JSON.stringify([ids[i],ids[j]]);pairCounts.set(key,(pairCounts.get(key)||0)+1);
  }
 }
 const reference=independentCommunityDecks(observed,{bracket:bracketFilter}).decks.filter(d=>d.commanderIds[0]!==commanderId);
 const distinctReferenceCommanders=new Set(reference.map(d=>d.commanderIds[0])).size;
 const baselineReady=reference.length>=MIN_BASELINE_DECKS&&distinctReferenceCommanders>=2;
 const refCounts=new Map();if(baselineReady)for(const deck of reference)for(const id of toSet(deck))refCounts.set(id,(refCounts.get(id)||0)+1);
 const inclusion=[...occurrence].map(([id,count])=>{
  const rate=count/sampleSize;
  const baselineCount=baselineReady?(refCounts.get(id)||0):null;
  const baselineRate=baselineReady?baselineCount/reference.length:null;
  const improvement=baselineReady?rounded(rate-baselineRate):null;
  // High prevalence across many *other* commanders is strong evidence of a staple,
  // but a popular card can still be highly relevant to the selected strategy.
  const generic=baselineReady&&baselineRate>=0.55&&rate-baselineRate<=0.15;
  const interval=wilsonInterval(count,sampleSize);
  const distinctiveness=baselineReady?rounded((count+1)/(sampleSize+2)-(baselineCount+1)/(reference.length+2)):null;
  return {id,count,rate:rounded(rate),interval,baselineCount,baselineRate:baselineReady?rounded(baselineRate):null,
   improvement,distinctiveness,genericStaple:!!generic,
   confidence:sampleSize>=MIN_CONFIDENT_DECKS&&interval.lower>=0.30?'moderate':'limited'};
 }).sort((a,b)=>b.count-a.count||keySort(a.id,b.id));
 const common=new Set(inclusion.filter(i=>i.genericStaple||i.count===sampleSize&&sampleSize>=3).map(i=>i.id));
 const pairings=[...pairCounts].filter(([,count])=>count>=2).map(([key,count])=>{
  const [a,b]=JSON.parse(key),ca=occurrence.get(a),cb=occurrence.get(b);
  const rate=count/sampleSize,pa=ca/sampleSize,pb=cb/sampleSize,expected=pa*pb;
  const lift=finiteRatio(rate,expected);
  // Shrunk estimate: prior weight weakens small-sample spurious pair lift.
  const shrinkage=sampleSize/(sampleSize+8);
  const adjustedLift=1+(lift-1)*shrinkage;
  const interval=wilsonInterval(count,sampleSize);
  const generic=common.has(a)||common.has(b);
  return {a,b,count,rate:rounded(rate),expectedRate:rounded(expected),lift:rounded(lift),adjustedLift:rounded(adjustedLift),
   confidenceA:rounded(count/ca),confidenceB:rounded(count/cb),interval,generic,
   evidence:sampleSize>=MIN_CONFIDENT_DECKS&&count>=3&&adjustedLift>=1.15&&!generic?'candidate':'exploratory',
   // Ranking only, not a causal synergy statistic.
   evidenceScore:rounded(Math.max(0,adjustedLift-1)*Math.log1p(count)*interval.lower)};
 }).sort((a,b)=>b.count-a.count||keySort(a.a,b.a)||keySort(a.b,b.b));
 const distinctive=pairings.filter(x=>x.lift>1.1&&!x.generic).sort((a,b)=>b.evidenceScore-a.evidenceScore||b.count-a.count||keySort(a.a,b.a));
 // Extract a *bounded* list of recurring co-occurrence groups. Only expand
 // promising pairs and check actual triple support; no guessed synergy.
 const packages=[],seenPacks=new Set();
 const pairs=distinctive.filter(x=>x.count>=3&&x.adjustedLift>1.07).slice(0,30);
 for(const x of pairs){
  const members=[x.a,x.b],hits=cardSets.filter(s=>members.every(id=>s.has(id)));
  const neighbors=new Map();for(const bag of hits)for(const id of bag)if(!members.includes(id)&&!common.has(id))neighbors.set(id,(neighbors.get(id)||0)+1);
  const expanded=[...neighbors].filter(([,ct])=>ct>=3).sort((a,b)=>b[1]-a[1]||keySort(a[0],b[0])).slice(0,4);
  if(expanded.length===0)expanded.push([null,x.count]);
  for(const [third] of expanded){
   const ids=third?[...members,third].sort(keySort):members;
   const pk=JSON.stringify(ids);if(seenPacks.has(pk))continue;seenPacks.add(pk);
   const support=cardSets.filter(s=>ids.every(id=>s.has(id))).length;
   const expected=ids.reduce((v,id)=>v*(occurrence.get(id)||0)/sampleSize,1);
   const rawLift=finiteRatio(support/sampleSize,expected);
   const adjusted=1+(rawLift-1)*(sampleSize/(sampleSize+8));
   if(support<3||adjusted<1.10)continue;
   const interval=wilsonInterval(support,sampleSize);
   packages.push({cards:ids,count:support,rate:rounded(support/sampleSize),lift:rounded(rawLift),adjustedLift:rounded(adjusted),
    interval,evidence:sampleSize>=MIN_CONFIDENT_DECKS?'candidate':'exploratory',
    supportingDecks:decks.filter(d=>ids.every(id=>toSet(d).has(id))).map(d=>d.key),
    score:rounded((adjusted-1)*Math.log1p(support)*interval.lower)});
  }
 }
 packages.sort((a,b)=>b.score-a.score||b.count-a.count||a.cards.join(',').localeCompare(b.cards.join(',')));
 const clusters=communityClusters(decks),owners=safeOwnerCount(decks),ownerCoverage=decks.filter(d=>ownerKey(d)).length;
 const creatorConfidence=owners>=2;
 if(!creatorConfidence)for(const pkg of packages)pkg.evidence='exploratory';
 const cautions=[];
 if(sampleSize<minSamples)cautions.push(`Only ${sampleSize} validated distinct deck(s). Need at least ${minSamples} for exploratory community statistics; not proof of card quality.`);
 else if(sampleSize<MIN_CONFIDENT_DECKS)cautions.push(`Only ${sampleSize} distinct deck(s). Package suggestions remain exploratory until at least ${MIN_CONFIDENT_DECKS} independent-looking lists are available.`);
 if(ignored.length)cautions.push(`Excluded ${ignored.length} repeated or near-identical source list(s).`);
 if(ownerCoverage>=3&&owners<=1)cautions.push('Only one known deck creator is represented; apparent agreement may reflect a single builder.');
 else if(sampleSize>=MIN_CONFIDENT_DECKS&&owners<2)cautions.push('Creator diversity is unknown; repeated lists cannot yet be treated as independent evidence.');
 if(!baselineReady)cautions.push(`No cross-commander staple baseline: need ${MIN_BASELINE_DECKS} different-commander reference decks covering at least two commanders in the same bracket scope.`);
 cautions.push('Public deck popularity and co-occurrence are not proof of strength, causal synergy, combo execution, or official bracket compliance.');
 return {
  version:2,source:'Locally imported, validated Archidekt decklists',commanderId,bracket:bracketFilter,
  sampleSize,rawMatchingCount:sampleSize+ignored.length,duplicatesExcluded:ignored.length,
  independentCreatorCount:owners,knownCreatorCount:ownerCoverage,
  reliable:sampleSize>=minSamples,highConfidence:sampleSize>=MIN_CONFIDENT_DECKS&&creatorConfidence,
  warning:sampleSize<minSamples?cautions[0]:null,cautions,
  baseline:{available:baselineReady,referenceDecks:baselineReady?reference.length:0,referenceCommanders:baselineReady?distinctReferenceCommanders:0,scope:bracketFilter===null?'all declared and unknown brackets':`declared Bracket ${bracketFilter}`,kind:'Other-commanders inclusion frequency; not win rate'},
  uniqueCardCount:inclusion.length,repeatedPairCount:pairings.length,distinctivePairCount:distinctive.length,
  inclusion:inclusion.slice(0,150),pairings:pairings.slice(0,150),distinctivePairings:distinctive.slice(0,100),
  packages:packages.slice(0,14),archetypes:clusters,
  provenance:decks.map(d=>({key:d.key,url:d.url||null,title:d.title||d.key,owner:d.owner||null,edhBracket:d.edhBracket??null,importedAt:d.importedAt||null})),
 };
}
