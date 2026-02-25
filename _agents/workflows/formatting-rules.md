---
description: Strict formatting rules for all mocha test files
---

# Formatting Rules for Mocha Test Files

## TABS ONLY — NEVER Spaces
**ALL indentation MUST use tab characters (`\t`), NEVER spaces.** This applies to:
- `describe()`, `before()`, `after()`, `it()` blocks
- Assertions (`assert.*`)
- Variable declarations
- SOAP XML inside template literals
- Continuation lines (ternary `?:`, `||`, `&&` operators)

Files that use 4-space indentation are WRONG and must be converted to tabs.

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
- **120 character line limit** — break long lines at `||`, `&&`, `?` operators
- End-of-file: tab-indented inner `});`, then outer `});`, then single newline
