/** Shared public-provider request cadence/cooldown, including GET and POST.
 * Separate injected fixture transports have independent state. */
const providers=new WeakMap();
function state(fetcher){if(!providers.has(fetcher))providers.set(fetcher,{lastRequest:0,queue:Promise.resolve(),blockedUntil:0,status:null});return providers.get(fetcher);}
function available(s,now){if(s.blockedUntil>now())throw Error('Commander Spellbook unavailable after HTTP '+s.status+' until '+new Date(s.blockedUntil).toISOString()+'; saved data retained.');}
export function noteSpellbookResponse(response,{fetcher=fetch,now=()=>Date.now()}={}){
 if(![401,403,429].includes(response.status))return;
 const s=state(fetcher),header=response.headers?.get?.('retry-after'),seconds=header&&/^\d+$/.test(header)?Number(header):null;
 const delay=seconds!==null?seconds*1000:header&&Number.isFinite(Date.parse(header))?Date.parse(header)-now():60000;
 s.blockedUntil=Math.max(s.blockedUntil,Math.min(8640000000000000,now()+Math.max(1000,Number.isFinite(delay)?delay:86400000)));s.status=response.status;
}
export async function waitForSpellbook({fetcher=fetch,now=()=>Date.now(),minGapMs=2000}={}){
 if(!Number.isFinite(minGapMs)||minGapMs<0||minGapMs>30000)throw Error('Invalid Spellbook request spacing.');
 const s=state(fetcher);available(s,now);if(!minGapMs)return;
 const pending=s.queue.then(async()=>{available(s,now);const elapsed=now()-s.lastRequest;if(elapsed>=0&&elapsed<minGapMs)await new Promise(resolve=>setTimeout(resolve,minGapMs-elapsed));available(s,now);s.lastRequest=now();});
 s.queue=pending.catch(()=>{});await pending;
}
/** Enforce the actual streamed UTF-8 byte cap, including chunked responses. */
export async function boundedSpellbookJSON(response,maxBytes){
 if(Number(response.headers?.get?.('content-length'))>maxBytes)throw Error('Commander Spellbook response too large.');
 let raw;
 if(response.body?.getReader){const reader=response.body.getReader(),chunks=[];let bytes=0;
  try{while(true){const{done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw Error('Commander Spellbook response too large.');}chunks.push(value);}raw=Buffer.concat(chunks).toString('utf8');}finally{reader.releaseLock();}
 }else{raw=await response.text();if(Buffer.byteLength(raw,'utf8')>maxBytes)throw Error('Commander Spellbook response too large.');}
 try{return JSON.parse(raw);}catch{throw Error('Commander Spellbook returned invalid JSON.');}
}
