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
- Use tabs for indentation — **NEVER use spaces**
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
- **Applicable zimbra versions block** — MUST use tabs and single-line `if`:
  ```js
  // CORRECT (tabs, single-line if):
  	// Applicable zimbra versions
  	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
  		return;
  	}

  // WRONG (spaces, multi-line if):
      // Applicable zimbra versions
      if (config.serial === true ||
          !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
          return;
      }
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

### retryOnFault Rules (CRITICAL — follow strictly)
- `makeSOAPEnvelopeAccount` and `makeSOAPEnvelopeAdmin` default to `retryOnFault = true` — **never pass `true` explicitly**
- **Pass `false` explicitly** when the test deliberately expects a SOAP Fault response (i.e., the test asserts that the response IS a Fault):
  ```js
  // Test expects a Fault → pass false to disable retry:
  const res = await soap.makeSOAPEnvelopeAccount(request, authToken, false);
  assert.exists(res.Fault, 'Should return a Fault');
  assert.include(res.Fault.Detail.Error.Code, 'mail.ALREADY_EXISTS');
  ```
- Non-transient fault codes that should NEVER be retried (already handled in soap-core.js):
  `account.AUTH_FAILED`, `account.CHANGE_PASSWORD`, `account.MAINTENANCE_MODE`,
  `service.INVALID_REQUEST`, `service.PERM_DENIED`, `account.AUTH_EXPIRED`,
  `account.TWO_FACTOR_AUTH_FAILED`, `account.TWO_FACTOR_SETUP_REQUIRED`,
  `mail.ALREADY_EXISTS`, `mail.NO_SUCH_FOLDER`, `mail.NO_SUCH_ITEM`,
  `mail.CANNOT_CONTAIN`, `service.UNKNOWN_DOCUMENT`, `account.NO_SUCH_ACCOUNT`
- `getAccountAuthToken` and `getAdminAuthToken` default to `retryOnFault = false` — only pass `true` if you need retries
- **Never modify `soap-core.js`** — all fixes must be at the test level

## Loop Tests
- XML loop tests (e.g. creating 1000 folders) should reduce count in JS for speed (e.g. 500 or 100)
- Each distinct operation in the loop (create, rename, move, delete, etc.) gets its own `it()` block

## Running & Debugging
// turbo-all
- **Shell**: Always use **git bash**, never PowerShell
- **Runner**: Always use `node mocha-run.js`, never `npx mocha`
- **Full suite**: `node mocha-run.js`
- **Specific files**: `node mocha-run.js tests/<module>/<file>.js`
- **Single failed test**: `node mocha-run.js tests/<module>/<file>.js -g "test name pattern"`
- **Always run only failed tests** with `-g` pattern, never the entire suite, when fixing failures
- After fixing, run just the specific test to verify before running the full suite

## Analysis & Reporting
- Use `utils/ai/compare_detailed.js` as template for generating comparison reports
- Count XML tests: `<t:test_case>` elements minus `type="always"` ones
- Count JS tests: `it(` occurrences
- XML `type="sanity"` tests that are setup (Ping, create account, login) are NOT real tests
