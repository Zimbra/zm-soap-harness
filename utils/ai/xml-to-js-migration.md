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
- **STRICT: Use the exact `<t:objective>` text** as the `it()` description after the type prefix. Do NOT paraphrase, summarize, or add redundant info (e.g. request name that's already in the filename). Example:
  ```xml
  <t:test_case testcaseid="CountAccountRequest_01" type="sanity">
      <t:objective>Sanity test for CountAccountRequest</t:objective>
  ```
  ```js
  // CORRECT — use exact objective text:
  it('Sanity | Sanity test for CountAccountRequest', async () => {
  // WRONG — paraphrased/redundant:
  it('Sanity | CountAccountRequest - verify count per COS', async () => {
  ```
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
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
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
- **120 character line limit** — STRICTLY break long lines at `||`, `&&`, and `?` operators. Examples:
  ```js
  // WRONG — exceeds 120 chars:
  assert.isTrue(!!response.GetAccountInfoResponse || (response.Fault && response.Fault.Detail && response.Fault.Detail.Error && response.Fault.Detail.Error.Code.includes('service.PERM_DENIED')), 'Expected PERM_DENIED or Success');

  // CORRECT — broken at && and after closing paren:
  assert.isTrue(!!response.GetAccountInfoResponse || (response.Fault && response.Fault.Detail &&
  			response.Fault.Detail.Error && response.Fault.Detail.Error.Code.includes('service.PERM_DENIED')),
  			'Expected PERM_DENIED or Success');
  ```
- **End-of-file format** — STRICTLY follow this pattern (tab-indented inner `});`, no blank line, no trailing whitespace):
  ```js
  // CORRECT — always end files exactly like this:
  	});
  });
  
  // WRONG — no blank line between closings:
  	});
  
  });
  
  // WRONG — inner closing must have tab:
  });
  });
  ```
- Run `npm run format` after all changes
- Follow rules in `utils/ai/formatting-guidelines.md`

## Test Independence Rules (STRICT)
- **1:1 XML-to-JS file mapping**: Each XML file → exactly one JS file. Never merge or split.
- **1:1 test case mapping**: Each XML `<t:test_case>` → exactly one `it()` block. Never merge or split.
- **Independent tests**: Each `it()` block must be self-contained with ALL its own code (setup, action, assertion).
- **Minimal `before()` hook**: Only put truly shared, unavoidable setup in `before()` (e.g. `main.before()`, getting admin auth token). All test-specific setup goes INSIDE the `it()` block.
- **No shared state between tests**: Tests must not depend on state created by other `it()` blocks.

## Assertion Patterns
- **Always derive assertions from the XML `t:select` path** — match the exact depth/node:
  ```js
  // XML: <t:select path="//admin:CreateAccountResponse/admin:account" attr="name" match="expected"/>
  // CORRECT: Check the account level, not just the Response
  const account = Array.isArray(res.CreateAccountResponse?.account)
  	? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
  assert.exists(account, 'CreateAccountResponse should contain account');
  
  // XML: <t:select path="//zimbra:Code" match="^service.INVALID_REQUEST"/>
  // CORRECT: Check fault code
  assert.exists(res.Fault, 'Should return Fault');
  assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
  
  // WRONG: Too shallow, doesn't match XML path depth
  assert.exists(res.CreateAccountResponse);
  ```
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
