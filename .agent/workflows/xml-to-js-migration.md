---
description: How to migrate XML test files to JavaScript mocha tests (1:1 parity)
---

# XML to JS Test Migration Workflow

> [!CAUTION]
> ## 🚨 MANDATORY — DO THIS AFTER EVERY FILE CREATION/MODIFICATION 🚨
> **You MUST complete ALL of these steps after creating or editing ANY JS test file. NO EXCEPTIONS.**
> 1. **TABS ONLY** — Every line MUST use tab indentation. NEVER output spaces. This includes SOAP XML inside template literals, continuation lines, ternary operators — EVERYTHING.
> 2. **RUN ESLINT** — `npx eslint --fix "path/to/file.js"` from `mocha/` dir. This is NON-NEGOTIABLE.
> 3. **APPLICABLE ZIMBRA BLOCK** — Every file MUST have this block between `before()` closing `});` and first `it()`:
>    ```
>    });
>
>    // Applicable zimbra versions
>    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
>        return;
>    }
>
>    // Tests
>    it('...
>    ```
> 4. **2 BLANK LINES** between every `it()` block
> 5. **MULTI-LINE SOAP XML** — Never single-line XML
> 6. **FAULT CHECK** — `assert.notExists(res.Fault, ...)` before every response check
> 7. **EVERY `t:select` = ONE ASSERTION** — Every `<t:select>` node inside an eligible `<t:test_case>` MUST become a corresponding `assert.*` call in JS. Do NOT skip any `t:select`. If the XML selects an attribute, assert that attribute. If it matches a value, assert that value. This is the #1 cause of assertion gaps.
> 8. **NEVER put `// Tests` before the Applicable block** — only ONE `// Tests` comment, AFTER the if block

## Exclusion Rules (STRICT)

**ALWAYS exclude these XML test cases — they must NEVER become `it()` blocks:**
- `type="always"` (e.g. Ping, setup)
- `type="deprecated"`
- `testcaseid="Ping"`
- `testcaseid` containing `setup` (case-insensitive)

Only `type="smoke"`, `type="sanity"`, `type="functional"`, `type="bhr"`, and `type="regression"` test cases become `it()` blocks.
- Sanity-type tests that are really setup (e.g. "basic system check", "create test account", "login") should also be treated as setup → `before()` hook

## File Structure Rules

1. **Each XML file → its own JS file** (1:1 mapping). Never merge or split files.
2. **Each non-excluded `<t:test_case>` → one `it()` block**. Never merge or split.
3. **File naming**: **MUST use kebab-case** — insert hyphens at every word boundary. See `/naming-convention` workflow for full rules. Example: `CreateAppointmentRequest-RecurrenceMonthly.xml` → `create-appointment-request-recurrence-monthly.js`. NEVER concatenate words without hyphens (e.g. `createappointmentrequest-recurrencemonthly.js` is WRONG).
4. **Directory structure mirrors XML source** using lowercase kebab-case names (e.g. `CounterAppointment/` → `counter-appointment/`, `InvitePermissions/` → `invite-permissions/`)
5. **Data file paths** use `mocha/data/` (NOT `data/soapvalidator/`), files are flat under `mocha/data/{folder}/`
6. XML tests: `data/soapvalidator/<Module>/*.xml` (with subdirs like `Sharing/`, `Mountpoint/`, `VirtualHost/`)
7. JS tests: `mocha/tests/<module>/*.js` (with matching subdirs)
8. **`describe()` name MUST follow folder path** — Use `>` separators matching the directory structure from `tests/` onward. Capitalize each segment using the XML folder casing:
   ```js
   // File: mocha/tests/prefs/bugs/bug49818.js
   describe('Prefs > Bugs > Bug49818', function () {
   
   // File: mocha/tests/prefs/filters/addresstest/addresstest.js
   describe('Prefs > Filters > AddressTest', function () {
   
   // File: mocha/tests/tags/itemaction-tag.js
   describe('Tags > ItemAction Tag', function () {
   ```

## `it()` Description Format (STRICT)

```
it('{Type} | {Objective}', async () => {
```

- **Type**: Capitalized value of XML `type` attribute → `Smoke`, `Sanity`, `Functional`, `Regression`
- **Objective**: **Verbatim text** from `<t:objective>` (whitespace normalized to single spaces). Do NOT paraphrase, summarize, or add redundant info.
- **BugIds**: Do NOT include bugids in the `it()` description
- **Capitalize first word after pipe `|`** — The first character after `| ` MUST be uppercase.

### Examples

