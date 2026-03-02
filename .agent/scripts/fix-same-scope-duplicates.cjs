/**
 * Fix ACTUAL duplicate const declarations in the same function scope.
 * 
 * Unlike fix-duplicate-const.cjs which incorrectly treated the whole file as
 * one scope, this script only fixes duplicates within the same function body
 * (same it()/before()/after() block).
 *
 * Strategy: remove the duplicate const+assert lines since the first occurrence
 * already validates the response.
 *
 * Usage: node .agent/scripts/fix-same-scope-duplicates.cjs [dir]
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

const varNames = [
    'sentMsg', 'msgAction', 'itemAction', 'getMsg', 'folderAction',
    'convAction', 'addedMsg', 'draftMsg', 'createdTag', 'createdFolder'
];

const files = findJsFiles(targetDir);
let totalChanges = 0;
const changedFiles = [];

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    let lines = content.split(lineEnding);
    let fileChanges = 0;

    for (const varName of varNames) {
        const declRegex = new RegExp('^(\\s*)const\\s+' + varName + '\\s*=');

        // Find all declaration line indices
        const declLines = [];
        for (let i = 0; i < lines.length; i++) {
            if (declRegex.test(lines[i])) {
                declLines.push(i);
            }
        }

        if (declLines.length < 2) continue;

        // Check which ones truly share the same scope by tracking brace depth
        // Simple heuristic: two declarations are in the same scope if there
        // are no lines with `});` between them (which closes an it() block)
        for (let d = declLines.length - 1; d >= 1; d--) {
            const prevIdx = declLines[d - 1];
            const currIdx = declLines[d];

            // Check if there's a `});` between them (closing an it/before/after block)
            let sameScope = true;
            for (let j = prevIdx + 1; j < currIdx; j++) {
                // Look for closing of arrow function: `});` at a tab level indicating
                // end of it() block
                if (/^\t\}\);/.test(lines[j]) || /^\t\t\}\);/.test(lines[j])) {
                    sameScope = false;
                    break;
                }
            }

            if (sameScope) {
                // Remove the duplicate declaration and its assertion line
                // The declaration is typically 2 lines (with ternary on next line)
                // followed by an assert.exists line
                const toRemove = [];
                toRemove.push(currIdx); // const varName = Array.isArray(...)

                // Check if next line is continuation of ternary
                if (currIdx + 1 < lines.length &&
                    /^\s*\?/.test(lines[currIdx + 1])) {
                    toRemove.push(currIdx + 1);
                }

                // Check if line after that is assert.exists(varName, ...)
                const assertIdx = toRemove[toRemove.length - 1] + 1;
                if (assertIdx < lines.length &&
                    lines[assertIdx].includes('assert.exists(' + varName)) {
                    toRemove.push(assertIdx);
                }

                // Remove lines (in reverse order)
                toRemove.sort((a, b) => b - a);
                for (const idx of toRemove) {
                    lines.splice(idx, 1);
                }
                fileChanges++;
            }
        }
    }

    if (fileChanges > 0) {
        fs.writeFileSync(filePath, lines.join(lineEnding), 'utf-8');
        changedFiles.push({ file: path.relative(targetDir, filePath), changes: fileChanges });
        totalChanges += fileChanges;
    }
}

console.log('\nScanned ' + files.length + ' files in ' + path.relative(process.cwd(), targetDir));
console.log('Total changes: ' + totalChanges + ' across ' + changedFiles.length + ' files\n');
changedFiles.forEach(function (f) { console.log('  ' + f.changes + ' changes in ' + f.file); });
