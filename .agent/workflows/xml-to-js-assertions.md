---
description: Verify and fix JS test assertions by cross-referencing original XML test files for 1:1 parity
---

# XML Assertion Cross-Verification — Strict Workflow

> [!CAUTION]
> This is the **#1 MUST RULE** for the entire project. Every JS test file's assertions MUST be verified against the original XML test file's `<t:select>` nodes. No exceptions.

> [!CAUTION]
> **THUMBRULE: NO NEW FOLDERS. NO NEW FILES.**
> The entire XML-to-JS migration is **already complete** — every folder and every file already exists with 1:1 structural parity (1 XML folder = 1 JS folder, 1 XML file = 1 JS file). The **ONLY** work in this exercise is to add missing `<t:select>` assertions into the **existing** JS files. Do NOT create any new folder. Do NOT create any new file. Zero exceptions.

## When to Use
- When the user says "strengthen assertions" or "verify assertions" for a folder/module
- When the user provides a folder path for assertion work
- Before considering any JS file "complete" for assertion coverage

## Process (Per JS File)

### Step 1: Locate the Corresponding XML File
- JS files live in `mocha/tests/<module>/...`
- XML files live in `data/soapvalidator/<module>/...`
- Match by test name/subject (e.g., `cancel-meeting-request-basic.js` ↔ `cancel-meeting-request-basic.xml`)
- If the XML file cannot be found, search with `find` or `grep` using the test subject or filename

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

### Step 6: Verify
- Run the file's test(s) to confirm no regressions
- If running a batch, run the module's tests after completing all files in the folder

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

**All mismatches, skipped items, unresolvable tests, and TODOs MUST be appended to:** `.agent/xml-to-js-assertions.txt`

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
