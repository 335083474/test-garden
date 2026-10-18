export function scoreQuiz(quiz,answers){
 if(!Array.isArray(answers)||answers.length!==quiz.questions.length) throw new Error('Answer every question before viewing your result.');
 const counts=Object.fromEntries(Object.keys(quiz.profiles).map(k=>[k,0]));
 quiz.questions.forEach((q,i)=>{
  const answer=q.answers.find(a=>a.id===answers[i]);
  if(!answer||!Object.hasOwn(counts,answer.profile)) throw new Error(`Invalid answer for question ${i+1}.`);
  counts[answer.profile]++;
 });
 const max=Math.max(...Object.values(counts));
 const leaders=Object.keys(counts).filter(k=>counts[k]===max);
 const percentages=Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,Math.round(v/quiz.questions.length*100)]));
 return {counts,percentages,leaders,isMixed:leaders.length>1,total:quiz.questions.length,version:quiz.version};
}
export function resultTitle(quiz,result){
 if(result.leaders.length>2) return 'A balanced mix';
 return result.leaders.map(k=>quiz.profiles[k].name.replace(/^The /,'')).join(' + ');
}
export function filterCatalog(entries,{category='All',query='',mode='all',players='all'}={}){
 const text=query.toLowerCase().trim();
 return entries.filter(e=>(category==='All'||e.category===category)&&(mode==='all'||e.mode===mode)
  &&(players!=='pair'||e.players!=='Group')
  &&(!text||[e.title,e.summary,e.provider||'',...e.tags].join(' ').toLowerCase().includes(text)));
}
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
