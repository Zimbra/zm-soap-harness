const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Rule 1: Remove blank lines between the end of a statement (ending in ;) and an assertion.
    // This perfectly matches the end of `makeSOAPEnvelopeAdmin(...)` or variable declarations immediately preceding assertions.
    const rule1Regex = /(;\r?\n)(?:[ \t]*\r?\n)+([ \t]*assert\.)/gm;
    content = content.replace(rule1Regex, '$1$2');

    // Do the same if the preceding statement was a comment (sometimes people put comments right before assertions)
    // Wait, this isn't strictly necessary but good for grouping. I will skip for safety.

    // Rule 2: Ensure exactly ONE blank line after an assertion if the next line is a new statement or variable assignment (not a closing brace)
    // First, let's normalize by stripping all blank lines after assertions IF they are followed by code, then enforcing just one.
    // Match an assertion line, trailing blanks, and then the next line of code (which does not start with `}` or `assert.`)
    const rule2Regex = /(^[ \t]*assert\.[^\n]+\r?\n)(?:[ \t]*\r?\n)*([ \t]*(?!assert\.|}|\/\/)[a-zA-Z0-9_$])/gm;
    content = content.replace(rule2Regex, '$1\n$2');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Formatted assertion spacing in ${filePath}`);
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
console.log('Finished formatting assertion spacing globally');
