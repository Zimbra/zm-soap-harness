/**
 * Removes duplicate "Applicable zimbra versions" blocks.
 * Keeps only the correct format with config.serial check.
 * The OLD wrong block uses: if (!String(config.serverEnvironment)...match(/ZIMBRA101|ZIMBRAX/g))
 * The CORRECT block uses:   if (config.serial === true || !String(config.serverEnvironment)...match(/ZIMBRA101|ZIMBRAX/))
 */
const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/Applicable zimbra versions/g);
    if (!matches || matches.length <= 1) return;

    // Remove the OLD block (without config.serial, with /g flag)
    // Pattern: \n\t// Applicable zimbra versions\n\tif (!String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/g)) {\n\t\treturn;\n\t}\n
    const oldBlockRegex = /\r?\n[ \t]*\/\/ Applicable zimbra versions\r?\n[ \t]*if \(!String\(config\.serverEnvironment\)\.toUpperCase\(\)\.match\(\/ZIMBRA101\|ZIMBRAX\/g\)\) \{\r?\n[ \t]*return;\r?\n[ \t]*\}\r?\n/g;
    content = content.replace(oldBlockRegex, '\n');

    // Clean up any resulting multiple blank lines (more than 2 consecutive)
    content = content.replace(/\n{4,}/g, '\n\n\n');

    const check = content.match(/Applicable zimbra versions/g);
    if (check && check.length === 1) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed: ' + path.relative(jsBaseDir, filePath));
    } else {
        console.log('WARN: ' + path.relative(jsBaseDir, filePath) + ' still has ' + (check ? check.length : 0) + ' blocks');
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    });
}

walkDir(jsBaseDir);
console.log('Done fixing duplicate zimbra blocks');
