// Durable lease-based work queue. No AI API calls or paid fallbacks.
export class WorkQueue {
  constructor(store) {
    this.db=store.db;
    this.db.exec(`CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY, task_id TEXT NOT NULL, kind TEXT NOT NULL,
      payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      lease_owner TEXT, lease_until INTEGER, attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3, available_at INTEGER NOT NULL DEFAULT 0,
      result TEXT, last_error TEXT,
      FOREIGN KEY(task_id) REFERENCES tasks(id),
      CHECK(status IN ('pending','leased','completed','dead'))
    ); CREATE INDEX IF NOT EXISTS idx_work_ready ON work_items(status,available_at,lease_until);`);
  }
  enqueue({id,taskId,kind,payload={},maxAttempts=3}) {
    if(!id||!taskId||!kind||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3) throw new Error('invalid work item');
    this.db.prepare('INSERT OR IGNORE INTO work_items(id,task_id,kind,payload,max_attempts) VALUES(?,?,?,?,?)')
      .run(id,taskId,kind,JSON.stringify(payload),maxAttempts);
    return this.get(id);
  }
  get(id){return this.db.prepare('SELECT * FROM work_items WHERE id=?').get(id)||null;}
  claim(worker,{now=Date.now(),leaseMs=60000}={}) {
    if(!worker||!Number.isSafeInteger(now)||!Number.isSafeInteger(leaseMs)||leaseMs<1000)throw new Error('invalid lease');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      // Expired leases are reclaimed; a worker must use the current attempt token to acknowledge.
      this.db.prepare("UPDATE work_items SET status='dead',lease_owner=NULL,lease_until=NULL,last_error='lease expired; attempts exhausted' WHERE status='leased' AND lease_until<=? AND attempts>=max_attempts").run(now);
      const item=this.db.prepare("SELECT * FROM work_items WHERE (status='pending' AND available_at<=?) OR (status='leased' AND lease_until<=? AND attempts<max_attempts) ORDER BY available_at,id LIMIT 1").get(now,now);
      if(!item){this.db.exec('COMMIT');return null;}
      this.db.prepare("UPDATE work_items SET status='leased',lease_owner=?,lease_until=?,attempts=attempts+1 WHERE id=?").run(worker,now+leaseMs,item.id);
      const claimed=this.get(item.id);this.db.exec('COMMIT');return claimed;
    }catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  complete(id,worker,attempt,result={}) {
    const info=this.db.prepare("UPDATE work_items SET status='completed',result=?,lease_until=NULL,lease_owner=NULL WHERE id=? AND status='leased' AND lease_owner=? AND attempts=?")
      .run(JSON.stringify(result),id,worker,attempt);
    if(info.changes!==1)throw new Error('stale or unauthorized completion');
    return this.get(id);
  }
  fail(id,worker,attempt,error,{now=Date.now(),delayMs=1000}={}) {
    if(!Number.isSafeInteger(delayMs)||delayMs<0)throw new Error('invalid retry delay');
    const item=this.get(id);
    if(!item||item.status!=='leased'||item.lease_owner!==worker||item.attempts!==attempt)throw new Error('stale or unauthorized failure');
    const next=item.attempts>=item.max_attempts?'dead':'pending';
    const changed=this.db.prepare("UPDATE work_items SET status=?,last_error=?,available_at=?,lease_owner=NULL,lease_until=NULL WHERE id=? AND status='leased' AND lease_owner=? AND attempts=?")
      .run(next,String(error),now+delayMs,id,worker,attempt);
    if(changed.changes!==1)throw new Error('concurrent update');
    return this.get(id);
  }
}
