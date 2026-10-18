import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';

process.env.SITE_URL='https://335083474.github.io';
process.env.SITE_PUBLIC='true';
const {pages,notFound,absolute}=await import('../src/render.mjs');
const {flower}=await import('../src/art.mjs');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist-github'),base='/test-garden';
await fs.mkdir(out,{recursive:true});
await fs.mkdir(path.join(out,'assets'),{recursive:true});
function htmlForGithub(html,locale='zh',pagePath='/'){
 const en=locale==='en',s=(zh,english)=>en?english:zh;
 let value=html.replace('<body>',`<body data-runtime="github" data-base-path="${base}">`)
  .replaceAll('https://335083474.github.io/','https://335083474.github.io'+base+'/')
  .replace(/\b(href|src|action)="\/(?!\/)/g,`$1="${base}/`)
  .replace(/<label class="studio-consent">[\s\S]*?<\/label>/,`<label class="studio-consent"><input type="checkbox" name="consent" disabled hidden>${s('目录匹配在浏览器中进行，不保存搜索内容。AI 生成等待独立后端接入。','Directory matching runs in your browser. Searches are not saved. AI creation awaits an independent backend.')}</label>`)
  .replace(/<p class="studio-rank-note">[\s\S]*?<\/p>/g,`<p class="studio-rank-note">${s('下方计数只来自当前浏览器，不代表全站人数或热度。','Counts below come from this browser only, not site-wide popularity or visitors.')}</p>`)
  .replace(/<button[^>]+data-studio-sort="new"[^>]*>[\s\S]*?<\/button>/g,'')
  .replaceAll('本周热门','本设备近7天').replaceAll('总榜','本设备记录').replaceAll('This week','On this device · 7 days').replaceAll('All time','On this device')
  .replaceAll('已有测试、AI 新作、朋友活动，随时回来继续玩。','已有测试和朋友活动，随时回来继续玩。').replaceAll('Original quizzes, new AI creations, and activities with friends.','Original quizzes and activities with friends.')
  .replaceAll('完成时由本机服务校验计分，不保存原始答案。','在你的浏览器中计分，不保存原始答案。').replaceAll('Answers are checked by the local server on completion, then discarded.','Answers are scored in your browser and are not saved.')
  .replaceAll('原始作答只在当前页面内存中用于计分','原始作答只在当前页面内存中用于计分');
 const banner=`<aside class="github-release-note" role="note">${s('GitHub 试用版：现有测试、外链、结果卡和分享可用。AI 生成、全站排行与双人对比等待独立后端接入。','GitHub trial: existing quizzes, external activities, result cards and sharing work here. AI creation, site-wide rankings and shared comparisons await an independent backend.')}</aside>`;
 value=value.replace('<main id="main"',banner+'<main id="main"');
 // Do not publish a private management UI or claim that requests are being saved to a server.
 value=value.replace(/<section class="studio-data">[\s\S]*?<\/section>/,`<section class="studio-data"><details><summary>${s('本设备的测试记录','Quiz records on this device')}</summary><p>${s('搜索需求不保存、不发送到 AI。浏览器只保存完成过的测试编号、时间和主动反馈；没有全站数据库。清除浏览器数据也会清除这些记录。','Search requests are not saved or sent to AI. Only quiz IDs, completion dates and voluntary feedback are stored in this browser. Clearing browser data removes these records.')}</p><button class="quiet-button" data-forget>${s('删除本设备记录','Delete device records')}</button><div data-history></div></details></section>`);
 if(pagePath.endsWith('/privacy/'))value=value.replace(/<article class="reading">[\s\S]*?<\/article>/,`<article class="reading"><h1>${s('GitHub 版本隐私说明','Privacy on the GitHub version')}</h1><p>${s('本站页面与静态文件由 GitHub Pages 提供。正常访问会由 GitHub 处理网络请求。当前版本不连接 ChatGPT 托管或 AI 服务，也不向其发送测试需求或答案。','GitHub Pages serves these pages and static files and processes normal web requests. This version does not connect to ChatGPT hosting or an AI service, or send them your quiz requests or answers.')}</p><h2>${s('留在浏览器里的内容','What stays in this browser')}</h2><p>${s('答案仅在页面内存中计算，刷新即清空。完成记录只包含测试编号、版本和时间；你主动提交的反馈也保存在本设备。搜索内容只用于当前目录匹配，不保存。','Answers are scored in page memory and cleared on reload. Completion records contain only quiz ID, version and date; voluntary feedback is stored on this device. Search text is used for directory matching and is not saved.')}</p><h2>${s('分享由你选择','Sharing is your choice')}</h2><p>${s('默认分享链接不包含结果。勾选分享结果时，角色标识会出现在链接片段中，持链接者可见；原始答案不会包含在链接里。站外活动遵守各自的隐私规则。','Default share links do not include your result. If you opt to share it, profile identifiers appear in the URL fragment and are visible to link recipients. Individual answers are never included. External activities have their own privacy policies.')}</p><h2>${s('功能状态','Feature status')}</h2><p>${s('AI 生成、需求研究、全站排行及双人汇总尚未接入独立后端。目前展示的是目录匹配、编辑推荐和本设备记录，不是 AI 回复或全站统计。','AI creation, request research, site-wide rankings and shared comparisons are not connected to an independent backend yet. This version shows directory matches, editorial suggestions and device records, not AI responses or site-wide counts.')}</p></article>`);
 if(pagePath==='/404/')value=value.replaceAll('/en/404/','/en/404.html').replaceAll('/404/','/404.html');
 return value.replace('</head>','<style>.github-release-note{padding:12px 24px;background:#eee7fc;color:#49375d;text-align:center;font:13px/1.6 system-ui,sans-serif}.studio-consent{line-height:1.6}</style></head>');
}
const all=pages();
for(const p of all){const relative=p.path.slice(1),dest=path.join(out,relative,'index.html');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,htmlForGithub(p.html,p.path.startsWith('/en/')?'en':'zh',p.path));}
await fs.writeFile(path.join(out,'404.html'),htmlForGithub(notFound(),'zh','/404/'));
await fs.writeFile(path.join(out,'en/404.html'),htmlForGithub(notFound('en'),'en','/404/'));
await fs.writeFile(path.join(out,'.nojekyll'),'');
for(const name of ['garden.webp','ancient.jpg','friends.jpg'])await fs.copyFile(path.join(root,'src/assets',name),path.join(out,'assets',name));
for(const name of ['social.png','social-zh.png'])await fs.copyFile(path.join(root,'src',name),path.join(out,'assets',name));
for(const name of ['styles.css','studio.css'])await fs.copyFile(path.join(root,'src',name),path.join(out,'assets',name));
await fs.copyFile(path.join(root,'node_modules/qrcode-generator/qrcode.js'),path.join(out,'assets/qrcode.js'));
await fs.writeFile(path.join(out,'assets/qrcode-LICENSE.txt'),(await fs.readFile(path.join(root,'node_modules/qrcode-generator/qrcode.js'),'utf8')).split('\n').slice(0,16).join('\n'));
await fs.writeFile(path.join(out,'assets/brand.svg'),flower.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" style="color:#193e31" '));
// Bundle all browser dependencies, including lazy imports, without exporting any backend code.
await build({entryPoints:['src/app.mjs','src/studio.mjs'],outdir:path.join(out,'assets'),outExtension:{'.js':'.mjs'},bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',absWorkingDir:root});
await fs.writeFile(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${all.map(p=>`<url><loc>${absolute(base+p.path)}</loc></url>`).join('')}</urlset>`);
await fs.writeFile(path.join(out,'robots.txt'),`User-agent: *\nAllow: /test-garden/\nSitemap: https://335083474.github.io/test-garden/sitemap.xml\n`);
await fs.writeFile(path.join(out,'release.json'),JSON.stringify({host:'github-pages',backend:null,pages:all.length,quizzes:5,externalActivities:3,aiConnected:false,source:process.env.GITHUB_SHA||'local'},null,2));
console.log(JSON.stringify({host:'github-pages',pages:all.length,out,backend:null}));
