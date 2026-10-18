import {cloudMode,sitePath} from './site-path.mjs';
import {cloudApi} from './cloud-client.mjs';
import {escapeHtml as e} from './engine.mjs';
export async function prepareCloudQuiz(){
 if(!cloudMode())return;
 const search=new URLSearchParams(location.search),en=document.documentElement.lang==='en',s=(zh,english)=>en?english:zh;
 for(const a of document.querySelectorAll('.language-switch a')){const url=new URL(a.href);url.search=location.search;url.hash=location.hash;a.href=url.href;}
 const dynamic=document.querySelector('[data-cloud-quiz]'),root=dynamic||search.has('compare')&&document.querySelector('[data-quiz]');if(!root)return;
 const nativeId=root.dataset.quiz;delete root.dataset.quiz;
 try{
  const quizId=dynamic?search.get('id'):nativeId,comparisonToken=search.get('compare');
  if(dynamic&&!/^ai-[a-f0-9]{16}$/.test(quizId||''))throw Error('not_found');
  const {quiz:q}=await cloudApi('quiz',{quizId,comparisonToken});
  const script=document.createElement('script');script.type='application/json';script.id='generated-quiz';script.textContent=JSON.stringify([q]);document.head.append(script);
  document.title=q.title+' | Test Garden';
  const heading=document.querySelector('[data-created-heading]');if(heading)heading.innerHTML=`<div class="eyebrow">${s('AI 新作 · 趣味探索','AI CREATED · FOR REFLECTION')}</div><h1>${e(q.title)}</h1><p>${e(q.description)}</p><p class="note">${s('AI 生成，尚未经过编辑审核。仅供娱乐与自我探索。','AI-generated and not editorially reviewed. For entertainment and reflection only.')}</p>`;
  root.dataset.quiz=q.id;root.setAttribute('aria-label',q.title);
  root.innerHTML=`<div data-quiz-stage><div class="start-panel"><div>${q.fictionNote?`<p class="note fiction-note">${e(q.fictionNote)}</p>`:''}<h2>${s('准备好遇见另一个自己了吗？','Ready to meet another side of you?')}</h2><p>${q.questions.length} ${s('道题 · 完整结果免费 · 不限时','questions · Full result free · Untimed')}</p></div><button type="button" class="button" data-action="start">${s('开始测试','Start the quiz')} →</button></div><p class="note">${s('原始答案发送到本站后端校验后丢弃，不持久保存。','Raw answers are validated by the site backend and then discarded, not stored.')}</p></div>`;
 }catch(error){root.innerHTML=`<div class="start-panel"><div><h2>${s('暂时无法打开这项测试','This quiz could not be opened')}</h2><p>${s('请确认链接完整，或重新打开再试。过期的双人邀请无法继续使用。','Check that the link is complete, or reopen it to retry. Expired comparison invitations cannot be used.')}</p><a class="button" href="${sitePath(en?'/en/':'/')}">${s('返回首页','Return home')}</a></div></div>`;}
}
