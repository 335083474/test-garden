import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendTests} from '../src/recommender.mjs';
import {getCatalog} from '../src/i18n/content.mjs';
import {guideCopy} from '../src/i18n/guide.mjs';
import {pages} from '../src/render.mjs';
const ids=response=>response.picks.map(p=>p.id);

test('Chinese and English needs return the same existing entries in either display language',()=>{
 for(const locale of ['zh','en']){
  const entries=getCatalog(locale);
  assert.deepEqual(ids(recommendTests(entries,'想了解我的沟通方式')),['communication-style']);
  for(const [zh,en,id] of [['想了解沟通方式','understand my communication style','communication-style'],['动物性格测试','animal personality quiz','animal-personality'],['了解工作协作偏好','explore my work style','work-style'],['谁最了解我','who knows me best','bestiescore'],['前世是什么动物','what animal was I in a past life','past-life-animal'],['我是哪位古人','which ancient Chinese character am I','historical-character']]){
   assert.equal(ids(recommendTests(entries,zh))[0],id);assert.equal(ids(recommendTests(entries,en))[0],id);
  }
 }
});
test('friend shortcut clarifies the play mode, then distinguishes original quizzes from live activities',()=>{
 const entries=getCatalog('zh'),query='想和朋友一起玩';
 assert.equal(recommendTests(entries,query).status,'clarify');
 const comparison=recommendTests(entries,query,{mode:'compare'});
 assert.equal(comparison.picks.length,3);
 assert(comparison.picks.every(p=>entries.find(x=>x.id===p.id).type==='native'));
 assert.deepEqual(new Set(ids(recommendTests(entries,'想和朋友做有趣的测试',{mode:'compare'}))),new Set(['past-life-animal','historical-character']));
 assert.deepEqual(new Set(ids(recommendTests(entries,query,{mode:'together'}))),new Set(['skribbl','gartic-phone']));
 assert.deepEqual(ids(recommendTests(entries,'两个人实时一起画画')),['skribbl']);
 assert.deepEqual(ids(recommendTests(entries,'想和朋友一起画画猜词')),['skribbl','gartic-phone']);
});
test('scope, exclusions, no-match and unavailable instruments never produce invented or contradictory picks',()=>{
 const entries=getCatalog('en');
 assert.equal(recommendTests(entries,'').status,'blank');
 assert.equal(recommendTests(entries,'the weather on Mars').status,'empty');
 assert.equal(recommendTests(entries,'personality diagnosis for depression').status,'unsupported');
 assert.equal(recommendTests(entries,'职业匹配测试').status,'unsupported');
 assert.equal(recommendTests(entries,'work quiz',{scope:'external'}).status,'empty');
 assert.equal(recommendTests(entries,'external drawing',{scope:'native'}).status,'scopeConflict');
 assert.equal(recommendTests(entries,'work quiz on this site only').picks[0].id,'work-style');
 assert.equal(recommendTests(entries,'not a work quiz, animal personality').picks.some(p=>p.id==='work-style'),false);
 assert.equal(recommendTests(entries,'和朋友实时一起玩，不想画画').picks.some(p=>['skribbl','gartic-phone'].includes(p.id)),false);
 assert.equal(recommendTests(entries,'network infrastructure').status,'empty');
 assert.equal(recommendTests(entries,'draw alone').status,'empty');
 for(const query of ['friends live','personality work communication','<img src=x onerror=alert(1)>','动物性格',...guideCopy.en.chips.map(x=>x[2])]){
  const response=recommendTests(entries,query);assert(response.picks.length<=3);
  response.picks.forEach(p=>{assert(entries.some(entry=>entry.id===p.id));assert(guideCopy.en.reasons[p.reason]);assert(guideCopy.zh.reasons[p.reason]);});
 }
});
test('new directory entries can opt into discovery without changing the matching engine',()=>{
 const entries=[...getCatalog('en'),{id:'new-reflection',type:'external',title:'A new reflection',tags:['Reflection'],mode:'compare',players:'Solo',discovery:{topics:[],keywords:['自我回顾','self reflection']}}];
 for(const query of ['自我回顾','self reflection'])assert.deepEqual(ids(recommendTests(entries,query)),['new-reflection']);
});
test('character-world homepage has bilingual chooser, transcript, local library and consent controls',()=>{
 for(const locale of ['zh','en']){
  const home=pages().find(p=>p.basePath==='/'&&p.locale===locale).html;
  assert(home.includes('id="find-test"'));assert(home.includes('data-studio-form'));
  assert(home.includes('maxlength="800"'));assert(home.includes('data-studio-transcript'));
  assert(home.includes('data-studio-offers'));assert(home.includes('data-studio-question'));
  assert(home.includes('name="consent"'));assert(!home.includes('name="consent" checked'));
  assert(home.includes('data-studio-library'));assert(home.includes('/assets/garden.webp'));
  assert(home.includes(locale==='zh'?'href="/explore/"':'href="/en/explore/"'));
 }
});
