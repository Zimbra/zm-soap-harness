const fs = require('fs');
const path = require('path');

// Adjusted path for windows execution context
const baseDir = 'c:\\git\\zm-soap-harness\\data\\soapvalidator';
const outputFile = 'c:\\git\\zm-soap-harness\\soap_test_counts.txt';

let outputBuffer = '';
function log(msg) {
    outputBuffer += msg + '\n';
}

function countTestsInFolder(folderPath) {
    const counts = {
        Smoke: 0,
        Sanity: 0,
        Functional: 0,
        Regression: 0
    };

    if (!fs.existsSync(folderPath)) return counts;

    let files;
    try {
        files = fs.readdirSync(folderPath);
    } catch (e) {
        return counts;
    }

    files.forEach(file => {
        if (!file.endsWith('.xml')) return;
        const filePath = path.join(folderPath, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            // Regex to find test_case start tags and their contents until >
            // Handling multiline attributes
            const testCaseRegex = /<t:test_case\s+([^>]+)>/g;
            let match;
            while ((match = testCaseRegex.exec(content)) !== null) {
                const attrs = match[1];
                const typeMatch = /type=["']([^"']*)["']/.exec(attrs);
                if (typeMatch) {
                    const typeVal = typeMatch[1].toLowerCase();
                    if (typeVal.includes('smoke')) counts.Smoke++;
                    if (typeVal.includes('sanity')) counts.Sanity++;
                    if (typeVal.includes('functional')) counts.Functional++;
                    if (typeVal.includes('regression')) counts.Regression++;
                }
            }
        } catch (e) {
            // console.error(`Error reading ${filePath}: ${e}`);
        }
    });

    return counts;
}

log(`${'Folder'.padEnd(60)} | ${'Smoke'.padEnd(6)} | ${'Sanity'.padEnd(6)} | ${'Functional'.padEnd(10)} | ${'Regression'.padEnd(10)}`);
log('-'.repeat(100));

function processDir(dir) {
    // Process subdirectories first
    let subdirs = [];
    try {
        subdirs = fs.readdirSync(dir).filter(f => {
            try {
                return fs.statSync(path.join(dir, f)).isDirectory();
            } catch (e) { return false; }
        });
    } catch (e) { }

    subdirs.forEach(d => processDir(path.join(dir, d)));

    // Process current directory
    try {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.xml'));
        if (files.length > 0) {
            const counts = countTestsInFolder(dir);
            let relPath = path.relative(baseDir, dir);
            if (relPath === '') relPath = 'Root';

            log(`${relPath.padEnd(60)} | ${counts.Smoke.toString().padEnd(6)} | ${counts.Sanity.toString().padEnd(6)} | ${counts.Functional.toString().padEnd(10)} | ${counts.Regression.toString().padEnd(10)}`);
        }
    } catch (e) { }
}

processDir(baseDir);
fs.writeFileSync(outputFile, outputBuffer);
