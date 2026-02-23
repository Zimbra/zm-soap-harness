import fs from 'fs';
import path from 'path';

const dir = 'C:/git/zm-soap-harness/mocha/tests/admin/accounts';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const STANDARD_BLOCK = `\t// Applicable zimbra versions\n\tif (!String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/g)) {\n\t\treturn;\n\t}\n\n\t// Tests\n\t`;

for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Remove existing version checks or "// Tests" blocks
    content = content.replace(/[\t ]*\/\/\s*Applicable zimbra versions[\s\S]*?(var|let|const|it\(|describe|before)/gi, '$1');
    content = content.replace(/[\t ]*\/\/\s*Tests[\r\n]+[\t ]*(it\()/g, '$1');

    // Insert the standard block directly before the first "it(" taking care of spaces
    // Only if an "it(" exists
    if (content.includes("it(")) {
        content = content.replace(/([ \t]*)it\(/, (match, spaces) => {
            // Apply our standard formatted block
            return STANDARD_BLOCK + "it(";
        });
    }

    // Ensure double blank lines between the newly added `// Tests\nit` block and previous elements natively
    content = content.replace(/(}\);?)[\r\n\t ]*\/\/ Applicable zimbra versions/g, '$1\n\n\t// Applicable zimbra versions');

    fs.writeFileSync(fullPath, content);
}

console.log('Applied exact Applicable zimbra versions and // Tests standard format.');
