const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
    console.error('Usage: node clean-inline-comments-v3.cjs <dir>');
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

    // PASS 1: Remove all inline comments strictly inside `it` blocks (except `// Tests` or `// Applicable`)
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
                    cleanLines.pop();
                }
                continue;
            }
        }
        cleanLines.push(line);
    }

    // PASS 2: Inject grouped comments triggered strictly by `await soap.` declarations.
    const lines = cleanLines;
    const newLines = [];
    inIt = false;
    itDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const t = line.trim();

        if (t.startsWith('it(') && t.includes('async')) {
            inIt = true;
            itDepth = 0;
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

            // Looking for triggers:
            // `const res = await soap.make...`
            // `let res = await soap.make...`
            // `await soap.make...`
            const isSoapCallStart = t.includes('await soap.makeSOAPEnvelope') ||
                t.includes('await soap.getAccountAuthToken') ||
                t.includes('await soap.getAdminAuthToken');

            if (isSoapCallStart) {
                let commentStr = null;
                // Look ahead to find the specific XML request
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
                    // Stop looking if we hit an assert or another await soap before finding XML
                    const nextLine = lines[j].trim();
                    if (j > i && (nextLine.startsWith('assert.') || nextLine.includes('await soap.'))) break;
                }

                if (!commentStr) {
                    commentStr = '// Perform SOAP request';
                }

                const indent = line.match(/^(\t*)/)[1];
                // Add blank line if we are not at the very top of `it(` and previous line isn't blank
                const prevLine = newLines[newLines.length - 1].trim();
                if (prevLine !== '' && !prevLine.startsWith('it(') && !prevLine.startsWith('//')) {
                    newLines.push('');
                }
                newLines.push(indent + commentStr);
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
