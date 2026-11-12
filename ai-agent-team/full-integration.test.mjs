import test from 'node:test';
import assert from 'node:assert/strict';
import {TaskStore} from './store.mjs';
import {TeamOrchestrator} from './orchestrator.mjs';
import {WorkQueue} from './work-queue.mjs';

test('review rejection routes to repair, then independent review',()=>{
 const s=new TaskStore();try{
 const o=new TeamOrchestrator(s);
 o.submit({id:'repair-flow',objective:'Fix issue'});
 let w=o.claim('builder',{now:1000});
 o.complete(w.id,'builder',w.attempts,{outcome:'implementation_complete'});
 w=o.claim('reviewer',{now:2000});
 o.complete(w.id,'reviewer',w.attempts,{outcome:'review_changes_requested',evidence:{reviewer:'codex'}});
 assert.equal(s.get('repair-flow').status,'awaiting_repair');
 assert.equal(s.get('repair-flow').attempts,1);
 w=o.claim('builder',{now:3000});
 assert.equal(w.kind,'repair');
 o.complete(w.id,'builder',w.attempts,{outcome:'implementation_complete'});
 assert.equal(s.get('repair-flow').status,'awaiting_review');
 }finally{s.close();}
});

test('repair attempts stop at three and escalate to human',()=>{
 const s=new TaskStore();try{
 const o=new TeamOrchestrator(s);
 o.submit({id:'repair-limit',objective:'Test limit'});
 let w=o.claim('builder',{now:1000});
 o.complete(w.id,'builder',w.attempts,{outcome:'implementation_complete'});
 for(let i=0;i<4;i++){
  w=o.claim('reviewer',{now:2000+i*2000});
  assert.equal(w.kind,'review');
  o.complete(w.id,'reviewer',w.attempts,{outcome:'review_changes_requested'});
  if(i===3)break;
  assert.equal(s.get('repair-limit').status,'awaiting_repair');
  w=o.claim('builder',{now:3000+i*2000});
  o.complete(w.id,'builder',w.attempts,{outcome:'implementation_complete'});
 }
 assert.equal(s.get('repair-limit').status,'blocked');
 assert.equal(s.get('repair-limit').attempts,3);
 assert.equal(o.claim('builder',{now:20000}),null);
 }finally{s.close();}
});

test('queue never accepts stale completion and dead-letters exhausted lease',()=>{
 const s=new TaskStore();try{
 s.create({id:'lease',objective:'Check retries'},'claude');
 const q=new WorkQueue(s);
 q.enqueue({id:'lease-job',taskId:'lease',kind:'implement',maxAttempts:2});
 const first=q.claim('one',{now:1000,leaseMs:1000});
 const second=q.claim('two',{now:2000,leaseMs:1000});
 assert.equal(second.attempts,2);
 assert.throws(()=>q.complete(first.id,'one',first.attempts));
 assert.equal(q.claim('three',{now:3000}),null);
 assert.equal(q.get('lease-job').status,'dead');
 }finally{s.close();}
});

test('unverified review and CI cannot bypass human gate',()=>{
 const s=new TaskStore();try{
 const o=new TeamOrchestrator(s);
 o.submit({id:'gates',objective:'Check gates'});
 let w=o.claim('builder',{now:1000});
 o.complete(w.id,'builder',w.attempts,{outcome:'implementation_complete'});
 w=o.claim('reviewer',{now:2000});
 assert.throws(()=>o.complete(w.id,'reviewer',w.attempts,{outcome:'review_approved',evidence:{reviewer:'claude',reviewId:'fake'}}));
 o.complete(w.id,'reviewer',w.attempts,{outcome:'review_approved',evidence:{reviewer:'codex',reviewId:'r1'}});
 w=o.claim('ci',{now:3000});
 assert.throws(()=>o.complete(w.id,'ci',w.attempts,{outcome:'ci_passed',evidence:{conclusion:'failure',runId:'r2'}}));
 o.complete(w.id,'ci',w.attempts,{outcome:'ci_passed',evidence:{conclusion:'success',runId:'r2'}});
 assert.equal(s.get('gates').status,'awaiting_human_merge_approval');
 assert.equal(o.requestHumanApproval('gates',{approved:false}).status,'awaiting_human_merge_approval');
 assert.equal(o.requestHumanApproval('gates',{approved:true}).status,'done');
 }finally{s.close();}
});
