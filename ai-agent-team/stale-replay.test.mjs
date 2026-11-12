import test from 'node:test';
import assert from 'node:assert/strict';
import {TaskStore} from './store.mjs';
import {TeamOrchestrator} from './orchestrator.mjs';

test('old completed review cannot approve a newer review generation after restart',()=>{
 const s=new TaskStore();
 try{
  const o=new TeamOrchestrator(s);
  o.submit({id:'generation',objective:'Prevent stale replay'});
  let w=o.claim('builder',{now:1000});
  o.complete(w.id,'builder',w.attempts,{outcome:'implementation_complete'});
  w=o.claim('reviewer',{now:2000});
  o.complete(w.id,'reviewer',w.attempts,{outcome:'review_changes_requested'});
  w=o.claim('builder',{now:3000});
  o.complete(w.id,'builder',w.attempts,{outcome:'implementation_complete'});
  assert.equal(s.get('generation').status,'awaiting_review');
  new TeamOrchestrator(s);
  assert.equal(s.get('generation').status,'awaiting_review');
  assert.equal(s.get('generation').attempts,1);
 }finally{s.close();}
});
