import test from 'node:test';
import assert from 'node:assert/strict';
import {getQuizzes,getCatalog} from '../src/i18n/content.mjs';
import {messages,locales,route,languageTag,text} from '../src/i18n/ui.mjs';
import {scoreQuiz,filterCatalog} from '../src/engine.mjs';
import {pages,origin} from '../src/render.mjs';

test('both languages have complete UI dictionaries and no unfinished interpolation',()=>{
 assert.deepEqual(Object.keys(messages.zh).sort(),Object.keys(messages.en).sort());
 for(const locale of locales)for(const [key,value] of Object.entries(messages[locale])){
  assert.notEqual(value,'',`${locale}/${key}`);
  if(typeof value==='string')assert(!text(locale,key,{date:'2026-10-15',count:12,current:1,total:12,name:'Name',version:'1.0.0',dimensions:'A, B'}).match(/\{\w+\}/),`${locale}/${key}`);
 }
});
test('Chinese questions and results use the exact same IDs, version, answer maps, and scores as English',()=>{
 const en=getQuizzes('en'),zh=getQuizzes('zh');assert.equal(en.length,zh.length);
 en.forEach((q,i)=>{
  const translated=zh[i];assert.equal(q.id,translated.id);assert.equal(q.version,translated.version);
  assert.match(translated.title,/\p{Script=Han}/u);
  for(const [n,question] of q.questions.entries()){
   const other=translated.questions[n];assert.equal(question.id,other.id);assert.match(other.prompt,/\p{Script=Han}/u);
   question.answers.forEach((answer,k)=>{assert.equal(answer.id,other.answers[k].id);assert.equal(answer.profile,other.answers[k].profile);assert.match(other.answers[k].text,/\p{Script=Han}/u);});
  }
  for(let sample=0;sample<8;sample++){
   const answers=q.questions.map((question,n)=>question.answers[(n*sample+sample)%question.answers.length].id);
   assert.deepEqual(scoreQuiz(q,answers),scoreQuiz(translated,answers));
  }
 });
});
test('translated catalog keeps stable filtering keys and Chinese search works',()=>{
 const catalog=getCatalog('zh');assert.equal(filterCatalog(catalog,{mode:'together',players:'pair'}).length,2);
 assert.equal(filterCatalog(catalog,{query:'画画'}).length,2);
 assert.equal(filterCatalog(catalog,{category:'Personality'}).length,1);
 assert.equal(route('zh','/tests/work-style/'),'/tests/work-style/');
 assert.equal(route('en','/tests/work-style/'),'/en/tests/work-style/');
});
test('28 static pages have matching language switches, self canonicals, and reciprocal hreflang',()=>{
 const output=pages();assert.equal(output.length,28);
 for(const p of output){
  assert(p.html.includes(`<html lang="${languageTag(p.locale)}">`));
  assert(p.html.includes(`rel="canonical" href="${origin+p.path}"`));
  for(const locale of locales){
   const path=route(locale,p.basePath);assert(output.some(x=>x.path===path));
   assert(p.html.includes(`rel="alternate" hreflang="${languageTag(locale)}" href="${origin+path}"`));
   assert(p.html.includes(`href="${path}" lang="${languageTag(locale)}"`));
  }
  assert(p.html.includes(`hreflang="x-default" href="${origin+p.basePath}"`));
  const graph=JSON.parse(p.html.match(/type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(graph['@graph'].find(x=>x['@type']==='WebPage').inLanguage,languageTag(p.locale));
 }
});
