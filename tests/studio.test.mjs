import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {openStudioStore} from '../scripts/lib/studio-store.mjs';
import {createStudioRuntime} from '../scripts/lib/studio-runtime.mjs';
import {validateDialogue,validateGenerated,localizeGenerated} from '../src/studio-model.mjs';
import {getCatalog} from '../src/i18n/content.mjs';
import {scoreQuiz} from '../src/engine.mjs';
const bi=x=>({zh:'测试'+x,en:'Test '+x});
const spec=()=>({allowed:true,message:bi('fiction only'),title:bi('dragon role'),description:bi('A fictional dragon story quiz.'),topicKey:'fantasy-dragon-role',tags:[bi('curiosity'),bi('company')],profiles:['a','b','c','d'].map(key=>({key,name:bi(key),tagline:bi('tagline '+key),summary:bi('summary '+key),strengths:[bi('strength'),bi('another')],stretch:bi('stretch'),practice:bi('practice'),conversation:bi('question?')})),questions:Array.from({length:8},(_,i)=>({prompt:bi('situation '+i),answers:['a','b','c','d'].map((_,j)=>{const k=['a','b','c','d'][(j+i)%4];return {profile:k,text:bi('choice '+k)};})}))});
const choice=(key='fantasy-dragon-role')=>({kind:'generate',id:'',title:'Dragon role',description:'A fictional adventure',reason:'Explore a story role',topicKey:key});
const offer=()=>({action:'offer',message:'Three distinct adventures',question:'',quickOptions:[],choices:[choice(),choice('fantasy-magic-home'),{kind:'existing',id:'historical-character',title:'Existing',description:'Story role',reason:'Another story',topicKey:''}]});
const ask={action:'ask',message:'Let us find a playful direction.',question:'Alone or with a friend?',quickOptions:['Alone','With a friend'],choices:[]};
async function setup(t,infer){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'garden-studio-')),file=path.join(dir,'test.sqlite'),store=openStudioStore(file);t.after(()=>store.close());return {dir,file,store,runtime:createStudioRuntime({store,infer})};}
test('contracts bound questions, reject unknown existing links/IDs and duplicate choices',()=>{
 assert.throws(()=>validateDialogue(ask,getCatalog('en'),2),/too_many_questions/);
 const v=offer();v.choices[2].id='https://evil.invalid';assert.throws(()=>validateDialogue(v,getCatalog('en'),1));
 const d=offer();d.choices[1]=d.choices[0];assert.throws(()=>validateDialogue(d,getCatalog('en'),1),/duplicate_choice/);
 assert.equal(validateDialogue(offer(),getCatalog('en'),2).choices.length,3);
 const countCopy=offer();countCopy.choices[0].description='12个日常情境，找到你的故事';assert(!validateDialogue(countCopy,getCatalog('en'),2).choices[0].description.includes('12'));
 const omitted=offer();delete omitted.question;assert.equal(validateDialogue(omitted,getCatalog('en'),2).question,'');
});
test('generated bilingual quizzes have consistent scoring and malformed/duplicate questions fail closed',()=>{
 const value=validateGenerated(spec(),'fantasy-dragon-role'),row={id:'ai-unit',spec:value};
 const zh=localizeGenerated(row,'zh'),en=localizeGenerated(row,'en');
 const answers=en.questions.map(q=>q.answers.find(a=>a.profile==='c').id);
 assert.deepEqual(scoreQuiz(zh,answers),scoreQuiz(en,answers));assert.deepEqual(scoreQuiz(en,answers).leaders,['c']);
 const broken=spec();broken.questions[1]=broken.questions[0];assert.throws(()=>validateGenerated(broken,broken.topicKey),/duplicate_question/);
 const wrong=spec();wrong.questions[0].answers[1].profile='a';assert.throws(()=>validateGenerated(wrong,wrong.topicKey));
});
test('requests require consent for persistent research; ownership is checked; two questions maximum',async t=>{
 let calls=0;const {store,runtime}=await setup(t,async()=>({value:++calls<=2?ask:offer()}));
 const one=await runtime.handle('chat',{locale:'en',message:'I want a fantasy quiz'},'owner');
 assert.equal(one.questionsAsked,1);assert.equal(store.research('owner'),null);
 await assert.rejects(runtime.handle('chat',{locale:'en',message:'Alone',conversationId:one.conversationId},'other'),/conversation_expired/);
 const two=await runtime.handle('chat',{locale:'en',message:'Alone',conversationId:one.conversationId},'owner');assert.equal(two.questionsAsked,2);
 const three=await runtime.handle('chat',{locale:'en',message:'Funny',conversationId:one.conversationId},'owner');assert.equal(three.choices.length,3);
});
test('generation is reused, persists on reopening, and raw research can be deleted separately',async t=>{
 let calls=0;const {file,store,runtime}=await setup(t,async({schema})=>{calls++;return {value:schema.properties.allowed?spec():offer()};});
 const c=await runtime.handle('chat',{locale:'en',message:'A fictional dragon quiz',consent:true},'owner');
 const first=await runtime.handle('select',{locale:'en',conversationId:c.conversationId,index:0},'owner');
 const second=await runtime.handle('select',{locale:'en',conversationId:c.conversationId,index:0},'owner');
 assert.equal(first.url,second.url);assert.equal(calls,2);assert(store.research('owner').at(-1).selected);
 const duplicateStore=openStudioStore(file);assert.equal(duplicateStore.list().length,1);duplicateStore.close();
 await runtime.handle('forget',{locale:'en'},'owner');assert.equal(store.research('owner'),null);assert.equal(store.list().length,1);
});
test('only valid full completions count; repeats and version mismatches cannot inflate rankings',async t=>{
 const {store,runtime}=await setup(t,async()=>({value:offer()}));
 const q=await runtime.quiz('communication-style','zh'),answers=q.questions.map(x=>x.answers[0].id),input={locale:'zh',quizId:q.id,version:q.version,answers};
 await assert.rejects(runtime.handle('complete',{...input,answers:[]},'owner'),/invalid_answers/);
 await assert.rejects(runtime.handle('complete',{...input,version:'wrong'},'owner'),/version_changed/);
 assert.equal((await runtime.handle('complete',input,'owner')).counted,true);
 assert.equal((await runtime.handle('complete',input,'owner')).counted,false);
 assert.equal(store.stats()[0].total,1);assert.equal(store.stats()[0].week,1);
 await runtime.handle('forget',{locale:'zh'},'owner');assert.equal(store.stats().length,0);
});
test('existing external activities are resolved from the catalog, not model-generated URLs',async t=>{
 const v=offer();v.choices[2]={...v.choices[2],id:'skribbl'};
 const {runtime}=await setup(t,async()=>({value:v}));
 const c=await runtime.handle('chat',{locale:'en',message:'Play with friends'},'owner');
 const next=await runtime.handle('select',{locale:'en',conversationId:c.conversationId,index:2},'owner');
 assert.equal(next.url,getCatalog('en').find(x=>x.id==='skribbl').url);assert.equal(next.external,true);
});
