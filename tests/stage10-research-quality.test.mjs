import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {lookupCommanderVariants,lookupColorVariants,commanderVariantQuery,colorVariantQuery} from '../src/commanderComboResearch.mjs';
import {boundedSpellbookJSON} from '../src/spellbookTransport.mjs';
import {fetchSpellbookForDeck} from '../src/combos.mjs';
import {recordSpellbookVariants,readComboLibrary} from '../src/comboLibrary.mjs';
import {researchForGeneration} from '../src/researchFlow.mjs';
import {discoverPublicDecks} from '../src/discovery.mjs';
import {researchSummary} from '../public/research.js';
const name='Wilhelt, the Rotcleaver',v=(id,n=name,extra={})=>({id,uses:[{card:{name:n},quantity:1,zoneLocations:['B']},{card:{name:'Outlet'},quantity:1,zoneLocations:['B']}],identity:'B',legalities:{commander:true},produces:[{feature:{name:'Infinite mana'}}],manaNeeded:'{1}',description:'Pay the real activation fee.',...extra});
const response=p=>({ok:true,status:200,headers:new Map(),text:async()=>JSON.stringify(p)});
async function temporary(fn){const dir=await mkdtemp(path.join(os.tmpdir(),'co-stage10-quality-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
const request=dir=>({commanderId:'cmd',commanderName:name,cacheDir:dir,minGapMs:0});
const next=(query,offset)=>'https://backend.commanderspellbook.com/variants/?q='+encodeURIComponent(query)+'&limit=40&offset='+offset;
test('live-shaped null count follows next, constructs bounded pages and preserves prerequisites',()=>temporary(async dir=>{
 const seen=[],q=commanderVariantQuery(name),r=await lookupCommanderVariants({...request(dir),fetcher:async url=>{seen.push(new URL(url));return response({count:null,next:next(q,seen.length*40),results:[v(seen.length+'-22')]});}});
 assert.deepEqual(seen.map(u=>u.searchParams.get('offset')),['0','40']);assert.equal(r.pages,2);assert.equal(r.total,null);assert.equal(r.truncated,true);assert.equal(r.variants.length,2);assert.equal(r.variants[0].manaNeeded,'{1}');assert.deepEqual(r.variants[0].uses[0].zoneLocations,['B']);
}));
test('off-origin pagination is never fetched or represented as complete zero',()=>temporary(async dir=>{
 let n=0;const r=await lookupCommanderVariants({...request(dir),fetcher:async()=>{n++;return response({count:null,next:'https://example.invalid/leak',results:[v('11-22')]});}});
 assert.equal(n,1);assert.equal(r.partial,true);assert.equal(r.truncated,true);assert.equal(r.variants.length,1);assert.match(r.error,/pagination/);
}));
test('second-page rate limit retains verified first-page candidates and explicit partial status',()=>temporary(async dir=>{
 let n=0;const r=await lookupCommanderVariants({...request(dir),fetcher:async()=>++n===1?response({count:null,next:next(commanderVariantQuery(name),40),results:[v('11-22')]}):{ok:false,status:429}});
 assert.equal(r.partial,true);assert.equal(r.pages,1);assert.equal(r.variants.length,1);assert.match(r.error,/rate limited/);
 const cached=await lookupCommanderVariants({...request(dir),fetcher:async()=>{throw Error('should cache partial briefly');}});assert.equal(cached.fromCache,true);assert.equal(cached.partial,true);
}));
test('expired query fallback retains retrieval date, unknown total and original cache bytes',()=>temporary(async dir=>{
 let clock=1700000000000;const args={...request(dir),now:()=>clock};
 const a=await lookupCommanderVariants({...args,fetcher:async()=>response({count:null,next:null,results:[v('11-22')]})}),file=path.join(dir,(await readdir(dir))[0]),before=await readFile(file,'utf8');clock+=86400001;
 const b=await lookupCommanderVariants({...args,fetcher:async()=>{throw Error('offline');}});assert.equal(b.stale,true);assert.equal(b.fetchedAt,a.fetchedAt);assert.equal(b.networkStatus,'unavailable');assert.equal(b.total,null);assert.equal(await readFile(file,'utf8'),before);assert.ok(b.cacheAgeMs>86400000);
}));
test('cache identity is revalidated; foreign cached variant cannot poison lookup',()=>temporary(async dir=>{
 const args=request(dir);await lookupCommanderVariants({...args,fetcher:async()=>response({count:1,next:null,results:[v('11-22')]})});
 const file=path.join(dir,(await readdir(dir))[0]),cache=JSON.parse(await readFile(file,'utf8'));cache.variants=[v('99-22','Other commander')];await writeFile(file,JSON.stringify(cache));
 let calls=0;const r=await lookupCommanderVariants({...args,fetcher:async()=>{calls++;return response({count:0,next:null,results:[]});}});assert.equal(calls,1);assert.equal(r.variants.length,0);assert.equal(r.fromCache,false);
}));
test('schema drift does not become a successful zero; redirects stay manual',()=>temporary(async dir=>{
 for(const p of [{results:null},{count:1,next:null,results:[{id:'broken'}]}])await assert.rejects(lookupCommanderVariants({...request(dir),fetcher:async()=>response(p)}),/unknown|changed/);
 await assert.rejects(lookupCommanderVariants({...request(dir),fetcher:async(_,opts)=>{assert.equal(opts.redirect,'manual');return{ok:false,status:302};}}),/302/);
}));
test('streamed and UTF-8 text responses enforce bytes, not characters',async()=>{
 let cancelled=false;const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(10));},cancel(){cancelled=true;}});
 await assert.rejects(boundedSpellbookJSON({headers:new Map(),body},5),/too large/);assert.equal(cancelled,true);
 await assert.rejects(boundedSpellbookJSON({headers:new Map(),text:async()=>'€€€'},5),/too large/);
});
test('simultaneous same-query actions coalesce network and atomic cache writes',()=>temporary(async dir=>{
 let calls=0;const args={...request(dir),fetcher:async()=>{calls++;return response({count:1,next:null,results:[v('11-22')]});}};
 const[a,b]=await Promise.all([lookupCommanderVariants(args),lookupCommanderVariants(args)]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal((await readdir(dir)).length,1);
}));
const card=(id,name,identity=[])=>({id,name,color_identity:identity,type_line:'Creature',legalities:{commander:'legal'}});
test('bounded other-combo discovery proves local legality/identity and excludes commander-only requirements',()=>temporary(async dir=>{
 const catalog=[card('cmd',name,['U','B']),card('out','Outlet'),card('x','Engine',['B']),card('red','Red Engine',['R']),card('colorless','Colorless Engine')];
 const bad=v('33-44','Engine',{uses:[{card:{name:'Engine'},mustBeCommander:true},{card:{name:'Outlet'}}]});
 const r=await lookupColorVariants({...request(dir),identity:['U','B'],catalog,fetcher:async url=>{assert.equal(new URL(url).searchParams.get('q'),colorVariantQuery(['B','U']));return response({count:null,next:next(colorVariantQuery(['B','U']),40),results:[v('11-22','Engine'),v('22-33','Red Engine',{identity:'R'}),bad,v('44-55','Unknown Engine'),v('55-66'),v('66-77','Colorless Engine',{identity:'C'})]});}});
 assert.deepEqual(r.variants.map(x=>x.id),['11-22','66-77']);assert.equal(r.pages,1);assert.equal(r.truncated,true);assert.equal(r.scope,'color-identity');assert.equal(colorVariantQuery([]),'identity<=C legal:commander cards<=3');assert.throws(()=>colorVariantQuery(['X']));
}));
test('concurrent library writes preserve separate commanders and scope provenance',()=>temporary(async dir=>{
 const file=path.join(dir,'library.json'),meta={scope:'commander-card',query:commanderVariantQuery(name),fetchedAt:'2026-10-24T00:00:00.000Z'};
 await Promise.all([recordSpellbookVariants('a',{included:[],near:[v('11-22')]},{file,provenance:meta}),recordSpellbookVariants('b',{included:[],near:[v('22-33')]},{file,provenance:{...meta,scope:'color-identity'}})]);
 const es=await readComboLibrary(file);assert.equal(es.length,2);assert.equal(es.find(e=>e.commanderId==='a').research[0].scope,'commander-card');assert.equal(es.find(e=>e.commanderId==='b').research[0].scope,'color-identity');assert.equal(es.find(e=>e.commanderId==='b').variants.length,0);assert.equal(es.find(e=>e.commanderId==='b').colorCandidates.length,1);
}));
test('independent scope failure, discovery busy and stale fallback are surfaced without erasing saved data',async()=>{
 const catalog=[card('cmd',name,['U','B'])],saved=[{validated:true,commanderIds:['cmd'],edhBracket:4,key:'saved'}],calls=[];
 const r=await researchForGeneration({commanderId:'cmd',commanderName:name,bracket:3,catalog,savedCommunity:saved,discoveryBusy:true,discover:async()=>{throw Error('must not run');},lookup:async()=>{calls.push('commander');return{variants:[],total:null,stale:true,fromCache:true,error:'offline',fetchedAt:'2026-10-23T00:00:00.000Z',cacheAgeMs:86400000};},lookupColors:async()=>{calls.push('colors');throw Error('rate limited');},record:async()=>{}});
 assert.deepEqual(calls,['commander','colors']);assert.equal(r.report.discovery.status,'busy');assert.equal(r.report.commanderLookup.status,'cached-fallback');assert.equal(r.report.colorLookup.status,'unavailable');assert.equal(r.report.colorLookup.variants,null);assert.deepEqual(r.community,saved);assert.equal(r.report.matchingSaved,0);
 const text=researchSummary(r.report).join('\n');assert.match(text,/stale fallback/);assert.match(text,/total unknown/);assert.match(text,/unknown retrieved/);assert.match(text,/no source deck checked/);
});
test('Archidekt partial pagination preserves earlier previews and excludes unknown brackets',async()=>{
 let calls=0;const name='Stage10 partial listing commander';
 const r=await discoverPublicDecks(name,{bracket:4,minGapMs:0,forceRefresh:true,fetcher:async()=>++calls===1?response({next:'page2',results:[{id:91111,name:'B4',edhBracket:4},{id:91112,name:'unknown',edhBracket:null}]}):{ok:false,status:429}});
 assert.equal(r.partial,true);assert.equal(r.previews.length,1);assert.equal(r.previews[0].edhBracket,4);assert.equal(r.unknownBracket,1);assert.match(r.error,/rate limit/);
});
test('UI keeps existing source screening and separates candidates from inventory/win evidence',()=>{
 const text=researchSummary({discovery:{status:'completed',added:0,structuralExamples:[{title:'Structure',score:72,earlyRamp:6}],truncated:true},matchingSaved:0,commanderLookup:{status:'checked',variants:80,total:null,truncated:true},colorLookup:{status:'checked',variants:12,total:null},combos:{status:'no-source'},scryfall:{status:'local-catalog',records:32197}}).join('\n');
 for(const term of ['Structure','Commander-containing','Other color-compatible','80 retrieved','total unknown','bounded/truncated','no source deck checked','not executable','not verified English NM'])assert.ok(text.includes(term),term);
});

test('full-deck cached checks retain original retrieval provenance rather than todays read date',()=>temporary(async dir=>{
 const commander=card('cmd',name,['U','B']),catalog=[commander,...Array.from({length:99},(_,i)=>card('x'+i,'Test '+i))],deck={validated:true,totalCards:100,commanderIds:['cmd'],mainboard:catalog.slice(1).map(c=>({id:c.id,quantity:1}))},seen=[];
 let clock=1700000000000;
 const args={cacheDir:dir,minGapMs:0,now:()=>clock,onVerifiedResponse:async(_,e)=>seen.push(e)};
 await fetchSpellbookForDeck(deck,catalog,{...args,fetcher:async()=>response({included:[],almostIncluded:[]})});clock+=1000;
 await fetchSpellbookForDeck(deck,catalog,{...args,fetcher:async()=>{throw Error('cached check must not fetch');}});
 assert.equal(seen.length,2);assert.equal(seen[0].fetchedAt,seen[1].fetchedAt);assert.equal(seen[1].fromCache,true);
}));
