import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export function openStudioStore(filename){
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS quizzes(id TEXT PRIMARY KEY, topic_key TEXT UNIQUE NOT NULL,spec TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS research(session_id TEXT PRIMARY KEY,content TEXT NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS research_v2(conversation_id TEXT PRIMARY KEY,session_id TEXT NOT NULL,content TEXT NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS completions(session_id TEXT NOT NULL,quiz_id TEXT NOT NULL,version TEXT NOT NULL,completed_at INTEGER NOT NULL,PRIMARY KEY(session_id,quiz_id,version));
 CREATE TABLE IF NOT EXISTS feedback(session_id TEXT NOT NULL,quiz_id TEXT NOT NULL,value TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(session_id,quiz_id));
 CREATE TABLE IF NOT EXISTS attempt_starts(session_id TEXT NOT NULL,quiz_id TEXT NOT NULL,version TEXT NOT NULL,started_at INTEGER NOT NULL,PRIMARY KEY(session_id,quiz_id,version));
 CREATE TABLE IF NOT EXISTS comparison_rooms(token TEXT PRIMARY KEY,creator_id TEXT NOT NULL,guest_id TEXT,snapshot TEXT NOT NULL,creator_result TEXT NOT NULL,guest_result TEXT,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);`);
 const publicRow=row=>row?({id:row.id,topicKey:row.topic_key,spec:JSON.parse(row.spec),createdAt:row.created_at}):null;
 return {
  close:()=>db.close(),
  find:id=>publicRow(db.prepare('SELECT * FROM quizzes WHERE id=?').get(id)),
  topic:key=>publicRow(db.prepare('SELECT * FROM quizzes WHERE topic_key=?').get(key)),
  list:()=>db.prepare('SELECT * FROM quizzes ORDER BY created_at DESC').all().map(publicRow),
  save(spec){const id='ai-'+createHash('sha256').update(spec.topicKey).digest('hex').slice(0,16);db.prepare('INSERT OR IGNORE INTO quizzes VALUES(?,?,?,?)').run(id,spec.topicKey,JSON.stringify(spec),Date.now());return this.topic(spec.topicKey);},
  record(session,state){if(state.consent)db.prepare('INSERT OR REPLACE INTO research_v2 VALUES(?,?,?,?)').run(state.id,session,JSON.stringify({locale:state.locale,turns:state.turns,questions:state.questions,choices:state.offers,selected:state.selected||null}),Date.now());},
  complete(session,q){return Number(db.prepare('INSERT OR IGNORE INTO completions VALUES(?,?,?,?)').run(session,q.id,q.version,Date.now()).changes);},
  stats(){const week=Date.now()-7*86400000;return db.prepare('SELECT quiz_id AS id,count(*) AS total,sum(completed_at>=?) AS week FROM completions GROUP BY quiz_id').all(week);},
  start(session,q){return Number(db.prepare('INSERT OR IGNORE INTO attempt_starts VALUES(?,?,?,?)').run(session,q.id,q.version,Date.now()).changes);},
  profile(session){return {completed:db.prepare('SELECT quiz_id AS id,version,completed_at AS at FROM completions WHERE session_id=? ORDER BY completed_at DESC LIMIT 100').all(session),feedback:db.prepare('SELECT quiz_id AS id,value FROM feedback WHERE session_id=? ORDER BY updated_at DESC LIMIT 50').all(session),needs:(this.research(session)||[]).slice(-3).map(x=>({goal:x.turns.filter(t=>t.role==='user').map(t=>t.text).join(' / ').slice(0,900),selectedId:x.selected?.id||null})),quality:db.prepare("SELECT quiz_id AS id,count(*) AS n,sum(value='fits') AS fits,sum(value='misses') AS misses,sum(value='fun') AS fun FROM feedback GROUP BY quiz_id HAVING count(*)>=5").all()};},
  insightRows(since){return {research:db.prepare('SELECT content,updated_at AS at,session_id AS owner FROM research_v2 WHERE updated_at>=?').all(since).map(x=>({...JSON.parse(x.content),at:x.at,owner:x.owner})),starts:db.prepare('SELECT session_id AS owner,quiz_id AS id,version,started_at AS at FROM attempt_starts WHERE started_at>=?').all(since),completions:db.prepare('SELECT session_id AS owner,quiz_id AS id,version,completed_at AS at FROM completions WHERE completed_at>=?').all(since),feedback:db.prepare('SELECT quiz_id AS id,value FROM feedback WHERE updated_at>=?').all(since)};},
  createPair(creator,snapshot,result,at=Date.now()){const token=randomUUID().replace(/-/g,'')+randomUUID().replace(/-/g,'');db.prepare('INSERT INTO comparison_rooms(token,creator_id,snapshot,creator_result,created_at,expires_at) VALUES(?,?,?,?,?,?)').run(token,creator,JSON.stringify(snapshot),JSON.stringify(result),at,at+7*86400000);return token;},
  pair(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;const row=db.prepare('SELECT * FROM comparison_rooms WHERE token=?').get(token);return row?{token:row.token,creator:row.creator_id,guest:row.guest_id,snapshot:JSON.parse(row.snapshot),a:JSON.parse(row.creator_result),b:row.guest_result?JSON.parse(row.guest_result):null,createdAt:row.created_at,expiresAt:row.expires_at,revoked:Boolean(row.revoked)}:null;},
  joinPair(token,guest,result){const row=this.pair(token);if(!row||row.revoked||row.expiresAt<=Date.now())return false;if(row.creator===guest)return false;const changed=db.prepare('UPDATE comparison_rooms SET guest_id=?,guest_result=? WHERE token=? AND guest_id IS NULL AND revoked=0 AND expires_at>?').run(guest,JSON.stringify(result),token,Date.now());return Boolean(changed.changes);},
  revokePair(token,owner){return Boolean(db.prepare('UPDATE comparison_rooms SET revoked=1 WHERE token=? AND creator_id=?').run(token,owner).changes);},
  feedback(session,id,value){db.prepare('INSERT OR REPLACE INTO feedback VALUES(?,?,?,?)').run(session,id,value,Date.now());},
  research(session){const rows=db.prepare('SELECT content,updated_at FROM research_v2 WHERE session_id=? ORDER BY updated_at').all(session);return rows.length?rows.map(row=>({...JSON.parse(row.content),updatedAt:row.updated_at})):null;},
  forget(session){db.exec('BEGIN');try{for(const table of ['research','research_v2','completions','feedback','attempt_starts'])db.prepare(`DELETE FROM ${table} WHERE session_id=?`).run(session);db.prepare('DELETE FROM comparison_rooms WHERE creator_id=? OR guest_id=?').run(session,session);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}},
  prune(){for(const table of ['research','research_v2'])db.prepare(`DELETE FROM ${table} WHERE updated_at<?`).run(Date.now()-30*86400000);db.prepare('DELETE FROM comparison_rooms WHERE expires_at<?').run(Date.now());},
  newSession:()=>randomUUID()
 };
}
