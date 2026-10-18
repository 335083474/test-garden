export const githubMode=()=>typeof document!=='undefined'&&document.body?.dataset.runtime==='github';
export const cloudMode=()=>typeof document!=='undefined'&&document.body?.dataset.runtime==='cloudflare';
export const basePath=()=>typeof document!=='undefined'?(document.body?.dataset.basePath||''):'';
export function sitePath(value,base=basePath()){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||!base)return value;
 if(cloudMode()){
  const url=new URL(value,'https://paths.invalid'),created=url.pathname.match(/^(\/(?:en\/)?)created\/(ai-[a-f0-9]{16})\/$/),pair=url.pathname.match(/^(\/(?:en\/)?)compare\/([a-f0-9]{64})\/$/);
  if(created){url.pathname=created[1]+'created/';url.searchParams.set('id',created[2]);}
  if(pair){url.pathname=pair[1]+'compare/';url.searchParams.set('token',pair[2]);}
  value=url.pathname+url.search+url.hash;
 }
 if(value===base||value.startsWith(base+'/'))return value;
 return base+value;
}
