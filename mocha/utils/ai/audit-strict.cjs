const fs = require('fs');
const path = require('path');

const xmlBaseDir = path.resolve('../data/soapvalidator/Folders');
const jsBaseDir = path.resolve('tests/folders');

function extractXmlTests(xmlPath) {
    const content = fs.readFileSync(xmlPath, 'utf8');
    const regex = /<t:test_case[^>]*type=["']([^"']+)["'][^>]*>[\s\S]*?<t:objective>\s*([\s\S]*?)\s*<\/t:objective>/gi;
    const tests = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        let type = match[1].toLowerCase();
        let obj = match[2].replace(/\s+/g, ' ').trim();
        tests.push({ type, objective: obj });
    }
    return tests;
}

function extractJsTests(jsPath) {
    const content = fs.readFileSync(jsPath, 'utf8');
    const regex = /^\s*it\s*\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/gm;
    const tests = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (!match[0].includes('.skip')) {
            let title = match[2];
            let parts = title.split('|').map(p => p.trim());
            let type = parts.length > 1 ? parts[0].toLowerCase() : 'unknown';
            let obj = parts.length > 1 ? parts[1] : title;
            tests.push({ type, objective: obj });
        }
    }
    return tests;
}

function walkDir(dir, ext) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file, ext));
        } else if (file.endsWith(ext)) {
            // Ignore bugsetup, accountsetup
            if (!file.toLowerCase().includes('setup')) {
                results.push(file);
            }
        }
    });
    return results;
}

const xmlFiles = walkDir(xmlBaseDir, '.xml');
const jsFiles = walkDir(jsBaseDir, '.js');

console.log(`\n=== FILE AND STRUCTURE AUDIT ===`);
console.log(`Total XML Files: ${xmlFiles.length}`);
console.log(`Total JS Files: ${jsFiles.length}`);

let exactMatches = 0;
let fileMismatches = [];

const xmlMap = new Map();

xmlFiles.forEach(xmlPath => {
    const relXml = path.relative(xmlBaseDir, xmlPath).replace(/\\\\/g, '/');
    const expectedJs = relXml.toLowerCase().replace(/\.xml$/, '.js');
    xmlMap.set(expectedJs, { xmlPath, relXml });

    // Check if JS exists
    const jsPath = path.join(jsBaseDir, expectedJs);
    if (!fs.existsSync(jsPath)) {
        fileMismatches.push(`MISSING JS FILE: expected ${expectedJs} to match ${relXml}`);
    } else {
        exactMatches++;
    }
});

jsFiles.forEach(jsPath => {
    const relJs = path.relative(jsBaseDir, jsPath).replace(/\\\\/g, '/');
    if (!xmlMap.has(relJs)) {
        fileMismatches.push(`EXTRA JS FILE: ${relJs} has no corresponding XML file`);
    }
});

if (fileMismatches.length > 0) {
    console.log(`Found ${fileMismatches.length} file structure issues:`);
    fileMismatches.forEach(m => console.log(`  - ${m}`));
} else {
    console.log(`SUCCESS: 100% strict file mapping. All ${exactMatches} files match perfectly in name and directory structure.`);
}

console.log(`\n=== TEST COUNT AND SUBJECT AUDIT ===`);
let totalXmlTests = 0;
let totalJsTests = 0;
let testContentIssues = 0;

xmlMap.forEach((data, expectedJs) => {
    const jsPath = path.join(jsBaseDir, expectedJs);
    if (!fs.existsSync(jsPath)) return;

    const xmlTests = extractXmlTests(data.xmlPath);
    const jsTests = extractJsTests(jsPath);

    // Filter out BHR, Always, Deprecated from XML as they are usually skipped
    const activeXmlTests = xmlTests.filter(t => !['bhr', 'always', 'deprecated'].includes(t.type));

    totalXmlTests += activeXmlTests.length;
    totalJsTests += jsTests.length;

    if (activeXmlTests.length !== jsTests.length) {
        console.log(`[MISMATCH] ${expectedJs}: XML has ${activeXmlTests.length} tests, JS has ${jsTests.length} tests`);
        testContentIssues++;
    } else {
        // Checking types and subjects
        let errors = [];
        for (let i = 0; i < activeXmlTests.length; i++) {
            const x = activeXmlTests[i];
            const j = jsTests[i] || { type: 'none', objective: 'none' };

            if (x.type !== j.type) {
                errors.push(`Test ${i + 1} Type Mismatch: XML '${x.type}' vs JS '${j.type}'`);
            }
            // Strict equality for objective is hard due to whitespace/formatting, but we can check if they are very different
            const xObjStr = x.objective.toLowerCase().replace(/[^a-z0-9]/g, '');
            const jObjStr = j.objective.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (xObjStr !== jObjStr) {
                errors.push(`Test ${i + 1} Subject Mismatch: \n    XML: ${x.objective}\n    JS:  ${j.objective}`);
            }
        }
        if (errors.length > 0) {
            console.log(`[SUBJECT/TYPE MISMATCH] ${expectedJs}:`);
            errors.forEach(e => console.log(`  - ${e}`));
            testContentIssues++;
        }
    }
});

console.log(`\nTotal Active XML Tests: ${totalXmlTests}`);
console.log(`Total JS Tests: ${totalJsTests}`);
if (testContentIssues === 0) {
    console.log(`SUCCESS: 100% test count and subject mapping.`);
} else {
    console.log(`Found issues in ${testContentIssues} files needing strictly enforced subjects/types/counts.`);
}
