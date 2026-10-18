// Bounded directory matching: no generated tests, remote calls, or stored queries.
const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function has(input,word){return /^[\w .-]+$/.test(word)?new RegExp(`\\b${escapeRegex(word)}\\b`,'i').test(input):input.includes(word);}
const words={
 pastlife:['前世','上辈子','前生','past life','past-life','reincarnation'],
 historical:['古人','古代人物','穿越古代','历史人物','李白','苏轼','诸葛亮','徐霞客','historical character','historical figure','ancient chinese','ancient china'],
 fun:['趣味','有趣','脑洞','好玩','搞笑','fun','funny','silly','playful','fantasy'],
 communication:['沟通','表达','倾听','说话','交流','吵架','communication','communicate','speaking','listening','conversation','talk','arguments'],
 personality:['性格','人格','动物','狐狸','猫头鹰','水獭','了解自己','认识自己','personality','understand myself','know myself','animal','fox','owl','otter'],
 work:['工作','职场','协作','计划','效率','任务','work','working','productivity','planning','collaboration','teamwork'],
 friends:['朋友','好友','多人','聚会','一起','双人','friends','friend','group','party','together'],
 compare:['比较','对比','各自','分别','compare','separately'],
 together:['实时','联机','同玩','live','multiplayer'],
 drawing:['画画','绘画','你画我猜','猜词','draw','drawing','guess words','skribbl'],
 story:['传话','接力','故事','telephone','story','storytelling','gartic'],
 friendship:['谁最了解','默契','谁了解我','朋友有多了解','猜朋友','who knows','know me','bestiescore','friendship']
};
export const discovery={
 'past-life-animal':{topics:['pastlife','fun'],reason:'pastlife'},
 'historical-character':{topics:['historical','fun'],reason:'historical'},
 'communication-style':{topics:['communication'],reason:'communication'},
 'animal-personality':{topics:['personality'],reason:'personality'},
 'work-style':{topics:['work'],reason:'work'},
 bestiescore:{topics:['friendship'],reason:'friendship'},
 skribbl:{topics:['drawing'],reason:'drawing'},
 'gartic-phone':{topics:['story','drawing'],reason:'story'}
};
export function recommendTests(entries,query,{scope='all',mode='all'}={}){
 const input=String(query??'').normalize('NFKC').trim().toLowerCase().slice(0,400);
 const result=(status,picks=[])=>({status,picks});
 if(!input)return result('blank');
 // These requests require instruments or capabilities absent from this directory.
 if(/抑郁|焦虑|自闭|多动|诊断|智商|智力|职业匹配|职业选择|职业倾向|心理疾病|\b(depression|anxiety|autism|adhd|diagnos\w*|iq|intelligence|mbti|disc)\b|career\s+(aptitude|match|choice|test)|job\s+(fit|match)/i.test(input))return result('unsupported');
 const excluded=new Set(),active=new Set();
 for(const [topic,terms] of Object.entries(words))for(const word of terms){
  const negative=new RegExp(`(?:不想(?:做|测|玩)?|不要|不做|不测|不玩|不喜欢|排除|without\\s+|no\\s+|not\\s+(?:a\\s+)?|don['’]t\\s+(?:want\\s+)?(?:to\\s+)?(?:do\\s+)?)(?:.{0,3}?)${escapeRegex(word)}`,'i');
  if(negative.test(input))excluded.add(topic);else if(has(input,word))active.add(topic);
 }
 for(const topic of excluded)active.delete(topic);
 const onlyNative=/只(?:看|要|用)?本站|不要外链|不想.{0,3}外链|不去站外|on this site only|no external|without external|not external/i.test(input);
 const onlyExternal=!onlyNative&&/外链|站外|external|other websites/i.test(input);
 const requestedScope=onlyNative?'native':onlyExternal?'external':null;
 if(requestedScope&&scope!=='all'&&scope!==requestedScope)return result('scopeConflict');
 const effectiveScope=requestedScope||scope;
 const solo=/一个人|自己玩|单人|\b(solo|alone|by myself)\b/i.test(input);
 const pair=/两个人|双人|\b(two people|pair|couple)\b/i.test(input);
 const desiredMode=mode!=='all'?mode:active.has('compare')||solo?'compare':active.has('together')?'together':'all';
 const specific=[...active].some(x=>!['friends','compare','together'].includes(x));
 if(active.has('friends')&&!specific&&desiredMode==='all'&&effectiveScope==='all')return result('clarify');
 const eligible=entries.filter(entry=>(effectiveScope==='all'||entry.type===effectiveScope)&&(desiredMode==='all'||(entry.mode===desiredMode&&(desiredMode!=='together'||entry.timing!=='shared')))&&(!pair||entry.players!=='Group'));
 const picks=[];
 for(const entry of eligible){
  const meta=entry.discovery||discovery[entry.id]||{topics:[],reason:'keyword'};
  if(meta.topics.some(topic=>excluded.has(topic)))continue;
  let score=meta.topics.reduce((sum,topic)=>sum+(active.has(topic)?(['pastlife','historical'].includes(topic)?20:10):0),0),reason=meta.reason;
  if(active.has('friends')&&!specific){score+=entry.mode==='together'?5:3;reason=entry.type==='native'?'compare':meta.reason;}
  if(active.has('compare')&&!specific&&entry.mode==='compare'){score+=5;reason='compare';}
  if(active.has('together')&&!specific&&entry.mode==='together')score+=5;
  const keywords=meta.keywords||[];
  const literalTerms=[entry.title,...(entry.tags||[]),...keywords].filter(term=>term.length>=3);
  if(literalTerms.some(term=>has(input,term.toLowerCase()))){score+=8;if(!discovery[entry.id])reason='keyword';}
  if(score>0)picks.push({id:entry.id,reason,score});
 }
 picks.sort((a,b)=>b.score-a.score);
 return result(picks.length?'results':'empty',picks.slice(0,3).map(({id,reason})=>({id,reason})));
}
