import test from 'node:test';
import assert from 'node:assert/strict';
import {TaskStore} from './store.mjs';
import {TeamOrchestrator} from './orchestrator.mjs';

test('restart repairs missing queue insertion without duplicates',()=>{
 const s=new TaskStore();
 try{
  const a=new TeamOrchestrator(s);
  a.controller.submit({id:'crash1',objective:'Recover task'});
  a.controller.advance('crash1'); // simulated crash before enqueue
  const b=new TeamOrchestrator(s);
  assert.equal(b.claim('worker',{now:1000}).kind,'implement');
  assert.equal(new TeamOrchestrator(s).queue.get('crash1:awaiting_implementation:0').attempts,1);
 }finally{s.close();}
});

test('restart replays acknowledged work without repeating execution',()=>{
 const s=new TaskStore();
 try{
  const a=new TeamOrchestrator(s);
  a.submit({id:'crash2',objective:'Recover handoff'});
  const work=a.claim('worker',{now:1000});
  s.db.prepare("UPDATE tasks SET details=? WHERE id=?").run(JSON.stringify({evidence:{implement:{commit:'abc'}}}),'crash2');
  a.queue.complete(work.id,'worker',work.attempts,{outcome:'implementation_complete',evidence:{commit:'abc'}});
  const b=new TeamOrchestrator(s);
  assert.equal(s.get('crash2').status,'awaiting_review');
  assert.equal(b.claim('reviewer',{now:2000}).kind,'review');
  const c=new TeamOrchestrator(s);
  assert.equal(s.get('crash2').status,'awaiting_review');
  assert.equal(c.queue.get(work.id).status,'completed');
 }finally{s.close();}
});
