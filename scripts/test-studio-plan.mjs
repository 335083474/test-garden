// Explicit real-model integration test. Uses the previously authorized ChatGPT/Codex plan.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openStudioStore} from './lib/studio-store.mjs';
import {createStudioRuntime} from './lib/studio-runtime.mjs';
import {runPlanJson,checkPlanLogin} from './lib/codex-plan.mjs';
if(!await checkPlanLogin())throw Error('ChatGPT login required');
await fs.mkdir('artifacts/studio-real',{recursive:true});
const store=openStudioStore(path.resolve('artifacts/studio-real/test.sqlite')),report={realModel:true,auth:'Existing ChatGPT/Codex login',calls:[],checks:[]};
const runtime=createStudioRuntime({store,infer:async payload=>{const r=await runPlanJson(payload);report.calls.push({elapsedMs:r.elapsedMs,usage:r.usage,toolCalls:r.toolCalls});await fs.writeFile(`artifacts/studio-real/response-${report.calls.length}.json`,JSON.stringify(r.value,null,2));return r;}});
const owner='synthetic-acceptance';
try{
 let response=await runtime.handle('chat',{locale:'zh',message:'我想玩一个奇幻小测试',consent:true},owner);
 for(let i=0;response.action==='ask'&&i<2;i++){
  console.log(JSON.stringify({stage:'clarify',questions:response.questionsAsked,question:response.question}));
  response=await runtime.handle('chat',{locale:'zh',conversationId:response.conversationId,message:i===0?'自己玩，想看看我会是哪种龙，纯粹好玩':'轻松童话风格，8道情境题，给四种原创龙角色'},owner);
 }
 assert.equal(response.action,'offer');assert.equal(response.choices.length,3);report.dialogue=response;
 const index=response.choices.findIndex(x=>x.kind==='generate');assert(index>=0);console.log(JSON.stringify({stage:'generate',title:response.choices[index].title}));
 const selected=await runtime.handle('select',{locale:'zh',conversationId:response.conversationId,index},owner);assert(selected.created);
 const id=selected.url.match(/(ai-[a-f0-9]{16})/)[1],q=await runtime.quiz(id,'zh');assert.equal(q.questions.length,8);assert.equal((await runtime.quiz(id,'en')).questions.length,8);
 const completed=await runtime.handle('complete',{locale:'zh',quizId:id,version:q.version,answers:q.questions.map(x=>x.answers[0].id)},owner);assert(completed.counted);
 const repeated=await runtime.handle('complete',{locale:'zh',quizId:id,version:q.version,answers:q.questions.map(x=>x.answers[0].id)},owner);assert.equal(repeated.counted,false);
 console.log(JSON.stringify({stage:'related',quizId:id}));
 const related=await runtime.handle('related',{locale:'zh',quizId:id,leaders:completed.result.leaders},owner);assert.equal(related.choices.length,3);report.related=related;
 const english=await runtime.handle('chat',{locale:'en',message:'I want a short playful quiz about my communication style, on my own, everyday situations, for reflection rather than diagnosis.'},'synthetic-en');
 assert(['ask','offer'].includes(english.action));report.english=english;
 report.checks=['Real Chinese multi-turn dialogue','At most 2 clarification questions','Three existing/generated choices','Real bilingual 8-question generation','Persistent reusable quiz','Validated completion and duplicate suppression','Real three-axis related recommendations','Real English dialogue'];
 report.generatedQuiz=id;report.pass=true;
 // Keep tested quiz content available as an internal sample; no test conversations or counts are copied.
 const preview=openStudioStore(path.resolve('.local-data/studio.sqlite'));preview.save(store.find(id).spec);preview.close();
}catch(error){report.pass=false;report.error=error.message;process.exitCode=1;}finally{store.close();await fs.writeFile('artifacts/studio-real/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,calls:report.calls.length,checks:report.checks,error:report.error}));}
