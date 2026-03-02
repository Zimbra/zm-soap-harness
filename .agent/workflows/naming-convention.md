---
description: Strict naming convention rules for all JS test files and folders
---

# Naming Convention Rules (STRICT)

> [!CAUTION]
> ## 🚨 MANDATORY — FOLLOW FOR EVERY FILE AND FOLDER CREATED 🚨
> **ALL JS test files and folders MUST use kebab-case (hyphen-separated words). NO EXCEPTIONS.**

## Rules

1. **Kebab-case ONLY** — Every word boundary MUST have a hyphen separator:
   ```
   ✅ CORRECT: create-appointment-request-basic.js
   ❌ WRONG:  createappointmentrequest-basic.js

   ✅ CORRECT: counter-appointment/
   ❌ WRONG:  counterappointment/

   ✅ CORRECT: send-invite-reply-request.js
   ❌ WRONG:  sendinvitereplyrequest.js

   ✅ CORRECT: distribution-lists/
   ❌ WRONG:  distributionlists/

   ✅ CORRECT: dismiss-calendar-item-alarm-request.js
   ❌ WRONG:  dismisscalendaritemalarmrequest.js
   ```

2. **Common word boundaries to separate**:
   - `Request` → `-request` (e.g. `create-appointment-request`)
   - `Response` → `-response`
   - `Appointment` → `-appointment`
   - `Calendar` → `-calendar`
   - `Meeting` → `-meeting`
   - `Permission` → `-permission`
   - `Invite` → `-invite`
   - `Reply` → `-reply`
   - `Action` → `-action`
   - `Mountpoint` → `-mountpoint`
   - `Timezone` → `-timezone`
   - `Recurrence` → `-recurrence`
   - `Exception` → `-exception`
   - `Daily/Weekly/Monthly/Yearly` → `-daily`, `-weekly`, `-monthly`, `-yearly`
   - `Basic` → `-basic`
   - `Freebusy` → `-freebusy` (keep as one word — domain term)
   - `Minical` → `minical` (keep as one word — domain abbreviation)

3. **Bug files** — Keep as `bug12345.js` (no hyphen between "bug" and number)

4. **Numbers** — Separate numbers from words with a hyphen:
   ```
   ✅ calendar-get-freebusy-01.js
   ❌ calendar-getfreebusy01.js
   ```

5. **Folder names follow the same rules**:
   ```
   ✅ meeting-request/invite-permissions/
   ❌ meetingrequest/invitepermissions/

   ✅ set-appointment-request/
   ❌ setappointmentrequest/

   ✅ outlook-permissions/
   ❌ outlookpermissions/
   ```

## How to Derive JS Name from XML Name

XML filenames use CamelCase. To convert:
1. Insert hyphens at each word boundary (uppercase letter or known compound word)
2. Lowercase everything
3. Example: `CreateAppointmentRequest-RecurrenceMonthly.xml` → `create-appointment-request-recurrence-monthly.js`
4. Example: `CounterAppointmentRequest.xml` → `counter-appointment-request.js`
5. Example: `DismissCalendarItemAlarmRequest.xml` → `dismiss-calendar-item-alarm-request.js`

## Reference: Correctly Named Modules

These modules already follow this convention — use them as reference:
- `mocha/tests/sharing/` (e.g. `get-share-info-request.js`, `send-share-notification-request-basic.js`)
- `mocha/tests/search/` (e.g. `search-subject.js`, `search-content.js`)
- `mocha/tests/admin/` (e.g. `account-rename.js`)
