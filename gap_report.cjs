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
let totalMig = 0;
let totalExcl = 0;
const dirDetails = {};

for (const f of xmlFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const rel = path.relative(xmlDir, f).split(path.sep).join('/');
    const topDir = rel.split('/')[0];

    const parts = content.split(/<t:test_case\s+/);
    let migCount = 0;
    let exclCount = 0;
    const tests = [];

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const typeMatch = part.match(/type="([^"]+)"/);
        const idMatch = part.match(/testcaseid\s*=\s*"([^"]+)"/i);
        const type = typeMatch ? typeMatch[1] : 'unknown';
        const tcId = idMatch ? idMatch[1] : 'unknown';

        const isExcluded = type === 'always' || type === 'deprecated' ||
            tcId.toLowerCase() === 'ping' || tcId.toLowerCase().includes('setup');

        const objMatch = part.match(/<t:objective>([\s\S]*?)<\/t:objective>/);
        const objective = objMatch ? objMatch[1].replace(/\s+/g, ' ').trim() : '';

        if (isExcluded) {
            exclCount++;
        } else {
            migCount++;
            tests.push({ tcId, type, objective });
        }
    }

    totalMig += migCount;
    totalExcl += exclCount;

    if (!dirDetails[topDir]) dirDetails[topDir] = { mig: 0, excl: 0, files: [] };
    dirDetails[topDir].mig += migCount;
    dirDetails[topDir].excl += exclCount;
    dirDetails[topDir].files.push({ rel, migCount, exclCount, tests });
}

// Count JS tests per dir + per file
const jsFiles = walkDir(jsDir).filter(f => f.endsWith('.js')).sort();
let totalIts = 0;
const jsDirCounts = {};
const jsFileDetails = {};
for (const f of jsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const its = (content.match(/\bit\(/g) || []).length;
    totalIts += its;
    const rel = path.relative(jsDir, f).split(path.sep).join('/');
    const topDir = rel.split('/')[0];
    if (!jsDirCounts[topDir]) jsDirCounts[topDir] = 0;
    jsDirCounts[topDir] += its;
    jsFileDetails[rel] = its;
}

const output = [];
output.push('=== MAIL CLIENT MIGRATION - COMPLETE GAP ANALYSIS ===');
output.push('Generated: ' + new Date().toISOString());
output.push('');

const xmlToJsMap = {
    'AddressList': 'address-list', 'Auth': 'auth', 'Briefcase': 'briefcase',
    'Calendar': 'calendar', 'Contacts': 'contacts', 'Conversation': 'conversation',
    'DataSource': 'data-source', 'DistributionList': 'distribution-list',
    'Dumpster': 'dumpster', 'Filters': 'filters', 'Folders': 'folders',
    'GAL': 'gal', 'HAB': 'hab', 'Headers': 'headers', 'Identities': 'identities',
    'Mail': 'mail', 'Misc': 'misc', 'Mobile': 'mobile', 'Passwd': 'passwd',
    'Prefs': 'prefs', 'Search': 'search', 'Smime': 'smime', 'Spam': 'spam',
    'Tags': 'tags', 'Tasks': 'tasks', 'VoiceMail': 'voicemail', 'ZCO': 'zco'
};

output.push('DIR                  XML_MIG  JS_IT  GAP    STATUS');
output.push('-'.repeat(70));
let totalGap = 0;
const gapDirs = [];
for (const [xmlD, jsD] of Object.entries(xmlToJsMap).sort()) {
    const xmlCount = (dirDetails[xmlD] || {}).mig || 0;
    const jsCount = jsDirCounts[jsD] || 0;
    const gap = xmlCount - jsCount;
    if (gap > 0) totalGap += gap;
    const status = gap > 0 ? 'NEED ' + gap + ' MORE' : gap === 0 ? 'COMPLETE' : 'EXTRA ' + (-gap);
    output.push(`${xmlD.padEnd(20)} ${String(xmlCount).padStart(7)}  ${String(jsCount).padStart(5)}  ${String(gap).padStart(4)}  ${status}`);
    if (gap > 0) gapDirs.push(xmlD);
}
output.push('-'.repeat(70));
output.push(`${'TOTAL'.padEnd(20)} ${String(totalMig).padStart(7)}  ${String(totalIts).padStart(5)}  ${String(totalGap).padStart(4)}  ${totalGap} tests still need migration`);
output.push('');

// Details for dirs with positive gap
for (const xmlD of gapDirs) {
    const jsD = xmlToJsMap[xmlD];
    output.push('');
    output.push('=== ' + xmlD + ' (gap: ' + ((dirDetails[xmlD] || {}).mig || 0) - (jsDirCounts[jsD] || 0) + ') ===');
    if (dirDetails[xmlD]) {
        for (const file of dirDetails[xmlD].files) {
            if (file.migCount > 0) {
                output.push('  FILE: ' + file.rel + ' [' + file.migCount + ' migratable, ' + file.exclCount + ' excluded]');
                for (const tc of file.tests) {
                    output.push('    ' + tc.type + ' | ' + tc.tcId + ' | ' + tc.objective);
                }
            }
        }
    }
}

fs.writeFileSync('gap_report.txt', output.join('\n'));
console.log('Report written to gap_report.txt');
console.log('TOTAL MIGRATABLE: ' + totalMig);
console.log('TOTAL JS IT(): ' + totalIts);
console.log('TOTAL POSITIVE GAP: ' + totalGap);
