// Developer-only local inference. Never imported by the hosted Worker.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..');

function localEnvironment(){
 const env={...process.env};
 for(const key of ['OPENAI_API_KEY','OPENAI_BASE_URL','OPENAI_API_BASE','CODEX_API_KEY','CODEX_ACCESS_TOKEN','CODEX_THREAD_ID'])delete env[key];
 return env;
}
export async function findCodex(){
 if(process.env.CODEX_TEST_CLI)return process.env.CODEX_TEST_CLI;
 if(process.platform!=='win32')return 'codex';
 const directory=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData/Local'),'OpenAI/Codex/bin');
 const entries=await fs.readdir(directory,{withFileTypes:true});
 const candidates=[];
 for(const entry of entries.filter(x=>x.isDirectory())){
  const filename=path.join(directory,entry.name,'codex.exe');
  try{const stat=await fs.lstat(filename);if(stat.isFile())candidates.push({filename,at:stat.mtimeMs});}catch{}
 }
 candidates.sort((a,b)=>b.at-a.at);if(!candidates.length)throw Error('codex_not_installed');
 return candidates[0].filename;
}
export async function checkPlanLogin(){
 const cli=await findCodex();
 return new Promise(resolve=>{
  const child=spawn(cli,['login','status'],{env:localEnvironment(),windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
  const timeout=setTimeout(()=>child.kill(),15000);
  child.on('error',()=>{clearTimeout(timeout);resolve(false);});
  child.on('close',code=>{clearTimeout(timeout);resolve(code===0&&/logged in using chatgpt/i.test(output));});
 });
}
export async function runPlanJson({prompt,schema,signal,timeoutMs=90000}){
 const cli=await findCodex(),scratch=path.join(root,'artifacts/plan-runtime');
 await fs.mkdir(scratch,{recursive:true});
 const context=path.join(scratch,'empty-context');await fs.mkdir(context,{recursive:true});
 const requestDir=await fs.mkdtemp(path.join(scratch,'request-'));
 const schemaPath=path.join(requestDir,'schema.json');await fs.writeFile(schemaPath,JSON.stringify(schema));
 const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only',
  '--config','forced_login_method="chatgpt"','--config','model_reasoning_effort="low"','--config','web_search="disabled"',
  ...['shell_tool','apps','plugins','remote_plugin','hooks','multi_agent'].flatMap(key=>['--config',`features.${key}=false`]),
  '--cd',context,'--output-schema',schemaPath,'--json','-'];
 const started=Date.now();
 try{return await new Promise((resolve,reject)=>{
  const child=spawn(cli,args,{env:localEnvironment(),windowsHide:true,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',stopped=false;
  const abort=()=>{stopped=true;child.kill();};
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timeout=setTimeout(abort,Math.min(timeoutMs,180000));
  const cleanup=()=>{clearTimeout(timeout);signal?.removeEventListener('abort',abort);};
  child.stdout.on('data',x=>{stdout+=x;if(stdout.length>2_000_000)abort();});
  child.stderr.on('data',x=>{stderr+=x;if(stderr.length>2_000_000)abort();});
  child.on('error',()=>{cleanup();reject(Error('codex_launch_failed'));});
  child.on('close',code=>{
   cleanup();if(stopped){reject(Error('codex_request_stopped'));return;}
   const events=stdout.split(/\r?\n/).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
   const completed=events.find(x=>x.type==='turn.completed');
   const tools=events.some(x=>['command_execution','mcp_tool_call','web_search'].includes(x.item?.type));
   if(code!==0||!completed||tools){
    const diagnostic=(stderr+' '+events.filter(x=>x.type==='error'||x.type==='turn.failed').map(x=>JSON.stringify(x)).join(' ')).toLowerCase();
    const category=/usage limit|quota|rate limit/.test(diagnostic)?'plan_limit':/unauthorized|not logged|authentication|refresh token/.test(diagnostic)?'plan_login_required':/connection|network|stream disconnected|timed out|error sending|websocket/.test(diagnostic)?'plan_network_error':tools?'unexpected_tool_call':'plan_request_failed';
    reject(Error(category));return;
   }
   try{const message=events.filter(x=>x.type==='item.completed'&&x.item?.type==='agent_message').at(-1)?.item.text;resolve({value:JSON.parse(message),usage:completed.usage,elapsedMs:Date.now()-started,toolCalls:0});}catch{reject(Error('plan_invalid_response'));}
  });
  child.stdin.end(prompt+'\nUse no tools. Do not inspect files or run commands. Return only the requested JSON.');
 });}finally{await fs.unlink(schemaPath).catch(()=>{});await fs.rmdir(requestDir).catch(()=>{});}
}
