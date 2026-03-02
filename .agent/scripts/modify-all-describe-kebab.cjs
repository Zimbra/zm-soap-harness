const fs = require('fs');
const path = require('path');

// Acronyms that should be fully uppercased in describe strings
const UPPER_WORDS = new Set([
    'lmtp', 'smtp', 'aol', 'owasp', 'mime', 'zbug', 'zcs',
    'iso', 'utf', 'ansi', 'gif', 'html', 'jpeg', 'mif',
    'mp3', 'xml', 'pdf', 'sgi', 'rgb', 'cad', 'dcx', 'dl',
    'ods', 'sxc', 'odp', 'sxi', 'pct', 'pic', 'oe6', 'fc5',
    'id', 'docx', 'cn', 'gb', 'imap', 'ical', 'ics', 'rw', 'fb',
    'ews', 'dav', 'smime', 'cos', 'gal', 'acl', 'xmpp', 'pop',
    'ldap', 'ssl', 'tls', 'api', 'url', 'http', 'https', 'dns',
    'ip', 'tcp', 'udp', 'idn', 'ui'
]);

function toTitleWord(word) {
    if (/^\d+$/.test(word)) return word; // pure numbers stay as-is
    if (UPPER_WORDS.has(word.toLowerCase())) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function pathSegmentToDescribe(segment) {
    // Split by - and title-case each word
    return segment.split('-').map(toTitleWord).join(' ');
}

function getDescribeFromPath(filePath) {
    // Get relative path from mocha/tests/
    const rel = path.relative('mocha/tests', filePath).replace(/\\/g, '/');
    const parts = rel.split('/');
    const fileName = parts.pop().replace('.js', '');

    // Convert each folder segment and the filename
    const segments = parts.map(pathSegmentToDescribe);
    segments.push(pathSegmentToDescribe(fileName));

    return segments.join(' > ');
}

function findFiles(dir, ext) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findFiles(fullPath, ext));
        } else if (entry.name.endsWith(ext)) {
            results.push(fullPath);
        }
    }
    return results;
}

const testsDir = 'mocha/tests';
const files = findFiles(testsDir, '.js');
let updated = 0;
let skipped = 0;

for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newDescribe = getDescribeFromPath(filePath);

    // Match the describe line: describe('...', function () {
    const describeRegex = /^(describe\(')([^']+)(',\s*function\s*\(\)\s*\{)/m;
    const match = content.match(describeRegex);

    if (!match) {
        console.log(`SKIP (no describe found): ${filePath}`);
        skipped++;
        continue;
    }

    const oldDescribe = match[2];
    if (oldDescribe === newDescribe) {
        skipped++;
        continue;
    }

    const newContent = content.replace(describeRegex, `$1${newDescribe}$3`);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`${path.relative(testsDir, filePath)}`);
    console.log(`  OLD: ${oldDescribe}`);
    console.log(`  NEW: ${newDescribe}`);
    updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
