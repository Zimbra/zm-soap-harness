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
        tests.push({ type, objective: obj, rawType: match[1] });
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
            if (!file.toLowerCase().includes('setup')) {
                results.push(file);
            }
        }
    });
    return results;
}

const xmlFiles = walkDir(xmlBaseDir, '.xml');

let modifiedFiles = 0;

xmlFiles.forEach(xmlPath => {
    const relXml = path.relative(xmlBaseDir, xmlPath).replace(/\\\\/g, '/');
    const expectedJs = relXml.toLowerCase().replace(/\.xml$/, '.js');

    const jsPath = path.join(jsBaseDir, expectedJs);
    if (!fs.existsSync(jsPath)) return;

    const xmlTests = extractXmlTests(xmlPath);
    const activeXmlTests = xmlTests.filter(t => !['bhr', 'always', 'deprecated'].includes(t.type));

    let jsContent = fs.readFileSync(jsPath, 'utf8');
    const jsTestRegex = /^\s*it\s*\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/gm;
    let jsMatch;
    let jsTestCount = 0;
    while ((jsMatch = jsTestRegex.exec(jsContent)) !== null) {
        if (!jsMatch[0].includes('.skip')) {
            jsTestCount++;
        }
    }

    if (activeXmlTests.length === jsTestCount) {
        let lines = jsContent.split('\n');
        let testIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^(\s*it\s*\(\s*(['"`]))((?:(?!\2)[^\\]|\\.)*)\2/);

            if (match && !line.includes('.skip')) {
                if (testIndex < activeXmlTests.length) {
                    const xmlTest = activeXmlTests[testIndex];

                    const formattedType = xmlTest.rawType.charAt(0).toUpperCase() + xmlTest.rawType.slice(1).toLowerCase();
                    let newTitle = `${formattedType} | ${xmlTest.objective}`;

                    const quoteChar = match[2];
                    if (quoteChar === "'") newTitle = newTitle.replace(/'/g, "\\'");
                    if (quoteChar === '"') newTitle = newTitle.replace(/"/g, '\\"');

                    lines[i] = line.replace(match[0], `${match[1]}${newTitle}${quoteChar}`);
                }
                testIndex++;
            }
        }

        fs.writeFileSync(jsPath, lines.join('\n'));
        modifiedFiles++;
    } else {
        console.log(`Skipped ${expectedJs} due to test count mismatch (${activeXmlTests.length} XML vs ${jsTestCount} JS)`);
    }
});

console.log(`Completed auto-fixing titles for ${modifiedFiles} files.`);
