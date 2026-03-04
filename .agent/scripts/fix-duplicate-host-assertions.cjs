/**
 * fix-duplicate-host-assertions.cjs
 * 
 * Removes duplicate host2/account ID assertion blocks that were
 * introduced by a prior automation bug. The pattern to remove:
 * 
 *   assert.exists(XXX.CreateAccountResponse.account[0].id, '...');  // DUPLICATE
 *   const host2 = XXX.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
 *   assert.exists(host2, 'zimbraMailHost should exist');
 * 
 * This 3-line block appears immediately after the correct host assertion.
 */
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
    console.log('Usage: node fix-duplicate-host-assertions.cjs <directory>');
    process.exit(1);
}

function getJsFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fp = path.join(dir, entry.name);
        if (entry.isDirectory()) results = results.concat(getJsFiles(fp));
        else if (entry.name.endsWith('.js')) results.push(fp);
    }
    return results;
}

const files = getJsFiles(path.resolve(targetDir));
let totalFixed = 0;
let totalLinesRemoved = 0;

for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('const host2')) continue;

    const lines = content.split('\n');
    const newLines = [];
    let linesRemoved = 0;
    let i = 0;

    while (i < lines.length) {
        // Look for the 3-line duplicate pattern:
        // Line i:   assert.exists(XXX.CreateAccountResponse.account[0].id, '...');
        // Line i+1: const host2 = XXX.CreateAccountResponse.account[0].a.find(...)
        // Line i+2: assert.exists(host2, 'zimbraMailHost should exist');
        if (i + 2 < lines.length) {
            const l0 = lines[i].trim();
            const l1 = lines[i + 1].trim();
            const l2 = lines[i + 2].trim();

            if (l0.match(/^assert\.exists\(\w+\.CreateAccountResponse\.account\[0\]\.id,/) &&
                l1.match(/^const host\d+\s*=\s*\w+\.CreateAccountResponse\.account\[0\]\.a\.find/) &&
                l2.match(/^assert\.exists\(host\d+,\s*'zimbraMailHost should exist'\)/)) {
                // Check if the PREVIOUS non-empty line already has a host assertion
                let prevIdx = newLines.length - 1;
                while (prevIdx >= 0 && newLines[prevIdx].trim() === '') prevIdx--;
                if (prevIdx >= 0 && newLines[prevIdx].trim().match(/assert\.exists\(host,\s*'zimbraMailHost should exist'\)/)) {
                    // Skip these 3 duplicate lines
                    i += 3;
                    linesRemoved += 3;
                    continue;
                }
            }
        }

        // Also handle duplicate host2 that appears in different patterns
        // (e.g., inside before() hooks with different variable names)
        if (i + 1 < lines.length) {
            const l0 = lines[i].trim();
            const l1 = lines[i + 1].trim();

            // Pattern: const hostN = ... followed by assert.exists(hostN, ...)
            // where N > 1 and appears right after an existing host assertion
            if (l0.match(/^const host(\d+)\s*=/) && parseInt(l0.match(/host(\d+)/)[1]) > 1 &&
                l1.match(/^assert\.exists\(host\d+,\s*'zimbraMailHost should exist'\)/)) {
                let prevIdx = newLines.length - 1;
                while (prevIdx >= 0 && newLines[prevIdx].trim() === '') prevIdx--;
                if (prevIdx >= 0 && newLines[prevIdx].trim().match(/assert\.exists\(host,\s*'zimbraMailHost should exist'\)/)) {
                    i += 2;
                    linesRemoved += 2;
                    continue;
                }
            }
        }

        newLines.push(lines[i]);
        i++;
    }

    if (linesRemoved > 0) {
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
        const relPath = path.relative(path.resolve(targetDir), filePath);
        console.log(`✅ ${relPath}: removed ${linesRemoved} duplicate lines`);
        totalFixed++;
        totalLinesRemoved += linesRemoved;
    }
}

console.log(`\n--- Summary ---`);
console.log(`Files fixed: ${totalFixed}`);
console.log(`Total lines removed: ${totalLinesRemoved}`);
