import {Controller} from './controller.mjs';
import {WorkQueue} from './work-queue.mjs';
import {evaluateVerification} from './verification.mjs';

// Local deterministic coordinator. No provider credentials, network calls or AI execution.
export class TeamOrchestrator {
  constructor(store){this.store=store;this.controller=new Controller(store);this.queue=new WorkQueue(store);this.recover();}
  submit(task){
    const saved=this.controller.submit(task);
    this.schedule(saved.id);
    return this.store.get(saved.id);
  }
  schedule(id){
    const task=this.store.get(id);
    if(!task)throw new Error('task not found');
    const actions={
      new:['implement',()=>this.controller.advance(id)],
      implementation_complete:['review',()=>this.controller.advance(id)],
      review_approved:['ci',()=>this.controller.advance(id)],
      review_changes_requested:['repair',()=>this.controller.advance(id)],
      ci_failed:['repair',()=>this.controller.advance(id)]
    };
    const waiting={awaiting_implementation:'implement',awaiting_review:'review',awaiting_ci:'ci',awaiting_repair:'repair'};
    if(waiting[task.status]){
      const kind=waiting[task.status];
      const work=this.queue.enqueue({id:`${id}:${task.status}:${task.attempts}`,taskId:id,kind,payload:{owner:kind==='review'?'codex':kind==='ci'?'github-actions':task.owner,stage:task.status}});
      return {task,work};
    }
    const choice=actions[task.status];
    if(!choice)return {task,work:null};
    // State transition is performed before queue insertion, preventing duplicate scheduling.
    const next=choice[1]();
    if(next.status==='blocked'||next.status==='awaiting_human_merge_approval')return {task:next,work:null};
    const kind=choice[0],stage=next.status;
    const work=this.queue.enqueue({id:`${id}:${stage}:${next.attempts}`,taskId:id,kind,payload:{owner:kind==='review'?'codex':kind==='ci'?'github-actions':next.owner,stage}});
    return {task:next,work};
  }
  claim(worker,options){return this.queue.claim(worker,options);}
  // A worker must supply evidence; no arbitrary status strings are accepted.
  complete(id,worker,attempt,{outcome,evidence={}}={}){
    const work=this.queue.get(id);
    if(!work||work.status!=='leased'||work.lease_owner!==worker||work.attempts!==attempt)throw new Error('invalid work lease');
    const task=this.store.get(work.task_id);
    if(!task)throw new Error('task not found');
    const expected={implement:['implementation_complete'],repair:['implementation_complete'],review:['review_approved','review_changes_requested'],ci:['ci_passed','ci_failed']};
    if(!expected[work.kind]?.includes(outcome))throw new Error('invalid work outcome');
    if(work.kind==='review' && outcome==='review_approved' && (evidence.reviewer!=='codex'||!evidence.reviewId))throw new Error('independent review evidence required');
    if(work.kind==='ci' && outcome==='ci_passed' && (evidence.conclusion!=='success'||!evidence.runId))throw new Error('verified CI evidence required');
    // Persist evidence with the task before moving to the next stage.
    this.store.db.exec('BEGIN IMMEDIATE');
    try{
      const latest=this.store.get(task.id);
      const details={...latest.details,evidence:{...(latest.details.evidence||{}),[work.kind]:evidence}};
      this.store.db.prepare('UPDATE tasks SET details=? WHERE id=?').run(JSON.stringify(details),task.id);
      this.queue.complete(id,worker,attempt,{outcome,evidence});
      this.store.db.exec('COMMIT');
    }catch(e){this.store.db.exec('ROLLBACK');throw e;}
    return this.reconcileCompleted(work.id);
  }
  reconcileCompleted(id){
    const work=this.queue.get(id);
    if(!work||work.status!=='completed')throw new Error('work not completed');
    const task=this.store.get(work.task_id),result=JSON.parse(work.result||'{}');
    const expected={implement:'awaiting_implementation',repair:'awaiting_repair',review:'awaiting_review',ci:'awaiting_ci'};
    // Only replay the completion belonging to the current task generation.
    // An older review result must never advance a later review cycle.
    const currentWorkId=`${task.id}:${expected[work.kind]}:${task.attempts}`;
    if(task.status===expected[work.kind] && work.id===currentWorkId){
      if(work.kind==='ci'){
        this.store.setCi(task.id,result.outcome==='ci_passed');
        this.store.transition(task.id,result.outcome==='ci_passed'?'review_approved':'ci_failed',{actor:'recovery',note:result.outcome});
      }else this.controller.recordExternalResult(task.id,result.outcome,{actor:'recovery',note:'replayed completed work'});
    }
    return this.schedule(task.id);
  }
  recover(){
    const completed=this.store.db.prepare("SELECT id FROM work_items WHERE status='completed' ORDER BY rowid").all();
    for(const item of completed)this.reconcileCompleted(item.id);
    for(const task of this.store.list())this.schedule(task.id);
  }
  requestHumanApproval(id,{approved=false}={}){
    const task=this.store.get(id);
    if(!task||task.status!=='awaiting_human_merge_approval')throw new Error('not awaiting human approval');
    if(!approved)return task;
    const e=task.details.evidence||{};
    const gate=evaluateVerification({implementer:task.owner,reviewer:e.review?.reviewer,reviewApproved:!!e.review?.reviewId,ciConclusion:e.ci?.conclusion,securityFindings:e.review?.securityFindings||[],humanApproved:true});
    if(!gate.ready)throw new Error(gate.reasons.join('; '));
    return this.controller.recordExternalResult(id,'done',{actor:'human',note:'explicit approval'});
  }
}
