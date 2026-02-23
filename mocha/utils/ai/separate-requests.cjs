const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    let lines = content.split('\n');
    let newLines = [];
    let inRequestEnd = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Remove \r if present
        if (line.endsWith('\r')) {
            line = line.slice(0, -1);
        }

        let trimmed = line.trim();

        if (inRequestEnd) {
            if (trimmed === '') {
                inRequestEnd = false;
                newLines.push(line);
            } else if ((trimmed.startsWith('const ') || trimmed.startsWith('let ')) && trimmed.endsWith(';') && !trimmed.includes('`')) {
                // e.g. `const msg2Id = ref2.AddMsgResponse.m[0].id;`
                newLines.push(line);
            } else if (trimmed.startsWith('//') || trimmed.startsWith('}') || trimmed.startsWith('it(') || trimmed.startsWith('assert.')) {
                // If comment, closing block, or assertion, don't necessarily force a blank line, or maybe we do?
                // The user only explicitly asked for spacing between two requests, but usually spacing before assert is fine.
                // Let's not space before assertions or comments, to match standard style manually applied.
                inRequestEnd = false;
                newLines.push(line);
            } else {
                // It's the start of something else, like a new request or loop. Insert a blank line!
                newLines.push('');
                newLines.push(line);
                inRequestEnd = false;
            }
        } else {
            newLines.push(line);
            if (trimmed.includes('await soap.makeSOAP') && trimmed.endsWith(';')) {
                inRequestEnd = true;
            }
        }
    }

    let newContent = newLines.join('\n');
    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Separated requests in ${filePath}`);
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
console.log('Finished separating adjacent requests');
