/**
 * Fix long lines (>120 chars) in test files.
 * 
 * Handles:
 * 1. Long `const obj = { key: val, key: val, ... };` — breaks to multi-line
 * 2. Long `it('...')` descriptions — no change (test names from XML originals)
 * 
 * Skips lines inside template literals (MIME content, XML).
 */
const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const MAX_LINE = 120;

function getAllJsFiles(dir) {
    const results = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            results.push(...getAllJsFiles(full));
        } else if (item.endsWith('.js')) {
            results.push(full);
        }
    }
    return results;
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const newLines = [];
    let modified = false;
    let inTemplate = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track template literals
        const backtickCount = (line.match(/`/g) || []).length;
        if (backtickCount % 2 === 1) {
            inTemplate = !inTemplate;
        }

        // Skip lines inside template literals (MIME content, XML body)
        if (inTemplate && !line.includes('`')) {
            newLines.push(line);
            continue;
        }

        // Only process lines that are too long
        if (line.length <= MAX_LINE) {
            newLines.push(line);
            continue;
        }

        const trimmed = line.trim();
        const indent = line.match(/^(\s*)/)[1];

        // Pattern: const VAR = { key: val, key: val, ... };
        const objMatch = trimmed.match(/^const\s+(\w+)\s*=\s*(\{.+\});?\s*$/);
        if (objMatch && !trimmed.includes('`') && !trimmed.includes('=>')) {
            const varName = objMatch[1];
            const objStr = objMatch[2];

            // Parse the object literal - split by comma but respect nested structures
            const inner = objStr.slice(1, -1).trim(); // Remove { and }
            const parts = [];
            let depth = 0;
            let current = '';

            for (let c = 0; c < inner.length; c++) {
                const ch = inner[c];
                if (ch === '{' || ch === '[' || ch === '(') depth++;
                else if (ch === '}' || ch === ']' || ch === ')') depth--;

                if (ch === ',' && depth === 0) {
                    parts.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            if (current.trim()) parts.push(current.trim());

            if (parts.length > 1) {
                const childIndent = indent + '\t';
                newLines.push(`${indent}const ${varName} = {`);
                for (let p = 0; p < parts.length; p++) {
                    const comma = p < parts.length - 1 ? ',' : '';
                    newLines.push(`${childIndent}${parts[p]}${comma}`);
                }
                newLines.push(`${indent}};`);
                modified = true;
                continue;
            }
        }

        // Default: keep line as-is (long it() names, MIME content, etc.)
        newLines.push(line);
    }

    if (modified) {
        fs.writeFileSync(filePath, newLines.join(newline), 'utf8');
        console.log('FIXED: ' + path.relative(TARGET_DIR, filePath));
    }
    return modified;
}

const files = getAllJsFiles(TARGET_DIR);
let updated = 0;
for (const f of files) {
    if (processFile(f)) updated++;
}
console.log(`\nTotal updated: ${updated} of ${files.length}`);
