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

const xmlDir = 'data/soapvalidator/MailClient';
const jsDir = 'mocha/tests/mail-client';

const xmlFiles = walkDir(xmlDir).filter(f => f.endsWith('.xml')).sort();
let totalMig = 0, totalExcl = 0;
const results = [];
const dirSummary = {};

for (const f of xmlFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const allTc = (content.match(/<t:test_case /g) || []).length;
    const always = (content.match(/type="always"/g) || []).length;
    const dep = (content.match(/type="deprecated"/g) || []).length;
    const ping = (content.match(/testcaseid="Ping"/gi) || []).length;
    const setup = (content.match(/testcaseid="[^"]*setup/gi) || []).length;
    const excl = always + dep + ping + setup;
    const mig = allTc - excl;
    const rel = path.relative(xmlDir, f).replace(/\\/g, '/');
    const topDir = rel.split('/')[0];
    results.push({ rel, total: allTc, excl, mig, topDir });
    totalMig += mig;
    totalExcl += excl;
    if (!dirSummary[topDir]) dirSummary[topDir] = { mig: 0, excl: 0, files: 0 };
    dirSummary[topDir].mig += mig;
    dirSummary[topDir].excl += excl;
    dirSummary[topDir].files++;
}

console.log('=== XML MIGRATABLE TEST COUNTS (per file) ===');
for (const r of results) {
    console.log(String(r.mig).padStart(3) + ' mig (' + r.excl + ' excl) | ' + r.rel);
}
console.log('');
console.log('=== DIRECTORY SUMMARY ===');
for (const [dir, s] of Object.entries(dirSummary).sort()) {
    console.log(String(s.mig).padStart(3) + ' mig | ' + dir + ' (' + s.files + ' files, ' + s.excl + ' excl)');
}
console.log('');
console.log('TOTAL MIGRATABLE: ' + totalMig);
console.log('TOTAL EXCLUDED: ' + totalExcl);
console.log('TOTAL XML FILES: ' + xmlFiles.length);

console.log('');
console.log('=== JS IT() COUNTS (per dir) ===');
let totalIts = 0;
const jsDirSummary = {};
const jsFiles = walkDir(jsDir).filter(f => f.endsWith('.js')).sort();
for (const f of jsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const its = (content.match(/\bit\(/g) || []).length;
    totalIts += its;
    const rel = path.relative(jsDir, f).replace(/\\/g, '/');
    const topDir = rel.split('/')[0];
    if (!jsDirSummary[topDir]) jsDirSummary[topDir] = { its: 0, files: 0 };
    jsDirSummary[topDir].its += its;
    jsDirSummary[topDir].files++;
}
for (const [dir, s] of Object.entries(jsDirSummary).sort()) {
    console.log(String(s.its).padStart(3) + ' it() | ' + dir + ' (' + s.files + ' files)');
}
console.log('');
console.log('TOTAL IT() BLOCKS: ' + totalIts);

const xmlDirMap = {
    'AddressList': 'address-list', 'Auth': 'auth', 'Briefcase': 'briefcase',
    'Calendar': 'calendar', 'Contacts': 'contacts', 'Conversation': 'conversation',
    'DataSource': 'data-source', 'DistributionList': 'distribution-list',
    'Dumpster': 'dumpster', 'Filters': 'filters', 'Folders': 'folders',
    'GAL': 'gal', 'HAB': 'hab', 'Headers': 'headers', 'Identities': 'identities',
    'Mail': 'mail', 'Misc': 'misc', 'Mobile': 'mobile', 'Passwd': 'passwd',
    'Prefs': 'prefs', 'Search': 'search', 'Smime': 'smime', 'Spam': 'spam',
    'Tags': 'tags', 'Tasks': 'tasks', 'VoiceMail': 'voicemail', 'ZCO': 'zco'
};

console.log('');
console.log('=== GAP ANALYSIS ===');
let totalGap = 0;
for (const [xmlD, jsD] of Object.entries(xmlDirMap).sort()) {
    const xmlCount = (dirSummary[xmlD] || {}).mig || 0;
    const jsCount = (jsDirSummary[jsD] || {}).its || 0;
    const gap = xmlCount - jsCount;
    if (gap !== 0) {
        console.log(xmlD.padEnd(20) + ' XML:' + String(xmlCount).padStart(4) + ' JS:' + String(jsCount).padStart(4) + ' GAP:' + String(gap).padStart(4));
    } else {
        console.log(xmlD.padEnd(20) + ' XML:' + String(xmlCount).padStart(4) + ' JS:' + String(jsCount).padStart(4) + ' OK');
    }
    totalGap += gap;
}
console.log('');
console.log('TOTAL GAP: ' + totalGap + ' tests remaining');
