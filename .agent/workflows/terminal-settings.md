---
description: Terminal settings - always use Git Bash, never PowerShell
---

# Terminal Settings

## Shell
- Always use PowerShell

## Paths
- **ALWAYS use full absolute paths** in all terminal commands (e.g., `c:/git/zm-soap-harness/mocha/tests/...`)
- **NEVER use relative paths** — the CWD may not be what you expect
- When running `node -c`, `npx mocha`, or any other command, use the full path to the file
- The Cwd for run_command should be `c:\git\zm-soap-harness` (project root), NOT a subdirectory

## Examples
```bash
# CORRECT - full absolute paths
node -c c:/git/zm-soap-harness/mocha/tests/folders/folder-action.js

# WRONG - relative paths that break when CWD is unexpected
node -c mocha/tests/folders/folder-action.js
```