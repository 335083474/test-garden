import fs from 'node:fs/promises';
import path from 'node:path';
import {getCatalog} from '../src/i18n/content.mjs';
import {build} from 'esbuild';

export async function buildWorker(root,out,outputPages,manifest){
 const names=['404.html','en/404.html','sitemap.xml','robots.txt',...outputPages.map(p=>p.path.slice(1)+'index.html'),
  ...['styles.css','studio.css','site-path.mjs','github-directory.mjs','studio.mjs','studio-ui.mjs','studio-advanced.mjs','studio-advanced-ui.mjs','garden.webp','ancient.jpg','friends.jpg','qrcode.js','qrcode-LICENSE.txt','app.mjs','engine.mjs','art.mjs','recommender.mjs','brand.svg','social.svg','social.png','social-zh.png'].map(x=>'assets/'+x),
  ...['quizzes.mjs','catalog.mjs','fun-quizzes.mjs'].map(x=>'assets/data/'+x),...['ui.mjs','zh.mjs','content.mjs','guide.mjs'].map(x=>'assets/i18n/'+x)];
 const assets=Object.fromEntries(await Promise.all(names.map(async name=>['/'+name,(await fs.readFile(path.join(out,name))).toString('base64')])));
 const catalogs={zh:getCatalog('zh'),en:getCatalog('en')};
 const bundle=await build({stdin:{contents:`import {createHostedWorker} from './src/server/studio-worker.mjs'; const CATALOGS=${JSON.stringify(catalogs)}; const ASSETS=${JSON.stringify(assets)}; export default createHostedWorker({catalogs:CATALOGS,assets:ASSETS});`,resolveDir:root,sourcefile:'worker-entry.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,define:{'process.env.SITE_URL':JSON.stringify(process.env.SITE_URL||'https://test-garden-first-edition.liuq75061.chatgpt.site'),'process.env.SITE_PUBLIC':JSON.stringify(process.env.SITE_PUBLIC||'true')}});
 const worker=bundle.outputFiles[0].text;
 // The only replacement target is this checkout's generated dist directory.
 if(path.resolve(out)!==path.join(await fs.realpath(root),'dist'))throw Error('Unexpected build target');
 async function regularTree(name){const stat=await fs.lstat(name);if(stat.isDirectory()){for(const child of await fs.readdir(name))await regularTree(path.join(name,child));}else if(!stat.isFile())throw Error('Build target contains a symlink or special file');}
 await regularTree(out);
 await fs.rm(out,{recursive:true});
 await fs.mkdir(path.join(out,'server'),{recursive:true});
 await fs.mkdir(path.join(out,'.openai'),{recursive:true});
 await fs.writeFile(path.join(out,'server/index.js'),worker);
 await fs.writeFile(path.join(out,'.openai/hosting.json'),JSON.stringify(manifest,null,2)+'\n');
 await fs.cp(path.join(root,'drizzle'),path.join(out,'.openai/drizzle'),{recursive:true});
 // Parse the complete standalone ESM and verify its exported runtime entrypoint.
 const built=await import('data:text/javascript;base64,'+Buffer.from(worker).toString('base64'));
 if(typeof built.default?.fetch!=='function')throw Error('Missing Worker fetch export');
 return {assets:names.length,workerBytes:Buffer.byteLength(worker)};
}
