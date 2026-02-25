/**
 * Adds missing name attribute to <doc l="..."> elements in SaveDocumentRequest.
 * Changes: <doc l="${id}"> to <doc name="doc.txt" l="${id}">
 * Also handles: <doc l="${id}" f="t"> and <doc ver="..." l="..." id="...">
 */
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'tests/briefcase';
const jsBaseDir = path.resolve(targetDir);
let totalFixed = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Pattern 1: <doc l="${...}"> (no name, no other attrs before l)
    content = content.replace(/<doc l="/g, '<doc name="doc.txt" l="');

    // Pattern 2: <doc l="${...}" f="..."> already handled by above

    // But we need to NOT double-add name if already present
    // Undo if name was already there: <doc name="..." name="doc.txt" l="...">
    content = content.replace(/<doc name="[^"]*" name="doc\.txt" l="/g, (match) => {
        // Already had a name, revert
        return match.replace(' name="doc.txt"', '');
    });

    // For doc updates (ver=... id=...) that don't need name, skip those
    // <doc ver="1" l="..." id="..." desc="...">  — these are updates, need name too

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        const count = (content.match(/name="doc\.txt"/g) || []).length;
        console.log('Fixed ' + count + ' doc elements in ' + path.relative(jsBaseDir, filePath));
        totalFixed += count;
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    });
}

walkDir(jsBaseDir);
console.log('Total doc elements fixed: ' + totalFixed);
