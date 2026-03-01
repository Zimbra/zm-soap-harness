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

// User's CORRECT XML migratable count per top-level JS directory (from screenshot)
const xmlCorrect = {
    'address-list': 8,
    'auth': 24,          // 23 + 1
    'briefcase': 5,      // 1 + 2 + 2
    'calendar': 2,       // Only FreeBusy/Exchange2010
    'contacts': 5,
    'conversation': 2,
    'data-source': 33,
    'distribution-list': 0, // NOT in user's inventory at all
    'dumpster': 10,
    'filter': 0,         // Duplicate dir, should not exist
    'filters': 2,
    'folders': 14,       // 2 + 2 + 10
    'gal': 16,           // 10 + 6
    'hab': 28,
    'headers': 1,
    'identities': 1,
    'mail': 11,          // 4 + 4 + 3
    'misc': 3,
    'mobile': 1,
    'passwd': 2,
    'prefs': 25,         // 2 + 11 + 8 + 4
    'search': 10,        // 2 + 2 + 2 + 2 + 2
    'smime': 104,
    'spam': 13,
    'tags': 2,
    'tasks': 0,          // NOT in user's inventory
    'voicemail': 52,
    'zco': 3
};

const base = 'mocha/tests/mail-client';
const files = walk(base).sort();
const dirs = {};

for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
    const n = (c.match(/\bit\(/g) || []).length;
    const rel = path.relative(base, f).split(path.sep);
    const d = rel[0];
    if (!(d in dirs)) dirs[d] = { files: [], totalIts: 0 };
    dirs[d].files.push({ path: rel.join('/'), its: n });
    dirs[d].totalIts += n;
}

let totalXml = 0, totalJs = 0, totalExtra = 0;
const problems = [];

console.log('DIR                  XML_CORRECT  JS_IT  EXTRA  STATUS');
console.log('='.repeat(70));
for (const d of Object.keys(dirs).sort()) {
    const xml = xmlCorrect[d] !== undefined ? xmlCorrect[d] : '???';
    const js = dirs[d].totalIts;
    const extra = typeof xml === 'number' ? js - xml : '?';
    const status = extra > 0 ? 'EXTRA ' + extra : extra === 0 ? 'OK' : extra < 0 ? 'SHORT ' + (-extra) : '?';
    console.log(`${d.padEnd(20)} ${String(xml).padStart(11)}  ${String(js).padStart(5)}  ${String(extra).padStart(5)}  ${status}`);
    if (typeof xml === 'number') {
        totalXml += xml;
        totalJs += js;
        if (extra > 0) totalExtra += extra;
    }
    if (extra > 0) {
        problems.push({ dir: d, xml, js, extra, files: dirs[d].files });
    }
}
console.log('='.repeat(70));
console.log(`${'TOTAL'.padEnd(20)} ${String(totalXml).padStart(11)}  ${String(totalJs).padStart(5)}  ${String(totalExtra).padStart(5)}  ${totalExtra} EXTRA tests to remove`);

console.log('\n\n=== PROBLEM DIRECTORIES (extra tests) ===');
for (const p of problems) {
    console.log(`\n--- ${p.dir} (XML=${p.xml}, JS=${p.js}, EXTRA=${p.extra}) ---`);
    for (const f of p.files) {
        console.log(`  ${f.path}: ${f.its} it()`);
    }
}
