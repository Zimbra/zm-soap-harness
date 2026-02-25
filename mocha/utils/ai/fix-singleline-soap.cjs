/**
 * Converts single-line SOAP XML template literals into multi-line format.
 * Targets lines like:
 *   await soap.makeSOAPEnvelopeAccount(`<Req xmlns="..."><child .../></Req>`, token);
 * And converts to:
 *   await soap.makeSOAPEnvelopeAccount(
 *       `<Req xmlns="...">
 *           <child .../>
 *       </Req>`, token
 *   );
 */
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'tests/briefcase';
const jsBaseDir = path.resolve(targetDir);

function getIndent(line) {
    const match = line.match(/^(\t*)/);
    return match ? match[1] : '';
}

function formatXmlContent(xmlStr, baseIndent) {
    // Parse XML tags and format them multi-line
    // baseIndent is the indent for the backtick line (e.g. \t\t\t)
    const innerIndent = baseIndent + '\t';

    // Split XML into tokens (tags and text)
    const tokens = [];
    let remaining = xmlStr.trim();

    while (remaining.length > 0) {
        if (remaining.startsWith('<')) {
            const endIdx = remaining.indexOf('>');
            if (endIdx === -1) break;
            tokens.push(remaining.substring(0, endIdx + 1));
            remaining = remaining.substring(endIdx + 1).trim();
        } else {
            const nextTag = remaining.indexOf('<');
            if (nextTag === -1) {
                tokens.push(remaining.trim());
                break;
            }
            tokens.push(remaining.substring(0, nextTag).trim());
            remaining = remaining.substring(nextTag).trim();
        }
    }

    if (tokens.length === 0) return xmlStr;

    // Build multi-line XML
    // First token is the opening root tag
    let result = tokens[0] + '\n';
    let depth = 1;

    for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.startsWith('</')) {
            // Closing tag
            depth--;
            if (depth === 0) {
                // Root closing tag
                result += baseIndent + token;
            } else {
                result += innerIndent + '\t'.repeat(Math.max(0, depth - 1)) + token + '\n';
            }
        } else if (token.startsWith('<') && token.endsWith('/>')) {
            // Self-closing tag
            result += innerIndent + '\t'.repeat(Math.max(0, depth - 1)) + token + '\n';
        } else if (token.startsWith('<')) {
            // Opening tag
            result += innerIndent + '\t'.repeat(Math.max(0, depth - 1)) + token + '\n';
            if (!token.endsWith('/>')) {
                depth++;
            }
        } else {
            // Text content - attach to previous line
            result = result.trimEnd() + token + '\n';
        }
    }

    return result;
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let changed = false;
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match single-line SOAP calls: something(`<XML>...</XML>`, token);
        // or something(`<XML>...</XML>`, token)
        const soapMatch = line.match(
            /^(\t*)((?:const\s+\w+\s*=\s*)?await\s+soap\.makeSOAPEnvelope\w+\()(`<[^`]+>`)(\s*,\s*)([^)]+)\);?\s*$/
        );

        if (soapMatch && line.length > 120) {
            const indent = soapMatch[1];
            const funcCall = soapMatch[2];
            const xmlLiteral = soapMatch[3];
            const comma = ',';
            const lastArg = soapMatch[5].trim();
            const xmlContent = xmlLiteral.slice(1, -1); // Remove backticks

            // Check if XML has child elements (more than just a single self-closing tag)
            const hasChildren = (xmlContent.match(/</g) || []).length > 1;

            if (hasChildren) {
                const xmlIndent = indent + '\t';
                const formatted = formatXmlContent(xmlContent, xmlIndent);

                newLines.push(indent + funcCall);
                newLines.push(xmlIndent + '`' + formatted + '`' + comma + ' ' + lastArg);
                newLines.push(indent + ');');
                changed = true;
                continue;
            }
        }

        // Match single-line ternaries that are too long
        // account1Token = Array.isArray(...) ? ... : ...;
        const ternaryMatch = line.match(
            /^(\t*)([\w.]+\s*=\s*)(Array\.isArray\([^)]+\))\s*\?\s*(.+?)\s*:\s*(.+?);?\s*$/
        );

        if (ternaryMatch && line.length > 120) {
            const indent = ternaryMatch[1];
            const assignment = ternaryMatch[2];
            const condition = ternaryMatch[3];
            const trueVal = ternaryMatch[4];
            let falseVal = ternaryMatch[5];
            const hasSemicolon = line.trimEnd().endsWith(';');
            if (falseVal.endsWith(';')) falseVal = falseVal.slice(0, -1);

            newLines.push(indent + assignment + condition);
            newLines.push(indent + '\t? ' + trueVal);
            newLines.push(indent + '\t: ' + falseVal + (hasSemicolon ? ';' : ''));
            changed = true;
            continue;
        }

        newLines.push(line);
    }

    if (changed) {
        fs.writeFileSync(filePath, newLines.join('\n'));
        console.log('Fixed long lines in ' + path.relative(jsBaseDir, filePath));
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
console.log('Done fixing single-line SOAP XML');
