/**
 * Breaks long ternary lines (>120 chars) into multi-line format.
 * Targets lines like:
 *   const folder = Array.isArray(x.y) ? x.y[0] : x.y;
 * And converts to:
 *   const folder = Array.isArray(x.y)
 *       ? x.y[0] : x.y;
 */
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'tests/briefcase';
const jsBaseDir = path.resolve(targetDir);

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let changed = false;
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.length > 120) {
            // Pattern 1: Ternary with Array.isArray
            const ternaryMatch = line.match(/^(\t+)((?:const|let|var)\s+\w+\s*=\s*)(Array\.isArray\([^)]+\))\s*(\?)\s*(.+?)\s*:\s*(.+)$/);
            if (ternaryMatch) {
                const indent = ternaryMatch[1];
                const assignment = ternaryMatch[2];
                const condition = ternaryMatch[3];
                let trueVal = ternaryMatch[5];
                let falseVal = ternaryMatch[6];

                newLines.push(indent + assignment + condition);
                newLines.push(indent + '\t? ' + trueVal);
                newLines.push(indent + '\t: ' + falseVal);
                changed = true;
                continue;
            }

            // Pattern 2: Assignment ternary without const (e.g. account1Token = ...)
            const assignTernary = line.match(/^(\t+)(\w[\w.]*\s*=\s*)(Array\.isArray\([^)]+\))\s*(\?)\s*(.+?)\s*:\s*(.+)$/);
            if (assignTernary) {
                const indent = assignTernary[1];
                const assignment = assignTernary[2];
                const condition = assignTernary[3];
                let trueVal = assignTernary[5];
                let falseVal = assignTernary[6];

                newLines.push(indent + assignment + condition);
                newLines.push(indent + '\t? ' + trueVal);
                newLines.push(indent + '\t: ' + falseVal);
                changed = true;
                continue;
            }

            // Pattern 3: Single-line SOAP that wasn't caught before (e.g. GetCosRequest)
            const soapMatch = line.match(/^(\t+)((?:const\s+\w+\s*=\s*)?await\s+soap\.makeSOAPEnvelope\w+\()([`'][^`']+[`'])(\s*,\s*)(\w+)\);?\s*$/);
            if (soapMatch) {
                const indent = soapMatch[1];
                const funcCall = soapMatch[2];
                const xmlStr = soapMatch[3];
                const lastArg = soapMatch[5];

                newLines.push(indent + funcCall);
                newLines.push(indent + '\t' + xmlStr + ', ' + lastArg);
                newLines.push(indent + ');');
                changed = true;
                continue;
            }
        }

        newLines.push(line);
    }

    if (changed) {
        fs.writeFileSync(filePath, newLines.join('\n'));
        console.log('Fixed ternary/long lines in ' + path.relative(jsBaseDir, filePath));
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    });
}

walkDir(jsBaseDir);
console.log('Done fixing ternary/long lines');
