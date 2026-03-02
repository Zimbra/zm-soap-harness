/**
 * Fix the overly-specific SearchResponse assertion pattern.
 *
 * The strengthen-assertions.cjs script replaced:
 *   assert.exists(res.SearchResponse, 'X')
 * with:
 *   assert.exists(res.SearchResponse.m || res.SearchResponse.c, 'SearchResponse should contain results')
 *
 * This doesn't work for contacts (.cn), tasks (.task), appointments (.appt), etc.
 * Revert to: assert.exists(res.SearchResponse, 'SearchResponse should exist')
 *
 * Usage: node .agent/scripts/fix-search-response-assertion.cjs [dir]
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
    let fileChanges = 0;

    // Fix: assert.exists(VAR.SearchResponse.m || VAR.SearchResponse.c, 'SearchResponse should contain results')
    // Back to: assert.exists(VAR.SearchResponse, 'SearchResponse should exist')
    const pattern = /assert\.exists\((\w+)\.SearchResponse\.m\s*\|\|\s*\1\.SearchResponse\.c,\s*\n?\s*'SearchResponse should contain results'\)/g;
    const newContent = content.replace(pattern, function (match, varName) {
        fileChanges++;
        return "assert.exists(" + varName + ".SearchResponse, 'SearchResponse should exist')";
    });

    if (newContent !== content) {
        content = newContent;
    }

    // Also fix single-line version
    const pattern2 = /assert\.exists\((\w+)\.SearchResponse\.m \|\| \1\.SearchResponse\.c, 'SearchResponse should contain results'\)/g;
    const newContent2 = content.replace(pattern2, function (match, varName) {
        fileChanges++;
        return "assert.exists(" + varName + ".SearchResponse, 'SearchResponse should exist')";
    });

    if (newContent2 !== content) {
        content = newContent2;
    }

    if (fileChanges > 0) {
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles.push({ file: path.relative(targetDir, filePath), changes: fileChanges });
        totalChanges += fileChanges;
    }
}

console.log('\nScanned ' + files.length + ' files in ' + path.relative(process.cwd(), targetDir));
console.log('Total changes: ' + totalChanges + ' across ' + changedFiles.length + ' files\n');
changedFiles.forEach(function (f) { console.log('  ' + f.changes + ' changes in ' + f.file); });
