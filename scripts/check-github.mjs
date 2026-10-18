import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import cloud from '../cloudflare.config.mjs';
const out=path.resolve(import.meta.dirname,'../dist-github'),origin='https://335083474.github.io',prefix='/test-garden';
let pages=0,links=0,graphs=0;
async function visit(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory()){await visit(file);continue;}if(!e.name.endsWith('.html'))continue;const html=await fs.readFile(file,'utf8');pages++;assert(html.includes(cloud.apiOrigin?'data-runtime="cloudflare"':'data-runtime="github"'));assert(!html.includes('.chatgpt.site'));assert(!html.includes('redirect.js'));assert(!html.includes('location.replace'));
 const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1];assert(canonical?.startsWith(origin+prefix+'/'));
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){const raw=match[1].replaceAll('&amp;','&');if(raw.startsWith('#')||/^(?:mailto:|data:)/.test(raw))continue;const url=new URL(raw,origin+prefix+'/');if(url.origin!==origin)continue;assert(url.pathname.startsWith(prefix+'/'),raw);const relative=decodeURIComponent(url.pathname.slice(prefix.length+1));const target=path.join(out,relative,url.pathname.endsWith('/')?'index.html':'');assert(target.startsWith(out+path.sep));await fs.access(target);links++;}
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){JSON.parse(match[1]);graphs++;}
 }}
await visit(out);assert.equal(pages,cloud.apiOrigin?36:30);assert.equal(graphs,cloud.apiOrigin?36:30);
const home=await fs.readFile(path.join(out,'index.html'),'utf8');assert(home.includes('data-studio-guide'));assert(home.includes('data-studio-library'));assert.equal(home.includes('data-studio-sort="new"'),Boolean(cloud.apiOrigin));
const release=JSON.parse(await fs.readFile(path.join(out,'release.json'),'utf8'));assert.equal(release.aiConnected,Boolean(cloud.apiOrigin));console.log(JSON.stringify({pages,links,graphs,backend:release.backend,host:release.host}));
