/**
 * Fixes doc updates to reuse the original doc name instead of generating a new unique name.
 * When SaveDocumentRequest has ver= and id= attrs (doc update), the name should match
 * the original document, not use a new unique string.
 */
const fs = require('fs');

const files = [
    'tests/briefcase/purge-revision-request.js',
    'tests/briefcase/diff-document-request.js',
    'tests/briefcase/waitset/briefcase-waitset.js'
];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    let c = fs.readFileSync(f, 'utf8');
    const orig = c;

    // For each test (it block), find the initial doc save and capture the pattern,
    // then replace updates to use ${docName} instead of new unique string
    const lines = c.split('\n');
    const result = [];
    let insideIt = false;
    let docNameDeclared = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track it() blocks
        if (line.match(/^\tit\(/)) {
            insideIt = true;
            docNameDeclared = false;
        }

        // Initial doc save (no ver= attr)
        if (line.includes('name="doc.${common.getUniqueString()}.txt"') && !line.includes('ver=')) {
            if (!docNameDeclared) {
                // Insert docName declaration before the soap call
                let insertAt = result.length;
                for (let j = result.length - 1; j >= Math.max(0, result.length - 5); j--) {
                    if (result[j].match(/await soap\.make|const save|const saveRes/)) {
                        insertAt = j;
                        break;
                    }
                }
                const indent = line.match(/^(\t+)/);
                const tabs = indent ? indent[1].replace(/\t$/, '') : '\t\t';
                result.splice(insertAt, 0, tabs + "const docName = 'doc.' + common.getUniqueString() + '.txt';");
                docNameDeclared = true;
            }
            result.push(line.replace('name="doc.${common.getUniqueString()}.txt"', 'name="${docName}"'));
            continue;
        }

        // Doc update (has ver= attr)
        if (line.includes('name="doc.${common.getUniqueString()}.txt"') && line.includes('ver=')) {
            result.push(line.replace('name="doc.${common.getUniqueString()}.txt"', 'name="${docName}"'));
            continue;
        }

        result.push(line);
    }

    const out = result.join('\n');
    if (out !== orig) {
        fs.writeFileSync(f, out);
        console.log('Fixed doc name reuse in ' + f);
    }
});
