// Session credentials stay in memory and are sent only to this app's API.
let pending;
async function sessionToken(){
  if(!pending)pending=fetch('/api/session',{cache:'no-store'}).then(async response=>{
    if(!response.ok)throw Error('Could not open a local API session.');
    const {csrf}=await response.json();return csrf;
  }).catch(error=>{pending=null;throw error;});
  return pending;
}
export async function localPost(url,options){
  const endpoint=new URL(url,location.origin);
  if(endpoint.origin!==location.origin||!endpoint.pathname.startsWith('/api/'))throw Error('Expected a local API endpoint.');
  const send=async()=>{
    const headers=new Headers(options.headers);
    headers.set('x-commander-ai-session',await sessionToken());
    return fetch(endpoint,{...options,method:'POST',headers,redirect:'error'});
  };
  let response=await send();
  if(response.status===403&&(await response.clone().json().catch(()=>({}))).code==='session_expired'){
    pending=null;response=await send();
  }
  return response;
}
