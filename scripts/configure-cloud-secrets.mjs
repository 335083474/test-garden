// Transfers an already-authorized MiniMax credential to Cloudflare over stdin.
// Never prints values, writes an env file, or passes secrets in arguments.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const directory=process.env.MMX_CONFIG_DIR||path.join(os.homedir(),'.mmx');
const config=JSON.parse(await fs.readFile(path.join(directory,'config.json'),'utf8'));
if(typeof config.api_key!=='string'||config.api_key.length<12)throw Error('MiniMax credential unavailable');
const payload={MINIMAX_API_KEY:config.api_key,RATE_LIMIT_SALT:crypto.randomBytes(32).toString('hex')};
const child=spawn(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'secret','bulk'],{cwd:root,stdio:['pipe','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
child.stdin.end(JSON.stringify(payload));
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
// Keep the tool boundary value-free even if a future CLI version echoes input.
if(code!==0)throw Error('Cloudflare secret upload failed; inspect the provider status without printing secret values');
console.log(JSON.stringify({configured:['MINIMAX_API_KEY','RATE_LIMIT_SALT'],secretValuesPrinted:false}));
