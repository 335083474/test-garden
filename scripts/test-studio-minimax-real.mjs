// Explicit real provider QA. Reads the existing authorized MiniMax configuration without printing it.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {testD1} from '../tests/helpers/d1.mjs';
import {createD1Store} from '../src/server/studio-d1.mjs';
import {createMiniMaxProvider} from '../src/server/minimax.mjs';
import {createStudioRuntime} from './lib/studio-runtime.mjs';
const c=JSON.parse(await fs.readFile(path.join(process.env.MMX_CONFIG_DIR||path.join(os.homedir(),'.mmx'),'config.json'),'utf8'));
const DB=testD1(),store=createD1Store(DB),infer=createMiniMaxProvider({MINIMAX_API_KEY:c.api_key,MINIMAX_REGION:c.region||'cn',MINIMAX_MODEL:process.env.TEST_GARDEN_MINIMAX_MODEL||'MiniMax-M2.5-highspeed'}),calls=[];
const runtime=()=>createStudioRuntime({store,source:'minimax',local:false,infer:async input=>{const r=await infer(input);calls.push({value:r.value,usage:r.usage,elapsedMs:r.elapsedMs});return r;}});
const owner='synthetic-real-minimax',report={provider:'minimax',synthetic:true,pass:false,calls};
try{
 let r=await runtime().handle('chat',{locale:'zh',message:'我想独自做一个轻松的奇幻测试：看看我是哪一种会照顾花园的魔法精灵。纯虚构，想有日常场景和温暖的结果。请提供新测试选择。',consent:false},owner);
 while(r.action==='ask')r=await runtime().handle('chat',{locale:'zh',conversationId:r.conversationId,message:'一个人玩，温暖童话风格，探索如何照顾朋友和自己的小习惯。'},owner);
 assert.equal(r.action,'offer');assert.equal(r.choices.length,3);const index=r.choices.findIndex(x=>x.kind==='generate');assert(index>=0);
 const selected=await runtime().handle('select',{locale:'zh',conversationId:r.conversationId,index},owner);assert(selected.created);const id=selected.url.match(/ai-[a-f0-9]{16}/)[0];
 const zh=await runtime().quiz(id,'zh'),en=await runtime().quiz(id,'en');assert.equal(zh.questions.length,8);assert.equal(en.questions.length,8);assert.deepEqual(zh.questions.map(q=>q.id),en.questions.map(q=>q.id));
 report.quiz={id,zhTitle:zh.title,enTitle:en.title};
 const english=await runtime().handle('chat',{locale:'en',message:'I want a light fictional garden spirit quiz for myself, a warm fairy-tale tone about daily care and friendship habits.'},'synthetic-en');assert(['ask','offer'].includes(english.action));
 report.pass=true;
}catch(e){report.error=e.message;report.diagnostic=e.diagnostic;process.exitCode=1;}finally{DB.close();await fs.mkdir('artifacts/studio-minimax',{recursive:true});await fs.writeFile('artifacts/studio-minimax/real-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,calls:calls.length,error:report.error,diagnostic:report.diagnostic,quiz:report.quiz}));}
