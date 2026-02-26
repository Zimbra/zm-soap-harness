const fs = require('fs');
const path = require('path');

const folders = [
    { xml: 'data/soapvalidator/Sync', js: 'mocha/tests/sync' },
    { xml: 'data/soapvalidator/Tags', js: 'mocha/tests/tags' },
    { xml: 'data/soapvalidator/Tasks', js: 'mocha/tests/tasks' },
];

function walk(dir, ext) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, f.name);
        if (f.isDirectory()) results = results.concat(walk(full, ext));
        else if (f.name.endsWith(ext)) results.push(full);
    }
    return results;
}

function getXmlTests(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const re = /<t:test_case[^>]*testcaseid="([^"]+)"[^>]*type="([^"]+)"[^>]*>/g;
    const tests = [];
    let m;
    while ((m = re.exec(content)) !== null) {
        if (m[2] !== 'always' && m[2] !== 'deprecated') {
            // Find the objective for this test case
            const startIdx = m.index;
            const endIdx = content.indexOf('</t:test_case>', startIdx);
            const block = content.substring(startIdx, endIdx);
            const objMatch = block.match(/<t:objective>([\s\S]*?)<\/t:objective>/);
            tests.push({
                id: m[1],
                type: m[2],
                objective: objMatch ? objMatch[1].trim() : '(no objective)',
            });
        }
    }
    return tests;
}

function getJsTests(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const re = /\bit\('([^']+)'/g;
    const tests = [];
    let m;
    while ((m = re.exec(content)) !== null) {
        tests.push(m[1]);
    }
    return tests;
}

function xmlBasenameToJs(xmlBasename) {
    // Convert XML filename to expected JS filename
    // e.g. "Sync-Action.xml" -> "sync-action.js"
    // e.g. "CreateTaskRequest-RecurrenceAllDay.xml" -> "createtaskrequest-recurrence-allday.js" or "createtaskrequest-recurrenceallday.js"
    return xmlBasename
        .replace(/\.xml$/, '.js')
        .toLowerCase();
}

let grandXml = 0, grandJs = 0, grandMissing = 0;

for (const folder of folders) {
    console.log('\n' + '='.repeat(70));
    console.log('FOLDER: ' + folder.xml);
    console.log('='.repeat(70));

    const xmlFiles = walk(folder.xml, '.xml');
    const jsFiles = walk(folder.js, '.js');
    const jsBasenames = new Map();
    for (const jf of jsFiles) {
        const rel = path.relative(folder.js, jf).replace(/\\/g, '/').toLowerCase();
        jsBasenames.set(rel, jf);
        // Also map just the basename for fuzzy matching
        jsBasenames.set(path.basename(jf).toLowerCase(), jf);
    }

    let folderXml = 0, folderJs = 0, folderMissing = 0;

    for (const xf of xmlFiles) {
        const rel = path.relative(folder.xml, xf).replace(/\\/g, '/');
        const xmlTests = getXmlTests(xf);
        folderXml += xmlTests.length;

        // Try to find matching JS file
        const jsRel = rel.replace(/\.xml$/, '.js').toLowerCase();
        const jsRelHyphen = rel.split('/').map((p, i, arr) => {
            if (i === arr.length - 1) {
                // filename: insert hyphens before uppercase letters
                return p.replace(/\.xml$/, '.js')
                    .replace(/([a-z])([A-Z])/g, '$1-$2')
                    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
                    .toLowerCase();
            }
            return p.toLowerCase();
        }).join('/');

        let jsFile = jsBasenames.get(jsRel) || jsBasenames.get(jsRelHyphen);

        // Fuzzy: try basename variations
        if (!jsFile) {
            const base = path.basename(rel, '.xml').toLowerCase();
            const baseHyphen = base.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase();
            jsFile = jsBasenames.get(base + '.js') || jsBasenames.get(baseHyphen + '.js');
        }

        // Try with underscores replaced by hyphens
        if (!jsFile) {
            const baseUnderscore = path.basename(rel, '.xml').toLowerCase().replace(/_/g, '-');
            jsFile = jsBasenames.get(baseUnderscore + '.js');
        }

        if (!jsFile) {
            console.log('\n  ❌ MISSING FILE: ' + rel + ' (' + xmlTests.length + ' tests)');
            for (const t of xmlTests) {
                console.log('     [' + t.type + '] ' + t.id + ': ' + t.objective);
            }
            folderMissing += xmlTests.length;
        } else {
            const jsTests = getJsTests(jsFile);
            folderJs += jsTests.length;
            const gap = xmlTests.length - jsTests.length;

            if (gap > 0) {
                const jsRel2 = path.relative(folder.js, jsFile).replace(/\\/g, '/');
                console.log('\n  ⚠️  GAP in ' + rel + ' → ' + jsRel2 + ': XML=' + xmlTests.length + ' JS=' + jsTests.length + ' (missing ' + gap + ')');

                // Try to identify which tests are missing
                const jsLower = jsTests.map(d => d.toLowerCase());
                for (const t of xmlTests) {
                    const objLower = t.objective.toLowerCase();
                    const found = jsLower.some(j => j.includes(objLower.substring(0, Math.min(30, objLower.length))));
                    if (!found) {
                        console.log('     MISSING [' + t.type + '] ' + t.id + ': ' + t.objective);
                    }
                }
                folderMissing += gap;
            } else {
                console.log('  ✅ ' + rel + ' (XML=' + xmlTests.length + ', JS=' + jsTests.length + ')');
            }
        }
    }

    console.log('\n  📊 SUMMARY: XML=' + folderXml + ' JS=' + folderJs + ' Missing=' + folderMissing);
    grandXml += folderXml;
    grandJs += folderJs;
    grandMissing += folderMissing;
}

console.log('\n' + '='.repeat(70));
console.log('GRAND TOTAL: XML=' + grandXml + ' JS=' + grandJs + ' Missing=' + grandMissing);
console.log('='.repeat(70));
