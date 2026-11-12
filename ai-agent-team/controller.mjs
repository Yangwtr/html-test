import {TaskStore} from './store.mjs';
import {routeTask,canAttempt} from './task-router.mjs';
import {nextStep} from './handoff.mjs';
import {progressReport} from './report.mjs';
import {fileURLToPath} from 'node:url';
const dbPath=process.env.AI_TEAM_DB||'./ai-agent-team/data/tasks.sqlite';
export class Controller {
 constructor(store=new TaskStore(':memory:')){this.store=store;}
 submit(task){const route=routeTask(task);return this.store.create(task,route.owner);}
 advance(id,options={}){
  const t=this.store.get(id);if(!t)throw new Error('task not found');
  const decision=nextStep({...t,implementer:t.owner},options);
  // Explicit human authorization required for merge. No external agent is launched here.
  if(decision.action==='repair'){
   const gate=canAttempt(t,options);
   if(!gate.allowed)return this.store.transition(id,'blocked',{note:gate.reason});
  }
  return this.store.transition(id,decision.status,{note:decision.action,incrementAttempt:decision.action==='repair'});
 }
 recordExternalResult(id,status,{actor='external',note=''}={}){
  const permitted={
   awaiting_implementation:['implementation_complete'],
   awaiting_review:['review_approved','review_changes_requested'],
   awaiting_ci:['ci_failed','review_approved'],
   awaiting_repair:['implementation_complete'],
   awaiting_human_merge_approval:['done']
  };
  const current=this.store.get(id);if(!current)throw new Error('task not found');
  if(!permitted[current.status]?.includes(status))throw new Error('invalid transition');
  if(status==='done'&&actor!=='human')throw new Error('human merge approval required');
  return this.store.transition(id,status,{actor,note});
 }
 report(){return progressReport(this.store.list().map(t=>({id:t.id,status:t.status,owner:t.owner,summary:t.objective,test_results:t.details.test_results||[],open_risks:t.details.open_risks||[],next_action:'Review current state'})));}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const store=new TaskStore(dbPath),ctl=new Controller(store),command=process.argv[2];
 try{
  if(command==='demo'){const id='demo-'+Date.now();console.log(JSON.stringify(ctl.submit({id,kind:'implementation',objective:'Demonstrate local task persistence'}),null,2));console.log(JSON.stringify(ctl.advance(id),null,2));}
  else if(command==='status')console.log(ctl.report());
  else console.log('Usage: node controller.mjs demo|status; no agents are invoked');
 }finally{store.close();}
}
