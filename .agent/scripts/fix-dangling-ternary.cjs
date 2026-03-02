/**
 * Remove dangling ternary else branches left by fix-same-scope-duplicates.cjs.
 *
 * The script removed `const varName = Array.isArray(...)` and `? ...` lines
 * but left the `: value;` lines. This script removes standalone ternary else
 * branches that are NOT preceded by a `?` ternary if branch.
 *
 * Pattern to remove: lines matching `^\t\t\t: ` that are NOT part of a
 * normal ternary expression (i.e., the preceding non-blank line doesn't contain `?`).
 *
 * Usage: node .agent/scripts/fix-dangling-ternary.cjs [dir]
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '..', '..', 'mocha', 'tests');

function findJsFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findJsFiles(fullPath));
        } else if (entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

const files = findJsFiles(targetDir);
let totalChanges = 0;
const changedFiles = [];

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(lineEnding);
    const toRemove = [];
    let fileChanges = 0;

    for (let i = 0; i < lines.length; i++) {
        // Match dangling ternary else: `\t\t\t: someValue;`
        if (/^\t\t\t: \w+/.test(lines[i])) {
            // Check if the preceding non-blank line contains `?` (valid ternary)
            let prevIdx = i - 1;
            while (prevIdx >= 0 && lines[prevIdx].trim() === '') prevIdx--;

            if (prevIdx >= 0 && lines[prevIdx].includes('?')) {
                // This is part of a valid ternary, skip
                continue;
            }

            // This is a dangling else branch, remove it
            toRemove.push(i);
            fileChanges++;
        }
    }

    if (fileChanges > 0) {
        // Remove lines in reverse
        for (let j = toRemove.length - 1; j >= 0; j--) {
            lines.splice(toRemove[j], 1);
        }
        fs.writeFileSync(filePath, lines.join(lineEnding), 'utf-8');
        changedFiles.push({ file: path.relative(targetDir, filePath), changes: fileChanges });
        totalChanges += fileChanges;
    }
}

console.log('\nScanned ' + files.length + ' files in ' + path.relative(process.cwd(), targetDir));
console.log('Total changes: ' + totalChanges + ' across ' + changedFiles.length + ' files\n');
changedFiles.forEach(function (f) { console.log('  ' + f.changes + ' changes in ' + f.file); });
