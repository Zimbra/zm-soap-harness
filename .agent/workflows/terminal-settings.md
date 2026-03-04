---
description: Terminal settings - always use Git Bash, never PowerShell, no piping
---

# Terminal Settings

## Shell
- Always use **Git Bash** (the user is on Windows with Git Bash)
- **NEVER use PowerShell**

## Paths
- **ALWAYS use full absolute paths** in all terminal commands (e.g., `c:/git/zm-soap-harness/mocha/tests/...`)
- **NEVER use relative paths** — the CWD may not be what you expect
- When running `node -c`, `npx mocha`, or any other command, use the full path to the file
- The Cwd for run_command should be `c:\git\zm-soap-harness` (project root), NOT a subdirectory

## No Piping — CRITICAL RULE

> [!CAUTION]
> **NEVER use pipe operators (`|`) in Git Bash on Windows.**
> Piping causes `stdout is not a tty` errors. This applies to ALL pipes including:
> - `| head`
> - `| tail`
> - `| grep`
> - `| tee`
> - `| wc`
> - `2>&1 | head`
> - Any other `| <command>` combination

- If you need to limit output, use the tool's own flags (e.g., `--max-count` for grep) or the `OutputCharacterCount` parameter in `command_status`
- If you need to redirect output to a file, use `>` or `>>` (these are NOT pipes and are safe)
- If you need to search output, run the command first, then use `grep_search` on the output file

## Examples
```bash
# CORRECT - full absolute paths, no pipes
node c:/git/zm-soap-harness/.agent/scripts/report-xml-to-js-assertions.cjs contacts
node -c c:/git/zm-soap-harness/mocha/tests/folders/folder-action.js

# CORRECT - redirect to file instead of piping
node c:/git/zm-soap-harness/.agent/scripts/report-xml-to-js-assertions.cjs contacts > c:/git/zm-soap-harness/tmp-output.txt

# WRONG - relative paths
node -c mocha/tests/folders/folder-action.js

# WRONG - piping (causes "stdout is not a tty" on Windows Git Bash)
node script.cjs contacts 2>&1 | head -120
cat file.txt | grep "pattern"
command | tail -20
```