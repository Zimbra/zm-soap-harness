const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

function getAllJsFiles(dir) {
    const results = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            results.push(...getAllJsFiles(full));
        } else if (item.endsWith('.js')) {
            results.push(full);
        }
    }
    return results;
}

function splitXmlLine(line, baseIndent) {
    const trimmed = line.trim();

    // Pattern 1: Multiple sibling elements like <cn><a n="x">y</a><a n="z">w</a></cn>
    // Split: parent open, each child on own line, parent close
    const siblingPattern = /^(<\w+[^>]*>)((<\w+[^>]*(?:\/>|>[^<]*<\/\w+>))+)(<\/\w+>)$/;
    const siblingMatch = trimmed.match(siblingPattern);
    if (siblingMatch) {
        const parentOpen = siblingMatch[1];
        const childrenStr = siblingMatch[2];
        const parentClose = siblingMatch[4];

        // Extract individual child elements
        const childPattern = /<\w+[^>]*(?:\/>|>[^<]*<\/\w+>)/g;
        const children = childrenStr.match(childPattern);

        if (children && children.length > 1) {
            const childIndent = baseIndent + '\t';
            const lines = [baseIndent + parentOpen];
            for (const child of children) {
                lines.push(childIndent + child);
            }
            lines.push(baseIndent + parentClose);
            return lines;
        }
    }

    // Pattern 2: Element with many space-separated attributes like <imap name="x" host="y" port="z" .../>
    // Only split if the full line exceeds 120 chars
    if (line.length > 120) {
        const attrPattern = /^(<(\w+)\s+)((?:\w+="[^"]*"\s*)+)(\/?>)$/;
        const attrMatch = trimmed.match(attrPattern);
        if (attrMatch) {
            const tagStart = '<' + attrMatch[2];
            const attrsStr = attrMatch[3].trim();
            const tagEnd = attrMatch[4];

            const attrs = attrsStr.match(/\w+="[^"]*"/g);
            if (attrs && attrs.length > 2) {
                const attrIndent = baseIndent + '\t';
                const lines = [baseIndent + tagStart + ' ' + attrs[0]];
                for (let i = 1; i < attrs.length; i++) {
                    if (i === attrs.length - 1) {
                        lines.push(attrIndent + attrs[i] + tagEnd);
                    } else {
                        lines.push(attrIndent + attrs[i]);
                    }
                }
                return lines;
            }
        }
    }

    // Pattern 3: Inline nested like <m><e t="t" a="..."/><su>...</su><mp ct="..."><content>...</content></mp></m>
    // Split each top-level child element onto its own line
    const nestedPattern = /^(<(\w+)>)((?:<[^>]+(?:\/>|>[^<]*<\/\w+>))+)(<\/\2>)$/;
    const nestedMatch = trimmed.match(nestedPattern);
    if (nestedMatch) {
        const parentOpen = nestedMatch[1];
        const childrenStr = nestedMatch[3];
        const parentClose = nestedMatch[4];

        // Match child elements (self-closing or with simple content)
        const children = [];
        let remaining = childrenStr;
        while (remaining.length > 0) {
            // Self-closing: <tag .../>
            const selfClose = remaining.match(/^<\w+[^>]*\/>/);
            if (selfClose) {
                children.push(selfClose[0]);
                remaining = remaining.substring(selfClose[0].length);
                continue;
            }
            // Open-close with simple or nested content: <tag ...>...</tag>
            const openClose = remaining.match(/^<(\w+)[^>]*>[\s\S]*?<\/\1>/);
            if (openClose) {
                children.push(openClose[0]);
                remaining = remaining.substring(openClose[0].length);
                continue;
            }
            break;
        }

        if (children.length > 1 && remaining.length === 0) {
            const childIndent = baseIndent + '\t';
            const lines = [baseIndent + parentOpen];
            for (const child of children) {
                lines.push(childIndent + child);
            }
            lines.push(baseIndent + parentClose);
            return lines;
        }
    }

    return null; // No transformation needed
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const rawLines = content.split(/\r?\n/);
    const newLines = [];
    let modified = false;
    let inTemplate = false;

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const trimmed = line.trim();

        // Track if we're inside a template literal (between backticks)
        const backtickCount = (line.match(/`/g) || []).length;
        if (backtickCount % 2 === 1) {
            inTemplate = !inTemplate;
        }

        // Only process lines inside template literals that contain XML
        if (inTemplate && trimmed.startsWith('<') && trimmed.includes('><')) {
            const indent = line.match(/^(\s*)/)[1];
            const result = splitXmlLine(line, indent);
            if (result) {
                newLines.push(...result);
                modified = true;
                continue;
            }
        }

        newLines.push(line);
    }

    if (modified) {
        fs.writeFileSync(filePath, newLines.join(newline), 'utf8');
        console.log('UPDATED: ' + path.relative(TARGET_DIR, filePath));
    }
    return modified;
}

const files = getAllJsFiles(TARGET_DIR);
let updated = 0;
for (const f of files) {
    if (processFile(f)) updated++;
}
console.log(`\nTotal updated: ${updated}`);
