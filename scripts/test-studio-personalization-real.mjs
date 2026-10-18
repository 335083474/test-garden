import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {openStudioStore} from './lib/studio-store.mjs';
import {createStudioRuntime} from './lib/studio-runtime.mjs';
import {runPlanJson} from './lib/codex-plan.mjs';
import {getQuizzes} from '../src/i18n/content.mjs';
await fs.mkdir('artifacts/studio-advanced',{recursive:true});const store=openStudioStore(path.resolve('artifacts/studio-advanced/real-test.sqlite'));const calls=[];
const runtime=createStudioRuntime({store,infer:async payload=>{const r=await runPlanJson(payload);calls.push({elapsedMs:r.elapsedMs,usage:r.usage,toolCalls:r.toolCalls});return r;}});
const q=getQuizzes('zh').find(x=>x.id==='communication-style'),owner='synthetic-personalization';
for(const id of ['communication-style','animal-personality','work-style'])store.complete(owner,getQuizzes('zh').find(x=>x.id===id));
store.feedback(owner,'animal-personality','misses');store.record(owner,{id:'synthetic-goal',consent:true,locale:'zh',turns:[{role:'user',text:'我想和朋友轻松交流，别再给我做过的测试，也不要把上次动物结果当成真实人格。'}],offers:[],questions:0});
const report={realModel:true,calls};
try{const result=await runtime.handle('related',{locale:'zh',quizId:q.id,leaders:['anchor']},owner);assert.equal(result.choices.length,3);assert(!result.choices.some(x=>x.kind==='existing'&&['communication-style','animal-personality','work-style'].includes(x.id)));assert.equal(result.personalized.feedbackUsed,1);assert.equal(result.personalized.goalsUsed,1);report.response=result;report.pass=true;}catch(error){report.pass=false;report.error=error.message;process.exitCode=1;}finally{store.close();await fs.writeFile('artifacts/studio-advanced/real-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,error:report.error,calls:calls.length}));}