XML:
```xml
<t:test_case testcaseid="apple_iCal_rawInject01" type="smoke" bugids="44975">
    <t:objective>Verify the basic iCal format when lmtp inject is used to inject the iCal</t:objective>
```
JS:
```javascript
// CORRECT — use exact objective text:
it('Smoke | Verify the basic iCal format when lmtp inject is used to inject the iCal', async () => {
// WRONG — paraphrased/redundant:
it('Smoke | iCal raw inject - verify basic format', async () => {
```

## JS File Template

```javascript
import path from 'node:path';
import { assert } from 'chai';
import config from '{relativePath}/conf/config.js';
import common from '{relativePath}/framework/core/common.js';
import soap from '{relativePath}/framework/backend/soap-client.js';
import { main } from '{relativePath}/pages/main.js';

describe('{SuiteName}', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('{Type} | {Objective}', async () => {
		// ... test logic
	});


	it('{Type} | {Objective2}', async () => {
		// ... test logic
	});
});
```

### Relative Paths
- Root `tests/` level: `../../`
- One subdirectory deep: `../../../`

### Data File Paths
```javascript
// CORRECT — flat under mocha/data/{category}/
const filePath = path.join(config.projectRoot, 'mocha/data/ical/mac-ical-raw.txt');

// WRONG — never reference data/soapvalidator
const filePath = path.join(config.projectRoot, 'data/soapvalidator/iCal/Apple-iCal-1-0/mac-ical-raw.txt');

// WRONG — never include old subdirectory structure
const filePath = path.join(config.projectRoot, 'mocha/data/ical/Apple-iCal-1-0/mac-ical-raw.txt');
```

## Formatting Rules (STRICT)

- **TABS ONLY for indentation** — NEVER use spaces. This applies to ALL code: `describe()`, `before()`, `it()`, assertions, SOAP XML inside template literals, etc. Files that use 4-space indentation are WRONG and must be converted to tabs.
- **2 blank lines between `it()` blocks** — ALWAYS leave exactly 2 blank lines between the closing `});` of one `it()` and the next `it(`
- **NO comments between `it()` blocks** — NEVER put XML testcaseid or objective comments before `it()` blocks (e.g. `// TestCase01 - description`). The `it()` description already contains the objective. Comments are only allowed INSIDE `it()` blocks as inline step comments (e.g. `// Create the account`, `// Verify response`).
- **1 blank line** after `// Tests` comment before first `it()`
- **No blank line** between `const filePath = ...` and `await soap.injectMime(...)` — they stay together
- **MANDATORY section comments** — Every test file MUST have `// Applicable zimbra versions` before the `if (config.serial...)` block and `// Tests` before the first `it()` block. Both comments use the same indentation as the code around them (one tab). There must be exactly 1 blank line between `});` (end of `before`) and `// Applicable zimbra versions`, and exactly 1 blank line between `}` (end of `if` block) and `// Tests`.
- **SOAP XML must ALWAYS be multi-line** — NEVER condense XML into a single line. Each child element goes on its own indented line:
  ```js
  // WRONG — single-line XML:
  const res = await soap.makeSOAPEnvelopeAdmin(
  	`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${name}</name><password>${password}</password></CreateAccountRequest>`, adminAuth);

  // CORRECT — multi-line with indented children:
  const res = await soap.makeSOAPEnvelopeAdmin(
  	`<CreateAccountRequest xmlns="urn:zimbraAdmin">
  		<name>${name}</name>
  		<password>${password}</password>
  	</CreateAccountRequest>`, adminAuth);
  ```
