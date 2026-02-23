const fs = require('fs');
const path = require('path');

const jsBaseDir = path.resolve('tests');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // We want to match:
    // const reqName = 
    //
    //      `<Tag ...
    // and replace it with:
    // const reqName =
    //      `<Tag ...

    // Regex explanation:
    // (const|let)\s+(\w+)\s*= : Math the variable declaration
    // \s*\n\s*\n\s*` : Match whitespace containing at least two newlines, up to the backtick
    // (<[\w:-]+) : Match the opening tag
    const regex = /(const|let)\s+(\w+)\s*=\s*\n\s*\n\s*`(<[a-zA-Z0-9_:-]+)/g;

    const newContent = content.replace(regex, (match, param1, param2, param3) => {
        // Find the backtick indent by looking at the original match
        const parts = match.split('`');
        const beforeBacktick = parts[0];
        // beforeBacktick is something like "const name =\n\n        "
        // we just want to replace the \n\n with \n
        const fixedBefore = beforeBacktick.replace(/\n\s*\n/, '\n');

        // Alternatively, just construct it if we know the indentation format:
        // We know the tag indent is just the trailing spaces of the match before the backtick
        const spaceMatch = beforeBacktick.match(/\n([ \t]*)$/);
        const indentStr = spaceMatch ? spaceMatch[1] : '        ';

        let output = `${param1} ${param2} =\n${indentStr}\`${param3}`;
        if (output !== match) {
            modified = true;
        }
        return output;
    });

    if (modified && newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Removed blank lines in ${filePath}`);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
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
console.log('Finished removing blank lines');
