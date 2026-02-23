const fs = require('fs');
const path = require('path');

function getXmlTestsCount(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = /<t:test_case[^>]*type=["'](smoke|sanity|functional|regression)["'][^>]*>/gi;
    let count = 0;
    while (regex.exec(content) !== null) {
        count++;
    }
    return count;
}

function processXmlDirectory(dir, basePath) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(processXmlDirectory(fullPath, basePath));
        } else if (file.endsWith('.xml') && !file.toLowerCase().includes('bugsetup') && !file.toLowerCase().includes('accountsetup')) {
            const relPath = path.relative(basePath, fullPath).replace(/\\\\/g, '/');
            const count = getXmlTestsCount(fullPath);
            if (count > 0) {
                results.push({ file: relPath, xmlCount: count });
            }
        }
    }
    return results;
}

function getJsTestsCount(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Match it( '...' or it("..." or it(`...`
    // Also ignore commented out tests if any simple match
    const regex = /^\s*it\s*\(\s*['"`]/gm;
    let count = 0;
    while (regex.exec(content) !== null) {
        count++;
    }
    return count;
}

function processJsDirectory(dir, basePath) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(processJsDirectory(fullPath, basePath));
        } else if (file.endsWith('.js')) {
            const relPath = path.relative(basePath, fullPath).replace(/\\\\/g, '/');
            const count = getJsTestsCount(fullPath);
            if (count > 0) {
                results.push({ file: relPath, jsCount: count });
            }
        }
    }
    return results;
}

async function run() {
    const xmlDir = path.resolve('../data/soapvalidator/Folders');
    const xmlCounts = processXmlDirectory(xmlDir, xmlDir);

    const jsDir = path.resolve('tests/folders');
    const jsCounts = processJsDirectory(jsDir, jsDir);

    console.log("== FOLDERS: XML vs JS Tests ==");
    console.log("--- XML FILES ---");
    let totalXml = 0;
    for (const x of xmlCounts) {
        console.log(`- ${x.file}: ${x.xmlCount}`);
        totalXml += x.xmlCount;
    }
    console.log(`\nTOTAL XML Active Tests (Folders): ${totalXml}`);

    console.log("\n--- JS FILES ---");
    let totalJs = 0;
    for (const j of jsCounts) {
        console.log(`- ${j.file}: ${j.jsCount}`);
        totalJs += j.jsCount;
    }
    console.log(`\nTOTAL JS Tests (Folders): ${totalJs}`);

    fs.writeFileSync('folders-comparison.json', JSON.stringify({ xml: xmlCounts, js: jsCounts, totalXml, totalJs }, null, 2));
}

run();
