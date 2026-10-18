import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
export function testD1(){
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(new URL('../../drizzle/0000_white_morph.sql',import.meta.url),'utf8'));
 const wrap=(sql,values=[])=>({bind:(...v)=>wrap(sql,v),first:async()=>db.prepare(sql).get(...values)||null,all:async()=>({results:db.prepare(sql).all(...values)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...values).changes)}})});
 return {prepare:wrap,batch:async values=>{db.exec('BEGIN');try{const results=[];for(const s of values)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}},close:()=>db.close(),raw:db};
}
