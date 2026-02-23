const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function formatXml(xml) {
    let formatted = '';
    // ensure spaces between > and < are removed if they are just whitespace
    xml = xml.replace(/>\s+</g, '><');
    const reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\n$2$3');
    let pad = 0;

    const lines = xml.split('\n');
    lines.forEach(function (node) {
        node = node.trim();
        if (!node) return;

        let indent = 0;
        if (node.match(/^<\/\w/)) { // closing tag
            if (pad !== 0) {
                pad -= 1;
            }
        } else if (node.match(/^<\w[^>]*[^\/]>$/) && !node.match(/<\/.+>$/)) { // opening tag
            indent = 1;
        } else { // self-closing or inline text
            indent = 0;
        }

        formatted += '\t'.repeat(pad) + node + '\n';
        pad += indent;
    });

    return formatted.trim();
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Regex updated to catch assignments where the backtick is on the same line OR next line
    const regex = /^([ \t]*)(const|let|var|)\s*([\w.]+)?\s*=\s*\r?\n?[ \t]*`([^`]*<[a-zA-Z]+[^`]*?)`;/gm;

    let newContent = content.replace(regex, (match, indent, kw, varName, xmlContent) => {
        if (!xmlContent.includes('<') || !xmlContent.includes('>')) return match;

        // Remove trailing or leading spaces that mess it up
        let cleanedXml = xmlContent.trim();
        if (!cleanedXml.startsWith('<')) return match;

        // If it's already properly formatted multiline xml with tabs, it might still format fine, 
        // but let's run it through our formatXml rules to ensure strict consistency.
        let formattedXml = formatXml(cleanedXml);

        let innerIndent = indent + '\t';
        let indentedXml = formattedXml.split('\n').map((l, i) => i === 0 ? l : innerIndent + l).join('\n');

        let assignmentPrefix = kw && varName ? `${kw} ${varName}` : (varName ? `${varName}` : '');
        return `${indent}${assignmentPrefix} =\n${innerIndent}\`${indentedXml}\`;`;
    });

    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Formatted inline XML in ${filePath}`);
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
console.log('Finished formatting inline XML variables');
