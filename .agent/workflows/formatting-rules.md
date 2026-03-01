---
description: Strict formatting rules for all mocha test files
---

# JavaScript Test Formatting Rules

> [!CAUTION]
> ## 🚨 #1 RULE — TABS ONLY, ZERO SPACES 🚨
> **EVERY LINE of generated JS code MUST use TAB characters for indentation. NEVER output spaces for indentation — not even inside template literals or SOAP XML strings.** This is the SINGLE MOST IMPORTANT formatting rule. After EVERY file creation or modification, you MUST run `npx eslint --fix "path/to/file.js"` from the `mocha/` directory to auto-fix any remaining space indentation. FAILURE TO DO THIS IS UNACCEPTABLE.

> [!CAUTION]
> **NEVER use `npx mocha` to run tests.** ALWAYS use `node mocha-run.js` from the `mocha/` directory. Examples:
> - `node mocha-run.js tests/ews/bug-106156.js` — run a single file
> - `node mocha-run.js tests/ews` — run all files in a folder
> - `node mocha-run.js tests/ews -g "Smoke"` — run with grep filter
> - `node mocha-run.js tests -g "Serial" --serial true` — run serial tests
> This is the project's custom test runner that handles setup, reporting, and environment configuration. Using `npx mocha` directly will bypass all of this.

> [!IMPORTANT]
> **Fresh Start**: `mocha/tests` was cleaned up — all JS tests start fresh with **smoke and sanity only**. Do NOT migrate functional or regression tests until the user instructs otherwise.

> [!CAUTION]
> **ALWAYS run `npx eslint --fix "tests/**/*.js"` from the `mocha/` directory after creating or editing ANY JS test files.** This is the ONLY reliable way to enforce tab indentation and all formatting rules. The glob MUST be quoted. The eslint config at `mocha/eslint.config.js` enforces `'indent': ['error', 'tab']`.

> [!WARNING]
> **Z-Prefix Convention**: After all smoke+sanity tests for a folder are migrated, rename the original XML folder from e.g. `Admin` → `ZAdmin` (prefix with `Z`) to mark it as completed. User has already renamed `Admin` → `ZAdmin`.

## Mocha Hooks & Variables
- **MUST use `function()` (not arrow functions `() =>`)** for `describe()`, `before()`, `after()`, `beforeEach()`, `afterEach()` callbacks.
- Arrow functions do NOT bind `this`, so `this.timeout()` and `this.ctx` will not work.
- `it()` callbacks CAN use arrow functions since they typically don't need `this`.
- All variables used across `before()` hooks and `it()` test blocks must be declared with `let` at the **`describe` scope** (top of the describe block).
- Variables must NOT be assigned without prior declaration — ES modules run in strict mode, which throws `ReferenceError` on undeclared assignments.

## No Skipped Tests
**NEVER create `it()` blocks with `this.skip()`.** If a test cannot be implemented via SOAP (e.g. REST servlet, upload servlet, zmlocalconfig, STAF tasks), simply do NOT include that `it()` block at all. Do not create placeholder tests that just call `this.skip()`.

## SOAP XML Must Be Multi-Line
NEVER condense SOAP XML into a single line. Each child element goes on its own tab-indented line:

```js
// WRONG:
const res = await soap.makeSOAPEnvelopeAdmin(
	`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${name}</name><password>${password}</password></CreateAccountRequest>`, adminAuth);

// CORRECT:
const res = await soap.makeSOAPEnvelopeAdmin(
	`<CreateAccountRequest xmlns="urn:zimbraAdmin">
		<name>${name}</name>
		<password>${password}</password>
	</CreateAccountRequest>`, adminAuth);
```

## Assertions Must Match XML Expectations Exactly
**NEVER use only `assert.exists(response.SomeResponse)`.** Every JS assertion MUST replicate the exact validation from the corresponding XML `<t:select>` element:
- `<t:select path="..." attr="..." match="..."/>` → assert the attribute value matches
- `<t:select path="..." set="..."/>` → extract the value and store in a variable
- `<t:select path="//zimbra:Code" match="^service.FAILURE"/>` → assert `res.Fault.Detail.Error.Code.includes('service.FAILURE')`
- If XML checks multiple `<t:select>` in one `<t:test>`, the JS test MUST have multiple assertions

> [!CAUTION]
> **MANDATORY Fault Check**: Before EVERY `assert.exists(response.XxxResponse)`, you MUST add `assert.notExists(response.Fault, 'Response should not be a Fault')`. This catches silent server errors that would otherwise pass as false positives. This applies to ALL SOAP response assertions — admin, account, delegated — no exceptions.

## REST Servlet Assertions (CRITICAL — follow for all REST tests)
> [!CAUTION]
> REST servlet tests MUST use **exact status code assertions**, never generic `notEqual(res.status, 200)`. When the XML uses `<t:select attr="StatusCode" match="401"/>`, the JS MUST use `assert.equal(res.status, 401)`. When XML checks body attributes like `To` and `Subject`, the JS MUST assert `res.body` contains those values.

**Key rules:**
- XML `StatusCode` match → `assert.equal(res.status, code)` with the **exact code** (401, 403, 404, etc.)
- XML `To` / `Subject` / body attr matches → `assert.include(res.body, value)` for each
- Guest auth tests: pass `null` as authToken, use `guest` + `password` options
- Message-level REST access: use `id: messageId` (not `folder` + `fmt`) to match XML `<id>` pattern
- Setup must replicate XML setup exactly: create folder, send message, move to folder, grant to guests

## Other Rules
- **Capitalize first word after pipe `|` in test names** — Example: `it('Sanity | Create a new Tag')` NOT `it('Sanity | create a new Tag')`.
- **Sanitize test names from `<t:objective>`** — Remove single quotes, double quotes, backticks, backslashes, acute accents. Normalize spaces.
- **No XML reference comments** — do NOT add HTML-styled XML comments like `// XML: t:select...`
- **120 character line limit** — break long lines at `||`, `&&`, `?` operators. Break long ternaries onto 3 lines.
- End-of-file: **NO blank line** between last `});` (closing `it()`) and `});` (closing `describe()`). Then single newline at EOF.

## Double Blank Line Between `it()` Blocks — STRICT FORMAT
There MUST be exactly **2 blank lines** between every `it()` block. Not 0, not 1 — always exactly 2 blank lines.

## 🚨 Applicable Zimbra Versions Block — MANDATORY IN EVERY FILE
> [!CAUTION]
> **EVERY test file MUST have EXACTLY ONE `Applicable zimbra versions` block.** Include this block between the `before()` closing `});` and the first `it()`. **1 blank line** between `});` (end of before block) and `// Applicable zimbra versions`. **1 blank line** between `}` (end of if block) and `// Tests`. **NEVER** use `/g` flag. **NEVER** omit `config.serial === true ||`. **NEVER** put a `// Tests` comment before the Applicable block — only ONE `// Tests` comment, and it goes AFTER the if block.

```js
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('...', async () => {
```

## Automated Formatting Scripts
To enforce all rules instantly, run:
```bash
npm run format
```

This sequentially executes 10 distinct rule verification scripts found in `mocha/utils/ai/`, hooked via `utils/ai/format-master.cjs`. Also run `node .agent/scripts/fix-tabs.cjs` occasionally to ensure safety.