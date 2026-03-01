// Script to replace "// Unknown" comments with actual SOAP request names
import fs from 'fs';
import path from 'path';

const searchDir = 'c:/claude/zm-soap-harness/mocha/tests/search';

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

const files = findJsFiles(searchDir);
let totalReplacements = 0;
const changedFiles = [];

for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    let modified = false;

    for (let i = 0; i < lines.length - 1; i++) {
        const trimmed = lines[i].trimEnd();
        if (trimmed.endsWith('// Unknown')) {
            // Look ahead for the SOAP request name in the XML
            let requestName = null;
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                const xmlLine = lines[j].trim();
                const xmlMatch = xmlLine.match(/<(\w+Request)\s/);
                if (xmlMatch) {
                    requestName = xmlMatch[1];
                    break;
                }
            }

            if (requestName) {
                const indent = lines[i].match(/^(\s*)/)[1];
                lines[i] = `${indent}// ${requestName}`;
                modified = true;
                totalReplacements++;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(file, lines.join('\n'), 'utf-8');
        changedFiles.push(path.relative(searchDir, file));
    }
}

console.log(`Total replacements: ${totalReplacements}`);
console.log(`Changed files: ${changedFiles.length}`);
changedFiles.forEach(f => console.log(`  ${f}`));
