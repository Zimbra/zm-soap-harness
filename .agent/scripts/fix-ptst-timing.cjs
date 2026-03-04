/**
 * Script to add a delay before organizer re-checks ptst after invitee accepts.
 * The SendInviteReplyRequest is async — the organizer's GetMsg needs time
 * to reflect the invitee's ACCEPT.
 * 
 * Pattern: After SendInviteReplyRequest + assert, add a 3s delay before
 * the next GetMsgRequest that checks ptst.
 */

const fs = require('node:fs');
const path = require('node:path');

const baseDir = path.join(__dirname, '../../mocha/tests/calendar/meeting-request');
const DELAY_LINE = "\t\t// Wait for reply to be processed by organizer's mailbox\n\t\tawait new Promise(r => setTimeout(r, 3000));\n";

const filesToFix = [
    'cancel-meeting-request-basic.js',
    'create-meeting-request-private.js',
    'create-meeting-request-reminder.js',
    'create-meeting-request-basic.js',
    'meeting-request-recurrence-yearly.js',
    'reminders/get-msg-request-basic.js',
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

    // Pattern: after SendInviteReplyRequest fault assertion, before next GetMsgRequest
    // Insert a delay between them
    let changeCount = 0;

    // Match: assert.notExists(...Fault, '...Reply...');\n\n\t\t// Verify organizer
    // or:   assert.notExists(replyRes.Fault...);\n\n\t\t// Verify
    content = content.replace(
        /(assert\.notExists\(replyRes\.Fault[^\n]*\n)(\s*\n)?(\s*\/\/ Verify organizer)/g,
        (match, assertLine, blank, comment) => {
            changeCount++;
            return assertLine + '\n' + DELAY_LINE + '\n' + comment;
        }
    );

    // Also match: assert.notExists(replyRes.Fault...);\n\t\tassert.notExists(replyRes.Fault...);\n\n\t\t// Verify
    content = content.replace(
        /(assert\.notExists\(replyRes\.Fault[^\n]*\n\s*assert\.notExists\(replyRes\.Fault[^\n]*\n)(\s*\n)?(\s*\/\/ Verify organizer)/g,
        (match, assertLines, blank, comment) => {
            changeCount++;
            return assertLines + '\n' + DELAY_LINE + '\n' + comment;
        }
    );

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`FIXED: ${relFile} (${changeCount} delay(s) added)`);
        totalChanges += changeCount;
    } else {
        console.log(`NO MATCH: ${relFile}`);
    }
}

console.log(`\nTotal: ${totalChanges} delays added across ${filesToFix.length} files`);
