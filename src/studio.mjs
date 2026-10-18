import {escapeHtml as e} from './engine.mjs';
import {attachPairExperience,mountAdvanced} from './studio-advanced.mjs';
const locale=document.documentElement.lang.startsWith('zh')?'zh':'en',en=locale==='en',s=(zh,english)=>en?english:zh,hosted=document.body.dataset.runtime==='hosted';
const errorText=error=>({ai_daily_limit:s('今天的 AI 使用次数已达上限，明天再来试试。已有测试仍然可以做。','Today’s AI limit has been reached. Existing quizzes are still available.'),ai_busy:s('AI 暂时繁忙，请稍后重试。','AI is busy. Please try again shortly.'),ai_unavailable:s('暂时未能连接 AI，请重试。','The AI connection failed. Please retry.'),local_test_busy:s('当前账号正在处理另一个请求，请稍后再试。','The account is processing another request. Please try again shortly.'),conversation_expired:s('这段对话已过期，请重新开始。','This conversation expired. Please start again.'),plan_limit:s('当前账号的 Codex 额度暂时不足，请稍后再试。','The signed-in account has reached its Codex usage limit. Try later.'),plan_login_required:s('请先在本机 Codex 登录 ChatGPT。','Sign in to ChatGPT in the local Codex app first.'),plan_network_error:s('连接 AI 服务失败，请稍后重试。','The AI connection failed. Please try again.'),version_changed:s('测试版本已更新，请刷新后重新作答。','This quiz version changed. Refresh and take it again.')})[error.code]||s('这次没有完成，请重试。不会用预设答案冒充 AI 回复。','That did not complete. Please retry. No canned AI response is substituted.');
export async function studioApi(action,input={},signal){
 const response=await fetch('/api/studio/'+action,{method:'POST',headers:{'Content-Type':'application/json',Accept:hosted?'text/event-stream':'application/json'},cache:'no-store',body:JSON.stringify({locale,...input}),signal});
 if(response.headers.get('content-type')?.includes('text/event-stream')){
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',result;
  const line=value=>{if(!value.startsWith('data:'))return;const data=JSON.parse(value.slice(5));if(data.error)throw Object.assign(Error(data.error),{code:data.error});result=data.result;};
  try{for(;;){const p=await reader.read();if(p.done)break;pending+=decoder.decode(p.value,{stream:true});let i;while((i=pending.indexOf('\n'))>=0){line(pending.slice(0,i));pending=pending.slice(i+1);}}pending+=decoder.decode();if(pending.trim())line(pending);if(!result)throw Error('studio_unavailable');return result;}finally{void reader.cancel().catch(()=>{});}
 }
 let data;try{data=await response.json();}catch{throw Object.assign(Error('studio_unavailable'),{code:'studio_unavailable'});}
 if(!response.ok)throw Object.assign(Error(data.error),{code:data.error});return data;
}
const thumbnail=id=>id==='historical-character'?'/assets/ancient.jpg':['bestiescore','skribbl','gartic-phone','communication-style','work-style'].includes(id)?'/assets/friends.jpg':'/assets/garden.webp';
export function offerMarkup(choices,axes){return choices.map((c,i)=>`<article class="studio-offer"><span>${e(axes?.[i]||`${String(i+1).padStart(2,'0')} / ${c.kind==='existing'?s('已有测试或活动','In the library'):s('为你生成','Create for you')}`)}</span><h3>${e(c.title)}</h3><p>${e(c.description)}</p><p class="studio-reason">${e(c.reason)}</p><button type="button" class="button" data-offer-index="${i}">${c.kind==='existing'?s('就选这个','Choose this'):s('生成这个测试','Create this quiz')} ↗</button></article>`).join('');}
const offerBindings=new WeakMap();
export function bindOffers(container,response,status){
 const previous=offerBindings.get(container);if(previous)container.removeEventListener('click',previous);
 const listener=async event=>{
  const button=event.target.closest('[data-offer-index]');if(!button||button.disabled)return;
  const buttons=[...container.querySelectorAll('button')];buttons.forEach(x=>x.disabled=true);
  const originalText=button.textContent;button.textContent=s('正在准备…','Getting it ready…');
  let localStatus=button.parentElement.querySelector('[data-offer-status]');if(!localStatus){localStatus=document.createElement('p');localStatus.dataset.offerStatus='';localStatus.setAttribute('role','status');button.after(localStatus);}
  localStatus.textContent=status.textContent=s('正在准备，生成新测试通常需要 1–3 分钟…','Getting it ready. Creating a new quiz usually takes 1–3 minutes…');
   try{const result=await studioApi('select',{conversationId:response.conversationId,index:Number(button.dataset.offerIndex)});if(result.declined){localStatus.textContent=status.textContent=result.message;return;}location.assign(result.url);}
  catch(error){localStatus.textContent=status.textContent=errorText(error);}finally{buttons.forEach(x=>x.disabled=false);button.textContent=originalText;}
 };offerBindings.set(container,listener);container.addEventListener('click',listener);
}
function mountChooser(){
 const root=document.querySelector('[data-studio-guide]');if(!root)return;
 const form=root.querySelector('form'),input=form.elements.need,status=root.querySelector('[data-studio-status]'),reset=root.querySelector('[data-studio-reset]');
 const conversation=document.querySelector('[data-studio-conversation]'),transcript=conversation.querySelector('[data-studio-transcript]'),question=conversation.querySelector('[data-studio-question]');
 let offers=conversation.querySelector('[data-studio-offers]'),conversationId=null,busy=false,controller=null;
 const toggle=value=>{busy=value;root.setAttribute('aria-busy',String(value));for(const b of root.querySelectorAll('button'))if(b!==reset)b.disabled=value;for(const b of question.querySelectorAll('button,input'))b.disabled=value;form.querySelector('[type=submit]').textContent=value?s('正在想…','Thinking…'):s('帮我找找 ↗','Find my quiz ↗');};
 const bubble=(role,text)=>{const p=document.createElement('p');p.className='studio-message '+role;const name=document.createElement('small');name.textContent=role==='user'?s('你的好奇','YOUR CURIOSITY'):'TEST GARDEN · AI';p.append(name,document.createTextNode(text));transcript.append(p);};
 async function send(message){
  if(busy||!message.trim())return;
  controller=new AbortController();toggle(true);status.textContent=s('AI 正在理解你的想法…','AI is considering your request…');
  conversation.hidden=false;reset.hidden=false;offers.innerHTML='';
  try{
   const response=await studioApi('chat',{message,conversationId,consent:form.elements.consent.checked},controller.signal);
   conversationId=response.conversationId;bubble('user',message);bubble('assistant',response.message);input.value='';question.innerHTML='';
   if(response.action==='ask'){
    question.innerHTML=`<div class="studio-question"><h3 tabindex="-1">${e(response.question)}</h3><div class="studio-question-options">${response.quickOptions.map(x=>`<button type="button" data-answer="${e(x)}">${e(x)}</button>`).join('')}</div><form><input aria-label="${s('补充你的需求','Add your preference')}" required maxlength="800" placeholder="${s('也可以直接说说你的想法…','Or describe your preference…')}"><button class="button" type="submit">${s('继续','Continue')} ↗</button></form></div>`;
    question.querySelector('form').addEventListener('submit',event=>{event.preventDefault();void send(event.target.querySelector('input').value);});question.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>void send(b.dataset.answer)));question.querySelector('h3').focus({preventScroll:true});
   }
   if(response.action==='offer'){
    const fresh=offers.cloneNode(false);offers.replaceWith(fresh);offers=fresh;offers.innerHTML=offerMarkup(response.choices);bindOffers(offers,response,status);
   }
   status.textContent=response.action==='ask'?s(`先确认这一点 · 第 ${response.questionsAsked}/2 个问题`,`One quick detail · Question ${response.questionsAsked}/2`):s('AI 回复已显示在下方。','The AI response is shown below.');
   conversation.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){if(error.name!=='AbortError')status.textContent=errorText(error);}
  finally{toggle(false);}
 }
 form.addEventListener('submit',event=>{event.preventDefault();void send(input.value);});root.querySelectorAll('[data-studio-query]').forEach(b=>b.addEventListener('click',()=>void send(b.dataset.studioQuery)));
 reset.addEventListener('click',()=>{controller?.abort();conversationId=null;transcript.replaceChildren();question.replaceChildren();offers.replaceChildren();conversation.hidden=true;status.textContent='';reset.hidden=true;toggle(false);input.focus();});
 form.elements.consent.addEventListener('change',()=>{if(conversationId)status.textContent=s('保存选项会在下一段新对话生效；可以在页面底部删除已保存记录。','This preference applies to your next conversation. Saved records can be deleted at the bottom of the page.');});
}
async function mountLibrary(root){
 const grid=root.querySelector('[data-studio-library-grid]'),status=root.querySelector('[data-library-status]');let data,sort='week',filter='';
 function draw(){
  const counts=new Map(data.counts.map(x=>[x.id,x]));let list=data.entries.filter(x=>(sort!=='new'||x.generated)&&(!filter||[x.title,x.summary,...x.tags].join(' ').toLowerCase().includes(filter)));
  list.sort((a,b)=>sort==='new'?(b.createdAt||0)-(a.createdAt||0):sort==='all'?0:(counts.get(b.id)?.[sort]||0)-(counts.get(a.id)?.[sort]||0));
  status.textContent=list.length?'':s('还没有符合条件的测试。说说你的想法，让 AI 帮你创建。','No matching quizzes yet. Tell AI what you would like to create.');
  grid.innerHTML=list.map((x,i)=>{const count=counts.get(x.id);return `<article class="studio-library-card"><a href="${e(x.url)}" ${x.type==='external'?'target="_blank" rel="noopener noreferrer"':''}><img src="${thumbnail(x.id)}" alt="" loading="lazy"></a><div><small>${x.type==='external'?s('朋友与外链','WITH FRIENDS · EXTERNAL'):x.generated?s('AI 新作 · 8 道题','AI CREATED · 8 QUESTIONS'):s('花园原创 · 12 道题','GARDEN ORIGINAL · 12 QUESTIONS')}</small><h3><a href="${e(x.url)}" ${x.type==='external'?'target="_blank" rel="noopener noreferrer"':''}>${e(x.title)}</a></h3><p>${e(x.summary)}</p><div class="studio-card-foot"><span>${x.type==='external'?s('站外活动 · 未统计完成','External · completion not tracked'):s(`${count?.[sort==='week'?'week':'total']||0} 人完成${sort==='week'?' · 近7天':''}`,`${count?.[sort==='week'?'week':'total']||0} completions${sort==='week'?' · 7 days':''}`)}</span><a href="${e(x.url)}" ${x.type==='external'?'target="_blank" rel="noopener noreferrer"':''}>${s('开始探索','Explore')} ↗</a></div></div></article>`;}).join('');
 }
 try{data=await studioApi('catalog');draw();}catch{status.textContent=hosted?s('测试库暂时无法打开，请刷新重试。','The library is temporarily unavailable. Refresh to retry.'):s('测试库需要本地内部测试服务。请用 npm run start:plan 启动。','The library requires the internal local test server (npm run start:plan).');return;}
 root.querySelectorAll('[data-studio-sort]').forEach(b=>b.addEventListener('click',()=>{sort=b.dataset.studioSort;root.querySelectorAll('[data-studio-sort]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();}));
 root.querySelector('[data-studio-filter]').addEventListener('input',event=>{filter=event.target.value.trim().toLowerCase();draw();});
}
export function recordQuizStart(quiz){sessionStorage.setItem('garden-start-'+quiz.id,String(Date.now()));void studioApi('start',{quizId:quiz.id,version:quiz.version,comparisonToken:new URLSearchParams(location.search).get('compare')||undefined}).catch(()=>{});}
export function quizShareUrl(quiz,result,includeResult=false){
 const path=quiz.generated?`/created/${quiz.id}/`:`/tests/${quiz.id}/`,url=new URL((en?'/en':'')+path,location.origin);url.searchParams.set('v',quiz.version);
 if(includeResult&&result)url.hash='result='+encodeURIComponent(result.leaders.join(','))+'&version='+encodeURIComponent(quiz.version);return url.href;
}
export function qrSvgMarkup(url){
 if(!window.qrcode)return '';const qr=window.qrcode(0,'M');qr.addData(url);qr.make();return qr.createSvgTag({cellSize:2,margin:8,scalable:true});
}
function qrCanvas(url){const qr=window.qrcode?.(0,'M');if(!qr)return null;qr.addData(url);qr.make();const n=qr.getModuleCount(),canvas=document.createElement('canvas');canvas.width=canvas.height=(n+8)*4;canvas.className='studio-qr';const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#3c2d54';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))c.fillRect((x+4)*4,(y+4)*4,4,4);return canvas;}
export function attachResultExperience({stage,quiz,result,answers,locale,saveCard}){
 stage.querySelector('.result-actions')?.remove();
 // Replace the old arbitrary next-quiz link with a reasoned three-way continuation.
 for(const section of stage.querySelectorAll('.result-detail'))if(section.querySelector('a[href*="/tests/"]'))section.remove();
 const section=document.createElement('section');section.className='studio-share';section.innerHTML=`<h3>${s('把这次遇见，分享出去。','Share this little discovery.')}</h3><p>${s('朋友点开链接就能做同一个测试。默认只分享测试入口。','Friends can open the link and take the same quiz. By default, only the quiz is shared.')}</p><label><input type="checkbox" data-share-result>${s('在邀请里附上我的结果摘要（不含答案）','Include my result summary in the invitation (no answers)')}</label><div class="studio-share-actions"><button class="button" data-share-native>${s('分享给朋友','Share with a friend')}</button><button class="button light" data-share-copy>${s('复制邀请链接','Copy invitation link')}</button><button class="button light" data-share-card>${s('保存结果卡','Save result card')}</button></div><input class="studio-link" readonly aria-label="${s('邀请链接','Invitation link')}"><div class="studio-share-bottom"><div data-share-qr></div><p>${hosted?s('扫码即可打开同一个测试。朋友也可以通过上方链接直接测试。','Scan or share the link to take the same quiz.'):s('扫码也能直接测。内部测试链接仅限当前电脑访问，公开分享需上线后使用。','Scan to take the quiz. Internal-test links work on this computer; public sharing needs a hosted version.')}</p></div><p role="status" data-share-status></p>`;
 stage.querySelector('.result-panel').append(section);
 attachPairExperience({stage,quiz,result,answers});
 const check=section.querySelector('[data-share-result]'),field=section.querySelector('.studio-link'),message=section.querySelector('[data-share-status]'),qrHolder=section.querySelector('[data-share-qr]');
 function update(){field.value=quizShareUrl(quiz,result,check.checked);qrHolder.replaceChildren();const qr=qrCanvas(field.value);if(qr)qrHolder.append(qr);}
 update();check.addEventListener('change',update);section.querySelector('[data-share-card]').addEventListener('click',saveCard);
 async function copy(){try{await navigator.clipboard.writeText(field.value);message.textContent=s('已复制，发给朋友就可以。','Copied. Send it to a friend.');}catch{field.focus();field.select();message.textContent=s('请复制上方链接。','Copy the link above.');}}
 section.querySelector('[data-share-copy]').addEventListener('click',copy);
 const textButton=document.createElement('button');textButton.type='button';textButton.className='button light';textButton.dataset.action='save-text';textButton.textContent=s('保存文字','Save text');section.querySelector('.studio-share-actions').append(textButton);
 section.querySelector('[data-share-native]').addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title:quiz.title,text:check.checked?result.leaders.map(k=>quiz.profiles[k].name).join(' + '):s('一起来测测？','Want to try this quiz?'),url:field.value});}catch(error){if(error.name!=='AbortError')await copy();}}else await copy();});
 const feedback=document.createElement('div');feedback.className='studio-feedback';feedback.innerHTML=[['fits',s('挺像我','Feels like me')],['misses',s('不太像','Not quite')],['fun',s('只是好玩','Just for fun')]].map(([value,text])=>`<button data-feedback="${value}" aria-pressed="false">${text}</button>`).join('');section.after(feedback);
 feedback.addEventListener('click',async event=>{const b=event.target.closest('[data-feedback]');if(!b)return;try{await studioApi('feedback',{quizId:quiz.id,value:b.dataset.feedback});feedback.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));let refresh=stage.querySelector('[data-refresh-personalized]');if(!refresh){refresh=document.createElement('button');refresh.type='button';refresh.className='quiet-button';refresh.dataset.refreshPersonalized='';refresh.textContent=s('按这条反馈更新推荐','Update recommendations with this feedback');feedback.after(refresh);refresh.addEventListener('click',async()=>{refresh.disabled=true;await continuation();refresh.disabled=false;});}}catch(error){message.textContent=errorText(error);}});
 const related=document.createElement('section');related.className='studio-related';related.innerHTML=`<h3>${s('故事还没结束，接下来探索哪一面？','The story continues. Which side will you explore?')}</h3><p data-related-status role="status">${s('AI 正在寻找：深入一点、换个角度、和朋友玩…','AI is finding: a deeper facet, a different angle, and something with friends…')}</p><div class="studio-three"></div>`;feedback.after(related);
 const relatedStatus=related.querySelector('[data-related-status]');
 async function continuation(){
  try{const response=await studioApi('related',{quizId:quiz.id,leaders:result.leaders});related.querySelector('.studio-three').innerHTML=offerMarkup(response.choices,response.axes);bindOffers(related.querySelector('.studio-three'),response,relatedStatus);relatedStatus.textContent=response.message+(response.personalized?s(` 已参考 ${response.personalized.completedSkipped} 项已完成记录、${response.personalized.feedbackUsed} 条反馈。`,` Considered ${response.personalized.completedSkipped} completed quizzes and ${response.personalized.feedbackUsed} feedback entries.`):'');}
  catch(error){relatedStatus.textContent=errorText(error);const retry=document.createElement('button');retry.className='quiet-button';retry.textContent=s('重试关联推荐','Retry recommendations');retry.addEventListener('click',()=>{retry.remove();relatedStatus.textContent=s('正在寻找…','Finding your next quiz…');void continuation();});related.append(retry);}
 }
 async function finish(){try{const comparisonToken=new URLSearchParams(location.search).get('compare')||undefined;await studioApi('complete',{quizId:quiz.id,version:quiz.version,answers,comparisonToken});if(comparisonToken){relatedStatus.textContent=s('提交双人结果后，可在对比页获得结合双方故事的下一步推荐。','After submitting your comparison result, find recommendations for both stories on the comparison page.');}else await continuation();}catch(error){relatedStatus.textContent=errorText(error);const retry=document.createElement('button');retry.className='quiet-button';retry.textContent=s('重试完成与推荐','Retry completion and recommendations');retry.addEventListener('click',()=>{retry.remove();void finish();});related.append(retry);}}
 void finish();
}
function mountInvitation(){
 const root=document.querySelector('[data-quiz]');if(!root)return;
 const data=new URLSearchParams(location.hash.slice(1)),keys=data.get('result')?.split(',');if(!keys)return;
 const generated=JSON.parse(document.querySelector('#generated-quiz')?.textContent||'[]');
 import('./i18n/content.mjs').then(({getQuizzes})=>{
  const quiz=[...getQuizzes(locale),...generated].find(q=>q.id===root.dataset.quiz);if(!quiz||quiz.version!==data.get('version')||!keys.length||keys.length>4||new Set(keys).size!==keys.length||keys.some(k=>!quiz.profiles[k]))return;
  const aside=document.createElement('aside');aside.className='studio-invite';aside.innerHTML=`<b>${s('朋友邀请你来测一测','A friend invited you to try this')}</b>${s('朋友分享的结果是：','Their shared story result: ')}${e(keys.map(k=>quiz.profiles[k].name).join(' + '))}<br>${s('这是对方的趣味结果。轮到你了，独立答题看看自己的故事。','That is their story result. Answer independently to discover yours.')}`;root.before(aside);
 });
}
document.querySelector('[data-view-history]')?.addEventListener('click',async()=>{const target=document.querySelector('[data-history]');try{const data=await studioApi('history');if(!data.research){target.textContent=s('还没有保存的需求记录。','No saved request records yet.');return;}target.innerHTML=data.research.map((item,i)=>`<article class="studio-history-entry"><h4>${s('需求记录','Saved request')} ${i+1}</h4><p>${e(new Date(item.updatedAt).toLocaleString(en?'en-US':'zh-CN'))}</p>${item.turns.map(turn=>`<p><strong>${turn.role==='user'?s('你：','You: '):'AI: '}</strong>${e(turn.text)}${turn.question?'<br>'+e(turn.question):''}</p>`).join('')}<p><strong>${s('给你的三个方向','Your three options')}</strong></p><ol>${item.choices.map(choice=>`<li>${e(choice.title)}</li>`).join('')}</ol><p><strong>${s('最终选择：','Your choice: ')}</strong>${e(item.selected?item.choices[item.selected.index]?.title||s('已选择','Selected'):s('尚未选择','Not selected yet'))}</p></article>`).join('');}catch(error){target.textContent=errorText(error);}});
document.querySelector('[data-forget]')?.addEventListener('click',async()=>{const target=document.querySelector('[data-history]');try{await studioApi('forget');target.textContent=s('已删除本浏览器关联的需求、完成记录和反馈。相关双人邀请也已移除；已生成的通用测试仍保留在测试库。','Deleted this browser’s requests, completion records and feedback. Related comparison invitations were also removed. General created quizzes remain in the library.');}catch(error){target.textContent=errorText(error);}});
mountChooser();document.querySelectorAll('[data-studio-library]').forEach(root=>void mountLibrary(root));mountInvitation();mountAdvanced();
