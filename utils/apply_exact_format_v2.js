import fs from 'fs';
import path from 'path';

const dir = 'C:/git/zm-soap-harness/mocha/tests/admin/accounts';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Safe regex to remove old versions:
    // It captures "/* Applicable zimbra versions */ if(...) { return; }"
    // Using simple string checks
    const targetBlock = `\t// Applicable zimbra versions\n\tif (!String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/g)) {\n\t\treturn;\n\t}\n\n\t// Tests\n\t`;

    // 1) Replace existing "// Applicable zimbra versions" block if it matches closely (up to return; })
    content = content.replace(/[ \t]*\/\/\s+Applicable zimbra versions[\s\n]*if[^{]*\{[^}]*\}/i, '');

    // 2) Remove existing "// Tests" comments
    content = content.replace(/[ \t]*\/\/\s+Tests/g, '');

    // 3) Find the FIRST "it(" or "it ('" or "it('" and insert the block right before it
    const firstItIndex = content.search(/^[ \t]*it\s*\(/m);
    if (firstItIndex !== -1) {
        // Find the line start of the first `it(` 
        const beforeIt = content.substring(0, firstItIndex);
        const afterIt = content.substring(firstItIndex);

        // Strip out trailing newlines from `beforeIt`
        const cleanBeforeIt = beforeIt.replace(/[\r\n\t ]+$/, '');

        content = `${cleanBeforeIt}\n\n${targetBlock}${afterIt.trimStart()}`;
    }

    fs.writeFileSync(fullPath, content);
}

console.log('Applied exact Applicable zimbra versions and // Tests standard format.');