- **120 character line limit** — STRICTLY break long lines at `||`, `&&`, and `?` operators:
  ```js
  // WRONG — exceeds 120 chars:
  assert.isTrue(!!response.GetAccountInfoResponse || (response.Fault && response.Fault.Detail && response.Fault.Detail.Error && response.Fault.Detail.Error.Code.includes('service.PERM_DENIED')), 'Expected PERM_DENIED or Success');

  // CORRECT — broken at && and after closing paren:
  assert.isTrue(!!response.GetAccountInfoResponse || (response.Fault && response.Fault.Detail &&
  			response.Fault.Detail.Error && response.Fault.Detail.Error.Code.includes('service.PERM_DENIED')),
  			'Expected PERM_DENIED or Success');
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

## Inline Comments Within `it()` Blocks — MANDATORY

> [!CAUTION]
> **Every `it()` block MUST have inline comments** that section off logical steps. Each comment describes what the next block of code does. There MUST be a **blank line ABOVE every comment** — this separates it from the previous code block. The only exception is the very first comment at the start of the `it()` body (no blank line needed above it since it's the first line).

```js
it('Functional | Verify a message with long domain can be received', async () => {
	// Create the account
	const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
	await soap.makeSOAPEnvelopeAdmin(
		`<CreateAccountRequest xmlns="urn:zimbraAdmin">
			<name>${accountEmail}</name>
			<password>${config.accountPassword}</password>
		</CreateAccountRequest>`, adminAuthToken
	);

	// Send a message
	const subject = `Test${common.getUniqueString()}`;
	await soap.makeSOAPEnvelopeAccount(
		`<SendMsgRequest xmlns="urn:zimbraMail">
			<m>
				<e t="t" a="${accountEmail}"/>
				<su>${subject}</su>
				<mp ct="text/plain">
					<content>test content</content>
				</mp>
			</m>
		</SendMsgRequest>`, senderAuthToken
	);

	// Search for the message
	const searchRes = await soap.makeSOAPEnvelopeAccount(
		`<SearchRequest xmlns="urn:zimbraMail" types="message">
			<query>subject:(${subject})</query>
		</SearchRequest>`, accountAuthToken
	);

	// Verify the message was found
	assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	const msgs = Array.isArray(searchRes.SearchResponse.m)
		? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
	assert.isAtLeast(msgs.length, 1, 'Should find at least one message');
	const msgId = msgs[0].id;

	// Get the full message
	const getMsgRes = await soap.makeSOAPEnvelopeAccount(
		`<GetMsgRequest xmlns="urn:zimbraMail">
			<m id="${msgId}"/>
		</GetMsgRequest>`, accountAuthToken
	);

	// Verify the message content
	assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
	assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
});
```

**Common comment patterns:**
- `// Create the account` / `// Create test data`
- `// Send a message` / `// Inject the message`
- `// Search for the message` / `// Search for the appointment`
- `// Verify the message was found` / `// Verify the response`
- `// Get the full message` / `// Get account details`
- `// Modify the account` / `// Update settings`
- `// Delete the item` / `// Clean up`
- `// Lock out the account` / `// Wait for expiry`
- `// Attempt with invalid credentials` / `// Attempt with valid credentials`

## Test Independence Rules (STRICT)
- **1:1 XML-to-JS file mapping**: Each XML file → exactly one JS file. Never merge or split.
- **1:1 test case mapping**: Each XML `<t:test_case>` → exactly one `it()` block. Never merge or split.
- **Confirm before combining**: If multiple XML tests are inherently sequential (e.g., lock → lock-fail → unlock where each depends on the previous state), **always ask the user** before combining them into a single `it()` block. Explain the nature of the dependency and let the user decide. Never combine silently.
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

## REST Servlet Assertion Patterns
- **Exact status codes** — XML `<t:select attr="StatusCode" match="401"/>` → `assert.equal(res.status, 401)`. NEVER use `assert.notEqual(res.status, 200)`
- **Body content** — XML `<t:select attr="To" match="..."/>` → `assert.include(res.body, toAddress)`. Check every attribute the XML checks.
- **Guest auth** — pass `null` as authToken, use `{ guest: email, password: pwd }` options
- **Message-level access** — use `{ id: messageId }` to match XML `<id>` element, NOT `{ folder: ..., fmt: ... }` unless the XML actually uses folder-based access
- **Setup parity** — replicate XML setup exactly: create subfolder, send message, move message to subfolder, grant to each guest with `gt="guest"` and `args="password"`

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

## Checklist Before Completing Migration

- [ ] All non-excluded test cases have a corresponding `it()` block
- [ ] `it()` descriptions exactly match XML `type` and `objective` (no bugids)
- [ ] Excluded types (always, deprecated, ping, setup) have NO `it()` blocks
- [ ] Data paths use `mocha/data/` with flat file references
- [ ] All files pass `node --check` syntax validation
- [ ] `it()` count matches non-excluded `<t:test_case>` count in XML
- [ ] **ALL indentation uses TABS — zero spaces anywhere (including SOAP XML in template literals)**
- [ ] **`npx eslint --fix` has been run on every created/modified file**
- [ ] **Every file has the `// Applicable zimbra versions` block after `beforeEach`/`afterEach` and before first `it()`**
- [ ] **Every file has exactly ONE `// Tests` comment — AFTER the if block, not before it**
- [ ] **Exactly 2 blank lines between every `it()` block**
- [ ] **`assert.notExists(res.Fault, ...)` before every response existence check**
- [ ] **Every file has `beforeEach`/`afterEach` hooks with `function()` syntax calling `main.beforeEach(this)` / `main.afterEach(this)`**
