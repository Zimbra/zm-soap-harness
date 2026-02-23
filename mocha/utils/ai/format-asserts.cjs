const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    let lines = content.split('\n');
    let newLines = [];
    let insideAssert = false;
    let assertBuffer = [];
    let assertIndent = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let hasCr = line.endsWith('\r');
        let rawLine = hasCr ? line.slice(0, -1) : line;
        let trimmed = rawLine.trim();

        if (!insideAssert) {
            let match = rawLine.match(/^(\t*)assert\.([a-zA-Z0-9_]+)\(/);
            if (match) {
                if (trimmed.endsWith(');')) {
                    // Single-line assert
                    processAssertChunk([rawLine], newLines, hasCr);
                } else {
                    // Multi-line assert begins
                    insideAssert = true;
                    assertIndent = match[1];
                    assertBuffer.push(rawLine);
                }
            } else {
                newLines.push(line);
            }
        } else {
            // inside assert
            assertBuffer.push(rawLine);
            if (trimmed.endsWith(');')) {
                insideAssert = false;
                processAssertChunk(assertBuffer, newLines, hasCr);
                assertBuffer = [];
            }
        }
    }

    // In case file ends while inside assert (malformed, but handled)
    if (insideAssert && assertBuffer.length > 0) {
        newLines.push(...assertBuffer);
    }

    function processAssertChunk(chunkLines, outLines, hasCr) {
        // combine into single line
        let singleLine = chunkLines[0];
        for (let j = 1; j < chunkLines.length; j++) {
            // remove leading whitespace of subsequent lines
            singleLine += ' ' + chunkLines[j].trim();
        }

        // clean up extra spaces after commas
        singleLine = singleLine.replace(/,\s+/g, ', ');

        // Visual length calculation (tabs as 4 spaces)
        let visualLength = singleLine.replace(/\t/g, '    ').length;

        let indentMatch = singleLine.match(/^(\t*)/);
        let indent = indentMatch ? indentMatch[1] : '';

        if (visualLength <= 90) {
            // Unconditionally collapse to single line
            outLines.push(singleLine + (hasCr ? '\r' : ''));
        } else {
            // Needs to be multiline
            let methodMatch = singleLine.match(/^(\t*)assert\.([a-zA-Z0-9_]+)\((.*)\);$/);
            if (methodMatch) {
                let inner = methodMatch[3];
                // find the last argument if it's a string
                let lastArgMatch = inner.match(/^(.*),\s*('[^']+'|"[^"]+"|`[^`]+`)$/);
                if (lastArgMatch) {
                    let beforeStr = lastArgMatch[1];
                    let strMsg = lastArgMatch[2];

                    outLines.push(`${indent}assert.${methodMatch[2]}(${beforeStr},` + (hasCr ? '\r' : ''));
                    // Note: original user spec was an extra tab indent for the message line
                    outLines.push(`${indent}\t${strMsg});` + (hasCr ? '\r' : ''));
                } else {
                    // Cannot cleanly parse, output chunk original lines
                    outLines.push(...chunkLines.map(l => l + (hasCr ? '\r' : '')));
                }
            } else {
                outLines.push(...chunkLines.map(l => l + (hasCr ? '\r' : '')));
            }
        }
    }

    let newContent = newLines.join('\n');
    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Formatted assertions in ${filePath}`);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        let fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    });
}

walkDir(jsBaseDir);
console.log('Finished formatting assertions length');
