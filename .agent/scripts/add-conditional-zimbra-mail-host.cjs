/**
 * add-conditional-zimbra-mail-host.cjs
 * 
 * For files where CreateAccountResponse is checked alongside expected Faults
 * (i.e., the assertion allows both success or fault), this script adds a
 * conditional zimbraMailHost check:
 * 
 *   if (res.CreateAccountResponse) {
 *       const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
 *       assert.exists(host, 'zimbraMailHost should exist');
 *   }
 *
 * Inserts AFTER each `assert.isTrue(!!res.CreateAccountResponse || ...` block.
 */
const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);
if (files.length === 0) {
    console.log('Usage: node add-conditional-zimbra-mail-host.cjs <file1> [file2] ...');
    process.exit(1);
}

let totalInsertions = 0;

for (const filePath of files) {
    const absPath = path.resolve(filePath);
    const content = fs.readFileSync(absPath, 'utf8');

    if (content.includes('zimbraMailHost')) {
        console.log(`SKIP: ${filePath} — already has zimbraMailHost`);
        continue;
    }

    const lines = content.split('\n');
    const newLines = [];
    let insertions = 0;

    for (let i = 0; i < lines.length; i++) {
        newLines.push(lines[i]);

        // Detect end of assert.isTrue block that checks CreateAccountResponse
        // Pattern: lines ending with `? JSON.stringify(res.Fault) : 'none'}` or `: 'no fault'}`
        // followed by a closing `);`
        if (i + 1 < lines.length &&
            /^\t\t\t\t\? JSON\.stringify\(res\.Fault\)\s*:\s*'(none|no fault)'\}\`\);$/.test(lines[i].trimEnd())) {
            // This is the end of the assert.isTrue block
            // Detect indentation from current line
            const indent = lines[i].match(/^(\t+)/)?.[1] || '\t\t';
            const baseIndent = indent.replace(/\t$/, ''); // one level up

            // Add conditional zimbraMailHost check
            newLines.push('');
            newLines.push(`${baseIndent}if (res.CreateAccountResponse) {`);
            newLines.push(`${baseIndent}\tconst host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');`);
            newLines.push(`${baseIndent}\tassert.exists(host, 'zimbraMailHost should exist');`);
            newLines.push(`${baseIndent}}`);
            insertions++;
        }
    }

    if (insertions > 0) {
        fs.writeFileSync(absPath, newLines.join('\n'), 'utf8');
        console.log(`✅ ${filePath}: Added ${insertions} conditional zimbraMailHost assertion(s)`);
        totalInsertions += insertions;
    } else {
        console.log(`NO MATCH: ${filePath} — pattern not found`);
    }
}

console.log(`\nTotal insertions: ${totalInsertions}`);
