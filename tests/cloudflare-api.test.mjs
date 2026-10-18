import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudApi} from '../src/server/cloudflare-api.mjs';
import {testD1} from './helpers/d1.mjs';
import {getQuizzes} from '../src/i18n/content.mjs';
const web='https://335083474.github.io',api='https://api.example',a='1'.repeat(64),b='2'.repeat(64),c='3'.repeat(64);
const offers={action:'offer',message:'Three options',question:'',quickOptions:[],choices:['communication-style','animal-personality','work-style'].map(id=>({kind:'existing',id,title:'Test',description:'Description',reason:'Useful',topicKey:''}))};
const model=async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(offers)}}]}));
const request=(action,input={},token=a,extra={})=>new Request(api+'/api/studio/'+action,{method:'POST',headers:{Origin:web,Authorization:'Bearer '+token,'Content-Type':'application/json',...extra},body:JSON.stringify({locale:'zh',...input})});
const envFor=DB=>({DB,WEB_ORIGIN:web,MINIMAX_API_KEY:'test-only',MINIMAX_MODEL:'MiniMax-M3',RATE_LIMIT_SALT:'test-only-rate-limit-salt',STUDIO_DAILY_CALL_LIMIT:'50'});

test('Cloudflare API permits only the configured frontend and bounded authenticated JSON requests',async t=>{
 const DB=testD1();t.after(()=>DB.close());let calls=0;const worker=createCloudApi({fetchModel:async()=>{calls++;return model();}}),env=envFor(DB);
 const preflight=await worker.fetch(new Request(api+'/api/studio/chat',{method:'OPTIONS',headers:{Origin:web,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}}),env);assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),web);assert.equal(preflight.headers.get('access-control-allow-credentials'),null);
 assert.equal((await worker.fetch(request('catalog',{},a,{Origin:'https://evil.example'}),env)).status,403);
 assert.equal((await worker.fetch(request('catalog',{},a,{Authorization:''}),env)).status,401);
 assert.equal((await worker.fetch(request('chat',{message:'x'.repeat(17000)}),env)).status,413);
 assert.equal((await worker.fetch(request('insights',{days:30},a,{'oai-authenticated-user-email':'owner@example.com'}),env)).status,403);assert.equal(calls,0);
 const catalog=await worker.fetch(request('catalog'),env);assert.equal(catalog.status,200);assert.equal((await catalog.json()).entries.length,9);assert.equal(catalog.headers.get('set-cookie'),null);
});
test('Hashed bearer identities persist conversations across workers and isolate private opt-in history',async t=>{
 const DB=testD1();t.after(()=>DB.close());const env=envFor(DB),worker=()=>createCloudApi({fetchModel:model});
 const response=await worker().fetch(request('chat',{message:'MY_PRIVATE_GOAL',consent:true}),env),value=await response.json();assert.equal(value.source,'minimax');
 const wrong=await worker().fetch(request('select',{conversationId:value.conversationId,index:0},b),env);assert.equal(wrong.status,410);
 const selected=await worker().fetch(request('select',{conversationId:value.conversationId,index:0}),env);assert.equal(selected.status,200);assert.equal((await selected.json()).url,'/tests/communication-style/');
 assert.equal((await(await worker().fetch(request('history',{},b),env)).json()).research,null);
 const own=await(await worker().fetch(request('history'),env)).json();assert(own.research[0].turns.some(t=>t.text==='MY_PRIVATE_GOAL'));
 const owner=DB.raw.prepare('SELECT owner FROM conversation_state').get().owner;assert(!owner.includes(a));
});
test('Cloudflare shared rankings deduplicate completions and two independent participants use one frozen quiz',async t=>{
 const DB=testD1();t.after(()=>DB.close());const env=envFor(DB),worker=createCloudApi({fetchModel:model}),q=getQuizzes('zh').find(x=>x.id==='communication-style'),answers=profile=>q.questions.map(x=>x.answers.find(a=>a.profile===profile).id);
 const call=async(action,input={},who=a)=>{const r=await worker.fetch(request(action,input,who),env);return{status:r.status,value:await r.json()};};
 const base={quizId:q.id,version:q.version,answers:answers('anchor')};for(let i=0;i<2;i++)assert.equal((await call('complete',base)).status,200);
 assert.equal((await call('catalog')).value.counts.find(x=>x.id===q.id).total,1);
 const made=await call('pair-create',{...base,consent:true}),token=made.value.token;assert.equal(made.status,200);assert.equal(made.value.comparison,null);
 assert.equal((await call('pair-view',{token},b)).value.comparison,null);
 const frozen=await call('quiz',{quizId:q.id,comparisonToken:token},b);assert.equal(frozen.value.quiz.version,q.version);assert.equal(frozen.value.quiz.questions.length,12);
 assert.equal((await call('pair-join',{token,version:q.version,answers:answers('connector'),consent:true},b)).status,200);
 const pair=(await call('pair-view',{token},a)).value;assert(pair.ready);assert.equal(pair.comparison.a.counts.anchor,12);assert.equal(pair.comparison.b.counts.connector,12);
 assert.equal((await call('pair-join',{token,version:q.version,answers:answers('anchor'),consent:true},c)).status,409);
 assert.equal((await call('catalog',{},c)).value.counts.find(x=>x.id===q.id).total,2);
 await call('pair-revoke',{token});assert.equal((await call('pair-view',{token},b)).status,410);
});
test('Shared AI cap blocks extra provider calls and network identifiers are daily keyed hashes',async t=>{
 const DB=testD1();t.after(()=>DB.close());let calls=0;const env={...envFor(DB),STUDIO_DAILY_CALL_LIMIT:'1'},worker=createCloudApi({fetchModel:async()=>{calls++;return model();}});
 assert.equal((await worker.fetch(request('chat',{message:'hello'},a,{'cf-connecting-ip':'192.0.2.20'}),env)).status,200);
 const blocked=await worker.fetch(request('chat',{message:'hello'},b,{'cf-connecting-ip':'192.0.2.20'}),env);assert.equal(blocked.status,429);assert.equal(calls,1);
 const keys=DB.raw.prepare('SELECT key FROM ai_budget').all().map(x=>x.key);assert(keys.some(x=>/:network:[a-f0-9]{64}$/.test(x)));assert(!keys.join(' ').includes('192.0.2.20'));
});
