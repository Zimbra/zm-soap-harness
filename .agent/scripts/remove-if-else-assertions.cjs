/**
 * Script to remove if/else assertion guards and if/break retry loops.
 *
 * Usage: node .agent/scripts/remove-if-else-assertions.cjs [dir]
 *   dir defaults to mocha/tests
 *
 * Pattern 1: Remove retry loops with if/break
 *   for (let retry = 0; retry < N; retry++) {
 *     await new Promise(resolve => setTimeout(resolve, XXXX));
 *     VARNAME = await soap.makeSOAPEnvelopeAccount(...);
 *     if (VARNAME.SearchResponse && VARNAME.SearchResponse.m) break;
 *   }
 *   →
 *   await new Promise(resolve => setTimeout(resolve, 5000));
 *   VARNAME = await soap.makeSOAPEnvelopeAccount(...);
 *
 * Pattern 2: Remove if(response.m) { assertions } blocks by keeping just the assertions
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

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fileChanges = 0;

    // Pattern 1: Remove retry for-loop with if/break for SearchResponse.m
    // Matches the full for loop block and replaces with just a wait + the SOAP call
    const retryLoopPattern = /(\t+)(let\s+\w+;\s*\n)?\s*for\s*\(\s*let\s+retry\s*=\s*0;\s*retry\s*<\s*\d+;\s*retry\+\+\)\s*\{[^}]*?await\s+new\s+Promise\s*\(\s*resolve\s*=>\s*setTimeout\s*\(\s*resolve\s*,\s*\d+\s*\)\s*\)\s*;([^}]*?((?:const|let)\s+)?(\w+)\s*=\s*await\s+soap\.makeSOAPEnvelope\w+\s*\([^)]*\)[^;]*;)\s*\n\s*if\s*\(\s*\5\.(?:SearchResponse|SearchConvResponse)\s*&&\s*\5\.(?:SearchResponse|SearchConvResponse)\.(?:m|c)\s*\)\s*break\s*;\s*\n\s*(?:await\s+new\s+Promise[^;]*;\s*\n\s*)?\}/g;

    const newContent = content.replace(retryLoopPattern, (match, indent, letDecl, soapCall, constLet, varName) => {
        fileChanges++;
        const declaration = constLet ? '' : `${indent}let ${varName};\n`;
        return `${declaration}${indent}await new Promise(resolve => setTimeout(resolve, 5000));\n${indent}${soapCall.trim()}`;
    });

    if (newContent !== content) {
        content = newContent;
    }

    // Pattern 2: Simple if/break inside for-retry (just the if line)
    // if (VARNAME.SearchResponse && VARNAME.SearchResponse.m) break;
    const ifBreakPattern = /\n\s*if\s*\(\s*(\w+)\.SearchResponse\s*&&\s*\1\.SearchResponse\.(?:m|c)\s*\)\s*break\s*;\s*\n/g;
    const withoutIfBreak = content.replace(ifBreakPattern, (match) => {
        fileChanges++;
        return '\n';
    });
    if (withoutIfBreak !== content) {
        content = withoutIfBreak;
    }

    // Pattern 3: Remove for-retry wrapper, keep inner content
    // This handles cases where the if/break was already removed but the for loop remains
    const emptyRetryLoop = /(\t+)for\s*\(\s*let\s+retry\s*=\s*0;\s*retry\s*<\s*\d+;\s*retry\+\+\)\s*\{\s*\n((?:\s*await\s+new\s+Promise[^;]*;\s*\n)?(?:\s*(?:const|let)?\s*\w+\s*=\s*await\s+soap\.makeSOAPEnvelope\w+\s*\([^)]*\)[^;]*;\s*\n)*)\s*\}/g;
    const withoutEmptyLoop = content.replace(emptyRetryLoop, (match, indent, body) => {
        fileChanges++;
        // Add a 5-second wait before the body if no wait exists
        const hasWait = body.includes('setTimeout');
        const prefix = hasWait ? '' : `${indent}await new Promise(resolve => setTimeout(resolve, 5000));\n`;
        // Increase wait time from any value to 5000
        const fixedBody = body.replace(/setTimeout\s*\(\s*resolve\s*,\s*\d+\s*\)/g, 'setTimeout(resolve, 5000)');
        return `${prefix}${fixedBody.trimEnd()}`;
    });
    if (withoutEmptyLoop !== content) {
        content = withoutEmptyLoop;
    }

    if (fileChanges > 0) {
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles.push({ file: path.relative(targetDir, filePath), changes: fileChanges });
        totalChanges += fileChanges;
    }
}

console.log(`\nScanned ${files.length} files in ${path.relative(process.cwd(), targetDir)}`);
console.log(`Total changes: ${totalChanges} across ${changedFiles.length} files\n`);
changedFiles.forEach(f => console.log(`  ${f.changes} changes in ${f.file}`));
