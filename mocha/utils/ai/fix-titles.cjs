const fs = require('fs');
const path = require('path');

function cleanObjective(obj) {
    let text = obj.replace(/\s+/g, ' ').trim();
    if (text.endsWith('.')) {
        text = text.slice(0, -1);
    }
    return text;
}

function wordOverlap(s1, s2) {
    const w1 = s1.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    const w2 = s2.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    let overlap = 0;
    for (const w of w1) {
        if (w2.includes(w)) overlap++;
    }
    return overlap;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const jsBaseDir = path.resolve('tests/folders');
const xmlBaseDir = path.resolve('../data/soapvalidator/Folders');

function getCorrespondingXmlFile(jsPath) {
    const relJs = path.relative(jsBaseDir, jsPath);
    let xmlCase = relJs.replace(/\.js$/, '.xml');

    // Map dashed to CamelCase-like or Title-Case based on standard soapvalidator structures
    // For bugs: bugs/bug-10137.js -> Bugs/Bug10137.xml
    if (xmlCase.includes('bugs') || xmlCase.includes('Bugs')) {
        xmlCase = xmlCase.replace(/bugs[\\\/]bug-/, 'Bugs/Bug');
    }

    // General Title Casing for paths
    const parts = xmlCase.split(/[\\\/]/).map(part => {
        return part.split('-').map(p => capitalize(p)).join('-');
    });

    let xmlFullPath = path.join(xmlBaseDir, ...parts);
    if (fs.existsSync(xmlFullPath)) return xmlFullPath;

    // Attempt exact match with some variations
    // For sharing/sharing-inherit.js -> Sharing/Sharing-Inherit.xml
    if (fs.existsSync(xmlFullPath)) return xmlFullPath;

    // If not found, try to search recursively in XML dir for the filename
    const searchFile = path.basename(xmlCase);
    return findXmlFile(xmlBaseDir, searchFile) || findXmlFile(xmlBaseDir, searchFile.replace('-', ''));
}

function findXmlFile(dir, fileName) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            const found = findXmlFile(fullPath, fileName);
            if (found) return found;
        } else if (file.toLowerCase() === fileName.toLowerCase()) {
            return fullPath;
        }
    }
    return null;
}

function extractXmlTests(xmlPath) {
    const content = fs.readFileSync(xmlPath, 'utf8');
    const regex = /<t:test_case[^>]*type=["']([^"']+)["'][^>]*>[\s\S]*?<t:objective>\s*([\s\S]*?)\s*<\/t:objective>/gi;
    const tests = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        tests.push({
            type: capitalize(match[1]),
            objective: cleanObjective(match[2]),
        });
    }
    return tests;
}

function processJsDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processJsDir(fullPath);
        } else if (file.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

function processFile(jsPath) {
    const xmlPath = getCorrespondingXmlFile(jsPath);
    if (!xmlPath) {
        console.log(`WARN: No XML mapping found for ${jsPath}`);
        return;
    }

    const xmlTests = extractXmlTests(xmlPath);
    if (xmlTests.length === 0) {
        console.log(`WARN: No tests found in XML: ${xmlPath}`);
        return;
    }

    let jsContent = fs.readFileSync(jsPath, 'utf8');
    let modifications = 0;

    // Match it( '...' or it("..." or it(`...`
    const regex = /^\s*it\s*\(\s*(['"`])(.*?)\1/gm;
    let match;
    const matches = [];
    while ((match = regex.exec(jsContent)) !== null) {
        matches.push({
            fullMatch: match[0],
            quote: match[1],
            oldTitle: match[2],
            index: match.index
        });
    }

    // Attempt 1:1 mapping if counts match perfectly
    if (matches.length === xmlTests.length) {
        matches.forEach((m, idx) => {
            const xmlT = xmlTests[idx];
            const newTitle = `${xmlT.type} | ${xmlT.objective}`;
            if (m.oldTitle !== newTitle) {
                jsContent = jsContent.replace(m.fullMatch, Object.assign(m.fullMatch).replace(m.oldTitle, newTitle));
                modifications++;
            }
        });
    } else {
        // Fuzzy mapping
        matches.forEach(m => {
            let bestXml = null;
            let bestScore = -1;
            for (const xmlT of xmlTests) {
                const score = wordOverlap(m.oldTitle, xmlT.objective);
                if (score > bestScore) {
                    bestScore = score;
                    bestXml = xmlT;
                }
            }
            if (bestXml) {
                const newTitle = `${bestXml.type} | ${bestXml.objective}`;
                if (m.oldTitle !== newTitle) {
                    jsContent = jsContent.replace(m.fullMatch, Object.assign(m.fullMatch).replace(m.oldTitle, newTitle));
                    modifications++;
                }
            }
        });
    }

    if (modifications > 0) {
        fs.writeFileSync(jsPath, jsContent);
        console.log(`Updated ${modifications} tests in ${path.relative(jsBaseDir, jsPath)}`);
    }
}

processJsDir(jsBaseDir);
console.log("Finished script.");
