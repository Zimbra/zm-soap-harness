const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests/folders');

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

    // Match inline SOAP requests
    const regex = /^(\s*)(?:(const|let)\s+(\w+)\s*=\s*)?await\s+soap\.(makeSOAPEnvelopeAccount|makeSOAPEnvelopeAdmin|makeSOAPEnvelope)\(\s*`([\s\S]*?)`\s*,\s*(.*?)\s*\);/gm;

    let modified = false;
    let usedNames = new Set();

    const newContent = content.replace(regex, (match, indent, decl, varName, envFn, xmlStr, authArg) => {
        // Find the root tag name for the variable
        let rootMatch = xmlStr.match(/<([a-zA-Z0-9_:-]+)/);
        if (!rootMatch) return match; // skip if no xml tag found

        let rootTag = rootMatch[1];
        if (rootTag.includes(':')) rootTag = rootTag.split(':')[1];

        let reqVarName = rootTag.charAt(0).toLowerCase() + rootTag.slice(1);

        // Prevent collision with the assigned variable name
        if (reqVarName === varName) {
            reqVarName += 'Req';
        }

        // Prevent collision with existing vars in file or previously generated
        let baseName = reqVarName;
        let counter = '';
        while (content.match(new RegExp(`(?:const|let|var)\\s+${reqVarName}\\b`)) || usedNames.has(reqVarName)) {
            counter = (counter === '') ? 2 : counter + 1;
            reqVarName = baseName + counter;
        }
        usedNames.add(reqVarName);

        let formattedXml = formatXml(xmlStr);
        let innerIndent = indent + '\t';
        let indentedXml = formattedXml.split('\n').map((l, i) => i === 0 ? l : innerIndent + l).join('\n');

        let output = `${indent}const ${reqVarName} =\n${innerIndent}\`${indentedXml}\`;\n`;

        if (decl && varName) {
            output += `${indent}${decl} ${varName} = await soap.${envFn}(${reqVarName}, ${authArg});\n`;
        } else {
            output += `${indent}await soap.${envFn}(${reqVarName}, ${authArg});\n`;
        }
        modified = true;
        return output;
    });

    if (modified && newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Formatted ${filePath}`);
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
console.log('Finished XML formatting');
