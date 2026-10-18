import test from 'node:test';
import assert from 'node:assert/strict';
import {testD1} from './helpers/d1.mjs';
import {createHostedWorker,hostedCopy} from '../src/server/studio-worker.mjs';
import {createD1Store} from '../src/server/studio-d1.mjs';
import {createMiniMaxProvider} from '../src/server/minimax.mjs';
import {getCatalog,getQuizzes} from '../src/i18n/content.mjs';
const base='https://test.example',catalogs={zh:getCatalog('zh'),en:getCatalog('en')};
const offers={action:'offer',message:'Three options',question:'',quickOptions:[],choices:['communication-style','animal-personality','work-style'].map(id=>({kind:'existing',id,title:'Test',description:'Description',reason:'Useful',topicKey:''}))};
const model=async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(offers)}}],usage:{total_tokens:1}}),{headers:{'Content-Type':'application/json'}});
const req=(path,input,who='one',headers={})=>new Request(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:`garden_session=00000000-0000-0000-0000-${who==='one'?'000000000001':'000000000002'}`,...headers},body:JSON.stringify(input)});
test('MiniMax provider uses the official regional endpoint, strips reasoning and never returns provider errors',async()=>{
 let url,body;const infer=createMiniMaxProvider({MINIMAX_API_KEY:'test-secret',MINIMAX_REGION:'cn'},{fetchModel:async(u,r)=>{url=u;body=JSON.parse(r.body);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'<think>hidden reasoning</think>{"ok":true}'}}]}));}});
 assert.deepEqual((await infer({prompt:'hello',schema:{type:'object'}})).value,{ok:true});assert.equal(url,'https://api.minimaxi.com/v1/chat/completions');assert.equal(body.model,'MiniMax-M2.5');
 await assert.rejects(createMiniMaxProvider({MINIMAX_API_KEY:'x'},{fetchModel:async()=>new Response('sensitive provider error',{status:401})})({prompt:'x'}),/ai_unavailable/);
});
test('MiniMax streaming frames can span chunks and thinking does not enter the published JSON',async()=>{
 const frames=[{choices:[{delta:{reasoning_content:'private reasoning'}}]},{choices:[{delta:{content:'{"ok":'}}]},{choices:[{delta:{content:'true}'},finish_reason:'stop'}],usage:{total_tokens:2}}].map(x=>'data: '+JSON.stringify(x)+'\n\n').join('')+'data: [DONE]\n\n';
 const infer=createMiniMaxProvider({MINIMAX_API_KEY:'test'},{fetchModel:async()=>new Response(frames,{headers:{'Content-Type':'text/event-stream'}})});assert.deepEqual((await infer({prompt:'test',schema:{}})).value,{ok:true});
});
test('complete JSON with quoting/comma syntax can be repaired, but truncated provider output is rejected',async()=>{
 const provider=content=>createMiniMaxProvider({MINIMAX_API_KEY:'test'},{fetchModel:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content}}]}))});
 assert.deepEqual((await provider('{"ok":true,}')({prompt:'test',schema:{}})).value,{ok:true});
 await assert.rejects(provider('{"ok":true')({prompt:'test',schema:{}}),/ai_invalid_response/);
});
test('hosted D1 chat survives a different Worker and private history cannot be read by a second visitor',async t=>{
 const DB=testD1();t.after(()=>DB.close());const env={DB,MINIMAX_API_KEY:'test',STUDIO_ADMIN_EMAIL:'owner@example.com'};
 const worker=()=>createHostedWorker({assets:{},catalogs,fetchModel:model});
 const a=await worker().fetch(req('/api/studio/chat',{locale:'en',message:'MY_PRIVATE_REQUEST',consent:true}),env),data=await a.json();assert.equal(a.status,200);assert.equal(data.source,'minimax');
 const selected=await worker().fetch(req('/api/studio/select',{locale:'en',conversationId:data.conversationId,index:0}),env);assert.equal(selected.status,200);assert.equal((await selected.json()).url,'/en/tests/communication-style/');
 const denied=await worker().fetch(req('/api/studio/select',{locale:'en',conversationId:data.conversationId,index:0},'two'),env);assert.equal(denied.status,410);
 const history=await worker().fetch(req('/api/studio/history',{locale:'en'},'two'),env);assert.equal((await history.json()).research,null);
 const streaming=await worker().fetch(req('/api/studio/chat',{locale:'en',message:'A second synthetic request'},'two',{Accept:'text/event-stream'}),env);assert.equal(streaming.headers.get('content-type'),'text/event-stream; charset=utf-8');assert((await streaming.text()).includes('"result":'));
 const publicAdmin=await worker().fetch(req('/api/admin/insights',{locale:'en',days:30}),env);assert.equal(publicAdmin.status,403);
 const privateAdmin=await worker().fetch(req('/api/admin/insights',{locale:'en',days:30},'one',{'oai-authenticated-user-email':'owner@example.com'}),env);const report=await privateAdmin.json();assert.equal(report.sample.consentedConversations,1);assert(!JSON.stringify(report).includes('MY_PRIVATE_REQUEST'));
});
test('hosted invitation has frozen bilingual content, two immutable participants, revocation and anonymous shares',async t=>{
 const DB=testD1();t.after(()=>DB.close());const env={DB},worker=createHostedWorker({assets:{},catalogs});const q=getQuizzes('en')[0],body={locale:'en',quizId:q.id,version:q.version,answers:q.questions.map(x=>x.answers[0].id),consent:true};
 const a=await worker.fetch(req('/api/studio/pair-create',body),env),pair=await a.json();assert.equal(a.status,200);assert.equal(pair.comparison,null);
 const page=await worker.fetch(new Request(base+pair.quizUrl.replace('/en/','/')),env);const html=await page.text();assert.equal(page.status,200);assert(html.includes('data-runtime="hosted"'));assert(html.includes(`?compare=${pair.token}" lang=`));assert.equal(page.headers.get('X-Robots-Tag'),'noindex, nofollow');
 const result=await worker.fetch(req('/api/studio/pair-join',{...body,token:pair.token},'two'),env);assert.equal(result.status,200);assert((await result.json()).ready);
 const view=await worker.fetch(req('/api/studio/pair-view',{locale:'zh',token:pair.token}),env);assert((await view.json()).ready);
 await worker.fetch(req('/api/studio/pair-revoke',{locale:'en',token:pair.token}),env);assert.equal((await worker.fetch(req('/api/studio/pair-view',{locale:'en',token:pair.token},'two'),env)).status,410);
});
test('D1 shared daily reservations cannot exceed the configured global cap; schema is not created at request time',async t=>{
 const DB=testD1();t.after(()=>DB.close());const store=createD1Store(DB);await store.reserveAI('a',2);await store.reserveAI('b',2);await assert.rejects(store.reserveAI('c',2),/ai_daily_limit/);
});
test('hosted endpoints reject CSRF and oversized requests; admin page is server protected',async t=>{
 const DB=testD1();t.after(()=>DB.close());const worker=createHostedWorker({assets:{},catalogs}),env={DB};
 assert.equal((await worker.fetch(req('/api/studio/catalog',{},'one',{Origin:'https://other.example'}),env)).status,403);
 assert.equal((await worker.fetch(req('/api/studio/chat',{message:'x'.repeat(17000)}),env)).status,413);
 assert.equal((await worker.fetch(new Request(base+'/admin/'),env)).status,403);
 assert(!hostedCopy('内部测试使用本机已登录的 ChatGPT/Codex 账号；通过官方 CLI 发送需求。').includes('ChatGPT'));
});
