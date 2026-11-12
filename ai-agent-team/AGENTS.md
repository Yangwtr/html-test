# Agent collaboration rules

Each agent must work on a separate branch or isolated worktree, avoid changing files owned by another active task, and produce a concise handoff: objective, changed files, test commands, test results, remaining risks.

Claude Code: implement one bounded issue and open a PR.
Codex: independently review the PR diff; identify reproducible issues and propose fixes.
Gemini: research alternatives or implement an independently scoped issue; do not edit the same branch concurrently.
CI: run deterministic checks on each PR.

Do not claim an agent has reviewed a change unless an actual review is recorded. Do not merge, deploy, delete data, purchase API credits, or change repository secrets automatically.

A future orchestrator should track attempt counts per issue and halt after 3 repair attempts. No automated AI-to-AI orchestration is enabled by this file alone.
