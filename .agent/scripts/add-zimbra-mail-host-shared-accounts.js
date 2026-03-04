#!/usr/bin/env node
/**
 * Auto-add zimbraMailHost assertions to JS test files that use shared/pre-existing accounts.
 *
 * These files use soap.testAccounts.testAccountN or soap.getAccountAuthToken() directly
 * in before() blocks WITHOUT CreateAccountRequest. We add GetAccountInfoRequest + zimbraMailHost
 * check after the first getAccountAuthToken call in the before() block.
 *
 * USAGE:
 *   node .agent/scripts/add-zimbra-mail-host-shared-accounts.js <module>
 *   node .agent/scripts/add-zimbra-mail-host-shared-accounts.js --dry-run tasks
 */

const fs = require('fs');
const path = require('path');

const JS_BASE = 'mocha/tests';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const mod = args.filter(a => !a.startsWith('--'))[0];

if (!mod) {
    console.log('Usage: node .agent/scripts/add-zimbra-mail-host-shared-accounts.js [--dry-run] <module>');
    process.exit(1);
}

const jsDir = `${JS_BASE}/${mod}`;
if (!fs.existsSync(jsDir)) {
    console.log(`ERROR: ${jsDir} not found`);
    process.exit(1);
}

const C = {
    green: s => `\x1b[32m${s}\x1b[0m`,
    yellow: s => `\x1b[33m${s}\x1b[0m`,
    red: s => `\x1b[31m${s}\x1b[0m`,
    bold: s => `\x1b[1m${s}\x1b[0m`,
};

function findFiles(dir, ext) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    function walk(d) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith(ext)) results.push(full.replace(/\\/g, '/'));
        }
    }
    walk(dir);
    return results.sort();
}

let totalFixed = 0;
let totalSkipped = 0;
let totalAlreadyOk = 0;

const jsFiles = findFiles(jsDir, '.js');
console.log(C.bold(`\n  Adding zimbraMailHost (shared accounts) to ${mod} (${jsFiles.length} files)\n`));

for (const filepath of jsFiles) {
    const rel = filepath.replace(jsDir + '/', '');
    let content = fs.readFileSync(filepath, 'utf8');

    // Skip if already has zimbraMailHost
    if (/zimbraMailHost/.test(content)) {
        totalAlreadyOk++;
        continue;
    }

    // Only process files WITHOUT CreateAccountRequest (those are handled by the other script)
    if (/CreateAccountRequest/.test(content)) {
        totalSkipped++;
        continue;
    }

    // Must have getAccountAuthToken to be eligible
    if (!/getAccountAuthToken/.test(content)) {
        // Check for adminAuthToken only (admin-only files)
        if (/getAdminAuthToken/.test(content) && !/getAccountAuthToken/.test(content)) {
            // Admin-only files - skip for now
            console.log(C.yellow(`  SKIP (admin-only, no user account): ${rel}`));
            totalSkipped++;
            continue;
        }
        console.log(C.yellow(`  SKIP (no getAccountAuthToken): ${rel}`));
        totalSkipped++;
        continue;
    }

    let modified = false;
    const lines = content.split('\n');
    const newLines = [];
    let i = 0;
    let beforeBlockFound = false;
    let firstAccountDone = false;

    while (i < lines.length) {
        const line = lines[i];

        // Detect before() block
        if (/before\s*\(async/.test(line)) {
            beforeBlockFound = true;
            firstAccountDone = false;
        }

        // Inside before() block: look for the closing });
        // Pattern: accountAuthToken = await soap.getAccountAuthToken(email);
        // We add GetAccountInfoRequest + zimbraMailHost after the LAST getAccountAuthToken in before()
        if (beforeBlockFound && !firstAccountDone) {
            const authMatch = line.match(/^(\s*)(\w+)\s*=\s*await\s+soap\.getAccountAuthToken\((\w+)\)/);
            if (authMatch) {
                const indent = authMatch[1];
                const emailVar = authMatch[3];
                newLines.push(line);
                i++;

                // Look ahead: is this the last getAccountAuthToken before }); ?
                let nextAuthIdx = -1;
                let closingIdx = -1;
                for (let j = i; j < lines.length; j++) {
                    if (/getAccountAuthToken/.test(lines[j])) {
                        nextAuthIdx = j;
                        break;
                    }
                    if (/^\s*\}\);/.test(lines[j]) || /^\s*\}\s*\)/.test(lines[j])) {
                        closingIdx = j;
                        break;
                    }
                }

                // If no more getAccountAuthToken before closing, add zimbraMailHost here
                if (nextAuthIdx === -1 || (closingIdx !== -1 && closingIdx < nextAuthIdx)) {
                    // Add GetAccountInfoRequest + zimbraMailHost assertion
                    newLines.push(`${indent}const acctInfoRes = await soap.makeSOAPEnvelopeAccount(`);
                    newLines.push(`${indent}\t'<GetAccountInfoRequest xmlns="urn:zimbraAccount"><account by="name">' + ${emailVar} + '</account></GetAccountInfoRequest>', ${authMatch[2]}`);
                    newLines.push(`${indent});`);
                    newLines.push(`${indent}assert.notExists(acctInfoRes.Fault, 'GetAccountInfoRequest should not fault');`);
                    newLines.push(`${indent}const mailHost = acctInfoRes.GetAccountInfoResponse.attr.find(a => a.name === 'zimbraMailHost');`);
                    newLines.push(`${indent}assert.exists(mailHost, 'zimbraMailHost should exist');`);
                    modified = true;
                    firstAccountDone = true;
                }
                continue;
            }

            // Detect end of before() block
            if (/^\s*\}\);/.test(line) || /^\s*\}\s*\)/.test(line)) {
                beforeBlockFound = false;
            }
        }

        newLines.push(line);
        i++;
    }

    if (modified) {
        const newContent = newLines.join('\n');
        if (!dryRun) {
            fs.writeFileSync(filepath, newContent, 'utf8');
        }
        totalFixed++;
        console.log(C.green(`  ✅ FIXED: ${rel}${dryRun ? ' (dry-run)' : ''}`));
    } else if (!modified && /getAccountAuthToken/.test(content) && !/zimbraMailHost/.test(content)) {
        console.log(C.yellow(`  ⚠️  NO PATTERN MATCH: ${rel}`));
        totalSkipped++;
    }
}

console.log('');
console.log(C.bold('  Summary:'));
console.log(`    Already OK:     ${totalAlreadyOk}`);
console.log(`    Fixed:          ${totalFixed}`);
console.log(`    Skipped/Manual: ${totalSkipped}`);
console.log(`    Total:          ${jsFiles.length}`);
console.log('');
