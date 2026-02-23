const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Match assignments to a template literal that contains absolutely no newlines inside it.
    // This catches both already-collapsed and broken-to-next-line assignments.
    const regex = /^([ \t]*)(const|let)\s+(\w+)\s*=\s*\r?\n?[ \t]*`([^`\n]+)`\s*;/gm;

    let newContent = content.replace(regex, (match, indent, kw, varName, xmlContent) => {
        let collapsed = `${indent}${kw} ${varName} = \`${xmlContent}\`;`;
        let visualLength = collapsed.replace(/\t/g, '    ').length;

        if (visualLength <= 90) {
            return collapsed;
        } else {
            // Force it to split
            let innerIndent = indent + '\t';
            return `${indent}${kw} ${varName} =\n${innerIndent}\`${xmlContent}\`;`;
        }
    });

    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Formatted single-line XML in ${filePath}`);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        let fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    });
}

walkDir(jsBaseDir);
console.log('Finished formatting single-line XML length');
