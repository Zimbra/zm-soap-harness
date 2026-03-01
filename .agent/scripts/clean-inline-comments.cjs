const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
    console.error('Usage: node clean-inline-comments-v6.cjs <dir>');
    process.exit(1);
}

function getFiles(dir) {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) results = results.concat(getFiles(full));
        else if (entry.name.endsWith('.js')) results.push(full);
    }
    return results;
}

function getSoapComment(requestType) {
    const map = {
        'CreateAccountRequest': 'Create an account',
        'CreateDistributionListRequest': 'Create a distribution list',
        'CreateFolderRequest': 'Create a folder',
        'CreateMountpointRequest': 'Create a mountpoint',
        'CreateAppointmentRequest': 'Create an appointment',
        'CreateContactRequest': 'Create a contact',
        'CreateTagRequest': 'Create a tag',
        'ModifyAccountRequest': 'Modify the account',
        'ModifyPrefsRequest': 'Modify preferences',
        'ModifyAppointmentRequest': 'Modify the appointment',
        'ModifyContactRequest': 'Modify the contact',
        'DeleteAccountRequest': 'Delete the account',
        'GetAccountRequest': 'Get account details',
        'GetAccountInfoRequest': 'Get account info',
        'GetInfoRequest': 'Get info',
        'GetPrefsRequest': 'Get preferences',
        'GetMsgRequest': 'Get the message',
        'GetFolderRequest': 'Get the folder',
        'GetContactsRequest': 'Get the contact',
        'GetCustomMetadataRequest': 'Get custom metadata',
        'GetMailboxMetadataRequest': 'Get mailbox metadata',
        'SetCustomMetadataRequest': 'Set custom metadata',
        'SetMailboxMetadataRequest': 'Set mailbox metadata',
        'ModifyMailboxMetadataRequest': 'Modify mailbox metadata',
        'SearchRequest': 'Search for the item',
        'SendMsgRequest': 'Send the message',
        'AddMsgRequest': 'Inject the message',
        'AuthRequest': 'Authenticate',
        'ChangePasswordRequest': 'Change the password',
        'CheckSpellingRequest': 'Check spelling',
        'NoOpRequest': 'Send NoOp request',
        'FolderActionRequest': 'Perform folder action',
        'MsgActionRequest': 'Perform message action',
        'ItemActionRequest': 'Perform item action',
        'SaveDraftRequest': 'Save draft',
        'BatchRequest': 'Send batch request',
        'EndSessionRequest': 'End the session',
        'GetAllLocalesRequest': 'Get all locales',
        'GetAvailableLocalesRequest': 'Get available locales',
        'GetAvailableCsvFormatsRequest': 'Get available CSV formats',
        'GetSpellDictionariesRequest': 'Get spell dictionaries',
        'VersionInfoRequest': 'Get version info',
        'CreateWaitSetRequest': 'Create wait set',
        'WaitSetRequest': 'Check for WaitSet updates',
        'DestroyWaitSetRequest': 'Destroy wait set',
        'AdminCreateWaitSetRequest': 'Admin create wait set',
        'AdminWaitSetRequest': 'Admin check for updates',
        'AdminDestroyWaitSetRequest': 'Admin destroy wait set',
        'GrantRightsRequest': 'Grant rights',
        'RevokeRightsRequest': 'Revoke rights',
        'DelegateAuthRequest': 'Delegate auth'
    };
    return map[requestType] || null;
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const rawLines = content.split(/\r?\n/);

    // PASS 1: Clean all inline comments (those starting with '//' inside it())
    const cleanLines = [];
    let inIt = false;
    let itDepth = 0;

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const t = line.trim();

        if (t.startsWith('it(') && t.includes('async')) {
            inIt = true;
            itDepth = 0;
            cleanLines.push(line);
            continue;
        }

        if (inIt) {
            itDepth += (line.match(/\{/g) || []).length;
            itDepth -= (line.match(/\}/g) || []).length;

            if (itDepth <= 0 && t.startsWith('});')) {
                inIt = false;
                cleanLines.push(line);
                continue;
            }

            if (t.startsWith('//') && !t.includes('Applicable') && !t.includes('Tests')) {
                if (cleanLines.length > 0 && cleanLines[cleanLines.length - 1].trim() === '') {
                    cleanLines.pop(); // Pop preceded blank line too
                }
                continue;
            }
        }
        cleanLines.push(line);
    }

    // PASS 2: Inject operation and assertion comments, merging consecutive duplicate SOAP calls
    const lines = cleanLines;
    const newLines = [];
    inIt = false;
    itDepth = 0;
    let inAssertBlock = false;
    let lastActionComment = null; // Track the last inserted action comment to merge duplicates
    let isFirstActionInIt = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const t = line.trim();

        if (t.startsWith('it(') && t.includes('async')) {
            inIt = true;
            itDepth = 0;
            inAssertBlock = false;
            lastActionComment = null;
            isFirstActionInIt = true;
            newLines.push(line);
            continue;
        }

        if (inIt) {
            itDepth += (line.match(/\{/g) || []).length;
            itDepth -= (line.match(/\}/g) || []).length;

            if (itDepth <= 0 && t.startsWith('});')) {
                inIt = false;
                newLines.push(line);
                continue;
            }

            const isSoapCallStart = t.includes('await soap.makeSOAPEnvelope') ||
                t.includes('await soap.getAccountAuthToken') ||
                t.includes('await soap.getAdminAuthToken');

            // Action trigger (SOAP request)
            if (isSoapCallStart) {
                inAssertBlock = false; // Start of a new operation

                let commentStr = null;
                for (let j = i; j < Math.min(i + 15, lines.length); j++) {
                    const match = lines[j].match(/<([A-Za-z0-9_]+Request)/);
                    if (match) {
                        let text = getSoapComment(match[1]);
                        if (!text) {
                            text = `Send ${match[1].replace('Request', '').replace(/([A-Z])/g, ' $1').trim().toLowerCase()} request`;
                        }
                        commentStr = `// ${text}`;
                        break;
                    }
                    if (lines[j].includes('getAccountAuthToken')) { commentStr = '// Authenticate account'; break; }
                    if (lines[j].includes('getAdminAuthToken')) { commentStr = '// Authenticate as admin'; break; }
                    const nextLine = lines[j].trim();
                    if (j > i && (nextLine.startsWith('assert.') || nextLine.includes('await soap.'))) break;
                }

                if (!commentStr) {
                    commentStr = '// Perform SOAP request';
                }

                // Check if this action comment matches the immediate last one in this block
                if (commentStr === lastActionComment) {
                    // Duplicate action! We want to combine them into one block.
                    // Strip out any trailing blank lines that might have been pushed before this call.
                    while (newLines.length > 0 && newLines[newLines.length - 1].trim() === '') {
                        newLines.pop();
                    }
                    // Only push the line itself, NO NEW comment and NO NEW blank line.
                    newLines.push(line);
                } else {
                    // New action comment
                    const indent = line.match(/^(\t*)/)[1] || '\t\t';
                    const prevLine = newLines.length > 0 ? newLines[newLines.length - 1].trim() : '';

                    if (isFirstActionInIt) {
                        // Skip adding the comment for the very first action
                        newLines.push(line);
                        lastActionComment = commentStr; // Store it for next run so duplicates are merged
                    } else {
                        if (prevLine !== '' && !prevLine.startsWith('it(') && !prevLine.startsWith('//')) {
                            newLines.push('');
                        }
                        newLines.push(indent + commentStr);
                        newLines.push(line);
                        lastActionComment = commentStr; // Store it for next run
                    }
                }

                isFirstActionInIt = false;
                continue;
            }

            // Assertion group trigger
            if (t.startsWith('assert.') && !inAssertBlock) {
                inAssertBlock = true;
                lastActionComment = null; // An assert breaks the action group

                const indent = line.match(/^(\t*)/)[1] || '\t\t';
                const prevLine = newLines.length > 0 ? newLines[newLines.length - 1].trim() : '';

                if (!isFirstActionInIt) {
                    if (prevLine !== '' && !prevLine.startsWith('it(') && !prevLine.startsWith('//')) {
                        newLines.push('');
                    }
                    newLines.push(indent + '// Verify the response');
                }
            } else if (t.startsWith('assert.')) {
                // We are already in an assert block, make sure there's no blank line breaking it.
            }

            if (t !== '' && !t.startsWith('//')) {
                isFirstActionInIt = false;
            }

            newLines.push(line);

        } else {
            newLines.push(line);
        }
    }

    const changed = rawLines.join('\n') !== newLines.join('\n');
    if (changed || content !== newLines.join('\n')) {
        const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
        fs.writeFileSync(filePath, newLines.join(lineEnding));
        console.log(`UPDATED: ${path.basename(filePath)}`);
        return true;
    }
    return false;
}

let updated = 0;
for (const file of getFiles(targetDir)) {
    if (processFile(file)) updated++;
}
console.log(`\nTotal updated: ${updated}`);
