const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    const regex = /`([^`]*<[a-zA-Z]+[^`]*?)`/gm;
    let newContent = content.replace(regex, (match, xmlContent) => {
        if (!xmlContent.includes('<') || !xmlContent.includes('>')) return match;
        // only format if it looks like XML
        if (!xmlContent.trim().startsWith('<')) return match;

        // Find every XML tag and collapse any newlines/multiple spaces inside it to a single space.
        let collapsedXml = xmlContent.replace(/<([^>]+)>/g, (tagMatch, inner) => {
            // Only replace newlines and their surrounding whitespace with a single space to keep attributes on one line.
            // This prevents replacing intentional multiple spaces or trailing spaces inside attribute strings.
            let collapsed = inner.replace(/\s*[\r\n]+\s*/g, ' ').trim();
            // preserve the opening and closing angle brackets
            return `<${collapsed}>`;
        });

        return `\`${collapsedXml}\``;
    });

    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Formatted XML attributes to single lines in ${filePath}`);
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
console.log('Finished collapsing XML attributes into single lines');
