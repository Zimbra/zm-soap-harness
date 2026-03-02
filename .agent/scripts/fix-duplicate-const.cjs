/**
 * Fix duplicate variable declarations introduced by strengthen-assertions.cjs.
 * When a test has multiple assertions of the same response type in the same
 * function scope, the script produces duplicate `const varName = ...` declarations.
 *
 * This script finds all functions/arrow-functions and within each, renames
 * the 2nd+ occurrence of each variable to varName2, varName3, etc.
 *
 * Usage: node .agent/scripts/fix-duplicate-const.cjs [dir]
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

// Variable names introduced by strengthen-assertions.cjs
const varNames = [
    'sentMsg', 'msgAction', 'itemAction', 'getMsg', 'folderAction',
    'convAction', 'addedMsg', 'draftMsg', 'createdTag', 'createdFolder'
];

const files = findJsFiles(targetDir);
let totalChanges = 0;
const changedFiles = [];

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let fileChanges = 0;

    // For each variable name, find all occurrences in the file
    for (const varName of varNames) {
        // Find all lines with `const VARNAME = Array.isArray` or `assert.exists(VARNAME,` or `assert.isString(VARNAME.`
        const declPattern = new RegExp('^(\\s*)const\\s+' + varName + '\\s*=', '');
        const refPattern = new RegExp('\\b' + varName + '\\b', 'g');

        // Collect line indices of declarations
        const declLines = [];
        for (let i = 0; i < lines.length; i++) {
            if (declPattern.test(lines[i])) {
                declLines.push(i);
            }
        }

        // If 2+ declarations, rename subsequent ones
        if (declLines.length >= 2) {
            for (let d = 1; d < declLines.length; d++) {
                const newVarName = varName + (d + 1);
                const lineIdx = declLines[d];

                // Rename on the declaration line
                lines[lineIdx] = lines[lineIdx].replace(
                    new RegExp('const\\s+' + varName + '\\b'),
                    'const ' + newVarName
                );

                // Rename on the next few lines (the assert lines that reference this var)
                // Typically the next 2-3 lines after the declaration reference it
                for (let j = lineIdx + 1; j < Math.min(lineIdx + 5, lines.length); j++) {
                    if (refPattern.test(lines[j]) && !declPattern.test(lines[j])) {
                        lines[j] = lines[j].replace(
                            new RegExp('\\b' + varName + '\\b', 'g'),
                            newVarName
                        );
                    } else if (declPattern.test(lines[j])) {
                        break; // Next declaration, stop
                    }
                }
                fileChanges++;
            }
        }
    }

    if (fileChanges > 0) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
        changedFiles.push({ file: path.relative(targetDir, filePath), changes: fileChanges });
        totalChanges += fileChanges;
    }
}

console.log('\nScanned ' + files.length + ' files in ' + path.relative(process.cwd(), targetDir));
console.log('Total changes: ' + totalChanges + ' across ' + changedFiles.length + ' files\n');
changedFiles.forEach(function (f) { console.log('  ' + f.changes + ' changes in ' + f.file); });
