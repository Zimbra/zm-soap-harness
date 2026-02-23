const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // This regex matches multiline template literals holding XML.
    // We capture the indentation of the line where the literal starts.
    const regex = /^(\t*)(.*?)=\s*`([^`]+)`/gm;

    let newContent = content.replace(regex, (match, baseIndent, prefix, inner) => {
        // If it's just a single line, skip
        if (!inner.includes('\n')) return match;

        // Determine if inner content looks like it starts with an XML tag
        if (!inner.trim().startsWith('<')) return match;

        // We want the lines *inside* the template literal to be indented 
        // at baseIndent + 1 tab (for attributes or child tags) relative to the start.
        let requiredIndent = baseIndent + '\t';

        let lines = inner.split('\n');

        for (let i = 1; i < lines.length; i++) {
            // strip all current leading tabs/spaces
            let rawMatch = lines[i].match(/^\s*(.*)$/);
            if (rawMatch) {
                let trimmed = rawMatch[1];
                if (trimmed.length > 0) {
                    // apply the strict required indent
                    lines[i] = requiredIndent + trimmed;
                } else {
                    lines[i] = ''; // keep blank lines blank
                }
            }
        }

        return `${baseIndent}${prefix}= \`${lines.join('\n')}\``;
    });

    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Formatted internal template indents in ${filePath}`);
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
console.log('Finished formatting internal template indents');
