import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {getCatalog} from '../src/i18n/content.mjs';
import {createRenderer} from '../src/render-i18n.mjs';
import {validateRequest,modelRequest,validateSelection} from '../src/server/guide-api.mjs';
import {checkPlanLogin,runPlanJson} from './lib/codex-plan.mjs';
import {openStudioStore} from './lib/studio-store.mjs';
import {createStudioRuntime} from './lib/studio-runtime.mjs';
if(!await checkPlanLogin())throw Error('Local test requires Codex signed in with ChatGPT.');
const worker=(await import('data:text/javascript;base64,'+(await fs.readFile(new URL('../dist/server/index.js',import.meta.url))).toString('base64'))).default;
const store=openStudioStore(process.env.TEST_GARDEN_DB||path.resolve('.local-data/studio.sqlite'));
const studio=createStudioRuntime({store,infer:runPlanJson});
const port=Number(process.env.PORT||4319),origin=`http://127.0.0.1:${port}`;
let pending=false,legacyWindow=Date.now(),legacyCount=0;
const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
async function body(req){let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)throw Object.assign(Error('input_too_large'),{status:413});chunks.push(chunk);}try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw Object.assign(Error('invalid_input'),{status:400});}}
const server=http.createServer(async(req,res)=>{
 try{
  if(req.headers.host!==`127.0.0.1:${port}`){send(res,403,{error:'local_only'});return;}
  const url=new URL(req.url,origin),locale=url.pathname.startsWith('/en/')?'en':'zh';
  if(url.pathname.startsWith('/api/')){
   if(req.method!=='POST'){send(res,405,{error:'method_not_allowed'});return;}
   if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')||req.headers['sec-fetch-site']==='cross-site'){send(res,403,{error:'invalid_origin_or_type'});return;}
   const input=await body(req);const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
   if(url.pathname.startsWith('/api/studio/')||url.pathname==='/api/admin/insights'){
    let session=req.headers.cookie?.match(/(?:^|;\s*)garden_session=([a-f0-9-]{36})(?:;|$)/)?.[1];
    if(!session){session=randomUUID();res.setHeader('Set-Cookie',`garden_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);}
    const admin=url.pathname==='/api/admin/insights';
    const result=await studio.handle(admin?'insights':url.pathname.slice('/api/studio/'.length),input,session,controller.signal,{admin});send(res,200,result);return;
   }
   if(url.pathname==='/api/recommend'){
    let validated;try{validated=validateRequest(input);}catch{send(res,400,{error:'invalid_input'});return;}
    if(Date.now()-legacyWindow>=60000){legacyWindow=Date.now();legacyCount=0;}
    if(pending||legacyCount>=6){send(res,429,{error:'local_test_busy'});return;}pending=true;legacyCount++;
    try{const entries=getCatalog(validated.locale),payload=modelRequest(entries,validated,'local-plan');const result=await runPlanJson({prompt:payload.instructions+'\n'+payload.input,schema:payload.text.format.schema,signal:controller.signal});send(res,200,validateSelection(result.value,entries,validated));}finally{pending=false;}
    return;
   }
   send(res,404,{error:'not_found'});return;
  }
  if(!['GET','HEAD'].includes(req.method)){send(res,405,{error:'method_not_allowed'});return;}
  let response;
  const created=url.pathname.match(/^\/(?:en\/)?created\/(ai-[a-f0-9]{16})\/$/),native=url.pathname.match(/^\/(?:en\/)?tests\/([a-z0-9-]+)\/$/),pairPage=url.pathname.match(/^\/(?:en\/)?compare\/([a-f0-9]{64})\/$/);
  if(created||native&&url.searchParams.has('compare')){
   const quiz=url.searchParams.has('compare')?await studio.pairQuiz(url.searchParams.get('compare'),locale):await studio.quiz(created[1],locale);if(!quiz||quiz.id!==(created?.[1]||native?.[1])){send(res,404,{error:'not_found'});return;}
   let html=createRenderer(locale).quizPage(quiz);
   const script=`<script type="application/json" id="generated-quiz">${JSON.stringify([quiz]).replace(/</g,'\\u003c')}</script>`;
   html=html.replace('</head>',script+'</head>');response=new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
   if(url.searchParams.has('compare')){html=html.replace(/(href="\/(?:en\/)?(?:tests|created)\/[^"?]+\/)(" lang=)/g,`$1?compare=${url.searchParams.get('compare')}$2`);response=new Response(html,{headers:response.headers});}
  }else if(pairPage||/^\/(?:en\/)?admin\/$/.test(url.pathname)){
   let html=createRenderer(locale).featurePage(pairPage?'comparison':'analysis');
   if(pairPage)html=html.replace('href="/compare/" lang=',`href="/compare/${pairPage[1]}/" lang=`).replace('href="/en/compare/" lang=',`href="/en/compare/${pairPage[1]}/" lang=`);
   response=new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }else if(/^\/(?:en\/)?library\/$/.test(url.pathname))response=new Response(createRenderer(locale).libraryPage(),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  else response=await worker.fetch(new Request(url,{method:req.method}),{LOCAL_PREVIEW:true});
  const headers=Object.fromEntries(response.headers);let buffer=Buffer.from(await response.arrayBuffer());
  if(headers['content-type']?.startsWith('text/html')){
   const text=locale==='en'?'Internal test · AI uses your signed-in ChatGPT/Codex account · Local data only':'内部测试 · AI 使用当前 ChatGPT/Codex 账号额度 · 数据保存在本机';
   buffer=Buffer.from(buffer.toString('utf8').replace('<body>',`<body><div class="studio-internal">${text}</div>`));
   if(url.pathname==='/'||url.pathname==='/en/')buffer=Buffer.from(buffer.toString('utf8').replace('</main>',`<p class="studio-admin-link"><a href="${locale==='en'?'/en':''}/admin/">${locale==='en'?'Owner: request and feedback analysis':'管理者：需求与反馈分析'} ↗</a></p></main>`));
   headers['Content-Security-Policy']="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'";
  }
  res.writeHead(response.status,headers);res.end(req.method==='HEAD'?undefined:buffer);
 }catch(error){
  if(res.destroyed)return;
  const safe=new Set(['local_test_busy','conversation_expired','invalid_locale','invalid_message','invalid_choice','invalid_input','invalid_answers','input_too_large','version_changed','not_found','start_new_conversation','plan_limit','plan_login_required','plan_network_error','admin_required','comparison_not_found','comparison_unavailable','comparison_consent_required','comparison_same_browser','comparison_full','comparison_not_owner','comparison_incomplete','comparison_participant_required','feedback_requires_completion','invalid_window','repeated_recommendation']);
  send(res,error.status||503,{error:safe.has(error.message)?error.message:'local_plan_unavailable'});
 }
});
server.listen(port,'127.0.0.1',()=>console.log(`Local plan test: ${origin}`));
server.requestTimeout=240000;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
