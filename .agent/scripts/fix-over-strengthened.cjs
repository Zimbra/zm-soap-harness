/**
 * Fix remaining over-strengthened assertions from strengthen-assertions.cjs.
 *
 * The script replaced simple response existence checks with overly-specific
 * property checks that don't work for all response types.
 *
 * This fixes:
 * 1. GetFolderResponse.folder → GetFolderResponse
 * 2. GetConvResponse.c → GetConvResponse  
 * 3. SearchConvResponse.c → SearchConvResponse
 * 4. Response element should exist → just response exists
 * 5. GetInfoResponse → simple exists
 *
 * Usage: node .agent/scripts/fix-over-strengthened.cjs [dir]
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '..', '..', 'mocha', 'tests');

function findJsFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findJsFiles(fullPath));
        } else if (entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

const files = findJsFiles(targetDir);
let totalChanges = 0;
const changedFiles = [];

// Patterns to fix: overly-specific response property checks
const patterns = [
    // GetFolderResponse.folder[0] → GetFolderResponse
    {
        find: /assert\.exists\((\w+)\.GetFolderResponse\.folder,\s*'GetFolderResponse should contain folder'\)/g,
        replace: "assert.exists($1.GetFolderResponse, 'GetFolderResponse should exist')"
    },
    // GetConvResponse.c → GetConvResponse
    {
        find: /assert\.exists\((\w+)\.GetConvResponse\.c,\s*'Conversation should exist'\)/g,
        replace: "assert.exists($1.GetConvResponse, 'GetConvResponse should exist')"
    },
    // SearchConvResponse.c → SearchConvResponse
    {
        find: /assert\.exists\((\w+)\.SearchConvResponse\.c,\s*'Conversation should exist'\)/g,
        replace: "assert.exists($1.SearchConvResponse, 'SearchConvResponse should exist')"
    },
    // Conversation should exist in account* patterns
    {
        find: /assert\.exists\((\w+)\.SearchConvResponse\.c,\s*'Conversation should exist in (\w+)'\)/g,
        replace: "assert.exists($1.SearchConvResponse, 'SearchConvResponse should exist in $2')"
    },
    // Response element should exist
    {
        find: /assert\.exists\((\w+)\.SearchResponse\.m,\s*'Response element should exist'\)/g,
        replace: "assert.exists($1.SearchResponse, 'SearchResponse should exist')"
    },
    // Response element should exist for messageN
    {
        find: /assert\.exists\((\w+)\.SearchResponse\.m,\s*'Response element should exist for (\w+)'\)/g,
        replace: "assert.exists($1.SearchResponse, 'SearchResponse should exist for $2')"
    },
    // GetInfoResponse
    {
        find: /assert\.exists\((\w+)\.GetInfoResponse\.name,\s*'GetInfoResponse should contain name'\)/g,
        replace: "assert.exists($1.GetInfoResponse, 'GetInfoResponse should exist')"
    },
    // GetMsgResponse.m patterns that are too deep
    {
        find: /assert\.exists\((\w+)\.GetMsgResponse\.m,\s*'GetMsgResponse should contain m'\)/g,
        replace: "assert.exists($1.GetMsgResponse, 'GetMsgResponse should exist')"
    }
];

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fileChanges = 0;

    for (const p of patterns) {
        const matches = content.match(p.find);
        if (matches) {
            content = content.replace(p.find, p.replace);
            fileChanges += matches.length;
        }
    }

    if (fileChanges > 0) {
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles.push({ file: path.relative(targetDir, filePath), changes: fileChanges });
        totalChanges += fileChanges;
    }
}

console.log('\nScanned ' + files.length + ' files in ' + path.relative(process.cwd(), targetDir));
console.log('Total changes: ' + totalChanges + ' across ' + changedFiles.length + ' files\n');
changedFiles.forEach(function (f) { console.log('  ' + f.changes + ' changes in ' + f.file); });
