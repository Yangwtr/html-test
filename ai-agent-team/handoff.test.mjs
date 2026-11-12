import test from 'node:test';
import assert from 'node:assert/strict';
import {nextStep,handoffRecord} from './handoff.mjs';
import {progressReport} from './report.mjs';
test('implementation hands off to independent review',()=>{
 assert.deepEqual(nextStep({id:'A',status:'implementation_complete'}),{status:'awaiting_review',owner:'codex',action:'review',requires_tests:true});
});
test('approval cannot bypass CI or human merge approval',()=>{
 assert.equal(nextStep({id:'A',status:'review_approved',ci_passed:false}).owner,'ci');
 assert.equal(nextStep({id:'A',status:'review_approved',ci_passed:true}).status,'awaiting_human_merge_approval');
});
test('repair attempts stop at limit',()=>{
 assert.equal(nextStep({id:'A',status:'ci_failed',attempts:2}).next_attempt,3);
 assert.equal(nextStep({id:'A',status:'ci_failed',attempts:3}).status,'blocked');
});
test('handoff and report preserve unreported tests',()=>{
 const t={id:'A',status:'implementation_complete'};
 const h=handoffRecord(t,nextStep(t));
 assert.equal(h.owner,'codex');
 const report=progressReport([{id:'A',status:'blocked',owner:'human'}]);
 assert.match(report,/Tests: Not reported/);
 assert.match(report,/Blocked: 1/);
});
