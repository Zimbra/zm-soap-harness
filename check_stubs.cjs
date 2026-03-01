const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) results.push(...walkDir(full));
        else results.push(full);
    }
    return results;
}

const jsDir = 'mocha/tests/mail-client';
const jsFiles = walkDir(jsDir).filter(f => f.endsWith('.js')).sort();

let stubCount = 0;
let realCount = 0;

console.log('=== STUB FILES (no assert/soap) ===');
for (const f of jsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const its = (content.match(/\bit\(/g) || []).length;
    const hasAssert = content.includes('assert.');
    const hasSoap = content.includes('soap.make');
    const rel = path.relative(jsDir, f).split(path.sep).join('/');

    if (its > 0 && !hasAssert && !hasSoap) {
        stubCount += its;
        console.log(String(its).padStart(3) + ' it() | ' + rel);
    } else if (its > 0) {
        realCount += its;
    }
}
console.log('TOTAL STUB IT(): ' + stubCount);
console.log('');
console.log('TOTAL REAL IT(): ' + realCount);
console.log('TOTAL ALL IT(): ' + (stubCount + realCount));
