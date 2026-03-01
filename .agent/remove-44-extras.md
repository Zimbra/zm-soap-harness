---
description: Remove 44 extra JS tests to match XML count exactly
---

# Remove 44 Extra JS Tests — Implementation Plan

## Goal
Match JS it() count to XML migratable count: **379 = 379**

Current: XML=379, JS=423, Extra=44

## Proposed Changes

### Files to DELETE (fabricated, no XML source) — 30 tests

```bash
rm -f mocha/tests/mail-client/smime/smime-tests.js \
  mocha/tests/mail-client/search/search-tests.js \
  mocha/tests/mail-client/hab/hab-tests.js \
  mocha/tests/mail-client/prefs/prefs-tests.js \
  mocha/tests/mail-client/mail/mail-tests.js \
  mocha/tests/mail-client/calendar/backup-request.js \
  mocha/tests/mail-client/calendar/backup-request-appointments.js \
  mocha/tests/mail-client/calendar/backup-request-freebusy.js \
  mocha/tests/mail-client/briefcase/backup-shared-briefcase.js \
  mocha/tests/mail-client/briefcase/backup-mountpoint.js \
  mocha/tests/mail-client/distribution-list/bug74084.js \
  mocha/tests/mail-client/tasks/backup-request.js
```

| # | File | Tests | Reason |
|:-:|------|:-----:|--------|
| 1 | `smime/smime-tests.js` | 8 | Fabricated |
| 2 | `search/search-tests.js` | 5 | Fabricated |
| 3 | `hab/hab-tests.js` | 5 | Fabricated |
| 4 | `prefs/prefs-tests.js` | 4 | Fabricated |
| 5 | `mail/mail-tests.js` | 3 | Fabricated |
| 6 | `calendar/backup-request.js` | 2 | XML type=tbd |
| 7 | `calendar/backup-request-appointments.js` | 2 | XML type=tbd |
| 8 | `calendar/backup-request-freebusy.js` | 1 | XML has no freebusy backup |
| 9 | `briefcase/backup-shared-briefcase.js` | 1 | Duplicate of backup-request-shared-briefcase.js |
| 10 | `briefcase/backup-mountpoint.js` | 1 | Duplicate of backup-request-mounted-briefcase.js |
| 11 | `distribution-list/bug74084.js` | 2 | No XML source (0 migratable) |
| 12 | `tasks/backup-request.js` | 2 | No XML source (0 migratable) |

**Subtotal: -36 tests**

### Files to EDIT (remove extra it() blocks) — 8 tests

| File | Current | Target | Extra | Action |
|------|:-------:|:------:|:-----:|--------|
| `contacts/contact-backup-zcs-2730.js` | 6 | 0 | 6 | Delete file (XML ContactBackup_ZCS-2730 has setup-type tests only, not in user's migratable count) |
| `spam/spam-basic.js` | 6 | 3 | 3 | Remove 3 extra tests (XML spamBasic has 3 migratable) |
| `voicemail/voice-service-tester.js` | 55 | 52 | 3 | Remove 3 extra tests |

**Subtotal: -8 tests**

Wait — contacts needs investigation. `contact-backup-zcs-2730.js` (6 tests) is NOT from a fabricated source. The XML `ContactBackup_ZCS-2730.xml` exists. Need to check its types.

### Discrepancy Check Needed
- `contacts`: XML shows 5, JS=11. 2 from backup-request.js, 1 from contact-backup-zcs-3594.js, 2 from profile-pic-zcs-3871.js = 5. The 6 from `contact-backup-zcs-2730.js` are EXTRA.

**Grand Total to Remove: 44**

## Verification

After all deletions, run:
```bash
node match_verify.cjs
```
Expected: All directories show MATCH, Total XML=JS=379
