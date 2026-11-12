// Deterministic task router; no model/API calls.
export function routeTask(task) {
  if (!task || typeof task !== 'object' || typeof task.id !== 'string' || !task.id.trim()) throw new Error('task.id required');
  const kind = String(task.kind || 'implementation').toLowerCase();
  const routes = {
    architecture: 'claude', refactor: 'claude', implementation: 'claude',
    review: 'codex', debugging: 'codex', tests: 'codex',
    research: 'gemini', exploration: 'gemini', browser: 'gemini', ui_research: 'gemini'
  };
  const owner = routes[kind] || 'claude';
  return { task_id: task.id, kind, owner, status: 'proposed', acceptance_criteria: Array.isArray(task.acceptance_criteria) ? task.acceptance_criteria : [], requires_human_approval: true };
}
export function canAttempt(task, limits = {}) {
  const attempts = Number(task?.attempts ?? 0);
  const maxAttempts = Number(limits.max_repair_attempts ?? 3);
  if (!Number.isInteger(attempts) || attempts < 0 || !Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error('invalid attempt count');
  if (attempts >= maxAttempts) return { allowed: false, reason: 'repair_limit_reached' };
  if (limits.subscription_quota_available === false) return { allowed: false, reason: 'subscription_quota_unavailable' };
  if (limits.requires_paid_api === true) return { allowed: false, reason: 'paid_api_requires_approval' };
  if (task?.overlaps_active_files === true) return { allowed: false, reason: 'file_ownership_conflict' };
  return { allowed: true, remaining: maxAttempts - attempts };
}
