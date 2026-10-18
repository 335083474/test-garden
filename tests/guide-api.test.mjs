import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuideApi,createWorker,modelRequest,validateSelection} from '../src/server/guide-api.mjs';
import {getCatalog} from '../src/i18n/content.mjs';
const catalogs={zh:getCatalog('zh'),en:getCatalog('en')};
const env={OPENAI_API_KEY:'fixture-secret-not-a-real-key',OPENAI_MODEL:'fixture-model'};
const body={query:'I struggle to get my point across',locale:'en',scope:'all',mode:'all'};
const request=(data=body,{origin='https://example.com',method='POST',...headers}={})=>new Request('https://example.com/api/recommend',{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},...(method==='POST'?{body:JSON.stringify(data)}:{})});
const modelOutput=value=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]}),{status:200});

test('AI contract sends a bilingual catalog and bounded ID schema to the fixed provider endpoint',async()=>{
 for(const locale of ['zh','en']){
  let calls=0;
  const api=createGuideApi({catalogs,fetchModel:async(url,options)=>{
   calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer '+env.OPENAI_API_KEY);
   const payload=JSON.parse(options.body);assert.equal(payload.store,false);assert.equal(payload.model,env.OPENAI_MODEL);assert.equal(payload.text.format.strict,true);
   assert.deepEqual(payload.text.format.schema.properties.ids.items.enum,catalogs[locale].map(x=>x.id));
   const input=JSON.parse(payload.input);assert.equal(input.language,locale);assert.equal(input.userDescription,'I struggle to get my point across');assert(!input.catalog.some(x=>'url' in x));
   return modelOutput({status:'results',ids:['communication-style']});
  }});
  const response=await api(request({...body,locale}),env),result=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(result.source,'ai');assert.deepEqual(result.picks,[{id:'communication-style',reason:'communication'}]);assert.equal(calls,1);
 }
});
test('missing credentials, bad Origin, methods, schemas and oversized bodies never invoke a model',async()=>{
 let calls=0;const api=createGuideApi({catalogs,fetchModel:async()=>{calls++;throw Error('unexpected');}});
 assert.equal((await api(request(),{})).status,503);
 assert.equal((await api(request(body,{origin:'https://attacker.test'}),env)).status,403);
 assert.equal((await api(request(body,{method:'GET'}),env)).status,405);
 assert.equal((await api(request({...body,query:'x'.repeat(401)}),env)).status,400);
 assert.equal((await api(request({...body,locale:'xx'}),env)).status,400);
 assert.equal((await api(request({...body,scope:'private'}),env)).status,400);
 assert.equal((await api(request({...body,model:'client-chosen'}),env)).status,400);
 assert.equal((await api(request(body,{'Content-Type':'text/plain'}),env)).status,415);
 assert.equal((await api(request({...body,query:'x'.repeat(5000)}),env)).status,413);
 assert.equal(calls,0);
});
test('hallucinated IDs, URLs, duplicates, invalid status, extra fields and out-of-filter choices are rejected',()=>{
 for(const value of [{status:'results',ids:['not-in-catalog']},{status:'results',ids:['https://attacker.test']},{status:'results',ids:['work-style','work-style']},{status:'empty',ids:['work-style']},{status:'results',ids:[]},{status:'results',ids:['work-style'],url:'https://attacker.test'},{status:'new',ids:[]}])assert.throws(()=>validateSelection(value,catalogs.en,body));
 assert.throws(()=>validateSelection({status:'results',ids:['work-style']},catalogs.en,{...body,scope:'external'}));
 assert.throws(()=>validateSelection({status:'results',ids:['bestiescore']},catalogs.en,{...body,mode:'together'}));
 assert.throws(()=>validateSelection({status:'results',ids:catalogs.en.map(x=>x.id)},catalogs.en,body));
 const payload=modelRequest([...catalogs.en,{...catalogs.en[0],id:'future-test'}],body,env.OPENAI_MODEL);
 assert(payload.text.format.schema.properties.ids.items.enum.includes('future-test'));
});
test('provider failure, timeout, malformed response and injection attempts fail closed without exposing provider content',async()=>{
 const cases=[()=>new Response('upstream secret detail',{status:500}),()=>{throw Error('secret timeout detail');},()=>new Response('not json'),()=>modelOutput({status:'results',ids:['new-evil-test']}),()=>new Response(JSON.stringify({status:'incomplete',output:[]}))];
 for(const mock of cases){
  const api=createGuideApi({catalogs,fetchModel:mock});const response=await api(request(),env);assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'ai_unavailable'});
 }
 const api=createGuideApi({catalogs,fetchModel:async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'fixture refusal'}]}]}))});
 assert.deepEqual(await (await api(request(),env)).json(),{source:'ai',status:'unsupported',picks:[]});
});
test('same-client concurrent calls and per-minute use are bounded without automatic retries',async()=>{
 let resolveModel,calls=0,time=0;
 const api=createGuideApi({catalogs,now:()=>time,fetchModel:async()=>{calls++;return new Promise(resolve=>{resolveModel=resolve;});}});
 const pending=api(request(),env);await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal((await api(request(),env)).status,429);assert.equal(calls,1);
 resolveModel(modelOutput({status:'empty',ids:[]}));await pending;
 let completed=0;const limited=createGuideApi({catalogs,now:()=>time,fetchModel:async()=>{completed++;return modelOutput({status:'empty',ids:[]});}});
 for(let i=0;i<12;i++)assert.equal((await limited(request(),env)).status,200);
 const denied=await limited(request(),env);assert.equal(denied.status,429);assert.equal(denied.headers.get('Retry-After'),'60');assert.equal(completed,12);
 time=60001;assert.equal((await limited(request(),env)).status,200);
});
test('the Worker serves bilingual assets and protects API routing independently of static pages',async()=>{
 const encode=s=>Buffer.from(s).toString('base64');
 const worker=createWorker({catalogs,assets:{'/index.html':encode('中文首页'),'/en/index.html':encode('English home'),'/404.html':encode('没有这个页面'),'/en/404.html':encode('Not found')}});
 const root=await worker.fetch(new Request('https://example.com/'),{});assert.equal(await root.text(),'中文首页');assert.match(root.headers.get('content-security-policy'),/connect-src 'self'/);
 assert.equal(await (await worker.fetch(new Request('https://example.com/en/'),{})).text(),'English home');
 assert.equal((await worker.fetch(new Request('https://example.com/en'),{})).status,308);
 assert.equal((await worker.fetch(new Request('https://example.com/en/missing/'),{})).status,404);
 assert.equal((await worker.fetch(new Request('https://example.com/api/anything'),{})).status,404);
 assert.equal((await worker.fetch(new Request('https://example.com/',{method:'POST'}),{})).status,405);
 assert.equal((await worker.fetch(request(),{})).status,503);
 assert.equal(await (await worker.fetch(new Request('https://example.com/',{method:'HEAD'}),{})).text(),'');
});
