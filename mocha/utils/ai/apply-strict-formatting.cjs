const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Remove all existing `// Tests` comments to normalize
    content = content.replace(/\r?\n[ \t]*\/\/\s*Tests\s*(?=\r?\n)/gi, '');

    // 1.5. Remove existing `Applicable zimbra versions` blocks to normalize and prevent duplicates
    const zimbraBlockRegex = /\r?\n[ \t]*\/\/\s*Applicable zimbra versions\r?\n[ \t]*if\s*\(!String\(config\.serverEnvironment\)\.toUpperCase\(\)\.match\(\/ZIMBRA101\|ZIMBRAX\/g\)\)\s*\{\r?\n[ \t]*return;\r?\n[ \t]*\}\s*/gi;
    content = content.replace(zimbraBlockRegex, '');

    // 2. Find the first `it('` or `it("` and apply EXACTLY the requested block with 1 blank line between elements
    let firstIt = content.match(/(\s+)it\(['"]/);
    if (firstIt) {
        // This regex captures the last non-whitespace character, all following whitespace, and the `it(`
        // We replace it to force precisely:
        content = content.replace(/(\S)(\s+)it\((['"])/, (match, prevChar, ws, quote) => {
            return prevChar + '\n\n' +
                '\t// Applicable zimbra versions\n' +
                '\tif (!String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/g)) {\n' +
                '\t\treturn;\n' +
                '\t}\n\n' +
                '\t// Tests\n' +
                '\tit(' + quote;
        });
    }

    // 2.5 Remove this.timeout(...) lines
    content = content.replace(/\r?\n[ \t]*this\.timeout\(\d+\);[^\n]*/g, '');

    // 3. Convert all 4-space indentations into actual tab (\t) characters
    let lines = content.split('\n');
    lines = lines.map(line => {
        // Only target leading spaces
        let match = line.match(/^( {4})+/);
        if (match) {
            let numTabs = match[0].length / 4;
            return '\t'.repeat(numTabs) + line.substring(match[0].length);
        }
        return line;
    });
    content = lines.join('\n');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Applied strict formatting rules to ${filePath}`);
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
console.log('Finished applying formatting rules');
