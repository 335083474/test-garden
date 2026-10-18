import {getQuizzes,getCatalog} from './i18n/content.mjs';
import {text,route,languageTag,locales,defaultLocale} from './i18n/ui.mjs';
const locale=locales.find(key=>languageTag(key)===document.documentElement.lang)||defaultLocale;
const t=(key,vars)=>text(locale,key,vars),r=path=>route(locale,path);
const quizzes=[...JSON.parse(document.querySelector('#generated-quiz')?.textContent||'[]'),...getQuizzes(locale)],catalog=getCatalog(locale);
const titleFor=(quiz,result)=>result.leaders.length>2?t('mixedTitle'):resultTitle(quiz,result);
import {scoreQuiz,resultTitle,filterCatalog,escapeHtml as e} from './engine.mjs';
import {art} from './art.mjs';
import {recommendTests} from './recommender.mjs';
import {guideCopy} from './i18n/guide.mjs';
import {attachResultExperience,recordQuizStart,qrSvgMarkup,quizShareUrl} from './studio.mjs';

for(const root of document.querySelectorAll('[data-test-guide]')){
 const copy=guideCopy[locale],form=root.querySelector('form'),input=form.elements.need,scope=form.elements.scope;
 const status=root.querySelector('[role="status"]'),results=root.querySelector('[data-guide-results]'),followup=root.querySelector('[data-guide-followup]'),submit=form.querySelector('[type="submit"]');
 let mode='all',hasSearched=false,sequence=0,pending=null;
 const clear=()=>{for(const card of results.children)card.hidden=true;results.hidden=true;followup.hidden=true;};
 const busy=value=>{root.setAttribute('aria-busy',String(value));submit.disabled=value;submit.textContent=value?copy.loading:copy.submit;if(!value){const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=' →';submit.append(icon);}};
 const cancel=()=>{sequence++;pending?.abort();pending=null;busy(false);};
 const paint=(response,prefix='')=>{
  status.textContent=(prefix?prefix+' ':'')+(response.status==='results'?copy.results.replace('{count}',response.picks.length):copy[response.status]);
  followup.hidden=response.status!=='clarify';
  for(const pick of response.picks){
   const card=[...results.children].find(node=>node.dataset.guidePick===pick.id);
   if(!card)continue;
   card.querySelector('[data-guide-reason]').textContent=copy.reasons[pick.reason]||copy.reasons.keyword;
   card.hidden=false;results.append(card);
  }
  results.hidden=response.picks.length===0;
  for(const button of followup.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.guideMode===mode));
 };
 const search=async()=>{
  cancel();hasSearched=true;clear();
  const query=input.value.trim(),requestedScope=scope.value,requestedMode=mode,version=sequence;
  if(!query){paint({status:'blank',picks:[]});return;}
  busy(true);status.textContent=copy.loading;
  const controller=new AbortController();pending=controller;const timeout=setTimeout(()=>controller.abort(),25000);
  try{
   const result=await fetch('/api/recommend',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({query,locale,scope:requestedScope,mode:requestedMode}),signal:controller.signal});
   const response=await result.json();if(version!==sequence)return;
   if(!result.ok){const error=new Error('ai_unavailable');error.code=response.error;throw error;}
   if(!['ai','catalog'].includes(response.source)||!['results','empty','clarify','unsupported','scopeConflict'].includes(response.status)||!Array.isArray(response.picks)||response.picks.length>3)throw Error('invalid_response');
   const ids=new Set();
   for(const pick of response.picks){
    const entry=catalog.find(x=>x.id===pick.id);
    if(!entry||ids.has(pick.id)||!copy.reasons[pick.reason]||(requestedScope!=='all'&&entry.type!==requestedScope)||(requestedMode!=='all'&&(entry.mode!==requestedMode||requestedMode==='together'&&entry.timing==='shared')))throw Error('invalid_response');
    ids.add(pick.id);
   }
   if((response.status==='results')!==(response.picks.length>0))throw Error('invalid_response');
   paint(response,response.source==='ai'?copy.aiResult:copy.catalogResult);
  }catch(error){
   if(version!==sequence)return;
   paint(recommendTests(catalog,query,{scope:requestedScope,mode:requestedMode}),error.code==='ai_not_configured'?copy.aiPending:copy.fallback);
  }finally{clearTimeout(timeout);if(version===sequence){pending=null;busy(false);}}
 };
 form.addEventListener('submit',event=>{event.preventDefault();mode='all';void search();});
 root.addEventListener('click',event=>{
  const shortcut=event.target.closest('[data-guide-query]'),choice=event.target.closest('[data-guide-mode]');
  if(shortcut){input.value=shortcut.dataset.guideQuery;mode='all';void search();}
  if(choice){mode=choice.dataset.guideMode;void search();}
 });
 input.addEventListener('input',()=>{cancel();mode='all';hasSearched=false;clear();status.textContent=copy.initial;});
 scope.addEventListener('change',()=>{if(hasSearched){mode='all';void search();}});
 root.querySelector('[data-guide-reset]').addEventListener('click',()=>{cancel();form.reset();mode='all';hasSearched=false;clear();status.textContent=copy.initial;input.focus();});
}

