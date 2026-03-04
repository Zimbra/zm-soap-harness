#!/usr/bin/env node
/**
 * Auto-add zimbraMailHost assertions to JS test files.
 *
 * Handles 3 common patterns:
 *   A) CreateAccountResponse captured, account[0].id extracted → add zimbraMailHost after .id line
 *   B) CreateAccountResponse captured with Array.isArray → add zimbraMailHost after acct extraction
 *   C) Fire-and-forget (no response capture) → capture response, add Fault + id + zimbraMailHost
 *
 * USAGE:
 *   node .agent/scripts/add-zimbra-mail-host.js <module>
 *   node .agent/scripts/add-zimbra-mail-host.js calendar
 *   node .agent/scripts/add-zimbra-mail-host.js --dry-run calendar
 */

const fs = require('fs');
const path = require('path');

const JS_BASE = 'mocha/tests';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const mod = args.filter(a => !a.startsWith('--'))[0];

if (!mod) {
    console.log('Usage: node .agent/scripts/add-zimbra-mail-host.js [--dry-run] <module>');
    process.exit(1);
}

const jsDir = `${JS_BASE}/${mod}`;
if (!fs.existsSync(jsDir)) {
    console.log(`ERROR: ${jsDir} not found`);
    process.exit(1);
}

// Colors
const C = {
    green: s => `\x1b[32m${s}\x1b[0m`,
    yellow: s => `\x1b[33m${s}\x1b[0m`,
    red: s => `\x1b[31m${s}\x1b[0m`,
    cyan: s => `\x1b[36m${s}\x1b[0m`,
    bold: s => `\x1b[1m${s}\x1b[0m`,
};

// Find all JS files
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
console.log(C.bold(`\n  Adding zimbraMailHost assertions to ${mod} (${jsFiles.length} files)\n`));

