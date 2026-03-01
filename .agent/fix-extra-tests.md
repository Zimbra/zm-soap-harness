---
description: Fix mail-client extra test counts and strengthen assertions
---

# Mail Client — Fix Extra Tests & Strengthen Assertions

> **Status:** File edits DONE. File deletions PENDING (commands failing).

## Problem Summary

XML migratable (smoke/sanity/functional/regression): **379**
JS it() blocks: **474**
Extra: **95** (after removing `filter/` duplicate)

Two root causes:
1. **TBD-type tests migrated as it() blocks** — TBD is NOT a valid migratable type
2. **Fabricated JS files** with no XML backing — created by prior conversations

---

## DONE ✅ — File Edits (TBD tests removed from mixed files)

- `distribution-list/bug74084.js` — removed 4 TBD tests, kept 2 Sanity
- `auth/auth-active-directory.js` — removed 4 TBD tests, kept 8 Sanity/Functional
- `gal/sync-gal-request-external-ad-both.js` — removed 1 TBD test, kept 1 Functional
- `filter/` directory — already deleted (duplicate of `filters/`)

**Impact:** -9 TBD tests removed via edits

---

## PENDING ⏳ — File Deletions (run when commands work)

// turbo-all
Copy-paste this single command:

```bash
rm -f mocha/tests/mail-client/data-source/data-source-tests.js mocha/tests/mail-client/data-source/imap-import-aol.js mocha/tests/mail-client/data-source/imap-import-exchange2010.js mocha/tests/mail-client/data-source/imap-import-gmail.js mocha/tests/mail-client/data-source/imap-import-yahoo.js mocha/tests/mail-client/data-source/pop-import-aol.js mocha/tests/mail-client/data-source/pop-import-exchange2010.js mocha/tests/mail-client/data-source/pop-import-hotmail.js mocha/tests/mail-client/data-source/pop-import-yahoo.js mocha/tests/mail-client/gal/gal-tests.js mocha/tests/mail-client/gal/sync-gal-count.js mocha/tests/mail-client/gal/sync-gal-count-zcs-1200.js mocha/tests/mail-client/gal/sync-gal-request-external-ad.js mocha/tests/mail-client/gal/search-gal-request-external-ad.js mocha/tests/mail-client/gal/search-gal-request-external-ad-both.js mocha/tests/mail-client/folders/folders-url.js mocha/tests/mail-client/auth/auth-accented-basic.js
```

### Files to delete (17 files, 30 TBD + fabricated tests):

| # | File | Tests | Reason |
|:-:|------|:-----:|--------|
| 1 | `data-source/data-source-tests.js` | 6 | Fabricated (no XML) |
| 2 | `data-source/imap-import-aol.js` | 2 | All TBD |
| 3 | `data-source/imap-import-exchange2010.js` | 2 | All TBD |
| 4 | `data-source/imap-import-gmail.js` | 1 | All TBD |
| 5 | `data-source/imap-import-yahoo.js` | 1 | All TBD |
| 6 | `data-source/pop-import-aol.js` | 1 | All TBD |
| 7 | `data-source/pop-import-exchange2010.js` | 2 | All TBD |
| 8 | `data-source/pop-import-hotmail.js` | 3 | All TBD |
| 9 | `data-source/pop-import-yahoo.js` | 2 | All TBD |
| 10 | `gal/gal-tests.js` | 5 | Fabricated (no XML) |
| 11 | `gal/sync-gal-count.js` | 3 | All TBD |
| 12 | `gal/sync-gal-count-zcs-1200.js` | 3 | All TBD |
| 13 | `gal/sync-gal-request-external-ad.js` | 2 | All TBD |
| 14 | `gal/search-gal-request-external-ad.js` | 1 | All TBD |
| 15 | `gal/search-gal-request-external-ad-both.js` | 2 | All TBD |
| 16 | `folders/folders-url.js` | 4 | All TBD |
| 17 | `auth/auth-accented-basic.js` | 2 | All TBD |

**Impact:** -39 tests after deletions

---

## Step 3: Check Other Directories for TBD Tests

Run this to find all remaining TBD-type it() blocks across mail-client:

```bash
grep -rn "it('TBD |" mocha/tests/mail-client/ --include="*.js"
```

Remove any found — TBD is not a migratable type.

---

## Step 4: Verify Final Counts

After all fixes, run:

```bash
node match_verify.cjs
```

Expected results:
- data-source: XML=33, JS=33 ✅
- gal: XML=16, JS=16 ✅
- Total extra should drop from 95 to ~58

---

## Step 5: Scan All Directories for Remaining Extras

For each directory still showing EXTRA, investigate:
1. Are there fabricated JS files with no XML backing?
2. Are there it() blocks for excluded types (always, ping, deprecated, setup, tbd)?
3. If tests are legitimately extra (additional coverage), keep them

---

## Step 6: Strengthen Assertions

After fixing counts, strengthen weak assertions across all 119 files:

### Weakness Patterns to Fix

1. **STUB tests** — Use `NoOpRequest` instead of actual SOAP call. Rewrite with proper SOAP request matching XML logic.
2. **FAULT_ONLY** — Only `assert.notExists(res.Fault)`. Add response value validation.
3. **WEAK** — Only `assert.exists()`. Add `assert.equal()`, `assert.match()`, `assert.include()` for actual data.

### Strong Assertion Pattern (reference)

```javascript
it('Sanity | Create a pop3 account with all valid values', async () => {
    const t = await soap.getAccountAuthToken(account1Name);
    const res = await soap.makeSOAPEnvelopeMail(
        `<CreateDataSourceRequest xmlns="urn:zimbraMail">
            <pop3 name="${dsName}" isEnabled="1" host="pop.example.com"
                port="995" username="testuser" password="testpass"
                connectionType="ssl" leaveOnServer="1" l="2"/>
        </CreateDataSourceRequest>`, t
    );
    assert.notExists(res.Fault, 'Response should not be a Fault');
    assert.exists(res.CreateDataSourceResponse, 'Response should exist');
    const ds = res.CreateDataSourceResponse?.pop3;
    const dsItem = Array.isArray(ds) ? ds[0] : ds;
    assert.exists(dsItem, 'Data source should be returned');
    assert.equal(dsItem.name, dsName, 'DS name should match');
    assert.equal(dsItem.isEnabled, '1', 'DS should be enabled');
});
```
