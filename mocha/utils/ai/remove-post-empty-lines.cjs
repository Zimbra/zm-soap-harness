const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Match: `; followed by multiple newlines (with optional carriage returns and spaces)
    // Then capture the indent and the await statement
    const regex = /`;(?:\r?\n[\t ]*)+(?:\r?\n)+([\t ]*)((?:const\s+|let\s+)?(?:\w+\s*=\s*)?await\s+soap\.makeSOAPEnvelope)/g;

    const newContent = content.replace(regex, '`;\n$1$2');

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Removed post-template blank lines in ${filePath}`);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
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
console.log('Finished removing post-template blank lines');
