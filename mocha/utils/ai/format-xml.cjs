const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests/folders');

function formatXml(xml) {
    let formatted = '';
    const reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\n$2$3');
    let pad = 0;
    xml.split('\n').forEach(function (node, index) {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad != 0) {
                pad -= 1;
            }
        } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }

        formatted += '    '.repeat(pad) + node + '\n';
        pad += indent;
    });

    return formatted.trim();
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Find inline template literals inside makeSOAPEnvelope*
    // Let's match: makeSOAPEnvelopeAccount(`<...>`, ...)
    // Or: await soap.makeSOAPEnvelopeAccount(`<...>`, ...)

    // We want to extract the XML string and replace it with a variable.
    // Or just make it a multiline template string.

    const regex = /([ \t]*)(?:const|let)?\s*(\w+)?\s*=?\s*await\s+soap\.makeSOAPEnvelope(Account|Admin)\(\s*`(<([a-zA-Z0-9_]+)[\s\S]*?)`\s*,/g;

    content = content.replace(regex, (match, indent, varName, envType, xmlString, rootTag) => {
        // if the xmlString has newlines already, maybe skip or format?
        // Wait, if it has newlines, formatXml might still process it. Let's clean it up first.
        let cleanXml = xmlString.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');
        // some spaces inside tags might be collapsed, that's fine if they are between attributes.
        // Wait, replacing \n with space is fine for inline ones, but what if there's actual text content?
        let multilineXml = formatXml(cleanXml);

        // Add one more level of indent relative to the base indent
        let innerIndent = indent + '    ';
        multilineXml = multilineXml.split('\n').map((line, i) => i === 0 ? line : innerIndent + line).join('\n');

        let reqVarName = rootTag.charAt(0).toLowerCase() + rootTag.slice(1);
        if (reqVarName === varName) {
            reqVarName = reqVarName + 'Req';
        }

        let output = `${indent}const ${reqVarName} =\n${innerIndent}\`${multilineXml}\`;\n`;

        if (varName) {
            output += `${indent}const ${varName} = await soap.makeSOAPEnvelope${envType}(${reqVarName},`;
        } else {
            output += `${indent}await soap.makeSOAPEnvelope${envType}(${reqVarName},`;
        }
        modified = true;
        return output;
    });

    if (modified) {
        fs.writeFileSync(filePath, content);
    }
}

function walkDir(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            walkDir(file);
        } else if (file.endsWith('.js')) {
            processFile(file);
        }
    });
}

walkDir(jsBaseDir);
console.log('Formatted XML strings in all Folders tests');
