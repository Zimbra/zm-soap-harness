const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests/folders');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // tests/folders/bugs/bug123.js has depth 3 (folders, bugs, tests are 3 dirs deep relative to mocha)
    // so from bugs it should be ../../../

    // tests/folders/sharing/grantee/foo.js has depth 4 (folders, sharing, grantee, tests)
    // so from grantee it should be ../../../../

    // Calculate accurate depth:
    const relativePart = path.relative(path.resolve('.'), filePath).replace(/\\/g, '/');
    const pathParts = relativePart.split('/');
    // e.g. tests/folders/bugs/bug123.js -> length 4. Depth is 3.
    const depth = pathParts.length - 1;

    const correctDots = '../'.repeat(depth) || './';

    const regex = /(from\s+['"])(?:\.\.\/)+((?:conf|framework|pages)\/.*['"])/g;

    let modified = false;
    const newContent = content.replace(regex, (match, prefix, suffix) => {
        let output = prefix + correctDots + suffix;
        if (output !== match) {
            modified = true;
        }
        return output;
    });

    if (modified && newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Fixed imports in ${filePath} to use ${correctDots}`);
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
console.log('Finished fixing imports');
