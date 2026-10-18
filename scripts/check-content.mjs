import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {quizzes} from '../src/data/quizzes.mjs';
import {catalog} from '../src/data/catalog.mjs';
import {pages,origin} from '../src/render.mjs';
import config from '../site.config.mjs';
const root=path.resolve(import.meta.dirname,'..');
const worker=(await import('data:text/javascript;base64,'+(await fs.readFile(path.join(root,'dist/server/index.js'))).toString('base64'))).default;
const readOutput=async name=>(await worker.fetch(new Request(origin+'/'+name),{})).text();
const generated=pages(),paths=new Set(generated.map(p=>p.path)),titles=new Set(),descriptions=new Set();
assert.equal(quizzes.length,6);assert.equal(catalog.length,new Set(catalog.map(x=>x.id)).size);
for(const q of quizzes){
 assert.equal(q.questions.length,q.id==='love-language'?15:12);
 assert.equal(new Set(q.questions.map(x=>x.id)).size,q.questions.length);
 for(const question of q.questions){
  assert.equal(question.answers.length,Object.keys(q.profiles).length);
  assert.deepEqual(new Set(question.answers.map(a=>a.profile)),new Set(Object.keys(q.profiles)));
 }
}
let links=0,jsonGraphs=0;
for(const p of generated){
 const html=await readOutput(p.path.slice(1));
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1,p.path+' must have exactly one H1');
 const title=html.match(/<title>(.*?)<\/title>/)[1];assert(!titles.has(title));titles.add(title);
 const description=html.match(/<meta name="description" content="([^"]+)"/)[1];assert(!descriptions.has(description));descriptions.add(description);
 assert(html.includes(`rel="canonical" href="${origin+p.path}"`));
 assert(html.includes(config.publicIndexing?'index, follow, max-image-preview:large':'noindex, nofollow'));
 for(const [,href] of html.matchAll(/href="([^"#]+)"/g)){
  if(href.startsWith('/')&&!href.startsWith('/assets/'))assert(paths.has(href.split('#')[0]),`${p.path}: missing internal target ${href}`);
  links++;
 }
 const json=html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1];
 const graph=JSON.parse(json);assert.equal(graph['@context'],'https://schema.org');jsonGraphs++;
}
for(const entry of catalog.filter(x=>x.type==='external')){
 assert.equal(new URL(entry.url).protocol,'https:');assert(entry.sourceUrl&&entry.checkedAt&&entry.verification);
}
const robots=await readOutput('robots.txt');
assert(robots.includes(config.publicIndexing?'Allow: /':'Disallow: /'));
const sitemap=await readOutput('sitemap.xml');assert.equal((sitemap.match(/<loc>/g)||[]).length,paths.size);
console.log(JSON.stringify({pages:paths.size,internal_and_external_links_checked:links,json_ld_graphs:jsonGraphs,indexing:config.publicIndexing?'public':'private',questionnaires:quizzes.length,catalog_entries:catalog.length}));
