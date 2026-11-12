import test from 'node:test';
import assert from 'node:assert/strict';
import {TaskStore} from './store.mjs';
import {WorkQueue} from './work-queue.mjs';
import {evaluateVerification} from './verification.mjs';
test('deduplicates, leases and rejects stale acknowledgments',()=>{
 const s=new TaskStore(':memory:');try{
 s.create({id:'t',objective:'test'},'claude');const q=new WorkQueue(s);
 q.enqueue({id:'job',taskId:'t',kind:'implement'});q.enqueue({id:'job',taskId:'t',kind:'implement'});
 let a=q.claim('worker1',{now:1000,leaseMs:1000});assert.equal(a.attempts,1);
 assert.equal(q.claim('worker2',{now:1500}),null);
 let b=q.claim('worker2',{now:2000,leaseMs:1000});assert.equal(b.attempts,2);
 assert.throws(()=>q.complete('job','worker1',1));
 assert.equal(q.complete('job','worker2',2).status,'completed');
 assert.equal(q.claim('worker3',{now:4000}),null);
 }finally{s.close();}
});
test('retry limit and dead-letter state',()=>{
 const s=new TaskStore(':memory:');try{
 s.create({id:'t',objective:'test'},'claude');const q=new WorkQueue(s);
 q.enqueue({id:'job',taskId:'t',kind:'review',maxAttempts:2});
 let a=q.claim('w',{now:1000});q.fail('job','w',a.attempts,'error',{now:1000,delayMs:0});
 a=q.claim('w',{now:1001});assert.equal(q.fail('job','w',a.attempts,'error').status,'dead');
 assert.equal(q.claim('w',{now:2000}),null);
 }finally{s.close();}
});
test('requires independent review, actual CI and human approval',()=>{
 assert.equal(evaluateVerification({implementer:'claude',reviewer:'claude',reviewApproved:true,ciConclusion:'success',humanApproved:true}).ready,false);
 assert.equal(evaluateVerification({implementer:'claude',reviewer:'codex',reviewApproved:true,ciConclusion:'pending',humanApproved:true}).ready,false);
 assert.equal(evaluateVerification({implementer:'claude',reviewer:'codex',reviewApproved:true,ciConclusion:'success',humanApproved:true}).ready,true);
});
