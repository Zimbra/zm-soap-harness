const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

function getAllJsFiles(dir) {
    const results = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            results.push(...getAllJsFiles(full));
        } else if (item.endsWith('.js')) {
            results.push(full);
        }
    }
    return results;
}

const files = getAllJsFiles(TARGET_DIR);
let fixed = 0;
let skipped = 0;
let alreadyHas = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    if (content.includes('// Applicable zimbra versions')) {
        alreadyHas++;
        continue;
    }

    // Find the first it(' occurrence
    const firstItMatch = content.match(/(\r?\n)(\s*)(it\()/);
    if (!firstItMatch) {
        console.log('SKIP (no it found): ' + file);
        skipped++;
        continue;
    }

    const firstItIndex = content.indexOf(firstItMatch[0]);

    // Find the }); before the first it - this is the before() closing
    const beforeSection = content.substring(0, firstItIndex);
    const lastClosingBrace = beforeSection.lastIndexOf('});');

    if (lastClosingBrace === -1) {
        console.log('SKIP (no }); found): ' + file);
        skipped++;
        continue;
    }

    // Detect indentation of it()
    const indent = firstItMatch[2];
    const newline = content.includes('\r\n') ? '\r\n' : '\n';

    // Insert point is after '});'
    const insertPoint = lastClosingBrace + 3;

    // Build the formatting block
    const block = newline + newline + indent + '// Applicable zimbra versions' + newline + indent + 'if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {' + newline + indent + '\treturn;' + newline + indent + '}' + newline + newline + indent + '// Tests' + newline;

    // Replace content between }); and first it(
    content = content.substring(0, insertPoint) + block + indent + content.substring(firstItIndex).trimStart();

    fs.writeFileSync(file, content, 'utf8');
    fixed++;
    console.log('FIXED: ' + path.relative(TARGET_DIR, file));
}

console.log('\nDone! Fixed: ' + fixed + ', Already had: ' + alreadyHas + ', Skipped: ' + skipped);
