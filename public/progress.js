export async function postWithProgress(url,payload,onProgress,headers={}){
 const response=await fetch(url,{
  method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson',...headers},
  body:JSON.stringify(payload)
 });
 if(!response.ok){
  const message=await response.json();
  throw Error(message.error||response.statusText);
 }
 if(response.headers.get('content-type')?.startsWith('application/json'))return response.json();
 const text=response.body.pipeThrough(new TextDecoderStream());
 let pending='',result;
 for await(const chunk of text){
  pending+=chunk;
  const lines=pending.split('\n');
  pending=lines.pop();
  for(const line of lines){
   const event=JSON.parse(line);
   if(event.type==='progress')onProgress(event);
   if(event.type==='result')result=event.result;
   if(event.type==='error')throw Error(event.error);
  }
 }
 if(!result)throw Error('Request ended before the results arrived. Try again.');
 return result;
}
