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

const files = getAllJsFiles(TARGET_DIR);
let fixed = 0;
let skipped = 0;
let alreadyHas = 0;
let commentAdded = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    let changed = false;

    // --- STEP 1: Ensure Applicable block exists ---
    const hasComment = content.includes('// Applicable zimbra versions');
    const hasIfBlock = content.includes('config.serial === true') ||
        content.includes('config.serverEnvironment');

    if (hasComment && hasIfBlock) {
        alreadyHas++;
    } else if (!hasComment && hasIfBlock) {
        const ifPattern = /^([ \t]*)(if\s*\(\s*config\.serial\s*===\s*true)/m;
        const ifMatch = content.match(ifPattern);
        if (ifMatch) {
            const indent = ifMatch[1];
            const ifIndex = content.indexOf(ifMatch[0]);
            content = content.substring(0, ifIndex)
                + indent + '// Applicable zimbra versions' + newline
                + content.substring(ifIndex);
            changed = true;
            commentAdded++;
            console.log('COMMENT ADDED: ' + path.relative(TARGET_DIR, file));
        } else {
            console.log('SKIP (if block pattern not matched): ' + path.relative(TARGET_DIR, file));
            skipped++;
            continue;
        }
    } else {
        const firstItMatch = content.match(/(\r?\n)(\s*)(it\()/);
        if (!firstItMatch) {
            console.log('SKIP (no it found): ' + path.relative(TARGET_DIR, file));
            skipped++;
            continue;
        }

        const firstItIndex = content.indexOf(firstItMatch[0]);
        const beforeSection = content.substring(0, firstItIndex);
        const lastClosingBrace = beforeSection.lastIndexOf('});');

        if (lastClosingBrace === -1) {
            console.log('SKIP (no }); found): ' + path.relative(TARGET_DIR, file));
            skipped++;
            continue;
        }

        const indent = firstItMatch[2];
        const insertPoint = lastClosingBrace + 3;

        const block = newline + newline + indent + '// Applicable zimbra versions'
            + newline + indent + 'if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {'
            + newline + indent + '\treturn;'
            + newline + indent + '}';

        content = content.substring(0, insertPoint) + block + content.substring(insertPoint);
        changed = true;
        fixed++;
        console.log('FIXED: ' + path.relative(TARGET_DIR, file));
    }

    // --- STEP 2: Ensure // Tests comment exists after the if block's closing } ---
    if (!content.includes('// Tests')) {
        const ifClosePattern = /^([ \t]*)if\s*\(config\.serial[\s\S]*?\n([ \t]*)\}/m;
        const ifCloseMatch = content.match(ifClosePattern);
        if (ifCloseMatch) {
            const closeBraceIndex = content.indexOf(ifCloseMatch[0]) + ifCloseMatch[0].length;
            const indent = ifCloseMatch[2];
            content = content.substring(0, closeBraceIndex)
                + newline + newline + indent + '// Tests'
                + content.substring(closeBraceIndex);
            changed = true;
        }
    }

    // --- STEP 3: Fix spacing between blocks ---
    const lines = content.split(/\r?\n/);
    const fixedLines = [];
    for (let i = 0; i < lines.length; i++) {
        fixedLines.push(lines[i]);

        // Look ahead to find the next non-blank line
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') {
            j++;
        }
        if (j >= lines.length) continue;

        const nextNonBlank = lines[j].trim();
        const currentTrimmed = lines[i].trim();
        const blankCount = j - i - 1;

        // Rule: // Tests -> it( = NO blank line between them
        if (currentTrimmed === '// Tests' && nextNonBlank.startsWith('it(')) {
            if (blankCount !== 0) {
                i = j - 1;
                changed = true;
            }
        }

        // Rule: }); -> it( = exactly 2 blank lines
        if (currentTrimmed === '});' && nextNonBlank.startsWith('it(')) {
            if (blankCount !== 2) {
                i = j - 1;
                fixedLines.push('');
                fixedLines.push('');
                changed = true;
            }
        }
    }

    // --- STEP 4: Remove blank lines inside XML template literals ---
    const step4Lines = [];
    let inTemplateLiteral = false;
    for (let i = 0; i < fixedLines.length; i++) {
        const line = fixedLines[i];
        const backtickCount = (line.match(/`/g) || []).length;
        if (backtickCount % 2 === 1) {
            inTemplateLiteral = !inTemplateLiteral;
        }

        // Skip blank/whitespace-only lines inside template literals
        if (inTemplateLiteral && line.trim() === '') {
            changed = true;
            continue;
        }
        step4Lines.push(line);
    }

    if (changed) {
        const finalContent = step4Lines.join(newline);
        fs.writeFileSync(file, finalContent, 'utf8');
    }
}

console.log('\nDone! Fixed: ' + fixed + ', Comment added: ' + commentAdded + ', Already had: ' + alreadyHas + ', Skipped: ' + skipped);
