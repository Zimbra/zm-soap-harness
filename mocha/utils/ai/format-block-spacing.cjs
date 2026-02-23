const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Matches `});` or `}` followed by whitespace/newlines up to the next visible character.
    // If the next visible character starts the word `it(`, we enforce exactly 2 blank lines (\n\n\n).
    // Otherwise, we enforce exactly 1 blank line (\n\n).
    const regex = /(}\);?)[ \t]*(\r?\n)+([ \t]*)(?=\S)/g;
    let newContent = content.replace(regex, (match, closing, nl, indent, offset, str) => {
        let n = offset + match.length;
        let nextSnippet = str.substring(n, n + 10);
        if (nextSnippet.startsWith('it(') || nextSnippet.startsWith('it ("') || nextSnippet.startsWith("it('")) {
            return `${closing}\n\n\n${indent}`;
        }
        return `${closing}\n\n${indent}`;
    });

    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Enforced single blank line spacing in ${filePath}`);
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
console.log('Finished enforcing single blank line spacing after blocks');
