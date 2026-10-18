import test from 'node:test';
import assert from 'node:assert/strict';
import {sitePath} from '../src/site-path.mjs';
import {createDirectoryAdapter} from '../src/github-directory.mjs';
import {getQuizzes} from '../src/i18n/content.mjs';
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),dump:()=>[...m.values()].join('')};};

test('GitHub project paths preserve external URLs and do not duplicate the repository prefix',()=>{
 assert.equal(sitePath('/en/tests/work-style/','/test-garden'),'/test-garden/en/tests/work-style/');
 assert.equal(sitePath('/test-garden/tests/','/test-garden'),'/test-garden/tests/');
 assert.equal(sitePath('https://example.com/','/test-garden'),'https://example.com/');
 assert.equal(sitePath('//example.com/','/test-garden'),'//example.com/');
});
test('Cloud-enabled shared pages stay on GitHub with query routes and preserve invite/version parameters',t=>{
 globalThis.document={body:{dataset:{runtime:'cloudflare',basePath:'/test-garden'}}};t.after(()=>delete globalThis.document);
 const id='ai-'+'a'.repeat(16),token='b'.repeat(64);
 assert.equal(sitePath('/en/created/'+id+'/?compare='+token),'/test-garden/en/created/?compare='+token+'&id='+id);
 assert.equal(sitePath('/compare/'+token+'/'),'/test-garden/compare/?token='+token);
 assert.equal(sitePath('/tests/communication-style/?v=1.0.0'),'/test-garden/tests/communication-style/?v=1.0.0');
 assert.equal(sitePath('/test-garden/en/created/?id='+id),'/test-garden/en/created/?id='+id);
});
test('GitHub directory matching is bilingual, labels its source and selects only catalog entries',async()=>{
 for(const locale of ['zh','en']){const db=storage(),api=createDirectoryAdapter({storage:db,locale});const cat=await api('catalog');assert.equal(cat.entries.length,9);assert(cat.entries.filter(x=>x.type==='native').every(x=>x.url.startsWith('/test-garden/')));
 for(const message of ['前世是什么动物','I want a past life animal quiz']){const response=await api('chat',{message});assert.equal(response.source,'directory');assert(response.choices.some(x=>x.id==='past-life-animal'));assert(response.choices.every(x=>cat.entries.some(e=>e.id===x.id)));const selected=await api('select',{conversationId:response.conversationId,index:0});assert(selected.url.startsWith('/test-garden/'));}
 assert.equal(db.dump(),'');await assert.rejects(()=>api('pair-create'),{code:'ai_backend_not_connected'});}
});
test('GitHub no-match responses do not fabricate generated quizzes or pretend to use AI',async()=>{
 const api=createDirectoryAdapter({storage:storage()});const response=await api('chat',{message:'measure my quantum dragon aura'});assert.equal(response.choices.length,0);assert.match(response.message,/尚未接入/);assert.equal(response.source,'directory');
});
test('Only validated completions count on this device and raw answers or needs are never saved',async()=>{
 const db=storage(),api=createDirectoryAdapter({storage:db}),q=getQuizzes('zh')[0],answers=q.questions.map(x=>x.answers[0].id);
 await assert.rejects(()=>api('complete',{quizId:q.id,version:q.version,answers:[]}));
 for(let i=0;i<2;i++)await api('complete',{quizId:q.id,version:q.version,answers});
 const cat=await api('catalog');assert.equal(cat.counts.find(x=>x.id===q.id).total,1);assert(!db.dump().includes('answers'));assert.equal((await api('history')).research.length,0);
 const related=await api('related',{quizId:q.id});assert(!related.choices.some(x=>x.id===q.id));assert.equal(related.source,'directory');await api('forget');assert.equal(db.dump(),'');
});
