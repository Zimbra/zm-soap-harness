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
4. **NEVER use `/tmp/` or any temporary directory** for scripts or data files. `/tmp` does not work on Windows. Always save them to `.agent/scripts/` instead.
5. When moving scripts from the project root (e.g. `mocha/`) to `.agent/scripts/`, update any `__dirname`-relative paths accordingly.
6. **ALWAYS use FULL ABSOLUTE PATHS** when running commands (e.g. `node c:/git/zm-soap-harness/.agent/scripts/my-script.cjs`). Never use relative paths for scripts — the user's CWD may vary.
7. When saving data files for tests, use `mocha/data/` — never use `data/testmailraw/`.
