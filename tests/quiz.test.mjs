import test from 'node:test';
import assert from 'node:assert/strict';
import {quizzes} from '../src/data/quizzes.mjs';
import {catalog} from '../src/data/catalog.mjs';
import {scoreQuiz,resultTitle,filterCatalog} from '../src/engine.mjs';
for(const quiz of quizzes){
 test(`${quiz.id}: every profile can be reached and scores total 12`,()=>{
  for(const key of Object.keys(quiz.profiles)){
   const answers=quiz.questions.map(q=>q.answers.find(a=>a.profile===key).id);
   const score=scoreQuiz(quiz,answers);
   assert.deepEqual(score.leaders,[key]);assert.equal(score.counts[key],12);assert.equal(score.percentages[key],100);
   assert.equal(Object.values(score.counts).reduce((a,b)=>a+b),12);
  }
 });
 test(`${quiz.id}: ties are preserved rather than assigned a false winner`,()=>{
  const keys=Object.keys(quiz.profiles);
  const score=scoreQuiz(quiz,quiz.questions.map((q,i)=>q.answers.find(a=>a.profile===keys[i%4]).id));
  assert.equal(score.leaders.length,4);assert.equal(resultTitle(quiz,score),'A balanced mix');
  const pair=scoreQuiz(quiz,quiz.questions.map((q,i)=>q.answers.find(a=>a.profile===keys[i%2]).id));
  assert.deepEqual(pair.leaders,keys.slice(0,2));assert.equal(pair.isMixed,true);
 });
 test(`${quiz.id}: incomplete, foreign, and malformed answers cannot produce a result`,()=>{
  assert.throws(()=>scoreQuiz(quiz,[]));
  assert.throws(()=>scoreQuiz(quiz,Array(12).fill('foreign-question-answer')));
  const valid=quiz.questions.map(q=>q.answers[0].id);valid[3]=valid[0];assert.throws(()=>scoreQuiz(quiz,valid));
 });
}
test('catalog filters distinguish compare-later quizzes from live group activities',()=>{
 assert.equal(filterCatalog(catalog,{mode:'compare'}).length,5);
 assert.equal(filterCatalog(catalog,{mode:'together'}).length,3);
 assert.equal(filterCatalog(catalog,{category:'Personality'}).length,1);
 assert.equal(filterCatalog(catalog,{query:'  drawing  '}).length,2);
 assert.equal(filterCatalog(catalog,{query:'this does not exist'}).length,0);
 assert.equal(filterCatalog(catalog,{mode:'together',players:'pair'}).length,2);
});
