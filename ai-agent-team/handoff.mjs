import {routeTask,canAttempt} from './task-router.mjs';
// Pure state transition engine: does not call external AI services.
export function nextStep(task, limits={}) {
 if(!task || !task.id) throw new Error('task.id required');
 const state=task.status||'new';
 if(state==='new') return {status:'awaiting_implementation',owner:routeTask(task).owner,action:'implement'};
 if(state==='implementation_complete') return {status:'awaiting_review',owner:'codex',action:'review',requires_tests:true};
 if(state==='review_approved' && task.ci_passed===true) return {status:'awaiting_human_merge_approval',owner:'human',action:'approve_merge'};
 if(state==='review_approved') return {status:'awaiting_ci',owner:'ci',action:'run_tests'};
 if(state==='review_changes_requested'||state==='ci_failed'){
   const gate=canAttempt(task,limits);
   if(!gate.allowed) return {status:'blocked',owner:'human',action:'escalate',reason:gate.reason};
   return {status:'awaiting_repair',owner:task.implementer||'claude',action:'repair',next_attempt:Number(task.attempts||0)+1};
 }
 if(state==='blocked'||state==='awaiting_human_merge_approval'||state==='done') return {status:state,owner:'human',action:'wait'};
 throw new Error('unsupported task status: '+state);
}
export function handoffRecord(task,transition){
 return {task_id:task.id,from:task.status||'new',to:transition.status,owner:transition.owner,action:transition.action,branch:task.branch||null,changed_files:task.changed_files||[],test_results:task.test_results||[],open_risks:task.open_risks||[],timestamp:task.timestamp||null};
}
