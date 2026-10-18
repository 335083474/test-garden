import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {getQuizzes} from '../src/i18n/content.mjs';
import cloud from '../cloudflare.config.mjs';
if(!cloud.apiOrigin)throw Error('No deployed API configured');
const web=cloud.webOrigin,base=cloud.apiOrigin,who=Object.fromEntries(['creator','friend','third','english'].map(x=>[x,crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')]));
const checks=[],report={passed:false,api:base,checks};
const call=async(action,body={},person='creator')=>{const r=await fetch(base+'/api/studio/'+action,{method:'POST',headers:{Origin:web,Authorization:'Bearer '+who[person],'Content-Type':'application/json'},body:JSON.stringify({locale:'zh',...body}),signal:AbortSignal.timeout(240000)});let value;try{value=await r.json();}catch{throw Error('Non-JSON response: '+r.status);}if(r.status!==200)report.lastNonSuccess={action,status:r.status,error:value.error};return{status:r.status,value,headers:r.headers};};
let invitation;
try{
 const health=await(await fetch(base+'/health')).json();assert(health.storage&&health.aiConfigured);checks.push('Cloudflare Worker with D1 and secret-configured MiniMax');
 const pre=await fetch(base+'/api/studio/chat',{method:'OPTIONS',headers:{Origin:web,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),web);checks.push('Real cross-origin preflight for GitHub');
 const denied=await fetch(base+'/api/studio/catalog',{method:'POST',headers:{Origin:'https://example.invalid',Authorization:'Bearer '+who.third,'Content-Type':'application/json'},body:'{"locale":"zh"}'});assert.equal(denied.status,403);assert.equal((await call('insights',{days:30},'third')).status,403);checks.push('Other origins and owner analysis remain inaccessible');
 const catalog=await call('catalog');assert.equal(catalog.status,200);assert(catalog.value.entries.length>=8);
 const q=getQuizzes('zh').find(x=>x.id==='communication-style'),answer=profile=>q.questions.map(x=>x.answers.find(a=>a.profile===profile).id),data={quizId:q.id,version:q.version,answers:answer('anchor')};
 const previous=catalog.value.counts.find(x=>x.id===q.id)?.total||0;
 assert.equal((await call('start',data)).status,200);for(let i=0;i<2;i++)assert.equal((await call('complete',data)).status,200);
 assert.equal((await call('feedback',{quizId:q.id,value:'fits'})).status,200);assert.equal((await call('catalog')).value.counts.find(x=>x.id===q.id).total,previous+1);checks.push('Shared database completions increment once and accept feedback');
 const made=await call('pair-create',{...data,consent:true});assert.equal(made.status,200);invitation=made.value.token;assert.equal(made.value.comparison,null);
 const pending=await call('pair-view',{token:invitation},'friend');assert.equal(pending.value.comparison,null);
 const frozen=await call('quiz',{quizId:q.id,comparisonToken:invitation},'friend');assert.equal(frozen.status,200);assert.equal(frozen.value.quiz.questions.length,12);
 const joined=await call('pair-join',{token:invitation,version:q.version,answers:answer('connector'),consent:true},'friend');assert.equal(joined.status,200);assert.equal(joined.value.comparison.a.counts.anchor,12);assert.equal(joined.value.comparison.b.counts.connector,12);
 assert.equal((await call('pair-join',{token:invitation,version:q.version,answers:answer('anchor'),consent:true},'third')).status,409);checks.push('Independent visitors share frozen questionnaire, hidden results and immutable slots');
 if(!process.argv.includes('--pair-only')){
 let chat=await call('chat',{message:'我想做一个森林魔法邮局精灵的虚构故事角色测试，8道题，一个人玩，轻松好玩。不涉及真实前世或诊断。',consent:false});assert.equal(chat.status,200);
 for(let i=0;chat.value.action==='ask'&&i<2;i++){chat=await call('chat',{conversationId:chat.value.conversationId,message:'纯虚构的故事角色，轻松好玩，8道题，按我的选择生成四种不同故事结果。'});assert.equal(chat.status,200);}
 assert.equal(chat.value.action,'offer');assert.equal(chat.value.choices.length,3);assert.equal(chat.value.source,'minimax');report.chineseReply={message:chat.value.message,choices:chat.value.choices};checks.push('Real MiniMax understands Chinese and returns three validated choices');
 const index=chat.value.choices.findIndex(x=>x.kind==='generate');assert(index>=0);const created=await call('select',{conversationId:chat.value.conversationId,index});assert.equal(created.status,200);assert(!created.value.declined);const id=created.value.url.match(/ai-[a-f0-9]{16}/)?.[0];assert(id);report.createdId=id;
 for(const locale of ['zh','en']){const loaded=await call('quiz',{quizId:id,locale},'third');assert.equal(loaded.status,200);assert.equal(loaded.value.quiz.questions.length,8);assert.equal(Object.keys(loaded.value.quiz.profiles).length,4);}
 checks.push('Real AI generates a persistent bilingual eight-question quiz');
 const english=await call('chat',{locale:'en',message:'I want a fun communication quiz to try independently and compare with a friend.',consent:false},'english');assert.equal(english.status,200);assert.equal(english.value.source,'minimax');assert(english.value.message);report.englishReply={action:english.value.action,message:english.value.message};checks.push('Real MiniMax responds to an English request');
 }
 const pairNext=await call('related',{quizId:q.id,comparisonToken:invitation});assert.equal(pairNext.status,200);assert.equal(pairNext.value.choices.length,3);report.jointRecommendations=pairNext.value.choices;checks.push('Real AI recommends three next choices using both submitted results');
 assert.equal((await call('history')).value.research,null);checks.push('Unconsented dialogue is not retained as research history');
 assert.equal((await call('pair-revoke',{token:invitation})).status,200);assert.equal((await call('pair-view',{token:invitation},'friend')).status,410);checks.push('Creator revocation disables the shared invitation');
 report.passed=true;
}catch(e){report.error=e.message;process.exitCode=1;}
finally{
 const cleanup=[];for(const person of Object.keys(who)){try{cleanup.push((await call('forget',{},person)).status===200);}catch{cleanup.push(false);}}
 report.syntheticVisitorDataRemoved=cleanup.every(Boolean);report.completedAt=new Date().toISOString();
 await fs.mkdir(new URL('../artifacts/cloudflare/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../artifacts/cloudflare/'+(process.argv.includes('--pair-only')?'pair-http-report.json':'http-report.json'),import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,checks,createdId:report.createdId,error:report.error||null}));
}
