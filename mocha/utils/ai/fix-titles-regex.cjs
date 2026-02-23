const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests/folders');

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function processJsDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processJsDir(fullPath);
        } else if (file.endsWith('.js')) {
            let jsContent = fs.readFileSync(fullPath, 'utf8');
            let modifications = 0;

            const regex = /^\s*it\s*\(\s*(['"`])(.*?)\1/gm;
            let match;
            const matches = [];
            while ((match = regex.exec(jsContent)) !== null) {
                matches.push({
                    fullMatch: match[0],
                    quote: match[1],
                    oldTitle: match[2],
                });
            }

            matches.forEach(m => {
                let parts = m.oldTitle.split('|').map(p => p.trim());
                if (parts.length > 1) {
                    // Extract exact type
                    let type = capitalize(parts[0]);

                    // Filter out Bug XXXXX parts
                    let objectiveParts = parts.slice(1).filter(p => !p.match(/^Bug\s*\d+$/i));

                    let objective = objectiveParts.join(' | ');

                    // Remove trailing bug ids from objective e.g. "Objective (bug 123)" or "| BUG-123"
                    objective = objective.replace(/\s*[\|-]?\s*BUG\s*[-_]?\s*\d+/gi, '');
                    objective = objective.replace(/\s*\(\s*bug\s*\d+\s*\)/gi, '');
                    objective = objective.trim();

                    const newTitle = `${type} | ${objective}`;
                    if (m.oldTitle !== newTitle) {
                        jsContent = jsContent.replace(m.fullMatch, Object.assign(m.fullMatch).replace(m.oldTitle, newTitle));
                        modifications++;
                    }
                }
            });

            if (modifications > 0) {
                fs.writeFileSync(fullPath, jsContent);
                console.log(`Regex updated ${modifications} tests in ${path.relative(jsBaseDir, fullPath)}`);
            }
        }
    }
}

processJsDir(jsBaseDir);
console.log("Finished regex cleanup.");
