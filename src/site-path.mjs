export const githubMode=()=>typeof document!=='undefined'&&document.body?.dataset.runtime==='github';
export const basePath=()=>typeof document!=='undefined'?(document.body?.dataset.basePath||''):'';
export function sitePath(value,base=basePath()){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||!base)return value;
 if(value===base||value.startsWith(base+'/'))return value;
 return base+value;
}
