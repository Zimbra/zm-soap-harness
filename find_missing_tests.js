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

let output = '';

for (const pair of filesToCheck) {
    const xmlPath = path.join(xmlDir, pair.xml);
    const jsPath = path.join(jsDir, pair.js);

    if (!fs.existsSync(xmlPath)) {
        output += `XML missing: ${pair.xml}\n`;
        continue;
    }

    const xmlContent = fs.readFileSync(xmlPath, 'utf8');

    // Extract testcase blocks
    const testCaseBlocks = xmlContent.match(/<t:test_case[\s\S]*?<\/t:test_case>/g) || [];

    let jsContent = '';
    if (fs.existsSync(jsPath)) {
        jsContent = fs.readFileSync(jsPath, 'utf8');
    } else {
        output += `JS missing: ${pair.js}\n`;
        continue; // We already know this file is missing, we'll implement it separately
    }

    const missingObjectives = [];
    const missingTypes = [];

    for (const block of testCaseBlocks) {
        // Extract objective
        const objMatch = block.match(/<t:objective>(.*?)<\/t:objective>/s);
        let objective = objMatch ? objMatch[1].trim() : null;

        // Extract type
        const typeMatch = block.match(/type\s*=\s*"([^"]+)"/);
        let type = typeMatch ? typeMatch[1].trim() : 'Unknown';

        if (objective) {
            // Clean up objective string (convert multiline to single line, remove xml escapes if any)
            objective = objective.replace(/\n\s*/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

            // Check if this objective exists in JS (case insensitive)
            const exists = jsContent.toLowerCase().includes(objective.toLowerCase());

            if (!exists) {
                missingObjectives.push(objective);
                missingTypes.push(type);
            }
        } else {
            // No objective found in this testcase block?
            // Fallback to checking testcaseid if no objective
            const idMatch = block.match(/testcaseid\s*=\s*"([^"]+)"/);
            if (idMatch) {
                const tcId = idMatch[1];
                if (!jsContent.includes(tcId)) {
                    missingObjectives.push(`No objective (ID: ${tcId})`);
                    missingTypes.push(type);
                }
            }
        }
    }

    if (missingObjectives.length > 0) {
        output += `\nFile: ${pair.js} is missing ${missingObjectives.length} tests:\n`;
        for (let i = 0; i < missingObjectives.length; i++) {
            output += `  - [${missingTypes[i]}] ${missingObjectives[i]}\n`;
        }
    } else {
        output += `\nFile: ${pair.js} has all tests matched!\n`;
    }
}

fs.writeFileSync('c:/git/zm-soap-harness/detailed_audit.txt', output);
console.log('Done writing detailed_audit.txt');
