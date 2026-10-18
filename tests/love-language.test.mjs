import test from 'node:test';
import assert from 'node:assert/strict';
import {getQuizzes,getCatalog} from '../src/i18n/content.mjs';
import {scoreQuiz} from '../src/engine.mjs';
import {pages} from '../src/render.mjs';
import {createCloudApi} from '../src/server/cloudflare-api.mjs';
import {testD1} from './helpers/d1.mjs';
const find=locale=>getQuizzes(locale).find(q=>q.id==='love-language');
const chosen=(q,key)=>q.questions.map(x=>x.answers.find(a=>a.profile===key).id);

test('love expression offers five reachable preferences with stable bilingual IDs and unbiased option rotation',()=>{
 const en=find('en'),zh=find('zh'),keys=Object.keys(en.profiles);
 assert.equal(en.questions.length,15);assert.equal(keys.length,5);
 for(const key of keys){assert.deepEqual(scoreQuiz(en,chosen(en,key)),scoreQuiz(zh,chosen(zh,key)));assert.equal(scoreQuiz(en,chosen(en,key)).counts[key],15);for(let slot=0;slot<5;slot++)assert.equal(en.questions.filter(q=>q.answers[slot].profile===key).length,3);}
 const balanced=scoreQuiz(en,en.questions.map((q,i)=>q.answers.find(a=>a.profile===keys[i%5]).id));assert.equal(balanced.leaders.length,5);assert.deepEqual(Object.values(balanced.counts),[3,3,3,3,3]);
});

test('love landing and topic have indexable bilingual content, original method, consent, sources and real internal links',()=>{
 const output=pages();for(const locale of ['zh','en']){
  const prefix=locale==='en'?'/en':'',page=output.find(x=>x.path===prefix+'/tests/love-language/').html;
  assert(page.includes('id="love-method"'));assert(page.includes('id="couples"'));assert(page.includes('39420529'));assert(page.includes('40977357'));assert(!page.includes('noindex'));assert(page.includes('WebApplication'));assert(page.includes('2026-10-18'));assert(page.includes(prefix+'/privacy/'));
  const hub=output.find(x=>x.path===prefix+'/quizzes/love/').html;assert(hub.includes(prefix+'/tests/love-language/'));assert(hub.includes(prefix+'/tests/communication-style/'));
  const home=output.find(x=>x.path===prefix+'/').html;assert(home.includes(prefix+'/quizzes/love/'));assert(home.includes(prefix+'/tests/love-language/'));
 }
 assert(getCatalog('zh').find(x=>x.id==='love-language').tags.includes('恋爱'));
});

test('five-way ties survive real API scoring, Chinese/English frozen pair snapshots and result-aware recommendations',async t=>{
 const DB=testD1();t.after(()=>DB.close());let prompt='';const choices=['communication-style','animal-personality','work-style'].map(id=>({kind:'existing',id,title:'Test',description:'Description',reason:'A next angle',topicKey:''}));
 const api=createCloudApi({fetchModel:async(_url,init)=>{prompt=JSON.parse(init.body).messages[1].content;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({action:'offer',message:'Try three different angles',question:'',quickOptions:[],choices})}}]}));}});
 const env={DB,WEB_ORIGIN:'https://335083474.github.io',MINIMAX_API_KEY:'test-only',RATE_LIMIT_SALT:'test-only'},a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64);
 const call=async(action,input,token=a)=>{const r=await api.fetch(new Request('https://api.example/api/studio/'+action,{method:'POST',headers:{Origin:env.WEB_ORIGIN,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({locale:'zh',...input})}),env);return{status:r.status,value:await r.json()};};
 const q=find('zh'),keys=Object.keys(q.profiles),answers=q.questions.map((x,i)=>x.answers.find(a=>a.profile===keys[i%5]).id),body={quizId:q.id,version:q.version,answers,consent:true};
 assert.equal((await call('complete',body)).status,200);assert.equal((await call('complete',body)).value.counted,false);
 const made=await call('pair-create',body);assert.equal(made.status,200);const token=made.value.token;
 assert.equal((await call('pair-view',{token},b)).value.comparison,null);
 const frozen=await call('quiz',{quizId:q.id,comparisonToken:token,locale:'en'},b);assert.equal(frozen.value.quiz.questions.length,15);assert.equal(Object.keys(frozen.value.quiz.profiles).length,5);
 assert.equal((await call('pair-join',{...body,token,consent:false},b)).status,400);
 const joined=await call('pair-join',{...body,locale:'en',token,answers:chosen(find('en'),'closeness')},b);assert.equal(joined.status,200);assert.equal(joined.value.comparison.rows.length,5);assert.equal(joined.value.comparison.a.leaders.length,5);assert.equal(joined.value.comparison.b.counts.closeness,15);
 const next=await call('related',{quizId:q.id,leaders:keys});assert.equal(next.status,200);assert.equal(next.value.choices.length,3);assert(keys.every(k=>prompt.includes(q.profiles[k].name)));
 assert.equal((await call('pair-join',{...body,token},c)).status,409);assert.equal((await call('pair-revoke',{token})).status,200);assert.equal((await call('pair-view',{token},b)).status,410);
});
