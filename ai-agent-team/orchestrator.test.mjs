import test from 'node:test';
import assert from 'node:assert/strict';
import {TaskStore} from './store.mjs';
import {TeamOrchestrator} from './orchestrator.mjs';
test('schedules work and blocks unverified approval',()=>{
 const s=new TaskStore();try{
 const o=new TeamOrchestrator(s);
 o.submit({id:'flow',objective:'Build safe feature'});
 const w=o.claim('local',{now:1000});
 assert.equal(w.kind,'implement');
 assert.throws(()=>o.complete(w.id,'local',w.attempts,{outcome:'review_approved'}));
 o.complete(w.id,'local',w.attempts,{outcome:'implementation_complete',evidence:{commit:'abc'}});
 const review=o.claim('reviewer',{now:2000});
 assert.equal(review.kind,'review');
 assert.throws(()=>o.complete(review.id,'reviewer',review.attempts,{outcome:'review_approved'}));
 o.complete(review.id,'reviewer',review.attempts,{outcome:'review_approved',evidence:{reviewer:'codex',reviewId:'review-1'}});
 const ci=o.claim('runner',{now:3000});
 assert.equal(ci.kind,'ci');
 assert.throws(()=>o.complete(ci.id,'runner',ci.attempts,{outcome:'ci_passed'}));
 o.complete(ci.id,'runner',ci.attempts,{outcome:'ci_passed',evidence:{conclusion:'success',runId:'run-1'}});
 assert.equal(s.get('flow').status,'awaiting_human_merge_approval');
 assert.equal(o.requestHumanApproval('flow',{approved:true}).status,'done');
 }finally{s.close();}
});
