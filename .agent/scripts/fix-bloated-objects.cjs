/**
 * Fix bloated object declarations in test files.
 * 
 * Replaces patterns like:
 *   const foo = { name: `foo_${common.getUniqueString()}`, subject: `foo_${common.getUniqueString()}`, 
 *     from: accountEmail, content: `foo_${common.getUniqueString()}`, value: `foo_${common.getUniqueString()}`,
 *     address: accountEmail, domainname: config.testDomain, id: `foo_id`, toString() { return this.name; } };
 * 
 * With the actually-used properties only, determined by scanning the rest of the file.
 */
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

// The bloated pattern: const VAR = { name: `VAR_${common.getUniqueString()}`, ... toString() { return this.name; } };
const BLOATED_PATTERN = /^(\t*)const\s+(\w+)\s*=\s*\{.*getUniqueString\(\).*toString\(\)\s*\{.*\}\s*\};?\s*$/;

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    let modified = false;

    // First pass: find all bloated declarations and their variable names
    const bloatedVars = new Map(); // varName -> lineIndex
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(BLOATED_PATTERN);
        if (match) {
            bloatedVars.set(match[2], { lineIndex: i, indent: match[1] });
        }
    }

    if (bloatedVars.size === 0) return false;

    // Second pass: find which properties of each variable are actually used in the file
    const usedProps = new Map(); // varName -> Set of property names

    for (const [varName] of bloatedVars) {
        usedProps.set(varName, new Set());
    }

    // Known properties from the bloated template
    const TEMPLATE_PROPS = ['name', 'subject', 'from', 'content', 'value', 'address', 'domainname', 'id'];

    for (let i = 0; i < lines.length; i++) {
        for (const [varName, info] of bloatedVars) {
            if (i === info.lineIndex) continue; // Skip the declaration line itself

            // Check for varName.property usage
            for (const prop of TEMPLATE_PROPS) {
                const regex = new RegExp(`\\b${varName}\\.${prop}\\b`);
                if (regex.test(lines[i])) {
                    usedProps.get(varName).add(prop);
                }
            }

            // Check if variable itself is used directly (e.g., ${varName} without property)
            const directUseRegex = new RegExp(`\\$\\{${varName}\\}`);
            if (directUseRegex.test(lines[i])) {
                usedProps.get(varName).add('__direct__');
            }
        }
    }

    // Third pass: replace bloated declarations with clean ones
    const newLines = [];
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(BLOATED_PATTERN);
        if (match) {
            const indent = match[1];
            const varName = match[2];
            const props = usedProps.get(varName) || new Set();

            // Build the new declaration with only used properties
            const propEntries = [];

            for (const prop of TEMPLATE_PROPS) {
                if (props.has(prop)) {
                    switch (prop) {
                        case 'name':
                        case 'subject':
                        case 'content':
                        case 'value':
                            propEntries.push(`${prop}: \`${varName}_\${common.getUniqueString()}\``);
                            break;
                        case 'from':
                        case 'address':
                            propEntries.push(`${prop}: accountEmail`);
                            break;
                        case 'domainname':
                            propEntries.push(`${prop}: config.testDomain`);
                            break;
                        case 'id':
                            propEntries.push(`${prop}: \`${varName}_id\``);
                            break;
                    }
                }
            }

            let newLine;
            if (propEntries.length === 0) {
                if (props.has('__direct__')) {
                    newLine = `${indent}const ${varName} = \`${varName}_\${common.getUniqueString()}\`;`;
                } else {
                    newLine = `${indent}const ${varName} = {};`;
                }
            } else {
                const propsStr = propEntries.join(', ');
                newLine = `${indent}const ${varName} = { ${propsStr} };`;

                // If line is still too long, break it up
                if (newLine.length > 120) {
                    const parts = [
                        `${indent}const ${varName} = {`,
                        ...propEntries.map(p => `${indent}\t${p},`),
                        `${indent}};`
                    ];
                    newLines.push(...parts);
                    modified = true;
                    continue;
                }
            }

            newLines.push(newLine);
            modified = true;
        } else {
            newLines.push(lines[i]);
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, newLines.join(newline), 'utf8');
        console.log('FIXED: ' + path.relative(TARGET_DIR, filePath));

        for (const [varName, props] of usedProps) {
            const usedList = [...props].filter(p => p !== '__direct__');
            if (usedList.length > 0) {
                console.log(`  ${varName}: ${usedList.join(', ')}`);
            } else if (props.has('__direct__')) {
                console.log(`  ${varName}: used directly as string`);
            } else {
                console.log(`  ${varName}: no props used`);
            }
        }
    }
    return modified;
}

const files = getAllJsFiles(TARGET_DIR);
let updated = 0;
for (const f of files) {
    if (processFile(f)) updated++;
}
console.log(`\nTotal updated: ${updated} of ${files.length}`);
