// Script to remove "// XPath expression removed (not valid JS)" comment lines.
//
// Usage: node .agent/scripts/fix-xpath-comments.mjs [directory]
// Default directory: mocha/tests/search

import fs from 'fs';
import path from 'path';

const targetDir = process.argv[2] || 'c:/claude/zm-soap-harness/mocha/tests/search';

function findJsFiles(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findJsFiles(fullPath));
        } else if (entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

const files = findJsFiles(targetDir);
let totalRemovals = 0;
const changedFiles = [];

for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const newLines = [];
    let removals = 0;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim().replace(/\r$/, '');
        if (trimmed === '// XPath expression removed (not valid JS)') {
            removals++;
            continue;
        }
        newLines.push(lines[i]);
    }

    if (removals > 0) {
        fs.writeFileSync(file, newLines.join('\n'), 'utf-8');
        changedFiles.push({ file: path.relative(targetDir, file), removals });
        totalRemovals += removals;
    }
}

console.log(`Total XPath comments removed: ${totalRemovals}`);
console.log(`Files modified: ${changedFiles.length}`);
changedFiles.forEach(f => console.log(`  ${f.file} (${f.removals} removed)`));
