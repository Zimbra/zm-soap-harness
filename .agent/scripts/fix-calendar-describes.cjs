#!/usr/bin/env node
// fix-calendar-describes.cjs
// Fixes describe() names in all calendar JS files to match folder structure.
// Usage: node .agent/scripts/fix-calendar-describes.cjs [--dry-run]

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE = path.resolve(__dirname, '../../mocha/tests/calendar');

// Convert kebab-case segment to Title Case
// e.g. 'meeting-request' → 'Meeting Request'
// e.g. 'get-appt-summaries' → 'Get Appt Summaries'
// Special cases for known abbreviations and domain terms
function segmentToTitle(seg) {
    // Special mappings for segments that don't follow normal title case
    const specialMap = {
        'lmtp': 'Lmtp',
        'imap': 'IMAP',
        'dl': 'DL',
        'rsvp': 'RSVP',
        'tz': 'Tz',
        'outlook2007': 'Outlook2007',
        'minical': 'MiniCal',
        'freebusy': 'FreeBusy',
    };

    if (specialMap[seg]) return specialMap[seg];

    return seg.split('-').map((word) => {
        // Keep known abbreviations uppercase
        const upperWords = ['dl', 'rsvp', 'tz'];
        if (upperWords.includes(word)) return word.toUpperCase();

        // Bug numbers: keep as-is (e.g. bug28753)
        if (/^bug\d+$/.test(word)) return word.charAt(0).toUpperCase() + word.slice(1);

        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

// Convert filename (without .js) to Title Case for describe
// e.g. 'create-appointment-request-basic' → 'Create Appointment Request Basic'
function fileToTitle(filename) {
    const base = path.basename(filename, '.js');
    return segmentToTitle(base);
}

// Build the describe name from the file path
function buildDescribeName(filePath) {
    const rel = path.relative(BASE, filePath);
    const parts = rel.replace(/\\/g, '/').split('/');
    const filename = parts.pop(); // remove filename from segments

    const segments = ['Calendar'];

    // Add directory segments
    for (const dir of parts) {
        segments.push(segmentToTitle(dir));
    }

    // Add filename segment
    segments.push(fileToTitle(filename));

    return segments.join(' > ');
}

// Find all .js files recursively
function findJsFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findJsFiles(fullPath));
        } else if (entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

// Main
const files = findJsFiles(BASE);
let changed = 0;
let skipped = 0;
let errors = 0;

if (DRY_RUN) console.log('=== DRY RUN ===\n');

for (const filePath of files.sort()) {
    const content = fs.readFileSync(filePath, 'utf8');
    const expectedDescribe = buildDescribeName(filePath);

    // Match the describe line — handle both single and double quotes
    const describeRegex = /^(describe\(['"])([^'"]+)(['"],\s*function\s*\(\)\s*\{)/m;
    const match = content.match(describeRegex);

    if (!match) {
        const rel = path.relative(BASE, filePath);
        console.log(`SKIP ${rel} (no describe found)`);
        skipped++;
        continue;
    }

    const currentDescribe = match[2];

    if (currentDescribe === expectedDescribe) {
        // Already correct
        continue;
    }

    const rel = path.relative(BASE, filePath);
    console.log(`FIX  ${rel}`);
    console.log(`     OLD: ${currentDescribe}`);
    console.log(`     NEW: ${expectedDescribe}`);

    if (!DRY_RUN) {
        const newContent = content.replace(
            describeRegex,
            `${match[1]}${expectedDescribe}${match[3]}`
        );
        fs.writeFileSync(filePath, newContent, 'utf8');
    }

    changed++;
}

console.log(`\n=== Summary ===`);
console.log(`Total files: ${files.length}`);
console.log(`Fixed:       ${changed}`);
console.log(`Skipped:     ${skipped}`);
console.log(`Errors:      ${errors}`);
