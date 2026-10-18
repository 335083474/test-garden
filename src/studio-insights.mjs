// Evidence-based aggregates. No raw transcripts or browser/session identifiers leave this function.
export function buildInsights(rows,catalog){
 const map=new Map(catalog.filter(x=>x.type==='native').map(x=>[x.id,{id:x.id,title:x.title,starts:0,completions:0,cohortCompleted:0,fits:0,misses:0,fun:0}]));
 for(const row of rows.starts){const q=map.get(row.id);if(q){q.starts++;if(rows.completions.some(c=>c.owner===row.owner&&c.id===row.id&&c.version===row.version&&c.at>=row.at))q.cohortCompleted++;}}
 for(const row of rows.completions){const q=map.get(row.id);if(q)q.completions++;}
 for(const row of rows.feedback){const q=map.get(row.id);if(q&&['fits','misses','fun'].includes(row.value))q[row.value]++;}
 const topics=new Map();let offered=0,chosen=0,generatedChosen=0,waiting=0;
 for(const record of rows.research){
  const choices=record.choices||[];if(choices.length)offered++;else waiting++;
  if(record.selected){chosen++;if(record.selected.generated)generatedChosen++;}
  const seen=new Set();for(const [i,c]of choices.entries()){
   const key=c.kind==='generate'?c.topicKey:c.id;if(!key||seen.has(key))continue;seen.add(key);
   const row=topics.get(key)||{key,title:c.title,proposed:0,selected:0,creationRequests:0};row.proposed++;if(record.selected?.index===i){row.selected++;if(c.kind==='generate')row.creationRequests++;}topics.set(key,row);
  }
 }
 return {sample:{consentedConversations:rows.research.length,offered,chosen,generatedChosen,waiting,selectionRate:offered?chosen/offered:null},topics:[...topics.values()].sort((a,b)=>b.selected-a.selected||b.proposed-a.proposed),quizzes:[...map.values()].map(q=>({...q,completionRate:q.starts?q.cohortCompleted/q.starts:null,feedbackN:q.fits+q.misses+q.fun,lowSample:q.fits+q.misses+q.fun<5})),totals:{starts:rows.starts.length,completions:rows.completions.length,feedback:rows.feedback.length},notes:['consented-sample-only','browser-deduplication','feedback-is-not-accuracy','completion-rate-uses-started-cohort']};
}
export function recommendationContext(profile,catalog,currentId){
 const completed=new Set(profile.completed.map(x=>x.id)),disliked=new Set(profile.feedback.filter(x=>x.value==='misses').map(x=>x.id));
 const quality=new Map(profile.quality.map(x=>[x.id,x]));
 const candidates=catalog.filter(x=>x.id!==currentId&&!completed.has(x.id)&&!disliked.has(x.id));
 const qualityScore=id=>{const v=quality.get(id);return v&&v.n>=5?(v.fits+v.fun*.5+2)/(v.n+4):.5;};
 candidates.sort((a,b)=>qualityScore(b.id)-qualityScore(a.id));
 return {candidates,context:{completed:profile.completed.map(x=>x.id),feedback:profile.feedback,consentedGoals:profile.needs,feedbackSignals:profile.quality.map(x=>({...x,interpretation:'self-reported feedback, not scientific accuracy'}))}};
}
export function compareResults(q,a,b,locale){
 const shared=a.leaders.filter(k=>b.leaders.includes(k));
 const rows=Object.keys(q.profiles).map(k=>({key:k,name:q.profiles[k].name,a:a.counts[k],b:b.counts[k],aPercent:a.percentages[k],bPercent:b.percentages[k]}));
 return {a:{leaders:a.leaders.map(k=>q.profiles[k].name),counts:a.counts},b:{leaders:b.leaders.map(k=>q.profiles[k].name),counts:b.counts},rows,shared:shared.map(k=>q.profiles[k].name),prompts:[...new Set([...a.leaders,...b.leaders].map(k=>q.profiles[k].conversation))].slice(0,3),interpretation:locale==='zh'?(shared.length?'这次选择中，你们有共同的领先角色。可以从一个真实例子聊起。':'这次选择中，你们的领先角色不同。可以聊聊各自更喜欢怎样的情境。'):(shared.length?'Your choices share a leading story role this time. Start with one concrete example.':'Your choices point to different leading story roles this time. Talk about the situations each of you enjoyed.'),note:locale==='zh'?'对比来自同一版本的选择分布，不是关系匹配、人格诊断或默契度分数。':'This compares choices from the same quiz version, not relationship compatibility, a diagnosis, or a chemistry score.'};
}
