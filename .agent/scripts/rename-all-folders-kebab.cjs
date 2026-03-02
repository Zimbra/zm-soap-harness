const fs = require('fs');
const path = require('path');

// Convert any name to kebab-case
function toKebab(name) {
    return name
        // camelCase → camel-Case
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        // XMLParser → XML-Parser
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        // letter+digit → letter-digit
        .replace(/([a-zA-Z])(\d)/g, '$1-$2')
        // digit+letter → digit-letter
        .replace(/(\d)([a-zA-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function isKebab(name) {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
}

function findAll(dir) {
    const results = { dirs: [], files: [] };
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.dirs.push(fullPath);
            const sub = findAll(fullPath);
            results.dirs.push(...sub.dirs);
            results.files.push(...sub.files);
        } else if (entry.name.endsWith('.js')) {
            results.files.push(fullPath);
        }
    }
    return results;
}

const testsDir = 'mocha/tests';
const all = findAll(testsDir);

console.log('=============================================');
console.log('  ALL-RENAME-FOLDER: Dynamic Kebab-Case');
console.log('=============================================');

// Phase 1: Rename directories (deepest first to avoid path issues)
console.log('\n=== Phase 1: Folder Renames ===');
let dirCount = 0;
const sortedDirs = all.dirs.sort((a, b) => b.length - a.length);

for (const dir of sortedDirs) {
    const base = path.basename(dir);
    const parent = path.dirname(dir);
    if (!isKebab(base)) {
        const newBase = toKebab(base);
        const newPath = path.join(parent, newBase);
        if (base !== newBase && !fs.existsSync(newPath)) {
            fs.renameSync(dir, newPath);
            console.log(`  DIR: ${path.relative(testsDir, dir)} → ${newBase}`);
            dirCount++;
        }
    }
}
console.log(dirCount === 0 ? '  All directories OK!' : `  Renamed: ${dirCount} directories`);

// Phase 2: Rename files (re-scan after dir renames)
console.log('\n=== Phase 2: File Renames ===');
let fileCount = 0;
const freshAll = findAll(testsDir);

for (const f of freshAll.files.sort()) {
    const base = path.basename(f, '.js');
    const dir = path.dirname(f);
    if (!isKebab(base)) {
        const newBase = toKebab(base);
        const newPath = path.join(dir, newBase + '.js');
        if (base !== newBase && !fs.existsSync(newPath)) {
            fs.renameSync(f, newPath);
            console.log(`  FILE: ${path.relative(testsDir, f)} → ${newBase}.js`);
            fileCount++;
        }
    }
}
console.log(fileCount === 0 ? '  All files OK!' : `  Renamed: ${fileCount} files`);

console.log('\n=============================================');
console.log('  DONE');
console.log('=============================================');
console.log(`Total: ${dirCount} dirs renamed, ${fileCount} files renamed`);
console.log(`Total JS files: ${freshAll.files.length}`);
