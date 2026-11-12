# Task allocation and quota policy

## Task contract
Each task records: id, kind, objective, acceptance criteria, affected files, assigned agent, branch, attempts, test results, estimated effort, and next handoff. The router currently returns a proposed owner; it does **not** launch any agent.

## Routing
Architecture, refactor, implementation -> Claude.
Review, debugging, tests -> Codex.
Research, exploration, browser/UI investigation -> Gemini.
The default is Claude, subject to human review. Use CI for deterministic validation.

## Token/cost guardrails
- Pass a concise diff and failing test output, not a whole repository, unless broader context is needed.
- Avoid repeated full-repository reads and duplicate simultaneous assignments.
- Limit AI repair attempts to 3 per issue. Stop and escalate afterward.
- If a subscription quota is unavailable, pause; never silently substitute a paid API.
- Do not store subscription credentials, tokens, or secrets in this public repository.
- Never merge, deploy, delete, or incur charges without explicit approval.

## Status and scope
The `task-router.mjs` module provides deterministic routing and a pure guard function. An eventual orchestrator must persist attempt counters, check real quotas, and invoke `canAttempt` before each run. This repository does not currently have a cross-provider scheduler or live API integrations.
