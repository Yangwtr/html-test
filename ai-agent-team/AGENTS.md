# Evidence-based AI Agent task routing (2026-11-12)

This file defines *recommended routing*, not a claim of benchmark superiority. Reassess with actual project results. All three products can code, review, and research.

## Claude Code — primary implementation and architecture
Preferred for multi-file feature implementation, refactoring, architectural decisions, and context-heavy code changes. Claude Code supports specialized subagents, but extra agents consume additional quota. Work on a feature branch, commit bounded changes, and hand off a PR with tests and risks.

## GPT Codex — independent review, debugging and cloud coding
Preferred for a separate review of pull-request diffs, bug reproduction, test creation, security-focused findings and isolated cloud coding tasks. Codex Cloud can continue while a user's computer is asleep *when a cloud environment is configured*. GitHub automatic review must be enabled separately in Codex settings. Reviewers should not approve their own unverified fixes.

## Gemini / Google Antigravity — exploration and parallel isolated tasks
Preferred for codebase exploration, browser/UI investigation, documentation research, and clearly scoped parallel work. Antigravity supports research and browser subagents and isolated Git worktrees. Do not run overlapping edits in the same branch. Google AI Pro entitlement and model quotas must be checked in the user's account; no Gemini API billing is assumed.

## GitHub Actions — deterministic verification
Use lint, unit tests, build, type checks, and security scans as applicable. Avoid calling an LLM for a check that can be automated deterministically. The current workflow only checks documentation presence, not application correctness.

## Routing and handoffs
1. Define a small task with acceptance criteria.
2. Route architecture and multi-file feature work to Claude; independent PR review and focused debugging to Codex; research/UI investigation or isolated parallel tasks to Gemini.
3. Run CI before and after review. If tests fail, return reproducible logs to the implementing agent.
4. Use at most three AI repair attempts per issue **once a real orchestrator enforces this**. The rule alone is not an executable limit.
5. Require passing CI and independent review before a human-authorized merge. Never auto-deploy, change secrets, or incur API charges without explicit approval.
6. Keep each handoff concise: task, commit/PR, changed files, tests, unresolved risks, next owner.
7. Do not assume subscription quotas are pooled or that third-party schedulers may use consumer subscription credentials as APIs. If an agent hits its quota, pause or manually route work to an independently authorized product; do not silently pay for API calls.

## Integration status
These are documented policies only. No live cross-provider agent invocation, automatic quota switching, cloud scheduler, or automatic three-attempt counter has been installed. Repository is public: do not commit credentials.

## Official documentation
- Claude Code subagents: https://academy.claude.com/courses/introduction-to-subagents/creating-a-subagent
- Codex Cloud: https://help.openai.com/en/articles/20001545-using-codex-cloud
- Codex GitHub review: https://learn.chatgpt.com/docs/third-party/github
- Antigravity subagents: https://antigravity.google/docs/subagents
