---
description: Strict formatting rules for all mocha test files
---

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

```js
// WRONG — too weak, does not validate what XML checks:
assert.exists(res.CreateAccountResponse);

// CORRECT — matches XML t:select path/attr/match:
assert.exists(res.CreateAccountResponse, 'CreateAccountResponse should exist');
const account = res.CreateAccountResponse.account[0];
assert.exists(account.id, 'Account should have an id');
const mailHost = account.a.find(a => a.n === 'zimbraMailHost');
assert.equal(mailHost._content, expectedHost, 'zimbraMailHost should match');
```

## Other Rules
- **Sanitize test names from `<t:objective>`** — When migrating XML `<t:objective>` text to JS `it('...')` test names, ensure clean matching:
  - **Remove**: single quotes `'`, double quotes `"`, smart quotes, backticks `` ` ``, backslashes `\`, acute accents
  - **Replace**: full-width spaces `U+3000` → regular space, tabs/newlines → single space
  - **Normalize**: collapse multiple spaces to one, trim leading/trailing whitespace
  - **Keep**: Japanese/CJK chars, letters, numbers, hyphens, parens, commas, periods, colons, pipes `|`, `=`, `/`, `@`
  - Run `node utils/ai/fix-objectives.js data/soapvalidator` before migration to pre-clean XML
- **No XML reference comments** — do NOT add comments like `// XML: t:select path="..."` in JS files. The assertions should be self-explanatory.
- **Double blank line** between `it()` blocks
- **120 character line limit** — break long lines at `||`, `&&`, `?` operators. Break long ternaries onto 3 lines.
- End-of-file: **NO blank line** between last `});` (closing `it()`) and `});` (closing `describe()`). Then single newline at EOF.

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
