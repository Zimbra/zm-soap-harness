const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests/folders');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    let modified = false;

    // We want to match:
    // const varName =\n`<Tag>...
    // and replace with:
    // const varName =\n            `<Tag>...

    // specifically we look for:
    // Regex: /^(\s*)(const|let)\s+(\w+)\s*=\s*\n`<([a-zA-Z0-9_:-]+)/gm
    // Wait, the indent of `const` determines the indent of the backtick. Usually + 4 or 8.

    const regex = /^(\s*)(const|let)\s+(\w+)\s*=\s*\n`(<[a-zA-Z0-9_:-]+)/gm;

    const newContent = content.replace(regex, (match, indent, decl, varName, rootTag) => {
        // usually indent is 8 spaces or 4 spaces.
        // let's indent the backtick by indent + 12 spaces relative to file? No, indent + 12 spaces in total.
        // Wait, the inner tags are mostly at 16 spaces.
        // 4 padding: root structure (describe = 0, it = 4, body = 8)
        // const is at 8 spaces.
        // backtick should be at 12 spaces.

        let backtickIndent = indent.length < 4 ? '        ' : indent + '    ';

        let output = `${indent}${decl} ${varName} =\n${backtickIndent}\`${rootTag}`;

        if (output !== match) {
            modified = true;
        }
        return output;
    });

    if (modified && newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Re-indented ${filePath}`);
    }
}

function walkDir(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            walkDir(file);
        } else if (file.endsWith('.js')) {
            processFile(file);
        }
    });
}

walkDir(jsBaseDir);
console.log('Finished fixing XML indent');
