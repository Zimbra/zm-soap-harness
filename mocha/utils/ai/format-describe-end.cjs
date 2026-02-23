const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    let lines = content.split('\n');
    let newLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let hasCr = line.endsWith('\r');
        let rawLine = hasCr ? line.slice(0, -1) : line;

        // If the current line is just "});" (with optional whitespace)
        if (rawLine.trim() === '});') {
            // Remove any preceding blank lines that we just pushed to newLines
            while (newLines.length > 0) {
                let prevLine = newLines[newLines.length - 1];
                let prevRaw = prevLine.endsWith('\r') ? prevLine.slice(0, -1) : prevLine;
                if (prevRaw.trim() === '') {
                    newLines.pop();
                } else {
                    break;
                }
            }
        }
        newLines.push(line);
    }

    let newContent = newLines.join('\n');
    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Removed blank lines before }); in ${filePath}`);
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
console.log('Finished formatting describe block exits');
