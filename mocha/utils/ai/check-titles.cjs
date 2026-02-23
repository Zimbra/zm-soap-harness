const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests/folders');
let badCount = 0;

function processJsDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processJsDir(fullPath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const regex = /^\s*it\s*\(\s*(['"`])(.*?)\1/gm;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const title = match[2];
                // Check if it matches exactly: "Type | Objective"
                if (!title.match(/^(Smoke|Sanity|Functional|Regression)\s+\|\s+[^\|]+$/i)) {
                    console.log(`Bad title in ${path.relative(jsBaseDir, fullPath)}: "${title}"`);
                    badCount++;
                }
            }
        }
    }
}

processJsDir(jsBaseDir);
if (badCount === 0) {
    console.log("All test titles in folders/ are perfectly formatted.");
} else {
    console.log(`Found ${badCount} bad test titles.`);
}
