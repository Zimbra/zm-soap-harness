/**
 * Fix remaining if/else assertion guard blocks that the main script missed.
 * These are blocks like:
 *   if (res.SearchResponse.m) { <body> }
 * where the body should be kept but the if wrapper removed.
 *
 * Usage: node .agent/scripts/fix-remaining-if-else.cjs
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

    // Pattern 1: if (VAR.SearchResponse.m) { <body> }
    // or if (VAR.SearchResponse.c) { <body> }
    // Remove wrapper, keep body dedented by one level
    const pat1 = /(\t+)if\s*\(\s*(\w+)\.(?:SearchResponse|SearchConvResponse)\.(?:m|c)\s*\)\s*\{([\s\S]*?)\n\1\}/g;
    content = content.replace(pat1, function (match, indent, varName, body) {
        fileChanges++;
        // Dedent body by one tab
        var lines = body.split('\n');
        var dedented = lines.map(function (line) {
            if (line.startsWith(indent + '\t')) {
                return indent + line.slice(indent.length + 1);
            }
            return line;
        });
        return dedented.join('\n').trim();
    });

    // Pattern 2: if (!VAR.SearchResponse.m) { <skip/return body> }
    // These are "skip if no message" guards - remove entirely
    const pat2 = /\n\t+if\s*\(\s*!(\w+)\.SearchResponse\.m\s*\)\s*\{[^}]*\}\n/g;
    content = content.replace(pat2, function (match) {
        fileChanges++;
        return '\n';
    });

    // Pattern 3: if (VAR.SearchResponse && VAR.SearchResponse.m) { <body> }
    // (retry if-break patterns that remain)
    const pat3 = /(\t+)if\s*\(\s*(\w+)\.SearchResponse\s*&&\s*\2\.SearchResponse\.(?:m|c)\s*\)\s*\{([\s\S]*?)\n\1\}/g;
    content = content.replace(pat3, function (match, indent, varName, body) {
        fileChanges++;
        var lines = body.split('\n');
        var dedented = lines.map(function (line) {
            if (line.startsWith(indent + '\t')) {
                return indent + line.slice(indent.length + 1);
            }
            return line;
        });
        return dedented.join('\n').trim();
    });

    // Pattern 4: if (VAR.ReIndexResponse && VAR.ReIndexResponse.status === 'idle') { break; }
    // These are legitimate polling loops - skip them (do NOT modify)

    if (fileChanges > 0) {
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles.push({ file: path.relative(targetDir, filePath), changes: fileChanges });
        totalChanges += fileChanges;
    }
}

console.log('\nScanned ' + files.length + ' files in ' + path.relative(process.cwd(), targetDir));
console.log('Total changes: ' + totalChanges + ' across ' + changedFiles.length + ' files\n');
changedFiles.forEach(function (f) { console.log('  ' + f.changes + ' changes in ' + f.file); });
