/**
 * Restores template literal interpolations that were stripped from XML elements.
 * The format-xml-in-js.cjs script broke these by splitting lines and losing ${} values.
 * 
 * Patterns to fix:
 * - <name></name> inside CreateAccountRequest -> <name>${varName}</name>
 * - <password></password> -> <password>${config.accountPassword}</password>
 * - <account></account> inside AuthRequest -> <account by="name">${varName}</account>
 * - <id></id> inside AddAccountAliasRequest -> <id>${varName}</id>
 * - <alias></alias> -> <alias>${varName}</alias>
 */
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'tests/briefcase';
const jsBaseDir = path.resolve(targetDir);
let totalFixed = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    const lines = content.split('\n');
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Fix empty <name></name> in CreateAccountRequest context
        if (line.match(/^\t+<name><\/name>/) && i > 0) {
            // Look back for account name variable
            for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
                const m = lines[j].match(/(?:const|let)\s+(account\w*Name|name\w*)\s*=\s*/);
                if (m) {
                    line = line.replace('<name></name>', '<name>${' + m[1] + '}</name>');
                    break;
                }
            }
        }

        // Fix empty <password></password>
        if (line.match(/^\t+<password><\/password>/)) {
            line = line.replace('<password></password>', '<password>${config.accountPassword}</password>');
        }

        // Fix empty <account></account> in AuthRequest context
        if (line.match(/^\t+<account><\/account>/)) {
            // Look back for account name variable
            for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
                const m = lines[j].match(/(?:const|let)\s+(account\w*Name|name\w*)\s*=\s*/);
                if (m) {
                    line = line.replace('<account></account>', '<account by="name">${' + m[1] + '}</account>');
                    break;
                }
            }
        }

        // Fix empty <id></id> in AddAccountAliasRequest context
        if (line.match(/^\t+<id><\/id>/)) {
            // Look back for account/acct variable with .id
            for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
                const m = lines[j].match(/(?:const|let)\s+(acct\w*)\s*=\s*/);
                if (m) {
                    line = line.replace('<id></id>', '<id>${' + m[1] + '.id}</id>');
                    break;
                }
            }
        }

        // Fix empty <alias></alias>
        if (line.match(/^\t+<alias><\/alias>/)) {
            for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                const m = lines[j].match(/(?:const|let)\s+(alias\w*)\s*=\s*/);
                if (m) {
                    line = line.replace('<alias></alias>', '<alias>${' + m[1] + '}</alias>');
                    break;
                }
            }
        }

        newLines.push(line);
    }

    const result = newLines.join('\n');
    if (result !== original) {
        fs.writeFileSync(filePath, result);
        const fixes = (original.match(/<name><\/name>|<password><\/password>|<account><\/account>|<id><\/id>|<alias><\/alias>/g) || []).length;
        console.log('Fixed ' + fixes + ' empty XML tags in ' + path.relative(jsBaseDir, filePath));
        totalFixed += fixes;
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
console.log('Total empty tags fixed: ' + totalFixed);
