const fs = require('fs');
const path = require('path');

function walk(d) {
    const r = [];
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) r.push(...walk(f));
        else if (f.endsWith('.js')) r.push(f);
    }
    return r;
}

const base = 'mocha/tests/mail-client';
const files = walk(base).sort();

let totalWeak = 0;
let totalStrong = 0;
let totalFiles = 0;
const weakFiles = [];

for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const rel = path.relative(base, f);

    // Split into it() blocks
    const itBlocks = content.split(/\bit\s*\(/);
    if (itBlocks.length <= 1) continue;
    totalFiles++;

    let fileWeak = 0;
    let fileStrong = 0;
    const weakTests = [];

    for (let i = 1; i < itBlocks.length; i++) {
        const block = itBlocks[i];
        // Extract test description
        const descMatch = block.match(/^'([^']+)'/);
        const desc = descMatch ? descMatch[1] : 'unknown';

        // Check for weak patterns
        const hasNoOp = block.includes('NoOpRequest');
        const assertCount = (block.match(/assert\./g) || []).length;
        const hasOnlyFaultCheck = assertCount <= 2 && !block.includes('assert.equal') &&
            !block.includes('assert.match') && !block.includes('assert.include') &&
            !block.includes('assert.isTrue') && !block.includes('assert.isAbove') &&
            !block.includes('assert.lengthOf');
        const hasSoapCall = block.includes('makeSOAPEnvelope');
        const hasActualResponseCheck = block.includes('Response?.') || block.includes('Response.');

        let weakness = '';
        if (hasNoOp && assertCount <= 2) {
            weakness = 'STUB: Uses NoOpRequest instead of actual SOAP call';
        } else if (assertCount === 0) {
            weakness = 'NO_ASSERT: No assertions at all';
        } else if (assertCount === 1 && block.includes('notExists(res.Fault')) {
            weakness = 'FAULT_ONLY: Only checks no fault, no response validation';
        } else if (hasOnlyFaultCheck && !hasActualResponseCheck) {
            weakness = 'WEAK: Only exists/notExists checks, no value validation';
        }

        if (weakness) {
            fileWeak++;
            weakTests.push({ desc: desc.substring(0, 80), weakness });
        } else {
            fileStrong++;
        }
    }

    totalWeak += fileWeak;
    totalStrong += fileStrong;

    if (fileWeak > 0) {
        weakFiles.push({ file: rel, weak: fileWeak, strong: fileStrong, tests: weakTests });
    }
}

console.log('=== ASSERTION STRENGTH ANALYSIS ===');
console.log('Total files: ' + totalFiles);
console.log('Total tests: ' + (totalWeak + totalStrong));
console.log('Strong assertions: ' + totalStrong);
console.log('Weak assertions: ' + totalWeak);
console.log('');

// Group by weakness type
const byType = {};
for (const wf of weakFiles) {
    for (const t of wf.tests) {
        if (!byType[t.weakness]) byType[t.weakness] = 0;
        byType[t.weakness]++;
    }
}
console.log('=== BY WEAKNESS TYPE ===');
for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(type + ': ' + count);
}

console.log('\n=== FILES WITH WEAK TESTS ===');
// Sort by weak count descending
weakFiles.sort((a, b) => b.weak - a.weak);
for (const wf of weakFiles) {
    console.log('\n' + wf.file + ' (' + wf.weak + ' weak, ' + wf.strong + ' strong)');
    for (const t of wf.tests) {
        console.log('  [' + t.weakness.split(':')[0] + '] ' + t.desc);
    }
}
