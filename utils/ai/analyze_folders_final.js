const fs = require('fs');
const path = require('path');

const foldersDir = path.join(__dirname, 'mocha/tests/folders');

function countTestsInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Match it('...') or it("...")
    const regex = /it\s*\(['"`](.*?)['"`]/g;
    let count = 0;
    while ((match = regex.exec(content)) !== null) {
        count++;
    }
    return count;
}

function analyzeDir(dir) {
    let results = {};
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            const subResults = analyzeDir(fullPath);
            Object.assign(results, subResults);
        } else if (item.endsWith('.js')) {
            const count = countTestsInFile(fullPath);
            const relPath = path.relative(path.join(__dirname, 'mocha/tests'), fullPath).replace(/\\/g, '/');
            results[relPath] = count;
        }
    }
    return results;
}

const counts = analyzeDir(foldersDir);
console.log('Test File | Test Count');
console.log('--- | ---');
let total = 0;
for (const [file, count] of Object.entries(counts)) {
    console.log(`${file} | ${count}`);
    total += count;
}
console.log(`**Total** | **${total}**`);
