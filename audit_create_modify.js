const fs = require('fs');
const path = require('path');

const xmlDir = 'c:/git/zm-soap-harness/data/soapvalidator/Admin/Accounts';
const jsDir = 'c:/git/zm-soap-harness/mocha/tests/admin/accounts';

const filesToCheck = [
    { xml: 'Account-Create01.xml', js: 'create-account-01.js' },
    { xml: 'Account-Create02.xml', js: 'create-account-02.js' },
    { xml: 'Account-Create03.xml', js: 'create-account-03.js' },
    { xml: 'Account-Create04.xml', js: 'create-account-04.js' },
    { xml: 'Account-Create05.xml', js: 'create-account-05.js' },
    { xml: 'Account-Create06.xml', js: 'create-account-06.js' },
    { xml: 'Account-Create07.xml', js: 'create-account-07.js' },
    { xml: 'Modify-Account01.xml', js: 'modify-account-01.js' },
    { xml: 'Modify-Account02.xml', js: 'modify-account-02.js' },
    { xml: 'Modify-Account03.xml', js: 'modify-account-03.js' },
    { xml: 'Modify-Account04.xml', js: 'modify-account-04.js' },
    { xml: 'Modify-Account05.xml', js: 'modify-account-05.js' }
];

let output = 'XML File | XML Tests | JS File | JS Tests | Diff | Has tests in before()\n';
output += '-------------------------------------------------------------------------\n';

for (const pair of filesToCheck) {
    const xmlPath = path.join(xmlDir, pair.xml);
    const jsPath = path.join(jsDir, pair.js);

    let xmlTests = 0;
    if (fs.existsSync(xmlPath)) {
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        const matches = xmlContent.match(/<t:test_case\s+/g);
        if (matches) {
            xmlTests = matches.length;
        }
    } else {
        xmlTests = 'N/A';
    }

    let jsTests = 0;
    let hasTestsInBefore = false;
    if (fs.existsSync(jsPath)) {
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        const matches = jsContent.match(/it\s*\(/g);
        if (matches) {
            jsTests = matches.length;
        }
        if (/before\s*\([\s\S]*?it\s*\(/.test(jsContent) || /beforeEach\s*\([\s\S]*?it\s*\(/.test(jsContent)) {
            hasTestsInBefore = true;
        }
    } else {
        jsTests = 'N/A';
    }

    let diff = 'N/A';
    if (typeof xmlTests === 'number' && typeof jsTests === 'number') {
        diff = xmlTests - jsTests;
    }

    output += `${pair.xml.padEnd(20)} | ${String(xmlTests).padEnd(9)} | ${pair.js.padEnd(20)} | ${String(jsTests).padEnd(8)} | ${String(diff).padEnd(4)} | ${hasTestsInBefore}\n`;
}

output += '\n--- Details for JS files ---\n';
for (const pair of filesToCheck) {
    const jsPath = path.join(jsDir, pair.js);
    if (!fs.existsSync(jsPath)) continue;

    const jsContent = fs.readFileSync(jsPath, 'utf8');
    const smoke = (jsContent.match(/it\('Smoke/ig) || []).length;
    const sanity = (jsContent.match(/it\('Sanity/ig) || []).length;
    const func = (jsContent.match(/it\('Functional/ig) || []).length;
    const regr = (jsContent.match(/it\('Regression/ig) || []).length;
    const always = (jsContent.match(/it\('Always/ig) || []).length;

    const matchIts = jsContent.match(/it\('([^']+)'/g);
    let untagged = 0;
    if (matchIts) {
        for (const itStr of matchIts) {
            if (!itStr.match(/Smoke|Sanity|Functional|Regression|Always/i)) {
                untagged++;
            }
        }
    }

    output += `${pair.js}: Smoke: ${smoke}, Sanity: ${sanity}, Functional: ${func}, Regression: ${regr}, Always: ${always}, Untagged: ${untagged}\n`;
}

fs.writeFileSync('c:/git/zm-soap-harness/audit.txt', output);
console.log('Done writing audit.txt');
