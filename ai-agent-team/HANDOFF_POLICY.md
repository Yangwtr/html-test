# Handoff and progress reporting

The `handoff.mjs` state machine is deterministic and has no AI connectors. A task moves from new -> implementation -> independent Codex review -> CI -> human merge approval. Failed CI or requested changes return to the implementer, but only if the repair-attempt guard allows it. At the limit, the task is blocked for human attention.

The `report.mjs` generator produces Markdown summaries from actual task records. It explicitly marks missing test results and risks as not reported rather than inventing successes.

An external scheduler must persist task states and attempt counts, invoke agents using separately authorized tools, and store real test/review outcomes. These files do not launch Claude, Codex or Gemini, send notifications, schedule overnight jobs, or authorize merging. Do not store secrets in this public repository.
