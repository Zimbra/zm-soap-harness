const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function generateDescribeTitle(filePath) {
    // tests/folders/bugs/bug123.js
    const relativePart = path.relative(jsBaseDir, filePath).replace(/\\/g, '/');
    const pathParts = relativePart.split('/');

    // e.g. ['folders', 'bugs', 'bug123.js']
    let titleParts = [];

    for (let i = 0; i < pathParts.length; i++) {
        let part = pathParts[i];

        if (i === pathParts.length - 1) {
            // File level. E.g. bug31113.js or folder-actions.js
            let filename = part.replace(/\.js$/, '');

            // Format specific filename styles if necessary
            if (filename.match(/^bug\-?\d+/i)) {
                let num = filename.match(/\d+/)[0];
                titleParts.push(`Bug ${num}`);
            } else {
                // capitalize words separated by dash
                let words = filename.split('-');
                let capitalizedWords = words.map(w => capitalizeFirstLetter(w));
                titleParts.push(capitalizedWords.join(' '));
            }
        } else {
            // Directory level
            titleParts.push(capitalizeFirstLetter(part));
        }
    }

    return titleParts.join(' > ');
}


function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    const expectedTitle = generateDescribeTitle(filePath);

    // Replace existing describe title
    // E.g. describe("Folders > Sharing > Bugs > Bug 31113", function () {
    const regex = /describe\(['"](.*?)['"],\s*function\s*\(\)\s*\{/;

    content = content.replace(regex, (match, currentTitle) => {
        return `describe('${expectedTitle}', function () {`;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated title in ${filePath} to '${expectedTitle}'`);
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
console.log('Finished updating describe titles');
