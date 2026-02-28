---
description: Strict formatting rules for all mocha test files
---

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

# Formatting Rules for Mocha Test Files

## TABS ONLY — NEVER Spaces
**ALL indentation MUST use tab characters (`\t`), NEVER spaces.** This applies to:
- `describe()`, `before()`, `after()`, `it()` blocks
- Assertions (`assert.*`)
- Variable declarations
- SOAP XML inside template literals
- Continuation lines (ternary `?:`, `||`, `&&` operators)

Files that use 4-space indentation are WRONG and must be converted to tabs.

> [!CAUTION]
> **Before modifying ANY JS test file**, check if it uses spaces. If so, convert the ENTIRE file to tabs first. When creating NEW files, always use tabs from the start. NEVER output spaces for indentation.

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

```js
// WRONG — too weak, does not catch server errors:
assert.exists(res.CreateAccountResponse);

// CORRECT — fault check + existence + specific validations:
assert.notExists(res.Fault, 'Response should not be a Fault');
assert.exists(res.CreateAccountResponse, 'CreateAccountResponse should exist');
const account = res.CreateAccountResponse.account[0];
assert.exists(account.id, 'Account should have an id');
const mailHost = account.a.find(a => a.n === 'zimbraMailHost');
assert.equal(mailHost._content, expectedHost, 'zimbraMailHost should match');
```

## REST Servlet Assertions (CRITICAL — follow for all REST tests)

> [!CAUTION]
> REST servlet tests MUST use **exact status code assertions**, never generic `notEqual(res.status, 200)`. When the XML uses `<t:select attr="StatusCode" match="401"/>`, the JS MUST use `assert.equal(res.status, 401)`. When XML checks body attributes like `To` and `Subject`, the JS MUST assert `res.body` contains those values.

```js
// WRONG — too weak, hides real failures:
assert.notEqual(res.status, 200, 'Should not return 200');
assert.equal(res.status, 200, 'REST GET should return 200');
// (no body checks)

// CORRECT — exact status code + body content per XML t:select:
assert.equal(res.status, 200, 'REST GET should return 200');
assert.include(res.body, account2Email, 'Response body should contain To address');
assert.include(res.body, messageSubject, 'Response body should contain Subject');

// CORRECT — exact denial status code:
assert.equal(res.status, 401, 'Invalid guest user should return 401');
```

**Key rules:**
- XML `StatusCode` match → `assert.equal(res.status, code)` with the **exact code** (401, 403, 404, etc.)
- XML `To` / `Subject` / body attr matches → `assert.include(res.body, value)` for each
- Guest auth tests: pass `null` as authToken, use `guest` + `password` options
- Message-level REST access: use `id: messageId` (not `folder` + `fmt`) to match XML `<id>` pattern
- Setup must replicate XML setup exactly: create folder, send message, move to folder, grant to guests

## Other Rules
- **Capitalize first word after pipe `|` in test names** — In both JS `it('Type | Description')` and XML `<t:objective>Type | Description</t:objective>`, the first character after `| ` MUST be uppercase. Example: `it('Sanity | Create a new Tag')` NOT `it('Sanity | create a new Tag')`. Run `node mocha/utils/ai/fix-capitalize.cjs` from the repo root to auto-fix all files.
- **Sanitize test names from `<t:objective>`** — When migrating XML `<t:objective>` text to JS `it('...')` test names, ensure clean matching:
  - **Remove**: single quotes `'`, double quotes `"`, smart quotes, backticks `` ` ``, backslashes `\`, acute accents
  - **Replace**: full-width spaces `U+3000` → regular space, tabs/newlines → single space
  - **Normalize**: collapse multiple spaces to one, trim leading/trailing whitespace
  - **Keep**: Japanese/CJK chars, letters, numbers, hyphens, parens, commas, periods, colons, pipes `|`, `=`, `/`, `@`
  - Run `node utils/ai/fix-objectives.js data/soapvalidator` before migration to pre-clean XML
- **No XML reference comments** — do NOT add comments like `// XML: t:select path="..."` in JS files. The assertions should be self-explanatory.
- **120 character line limit** — break long lines at `||`, `&&`, `?` operators. Break long ternaries onto 3 lines.
- End-of-file: **NO blank line** between last `});` (closing `it()`) and `});` (closing `describe()`). Then single newline at EOF.

## Double Blank Line Between `it()` Blocks — STRICT FORMAT

> [!CAUTION]
> There MUST be exactly **2 blank lines** between every `it()` block. This applies to ALL test files. Not 0, not 1 — always exactly 2 blank lines after the closing `});` of one `it()` and before the next `it(`.

```js
	it('first test', async () => {
		// ...
	});


	it('second test', async () => {
		// ...
	});
```

**WRONG** (only 1 blank line):
```js
	});

	it('second test', async () => {
```

## Applicable Zimbra Versions Block — STRICT FORMAT

> [!CAUTION]
> Every test file MUST have EXACTLY ONE `Applicable zimbra versions` block. Use ONLY the format below. **1 blank line** between `});` (end of before block) and `// Applicable zimbra versions`. **NEVER** use `/g` flag. **NEVER** omit `config.serial === true ||`.

```js
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('...', async () => {
```

**WRONG formats (NEVER use):**
- `if (!String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/g))` — missing `config.serial`, has `/g`
- Having TWO blocks — always exactly ONE
- TWO blank lines before `// Applicable zimbra versions` — always exactly ONE blank line
- Missing `// Tests` comment before first `it()` — ALWAYS include it
- TWO blank lines between `}` (end of if block) and `// Tests` — always exactly ONE blank line

If duplicates are found, run: `node utils/ai/fix-duplicate-zimbra.cjs`

## SOAP XML Must Always Be Multi-Line

> [!CAUTION]
> NEVER write single-line SOAP XML that exceeds 120 characters. Always break into multi-line with tab indentation:

```js
// CORRECT:
const res = await soap.makeSOAPEnvelopeAdmin(
	`<CreateAccountRequest xmlns="urn:zimbraAdmin">
		<name>${name}</name>
		<password>${password}</password>
	</CreateAccountRequest>`, adminAuth
);

// WRONG — single-line XML:
const res = await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${name}</name><password>${password}</password></CreateAccountRequest>`, adminAuth);
```

Run `node utils/ai/format-master.cjs` from `mocha/` to enforce all formatting rules.
