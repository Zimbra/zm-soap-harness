---
description: Strict rule to always use .agent folder and never create .agents
---

# Single Agent Directory Rule

**ALWAYS use the `.agent` directory.**
**NEVER create or use an `.agents` directory.**

## Core Guidelines
1. All AI instructions, workflows, and scripts must reside inside the `.agent` folder at the root of the project (`c:\git\zm-soap-harness\.agent`).
2. If you are asked to save something "in memory" or "as a workflow", always save it to `.agent/workflows/`.
3. If an `.agents` folder is ever accidentally created or discovered, immediately move its contents to `.agent/` and delete the `.agents` folder.
