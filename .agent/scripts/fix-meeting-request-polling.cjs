/**
 * Script to replace invitee SearchRequest calls with pollForSearchResult
 * in calendar meeting-request test files that have timing failures.
 */

const fs = require('node:fs');
const path = require('node:path');

const baseDir = path.join(__dirname, '../../mocha/tests/calendar/meeting-request');

const filesToFix = [
    'cancel-meeting-request-basic.js',
    'create-meeting-request-blobless.js',
    'create-meeting-request-aliases.js',
    'create-meeting-request-private.js',
    'create-meeting-request-basic.js',
    'create-meeting-request-reminder.js',
    'create-meeting-request-duration.js',
    'grant-permission-request.js',
    'modify-meeting-request-aliases.js',
    'minical/minical-attendee-appts.js',
    'reminders/get-msg-request-basic.js',
    'replies/recurring/send-invite-reply-request-recurrence-weekly-exception.js',
    'replies/recurring/send-invite-reply-request-recurrence-weekly.js',
    'meeting-request-recurrence-yearly.js',
];

let totalChanges = 0;

for (const relFile of filesToFix) {
    const filePath = path.join(baseDir, relFile);
    if (!fs.existsSync(filePath)) {
        console.log(`SKIP: ${relFile} (not found)`);
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Replace makeSOAPEnvelopeAccount for SearchRequest with types="appointment"
    // Pattern: soap.makeSOAPEnvelopeAccount(\n\t\t\t`<SearchRequest ... types="appointment"
    let changeCount = 0;

    // Multi-line pattern with backtick template
    content = content.replace(
        /soap\.makeSOAPEnvelopeAccount\(\s*\n(\s*)`<SearchRequest\s+xmlns="urn:zimbraMail"\s*\n\s*calExpandInstStart/g,
        (match) => {
            changeCount++;
            return match.replace('soap.makeSOAPEnvelopeAccount(', 'soap.pollForSearchResult(');
        }
    );

    // Single-line pattern
    content = content.replace(
        /soap\.makeSOAPEnvelopeAccount\(\s*`<SearchRequest[^`]*types="appointment"[^`]*<\/SearchRequest>`,/g,
        (match) => {
            changeCount++;
            return match.replace('soap.makeSOAPEnvelopeAccount(', 'soap.pollForSearchResult(');
        }
    );

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`FIXED: ${relFile} (${changeCount} changes)`);
        totalChanges += changeCount;
    } else {
        console.log(`NO MATCH: ${relFile}`);
    }
}

console.log(`\nTotal: ${totalChanges} changes across ${filesToFix.length} files`);
