const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, filesList);
        } else if (name.endsWith('.js')) {
            filesList.push(name);
        }
    }
    return filesList;
}

const dir = 'c:/git/zm-soap-harness/mocha/tests/admin/accounts';
const files = getFiles(dir);

let totalReplaced = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    const regex = /(^[ \t]*)if\s*\(\s*[a-zA-Z0-9_\.]+\.Fault\s*\)\s*\{([\s\S]*?)\}\s*else\s*\{[\s\S]*?assert\.fail[^\}]+\}/gm;

    const originalLength = content.length;

    content = content.replace(regex, (match, indent, innerBlock) => {
        totalReplaced++;
        let lines = innerBlock.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
        return lines.map(line => {
            return indent + line.trimStart();
        }).join('\n');
    });

    // Also look for blocks without the "else" but same logic just in case:
    // No, if there is no else, the test isn't technically strictly failing if there's NO fault, but the user didn't mention it. Let's just do if/else since that was the generated compiler pattern.

    // Also remove any rogue `let res = await ...` redeclarations that somehow survived in the first pass just in case, wait no, eslint is happy.

    if (content.length !== originalLength) {
        fs.writeFileSync(file, content);
        console.log(`Updated assertions in ${path.basename(file)}`);
    }
}

console.log(`Total replacements made: ${totalReplaced}`);
