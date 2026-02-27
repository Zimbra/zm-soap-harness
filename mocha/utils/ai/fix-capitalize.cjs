const fs = require('fs');
const path = require('path');

function walkDir(dir, ext) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            results = results.concat(walkDir(filePath, ext));
        } else if (filePath.endsWith(ext)) {
            results.push(filePath);
        }
    }
    return results;
}

// Fix JS files: capitalize first char after "| " in it() lines
function fixJsFiles(dir) {
    const files = walkDir(dir, '.js');
    let totalFixed = 0;
    for (const file of files) {
        let content = fs.readFileSync(file, 'utf8');
        const original = content;
        // Match it(' or it(" lines with "| lowercase"
        content = content.replace(/(it\(['"][^|]*\| )([a-z])/g, (match, prefix, firstChar) => {
            return prefix + firstChar.toUpperCase();
        });
        if (content !== original) {
            fs.writeFileSync(file, content);
            const origLines = original.split('\n');
            const newLines = content.split('\n');
            const changes = newLines.filter((line, i) => line !== origLines[i]).length;
            console.log(`Fixed ${path.relative(dir, file)} (${changes} lines)`);
            totalFixed++;
        }
    }
    console.log(`\nJS it(): Fixed ${totalFixed} files in ${dir}`);
}

// Fix XML files: capitalize first char in <t:objective> content
function fixXmlObjectives(dir) {
    const files = walkDir(dir, '.xml');
    let totalFixed = 0;
    for (const file of files) {
        let content = fs.readFileSync(file, 'utf8');
        const original = content;
        // Capitalize first word after pipe in objective
        content = content.replace(/(<t:objective>[^<]*\| )([a-z])/g, (match, prefix, firstChar) => {
            return prefix + firstChar.toUpperCase();
        });
        if (content !== original) {
            fs.writeFileSync(file, content);
            const origLines = original.split('\n');
            const newLines = content.split('\n');
            const changes = newLines.filter((line, i) => line !== origLines[i]).length;
            console.log(`Fixed ${path.relative(dir, file)} (${changes} lines)`);
            totalFixed++;
        }
    }
    console.log(`\nXML: Fixed ${totalFixed} files in ${dir}`);
}

const testsDir = path.join(__dirname, 'mocha', 'tests');
const xmlDir = path.join(__dirname, 'data', 'soapvalidator');

console.log('=== Fixing JS test it() blocks ===');
fixJsFiles(testsDir);

console.log('\n=== Fixing XML objectives ===');
fixXmlObjectives(xmlDir);
