import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTask, canAttempt } from './task-router.mjs';
test('routes specialized tasks', () => {
  assert.equal(routeTask({id:'1',kind:'architecture'}).owner,'claude');
  assert.equal(routeTask({id:'2',kind:'review'}).owner,'codex');
  assert.equal(routeTask({id:'3',kind:'research'}).owner,'gemini');
});
test('fails closed at three repair attempts', () => {
  assert.deepEqual(canAttempt({attempts:3}), {allowed:false,reason:'repair_limit_reached'});
  assert.equal(canAttempt({attempts:2}).remaining,1);
});
test('prevents accidental paid API usage and overlapping edits', () => {
  assert.equal(canAttempt({attempts:0},{requires_paid_api:true}).allowed,false);
  assert.equal(canAttempt({attempts:0,overlaps_active_files:true}).allowed,false);
  assert.equal(canAttempt({attempts:0},{subscription_quota_available:false}).allowed,false);
});
test('requires task id and valid attempts', () => {
  assert.throws(()=>routeTask({kind:'review'}));
  assert.throws(()=>canAttempt({attempts:-1}));
});