for (const filepath of jsFiles) {
    const rel = filepath.replace(jsDir + '/', '');
    let content = fs.readFileSync(filepath, 'utf8');

    // Skip if already has zimbraMailHost
    if (/zimbraMailHost/.test(content)) {
        totalAlreadyOk++;
        continue;
    }

    // Skip if no CreateAccountRequest AND no createAccountByNameAndEmailAddress in the file
    if (!/CreateAccountRequest/.test(content) && !/createAccountByNameAndEmailAddress/.test(content)) {
        console.log(C.yellow(`  SKIP (no account creation): ${rel}`));
        totalSkipped++;
        continue;
    }

    let modified = false;
    const lines = content.split('\n');
    const newLines = [];
    let i = 0;
    let hostCount = 0; // Track how many host/createAcctRes/acctInfo blocks generated

    while (i < lines.length) {
        const line = lines[i];

        // ===================================================================
        // Pattern A: account[0].id extraction WITHOUT zimbraMailHost after it
        // e.g.: const orgId = orgRes.CreateAccountResponse.account[0].id;
        // or:   const id = res.CreateAccountResponse.account[0].id;
        // ===================================================================
        const patternA = line.match(/^(\s*)(const\s+\w+)\s*=\s*(\w+)\.CreateAccountResponse\.account\[0\]\.id/);
        if (patternA) {
            const indent = patternA[1];
            const resVar = patternA[3];
            newLines.push(line); // push the .id line

            // Check if zimbraMailHost already follows in next few lines
            const nextFew = lines.slice(i + 1, i + 5).join('\n');
            if (!/zimbraMailHost/.test(nextFew)) {
                // Add zimbraMailHost assertion
                hostCount++;
                const hVar = hostCount > 1 ? `host${hostCount}` : 'host';
                newLines.push(`${indent}const ${hVar} = ${resVar}.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');`);
                newLines.push(`${indent}assert.exists(${hVar}, 'zimbraMailHost should exist');`);
                modified = true;
            }
            i++;
            continue;
        }

        // ===================================================================
        // Pattern B: Array.isArray account extraction
        // e.g.: const acct = Array.isArray(createRes.CreateAccountResponse.account)
        //           ? createRes.CreateAccountResponse.account[0]
        //           : createRes.CreateAccountResponse.account;
        // Followed by: assert.exists(acct.id, ...);
        // ===================================================================
        const patternB = line.match(/^(\s*)(const\s+(\w+))\s*=\s*Array\.isArray\((\w+)\.CreateAccountResponse\.account\)/);
        if (patternB) {
            const indent = patternB[1];
            const acctVar = patternB[3];

            // Push this line and the next 2 (ternary)
            newLines.push(line);
            i++;
            // Push ternary lines
            while (i < lines.length && !lines[i].match(/;\s*$/)) {
                newLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) {
                newLines.push(lines[i]); // push the closing ;
                i++;
            }

            // Skip existing assert.exists(acct.id, ...) if present
            while (i < lines.length && lines[i].match(/^\s*assert\.exists\(\w+\.id/)) {
                newLines.push(lines[i]);
                i++;
            }

            // Check if zimbraMailHost already follows
            const nextFew = lines.slice(i, i + 5).join('\n');
            if (!/zimbraMailHost/.test(nextFew)) {
                hostCount++;
                const hVar = hostCount > 1 ? `host${hostCount}` : 'host';
                newLines.push(`${indent}const ${hVar} = ${acctVar}.a.find(a => a.n === 'zimbraMailHost');`);
                newLines.push(`${indent}assert.exists(${hVar}, 'zimbraMailHost should exist');`);
                modified = true;
            }
            continue;
        }

        // ===================================================================
        // Pattern C: Fire-and-forget CreateAccountRequest (no response capture)
        // e.g.: await soap.makeSOAPEnvelopeAdmin(
        //           `<CreateAccountRequest ...>`, adminAuthToken
        //       );
        // Followed by: const accountToken = await soap.getAccountAuthToken(email);
        // ===================================================================
        const patternC = line.match(/^(\s*)await\s+soap\.makeSOAPEnvelopeAdmin\s*\(/);
        if (patternC && !line.match(/const\s+\w+\s*=/) && i + 1 < lines.length) {
            // Check if the next few lines contain CreateAccountRequest
            const block = lines.slice(i, Math.min(i + 6, lines.length)).join('\n');
            if (/CreateAccountRequest/.test(block)) {
                const indent = patternC[1];

                // Replace 'await' with 'const createAcctResN = await'
                const cVarDecl = (hostCount + 1) > 1 ? `createAcctRes${hostCount + 1}` : 'createAcctRes';
                const newLine = line.replace(
                    /^(\s*)await\s+soap\.makeSOAPEnvelopeAdmin/,
                    `$1const ${cVarDecl} = await soap.makeSOAPEnvelopeAdmin`
                );
                newLines.push(newLine);
                i++;

                // Push rest of the SOAP call until closing );
                while (i < lines.length && !lines[i].match(/\);\s*$/)) {
                    newLines.push(lines[i]);
                    i++;
                }
                if (i < lines.length) {
                    newLines.push(lines[i]); // push the closing );
                    i++;
                }

                // Add assertions after the call
                hostCount++;
                const cVar = hostCount > 1 ? `createAcctRes${hostCount}` : 'createAcctRes';
                const aVar = hostCount > 1 ? `acctInfo${hostCount}` : 'acctInfo';
                const hVar = hostCount > 1 ? `host${hostCount}` : 'host';
                newLines.push(`${indent}assert.notExists(${cVar}.Fault, 'CreateAccountRequest should not fault');`);
                newLines.push(`${indent}const ${aVar} = Array.isArray(${cVar}.CreateAccountResponse.account)`);
                newLines.push(`${indent}\t? ${cVar}.CreateAccountResponse.account[0]`);
                newLines.push(`${indent}\t: ${cVar}.CreateAccountResponse.account;`);
                newLines.push(`${indent}assert.exists(${aVar}.id, 'Account ID should exist');`);
                newLines.push(`${indent}const ${hVar} = ${aVar}.a.find(a => a.n === 'zimbraMailHost');`);
                newLines.push(`${indent}assert.exists(${hVar}, 'zimbraMailHost should exist');`);
                modified = true;
                continue;
            }
        }

        // ===================================================================
        // Pattern D: Helper function with account[0].id but no zimbraMailHost
        // e.g.: async function makeAcct(prefix) {
        //           ...
        //           const id = res.CreateAccountResponse.account[0].id;
        //           ...
        //           return { email, id, token };
        // ===================================================================
        // (Already handled by Pattern A above — the .account[0].id line match)

        // ===================================================================
        // Pattern E: Inline assert.exists on account[0].id (no variable assignment)
        // e.g.: assert.exists(acctRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
        // ===================================================================
        const patternE = line.match(/^(\s*)assert\.exists\((\w+)\.CreateAccountResponse\.account\[0\]\.id/);
        if (patternE) {
            const indent = patternE[1];
            const resVar = patternE[2];
            newLines.push(line); // push the assert line

            const nextFew = lines.slice(i + 1, i + 5).join('\n');
            if (!/zimbraMailHost/.test(nextFew)) {
                hostCount++;
                const hVar = hostCount > 1 ? `host${hostCount}` : 'host';
                newLines.push(`${indent}const ${hVar} = ${resVar}.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');`);
                newLines.push(`${indent}assert.exists(${hVar}, 'zimbraMailHost should exist');`);
                modified = true;
            }
            i++;
            continue;
        }

        // ===================================================================
        // Pattern F: Assignment without const (outer scope variable)
        // e.g.: accountA1Id = r1.CreateAccountResponse.account[0].id;
        // e.g.: account1.id = res1.CreateAccountResponse.account[0].id;
        // ===================================================================
        const patternF = line.match(/^(\s*)([\w.]+)\s*=\s*(\w+)\.CreateAccountResponse\.account\[0\]\.id/);
        if (patternF && !line.match(/^(\s*)const\s/)) {
            const indent = patternF[1];
            const resVar = patternF[3];
            newLines.push(line);

            const nextFew = lines.slice(i + 1, i + 5).join('\n');
            if (!/zimbraMailHost/.test(nextFew)) {
                hostCount++;
                const hVar = hostCount > 1 ? `host${hostCount}` : 'host';
                newLines.push(`${indent}const ${hVar} = ${resVar}.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');`);
                newLines.push(`${indent}assert.exists(${hVar}, 'zimbraMailHost should exist');`);
                modified = true;
            }
            i++;
            continue;
        }

        // ===================================================================
        // Pattern K: Optional chaining extraction in before()/for-loop
        // e.g.: const acct = Array.isArray(res.CreateAccountResponse?.account)
        //           ? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
        // ===================================================================
        const patternK = line.match(/^(\s*)const\s+(\w+)\s*=\s*Array\.isArray\((\w+)\.CreateAccountResponse\?\.account\)/);
        if (patternK) {
            const indent = patternK[1];
            const acctVar = patternK[2];
            const resVar = patternK[3];
            newLines.push(line);

            // Read the ternary continuation line(s)
            let j = i + 1;
            while (j < lines.length && !/;\s*$/.test(lines[j - 1])) {
                newLines.push(lines[j]);
                j++;
            }

            const nextChunk = lines.slice(j, j + 5).join('\n');
            if (!/zimbraMailHost/.test(nextChunk)) {
                newLines.push(`${indent}if (${acctVar} && ${acctVar}.a) {`);
                newLines.push(`${indent}\tconst host = ${acctVar}.a.find(a => a.n === 'zimbraMailHost');`);
                newLines.push(`${indent}\tassert.exists(host, 'zimbraMailHost should exist');`);
                newLines.push(`${indent}}`);
                modified = true;
            }
            i = j;
            continue;
        }

        // ===================================================================
        // Pattern L: Compact inline helper function (e.g. sieve files)
        // e.g.: async function ca() { const e = `test...`; await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest...>`, adminAuthToken); return await soap.getAccountAuthToken(e); }
        // ===================================================================
        const patternL = line.match(/^\s*async\s+function\s+(\w+)\(\)\s*\{.*CreateAccountRequest.*getAccountAuthToken/);
        if (patternL && !/zimbraMailHost/.test(line)) {
            // Modify the one-liner to add GetAccountRequest + zimbraMailHost check
            const modified_line = line.replace(
                /(await\s+soap\.makeSOAPEnvelopeAdmin\(`<CreateAccountRequest[^`]*<\/CreateAccountRequest>`\s*,\s*(\w+)\);)/,
                (match, full, adminVar) => {
                    return `const __cr = ${full.replace('await ', '')} assert.notExists(__cr.Fault, 'CreateAccountRequest should not fault'); const __acct = Array.isArray(__cr.CreateAccountResponse.account) ? __cr.CreateAccountResponse.account[0] : __cr.CreateAccountResponse.account; assert.exists(__acct.id, 'Account ID should exist'); const __h = __acct.a.find(a => a.n === 'zimbraMailHost'); assert.exists(__h, 'zimbraMailHost should exist');`;
                }
            );
            if (modified_line !== line) {
                newLines.push(modified_line);
                modified = true;
            } else {
                newLines.push(line);
            }
            i++;
            continue;
        }

        // ===================================================================
        // Pattern G: Fault check followed by getAccountAuthToken (no ID extraction)
        // e.g.: assert.notExists(createRes.Fault, 'Response should not be a Fault');
        //       account1Token = await soap.getAccountAuthToken(account1Email);
        // ===================================================================
        const patternG = line.match(/^(\s*)assert\.notExists\((\w+)\.Fault,/);
        if (patternG) {
            const indent = patternG[1];
            const resVar = patternG[2];
            // Check if previous lines had CreateAccountRequest and next lines have getAccountAuthToken
            const prevFew = lines.slice(Math.max(0, i - 8), i).join('\n');
            const nextFew = lines.slice(i + 1, i + 5).join('\n');
            if (/CreateAccountRequest/.test(prevFew) && !/zimbraMailHost/.test(nextFew)) {
                newLines.push(line);
                hostCount++;
                const hVar = hostCount > 1 ? `host${hostCount}` : 'host';
                if (/getAccountAuthToken/.test(nextFew)) {
                    // Pattern G: has getAccountAuthToken next
                    newLines.push(`${indent}assert.exists(${resVar}.CreateAccountResponse.account[0].id, 'Account ID should exist');`);
                    newLines.push(`${indent}const ${hVar} = ${resVar}.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');`);
                    newLines.push(`${indent}assert.exists(${hVar}, 'zimbraMailHost should exist');`);
                } else {
                    // Pattern M: standalone Fault check, no getAccountAuthToken
                    newLines.push(`${indent}assert.exists(${resVar}.CreateAccountResponse.account[0].id, 'Account ID should exist');`);
                    newLines.push(`${indent}const ${hVar} = ${resVar}.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');`);
                    newLines.push(`${indent}assert.exists(${hVar}, 'zimbraMailHost should exist');`);
                }
                modified = true;
                i++;
                continue;
            }
        }

        // ===================================================================
        // Pattern J: Optional chaining account extraction (admin files)
        // e.g.: test_accountid.id = Array.isArray(res.CreateAccountResponse?.account) ?
        //           res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
        // ===================================================================
        const patternJ = line.match(/^(\s*)(\w[\w.]*)\.id\s*=\s*Array\.isArray\((\w+)\.CreateAccountResponse\?\.account\)/);
        if (patternJ) {
            const indent = patternJ[1];
            const resVar = patternJ[3];
            newLines.push(line);

            // Skip following lines until we get past the ternary + fallback block
            const nextChunk = lines.slice(i + 1, i + 15).join('\n');
            if (!/zimbraMailHost/.test(nextChunk)) {
                // Find the end of the if(!id) fallback block
                let insertIdx = i + 1;
                // Skip the ternary continuation line
                while (insertIdx < lines.length && !lines[insertIdx].match(/^\s*$/)) {
                    newLines.push(lines[insertIdx]);
                    insertIdx++;
                }
                // Look for the closing } of the if block, then the assert.isTrue
                let foundIfBlock = false;
                while (insertIdx < lines.length) {
                    const nextLine = lines[insertIdx];
                    newLines.push(nextLine);
                    insertIdx++;
                    if (/assert\.isTrue/.test(nextLine)) {
                        foundIfBlock = true;
                        // Read through the multi-line assert until we find the closing line
                        while (insertIdx < lines.length) {
                            const assertLine = lines[insertIdx];
                            newLines.push(assertLine);
                            insertIdx++;
                            if (/^\s*\}\)/.test(assertLine) || (/;\s*$/.test(assertLine) && !/\($/.test(assertLine) && !/,\s*$/.test(assertLine))) {
                                break;
                            }
                        }
                        break;
                    }
                }
                // Now add zimbraMailHost check using GetAccountRequest
                // Only if the response had a successful CreateAccountResponse
                if (foundIfBlock) {
                    // Find the email variable from preceding lines
                    const prevChunk = lines.slice(Math.max(0, i - 10), i + 2).join('\n');
                    const nameMatch = prevChunk.match(/<name>\$\{(\w+)\}<\/name>/);
                    const emailVar = nameMatch ? nameMatch[1] : null;
                    // Find admin auth variable
                    const adminMatch = prevChunk.match(/\}\)`,\s*(\w+)\)/);
                    const adminVar = adminMatch ? adminMatch[1] : 'adminAuth';
                    if (emailVar) {
                        newLines.push(`${indent}// Verify zimbraMailHost`);
                        newLines.push(`${indent}if (${resVar}.CreateAccountResponse) {`);
                        newLines.push(`${indent}\tconst acctArr = Array.isArray(${resVar}.CreateAccountResponse.account)`);
                        newLines.push(`${indent}\t\t? ${resVar}.CreateAccountResponse.account[0] : ${resVar}.CreateAccountResponse.account;`);
                        newLines.push(`${indent}\tif (acctArr && acctArr.a) {`);
                        newLines.push(`${indent}\t\tconst host = acctArr.a.find(a => a.n === 'zimbraMailHost');`);
                        newLines.push(`${indent}\t\tassert.exists(host, 'zimbraMailHost should exist');`);
                        newLines.push(`${indent}\t}`);
                        newLines.push(`${indent}}`);
                        modified = true;
                    }
                }
                i = insertIdx;
                continue;
            }
            i++;
            continue;
        }

        // ===================================================================
        // Pattern H: createAccountByNameAndEmailAddress helper (fire-and-forget)
        // e.g.: await soap.createAccountByNameAndEmailAddress(adminAuthToken, email, email);
        // ===================================================================
        const patternH = line.match(/^(\s*)await\s+soap\.createAccountByNameAndEmailAddress\s*\(\s*(\w+)\s*,\s*(\w+)/);
        if (patternH) {
            const indent = patternH[1];
            const adminVar = patternH[2];
            const emailVar = patternH[3];
            newLines.push(line);

            const nextFew = lines.slice(i + 1, i + 5).join('\n');
            if (!/zimbraMailHost/.test(nextFew)) {
                hostCount++;
                const irVar = hostCount > 1 ? `acctInfoRes${hostCount}` : 'acctInfoRes';
                const aVar = hostCount > 1 ? `acctInfo${hostCount}` : 'acctInfo';
                const hVar = hostCount > 1 ? `host${hostCount}` : 'host';
                newLines.push(`${indent}const ${irVar} = await soap.makeSOAPEnvelopeAdmin(`);
                newLines.push(`${indent}\t\`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">\${${emailVar}}</account></GetAccountRequest>\`, ${adminVar}`);
                newLines.push(`${indent});`);
                newLines.push(`${indent}assert.notExists(${irVar}.Fault, 'GetAccountRequest should not fault');`);
                newLines.push(`${indent}const ${aVar} = Array.isArray(${irVar}.GetAccountResponse.account)`);
                newLines.push(`${indent}\t? ${irVar}.GetAccountResponse.account[0]`);
                newLines.push(`${indent}\t: ${irVar}.GetAccountResponse.account;`);
                newLines.push(`${indent}assert.exists(${aVar}.id, 'Account ID should exist');`);
                newLines.push(`${indent}const ${hVar} = ${aVar}.a.find(a => a.n === 'zimbraMailHost');`);
                newLines.push(`${indent}assert.exists(${hVar}, 'zimbraMailHost should exist');`);
                modified = true;
            }
            i++;
            continue;
        }

        // ===================================================================
        // Pattern I: createAccountByNameAndEmailAddress with response capture
        // e.g.: const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, email, email);
        // ===================================================================
        const patternI = line.match(/^(\s*)const\s+(\w+)\s*=\s*await\s+soap\.createAccountByNameAndEmailAddress\s*\(\s*(\w+)\s*,\s*(\w+)/);
        if (patternI) {
            const indent = patternI[1];
            const adminVar = patternI[3];
            const emailVar = patternI[4];
            newLines.push(line);

            const nextFew = lines.slice(i + 1, i + 8).join('\n');
            if (!/zimbraMailHost/.test(nextFew)) {
                hostCount++;
                const irVar = hostCount > 1 ? `acctInfoRes${hostCount}` : 'acctInfoRes';
                const aVar = hostCount > 1 ? `acctInfo${hostCount}` : 'acctInfo';
                const hVar = hostCount > 1 ? `host${hostCount}` : 'host';
                newLines.push(`${indent}const ${irVar} = await soap.makeSOAPEnvelopeAdmin(`);
                newLines.push(`${indent}\t\`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">\${${emailVar}}</account></GetAccountRequest>\`, ${adminVar}`);
                newLines.push(`${indent});`);
                newLines.push(`${indent}assert.notExists(${irVar}.Fault, 'GetAccountRequest should not fault');`);
                newLines.push(`${indent}const ${aVar} = Array.isArray(${irVar}.GetAccountResponse.account)`);
                newLines.push(`${indent}\t? ${irVar}.GetAccountResponse.account[0]`);
                newLines.push(`${indent}\t: ${irVar}.GetAccountResponse.account;`);
                newLines.push(`${indent}assert.exists(${aVar}.id, 'Account ID should exist');`);
                newLines.push(`${indent}const ${hVar} = ${aVar}.a.find(a => a.n === 'zimbraMailHost');`);
                newLines.push(`${indent}assert.exists(${hVar}, 'zimbraMailHost should exist');`);
                modified = true;
            }
            i++;
            continue;
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
    } else {
        // Has CreateAccountRequest but no pattern matched
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
