import fs from 'fs';
import path from 'path';

const XML_ROOT = path.resolve('../data/soapvalidator/Folders');
const JS_ROOT = path.resolve('./tests/folders');

// ========== XML Parsing ==========
function extractXmlTestCases(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const testCases = [];

    // Match <t:test_case testcaseid="..." type="..." ...>
    const tcRegex = /<t:test_case\s+testcaseid="([^"]*?)"\s+type="([^"]*?)"\s*>/gi;
    const objRegex = /<t:objective>([\s\S]*?)<\/t:objective>/gi;

    // Find all test_case blocks
    let match;
    while ((match = tcRegex.exec(content)) !== null) {
        const testcaseid = match[1];
        const type = match[2].toLowerCase();

        // Find the objective that comes after this test_case tag
        const afterMatch = content.substring(match.index);
        const objMatch = /<t:objective>([\s\S]*?)<\/t:objective>/i.exec(afterMatch);
        const objective = objMatch ? objMatch[1].trim().replace(/\s+/g, ' ') : '';

        testCases.push({ testcaseid, type, objective });
    }

    return testCases;
}

// ========== JS Parsing ==========
function extractJsTestCases(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const tests = [];

    // Match it('...' or it("..."
    const itRegex = /it\s*\(\s*['"`]([\s\S]*?)['"`]/g;
    let match;
    while ((match = itRegex.exec(content)) !== null) {
        const desc = match[1].trim();
        // Parse Type | Description pattern
        const parts = desc.split('|').map(s => s.trim());
        if (parts.length >= 2) {
            tests.push({ type: parts[0].toLowerCase(), description: parts.slice(1).join('|').trim(), raw: desc });
        } else {
            tests.push({ type: 'unknown', description: desc, raw: desc });
        }
    }

    return tests;
}

// ========== File Mapping ==========
const FILE_MAPPING = {
    'Bugs\\Bug10137.xml': 'bugs\\bug-10137.js',
    'Bugs\\Bug31113.xml': 'bugs\\bug-31113.js',
    'Bugs\\Bug39804.xml': 'bugs\\bug-39804.js',
    'Bugs\\Bug40759.xml': 'bugs\\bug-40759.js',
    'Bugs\\Bug61913.xml': 'bugs\\bug-61913.js',
    'Bugs\\Bug66715.xml': 'bugs\\bug-66715.js',
    'Bugs\\Bug85404.xml': 'bugs\\bug-85404.js',
    'Bugs\\Bug95572.xml': 'bugs\\bug-95572.js',
    'Folder-Action.xml': 'folder-action.js',
    'Folder-Create.xml': 'folder-create.js',
    'Folder-Loop.xml': 'folder-loop.js',
    'Folder-Nested-Loop.xml': 'folder-nested-loop.js',
    'Folder-Retention-Policy.xml': 'folder-retention-policy.js',
    'Folders-Get.xml': 'folders-get.js',
    'Folders-Immutable.xml': 'folders-immutable.js',
    'Folders.xml': 'folders.js',
    'Itemaction-Folder.xml': 'itemaction-folder.js',
    'Mountpoint\\Create-Mountpoint.xml': 'mountpoint\\create-mountpoint.js',
    'Mountpoint\\FolderActionRequest-Mountpoint.xml': 'mountpoint\\folder-action-request-mountpoint.js',
    'Mountpoint\\Get-Mountpoint.xml': 'mountpoint\\get-mountpoint.js',
    'Mountpoint\\Stale-Mountpoint.xml': 'mountpoint\\stale-mountpoint.js',
    'Searchfolder-Action.xml': 'searchfolder-action.js',
    'Searchfolder-Create.xml': 'searchfolder-create.js',
    'Searchfolder-Get.xml': 'searchfolder-get.js',
    'Searchfolder-Loop.xml': 'searchfolder-loop.js',
    'Searchfolder-Modify.xml': 'searchfolder-modify.js',
    'Sharing\\Bugs\\Bug77298.xml': 'sharing\\bugs\\bug-77298.js',
    'Sharing\\Bugs\\Bug92407.xml': 'sharing\\bugs\\bug-92407.js',
    'Sharing\\Bugs\\Bugs.xml': null, // Check if this maps to bug-23590.js or bug-30049.js
    'Sharing\\GetEffectiveFolderPermsRequest-Basic.xml': 'sharing\\get-effective-folder-perms-basic.js',
    'Sharing\\Grantee\\Sharing-Grantee-Alias.xml': 'sharing\\grantee\\alias.js',
    'Sharing\\Grantee\\Sharing-Grantee-All.xml': 'sharing\\grantee\\all.js',
    'Sharing\\Grantee\\Sharing-Grantee-COS.xml': 'sharing\\grantee\\cos.js',
    'Sharing\\Grantee\\Sharing-Grantee-DL.xml': 'sharing\\grantee\\dl.js',
    'Sharing\\Grantee\\Sharing-Grantee-Domain.xml': 'sharing\\grantee\\domain.js',
    'Sharing\\Grantee\\Sharing-Grantee-Guest.xml': 'sharing\\grantee\\guest.js',
    'Sharing\\Grantee\\Sharing-Grantee-Public.xml': 'sharing\\grantee\\public.js',
    'Sharing\\Grantee\\Sharing-Grantee-User.xml': 'sharing\\grantee\\user.js',
    'Sharing\\ShareLifeTime\\Share-Lifetime.xml': 'sharing\\share-lifetime\\share-lifetime.js',
    'Sharing\\Sharing-Combine.xml': 'sharing\\sharing-combine.js',
    'Sharing\\Sharing-Immutable.xml': 'sharing\\sharing-immutable.js',
    'Sharing\\Sharing-Inherit.xml': 'sharing\\sharing-inherit.js',
    'Sharing\\Sharing-Rights.xml': 'sharing\\sharing-rights.js',
    'Sharing\\Sharing-ToAdmin.xml': 'sharing\\sharing-to-admin.js',
    'Sharing\\Sharing-ToDomainAdmin.xml': 'sharing\\sharing-to-domain-admin.js',
    'VirtualHost\\VirtualHost-GetFolderRequest.xml': 'virtualhost\\virtual-host-get-folder-request.js',
    'VirtualHost\\VirtualHost-GetInfoRequest.xml': 'virtualhost\\virtual-host-get-info-request.js',
};

// ========== Main Audit ==========
const results = [];
let totalXmlTests = 0;
let totalJsTests = 0;
let totalMissing = 0;
let totalExtra = 0;
const typeCounts = { smoke: 0, sanity: 0, functional: 0, regression: 0, other: 0 };
const typePresent = { smoke: 0, sanity: 0, functional: 0, regression: 0, other: 0 };

for (const [xmlRel, jsRel] of Object.entries(FILE_MAPPING)) {
    const xmlPath = path.join(XML_ROOT, xmlRel);
    const jsPath = jsRel ? path.join(JS_ROOT, jsRel) : null;

    if (!fs.existsSync(xmlPath)) {
        results.push({ xml: xmlRel, js: jsRel, error: 'XML file not found' });
        continue;
    }

    const xmlTests = extractXmlTestCases(xmlPath);
    // Filter out 'always', 'deprecated', 'Ping'
    const filteredXml = xmlTests.filter(t =>
        !['always', 'deprecated'].includes(t.type) &&
        t.testcaseid !== 'Ping'
    );

    if (!jsPath || !fs.existsSync(jsPath)) {
        results.push({
            xml: xmlRel,
            js: jsRel || 'UNMAPPED',
            xmlTests: filteredXml,
            jsTests: [],
            xmlCount: filteredXml.length,
            jsCount: 0,
            missing: filteredXml.length
        });
        totalXmlTests += filteredXml.length;
        totalMissing += filteredXml.length;
        filteredXml.forEach(t => {
            const cat = ['smoke', 'sanity', 'functional', 'regression'].includes(t.type) ? t.type : 'other';
            typeCounts[cat]++;
        });
        continue;
    }

    const jsTests = extractJsTestCases(jsPath);

    // Count by type
    filteredXml.forEach(t => {
        const cat = ['smoke', 'sanity', 'functional', 'regression'].includes(t.type) ? t.type : 'other';
        typeCounts[cat]++;
    });

    jsTests.forEach(t => {
        const cat = ['smoke', 'sanity', 'functional', 'regression'].includes(t.type) ? t.type : 'other';
        typePresent[cat]++;
    });

    totalXmlTests += filteredXml.length;
    totalJsTests += jsTests.length;

    const missing = filteredXml.length > jsTests.length ? filteredXml.length - jsTests.length : 0;
    const extra = jsTests.length > filteredXml.length ? jsTests.length - filteredXml.length : 0;
    totalMissing += missing;
    totalExtra += extra;

    results.push({
        xml: xmlRel,
        js: jsRel,
        xmlTests: filteredXml,
        jsTests,
        xmlCount: filteredXml.length,
        jsCount: jsTests.length,
        missing,
        extra
    });
}

// ========== Generate Report ==========
let report = '# Cross-Check: XML soapvalidator vs JS Mocha — Folders\n\n';
report += `**Generated:** ${new Date().toISOString()}\n\n`;
report += '## Summary\n\n';
report += `| Metric | Count |\n`;
report += `|--------|-------|\n`;
report += `| Total XML test cases (filtered) | ${totalXmlTests} |\n`;
report += `| Total JS tests | ${totalJsTests} |\n`;
report += `| Estimated missing JS tests | ${totalMissing} |\n`;
report += `| Extra JS tests (beyond XML count) | ${totalExtra} |\n\n`;

report += '### By Type (XML defined)\n\n';
report += `| Type | XML Count | JS Count |\n`;
report += `|------|-----------|----------|\n`;
for (const t of ['smoke', 'sanity', 'functional', 'regression']) {
    report += `| ${t.charAt(0).toUpperCase() + t.slice(1)} | ${typeCounts[t]} | ${typePresent[t]} |\n`;
}
report += '\n';

report += '## Detailed File-by-File Comparison\n\n';
report += '> [!NOTE]\n';
report += '> ✅ = Full coverage, ⚠️ = Partial, ❌ = Missing/No JS file\n\n';

// Sort: files with missing first
const sorted = results.sort((a, b) => (b.missing || 0) - (a.missing || 0));

for (const r of sorted) {
    if (r.error) {
        report += `### ❌ ${r.xml}\n${r.error}\n\n---\n\n`;
        continue;
    }

    const icon = r.jsCount === 0 ? '❌' : (r.missing > 0 ? '⚠️' : '✅');
    report += `### ${icon} ${r.xml}\n`;
    report += `**JS File:** \`${r.js}\` | **XML tests:** ${r.xmlCount} | **JS tests:** ${r.jsCount}`;
    if (r.missing > 0) report += ` | **Missing:** ~${r.missing}`;
    if (r.extra > 0) report += ` | **Extra:** +${r.extra}`;
    report += '\n\n';

    if (r.xmlTests.length > 0) {
        report += '<details>\n<summary>XML test cases</summary>\n\n';
        report += '| # | Type | TestCaseID | Objective |\n';
        report += '|---|------|------------|----------|\n';
        r.xmlTests.forEach((t, i) => {
            report += `| ${i + 1} | ${t.type} | ${t.testcaseid} | ${t.objective.substring(0, 80)} |\n`;
        });
        report += '\n</details>\n\n';
    }

    if (r.jsTests.length > 0) {
        report += '<details>\n<summary>JS tests</summary>\n\n';
        report += '| # | Type | Description |\n';
        report += '|---|------|-------------|\n';
        r.jsTests.forEach((t, i) => {
            report += `| ${i + 1} | ${t.type} | ${t.description.substring(0, 80)} |\n`;
        });
        report += '\n</details>\n\n';
    }

    report += '---\n\n';
}

// Check for JS files without XML mapping
const mappedJsFiles = new Set(Object.values(FILE_MAPPING).filter(Boolean));
const allJsFiles = fs.readdirSync(JS_ROOT, { recursive: true })
    .filter(f => f.endsWith('.js'));

const unmappedJs = allJsFiles.filter(f => !mappedJsFiles.has(f));
if (unmappedJs.length > 0) {
    report += '## JS Files Without XML Mapping\n\n';
    unmappedJs.forEach(f => {
        report += `- \`${f}\`\n`;
    });
    report += '\n';
}

fs.writeFileSync('cross-check-report.md', report);
console.log('Report written to cross-check-report.md');
console.log(`\nSUMMARY:`);
console.log(`  XML tests (filtered): ${totalXmlTests}`);
console.log(`  JS tests: ${totalJsTests}`);
console.log(`  Missing: ~${totalMissing}`);
console.log(`  Extra: +${totalExtra}`);
console.log(`\nBy Type:`);
for (const t of ['smoke', 'sanity', 'functional', 'regression']) {
    console.log(`  ${t}: ${typeCounts[t]} XML / ${typePresent[t]} JS`);
}
