const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    let lines = content.split('\n');
    let newLines = [];
    let i = 0;

    while (i < lines.length) {
        let line = lines[i];
        let hasCr = line.endsWith('\r');
        let rawLine = hasCr ? line.slice(0, -1) : line;

        newLines.push(line);

        // Match a describe block declaration
        if (rawLine.match(/^\s*describe\(/)) {
            // Look ahead and skip any purely blank/whitespace lines
            let j = i + 1;
            while (j < lines.length) {
                let nextLine = lines[j];
                let nextRaw = nextLine.endsWith('\r') ? nextLine.slice(0, -1) : nextLine;
                if (nextRaw.trim() === '') {
                    j++;
                } else {
                    break;
                }
            }
            i = j - 1; // Advance outer loop to the last stripped blank line
        }
        i++;
    }

    let newContent = newLines.join('\n');
    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Removed blank lines after describe in ${filePath}`);
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
console.log('Finished formatting describe block entries');
