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
