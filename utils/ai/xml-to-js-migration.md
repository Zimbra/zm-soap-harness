---
description: How to migrate XML SOAP test cases to JavaScript (mocha) with 1:1 parity
---

# XML to JS Test Migration Workflow

## File Structure
- XML tests: `data/soapvalidator/<Module>/*.xml` (with subdirs like `Sharing/`, `Mountpoint/`, `VirtualHost/`)
- JS tests: `mocha/tests/<module>/*.js` (with matching subdirs)
- **1:1 file mapping**: Each XML file gets exactly one JS file. Never merge or split files.
- **File naming**: lowercase with hyphens, e.g. `Folder-Action.xml` → `folder-action.js`

## Test Case Mapping
- Each XML `<t:test_case>` (excluding `type="always"` setup tests) maps to one JS `it()` block
- **Never merge** multiple XML test cases into one `it()` block
- **Never split** one XML test case into multiple `it()` blocks (unless it's a loop creating multiple distinct operations)
- XML `type` maps to JS test name prefix: `smoke` → `Smoke |`, `sanity` → `Sanity |`, `functional/bhr` → `Functional |`, `regression` → `Regression |`
- **NEVER** count or create `it()` blocks for `type="always"` setup/ping tests. These are NOT real tests.
- If setup test code is needed (create accounts, get auth tokens, etc.) → put it in the `before()` hook, NOT as a separate `it()` block
- Sanity-type tests that are really setup (e.g. "basic system check", "create test account", "login") should also be treated as setup → `before()` hook

## JS Test Structure
```javascript
import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Module > Feature Name', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this.ctx);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (!String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/g)) {
		return;
	}

	// Tests
	it('Smoke | Test description', async () => {
		// test body
	});


	it('Sanity | Another test', async () => {
		// test body
	});
});
```

## Formatting Rules
- Use tabs for indentation
- **Double blank line** between `it()` blocks
- **NO blank line** before the closing `});` of the `describe()` block:
  ```js
  // CORRECT:
  	});
  });
  
  // WRONG:
  	});
  
  });
  ```
- Run `npm run format` after all changes
- Follow rules in `utils/ai/formatting-guidelines.md`

## Assertion Patterns
- **Always use defensive assertions** — never access `.Fault.Reason.Text` or `.Response.action` without null checking:
  ```js
  // CORRECT:
  if (response.Fault) {
  	assert.include(response.Fault.Reason.Text, 'error');
  } else {
  	assert.exists(response.SomeResponse);
  }
  
  // WRONG:
  assert.include(response.Fault.Reason.Text, 'error');  // crashes if no Fault
  ```

## SOAP Patterns
- Account requests: `soap.makeSOAPEnvelopeAccount(request, accountAuthToken)`
- Admin requests: `soap.makeSOAPEnvelopeAdmin(request, adminAuthToken)`
- Auth tokens: `soap.getAccountAuthToken(email)`, `soap.getAdminAuthToken()`
- Test accounts: `soap.testAccounts.testAccount1.emailAddress`, `.testAccount2`, etc.
- Unique strings: `common.getUniqueString()`

## Loop Tests
- XML loop tests (e.g. creating 1000 folders) should reduce count in JS for speed (e.g. 500 or 100)
- Each distinct operation in the loop (create, rename, move, delete, etc.) gets its own `it()` block

## Running & Debugging
// turbo-all
- **Full suite**: `node mocha-run.js tests/<module>/`
- **Single failed test**: `node mocha-run.js tests/<module>/<file>.js -g "test name pattern"`
- **Always run only failed tests** with `-g` pattern, never the entire suite, when fixing failures
- After fixing, run just the specific test to verify before running the full suite

## Analysis & Reporting
- Use `utils/ai/compare_detailed.js` as template for generating comparison reports
- Count XML tests: `<t:test_case>` elements minus `type="always"` ones
- Count JS tests: `it(` occurrences
- XML `type="sanity"` tests that are setup (Ping, create account, login) are NOT real tests
