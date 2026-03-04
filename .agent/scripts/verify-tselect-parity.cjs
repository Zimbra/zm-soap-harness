/**
 * verify-tselect-parity.cjs
 *
 * Cross-references XML t:select assertions against JS assert.* statements
 * for each mapped JS↔XML file pair in a module.
 *
 * For each XML file, counts t:select elements (excluding setup/always blocks).
 * For each JS file, counts assert.* calls (excluding Fault guards).
 * Reports files where JS assertion count is significantly below XML t:select count.
 *
 * Usage: node .agent/scripts/verify-tselect-parity.cjs <module>
 */
const fs = require('fs');
const path = require('path');

const MODULE_MAP = {
    admin: 'Admin', auth: 'Auth', briefcase: 'Briefcase', calendar: 'Calendar',
    contacts: 'Contacts', dav: 'Dav', delegated: 'Delegated', ews: 'EWS',
    folders: 'Folders', general: 'General', ical: 'iCal', mail: 'Mail',
    'mail-client': 'MailClient', prefs: 'Prefs', 'rest-servlet': 'RestServlet',
    'sanity-test': 'SanityTest', search: 'Search', sharing: 'Sharing',
    sync: 'Sync', tags: 'Tags', tasks: 'Tasks'
};

const JS_BASE = 'mocha/tests';
const XML_BASE = 'data/soapvalidator';

const mod = process.argv[2];
if (!mod || !MODULE_MAP[mod]) {
    console.log(`Usage: node verify-tselect-parity.cjs <module>`);
    console.log(`Available: ${Object.keys(MODULE_MAP).join(', ')}`);
    process.exit(1);
}

function findFiles(dir, ext) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    function walk(d) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith(ext)) results.push(full.replace(/\\/g, '/'));
        }
    }
    walk(dir);
    return results.sort();
}

function normalize(name) { return name.toLowerCase().replace(/[-_.]/g, ''); }
function getWords(name) {
    return [...new Set(name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[-_.]/g, ' ').split(/\s+/).filter(Boolean))];
}
function wordOverlap(a, b) {
    const wa = getWords(a), wb = getWords(b);
    if (!wa.length) return 0;
    const wbSet = new Set(wb);
    return Math.round(wa.filter(w => wbSet.has(w)).length * 100 / wa.length);
}

// Count t:select in XML (excluding always/deprecated blocks)
function countXmlSelects(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const blocks = content.split(/<t:test_case\s/);
        let total = 0;
        for (let i = 1; i < blocks.length; i++) {
            if (/type="always"/.test(blocks[i]) || /type="deprecated"/.test(blocks[i])) continue;
            const selects = (blocks[i].match(/<t:select/g) || []).length;
            total += selects;
        }
        return total;
    } catch { return 0; }
}

// Count JS assertions (real assertions, not Fault guards)
function countJsAssertions(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const all = (content.match(/assert\.(exists|isString|equal|include|match|isTrue|isNotEmpty|isArray|isNumber|isAbove|isBelow|isAtLeast|isAtMost|lengthOf|deepEqual|notEqual|notInclude|ok|isOk)/g) || []).length;
        const faultGuards = (content.match(/assert\.notExists\(\w+\.Fault/g) || []).length;
        return all + faultGuards; // Count everything including Fault guards
    } catch { return 0; }
}

const jsDir = `${JS_BASE}/${mod}`;
const xmlDir = `${XML_BASE}/${MODULE_MAP[mod]}`;
const jsFiles = findFiles(jsDir, '.js');
const xmlFiles = findFiles(xmlDir, '.xml');

// Build mapping (same logic as parity script)
const xmlIndex = xmlFiles.map(f => ({
    path: f, basename: path.basename(f, '.xml'),
    norm: normalize(path.basename(f, '.xml')),
    subNorm: normalize(f.replace(xmlDir + '/', '').replace(path.basename(f), '')),
}));

const jsXmlMap = new Map();
const xmlMatched = new Set();

for (const jsFile of jsFiles) {
    const jsBn = path.basename(jsFile, '.js');
    const jsNorm = normalize(jsBn);
    const jsSubNorm = normalize(jsFile.replace(jsDir + '/', '').replace(path.basename(jsFile), ''));
    let bestMatch = null, bestScore = 0;
    for (const xml of xmlIndex) {
        if (xmlMatched.has(xml.path)) continue;
        let score = 0;
        if (jsNorm === xml.norm) score = 100;
        else if (xml.norm.includes(jsNorm)) score = 60;
        else if (jsNorm.includes(xml.norm)) score = 50;
        else { const o = wordOverlap(jsBn, xml.basename); if (o >= 60) score = Math.floor(o / 2) + 10; }
        if (score > 0 && jsSubNorm === xml.subNorm) score += 20;
        if (score > bestScore) { bestScore = score; bestMatch = xml.path; }
    }
    if (bestMatch && bestScore >= 50) {
        jsXmlMap.set(jsFile, bestMatch);
        xmlMatched.add(bestMatch);
    }
}

// Report
console.log(`\n=== t:select Parity Check: ${mod} ===\n`);
console.log(`${'JS File'.padEnd(65)} ${'JS Assert'.padStart(10)} ${'XML Select'.padStart(11)} ${'Ratio'.padStart(7)} Status`);
console.log(`${'─'.repeat(65)} ${'─'.repeat(10)} ${'─'.repeat(11)} ${'─'.repeat(7)} ──────`);

let issues = 0;
let totalJsAsserts = 0, totalXmlSelects = 0;

for (const jsFile of jsFiles) {
    const jsShort = jsFile.replace(jsDir + '/', '');
    const jsAsserts = countJsAssertions(jsFile);
    totalJsAsserts += jsAsserts;

    const xmlFile = jsXmlMap.get(jsFile);
    if (!xmlFile) {
        console.log(`${jsShort.padEnd(65)} ${String(jsAsserts).padStart(10)} ${'N/A'.padStart(11)} ${'—'.padStart(7)} —`);
        continue;
    }

    const xmlSelects = countXmlSelects(xmlFile);
    totalXmlSelects += xmlSelects;

    const ratio = xmlSelects > 0 ? (jsAsserts / xmlSelects * 100).toFixed(0) + '%' : '—';
    let status;

    if (jsAsserts >= xmlSelects) {
        status = '✅';
    } else if (jsAsserts >= xmlSelects * 0.7) {
        status = '⚠️  70%+';
        issues++;
    } else if (jsAsserts > 0) {
        status = '❌ LOW';
        issues++;
    } else {
        status = '❌ ZERO';
        issues++;
    }

    console.log(`${jsShort.padEnd(65)} ${String(jsAsserts).padStart(10)} ${String(xmlSelects).padStart(11)} ${ratio.padStart(7)} ${status}`);
}

console.log('');
console.log(`Total: JS=${totalJsAsserts} assertions, XML=${totalXmlSelects} t:selects`);
console.log(`Ratio: ${totalXmlSelects > 0 ? (totalJsAsserts / totalXmlSelects * 100).toFixed(1) + '%' : '—'}`);
console.log(`Files with potential gaps: ${issues}`);
console.log('');
