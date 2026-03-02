/**
 * Revert changes from fix-duplicate-const.cjs.
 *
 * The fix-duplicate-const script treated entire files as one scope, but each
 * it() block has its own function scope. So sentMsg2, sentMsg3, createdFolder2
 * etc. should be reverted back to sentMsg, createdFolder etc.
 *
 * Usage: node .agent/scripts/revert-duplicate-const-fix.cjs [dir]
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
    let fileChanges = 0;

    for (const varName of varNames) {
        // Revert sentMsg2, sentMsg3, etc. back to sentMsg
        for (let n = 20; n >= 2; n--) {
            const numberedName = varName + n;
            const regex = new RegExp('\\b' + numberedName + '\\b', 'g');
            if (regex.test(content)) {
                content = content.replace(regex, varName);
                fileChanges++;
            }
        }
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
