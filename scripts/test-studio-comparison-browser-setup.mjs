// Synthetic creator result; finish the other participant through the actual browser UI.
import fs from 'node:fs/promises';
import {getQuizzes} from '../src/i18n/content.mjs';
const origin='http://127.0.0.1:4319',q=getQuizzes('zh').find(x=>x.id==='communication-style');
const response=await fetch(origin+'/api/studio/pair-create',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({locale:'zh',quizId:q.id,version:q.version,consent:true,answers:q.questions.map(x=>x.answers.find(a=>a.profile==='anchor').id)})});
if(!response.ok)throw Error('Comparison setup failed');const data=await response.json();await fs.mkdir('artifacts/studio-advanced',{recursive:true});await fs.writeFile('artifacts/studio-advanced/browser-pair.json',JSON.stringify({syntheticCreator:true,url:origin+data.url},null,2));console.log(JSON.stringify({url:origin+data.url,syntheticCreator:true}));
