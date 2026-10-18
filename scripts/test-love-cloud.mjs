import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {getQuizzes} from '../src/i18n/content.mjs';
import cloud from '../cloudflare.config.mjs';
const identities=Object.fromEntries(['a','b','c'].map(k=>[k,crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')]));
const report={passed:false,checks:[],aiRequested:process.argv.includes('--ai')};
async function call(action,input={},who='a'){
 const r=await fetch(cloud.apiOrigin+'/api/studio/'+action,{method:'POST',headers:{Origin:cloud.webOrigin,Authorization:'Bearer '+identities[who],'Content-Type':'application/json'},body:JSON.stringify({locale:'zh',...input}),signal:AbortSignal.timeout(200000)});
 const value=await r.json();return{status:r.status,value};
}
try{
 const q=getQuizzes('zh').find(x=>x.id==='love-language'),keys=Object.keys(q.profiles),balanced=q.questions.map((x,i)=>x.answers.find(a=>a.profile===keys[i%5]).id),answers=k=>q.questions.map(x=>x.answers.find(a=>a.profile===k).id);
 const catalog=await call('catalog');assert.equal(catalog.status,200);assert.equal(catalog.value.entries.find(x=>x.id===q.id).questionCount,15);
 assert.equal((await call('catalog',{locale:'en'})).value.entries.find(x=>x.id===q.id).title,'Love expression test');report.checks.push('Real bilingual catalog includes the new 15-question quiz');
 const body={quizId:q.id,version:q.version,answers:balanced,consent:true};
 assert.equal((await call('start',body)).status,200);const result=await call('complete',body);assert.equal(result.status,200);assert.equal(result.value.result.leaders.length,5);assert.equal((await call('complete',body)).value.counted,false);report.checks.push('All five tied results are scored and shared completions deduplicate');
 const made=await call('pair-create',body);assert.equal(made.status,200);const token=made.value.token;
 assert.equal((await call('pair-view',{token},'b')).value.comparison,null);
 const frozen=await call('quiz',{locale:'en',quizId:q.id,comparisonToken:token},'b');assert.equal(frozen.status,200);assert.equal(frozen.value.quiz.questions.length,15);assert.equal(Object.keys(frozen.value.quiz.profiles).length,5);
 const joined=await call('pair-join',{...body,locale:'en',token,answers:answers('closeness')},'b');assert.equal(joined.status,200);assert.equal(joined.value.comparison.rows.length,5);assert.equal(joined.value.comparison.b.counts.closeness,15);assert(joined.value.comparison.prompts.some(x=>x.includes('closeness')));report.checks.push('Independent English guest uses a frozen version; both five-way summaries and relevant prompts appear');
 assert.equal((await call('pair-join',{...body,token},'c')).status,409);report.checks.push('Third visitor cannot replace either participant');
 if(report.aiRequested){
  let chat=await call('chat',{message:'我和伴侣都是成年人，想做目录里已有的 love-language 恋爱表达测试，独立回答15道题，完整结果免费再对比。不需要诊断或爱情匹配分，请推荐现有项目。',consent:false});assert.equal(chat.status,200);
  for(let i=0;chat.value.action==='ask'&&i<2;i++){chat=await call('chat',{conversationId:chat.value.conversationId,message:'就是测试花园原创恋爱表达测试，五类接收关心偏好，先各自作答，不需要额外主题。'});assert.equal(chat.status,200);}
  assert.equal(chat.value.action,'offer');assert.equal(chat.value.source,'minimax');const index=chat.value.choices.findIndex(x=>x.kind==='existing'&&x.id===q.id);assert(index>=0);const selected=await call('select',{conversationId:chat.value.conversationId,index});assert.equal(selected.status,200);assert.equal(selected.value.url,'/tests/love-language/');report.checks.push('Real MiniMax selects the existing love-expression quiz instead of inventing a destination');report.aiReply=chat.value.message;
  const related=await call('related',{quizId:q.id,leaders:keys});assert.equal(related.status,200);assert.equal(related.value.choices.length,3);report.checks.push('Real MiniMax accepts all five tied preferences and returns three valid continuations');
 }
 assert.equal((await call('pair-revoke',{token})).status,200);assert.equal((await call('pair-view',{token},'b')).status,410);report.checks.push('Revocation disables the shared comparison');report.passed=true;
}catch(e){report.error=e.message;process.exitCode=1;}
finally{
 const cleanup=[];for(const who of Object.keys(identities)){try{cleanup.push((await call('forget',{},who)).status===200);}catch{cleanup.push(false);}}
 report.syntheticDataRemoved=cleanup.every(Boolean);report.completedAt=new Date().toISOString();
 await fs.mkdir('artifacts/love-release',{recursive:true});await fs.writeFile('artifacts/love-release/'+(report.aiRequested?'cloud-ai-report.json':'cloud-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
