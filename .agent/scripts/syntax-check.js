const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walk(d, r = []) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f, r);
        else if (e.name.endsWith('.js')) r.push(f);
    }
    return r;
}

const files = walk('mocha/tests');
let errors = 0;
for (const f of files) {
    try {
        execSync('node --check "' + f.replace(/\\/g, '/') + '"', { stdio: 'pipe' });
    } catch (e) {
        errors++;
        console.log('ERROR: ' + f.replace(/\\/g, '/'));
        console.log('  ' + e.stderr.toString().split('\n')[0]);
    }
}
console.log('\nTotal: ' + files.length + ' files, ' + errors + ' with syntax errors');
