const fs = require('fs');
const path = require('path');

function countJSTests(dir) {
    let total = 0;
    if (!fs.existsSync(dir)) return 0;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.forEach(item => {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
            total += countJSTests(full);
        } else if (item.name.endsWith('.js')) {
            const content = fs.readFileSync(full, 'utf8');
            const re = /\bit\s*\(/g;
            let m, c = 0;
            while ((m = re.exec(content)) !== null) { c++; }
            if (c > 0) console.log(full + ': ' + c);
            total += c;
        }
    });
    return total;
}

console.log('=== Sync JS ===');
const syncTotal = countJSTests('mocha/tests/sync');
console.log('Sync JS total: ' + syncTotal);
console.log('\n=== Tags JS ===');
const tagsTotal = countJSTests('mocha/tests/tags');
console.log('Tags JS total: ' + tagsTotal);
console.log('\n=== Tasks JS ===');
const tasksTotal = countJSTests('mocha/tests/tasks');
console.log('Tasks JS total: ' + tasksTotal);
console.log('\nGRAND JS TOTAL: ' + (syncTotal + tagsTotal + tasksTotal));
