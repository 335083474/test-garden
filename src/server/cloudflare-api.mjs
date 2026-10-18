import {createStudioRuntime} from '../../scripts/lib/studio-runtime.mjs';
import {createD1Store} from './studio-d1.mjs';
import {createMiniMaxProvider} from './minimax.mjs';

const safe=new Set(['invalid_locale','invalid_message','invalid_choice','invalid_input','invalid_answers','invalid_feedback','invalid_window','input_too_large','version_changed','not_found','conversation_expired','start_new_conversation','comparison_limit','comparison_not_found','comparison_unavailable','comparison_consent_required','comparison_same_browser','comparison_full','comparison_not_owner','comparison_incomplete','comparison_participant_required','feedback_requires_completion','admin_required','repeated_recommendation','ai_not_configured','ai_busy','ai_unavailable','ai_invalid_response','ai_daily_limit','local_test_busy','invalid_recommendations']);
const encoder=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async text=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(text)));
export function createCloudApi({fetchModel}={}){return{async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('origin'),allowed=env.WEB_ORIGIN==='https://335083474.github.io'?env.WEB_ORIGIN:null;
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(allowed&&origin===allowed)Object.assign(headers,{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, Accept','Access-Control-Max-Age':'600'});
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
 if(url.pathname==='/health'&&request.method==='GET')return json({service:'test-garden-api',version:1,storage:Boolean(env.DB),aiConfigured:Boolean(env.MINIMAX_API_KEY),frontend:allowed});
 if(!allowed||origin!==allowed)return json({error:'forbidden_origin'},403);
 if(request.method==='OPTIONS'){
  const names=(request.headers.get('access-control-request-headers')||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
  if(request.headers.get('access-control-request-method')!=='POST'||names.some(x=>!['authorization','content-type','accept'].includes(x)))return json({error:'forbidden_preflight'},403);
  return new Response(null,{status:204,headers});
 }
 if(request.method!=='POST')return json({error:'method_not_allowed'},405);
 // Cross-origin bearer identity avoids third-party cookies. There is no owner/header-based bypass.
 const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token)return json({error:'session_required'},401);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({error:'invalid_input'},415);
 if(!env.DB)return json({error:'storage_unavailable'},503);
 const match=url.pathname.match(/^\/api\/studio\/([a-z-]+)$/);if(!match||match[1]==='insights')return json({error:'admin_required'},403);
 try{
  const reader=request.body?.getReader();if(!reader)return json({error:'invalid_input'},400);let text='',size=0;const decoder=new TextDecoder();
  for(;;){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>16384){await reader.cancel();return json({error:'input_too_large'},413);}text+=decoder.decode(x.value,{stream:true});}text+=decoder.decode();
  let input;try{input=JSON.parse(text);if(!input||typeof input!=='object'||Array.isArray(input))throw Error();}catch{return json({error:'invalid_input'},400);}
  if(!['zh','en'].includes(input.locale))return json({error:'invalid_locale'},400);
  const owner='browser:'+await digest(token),store=createD1Store(env.DB),infer=createMiniMaxProvider(env,{fetchModel});
  const studio=createStudioRuntime({store,source:'minimax',local:false,infer:async payload=>{
   if(!env.MINIMAX_API_KEY||!env.RATE_LIMIT_SALT)throw Error('ai_not_configured');
   const ip=request.headers.get('cf-connecting-ip')||'unknown',day=new Date().toISOString().slice(0,10);
   const key=await crypto.subtle.importKey('raw',encoder.encode(env.RATE_LIMIT_SALT),{name:'HMAC',hash:'SHA-256'},false,['sign']);
   const network=hex(await crypto.subtle.sign('HMAC',key,encoder.encode(day+':'+ip)));
   const r=await env.DB.prepare('INSERT INTO ai_budget(key,calls) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET calls=calls+1 WHERE calls<30 RETURNING calls').bind('day:'+day+':network:'+network).first();
   if(!r)throw Object.assign(Error('ai_daily_limit'),{status:429});
   await store.reserveAI(owner,Math.min(50,Math.max(1,Number(env.STUDIO_DAILY_CALL_LIMIT)||50)));
   return infer(payload);
  }});
  const action=match[1];
  if(action==='quiz'){
   let quiz;if(typeof input.comparisonToken==='string'&&/^[a-f0-9]{64}$/.test(input.comparisonToken))quiz=await studio.pairQuiz(input.comparisonToken,input.locale);
   else if(typeof input.quizId==='string'&&/^ai-[a-f0-9]{16}$/.test(input.quizId))quiz=await studio.quiz(input.quizId,input.locale);
   if(!quiz||input.quizId&&quiz.id!==input.quizId)return json({error:'not_found'},404);
   return json({quiz});
  }
  if(!['catalog','history','forget','start','complete','feedback','chat','select','related','pair-create','pair-view','pair-join','pair-revoke'].includes(action))return json({error:'not_found'},404);
  if(['chat','select','related'].includes(action)&&request.headers.get('accept')?.includes('text/event-stream')){
   let timer,closed=false;const controller=new AbortController();
   const stream=new ReadableStream({start(out){const send=s=>{if(!closed)out.enqueue(encoder.encode(s));};send(': connected\n\n');timer=setInterval(()=>send(': working\n\n'),10000);
    void studio.handle(action,input,owner,AbortSignal.any([controller.signal,request.signal]),{admin:false}).then(value=>send('data: '+JSON.stringify({result:value})+'\n\n'),e=>{console.error('studio_api_failed',safe.has(e.message)?e.message:'internal_error');send('data: '+JSON.stringify({error:safe.has(e.message)?e.message:'studio_unavailable'})+'\n\n');}).finally(()=>{clearInterval(timer);if(!closed){closed=true;out.close();}});
   },cancel(){closed=true;clearInterval(timer);controller.abort();}});
   return new Response(stream,{headers:{...headers,'Content-Type':'text/event-stream; charset=utf-8'}});
  }
  return json(await studio.handle(action,input,owner,request.signal,{admin:false}));
 }catch(e){console.error('studio_api_failed',safe.has(e.message)?e.message:'internal_error');return json({error:safe.has(e.message)?e.message:'studio_unavailable'},e.status||503);}
}};}
export default createCloudApi();
