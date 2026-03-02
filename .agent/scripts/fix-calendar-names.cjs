/**
 * fix-calendar-names.cjs
 *
 * Renames Calendar JS test files and folders from concatenated-lowercase
 * to proper kebab-case to match the convention used in all other modules.
 *
 * Usage: node .agent/scripts/fix-calendar-names.cjs [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE = path.resolve(__dirname, '../../mocha/tests/calendar');

// ── Folder renames (old → new, relative to calendar/) ──
// Order: deepest first so we rename children before parents
const FOLDER_RENAMES = [
    // depth-3 folders
    ['appointments/counterappointment', 'appointments/counter-appointment'],
    ['appointments/distributionlists', 'appointments/distribution-lists'],
    ['appointments/getapptsummaries', 'appointments/get-appt-summaries'],
    ['appointments/setappointmentrequest', 'appointments/set-appointment-request'],
    ['freebusy/folders', 'free-busy/folders'],                 // OK as-is
    ['freebusy/bugs', 'free-busy/bugs'],                       // OK as-is
    ['meetingrequest/invitepermissions', 'meeting-request/invite-permissions'],
    ['meetingrequest/minical', 'meeting-request/minical'],
    ['meetingrequest/mountpoint', 'meeting-request/mountpoint'],
    ['meetingrequest/reminders', 'meeting-request/reminders'],
    ['meetingrequest/replies/recurring', 'meeting-request/replies/recurring'],
    ['meetingrequest/replies', 'meeting-request/replies'],
    ['meetingrequest/setappointmentrequest', 'meeting-request/set-appointment-request'],
    ['sharing/outlookpermissions', 'sharing/outlook-permissions'],
    ['lmtp/outlook/imap/outlook2007', 'lmtp/outlook/imap/outlook2007'], // OK as-is
    ['mountpoint/minical', 'mountpoint/minical'],             // OK as-is

    // depth-2 folders (rename after children)
    ['meetingrequest', 'meeting-request'],
];

// ── File renames (old → new, relative to calendar/) ──
// The new paths use the NEW folder names from above
const FILE_RENAMES = [
    // appointments/ root files
    ['appointments/addappointmentinviterequest-basic.js', 'appointments/add-appointment-invite-request-basic.js'],
    ['appointments/appointment-create.js', 'appointments/appointment-create.js'],   // OK
    ['appointments/appointment-get.js', 'appointments/appointment-get.js'],         // OK
    ['appointments/appointment-import.js', 'appointments/appointment-import.js'],   // OK
    ['appointments/appointment-modify.js', 'appointments/appointment-modify.js'],   // OK
    ['appointments/appointment-search.js', 'appointments/appointment-search.js'],   // OK
    ['appointments/calendarmountpoint-loop.js', 'appointments/calendar-mountpoint-loop.js'],
    ['appointments/cancelappointmentrequest-basic.js', 'appointments/cancel-appointment-request-basic.js'],
    ['appointments/cancelappointmentrequest-recurrencedaily.js', 'appointments/cancel-appointment-request-recurrence-daily.js'],
    ['appointments/createappointmentrequest-basic.js', 'appointments/create-appointment-request-basic.js'],
    ['appointments/createappointmentrequest-blobless.js', 'appointments/create-appointment-request-blobless.js'],
    ['appointments/createappointmentrequest-emailreminder.js', 'appointments/create-appointment-request-email-reminder.js'],
    ['appointments/createappointmentrequest-loop.js', 'appointments/create-appointment-request-loop.js'],
    ['appointments/createappointmentrequest-private.js', 'appointments/create-appointment-request-private.js'],
    ['appointments/createappointmentrequest-recurrencedaily.js', 'appointments/create-appointment-request-recurrence-daily.js'],
    ['appointments/createappointmentrequest-recurrencemonthly.js', 'appointments/create-appointment-request-recurrence-monthly.js'],
    ['appointments/createappointmentrequest-recurrenceweekly.js', 'appointments/create-appointment-request-recurrence-weekly.js'],
    ['appointments/createappointmentrequest-recurrenceyearly.js', 'appointments/create-appointment-request-recurrence-yearly.js'],
    ['appointments/createappointmentrequest-reminder.js', 'appointments/create-appointment-request-reminder.js'],
    ['appointments/createappointmentrequest-singleoccurrence.js', 'appointments/create-appointment-request-single-occurrence.js'],
    ['appointments/createappointmentrequest-singleoccurrenceallday.js', 'appointments/create-appointment-request-single-occurrence-all-day.js'],
    ['appointments/createappointmentrequest-timezones.js', 'appointments/create-appointment-request-timezones.js'],
    ['appointments/forwardappointmentinvite.js', 'appointments/forward-appointment-invite.js'],
    ['appointments/forwardappointmentinviterequest-basic.js', 'appointments/forward-appointment-invite-request-basic.js'],
    ['appointments/forwardappointmentrequest-basic.js', 'appointments/forward-appointment-request-basic.js'],
    ['appointments/itemaction-appointment.js', 'appointments/item-action-appointment.js'],
    ['appointments/modifyappointmentrequest-basic.js', 'appointments/modify-appointment-request-basic.js'],
    ['appointments/modifyappointmentrequest-recurrencedaily.js', 'appointments/modify-appointment-request-recurrence-daily.js'],
    ['appointments/modifyappointmentrequest-recurrencemonthly.js', 'appointments/modify-appointment-request-recurrence-monthly.js'],
    ['appointments/new-appointment-modify.js', 'appointments/new-appointment-modify.js'], // OK

    // appointments/alarm/
    ['appointments/alarm/dismisscalendaritemalarmrequest.js', 'appointments/alarm/dismiss-calendar-item-alarm-request.js'],
    ['appointments/alarm/snoozecalendaritemalarmrequest.js', 'appointments/alarm/snooze-calendar-item-alarm-request.js'],

    // appointments/counterappointment/ → counter-appointment/
    ['appointments/counter-appointment/counterappointmentrequest.js', 'appointments/counter-appointment/counter-appointment-request.js'],
    ['appointments/counter-appointment/declinecounterappointmentrequest.js', 'appointments/counter-appointment/decline-counter-appointment-request.js'],

    // appointments/distributionlists/ → distribution-lists/
    ['appointments/distribution-lists/dl-appointments.js', 'appointments/distribution-lists/dl-appointments.js'],               // OK
    ['appointments/distribution-lists/dl-appointments-freebusy.js', 'appointments/distribution-lists/dl-appointments-freebusy.js'], // OK

    // appointments/exceptions/
    ['appointments/exceptions/appointmentexception-cancel.js', 'appointments/exceptions/appointment-exception-cancel.js'],
    ['appointments/exceptions/appointmentexception-create.js', 'appointments/exceptions/appointment-exception-create.js'],
    ['appointments/exceptions/appointmentexception-modify.js', 'appointments/exceptions/appointment-exception-modify.js'],
    ['appointments/exceptions/appointmentexception-remove.js', 'appointments/exceptions/appointment-exception-remove.js'],

    // appointments/getapptsummaries/ → get-appt-summaries/
    ['appointments/get-appt-summaries/calender-getapptsummaries.js', 'appointments/get-appt-summaries/calender-get-appt-summaries.js'],
    ['appointments/get-appt-summaries/searchapptrequest.js', 'appointments/get-appt-summaries/search-appt-request.js'],

    // appointments/minical/
    ['appointments/minical/minicalappointmentsgeneral.js', 'appointments/minical/minical-appointments-general.js'],
    ['appointments/minical/minical-appt-timezones.js', 'appointments/minical/minical-appt-timezones.js'],     // OK
    ['appointments/minical/minicalbasic.js', 'appointments/minical/minical-basic.js'],
    ['appointments/minical/minical-newcalappts.js', 'appointments/minical/minical-new-cal-appts.js'],

    // appointments/organizer/
    ['appointments/organizer/account-rename.js', 'appointments/organizer/account-rename.js'],  // OK

    // appointments/recurrence/
    ['appointments/recurrence/appointment-recur-flow.js', 'appointments/recurrence/appointment-recur-flow.js'],       // OK
    ['appointments/recurrence/bug8990.js', 'appointments/recurrence/bug8990.js'],                                     // OK
    ['appointments/recurrence/checkrecurconflictsrequest.js', 'appointments/recurrence/check-recur-conflicts-request.js'],
    ['appointments/recurrence/expandrecur.js', 'appointments/recurrence/expand-recur.js'],
    ['appointments/recurrence/getrecurrequest-basic.js', 'appointments/recurrence/get-recur-request-basic.js'],

    // appointments/setappointmentrequest/ → set-appointment-request/
    ['appointments/set-appointment-request/appointment-set.js', 'appointments/set-appointment-request/appointment-set.js'],   // OK
    ['appointments/set-appointment-request/new-setappointmentrequest-basic.js', 'appointments/set-appointment-request/new-set-appointment-request-basic.js'],
    ['appointments/set-appointment-request/new-setappointmentrequest-cancel.js', 'appointments/set-appointment-request/new-set-appointment-request-cancel.js'],
    ['appointments/set-appointment-request/new-setappointmentrequest-except.js', 'appointments/set-appointment-request/new-set-appointment-request-except.js'],
    ['appointments/set-appointment-request/new-setappointmentrequest-recur.js', 'appointments/set-appointment-request/new-set-appointment-request-recur.js'],
    ['appointments/set-appointment-request/setappointmentrequest-basic.js', 'appointments/set-appointment-request/set-appointment-request-basic.js'],
    ['appointments/set-appointment-request/setappointmentrequest-cancel.js', 'appointments/set-appointment-request/set-appointment-request-cancel.js'],
    ['appointments/set-appointment-request/setappointmentrequest-except.js', 'appointments/set-appointment-request/set-appointment-request-except.js'],
    ['appointments/set-appointment-request/setappointmentrequest-recur.js', 'appointments/set-appointment-request/set-appointment-request-recur.js'],

    // appointments/timezones/
    ['appointments/timezones/appointment-timezone-part1.js', 'appointments/timezones/appointment-timezone-part1.js'],       // OK
    ['appointments/timezones/appointment-timezone-part2.js', 'appointments/timezones/appointment-timezone-part2.js'],       // OK
    ['appointments/timezones/appointment-timezone-part3.js', 'appointments/timezones/appointment-timezone-part3.js'],       // OK
    ['appointments/timezones/appointment-tz-sendreply.js', 'appointments/timezones/appointment-tz-send-reply.js'],
    ['appointments/timezones/calendartz-getfreebusy.js', 'appointments/timezones/calendar-tz-get-freebusy.js'],
    ['appointments/timezones/customtimezone-basic.js', 'appointments/timezones/custom-timezone-basic.js'],
    ['appointments/timezones/customtimezone-createappointmentrequest.js', 'appointments/timezones/custom-timezone-create-appointment-request.js'],

    // appointments/workflow/
    ['appointments/workflow/calendar-sendinvitereply.js', 'appointments/workflow/calendar-send-invite-reply.js'],
    ['appointments/workflow/new-calendar-sendinvitereply.js', 'appointments/workflow/new-calendar-send-invite-reply.js'],

    // bugs/ — all are bug####.js which is OK as-is

    // calendarrequest.js at root
    ['calendarrequest.js', 'calendar-request.js'],

    // device-reminder/ — OK as-is

    // freebusy/
    ['freebusy/bugs/calendar-getfreebusy4418.js', 'freebusy/bugs/calendar-get-freebusy-4418.js'],
    ['freebusy/calendar-getfreebusy.js', 'freebusy/calendar-get-freebusy.js'],
    ['freebusy/calendar-getfreebusy01.js', 'freebusy/calendar-get-freebusy-01.js'],
    ['freebusy/folders/excludefreebusy-organizer.js', 'freebusy/folders/exclude-freebusy-organizer.js'],
    ['freebusy/folders/freebusy-organizer.js', 'freebusy/folders/freebusy-organizer.js'],   // OK
    ['freebusy/getfreebusy-organizer.js', 'freebusy/get-freebusy-organizer.js'],
    ['freebusy/getworkinghoursrequest.js', 'freebusy/get-working-hours-request.js'],
    ['freebusy/new-calendar-getfreebusy01.js', 'freebusy/new-calendar-get-freebusy-01.js'],

    // lmtp/
    ['lmtp/calendar-lmtp.js', 'lmtp/calendar-lmtp.js'],       // OK
    ['lmtp/outlook/imap/outlook2007/new-outlook-basic.js', 'lmtp/outlook/imap/outlook2007/new-outlook-basic.js'],   // OK
    ['lmtp/outlook/imap/outlook2007/outlook-basic.js', 'lmtp/outlook/imap/outlook2007/outlook-basic.js'],           // OK

    // meetingrequest/ → meeting-request/
    ['meeting-request/bugs.js', 'meeting-request/bugs.js'],     // OK
    ['meeting-request/cancelmeetingrequest.js', 'meeting-request/cancel-meeting-request.js'],
    ['meeting-request/cancelmeetingrequest-basic.js', 'meeting-request/cancel-meeting-request-basic.js'],
    ['meeting-request/createmeetingrequest-aliases.js', 'meeting-request/create-meeting-request-aliases.js'],
    ['meeting-request/createmeetingrequest-basic.js', 'meeting-request/create-meeting-request-basic.js'],
    ['meeting-request/createmeetingrequest-blobless.js', 'meeting-request/create-meeting-request-blobless.js'],
    ['meeting-request/createmeetingrequest-duration.js', 'meeting-request/create-meeting-request-duration.js'],
    ['meeting-request/createmeetingrequest-private.js', 'meeting-request/create-meeting-request-private.js'],
    ['meeting-request/createmeetingrequest-reminder.js', 'meeting-request/create-meeting-request-reminder.js'],
    ['meeting-request/grantpermissionrequest.js', 'meeting-request/grant-permission-request.js'],
    ['meeting-request/meetingrequest-recurrenceyearly.js', 'meeting-request/meeting-request-recurrence-yearly.js'],
    ['meeting-request/modifymeetingrequest-aliases.js', 'meeting-request/modify-meeting-request-aliases.js'],

    // meeting-request/invite-permissions/
    ['meeting-request/invite-permissions/checkpermissionrequest-accounts.js', 'meeting-request/invite-permissions/check-permission-request-accounts.js'],
    ['meeting-request/invite-permissions/checkpermissionrequest-basic.js', 'meeting-request/invite-permissions/check-permission-request-basic.js'],
    ['meeting-request/invite-permissions/checkpermissionrequest-nonaccounts.js', 'meeting-request/invite-permissions/check-permission-request-nonaccounts.js'],
    ['meeting-request/invite-permissions/getpermissionrequest.js', 'meeting-request/invite-permissions/get-permission-request.js'],
    ['meeting-request/invite-permissions/getpermissionrequest-basic.js', 'meeting-request/invite-permissions/get-permission-request-basic.js'],
    ['meeting-request/invite-permissions/grantpermissionrequest.js', 'meeting-request/invite-permissions/grant-permission-request.js'],
    ['meeting-request/invite-permissions/grantpermissionrequest-basic.js', 'meeting-request/invite-permissions/grant-permission-request-basic.js'],

    // meeting-request/minical/
    ['meeting-request/minical/minical-attendeeappts.js', 'meeting-request/minical/minical-attendee-appts.js'],

    // meeting-request/reminders/
    ['meeting-request/reminders/getmsgrequest-basic.js', 'meeting-request/reminders/get-msg-request-basic.js'],

    // meeting-request/replies/
    ['meeting-request/replies/modifyappointmentrequest.js', 'meeting-request/replies/modify-appointment-request.js'],
    ['meeting-request/replies/sendinvitereplyrequest.js', 'meeting-request/replies/send-invite-reply-request.js'],
    ['meeting-request/replies/sendinvitereplyrequest-alias.js', 'meeting-request/replies/send-invite-reply-request-alias.js'],
    ['meeting-request/replies/sendinvitereplyrequest-dl.js', 'meeting-request/replies/send-invite-reply-request-dl.js'],
    ['meeting-request/replies/sendinvitereplyrequest-from-alias.js', 'meeting-request/replies/send-invite-reply-request-from-alias.js'],
    ['meeting-request/replies/sendinvitereplyrequest-rsvp.js', 'meeting-request/replies/send-invite-reply-request-rsvp.js'],

    // meeting-request/replies/recurring/
    ['meeting-request/replies/recurring/sendinvitereplyrequest-recurrenceweekly.js', 'meeting-request/replies/recurring/send-invite-reply-request-recurrence-weekly.js'],
    ['meeting-request/replies/recurring/sendinvitereplyrequest-recurrenceweekly-exception.js', 'meeting-request/replies/recurring/send-invite-reply-request-recurrence-weekly-exception.js'],

    // meeting-request/set-appointment-request/
    ['meeting-request/set-appointment-request/setappointmentrequest.js', 'meeting-request/set-appointment-request/set-appointment-request.js'],
    ['meeting-request/set-appointment-request/setappointmentrequest-basic.js', 'meeting-request/set-appointment-request/set-appointment-request-basic.js'],

    // mountpoint/
    ['mountpoint/calendar-rights.js', 'mountpoint/calendar-rights.js'],         // OK
    ['mountpoint/cancelmeetingrequest.js', 'mountpoint/cancel-meeting-request.js'],
    ['mountpoint/create-mountpoint.js', 'mountpoint/create-mountpoint.js'],       // OK
    ['mountpoint/minical/minicalreq-mountedcalendar.js', 'mountpoint/minical/minical-req-mounted-calendar.js'],
    ['mountpoint/new-calendar-rights.js', 'mountpoint/new-calendar-rights.js'],   // OK

    // multinodecal-getfreebusy.js at root
    ['multinodecal-getfreebusy.js', 'multi-node-cal-get-freebusy.js'],

    // permission/
    ['permission/permission-sanity.js', 'permission/permission-sanity.js'],   // OK

    // privacy/
    ['privacy/appointment-privacy-basic.js', 'privacy/appointment-privacy-basic.js'],     // OK
    ['privacy/appointmentprivacy-searchrequest.js', 'privacy/appointment-privacy-search-request.js'],
    ['privacy/bug28753.js', 'privacy/bug28753.js'],   // OK

    // resources/
    ['resources/calendarresource.js', 'resources/calendar-resource.js'],
    ['resources/resources-autoaccept.js', 'resources/resources-auto-accept.js'],
    ['resources/resources-createappointment.js', 'resources/resources-create-appointment.js'],

    // sharing/ — already well-named except outlookpermissions folder
    ['sharing/appointment-get.js', 'sharing/appointment-get.js'],                       // OK
    ['sharing/appointment-move.js', 'sharing/appointment-move.js'],                     // OK
    ['sharing/appointment-summaries.js', 'sharing/appointment-summaries.js'],           // OK
    ['sharing/calendar-public-share.js', 'sharing/calendar-public-share.js'],           // OK
    ['sharing/calendarsharing-orphanshare.js', 'sharing/calendar-sharing-orphan-share.js'],
    ['sharing/new-appointment-get.js', 'sharing/new-appointment-get.js'],               // OK
    ['sharing/new-appointment-move.js', 'sharing/new-appointment-move.js'],             // OK
    ['sharing/new-appointment-summaries.js', 'sharing/new-appointment-summaries.js'],   // OK
    ['sharing/outlook-permissions/appointment-author.js', 'sharing/outlook-permissions/appointment-author.js'],   // OK
    ['sharing/outlook-permissions/bug31058.js', 'sharing/outlook-permissions/bug31058.js'],                       // OK

    // snoozecalendaritemalarmrequest.js at root
    ['snoozecalendaritemalarmrequest.js', 'snooze-calendar-item-alarm-request.js'],

    // tags/
    ['tags/tagappointments.js', 'tags/tag-appointments.js'],
    ['tags/tagappointmentsbasic.js', 'tags/tag-appointments-basic.js'],
];

// ── Execution ──

console.log(`\n${DRY_RUN ? '=== DRY RUN ===' : '=== RENAMING ==='}\n`);

// Step 1: Rename files first (before folders change)
// Files that are in folders being renamed need special handling.
// We process files using the CURRENT filesystem paths.

// Build a function to map from "new folder path" files back to current paths
function getCurrentFilePath(relPath) {
    // For files under folders not yet renamed, we need the old folder name
    // Replace new folder names with old ones to find the current path
    let current = relPath;
    // Reverse folder renames to get current paths
    for (const [oldDir, newDir] of FOLDER_RENAMES) {
        if (oldDir !== newDir && current.startsWith(newDir + '/')) {
            current = oldDir + current.slice(newDir.length);
        }
    }
    return current;
}

let fileRenameCount = 0;
let folderRenameCount = 0;
const errors = [];

// Step 1: Rename files (use current FS paths for source)
for (const [newOld, newNew] of FILE_RENAMES) {
    const currentPath = getCurrentFilePath(newOld);
    const oldAbs = path.join(BASE, currentPath);
    // The new path also uses new folder names, but folders aren't renamed yet
    // So we need the "old folder + new filename" as intermediate
    const oldDir = path.dirname(currentPath);
    const newBasename = path.basename(newNew);
    const intermediateAbs = path.join(BASE, oldDir, newBasename);

    if (currentPath === getCurrentFilePath(newNew) &&
        path.basename(currentPath) === newBasename) {
        continue; // No rename needed
    }

    if (!fs.existsSync(oldAbs)) {
        errors.push(`FILE NOT FOUND: ${currentPath}`);
        continue;
    }

    const oldBasename = path.basename(currentPath);
    if (oldBasename === newBasename) {
        continue; // Same filename, will be handled by folder rename
    }

    console.log(`FILE: ${currentPath} → ${path.join(oldDir, newBasename)}`);
    if (!DRY_RUN) {
        fs.renameSync(oldAbs, intermediateAbs);
    }
    fileRenameCount++;
}

// Step 2: Rename folders (deepest first — already ordered that way)
for (const [oldDir, newDir] of FOLDER_RENAMES) {
    if (oldDir === newDir) continue;

    const oldAbs = path.join(BASE, oldDir);
    const newAbs = path.join(BASE, newDir);

    if (!fs.existsSync(oldAbs)) {
        // Check if parent was already renamed
        errors.push(`DIR NOT FOUND: ${oldDir} (may already be renamed)`);
        continue;
    }

    // Ensure new parent directory exists
    const newParent = path.dirname(newAbs);
    if (!fs.existsSync(newParent)) {
        if (!DRY_RUN) {
            fs.mkdirSync(newParent, { recursive: true });
        }
    }

    console.log(`DIR:  ${oldDir} → ${newDir}`);
    if (!DRY_RUN) {
        fs.renameSync(oldAbs, newAbs);
    }
    folderRenameCount++;
}

console.log(`\n=== Summary ===`);
console.log(`Files renamed:   ${fileRenameCount}`);
console.log(`Folders renamed: ${folderRenameCount}`);
if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log(`  ${e}`));
}
