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
const dirs = {};
let tot = 0;

for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
    const n = (c.match(/\bit\(/g) || []).length;
    const rel = path.relative(base, f).split(path.sep);
    const d = rel[0];
    if (!(d in dirs)) dirs[d] = { files: [], its: 0 };
    dirs[d].files.push(rel.join('/'));
    dirs[d].its += n;
    tot += n;
}

console.log('DIR                     FILES  IT()');
console.log('-'.repeat(44));
for (const d of Object.keys(dirs).sort()) {
    const v = dirs[d];
    console.log(d.padEnd(24) + String(v.files.length).padStart(5) + String(v.its).padStart(6));
}
console.log('-'.repeat(44));
console.log('TOTAL'.padEnd(24) + String(files.length).padStart(5) + String(tot).padStart(6));
