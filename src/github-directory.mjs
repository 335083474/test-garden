import {getCatalog,getQuizzes} from './i18n/content.mjs';
import {recommendTests} from './recommender.mjs';
import {scoreQuiz} from './engine.mjs';
import {sitePath} from './site-path.mjs';

export function createDirectoryAdapter({storage,locale='zh',prefix='/test-garden',now=()=>Date.now()}){
 const key='garden-github-device-v1',offers=new Map(),en=locale==='en',s=(zh,english)=>en?english:zh;
 const entries=getCatalog(locale).map(x=>({...x,url:x.type==='native'?sitePath((en?'/en':'')+x.url,prefix):x.url}));
 const read=()=>{try{const d=JSON.parse(storage.getItem(key)||'{}');return{completed:Array.isArray(d.completed)?d.completed:[],feedback:d.feedback&&typeof d.feedback==='object'?d.feedback:{}};}catch{return{completed:[],feedback:{}};}};
 const write=data=>storage.setItem(key,JSON.stringify(data));
 const makeOffer=(ids,message,axes)=>{const choices=ids.map(id=>entries.find(e=>e.id===id)).filter(Boolean).slice(0,3).map(e=>({kind:'existing',id:e.id,title:e.title,description:e.summary,reason:s('目录中已有的测试或活动。','An existing quiz or activity in this directory.')}));const conversationId='directory-'+Math.random().toString(36).slice(2);offers.set(conversationId,choices);return{action:'offer',conversationId,message,choices,axes,source:'directory'};};
 return async function handle(action,input={}){
  if(action==='catalog'){const data=read();return{entries,counts:data.completed.map(x=>({id:x.id,total:1,week:now()-x.at<=7*86400000?1:0})),local:true,source:'device'};}
  if(action==='chat'){
   const ids=[...new Set(['zh','en'].flatMap(lang=>recommendTests(getCatalog(lang),input.message).picks.map(x=>x.id)))];
   return makeOffer(ids,ids.length?s('以下是现有目录的关键词匹配结果，不是 AI 回复。AI 需求追问和生成测试等待独立后端接入。','These are keyword matches from the existing directory, not an AI response. AI clarification and quiz creation await an independent backend.'):s('现有目录暂时没有匹配的测试。AI 生成尚未接入此 GitHub 版本；可以浏览下方已有测试，或换个主题。','There is no matching quiz in the current directory. AI creation is not connected on this GitHub version yet. Browse the existing quizzes or try another topic.'));
  }
  if(action==='select'){const choice=offers.get(input.conversationId)?.[input.index],entry=entries.find(x=>x.id===choice?.id);if(!entry)throw Object.assign(Error('conversation_expired'),{code:'conversation_expired'});return{url:entry.url};}
  if(action==='start')return{ok:true,local:true};
  if(action==='complete'){
   const quiz=getQuizzes(locale).find(q=>q.id===input.quizId);if(!quiz||quiz.version!==input.version||input.answers?.length!==quiz.questions.length)throw Error('invalid_answers');
   scoreQuiz(quiz,input.answers);const data=read();if(!data.completed.some(x=>x.id===quiz.id))data.completed.push({id:quiz.id,version:quiz.version,at:now()});write(data);return{ok:true,local:true};
  }
  if(action==='feedback'){const data=read();if(!data.completed.some(x=>x.id===input.quizId)||!['fits','misses','fun'].includes(input.value))throw Error('invalid_feedback');data.feedback[input.quizId]=input.value;write(data);return{ok:true,local:true};}
  if(action==='related'){
   const map={'past-life-animal':['animal-personality','historical-character','communication-style'],'historical-character':['past-life-animal','work-style','animal-personality'],'animal-personality':['communication-style','past-life-animal','historical-character'],'communication-style':['work-style','animal-personality','skribbl'],'work-style':['communication-style','historical-character','gartic-phone']};
   const data=read(),done=new Set(data.completed.map(x=>x.id));const ids=(map[input.quizId]||[]).filter(id=>!done.has(id)&&data.feedback[id]!=='misses');
   return makeOffer(ids,s('按主题关联的编辑推荐，已避开本浏览器完成过的测试；这不是 AI 个性化推荐。','Editorial suggestions by topic, excluding quizzes completed in this browser. These are not AI-personalized recommendations.'),[s('相近主题','Related theme'),s('换个角度','Another angle'),s('和朋友聊聊','Try with friends')]);
  }
  if(action==='history')return{research:[],local:true};
  if(action==='forget'){storage.removeItem(key);return{ok:true};}
  throw Object.assign(Error('ai_backend_not_connected'),{code:'ai_backend_not_connected'});
 };
}

let adapter;
export function directoryApi(action,input){
 if(!adapter){let storage;try{storage=localStorage;storage.getItem('garden-github-device-v1');}catch{const m=new Map();storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
  adapter=createDirectoryAdapter({storage,locale:document.documentElement.lang.startsWith('zh')?'zh':'en'});
 }
 return adapter(action,input);
}
