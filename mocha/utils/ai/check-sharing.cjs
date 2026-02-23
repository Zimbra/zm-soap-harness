const fs = require('fs');
const path = require('path');

const xmlDir = path.resolve('../data/soapvalidator/Folders/Sharing');
const jsDir = path.resolve('tests/folders/sharing');

function extractXmlTests(xmlPath) {
    const content = fs.readFileSync(xmlPath, 'utf8');
    const regex = /<t:test_case[^>]*type=["']([^"']+)["'][^>]*>[\s\S]*?<t:objective>\s*([\s\S]*?)\s*<\/t:objective>/gi;
    const tests = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        let type = match[1].toLowerCase();
        if (type !== 'always' && type !== 'bhr' && type !== 'deprecated') {
            let obj = match[2].replace(/\s+/g, ' ').trim();
            if (obj.endsWith('.')) obj = obj.slice(0, -1);
            tests.push(obj);
        }
    }
    return tests;
}

function extractJsTests(jsPath) {
    const content = fs.readFileSync(jsPath, 'utf8');
    const regex = /^\s*it\s*\(\s*(['"`])(.*?)\1/gm;
    const tests = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (!match[0].includes('.skip')) {
            let title = match[2];
            let parts = title.split('|').map(p => p.trim());
            if (parts.length > 1) {
                tests.push(parts[1]);
            } else {
                tests.push(title);
            }
        }
    }
    return tests;
}

function walkDir(dir, ext) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file, ext));
        } else if (file.endsWith(ext)) {
            results.push(file);
        }
    });
    return results;
}

const xmlFiles = walkDir(xmlDir, '.xml');

let totalXml = 0;
let totalJs = 0;

xmlFiles.forEach(xmlPath => {
    const xmlTests = extractXmlTests(xmlPath);

    // Attempt to find corresponding JS file
    const relXml = path.relative(xmlDir, xmlPath);
    // Strict exact matching
    let jsName = relXml.toLowerCase().replace(/\.xml$/, '.js');
    const jsPath = path.join(jsDir, jsName);

    let jsTests = [];
    if (fs.existsSync(jsPath)) {
        jsTests = extractJsTests(jsPath);
    } else {
        // Fallback for sharing/bugs.xml which maps to multiple files
        if (jsName.includes('bugs.js') || jsName.includes('bugs\\bugs.js')) {
            // Bugs.xml maps to bug-23590 and bug-30049
            const b1 = path.join(jsDir, 'bugs/bug-23590.js');
            const b2 = path.join(jsDir, 'bugs/bug-30049.js');
            if (fs.existsSync(b1)) jsTests = jsTests.concat(extractJsTests(b1));
            if (fs.existsSync(b2)) jsTests = jsTests.concat(extractJsTests(b2));
        }
    }

    let diff = xmlTests.length - jsTests.length;
    if (diff > 0) {
        console.log(`\nMismatch in ${relXml}: XML has ${xmlTests.length}, JS has ${jsTests.length}`);
        console.log(`XML Tests:`);
        xmlTests.forEach(t => console.log(`  - ${t}`));
        console.log(`JS Tests:`);
        jsTests.forEach(t => console.log(`  - ${t}`));
    }

    totalXml += xmlTests.length;
    totalJs += jsTests.length;
});

console.log(`\nTotal Sharing XML Tests: ${totalXml}`);
console.log(`Total Sharing JS Tests: ${totalJs}`);
