const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
    console.error('Usage: node inline-comments.cjs <dir>');
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
        'CreateIdentityRequest': 'Create an identity',
        'CreateSignatureRequest': 'Create a signature',
        'CreateDataSourceRequest': 'Create a data source',
        'CreateFilterRulesRequest': 'Create filter rules',
        'ModifyAccountRequest': 'Modify the account',
        'ModifyPrefsRequest': 'Modify preferences',
        'ModifyAppointmentRequest': 'Modify the appointment',
        'ModifyContactRequest': 'Modify the contact',
        'ModifyIdentityRequest': 'Modify the identity',
        'ModifyFilterRulesRequest': 'Modify filter rules',
        'DeleteAccountRequest': 'Delete the account',
        'DeleteIdentityRequest': 'Delete the identity',
        'GetAccountRequest': 'Get account details',
        'GetAccountInfoRequest': 'Get account info',
        'GetInfoRequest': 'Get info',
        'GetPrefsRequest': 'Get preferences',
        'GetMsgRequest': 'Get the message',
        'GetFolderRequest': 'Get the folder',
        'GetContactsRequest': 'Get the contact',
        'GetIdentitiesRequest': 'Get identities',
        'GetFilterRulesRequest': 'Get filter rules',
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
        'DelegateAuthRequest': 'Delegate auth',
        'GetWhiteBlackListRequest': 'Get white/black list',
        'ModifyWhiteBlackListRequest': 'Modify white/black list',
        'GetOutgoingFilterRulesRequest': 'Get outgoing filter rules',
        'ModifyOutgoingFilterRulesRequest': 'Modify outgoing filter rules',
        'ApplyFilterRulesRequest': 'Apply filter rules',
        'GetDataSourcesRequest': 'Get data sources',
        'ImportDataRequest': 'Import data',
        'TestDataSourceRequest': 'Test data source',
        'DeleteDataSourceRequest': 'Delete data source',
        'ModifyDataSourceRequest': 'Modify data source',
        'ImportContactsRequest': 'Import contacts',
        'ExportContactsRequest': 'Export contacts',
        'GetAvailableSkinsRequest': 'Get available skins',
    };
    return map[requestType] || null;
}

function hasProperInlineComments(content) {
    const properPatterns = [
        /^\s*\/\/ Create/m,
        /^\s*\/\/ Get /m,
        /^\s*\/\/ Verify/m,
        /^\s*\/\/ Send /m,
        /^\s*\/\/ Search/m,
        /^\s*\/\/ Modify/m,
        /^\s*\/\/ Delete/m,
        /^\s*\/\/ Authenticate/m,
        /^\s*\/\/ Inject/m,
        /^\s*\/\/ Perform/m,
        /^\s*\/\/ Set /m,
        /^\s*\/\/ Grant/m,
        /^\s*\/\/ Revoke/m,
        /^\s*\/\/ Save /m,
    ];
    let matchCount = 0;
    for (const pattern of properPatterns) {
        if (pattern.test(content)) matchCount++;
    }
    return matchCount >= 2;
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Skip files that already have proper inline comments
    if (hasProperInlineComments(content)) {
        return false;
    }

    const rawLines = content.split(/\r?\n/);

    // PASS 1: Strip all inline comments inside it() blocks (except Applicable/Tests)
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

    // PASS 2: Inject operation and assertion comments
    const lines = cleanLines;
    const newLines = [];
    inIt = false;
    itDepth = 0;
    let inAssertBlock = false;
    let lastActionComment = null;
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

            if (isSoapCallStart) {
                inAssertBlock = false;

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

                if (commentStr === lastActionComment) {
                    while (newLines.length > 0 && newLines[newLines.length - 1].trim() === '') {
                        newLines.pop();
                    }
                    newLines.push(line);
                } else {
                    const indent = line.match(/^(\t*)/)[1] || '\t\t';
                    const prevLine = newLines.length > 0 ? newLines[newLines.length - 1].trim() : '';

                    if (isFirstActionInIt) {
                        newLines.push(line);
                        lastActionComment = commentStr;
                    } else {
                        if (prevLine !== '' && !prevLine.startsWith('it(') && !prevLine.startsWith('//')) {
                            newLines.push('');
                        }
                        newLines.push(indent + commentStr);
                        newLines.push(line);
                        lastActionComment = commentStr;
                    }
                }

                isFirstActionInIt = false;
                continue;
            }

            // Assertion group trigger
            if (t.startsWith('assert.') && !inAssertBlock) {
                inAssertBlock = true;
                lastActionComment = null;

                const indent = line.match(/^(\t*)/)[1] || '\t\t';
                const prevLine = newLines.length > 0 ? newLines[newLines.length - 1].trim() : '';

                if (!isFirstActionInIt) {
                    if (prevLine !== '' && !prevLine.startsWith('it(') && !prevLine.startsWith('//')) {
                        newLines.push('');
                    }
                    newLines.push(indent + '// Verify the response');
                }
            }

            if (t !== '' && !t.startsWith('//')) {
                isFirstActionInIt = false;
            }

            newLines.push(line);

        } else {
            newLines.push(line);
        }
    }

    // PASS 3: Replace any remaining "// Unknown" comments with actual SOAP request names
    for (let i = 0; i < newLines.length - 1; i++) {
        const trimmed = newLines[i].trimEnd();
        if (trimmed.endsWith('// Unknown')) {
            let requestName = null;
            for (let j = i + 1; j < Math.min(i + 6, newLines.length); j++) {
                const xmlMatch = newLines[j].trim().match(/<(\w+Request)\s/);
                if (xmlMatch) {
                    const text = getSoapComment(xmlMatch[1]);
                    requestName = text
                        ? `// ${text}`
                        : `// ${xmlMatch[1]}`;
                    break;
                }
            }
            if (requestName) {
                const indent = newLines[i].match(/^(\s*)/)[1];
                newLines[i] = indent + requestName;
            }
        }
    }

    // PASS 4: Remove "// XPath expression removed (not valid JS)" lines
    for (let i = newLines.length - 1; i >= 0; i--) {
        if (newLines[i].trim() === '// XPath expression removed (not valid JS)') {
            newLines.splice(i, 1);
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
