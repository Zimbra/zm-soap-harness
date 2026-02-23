import fs from 'fs';
import path from 'path';

const dir = 'C:/git/zm-soap-harness/mocha/tests/admin/accounts';

function formatFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace any varying number of newlines before "it(" with exactly 3 newlines (2 blank lines) and a tab
    content = content.replace(/(?:\r?\n)[\s\r\n]*it\(/g, '\n\n\n\tit(');

    // Ensure only 1 newline after "// Tests" before the first "it("
    content = content.replace(/\/\/\s*Tests(?:[\s\r\n]*)it\(/g, '// Tests\n\tit(');

    // Ensure exactly 1 blank line between the Zimbra version check closing brace and "// Tests"
    // E.g. "}\n\n\t// Tests"
    content = content.replace(/\}(?:[\s\r\n]*)\/\/\s*Tests/g, '}\n\n\t// Tests');

    fs.writeFileSync(filePath, content);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
        formatFile(fullPath);
        console.log(`Formatted: ${file}`);
    } catch (e) {
        console.error(`Error formatting ${file}:`, e.message);
    }
}
