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

// Parse each XML file for REAL test case details 
const xmlFiles = walkDir(xmlDir).filter(f => f.endsWith('.xml')).sort();
let totalMig = 0;

const allDetails = [];

for (const f of xmlFiles) {
    const content = fs.readFileSync(f, 'utf8');
    // Parse each t:test_case element
    const tcRegex = /<t:test_case\s+([^>]+)>/g;
    let m;
    const testCases = [];
    while ((m = tcRegex.exec(content)) !== null) {
        const attrs = m[1];
        const typeMatch = attrs.match(/type="([^"]+)"/);
        const idMatch = attrs.match(/testcaseid="([^"]+)"/);
        const type = typeMatch ? typeMatch[1] : 'unknown';
        const tcId = idMatch ? idMatch[1] : 'unknown';

        // Check exclusion
        const isExcluded = type === 'always' || type === 'deprecated' ||
            tcId.toLowerCase() === 'ping' || tcId.toLowerCase().includes('setup');

        // Get objective
        const objRegex = /<t:objective>([\s\S]*?)<\/t:objective>/;
        const afterTc = content.substring(m.index);
        const objMatch = afterTc.match(objRegex);
        const objective = objMatch ? objMatch[1].replace(/\s+/g, ' ').trim() : '';

        testCases.push({ tcId, type, isExcluded, objective: objective.substring(0, 80) });
    }

    const rel = path.relative(xmlDir, f).split(path.sep).join('/');
    const migCount = testCases.filter(tc => !tc.isExcluded).length;
    totalMig += migCount;

    allDetails.push({
        rel,
        total: testCases.length,
        migratable: migCount,
        excluded: testCases.filter(tc => tc.isExcluded).length,
        tests: testCases.filter(tc => !tc.isExcluded)
    });
}

// Also count existing JS its
const jsFiles = walkDir(jsDir).filter(f => f.endsWith('.js')).sort();
let totalIts = 0;
for (const f of jsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    totalIts += (content.match(/\bit\(/g) || []).length;
}

console.log('=== DETAILED XML TEST CASE INVENTORY ===');
console.log('');
for (const d of allDetails) {
    if (d.migratable > 0) {
        console.log(`${d.rel} [${d.migratable} mig, ${d.excluded} excl]`);
        for (const tc of d.tests) {
            console.log(`  ${tc.type} | ${tc.tcId} | ${tc.objective}`);
        }
    }
}
console.log('');
console.log('TOTAL MIGRATABLE XML TESTS: ' + totalMig);
console.log('TOTAL JS IT() BLOCKS: ' + totalIts);
console.log('XML FILES WITH MIGRATABLE TESTS: ' + allDetails.filter(d => d.migratable > 0).length);
