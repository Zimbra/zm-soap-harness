const fs = require('fs');
const path = require('path');

function walk(d) {
    let r = [];
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) r.push(...walk(f));
        else r.push(f);
    }
    return r;
}

const xd = 'data/soapvalidator/Admin/Accounts';
const jd = 'mocha/tests/admin/accounts';

const xfs = walk(xd).filter(f => f.endsWith('.xml')).sort();
const jfs = walk(jd).filter(f => f.endsWith('.js')).sort();

// Simple normalize: remove all non-alphanumeric, lowercase
function norm(s) { return s.replace(/[^a-z0-9/]/gi, '').toLowerCase(); }

// Build JS lookup
const jsLookup = {};
for (const f of jfs) {
    const rel = path.relative(jd, f).replace(/\\/g, '/');
    const c = fs.readFileSync(f, 'utf8');
    const its = (c.match(/\bit\(/g) || []).length;
    const key = norm(rel.replace('.js', ''));
    jsLookup[key] = { rel, its };
}

const lines = [];
lines.push('# Admin > Accounts: XML vs JS Migration Report\n');
lines.push('| # | XML File | XML Tests | JS File | JS it() | Diff | Status |');
lines.push('|---|---|---|---|---|---|---|');

let totalXml = 0, totalJs = 0, missing = 0, gap = 0;

for (let i = 0; i < xfs.length; i++) {
    const f = xfs[i];
    const rel = path.relative(xd, f).replace(/\\/g, '/');
    const c = fs.readFileSync(f, 'utf8');
    const allTc = (c.match(/<t:test_case/g) || []).length;
    const always = (c.match(/type="always"/gi) || []).length;
    const real = allTc - always;
    totalXml += real;

    const key = norm(rel.replace('.xml', ''));
    const js = jsLookup[key] || null;
    const jsIt = js ? js.its : 0;
    const jsFile = js ? js.rel : '-';
    totalJs += jsIt;
    const diff = jsIt - real;

    let status;
    if (!js) { status = '❌ MISSING'; missing++; gap += real; }
    else if (diff >= 0) status = '✅' + (diff > 0 ? ' +' + diff : '');
    else { status = '⚠️ ' + diff; gap += Math.abs(diff); }

    lines.push(`| ${i + 1} | ${rel} | ${real} | ${jsFile} | ${jsIt} | ${diff} | ${status} |`);
}

lines.push(`| | **Total** | **${totalXml}** | | **${totalJs}** | **${totalJs - totalXml}** | |`);
lines.push(`\n## Summary\n- XML files: ${xfs.length}\n- JS files: ${jfs.length}\n- XML tests (excl always): ${totalXml}\n- JS it() blocks: ${totalJs}\n- Missing JS files: ${missing}\n- Test gap: ${gap}`);

if (missing > 0) {
    lines.push('\n## Missing JS Files');
    for (let i = 0; i < xfs.length; i++) {
        const rel = path.relative(xd, xfs[i]).replace(/\\/g, '/');
        const key = norm(rel.replace('.xml', ''));
        if (!jsLookup[key]) {
            const c = fs.readFileSync(xfs[i], 'utf8');
            const allTc = (c.match(/<t:test_case/g) || []).length;
            const always = (c.match(/type="always"/gi) || []).length;
            lines.push(`- ${rel} (${allTc - always} tests)`);
        }
    }
}

fs.writeFileSync('compare-accounts-report.md', lines.join('\n'));
console.log('Done! XML=' + xfs.length + ' JS=' + jfs.length + ' Missing=' + missing);
