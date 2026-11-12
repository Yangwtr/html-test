import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const allowed=['new','awaiting_implementation','implementation_complete','awaiting_review','review_approved','review_changes_requested','awaiting_ci','ci_failed','awaiting_repair','blocked','awaiting_human_merge_approval','done'];
export class TaskStore {
 constructor(file=':memory:') {
  if(file!==':memory:') mkdirSync(dirname(file),{recursive:true});
  this.db=new DatabaseSync(file);
  this.db.exec(`PRAGMA journal_mode=WAL;
   CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, kind TEXT NOT NULL, objective TEXT NOT NULL, status TEXT NOT NULL, owner TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0), ci_passed INTEGER NOT NULL DEFAULT 0, details TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL, from_status TEXT, to_status TEXT NOT NULL, actor TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(task_id) REFERENCES tasks(id));`);
  this.db.exec('PRAGMA foreign_keys=ON');
 }
 create(task,owner) {
  if(!task?.id||!task?.objective||!owner) throw new Error('id, objective, owner required');
  this.db.prepare('INSERT INTO tasks(id,kind,objective,status,owner,details) VALUES(?,?,?,?,?,?)').run(task.id,task.kind||'implementation',task.objective,'new',owner,JSON.stringify({acceptance_criteria:task.acceptance_criteria||[]}));
  this.db.prepare('INSERT INTO events(task_id,from_status,to_status,actor,note) VALUES(?,?,?,?,?)').run(task.id,null,'new','controller','created');
  return this.get(task.id);
 }
 get(id){const t=this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id);return t?{...t,ci_passed:Boolean(t.ci_passed),details:JSON.parse(t.details)}:null;}
 list(){return this.db.prepare('SELECT * FROM tasks ORDER BY updated_at DESC,id').all().map(t=>({...t,ci_passed:Boolean(t.ci_passed),details:JSON.parse(t.details)}));}
 transition(id,next,{actor='controller',note='',incrementAttempt=false}={}){
  if(!allowed.includes(next)) throw new Error('unsupported state');
  const current=this.get(id);if(!current)throw new Error('task not found');
  if(incrementAttempt&&current.attempts>=3)throw new Error('repair limit reached');
  this.db.exec('BEGIN IMMEDIATE');
  try{
   this.db.prepare('UPDATE tasks SET status=?,attempts=attempts+?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(next,incrementAttempt?1:0,id);
   this.db.prepare('INSERT INTO events(task_id,from_status,to_status,actor,note) VALUES(?,?,?,?,?)').run(id,current.status,next,actor,note);
   this.db.exec('COMMIT');
  }catch(e){this.db.exec('ROLLBACK');throw e;}
  return this.get(id);
 }
 setCi(id,passed){if(!this.get(id))throw new Error('task not found');this.db.prepare('UPDATE tasks SET ci_passed=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(passed?1:0,id);}
 events(id){return this.db.prepare('SELECT * FROM events WHERE task_id=? ORDER BY id').all(id);}
 close(){this.db.close();}
}
