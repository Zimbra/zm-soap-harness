---
description: Verify and fix JS test assertions by cross-referencing original XML test files for 1:1 parity
---

# XML Assertion Cross-Verification — Strict Workflow

> [!CAUTION]
> This is the **#1 MUST RULE** for the entire project. Every JS test file's assertions MUST be verified against the original XML test file's `<t:select>` nodes. No exceptions.

> [!CAUTION]
> **THUMBRULE: COMPLETE ONE MODULE BEFORE MOVING TO NEXT.**
> NEVER move to the next module/folder until the current module passes with ZERO real issues:
> 1. Run `node .agent/scripts/report-xml-to-js-assertions.cjs <module>` — all test counts must match, all t:select assertions covered, zero weak patterns
> 4. Fix every single gap, re-run all scripts, confirm zero remaining
> 5. Only THEN move to the next module

> [!CAUTION]
> **THUMBRULE: ALWAYS INCLUDE ALL SUBFOLDERS IN SCOPE.**
> When working on a module (e.g., `contacts`), you MUST process ALL files — root-level AND every subfolder (e.g., `attachments/`, `autocomplete/`, `bugs/`, `gal/`, `mail/`, `sharing/`, `tags/`). Never ask the user "shall I continue with subfolders?" — they are part of the module. Process everything in one sweep, fixing every file with assertion gaps (❌ GAP in `report-xml-to-js-assertions.cjs` output).

> [!CAUTION]
> **THUMBRULE: USE `report-xml-to-js-assertions.cjs` AS THE PRIMARY GAP FINDER.**
> The `report-xml-to-js-assertions.cjs` script compares raw JS assertion count vs XML `t:select` count per file. Use it to identify gaps:
> - **❌ GAP (N)** — Must fix. N assertions are missing. Read the XML, identify every missing `t:select` node, add the JS assertion.
> - **✅** — File is at 100% parity. No action needed.
> Target: **100% parity** — every `t:select` in eligible test cases (smoke, sanity, functional, regression) AND their setup/before sections MUST have a corresponding JS assertion.


> [!CAUTION]
> **THUMBRULE: EVERY JS FILE HAS AN XML COUNTERPART. FIND IT. IF NOT FOUND, MIGRATE IT.**
> Before starting any assertion work on a folder, you MUST build an **explicit 1:1 mapping table** pairing every JS file to its exact XML file path. If the name doesn't match exactly (e.g., `multihost/multihost-auth-basic.js` ↔ `Multihost/Multihost-Auth-Basic.xml`), search the XML folder tree until you find it. Never assume a file is "clean" or "no unique selects" without reading the **correct** XML file.

> [!CAUTION]
> **THUMBRULE: MISSING JS FILE? CREATE IT. MISSING JS FOLDER? CREATE IT. NO EXCEPTIONS.**
> During this assertion-strengthening exercise, if you discover that an XML file in `data/soapvalidator/` has **no corresponding JS file** in `mocha/tests/`, you MUST:
> 1. **Create the JS file** (and folder if needed) following the `/xml-to-js-migration` workflow
> 2. **Migrate every smoke, sanity, functional and regression test** from the XML to JS with **full 1:1 parity**
> 3. **Do NOT skip, ignore, or log as MISMATCH** — every XML test MUST have a JS equivalent
> 4. The newly created JS file must follow all `/formatting-rules` and `/naming-convention` workflows
>
> This applies to BOTH directions: if a JS file exists without an XML match, find the XML. If an XML file exists without a JS match, **create the JS file and migrate it**.

> [!CAUTION]
> **THUMBRULE: NEVER ASK — JUST FIX IT.**
> When you find assertion gaps, stub files, or missing tests, do NOT ask the user for permission or confirmation before fixing. Just do the full rewrite immediately. This includes:
> - Stub files that need full rewrites (e.g., GAP(59) → full rewrite, not a question)
> - Missing assertions that need adding
> - Missing test cases that need migrating
> - Any gap identified by `report-xml-to-js-assertions.cjs`
>
> The user has explicitly stated: **"just do it"** — no proposals, no plans, no confirmations. Fix it and verify it.

> [!CAUTION]
> **THUMBRULE: FIX EVERYTHING IN ONE SHOT — TESTS AND ASSERTIONS TOGETHER.**
> When fixing a JS file, do NOT fix only assertions or only test names — rewrite the ENTIRE file in a single pass:
> 1. **Correct test names** — every `it()` must use the verbatim `t:objective` from the XML
> 2. **Correct test count** — every eligible XML `t:test_case` must have a corresponding `it()` block
> 3. **All assertions** — every `t:select` node must have a corresponding JS assertion
> 4. **Correct setup** — the `before()` hook must match the XML setup (contacts, accounts, folders, etc.)
> 5. **Never iterate** — do NOT fix one aspect and come back for another. One rewrite = done.

