import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TaskStore} from './store.mjs';
import {Controller} from './controller.mjs';
test('persists task and auditable events across restarts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ai-team-')),path=join(dir,'tasks.sqlite');
 try{
  let db=new TaskStore(path),ctl=new Controller(db);
  ctl.submit({id:'t1',kind:'research',objective:'Investigate options'});
  ctl.advance('t1');
  assert.equal(db.get('t1').owner,'gemini');db.close();
  db=new TaskStore(path);assert.equal(db.get('t1').status,'awaiting_implementation');assert.equal(db.events('t1').length,2);db.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('external results cannot skip states or human approval',()=>{
 const db=new TaskStore(),ctl=new Controller(db);
 ctl.submit({id:'t2',objective:'Build feature'});
 assert.throws(()=>ctl.recordExternalResult('t2','done'));
 ctl.advance('t2');ctl.recordExternalResult('t2','implementation_complete');
 ctl.advance('t2');ctl.recordExternalResult('t2','review_approved');
 ctl.advance('t2');assert.equal(db.get('t2').status,'awaiting_ci');
 assert.throws(()=>ctl.recordExternalResult('t2','done'));
 db.close();
});
test('report does not invent tests',()=>{const db=new TaskStore(),ctl=new Controller(db);ctl.submit({id:'t3',objective:'Write docs'});assert.match(ctl.report(),/Not reported/);db.close();});
