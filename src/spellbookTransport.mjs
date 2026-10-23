/** One public-host request cadence for variant GET and full-deck POST. */
let lastRequest=0,queue=Promise.resolve();
export async function waitForSpellbook({now=()=>Date.now(),minGapMs=2000}={}){
 if(!Number.isFinite(minGapMs)||minGapMs<0||minGapMs>30000)throw Error('Invalid Spellbook request spacing.');
 if(!minGapMs)return;
 const pending=queue.then(async()=>{const elapsed=now()-lastRequest;if(elapsed>=0&&elapsed<minGapMs)await new Promise(resolve=>setTimeout(resolve,minGapMs-elapsed));lastRequest=now();});
 queue=pending.catch(()=>{});await pending;
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