> [!CAUTION]
> **THUMBRULE: DATA-DRIVEN TEST FILES — ADD TO `DATA_DRIVEN_SKIP` IN REPORT SCRIPT.**
> When a JS file uses a data-driven approach (loop + helper function with assertions), static assertion counting cannot capture the true runtime count. For these files:
> 1. Write the JS file using clean data-driven patterns (array of test cases + `for...of` loop + helper function)
> 2. Add the file's relative path to `DATA_DRIVEN_SKIP` in `report-xml-to-js-assertions.cjs`
> 3. The file will be completely excluded from both JS and XML gap analysis and counted as passing

> [!CAUTION]
> **THUMBRULE: ONLY COUNT ASSERTIONS FROM ELIGIBLE TEST CASE TYPES (WHITELIST APPROACH).**
> When calculating assertion gaps (both in the report script and manually), use a **WHITELIST** — ONLY include `t:select` nodes from:
> - XML test cases with type: **smoke**, **sanity**, **functional**, **regression**
> - **before** suite setup sections (content before the first `t:test_case` block)
>
> EXCLUDE **ALL OTHER TYPES** — this includes but is not limited to:
> - `always`, `setup`, `deprecated`, `ping`, `tbd`, `q4fix`, `bhr`, `exclude`, commented-out XML code
>
> This applies to BOTH the JS assertion count AND the XML assertion count when computing parity %.


> [!CAUTION]
> **THUMBRULE: DO NOT RUN ESLINT DURING ASSERTION FIXES.**
> Skip `eslint --fix` while working on fixing assertion gaps. It wastes time and is not needed for assertion parity work. Only run formatting tools at the very end if explicitly requested by the user.


> [!CAUTION]
> **THUMBRULE: BUILD THE MAPPING TABLE FIRST — BEFORE ANY ASSERTION WORK.**
> For each folder the user gives you:
> 1. List ALL JS files in `mocha/tests/<module>/<subfolder>/`
> 2. List ALL XML files in `data/soapvalidator/<Module>/<Subfolder>/`
> 3. Build an explicit table: `JS file → XML file (full path)`
> 4. Names may differ in casing, hyphens vs dots, or abbreviations — match by content/subject if name matching fails
> 5. Flag any unpaired items immediately — do NOT start checking assertions until the map is 100% complete
> 6. Only after the mapping is confirmed, proceed to Step 2 (read XML `<t:select>` nodes)

> [!CAUTION]
> **THUMBRULE: CHECK ALL `<t:select>` NODES — NEVER FILTER ANY OUT.**
> Every single `<t:select>` node in the XML MUST be verified against the JS, including those in setup/before blocks (`test_case type="always"`, `Ping`, `account_setup`). **Do NOT use `grep -v` to exclude patterns like `CreateAccountResponse`, `zimbraMailHost`, `authToken`, `lifetime`, or `PingResponse`** — these patterns with `set=` or `match=` require explicit assertions in JS. Specifically:
> - `CreateAccountResponse/account attr="id" set=` → JS must extract `account.id` and assert it
> - `CreateAccountResponse/account/a[@n="zimbraMailHost"] set=` → JS must extract and assert `zimbraMailHost` exists
> - `AuthResponse/lifetime match="^\d+$"` → JS must assert `lifetime` is numeric
> - `AuthResponse/authToken set=` → JS must assert authToken exists
> - `AuthResponse/session set=` → JS must assert session exists
> **The only patterns that can be skipped are `PingResponse` (always assumed working) and XML comments (`<!-- -->`).**

## When to Use
- When the user says "strengthen assertions" or "verify assertions" for a folder/module
- When the user provides a folder path for assertion work
- Before considering any JS file "complete" for assertion coverage

## Process (Per JS File)

### Step 1: Build Explicit JS↔XML Mapping Table
- List all JS files in the target folder under `mocha/tests/<module>/`
- List all XML files in the corresponding folder under `data/soapvalidator/<Module>/`
- Create a 1:1 mapping table pairing each JS file to its XML counterpart
- **Names may differ** — match by subject/content if filenames don't align exactly
- If a JS subfolder exists (e.g., `multihost/`), find the matching XML subfolder (e.g., `Multihost/`)
- **Every JS file MUST have an XML match** — if not found after exhaustive search, log as MISMATCH

### Step 2: Read Every `<t:select>` Node in the XML
- Each `<t:select>` node represents a validation the original test performed
- Pay attention to:
  - `path` — the XPath to the response element
  - `attr` — the specific attribute being validated
  - `match` — the expected value (if any)
  - `set` — the variable being captured (implies the value is used later)
  - `emptyset="1"` — expects the element to NOT exist

