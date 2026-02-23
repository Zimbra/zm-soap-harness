import fs from 'fs';
import path from 'path';

const dir = 'C:/git/zm-soap-harness/mocha/tests/admin/accounts';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const STANDARD_BLOCK = `\t// Applicable zimbra versions
\tif (!String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/g)) {
\t\treturn;
\t}

\t// Tests
`;

for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // 1. Fix unindented 'const' at the start of the line (e.g., const testBooleanAttribute...)
    content = content.replace(/^const /gm, '\tconst ');
    content = content.replace(/^let /gm, '\tlet ');

    // 2. Remove all existing "// Applicable zimbra versions" blocks and "// Tests"
    content = content.replace(/[ \t]*\/\/\s*Applicable zimbra versions[\s\S]*?if\s*\([^\{]+\{\s*return;\s*\}/gi, '');
    content = content.replace(/[ \t]*\/\/\s*Tests/gi, '');

    // 3. Find the first `it(` and prepend the exact block the user requested
    // Use a flag to only replace the first occurrence
    let replaced = false;
    content = content.replace(/([ \t]*)it\s*\(/g, (match) => {
        if (!replaced) {
            replaced = true;
            return STANDARD_BLOCK + match;
        }
        return match;
    });

    // 4. Ensure there are exactly 2 blank lines before "// Applicable zimbra versions" if it follows a closing brace
    content = content.replace(/(}\);?)[\s\r\n]*\t\/\/\s*Applicable zimbra versions/g, '$1\n\n\n\t// Applicable zimbra versions');

    fs.writeFileSync(fullPath, content);
}
console.log('Formatting completely applied across all admin files.');
