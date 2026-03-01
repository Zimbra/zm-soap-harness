const fs = require('fs');
const path = require('path');

function walk(d) {
    const r = [];
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) r.push(...walk(f));
        else r.push(f);
    }
    return r;
}

// STEP 1: Properly count XML tests - ONLY smoke, sanity, functional, regression
const xmlDir = 'data/soapvalidator/MailClient';
const xmlFiles = walk(xmlDir).filter(f => f.endsWith('.xml')).sort();
const validTypes = ['smoke', 'sanity', 'functional', 'regression', 'bhr'];
const excludeIds = ['ping'];

const xmlToJs = {
    'AddressList': 'address-list', 'Auth': 'auth', 'Briefcase': 'briefcase',
    'Calendar': 'calendar', 'Contacts': 'contacts', 'Conversation': 'conversation',
    'DataSource': 'data-source', 'DistributionList': 'distribution-list',
    'Dumpster': 'dumpster', 'Filters': 'filters', 'Folders': 'folders',
    'GAL': 'gal', 'HAB': 'hab', 'Headers': 'headers', 'Identities': 'identities',
    'Mail': 'mail', 'Misc': 'misc', 'Mobile': 'mobile', 'Passwd': 'passwd',
    'Prefs': 'prefs', 'Search': 'search', 'Smime': 'smime', 'Spam': 'spam',
    'Tags': 'tags', 'Tasks': 'tasks', 'VoiceMail': 'voicemail', 'ZCO': 'zco'
};

const xmlCounts = {};
let totalXml = 0;

for (const f of xmlFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const rel = path.relative(xmlDir, f).split(path.sep);
    const topDir = rel[0];
    const jsDir = xmlToJs[topDir];
    if (!jsDir) continue;
    if (!xmlCounts[jsDir]) xmlCounts[jsDir] = 0;

    const parts = content.split(/<t:test_case\s+/);
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const typeMatch = part.match(/type\s*=\s*"([^"]+)"/);
        const idMatch = part.match(/testcaseid\s*=\s*"([^"]+)"/i);
        const type = typeMatch ? typeMatch[1].toLowerCase() : '';
        const tcId = idMatch ? idMatch[1].toLowerCase() : '';

        // Exclude: always, deprecated, ping, setup
        if (type === 'always' || type === 'deprecated') continue;
        if (tcId === 'ping' || tcId.includes('setup')) continue;

        // Only include valid types
        if (validTypes.includes(type)) {
            xmlCounts[jsDir]++;
            totalXml++;
        }
    }
}

// STEP 2: Count JS it() blocks
const jsBase = 'mocha/tests/mail-client';
const jsFiles = walk(jsBase).filter(f => f.endsWith('.js')).sort();
const jsCounts = {};
const jsFileDetails = {};
let totalJs = 0;

for (const f of jsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const n = (content.match(/\bit\(/g) || []).length;
    const rel = path.relative(jsBase, f).split(path.sep);
    const dir = rel[0];
    if (!jsCounts[dir]) jsCounts[dir] = 0;
    if (!jsFileDetails[dir]) jsFileDetails[dir] = [];
    jsCounts[dir] += n;
    jsFileDetails[dir].push({ file: rel.join('/'), its: n });
    totalJs += n;
}

// STEP 3: Check for duplications
console.log('=== DUPLICATION CHECK ===\n');

// Check filter vs filters
if (jsFileDetails['filter'] && jsFileDetails['filters']) {
    console.log('DUPLICATE DIR: filter/ is duplicate of filters/');
    for (const f of jsFileDetails['filter']) console.log('  ' + f.file + ': ' + f.its + ' it()');
}

// Check data-source-test.js vs data-source-tests.js
if (jsFileDetails['data-source']) {
    const test = jsFileDetails['data-source'].find(f => f.file === 'data-source/data-source-test.js');
    const tests = jsFileDetails['data-source'].find(f => f.file === 'data-source/data-source-tests.js');
    if (test && tests) {
        console.log('POSSIBLE DUPLICATE: data-source-test.js (' + test.its + ') vs data-source-tests.js (' + tests.its + ')');
    }
}

// STEP 4: Output matching table
console.log('\n=== XML vs JS MATCHING TABLE ===');
console.log('Dir'.padEnd(22) + 'XML'.padStart(5) + 'JS'.padStart(5) + 'Delta'.padStart(7) + '  Status');
console.log('-'.repeat(55));

const allDirs = new Set([...Object.keys(xmlCounts), ...Object.keys(jsCounts)]);
let grandXml = 0, grandJs = 0;
for (const d of [...allDirs].sort()) {
    const xml = xmlCounts[d] || 0;
    const js = jsCounts[d] || 0;
    const delta = js - xml;
    const status = delta === 0 ? 'MATCH' : delta > 0 ? 'EXTRA +' + delta : 'SHORT ' + delta;
    console.log(d.padEnd(22) + String(xml).padStart(5) + String(js).padStart(5) + String(delta).padStart(7) + '  ' + status);
    grandXml += xml;
    grandJs += js;
}
console.log('-'.repeat(55));
console.log('TOTAL'.padEnd(22) + String(grandXml).padStart(5) + String(grandJs).padStart(5) + String(grandJs - grandXml).padStart(7));

// STEP 5: Dirs with 0 XML
console.log('\n=== JS DIRS WITH NO XML MATCH ===');
for (const d of [...allDirs].sort()) {
    if ((xmlCounts[d] || 0) === 0 && (jsCounts[d] || 0) > 0) {
        console.log(d + ': ' + jsCounts[d] + ' JS tests, 0 XML tests');
        for (const f of jsFileDetails[d]) console.log('  ' + f.file);
    }
}
