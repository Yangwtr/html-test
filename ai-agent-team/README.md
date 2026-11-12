# AI-Agent-Team (prototype)

This is a portable prototype of an AI development collaboration workflow. It is isolated on the `AI-Agent-Team` branch of `Yangwtr/html-test` and does not change `main`.

## Roles
- Claude Code: primary implementation, working on a feature branch and opening a pull request.
- GPT Codex: independent review and optional fixes on a separate branch.
- Gemini / Antigravity: research or a separate, non-overlapping task.
- GitHub Actions: deterministic validation without model tokens.

**Current status:** Role assignments are instructions, not active integrations. Claude, Codex and Gemini do not automatically invoke one another here. No API keys or subscription authentication are configured.

## Safety and budget
1. Keep changes on feature branches and submit pull requests.
2. Require successful CI and review before merging; do not auto-merge.
3. Limit AI-assisted repair to at most three attempts per issue; this is a policy to enforce in a future orchestrator, not an active counter.
4. Never expose credentials or grant production deployment permissions to agents.
5. Stop when subscription limits are reached; do not silently fall back to paid APIs.

## Migration
Copy the `ai-agent-team/` directory and `.github/workflows/ai-agent-team-check.yml` to a new private repository. Reconfigure branch protections, secrets and integrations there. This existing repository is public, so do not store secrets here.
