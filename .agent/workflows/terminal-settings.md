---
description: Terminal settings - always use Git Bash, never PowerShell
---

# Terminal Settings

## Shell Preference
- **ALWAYS** use Git Bash (bash) for all terminal commands
- **NEVER** use PowerShell
- If commands hang or fail to execute, ask the user to run them manually in their Git Bash terminal

## Running Scripts
- All `.agent/scripts/*.cjs` and `.agent/scripts/*.mjs` scripts should be run via `node` in Git Bash
- For long-running test suites (`node mocha-run.js`), prefer asking the user to run in their terminal
