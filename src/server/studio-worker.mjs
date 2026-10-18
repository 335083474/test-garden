import {createStudioRuntime} from '../../scripts/lib/studio-runtime.mjs';
import {createD1Store} from './studio-d1.mjs';
import {createMiniMaxProvider} from './minimax.mjs';
import {createRenderer} from '../render-i18n.mjs';
import {createWorker} from './guide-api.mjs';
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...extra}});
const safe=new Set(['comparison_limit','conversation_expired','invalid_locale','invalid_message','invalid_choice','invalid_input','invalid_answers','input_too_large','version_changed','not_found','start_new_conversation','admin_required','comparison_not_found','comparison_unavailable','comparison_consent_required','comparison_same_browser','comparison_full','comparison_not_owner','comparison_incomplete','comparison_participant_required','feedback_requires_completion','invalid_window','repeated_recommendation','ai_not_configured','ai_busy','ai_unavailable','ai_invalid_response','ai_daily_limit','local_test_busy']);
const logFailure=e=>console.error('studio_request_failed',JSON.stringify({code:/^[a-z0-9_]{1,120}$/i.test(e.message)?e.message:'internal_error',diagnostic:e.diagnostic||null}));
function streamResult(task,cookie){
 const encoder=new TextEncoder(),abort=new AbortController();let timer,closed=false;
 const stream=new ReadableStream({start(controller){
  const send=text=>{if(!closed)controller.enqueue(encoder.encode(text));};send(': connected\n\n');timer=setInterval(()=>send(': working\n\n'),10000);
  void task(abort.signal).then(value=>send('data: '+JSON.stringify({result:value})+'\n\n'),error=>{logFailure(error);send('data: '+JSON.stringify({error:safe.has(error.message)?error.message:'studio_unavailable'})+'\n\n');}).finally(()=>{clearInterval(timer);if(!closed){closed=true;controller.close();}});
 },cancel(){closed=true;clearInterval(timer);abort.abort();}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...cookie?{'Set-Cookie':cookie}:{}}});
}
export function hostedCopy(html){
 return html.replace('<body>','<body data-runtime="hosted">')
 .replaceAll('AI 新作 · 内部测试','AI 新作 · 趣味探索').replaceAll('AI created · Internal test','AI created · For reflection')
 .replaceAll('Your answers stay<br>with you.','A clear boundary<br>for curiosity.').replaceAll('你的答案，<br>留在你这里。','给好奇心，<br>留一点边界。')
 .replaceAll('Privacy information updated 2026-10-16 for the internal studio.','Privacy information updated 2026-10-16 for this site.')
 .replaceAll('Internal test data update','Site data update')
 .replaceAll('内部测试排行 · 本机完成数，按浏览器去重；外链不计完成数。','本站完成排行 · 按浏览器去重；外链不计完成数。')
 .replaceAll('Internal-test ranking · Local completions, deduplicated by browser. External visits are not completions.','Site completions, deduplicated by browser. External visits are not completions.')
 .replaceAll('AI 使用当前已登录账号进行内部测试。原始答案只用于本次计分；完成记录和反馈保存在本机。勾选后才保存对话，30天后清除。生成的测试内容进入本机测试库，不公开原始需求。','AI 由 MiniMax 提供。原始答案只用于计分校验；本站保存完成记录和反馈。进行中的对话暂存最多2小时，勾选后保留30天用于分析与推荐。生成的通用测试可通过链接分享，不公开原始需求。')
 .replaceAll('AI uses the signed-in account for internal testing. Answers are used to calculate this result; completion records and feedback stay on this computer. Conversations are saved only with permission, for 30 days. Created quizzes enter the local library; original requests are not published.','AI is provided by MiniMax. Raw answers are discarded after validation. This site saves completion records and feedback. Active conversations are temporarily retained for up to 2 hours; opt in to save them for 30 days for analysis and recommendations. General quizzes can be shared; source requests are private.')
 .replaceAll('内部测试完成时会发送到本机服务','完成时会发送到本站服务').replaceAll('本机服务','本站服务').replaceAll('local server','site server')
 .replaceAll('内部测试使用本机已登录的 ChatGPT/Codex 账号；通过官方 CLI 发送需求。','线上 AI 由 MiniMax 提供。')
 .replaceAll('只有主动勾选同意时才在本机保存原始需求、追问和选择，保留30天','只有主动勾选同意时才长期保存原始需求、追问和选择，保留30天')
 .replaceAll('未勾选时对话仅在短时内存中保存。','未勾选时，进行中的对话在本站临时存储最多2小时，以支持追问与选择，过期后在下次请求时清理。')
 .replaceAll('生成的通用测试单独进入本机测试库','生成的通用测试单独进入本站测试库')
 .replaceAll('服务端用短暂内存计数限制请求频率。','服务端使用共享日调用上限和每个访客的日调用上限限制请求。')
 .replaceAll('仅供本机管理者','仅供站点管理者').replaceAll('内部测试的本机链接仅在当前电脑可用。','朋友可以打开线上链接完成测试；实际可访问范围取决于本站托管访问设置。')
 .replaceAll('内部测试版隐私说明','本站隐私说明').replaceAll('内部测试使用一个30天有效的','本站使用一个30天有效的')
 .replaceAll('The internal studio sends the description, follow-up replies, display language and catalog to the signed-in ChatGPT/Codex service through the official local CLI.','The site sends the description, follow-up replies, display language and catalog to MiniMax.')
 .replaceAll('Conversations and choices are saved locally for 30 days only after opt-in.','Active conversations are temporarily saved for up to 2 hours; opt in to retain them for 30 days for analysis and recommendations.')
 .replaceAll('local owner analysis page','site owner analysis page').replaceAll('Local links work only on this computer.','Hosted links follow the site access policy.')
 .replaceAll('The internal studio uses the signed-in ChatGPT/Codex account through the official local CLI.','Hosted AI is provided by MiniMax. Active conversations are retained for up to 2 hours to support follow-up questions.')
 .replaceAll('saved locally','saved on this site').replaceAll('local library','site library').replaceAll('Local links work on this computer only.','Hosted links follow the site access policy.')
 .replaceAll('These internal-mode rules supersede','These hosted-mode rules supersede');
}
export function createHostedWorker({assets,catalogs,fetchModel}){
 const staticWorker=createWorker({assets,catalogs});
 return {async fetch(request,env,ctx){
  if(env.LOCAL_PREVIEW)return staticWorker.fetch(request,env,ctx);
  const url=new URL(request.url),locale=url.pathname.startsWith('/en/')?'en':'zh',adminEmail=request.headers.get('oai-authenticated-user-email');
  const admin=Boolean(env.STUDIO_ADMIN_EMAIL&&adminEmail&&adminEmail.toLowerCase()===env.STUDIO_ADMIN_EMAIL.toLowerCase());
  const identity=request.headers.get('oai-authenticated-user-id');
  let session=request.headers.get('cookie')?.match(/(?:^|;\s*)garden_session=([a-f0-9-]{36})(?:;|$)/)?.[1],cookie='';
  if(!session){session=crypto.randomUUID();cookie=`garden_session=${session}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`;}
  const owner=identity?'user:'+identity:'browser:'+session;
  try{
   if(!env.DB&&(/^\/api\/studio\//.test(url.pathname)||url.pathname==='/api/admin/insights'))return json({error:'storage_unavailable'},503);
   const store=env.DB?createD1Store(env.DB):null;
   const infer=createMiniMaxProvider(env,{fetchModel});
   const studio=store?createStudioRuntime({store,infer:async payload=>{await store.reserveAI(owner,Math.min(500,Math.max(1,Number(env.STUDIO_DAILY_CALL_LIMIT)||100)));return infer(payload);},source:'minimax',local:false}):null;
   if(url.pathname.startsWith('/api/')){
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'forbidden_origin'},403);
    if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({error:'invalid_input'},415);
    const reader=request.body?.getReader();if(!reader)return json({error:'invalid_input'},400);let text='',size=0,decoder=new TextDecoder();for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>16384){await reader.cancel();return json({error:'input_too_large'},413);}text+=decoder.decode(p.value,{stream:true});}text+=decoder.decode();
    let input;try{input=JSON.parse(text);if(!input||typeof input!=='object'||Array.isArray(input))throw Error();}catch{return json({error:'invalid_input'},400);}
    let action;if(url.pathname==='/api/admin/insights')action='insights';else if(url.pathname.startsWith('/api/studio/')){action=url.pathname.slice(12);if(action==='insights')return json({error:'admin_required'},403);}else return json({error:'not_found'},404);
    if(!studio)return json({error:'storage_unavailable'},503);
    if(['chat','select','related'].includes(action)&&request.headers.get('accept')?.includes('text/event-stream'))return streamResult(signal=>studio.handle(action,input,owner,AbortSignal.any([signal,request.signal]),{admin}),cookie);
    const data=await studio.handle(action,input,owner,request.signal,{admin});return json(data,200,cookie?{'Set-Cookie':cookie}:{});
   }
   if(!['GET','HEAD'].includes(request.method))return json({error:'method_not_allowed'},405);
   const created=url.pathname.match(/^\/(?:en\/)?created\/(ai-[a-f0-9]{16})\/$/),native=url.pathname.match(/^\/(?:en\/)?tests\/([a-z0-9-]+)\/$/),pair=url.pathname.match(/^\/(?:en\/)?compare\/([a-f0-9]{64})\/$/),analysis=/^\/(?:en\/)?admin\/$/.test(url.pathname);
   let response,html;
   if(created||native&&url.searchParams.has('compare')){
    if(!studio)return json({error:'storage_unavailable'},503);
    const quiz=url.searchParams.has('compare')?await studio.pairQuiz(url.searchParams.get('compare'),locale):await studio.quiz(created[1],locale);
    if(!quiz||quiz.id!==(created?.[1]||native?.[1]))return json({error:'not_found'},404);
    html=createRenderer(locale).quizPage(quiz).replace('</head>',`<script type="application/json" id="generated-quiz">${JSON.stringify([quiz]).replace(/</g,'\\u003c')}</script></head>`);
    if(url.searchParams.has('compare'))html=html.replace(/(href="\/(?:en\/)?(?:tests|created)\/[^"?]+\/)(" lang=)/g,`$1?compare=${url.searchParams.get('compare')}$2`);
   }else if(pair||analysis){
    if(analysis&&!admin)return new Response(`<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>Test Garden</title><p>${locale==='zh'?'仅限站点管理者访问。':'Site owner access only.'}</p><a href="/signin-with-chatgpt?return_to=${encodeURIComponent(url.pathname)}" target="_top">${locale==='zh'?'管理者登录':'Owner sign in'}</a></html>`,{status:403,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
    html=createRenderer(locale).featurePage(pair?'comparison':'analysis');if(pair)html=html.replace('href="/compare/" lang=',`href="/compare/${pair[1]}/" lang=`).replace('href="/en/compare/" lang=',`href="/en/compare/${pair[1]}/" lang=`);
   }else if(/^\/(?:en\/)?library\/$/.test(url.pathname))html=createRenderer(locale).libraryPage();
   else response=await staticWorker.fetch(request,env,ctx);
   if(!html&&response?.headers.get('content-type')?.startsWith('text/html'))html=await response.text();
   if(html){html=hostedCopy(html);if(admin&&(url.pathname==='/'||url.pathname==='/en/'))html=html.replace('</main>',`<p class="studio-admin-link"><a href="${locale==='en'?'/en':''}/admin/">${locale==='en'?'Owner: request and feedback analysis':'管理者：需求与反馈分析'} ↗</a></p></main>`);const headers=new Headers(response?.headers);headers.set('Content-Type','text/html; charset=utf-8');headers.set('Cache-Control','private, no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'");if(created||pair||analysis||url.searchParams.has('compare'))headers.set('X-Robots-Tag','noindex, nofollow');if(cookie)headers.set('Set-Cookie',cookie);return new Response(request.method==='HEAD'?null:html,{status:response?.status||200,headers});}
   return response;
  }catch(e){logFailure(e);return json({error:safe.has(e.message)?e.message:'studio_unavailable'},e.status||503,cookie?{'Set-Cookie':cookie}:{});}
 }};
}
