const fs = require('fs');
const path = require('path');

function walkDir(dir, ext) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath, ext));
        } else if (file.endsWith(ext)) {
            results.push(fullPath);
        }
    });
    return results;
}

const xmlFiles = walkDir('../data/soapvalidator/Folders', '.xml');
const jsFiles = walkDir('tests/folders', '.js');

const xmlBases = xmlFiles.map(f => {
    let rel = path.relative('../data/soapvalidator/Folders', f);
    let expectedJs = rel.toLowerCase().replace(/\.xml$/, '.js').split('\\\\').join('/');
    return { original: f, rel: rel, expectedJs: expectedJs };
});

const jsBases = jsFiles.map(f => {
    let rel = path.relative('tests/folders', f).split('\\\\').join('/');
    return { original: f, rel: rel };
});

let renames = 0;

xmlBases.forEach(x => {
    if (x.rel.toLowerCase().includes('setup')) return;

    const exactMatch = jsBases.find(j => j.rel === x.expectedJs);
    if (!exactMatch) {
        let possibleMatch = null;
        const oldBugMap = x.rel.toLowerCase().split('\\\\').join('/').replace(/bugs\/bug(\d+)\.xml/, 'bugs/bug-$1.js');
        const j1 = jsBases.find(j => j.rel === oldBugMap);
        if (j1) {
            possibleMatch = j1.rel;
        } else {
            const baseName = path.basename(x.expectedJs, '.js');
            const fuzzy = jsBases.find(j => j.rel.includes(baseName) || baseName.includes(path.basename(j.rel, '.js')));
            if (fuzzy) possibleMatch = fuzzy.rel;
        }

        if (possibleMatch) {
            console.log(`Renaming: ${possibleMatch} -> ${x.expectedJs}`);
            const oldPath = path.join('tests/folders', possibleMatch);
            const newPath = path.join('tests/folders', x.expectedJs);

            // Ensure directory exists
            const newDir = path.dirname(newPath);
            if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });

            fs.renameSync(oldPath, newPath);
            renames++;
        }
    }
});

console.log(`\nCompleted ${renames} renames.`);