for(const container of document.querySelectorAll('[data-catalog]')){
 const entries=container.dataset.catalog==='native'?catalog.filter(x=>x.type==='native'):catalog;
 const state={category:'All',query:'',mode:'all',players:'all'};
 const update=()=>{
  const selected=filterCatalog(entries,state),ids=new Set(selected.map(x=>x.id));
  for(const card of container.querySelectorAll('[data-entry-id]'))card.hidden=!ids.has(card.dataset.entryId);
  container.querySelector('[data-result-count]').textContent=t(container.dataset.catalog==='friends'?'friendsCount':'resultsCount',{count:selected.length});
  let empty=container.querySelector('[data-empty]');
  if(!empty){empty=document.createElement('p');empty.className='empty-state';empty.dataset.empty='';empty.textContent=t('empty');container.querySelector('[data-catalog-grid]').append(empty);}
  empty.hidden=selected.length>0;
 };
 container.addEventListener('click',event=>{
  const button=event.target.closest('button[data-category],button[data-mode]');if(!button)return;
  const key=button.dataset.category!==undefined?'category':'mode';state[key]=button.dataset[key];
  for(const sibling of container.querySelectorAll(`button[data-${key}]`))sibling.setAttribute('aria-pressed',String(sibling===button));
  update();
 });
 container.querySelector('[data-search]')?.addEventListener('input',event=>{state.query=event.target.value;update();});
 container.querySelector('[data-players]')?.addEventListener('change',event=>{state.players=event.target.value;update();});
}

