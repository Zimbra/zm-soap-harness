const fs = require('fs');
const path = require('path');
function walk(d) { const r = []; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? r.push(...walk(f)) : r.push(f) } return r }
const vt = ['smoke', 'sanity', 'functional', 'regression', 'bhr'];
function xmlCount(dir) {
    const files = walk(dir).filter(f => f.endsWith('.xml'));
    const out = [];
    for (const f of files) {
        const c = fs.readFileSync(f, 'utf8');
        const bn = path.basename(f);
        const parts = c.split(/<t:test_case\s+/);
        let cnt = 0;
        for (let i = 1; i < parts.length; i++) {
            const tm = parts[i].match(/type\s*=\s*"([^"]+)"/);
            const im = parts[i].match(/testcaseid\s*=\s*"([^"]+)"/i);
            const t = tm ? tm[1].toLowerCase() : '';
            const id = im ? im[1].toLowerCase() : '';
            if (t === 'always' || t === 'deprecated') continue;
            if (id === 'ping' || id.includes('setup')) continue;
            if (vt.includes(t)) cnt++;
        }
        out.push({ file: bn, count: cnt });
    }
    return out;
}
function jsCount(dir) {
    const files = walk(dir).filter(f => f.endsWith('.js'));
    return files.map(f => ({ file: path.basename(f), count: (fs.readFileSync(f, 'utf8').match(/\bit\(/g) || []).length }));
}
console.log('=== DATASOURCE ===');
const dx = xmlCount('data/soapvalidator/MailClient/DataSource');
const dj = jsCount('mocha/tests/mail-client/data-source');
let dxt = 0, djt = 0;
for (const x of dx) { dxt += x.count; console.log('XML ' + x.file + ': ' + x.count) }
console.log('XML TOTAL: ' + dxt);
console.log('');
for (const j of dj) { djt += j.count; console.log('JS  ' + j.file + ': ' + j.count) }
console.log('JS  TOTAL: ' + djt);
console.log('\n=== GAL ===');
const gx = xmlCount('data/soapvalidator/MailClient/GAL');
const gj = jsCount('mocha/tests/mail-client/gal');
let gxt = 0, gjt = 0;
for (const x of gx) { gxt += x.count; console.log('XML ' + x.file + ': ' + x.count) }
console.log('XML TOTAL: ' + gxt);
console.log('');
for (const j of gj) { gjt += j.count; console.log('JS  ' + j.file + ': ' + j.count) }
console.log('JS  TOTAL: ' + gjt);
