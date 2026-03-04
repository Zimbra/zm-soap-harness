/**
 * add-zimbra-mail-host.cjs
 * 
 * Adds zimbraMailHost assertion to files that have CreateAccountResponse
 * but are missing the zimbraMailHost check.
 * 
 * Pattern: After extracting account from CreateAccountResponse, add:
 *   const host = <accountVar>.a.find(a => a.n === 'zimbraMailHost');
 *   assert.exists(host, 'zimbraMailHost should exist');
 */
const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, 'tests');

function getJsFiles(dir) {
    let results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fp = path.join(dir, entry.name);
            if (entry.isDirectory()) results = results.concat(getJsFiles(fp));
            else if (entry.name.endsWith('.js')) results.push(fp);
        }
    } catch (e) { }
    return results;
}

const allFiles = getJsFiles(testsDir);
const targetFiles = allFiles.filter(f => {
    const c = fs.readFileSync(f, 'utf8');
    return c.includes('CreateAccountResponse') && !c.includes('zimbraMailHost');
});

console.log(`Found ${targetFiles.length} files needing zimbraMailHost:\n`);
targetFiles.forEach(f => console.log(`  ${path.relative(testsDir, f)}`));

let modified = 0;
let skipped = [];

for (const filePath of targetFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relPath = path.relative(testsDir, filePath);

    // Skip create-account-02 through create-account-06 - these test invalid attrs
    // and expect Faults, so zimbraMailHost doesn't apply
    if (/create-account-0[2-6]\.js$/.test(filePath)) {
        skipped.push({ file: relPath, reason: 'Tests invalid attrs / expects Faults' });
        continue;
    }

    let newLines = [...lines];
    let insertions = 0;

    // Pattern 1: account-logger.js style
    // Looks for: const getAcctId = r => {
    //   const acct = r.CreateAccountResponse?.account;
    //   return Array.isArray(acct) ? acct[0].id : acct?.id;
    // };
    // Need to add zimbraMailHost check after each r1/r2/r3/r4 CreateAccountResponse extraction  
    // For account-logger.js, the accounts are created in before() but only IDs are used
    // The response vars (r1-r4) have the full response including .account[0].a 
    // We need to add host extraction after the getAcctId helper

    // Pattern 2: IIFE pattern for account ID
    // const acctId = (() => { const a = createRes.CreateAccountResponse?.account; return Array.isArray(a) ? a[0].id : a?.id; })();
    // Need to add assertion after this line

    // Pattern 3: Simple extraction  
    // const acctId = createRes.CreateAccountResponse.account[0].id;
    // Need to add assertion after the ID extraction

    // Detect the indentation and response variable
    for (let i = newLines.length - 1; i >= 0; i--) {
        const line = newLines[i];

        // Pattern 2: IIFE one-liner for account extraction
        // e.g., const acctId = (() => { const a = createRes.CreateAccountResponse?.account; return Array.isArray(a) ? a[0].id : a?.id; })();
        const iifeMatch = line.match(/^(\s*)(?:const|let|var)\s+\w+\s*=\s*\(\(\)\s*=>\s*\{\s*const\s+\w+\s*=\s*(\w+)\.CreateAccountResponse/);
        if (iifeMatch) {
            const indent = iifeMatch[1];
            const resVar = iifeMatch[2];
            const hostLine = `${indent}const host = ${resVar}.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');`;
            const assertLine = `${indent}assert.exists(host, 'zimbraMailHost should exist');`;
            newLines.splice(i + 1, 0, hostLine, assertLine);
            insertions++;
            continue;
        }

        // Pattern 2b: IIFE multi-line - check for (() => {
        // Account-logger.js has a different pattern: getAcctId helper -> accountXId = getAcctId(rX)
        // For these, we need to add host after the r1-r4 response assignment

        // Pattern 3: Direct extraction patterns
        // const acctId = res.CreateAccountResponse.account[0].id;
        const directMatch = line.match(/^(\s*)(?:const|let|var)\s+\w+\s*=\s*(\w+)\.CreateAccountResponse\.account\[0\]\.id/);
        if (directMatch) {
            const indent = directMatch[1];
            const resVar = directMatch[2];
            const hostLine = `${indent}const host = ${resVar}.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');`;
            const assertLine = `${indent}assert.exists(host, 'zimbraMailHost should exist');`;
            newLines.splice(i + 1, 0, hostLine, assertLine);
            insertions++;
            continue;
        }
    }

    // Special handling for account-logger.js - it uses a helper function
    if (relPath.includes('account-logger')) {
        // The file creates r1-r4 and uses getAcctId helper
        // We need to add host checks after each response
        // Look for lines like: account1Id = getAcctId(r1);
        let newContent = newLines.join('\n');

        // After the getAcctId helper and the account assignments, add host assertions
        // Find: account1Id = getAcctId(r1);
        const helperPattern = /^(\t\t)(account\dId = getAcctId\(r(\d)\);)/gm;
        let match;
        const insertAfter = [];
        while ((match = helperPattern.exec(newContent)) !== null) {
            const indent = match[1];
            const rNum = match[3];
            insertAfter.push({
                afterText: match[0],
                hostLine: `${indent}const host${rNum} = r${rNum}.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');`,
                assertLine: `${indent}assert.exists(host${rNum}, 'zimbraMailHost should exist');`
            });
        }

        // Apply insertions in reverse order to maintain line positions
        for (const ins of insertAfter.reverse()) {
            newContent = newContent.replace(
                ins.afterText,
                `${ins.afterText}\n${ins.hostLine}\n${ins.assertLine}`
            );
            insertions++;
        }

        if (insertions > 0) {
            newLines = newContent.split('\n');
        }
    }

    if (insertions > 0) {
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
        console.log(`\n✅ ${relPath}: Added ${insertions} zimbraMailHost assertion(s)`);
        modified++;
    } else {
        skipped.push({ file: relPath, reason: 'No matching pattern found' });
    }
}

console.log(`\n--- Summary ---`);
console.log(`Modified: ${modified}`);
console.log(`Skipped: ${skipped.length}`);
skipped.forEach(s => console.log(`  SKIP: ${s.file} (${s.reason})`));