for(const root of document.querySelectorAll('[data-quiz]')){
 const quiz=quizzes.find(q=>q.id===root.dataset.quiz);if(!quiz)continue;
 const stage=root.querySelector('[data-quiz-stage]');
 const intro=stage.innerHTML;
 let answers=Array(quiz.questions.length).fill(null),index=0,result=null;
 const focus=()=>{stage.querySelector('[data-focus]')?.focus({preventScroll:true});root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
 function renderQuestion(){
  const q=quiz.questions[index];
  stage.innerHTML=`<form class="question-panel"><div class="quiz-topline"><span>${e(quiz.title)}</span><span>${t('questionProgress',{current:index+1,total:quiz.questions.length})}</span></div><div class="quiz-progress" role="progressbar" aria-label="${t('progressLabel')}" aria-valuemin="0" aria-valuemax="${quiz.questions.length}" aria-valuenow="${index}"><span style="width:${index/quiz.questions.length*100}%"></span></div><fieldset><legend tabindex="-1" data-focus>${e(q.prompt)}</legend>${q.answers.map(a=>`<label class="choice"><input type="radio" name="answer" value="${e(a.id)}" ${answers[index]===a.id?'checked':''} required><span>${e(a.text)}</span></label>`).join('')}</fieldset><div class="quiz-controls"><button type="button" class="quiet-button" data-action="back">${t(index?'previous':'backIntro')}</button><button type="submit" class="button" ${answers[index]?'':'disabled'}>${t(index===quiz.questions.length-1?'seeResult':'next')} <span aria-hidden="true">→</span></button></div></form>`;
  focus();
 }
 function resultText(){
  const descriptions=result.leaders.map(k=>quiz.profiles[k]);
  return `${quiz.title}\n${titleFor(quiz,result)}${result.isMixed?t('mixedSuffix'):''}\n\n${descriptions.map(p=>p.summary).join('\n\n')}\n\n${t('yourChoices')}:\n${Object.entries(result.counts).map(([k,v])=>`${quiz.profiles[k].name}: ${v}/${result.total} (${result.percentages[k]}%)`).join('\n')}\n\n${t('tryThis')}:\n${descriptions.map(p=>p.practice).join('\n')}\n\n${quiz.fictionNote||t('summaryNote')}\n${t('version')}: ${quiz.version} · ${languageTag(locale)}\n${location.origin}${r(`/tests/${quiz.id}/`)}`;
 }
 function renderResult(){
  result=scoreQuiz(quiz,answers);
  const leaders=result.leaders.map(k=>quiz.profiles[k]);
  const artwork=(quiz.resultArt||quiz.id==='animal-personality')?(result.isMixed?'friends':result.leaders[0]):quiz.art;
  stage.innerHTML=`<article class="result-panel">${quiz.fictionNote?`<p class="note fiction-note">${e(quiz.fictionNote)}</p>`:''}<div class="result-hero ${quiz.color}"><div class="eyebrow" style="justify-content:center">${t(result.isMixed?'mixedResult':'yourResult')}</div>${art(artwork)}<h2 tabindex="-1" data-focus>${e(titleFor(quiz,result))}</h2><p>${e(result.isMixed?t('mixedSubtitle'):leaders[0].tagline)}</p></div><p class="result-description">${leaders.map(p=>e(p.summary)).join('<br><br>')}</p><div class="result-detail"><section><h3>${t(quiz.kind==='entertainment'?'funStrengths':'strengths')}</h3><ul>${[...new Set(leaders.flatMap(p=>p.strengths))].map(s=>`<li>${e(s)}</li>`).join('')}</ul></section><section><h3>${t(quiz.kind==='entertainment'?'funStretch':'stretch')}</h3>${leaders.map(p=>`<p>${e(p.stretch)}</p>`).join('')}</section></div><div class="note"><strong>${t(quiz.kind==='entertainment'?'funPractice':'practice')}</strong><br>${leaders.map(p=>e(p.practice)).join('<br>')}</div><section class="breakdown"><h3>${t('mixHeading',{count:result.total})}</h3>${Object.entries(result.counts).map(([k,v])=>`<div class="score-row"><div class="score-label"><span>${e(quiz.profiles[k].name)}</span><span>${v} / ${result.total} · ${result.percentages[k]}%</span></div><div class="score-track" role="img" aria-label="${e(t('scoreAria',{name:quiz.profiles[k].name,count:v,total:result.total}))}"><span style="width:${v/result.total*100}%"></span></div></div>`).join('')}<p class="score-note">${t('scoreNote')} ${result.isMixed?t('tieNote'):''}${e(quiz.fictionNote||t('assessmentNote'))} <a href="${r('/methodology/')}">${t('aboutScoring')}</a>.</p></section><section class="result-detail"><div><h3>${t('startConversation')}</h3><p>${e(leaders[0].conversation)}</p><a class="text-link" href="${r('/quizzes/friends/')}">${t('tryFriendAction')}</a></div><div><h3>${t('keepExploring')}</h3><p>${t('differentQuiz')}</p><a class="text-link" href="${r(`/tests/${quizzes.find(q=>q.id!==quiz.id).id}/`)}">${e(quizzes.find(q=>q.id!==quiz.id).title)} ↗</a></div></section><div class="result-actions"><button type="button" class="button small" data-action="save-card">${t('saveCard')}</button><button type="button" class="button light small" data-action="save-text">${t('saveText')}</button><button type="button" class="button light small" data-action="copy-link">${t('copyLink')}</button></div><p class="status-message" role="status" data-status></p><button type="button" class="quiet-button" data-action="restart">${t('restart')}</button><p class="score-note">${t('versionNote',{version:quiz.version})}</p></article>`;
  attachResultExperience({stage,quiz,result,answers,locale,saveCard});
  focus();
 }
 const message=text=>{stage.querySelector('[data-status]').textContent=text;};
 const download=(blob,name)=>{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);};
 async function saveCard(){
  const name=titleFor(quiz,result),leaders=result.leaders.map(k=>quiz.profiles[k]);
  const shape=art((quiz.resultArt||quiz.id==='animal-personality')&&!result.isMixed?result.leaders[0]:quiz.art).replace('<svg ','<svg x="190" y="100" width="420" height="294" ');
  const labels=Object.entries(result.counts).map(([k,v],i)=>`<text x="85" y="${540+i*43}" font-family="Microsoft YaHei, Arial, sans-serif" font-size="19" fill="#405b45">${e(quiz.profiles[k].name)} <tspan x="695" text-anchor="end">${v}/${result.total}</tspan></text><rect x="85" y="${550+i*43}" width="610" height="5" rx="3" fill="#dce4cc"/><rect x="85" y="${550+i*43}" width="${610*v/result.total}" height="5" rx="3" fill="#86996c"/>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="850" viewBox="0 0 800 850"><rect width="800" height="850" rx="30" fill="#f8f7ef"/><rect x="34" y="34" width="732" height="782" rx="22" fill="${({rose:'#f2dfd6',sage:'#dce6d6',butter:'#eee8ba',lilac:'#eee8f7'})[quiz.color]}"/><text x="400" y="85" text-anchor="middle" font-size="22" font-family="Microsoft YaHei, Georgia, serif" fill="#193e31">${t('brand')}.</text>${shape}<text x="400" y="425" text-anchor="middle" font-size="${Math.min(45,Math.floor(620/(name.length*(locale==='zh'?1:.58))))}" font-family="Microsoft YaHei, Georgia, serif" fill="#193e31">${e(name)}</text><text x="400" y="470" text-anchor="middle" font-size="18" font-family="Microsoft YaHei, Arial, sans-serif" fill="#405b45">${e(result.isMixed?t('cardMixed'):leaders[0].tagline)}</text>${labels}<text x="400" y="756" text-anchor="middle" font-size="14" font-family="Microsoft YaHei, Arial, sans-serif" fill="#405b45">${quiz.kind==='entertainment'?(locale==='zh'?'纯属虚构娱乐 · 不是前世证据或历史人格鉴定':'Fictional entertainment · not a real past life or historical assessment'):t('cardNote')}</text><text x="400" y="783" text-anchor="middle" font-size="13" font-family="Microsoft YaHei, Arial, sans-serif" fill="#405b45">${e(quiz.title)} · v${e(quiz.version)}</text></svg>`;
  const qr=qrSvgMarkup(quizShareUrl(quiz,result,Boolean(stage.querySelector('[data-share-result]')?.checked)));
  const withQr=svg.replace(/<\/svg>$/,'<rect x="612" y="36" width="148" height="150" rx="12" fill="white"/>'+qr.replace('<svg ','<svg x="623" y="45" width="125" height="125" ')+'</svg>');
  const vector=new Blob([withQr],{type:'image/svg+xml'}),url=URL.createObjectURL(vector);
  try{
   const image=new Image();
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
   const canvas=document.createElement('canvas');canvas.width=800;canvas.height=850;
   canvas.getContext('2d').drawImage(image,0,0);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!png)throw new Error('Image export unavailable');
   download(png,`test-garden-${quiz.id}-${locale}-result.png`);
   message(t('pngReady'));
  }catch{
   download(vector,`test-garden-${quiz.id}-${locale}-result.svg`);
   message(t('svgReady'));
  }finally{URL.revokeObjectURL(url);}
 }
 root.addEventListener('change',event=>{if(event.target.matches('input[name=answer]')){answers[index]=event.target.value;stage.querySelector('button[type=submit]').disabled=false;}});
 root.addEventListener('submit',event=>{event.preventDefault();if(!answers[index])return;if(index<quiz.questions.length-1){index++;renderQuestion();}else renderResult();});
 root.addEventListener('click',async event=>{
  const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(action==='start'||action==='restart'){recordQuizStart(quiz);answers=Array(quiz.questions.length).fill(null);index=0;result=null;renderQuestion();}
  if(action==='back'){if(index){index--;renderQuestion();}else{stage.innerHTML=intro;focus();}}
  if(action==='save-card'&&result)await saveCard();
  if(action==='save-text'&&result){download(new Blob([resultText()],{type:'text/plain;charset=utf-8'}),`test-garden-${quiz.id}-${locale}-result.txt`);message(t('textReady'));}
  if(action==='copy-link'&&result){
   const url=`${location.origin}${r(`/tests/${quiz.id}/`)}`;
   try{await navigator.clipboard.writeText(url);message(t('copied'));}
   catch{message(t('copyFallback'));let field=stage.querySelector('[data-copy-fallback]');if(!field){field=document.createElement('input');field.readOnly=true;field.className='copy-fallback';field.dataset.copyFallback='';field.setAttribute('aria-label',t('publicLink'));stage.querySelector('[data-status]').after(field);}field.value=url;field.focus();field.select();}
  }
 });
}
