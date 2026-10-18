import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../site.config.mjs';
import {pages,notFound,absolute} from '../src/render.mjs';
import {flower} from '../src/art.mjs';
import {buildWorker} from './build-worker.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist');
// Write only this project's generated outputs; no broad recursive cleanup.
await fs.mkdir(path.join(out,'assets/data'),{recursive:true});
await fs.mkdir(path.join(out,'assets/i18n'),{recursive:true});
const outputPages=pages();
for(const name of ['garden.webp','ancient.jpg','friends.jpg'])await fs.copyFile(path.join(root,'src/assets',name),path.join(out,'assets',name));
await fs.copyFile(path.join(root,'node_modules/qrcode-generator/qrcode.js'),path.join(out,'assets/qrcode.js'));
await fs.writeFile(path.join(out,'assets/qrcode-LICENSE.txt'),(await fs.readFile(path.join(root,'node_modules/qrcode-generator/qrcode.js'),'utf8')).split('\n').slice(0,16).join('\n'));
for(const p of outputPages){const dir=path.join(out,p.path);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'index.html'),p.html);}
await fs.writeFile(path.join(out,'404.html'),notFound());
await fs.writeFile(path.join(out,'en/404.html'),notFound('en'));
for(const name of ['styles.css','studio.css','site-path.mjs','cloud-client.mjs','cloud-quiz.mjs','github-directory.mjs','studio.mjs','studio-ui.mjs','studio-advanced.mjs','studio-advanced-ui.mjs','app.mjs','engine.mjs','art.mjs','recommender.mjs'])await fs.copyFile(path.join(root,'src',name),path.join(out,'assets',name));
for(const name of ['quizzes.mjs','catalog.mjs','fun-quizzes.mjs','love-quiz.mjs'])await fs.copyFile(path.join(root,'src/data',name),path.join(out,'assets/data',name));
for(const name of ['ui.mjs','zh.mjs','content.mjs','guide.mjs'])await fs.copyFile(path.join(root,'src/i18n',name),path.join(out,'assets/i18n',name));
await fs.writeFile(path.join(out,'assets/brand.svg'),flower.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" style="color:#193e31" '));
const social=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f8f7ef"/><circle cx="1020" cy="300" r="280" fill="#e5ecb2"/><text x="80" y="110" font-family="Georgia" font-size="38" fill="#193e31">Test Garden.</text><text x="80" y="270" font-family="Georgia" font-size="77" fill="#193e31">A little curious?</text><text x="80" y="365" font-family="Georgia" font-size="77" fill="#6e8266">Start with yourself.</text><text x="85" y="490" font-family="Arial" font-size="25" fill="#646e61">Free quizzes. Full results. No sign-up.</text></svg>`;
await fs.writeFile(path.join(out,'assets/social.svg'),social);
try{await fs.copyFile(path.join(root,'src/social.png'),path.join(out,'assets/social.png'));}catch{}
await fs.copyFile(path.join(root,'src/social-zh.png'),path.join(out,'assets/social-zh.png'));
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${outputPages.map(p=>`<url><loc>${absolute(p.path)}</loc></url>`).join('')}</urlset>\n`;
await fs.writeFile(path.join(out,'sitemap.xml'),sitemap);
const robots=config.publicIndexing?`User-agent: *\nAllow: /\n\nSitemap: ${absolute('/sitemap.xml')}\n`:'User-agent: *\nDisallow: /\n';
await fs.writeFile(path.join(out,'robots.txt'),robots);
await fs.writeFile(path.join(out,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' blob: data:; connect-src \'none\'; frame-ancestors \'none\'; object-src \'none\'; base-uri \'self\'\n');
const manifest=JSON.parse(await fs.readFile(path.join(root,'.openai/hosting.json'),'utf8'));
delete manifest.static;
await fs.writeFile(path.join(root,'.openai/hosting.json'),JSON.stringify(manifest,null,2)+'\n');
const worker=await buildWorker(root,out,outputPages,manifest);
console.log(JSON.stringify({...worker,pages:outputPages.length,origin:config.origin,indexing:config.publicIndexing?'public':'private preview; noindex',output:out}));
