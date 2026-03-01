---
description: JavaScript test file formatting rules - indentation and style
---

# JavaScript Test Formatting Rules

## Indentation

- **MUST use tabs for indentation** in all `.js` test files under `mocha/tests/`.
- Do NOT use spaces for indentation.
- All new code, edits, and generated test files must follow tab indentation.

## Mocha Hooks

- **MUST use `function()` (not arrow functions `() =>`)** for `describe()`, `before()`, `after()`, `beforeEach()`, `afterEach()` callbacks.
- Arrow functions do NOT bind `this`, so `this.timeout()` and `this.ctx` will not work.
- `it()` callbacks CAN use arrow functions since they typically don't need `this`.

## Variable Declarations

- All variables used across `before()` hooks and `it()` test blocks must be declared with `let` at the **`describe` scope** (top of the describe block).
- Variables must NOT be assigned without prior declaration — ES modules run in strict mode, which throws `ReferenceError` on undeclared assignments.

## Tab Formatting Fix Script

After generating or editing test files, **always run** the tab fix script to convert any accidental space indentation to tabs:

```bash
// turbo
node c:/tmp/fix-tabs.js
```

The script at `c:/tmp/fix-tabs.js` converts all leading spaces to tabs (4 spaces = 1 tab) across all `.js` files in the target folder. Update `CONTACTS_DIR` in the script to point to the appropriate test folder before running.

## Post-Edit Formatting Step

After any bulk code generation, assertion strengthening, or file edits:

1. Run `node c:/tmp/fix-tabs.js` to fix space→tab indentation
2. Run `node c:/tmp/fix-formatting.js` to ensure `// Applicable zimbra versions` block formatting
3. Run the test suite to verify all tests still pass

## Example

```javascript
describe('My Test Suite', function () {
	this.timeout(30 * 1000);
	let adminAuth;
	let testAccount1Name;

	before(async function () {
		adminAuth = await soap.getAdminAuthToken();
		testAccount1Name = `test.${Date.now()}@${config.testDomain}`;
	});

	it('should do something', async () => {
		// test code using tabs
	});
});
```