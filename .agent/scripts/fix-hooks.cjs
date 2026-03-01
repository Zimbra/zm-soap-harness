const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

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

function getRelativePath(filePath) {
    const fileDir = path.dirname(filePath);
    // Find the mocha/ root by locating 'tests' directory in the path
    const normalizedPath = filePath.replace(/\\/g, '/');
    const testsIndex = normalizedPath.lastIndexOf('/tests/');
    if (testsIndex === -1) {
        return null;
    }
    const mochaRoot = normalizedPath.substring(0, testsIndex);
    let rel = path.relative(fileDir, mochaRoot);
    rel = rel.replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return rel;
}

const files = getAllJsFiles(TARGET_DIR);
let addedHooks = 0;
let addedImport = 0;
let addedMainBefore = 0;
let skipped = 0;
let alreadyHas = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    let changed = false;

    // Skip files that already have both beforeEach and afterEach
    const hasBeforeEach = content.includes('beforeEach(');
    const hasAfterEach = content.includes('afterEach(');

    if (hasBeforeEach && hasAfterEach) {
        alreadyHas++;
        continue;
    }

    // Must have a describe() block to be a test file
    if (!content.includes('describe(')) {
        skipped++;
        continue;
    }

    // Must have a before() block
    if (!content.match(/\bbefore\s*\(/)) {
        skipped++;
        continue;
    }

    // --- STEP 1: Add import { main } if missing ---
    const hasMainImport = content.includes("import { main }");
    if (!hasMainImport) {
        const relPath = getRelativePath(file);
        if (!relPath) {
            console.log('SKIP (cannot compute path): ' + path.relative(TARGET_DIR, file));
            skipped++;
            continue;
        }
        const importLine = `import { main } from '${relPath}/pages/main.js';`;

        // Find the last import line and insert after it
        const lines = content.split(/\r?\n/);
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trimStart().startsWith('import ')) {
                lastImportIndex = i;
            }
        }

        if (lastImportIndex !== -1) {
            lines.splice(lastImportIndex + 1, 0, importLine);
            content = lines.join(newline);
            changed = true;
            addedImport++;
            console.log('IMPORT ADDED: ' + path.relative(TARGET_DIR, file));
        }
    }

    // --- STEP 2: Add main.before(this) inside before() if missing ---
    const hasMainBefore = content.includes('main.before(');
    if (!hasMainBefore) {
        // Find before(async function () { or before(async () => { and add main.before(this) as first line
        const beforePattern = /(\bbefore\s*\(\s*async\s+(?:function\s*\(\s*\)|(?:\(\s*\)\s*=>)))\s*\{/;
        const beforeMatch = content.match(beforePattern);
        if (beforeMatch) {
            const matchIndex = content.indexOf(beforeMatch[0]);
            const insertAt = matchIndex + beforeMatch[0].length;

            // Detect indentation of the before line
            const beforeLineStart = content.lastIndexOf(newline, matchIndex);
            const beforeLine = content.substring(beforeLineStart + newline.length, matchIndex + beforeMatch[0].length);
            const leadingTabs = beforeLine.match(/^(\t*)/);
            const indent = leadingTabs ? leadingTabs[1] + '\t' : '\t\t';

            content = content.substring(0, insertAt) +
                newline + indent + 'await main.before(this);' +
                content.substring(insertAt);
            changed = true;
            addedMainBefore++;
            console.log('MAIN.BEFORE ADDED: ' + path.relative(TARGET_DIR, file));
        }
    }

    // --- STEP 3: Add beforeEach and afterEach after the before() block ---
    const beforeStartMatch = content.match(/\bbefore\s*\(\s*async/);
    if (!beforeStartMatch) {
        skipped++;
        if (changed) fs.writeFileSync(file, content, 'utf8');
        continue;
    }

    const beforeStartIndex = content.indexOf(beforeStartMatch[0]);

    // Find the opening { of before's callback
    let braceStart = content.indexOf('{', beforeStartIndex);
    if (braceStart === -1) {
        skipped++;
        if (changed) fs.writeFileSync(file, content, 'utf8');
        continue;
    }

    // Count braces to find the closing }); of the before block
    let depth = 0;
    let beforeEndIndex = -1;
    for (let i = braceStart; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
            depth--;
            if (depth === 0) {
                // Found the closing } — look for );
                const afterBrace = content.substring(i, i + 10).replace(/\s/g, '');
                if (afterBrace.startsWith('});') || afterBrace.startsWith('}));')) {
                    let j = i + 1;
                    while (j < content.length && /\s/.test(content[j])) j++;
                    if (content[j] === ')' && content[j + 1] === ';') {
                        beforeEndIndex = j + 2;
                    } else if (content[j] === '}') {
                        beforeEndIndex = i + 1;
                        let k = beforeEndIndex;
                        while (k < content.length && /\s/.test(content[k])) k++;
                        if (content[k] === ')' && content[k + 1] === ';') {
                            beforeEndIndex = k + 2;
                        }
                    }
                }
                break;
            }
        }
    }

    if (beforeEndIndex === -1) {
        console.log('SKIP (cannot find before() end): ' + path.relative(TARGET_DIR, file));
        skipped++;
        if (changed) fs.writeFileSync(file, content, 'utf8');
        continue;
    }

    // Detect indentation from the before line
    const bLineStart = content.lastIndexOf(newline, beforeStartIndex);
    const bLine = content.substring(bLineStart + newline.length, beforeStartIndex);
    const bIndentMatch = bLine.match(/^(\t*)/);
    const bIndent = bIndentMatch ? bIndentMatch[1] : '\t';

    const hooksBlock =
        newline +
        newline + bIndent + 'beforeEach(async function () {' +
        newline + bIndent + '\tawait main.beforeEach(this);' +
        newline + bIndent + '});' +
        newline +
        newline + bIndent + 'afterEach(async function () {' +
        newline + bIndent + '\tawait main.afterEach(this);' +
        newline + bIndent + '});';

    // Check if there's an after() block right after before()
    const afterBeforeContent = content.substring(beforeEndIndex);
    const afterBlockMatch = afterBeforeContent.match(/^[\s]*\bafter\s*\(/);

    if (afterBlockMatch) {
        const afterStart = beforeEndIndex + afterBlockMatch[0].search(/\bafter\s*\(/);
        const afterBraceStart = content.indexOf('{', afterStart);

        let afterDepth = 0;
        let afterEndIndex = -1;
        for (let i = afterBraceStart; i < content.length; i++) {
            if (content[i] === '{') afterDepth++;
            if (content[i] === '}') {
                afterDepth--;
                if (afterDepth === 0) {
                    let j = i + 1;
                    while (j < content.length && /\s/.test(content[j])) j++;
                    if (content[j] === ')' && content[j + 1] === ';') {
                        afterEndIndex = j + 2;
                    }
                    break;
                }
            }
        }

        if (afterEndIndex !== -1) {
            content = content.substring(0, afterEndIndex) + hooksBlock + content.substring(afterEndIndex);
        } else {
            content = content.substring(0, beforeEndIndex) + hooksBlock + content.substring(beforeEndIndex);
        }
    } else {
        content = content.substring(0, beforeEndIndex) + hooksBlock + content.substring(beforeEndIndex);
    }

    changed = true;
    addedHooks++;
    console.log('HOOKS ADDED: ' + path.relative(TARGET_DIR, file));

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
    }
}

console.log('\n============================================');
console.log('Done!');
console.log('Hooks added: ' + addedHooks);
console.log('Import added: ' + addedImport);
console.log('main.before added: ' + addedMainBefore);
console.log('Already had hooks: ' + alreadyHas);
console.log('Skipped: ' + skipped);
console.log('============================================');
