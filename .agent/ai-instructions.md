---
description: Main AI guidelines and rules for the Zimbra SOAP Harness project
---

# 🤖 AI Agent System Instructions

> **CRITICAL**: Before starting ANY work in the `zm-soap-harness` project, you MUST review these guidelines and the referenced markdown documents. 

Welcome to the **Zimbra SOAP Harness** project. This is a massive legacy test suite being migrated from XML to JavaScript (Mocha). Consistency, strict formatting, and architectural adherence are absolutely paramount.

## Directory Structure Overview
The `.agent` directory is professionally organized to provide you with all necessary context. **CRITICAL: NEVER create or use a `.agents` folder. All agent files go in `.agent`.**

*   **`ai-instructions.md`**: (This file) The main entry point for AI agents.
*   **`project-overview.md`**: High-level architecture, CI/CD, dependencies, and execution instructions. Read this to understand what Zimbra SOAP Harness *is*.
*   **`scripts/`**: Contains utility scripts used for bulk modifications, fixing assertions, fixing tabs, or generating gap analysis reports. **RULE:** All scripts here MUST use the `.cjs` extension (CommonJS) because the project is `"type": "module"`. Never use `.js` for automation scripts to avoid `require` errors.
*   **`workflows/`**: 
    *   **`xml-to-js-migration.md`**: Strict rules for migrating XML tests to JS tests. **Read this before writing or modifying any JavaScript tests.**
    *   **`formatting-rules.md`**: Step-by-step commands you can auto-execute.

## 🚨 Strict Test & Migration Guidelines 🚨

Whenever the user asks you to migrate tests, fix failing tests, or write new tests, you **MUST MUST MUST** adhere to the following principles. No exceptions.

0.  **NO GIT COMMITS**: You are strictly forbidden from running `git commit`, `git push`, or `git add`. The user handles all version control manually. Do the work, run the tests, and stop.
1.  **Tab Indentation ONLY**: Every line of JavaScript code must be indented with tabs. **NEVER use spaces.** This includes template literals containing XML strings, multi-line conditionals, and arrays.
2.  **Strict 1:1 Mapping**: Every `.xml` file gets exactly ONE `.js` file. Every non-excluded `<t:test_case>` gets exactly ONE `it()` block. Do not combine tests silently.
3.  **Excluded Tests**: Discard XML cases with `type="always"`, `type="deprecated"`, `testcaseid="Ping"`, or `setup`. These are NOT tests.
4.  **Formatting Rules**: 
    *   Exactly 2 blank lines between every `it()` block.
    *   MANDATORY `// Applicable zimbra versions` block and exactly one `// Tests` comment before the first `it()`.
    *   NO single-line SOAP XML. Always expand SOAP payloads onto multiple indented lines.
5.  **Multi-Step Assertions**: Never just check `assert.exists(res.Response)`. Always drill down into the response tree matching the XML `t:select path` and validate exact attributes.
6.  **Failures & Faults**: Always check for faults FIRST (`assert.notExists(res.Fault, ...)`). If the test *expects* a fault, pass `false` as the third parameter to the SOAP wrapper (`makeSOAPEnvelope*(..., ..., false)`) to prevent auto-retrying.
7.  **Format Afterwards**: Always run the formatting scripts from `.agent/scripts` or run `npx eslint --fix` after touching files.
8.  **Missing Tests = Migrate**: If any `t:select` assertion or any smoke, sanity, functional, or regression test from an XML file is missing its JS counterpart, **create the JS file and migrate the test with full 1:1 parity**. Do NOT skip or ignore missing tests. Follow the `/xml-to-js-migration` and `/xml-to-js-assertions` workflows.
By strictly following these references, you ensure the CI builds pass and the project retains a consistent, maintainable legacy upgrade path.