### Step 3: Map Each `<t:select>` to a JS Assertion

| XML Pattern | JS Equivalent |
|-------------|---------------|
| `<t:select path="//ns:Response/ns:element" attr="id" set="var"/>` | `const var = res.Response.element[0].id; assert.exists(var, '...');` |
| `<t:select path="//ns:Response" attr="attrName" match="value"/>` | `assert.equal(res.Response.attrName, 'value', '...');` |
| `<t:select path="//ns:element" emptyset="1"/>` | `assert.notExists(res.Response.element, '...');` |
| `<t:select path="//ns:Response"/>` (no attr/match) | `assert.notExists(res.Fault, '...'); // guard` + assert on child elements |
| `<t:select path="..." attr="a" set="var"/>` (captured but no match) | Extract into variable + `assert.exists(var, '...');` |

### Step 4: Compare XML `<t:select>` Nodes vs Existing JS Assertions
- For each `<t:select>` node, check if the JS file has a corresponding assertion
- Mark as:
  - ✅ Covered — JS has an equivalent assertion
  - ❌ MISSING — JS has no corresponding assertion (MUST ADD)
  - ⚠️ WEAK — JS extracts the value but doesn't assert on it, or uses bare parent assertion

### Step 5: Fix Gaps
- Add missing assertions for every ❌ item
- Strengthen every ⚠️ item per `/strengthen-assertions` workflow rules
- Follow Array-safe access patterns: `const x = Array.isArray(res.X) ? res.X[0] : res.X;`
- All assertion syntax must comply with `/strengthen-assertions` rules

### Step 6: Verify with All Three Scripts
- Run `node .agent/scripts/report-xml-to-js-assertions.cjs <module>` — all test counts must match, all files ≥70% ratio, zero weak patterns
- Fix any remaining gaps revealed by these scripts, then re-run until clean

## Key Rules

1. **`<t:select>` with `set=` implies extraction + assertion** — even if the XML only "sets" a variable, the JS must extract AND assert its existence
2. **`<t:select>` with `match=` requires `assert.equal()`** — never just `assert.exists()`
3. **`<t:select>` with `emptyset="1"` requires `assert.notExists()`** — this is a negative assertion
4. **Nested `<t:select>` within `<t:select>`** — means the assertion path is hierarchical (e.g., `GetMsgResponse/m/inv/comp/s`)
5. **`<t:select path="..." attr="...">`** — the `attr` is a property on the element, not a child element
6. **Setup steps (Ping, acct_setup) have `<t:select>` too** — these capture IDs/tokens. The JS equivalent is asserting on `account[0].id` etc.
7. **`zimbraMailHost` captures** — XML often captures `a[@n="zimbraMailHost"]` for multinode. The JS should also capture and assert this where present in the XML

## Mismatch Handling

> [!CAUTION]
> **If a folder or file parity mismatch is found — STOP and LOG. Do NOT create anything.**

- **XML file exists but no matching JS file** → Log as `MISMATCH` and skip. Do NOT create the JS file.
- **JS file exists but no matching XML file** → Log as `SKIPPED` and skip. Cannot verify without XML source.
- **Folder structure mismatch** → Log as `MISMATCH` and report to user.
- **Ambiguous XML pattern** → Log as `TODO` with details for manual review.

## Phase 2 Log File

**All mismatches, skipped items, unresolvable tests, and TODOs MUST be appended to:** `.agent/scripts/report-xml-to-js-assertions.txt`

**Log EVERYTHING that couldn't be completed:**
- File/folder mismatches (XML with no JS, JS with no XML)
- Individual tests where an assertion couldn't be added (with reason)
- Ambiguous XML patterns needing manual review
- Any item requiring user decision

**Format:**
```
[YYYY-MM-DD] FOLDER: <folder path>
  MISMATCH:  <XML file> has no JS counterpart
  SKIPPED:   <JS file> has no XML source
  COULD_NOT: <JS file> — test "<test name>" — <reason assertion couldn't be added>
  TODO:      <file> — <reason for manual review>
```

**Punch-list workflow:**
1. During sweep → log every unresolvable item
2. After each phase → review log, fix logged items
3. Remove entries as they get resolved
4. **When the log is empty → project is complete**

## Relationship to Other Workflows
- **`/strengthen-assertions`** — covers assertion FORMAT rules (no bare parents, no if/else, child element checks). Use it for HOW to write assertions.
- **This workflow** — covers assertion COMPLETENESS by cross-referencing XML. Use it for WHAT to assert.
- **`/xml-to-js-migration`** — covers the full migration process. This workflow is the assertion verification subset.
