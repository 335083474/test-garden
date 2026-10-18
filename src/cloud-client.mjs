import {sitePath} from './site-path.mjs';
const tokenKey='garden-cloud-session-v1';
let memoryToken;
function bearer(){
 let value;try{value=localStorage.getItem(tokenKey);}catch{}
 if(!/^[a-f0-9]{64}$/.test(value||'')){value=memoryToken||Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');try{localStorage.setItem(tokenKey,value);}catch{memoryToken=value;}}
 return value;
}
export function publicLinks(value){
 if(Array.isArray(value))return value.map(publicLinks);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,['url','quizUrl'].includes(key)&&typeof v==='string'?sitePath(v):publicLinks(v)]));
 return value;
}
export async function cloudApi(action,input={},signal){
 const origin=document.body.dataset.apiOrigin;
 if(!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(origin||''))throw Object.assign(Error('ai_not_configured'),{code:'ai_not_configured'});
 const response=await fetch(origin+'/api/studio/'+action,{method:'POST',headers:{Authorization:'Bearer '+bearer(),'Content-Type':'application/json',Accept:'text/event-stream'},credentials:'omit',cache:'no-store',body:JSON.stringify({locale:document.documentElement.lang.startsWith('zh')?'zh':'en',...input}),signal});
 let data;
 if(response.headers.get('content-type')?.includes('text/event-stream')){
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
  const line=s=>{if(!s.startsWith('data:'))return;const d=JSON.parse(s.slice(5));if(d.error)throw Object.assign(Error(d.error),{code:d.error});data=d.result;};
  try{for(;;){const x=await reader.read();if(x.done)break;buffer+=decoder.decode(x.value,{stream:true});let n;while((n=buffer.indexOf('\n'))>=0){line(buffer.slice(0,n));buffer=buffer.slice(n+1);}}buffer+=decoder.decode();if(buffer.trim())line(buffer);}finally{void reader.cancel().catch(()=>{});}
 }else{try{data=await response.json();}catch{throw Object.assign(Error('studio_unavailable'),{code:'studio_unavailable'});}}
 if(!data||!response.ok||data.error)throw Object.assign(Error(data?.error||'studio_unavailable'),{code:data?.error||'studio_unavailable'});
 return publicLinks(data);
}
