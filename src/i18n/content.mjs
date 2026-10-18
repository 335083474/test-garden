import {quizzes as baseQuizzes} from '../data/quizzes.mjs';
import {catalog as baseCatalog} from '../data/catalog.mjs';
import {zhQuizzes,zhExternal} from './zh.mjs';
import {text} from './ui.mjs';
export function getQuizzes(locale='zh'){
 if(locale==='en')return baseQuizzes;
 if(locale!=='zh')throw new Error(`Unsupported locale: ${locale}`);
 return baseQuizzes.map(q=>{
  const copy=zhQuizzes[q.id];
  if(!copy||copy.version!==q.version||copy.questions.length!==q.questions.length)throw new Error(`Chinese content needs updating: ${q.id}`);
  const keys=Object.keys(q.profiles);
  return {...q,...copy,category:q.category,profiles:Object.fromEntries(keys.map(k=>{
   if(!copy.profiles[k])throw new Error(`Missing Chinese result: ${q.id}/${k}`);
   return [k,{...q.profiles[k],...copy.profiles[k]}];
  })),questions:q.questions.map((question,index)=>{
   const [prompt,choices]=copy.questions[index];
   if(choices.length!==keys.length)throw new Error(`Missing Chinese choices: ${question.id}`);
   return {...question,prompt,answers:question.answers.map(answer=>({...answer,text:choices[keys.indexOf(answer.profile)]}))};
  })};
 });
}
export function getCatalog(locale='zh'){
 const quizzes=getQuizzes(locale);
 return baseCatalog.map(entry=>{
  if(entry.type==='native'){
   const q=quizzes.find(q=>q.id===entry.id);
   return {...entry,title:q.title,summary:q.description,playersLabel:text(locale,'soloCompare'),freeScope:text(locale,'nativeFree'),login:text(locale,'nativeLogin'),tags:[...entry.tags,...q.dimensions]};
  }
  if(locale==='en')return {...entry,playersLabel:entry.players};
  const copy=zhExternal[entry.id];if(!copy)throw new Error(`Missing Chinese external entry: ${entry.id}`);
  return {...entry,...copy,players:entry.players,playersLabel:copy.players,tags:[...entry.tags,...copy.tags]};
 });
}
