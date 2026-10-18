import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openStudioStore} from '../scripts/lib/studio-store.mjs';
import {createStudioRuntime} from '../scripts/lib/studio-runtime.mjs';
import {getQuizzes,getCatalog} from '../src/i18n/content.mjs';
import {buildInsights,recommendationContext} from '../src/studio-insights.mjs';
const q=getQuizzes('en')[0],answers=profile=>q.questions.map(x=>x.answers.find(a=>a.profile===profile).id);
async function fixture(t,infer=async()=>{throw Error('Unexpected model call');}){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'garden-advanced-')),store=openStudioStore(path.join(dir,'test.sqlite'));t.after(()=>store.close());return {store,runtime:createStudioRuntime({store,infer})};}
const body={locale:'en',quizId:q.id,version:q.version,consent:true,answers:answers('anchor')};
test('analysis uses consented samples and true started cohorts, never divides old completions by missing starts',()=>{
 const rows={research:[{choices:[{id:'work-style',kind:'existing',title:'Work'},{kind:'generate',title:'Listening',topicKey:'listening'}],selected:{index:1,generated:true}}],starts:[{owner:'a',id:q.id,version:q.version,at:10}],completions:[{owner:'a',id:q.id,version:q.version,at:20},{owner:'legacy',id:q.id,version:q.version,at:5}],feedback:[{id:q.id,value:'misses'}]};
 const result=buildInsights(rows,getCatalog('en')),item=result.quizzes.find(x=>x.id===q.id);
 assert.equal(item.completionRate,1);assert.equal(item.completions,2);assert.equal(item.feedbackN,1);assert(item.lowSample);
 assert.equal(result.sample.chosen,1);assert.equal(result.topics[0].title,'Listening');assert(!JSON.stringify(result).includes('legacy'));
 const empty=buildInsights({...rows,starts:[]},getCatalog('en'));assert.equal(empty.quizzes.find(x=>x.id===q.id).completionRate,null);
});
test('admin analytics require trusted server authorization',async t=>{const {runtime}=await fixture(t);await assert.rejects(runtime.handle('insights',{locale:'en',days:30},'a'),/admin_required/);assert.equal((await runtime.handle('insights',{locale:'en',days:30},'a',undefined,{admin:true})).sample.consentedConversations,0);});
test('recommendations remove finished/disliked tests; small feedback samples cannot affect quality ordering',()=>{
 const c=getCatalog('en'),context=recommendationContext({completed:[{id:q.id}],feedback:[{id:'animal-personality',value:'misses'}],needs:[],quality:[{id:'work-style',n:1,fits:0,fun:0,misses:1}]},c,q.id);
 assert(!context.candidates.some(x=>[q.id,'animal-personality'].includes(x.id)));assert.equal(context.candidates[0].id,'work-style');
});
test('real recommendation prompt includes only this browser goals/feedback and rejects completed IDs',async t=>{
 let prompt='';const {store,runtime}=await fixture(t,async p=>{prompt=p.prompt;return {value:{action:'offer',message:'Three directions',question:'',quickOptions:[],choices:['work-style','historical-character','skribbl'].map(id=>({kind:'existing',id,title:'x',description:'Different context',reason:'A useful next step',topicKey:''}))}};});
 store.complete('a',q);store.record('a',{id:'a-goal',locale:'en',consent:true,turns:[{role:'user',text:'MY_PRIVATE_GOAL'}],offers:[],questions:1});store.record('b',{id:'b-goal',locale:'en',consent:true,turns:[{role:'user',text:'OTHER_PERSON_GOAL'}],offers:[],questions:1});
 store.feedback('a','animal-personality','misses');
 const result=await runtime.handle('related',{locale:'en',quizId:q.id,leaders:['anchor']},'a');assert.equal(result.choices.length,3);assert(prompt.includes('MY_PRIVATE_GOAL'));assert(!prompt.includes('OTHER_PERSON_GOAL'));assert(result.personalized.feedbackUsed===1);
});
test('feedback requires a completed quiz, then can be updated without inflating sample count',async t=>{const {store,runtime}=await fixture(t);await assert.rejects(runtime.handle('feedback',{locale:'en',quizId:q.id,value:'fits'},'a'),/feedback_requires_completion/);store.complete('a',q);await runtime.handle('feedback',{locale:'en',quizId:q.id,value:'fits'},'a');await runtime.handle('feedback',{locale:'en',quizId:q.id,value:'misses'},'a');assert.equal(store.insightRows(0).feedback.length,1);assert.equal(store.profile('a').feedback[0].value,'misses');});
test('pair creation needs explicit consent and verified complete answers, and hides scores until both submit',async t=>{
 const {runtime}=await fixture(t);await assert.rejects(runtime.handle('pair-create',{...body,consent:false},'a'),/comparison_consent_required/);await assert.rejects(runtime.handle('pair-create',{...body,answers:[]},'a'),/invalid_answers/);
 const created=await runtime.handle('pair-create',body,'a');assert.match(created.token,/^[a-f0-9]{64}$/);assert.equal(created.comparison,null);
 const guest=await runtime.handle('pair-view',{locale:'zh',token:created.token},'b');assert(!guest.isCreator);assert.equal(guest.comparison,null);assert(guest.quizUrl.includes('?compare='));assert(!JSON.stringify(guest).includes('creator_id'));
});
test('two participants share a frozen bilingual version; the creator cannot fill the guest slot',async t=>{
 const {runtime,store}=await fixture(t);const created=await runtime.handle('pair-create',body,'a');
 await assert.rejects(runtime.handle('pair-join',{...body,token:created.token},'a'),/comparison_same_browser/);
 const joined=await runtime.handle('pair-join',{...body,locale:'zh',token:created.token,answers:answers('connector')},'b');assert(joined.ready);assert.equal(joined.comparison.a.counts.anchor,12);assert.equal(joined.comparison.b.counts.connector,12);assert.equal(joined.comparison.rows.length,4);assert(!('compatibility' in joined.comparison));
 assert.deepEqual((await runtime.pairQuiz(created.token,'zh')).questions.map(x=>x.id),(await runtime.pairQuiz(created.token,'en')).questions.map(x=>x.id));assert.equal(store.pair(created.token).snapshot.en.version,q.version);
 await assert.rejects(runtime.handle('pair-join',{...body,token:created.token},'third'),/comparison_full/);
});
test('joining is idempotent and cannot overwrite a submitted result',async t=>{const {runtime}=await fixture(t);const c=await runtime.handle('pair-create',body,'a');await runtime.handle('pair-join',{...body,token:c.token},'b');const second=await runtime.handle('pair-join',{...body,token:c.token,answers:answers('connector')},'b');assert.equal(second.comparison.b.counts.anchor,12);});
test('revocation, expiry, malformed tokens and deleting own records invalidate comparison access',async t=>{
 const {runtime,store}=await fixture(t);const c=await runtime.handle('pair-create',body,'a');await assert.rejects(runtime.handle('pair-revoke',{locale:'en',token:c.token},'b'),/comparison_not_owner/);await runtime.handle('pair-revoke',{locale:'en',token:c.token},'a');await assert.rejects(runtime.handle('pair-view',{locale:'en',token:c.token},'b'),/comparison_unavailable/);
 const expired=store.createPair('a',{zh:q,en:q},{leaders:['anchor']},Date.now()-8*86400000);await assert.rejects(runtime.handle('pair-view',{locale:'en',token:expired},'b'),/comparison_/);
 await assert.rejects(runtime.handle('pair-view',{locale:'en',token:'../bad'},'b'),/comparison_not_found/);
 const fresh=await runtime.handle('pair-create',body,'a');await runtime.handle('forget',{locale:'en'},'a');await assert.rejects(runtime.handle('pair-view',{locale:'en',token:fresh.token},'b'),/comparison_not_found/);
});
test('completed quizzes are rejected even when the model tries to select them again',async t=>{
 const {runtime,store}=await fixture(t,async()=>({value:{action:'offer',message:'Options',question:'',quickOptions:[],choices:[q.id,'work-style','historical-character'].map(id=>({kind:'existing',id,title:'x',description:'Context',reason:'Reason',topicKey:''}))}}));store.complete('a',q);await assert.rejects(runtime.handle('related',{locale:'en',quizId:q.id,leaders:['anchor']},'a'),/invalid_ai_choice/);
});
test('comparison AI recommendations require a participant, not just possession of a viewing link',async t=>{
 const {runtime}=await fixture(t);const c=await runtime.handle('pair-create',body,'a');await runtime.handle('pair-join',{...body,token:c.token},'b');await assert.rejects(runtime.handle('related',{locale:'en',quizId:q.id,comparisonToken:c.token},'third'),/comparison_participant_required/);
});
test('joint recommendations receive both verified distributions but not the other participant private goals',async t=>{
 let prompt='';const {runtime,store}=await fixture(t,async p=>{prompt=p.prompt;return {value:{action:'offer',message:'Options for both',question:'',quickOptions:[],choices:['work-style','animal-personality','historical-character'].map(id=>({kind:'existing',id,title:'x',description:'Context',reason:'Reason',topicKey:''}))}};});
 const c=await runtime.handle('pair-create',body,'a');await runtime.handle('pair-join',{...body,token:c.token,answers:answers('connector')},'b');store.record('b',{id:'private-b-goal',consent:true,locale:'en',turns:[{role:'user',text:'OTHER_PARTICIPANT_PRIVATE_GOAL'}],offers:[],questions:0});
 const result=await runtime.handle('related',{locale:'en',quizId:q.id,comparisonToken:c.token},'a');assert.equal(result.choices.length,3);assert(prompt.includes('The Anchor'));assert(prompt.includes('The Connector'));assert(prompt.includes('"share":100'));assert(!prompt.includes('OTHER_PARTICIPANT_PRIVATE_GOAL'));
});
