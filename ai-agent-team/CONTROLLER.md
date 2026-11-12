# Controller prototype

Requirements: Node.js 22.5+ with built-in node:sqlite. From repository root:
```sh
node --test ai-agent-team/*.test.mjs
node ai-agent-team/controller.mjs demo
node ai-agent-team/controller.mjs status
```

The demo creates a SQLite database at `ai-agent-team/data/tasks.sqlite` and records task transitions. Set `AI_TEAM_DB` to change its path. Do not commit database files or secrets.

## Current scope
- Durable SQLite tasks and append-only transition event log.
- Deterministic task routing, three-attempt guard, review/CI/human-approval stages.
- CLI demonstration and report generation.
- **No live AI calls, background workers, scheduling, real quota detection, automatic GitHub PR reviews, or credential handling.**
- The `recordExternalResult` API is intended for a *future trusted adapter*; callers must be authenticated and their reported test/review results verified before deployment. Do not expose it as a public HTTP endpoint.
- This is a prototype, not a production security boundary. Persistent DB files are local to the machine running it. GitHub Actions runners are ephemeral.

## Next engineering milestones
1. Verify CI and address any failures.
2. Add verified GitHub PR/CI adapters and durable idempotent job queue with file locking.
3. Add authenticated official CLI adapters separately for each provider where permitted by subscription terms.
4. Enforce approval, spending, and rate limits at the execution boundary.
5. Run on a persistent host with monitoring, backups, and secrets management.
