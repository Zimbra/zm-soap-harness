const fs = require('fs');
const path = require('path');

const xmlBase = path.join(__dirname, 'data/soapvalidator/Folders');
const jsBase = path.join(__dirname, 'mocha/tests/folders');

function countOccurrences(content, regex) {
    return (content.match(regex) || []).length;
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

function toKebabCase(str) {
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
        .toLowerCase();
}

const xmlFiles = getAllFiles(xmlBase).filter(f => f.endsWith('.xml'));
const jsFiles = getAllFiles(jsBase).filter(f => f.endsWith('.js'));

// Create a map of JS files for easier lookup
// Key: normalized suffix (kebab-case filename), Value: full path
const jsMap = {};
jsFiles.forEach(f => {
    const rel = path.relative(jsBase, f);
    const parts = rel.split(path.sep);
    const filename = parts.pop();
    const dir = parts.join('/'); // normalize separators

    // various keys to try
    const key1 = rel.toLowerCase().replace(/\\/g, '/'); // exact relative path
    jsMap[key1] = f;

    // just filename match
    const key2 = filename.toLowerCase();
    jsMap[key2] = f;

    // bug specific: bug-123.js -> bug123
    if (filename.startsWith('bug-')) {
        jsMap[filename.replace('bug-', 'bug').replace('.js', '')] = f;
    }
});


fs.writeFileSync('audit_results.txt', 'XML File | XML Count | JS File | JS Count | Status\n');
fs.appendFileSync('audit_results.txt', '--- | --- | --- | --- | ---\n');

let totalXml = 0;
let totalJs = 0;

xmlFiles.forEach(xmlFile => {
    const relXml = path.relative(xmlBase, xmlFile);
    const xmlContent = fs.readFileSync(xmlFile, 'utf8');
    // Count <t:test_case testcaseid="...">
    const xmlCountTotal = countOccurrences(xmlContent, /<t:test_case\s+[^>]*testcaseid=/gi);
    // Count type="always" to exclude
    const alwaysCount = countOccurrences(xmlContent, /type=["']always["']/gi);

    // Count specific setup testcaseids that might be marked as sanity/smoke but are actually setup
    // e.g. Ping, acct1_setup, acct1_login in Folders.xml
    const specificSetupCount = countOccurrences(xmlContent, /testcaseid=["'](Ping|acct1_setup|acct1_login)["'][^>]*type=["'](sanity|smoke|functional)["']/gi);

    const xmlCount = xmlCountTotal - alwaysCount - specificSetupCount;

    // Try to find matching JS file
    let jsFile = null;
    let matchType = '';

    // Strategy 1: exact relative path mapping (with kebab-case conversion)
    const relParts = relXml.replace('.xml', '').split(path.sep);
    const filename = relParts.pop();
    const dir = relParts.join('/').toLowerCase();

    // 1. Direct verify
    // data/soapvalidator/Folders/Folder-Action.xml -> folder-action.js
    let candidate = path.join(jsBase, dir, toKebabCase(filename) + '.js');
    if (fs.existsSync(candidate)) {
        jsFile = candidate;
        matchType = 'Direct kebab';
    }

    // 2. Try removing repeated directory prefix in filename
    // Sharing/Grantee/Sharing-Grantee-Public.xml -> sharing/grantee/public.js
    if (!jsFile) {
        // "Sharing-Grantee-Public" -> "Sharing-Grantee-" prefix?
        // if dir is "sharing/grantee", try removing "sharing-grantee-"
        const prefix = dir.replace(/\//g, '-') + '-'; // "sharing-grantee-"
        const kebabFilename = toKebabCase(filename); // "sharing-grantee-public"
        if (kebabFilename.startsWith(prefix)) {
            const shortName = kebabFilename.substring(prefix.length); // "public"
            candidate = path.join(jsBase, dir, shortName + '.js');
            if (fs.existsSync(candidate)) {
                jsFile = candidate;
                matchType = 'Shortened prefix';
            }
        }
    }

    // 3. Try removing single directory prefix
    // Sharing/Sharing-Rights.xml -> sharing/sharing-rights.js (Usually matches Strategy 1)

    // 4. Bugs
    // Bugs/Bug85404.xml -> bugs/bug-85404.js
    if (!jsFile && dir.includes('bugs')) {
        const bugId = filename.match(/\d+/);
        if (bugId) {
            candidate = path.join(jsBase, dir, `bug-${bugId[0]}.js`);
            if (fs.existsSync(candidate)) {
                jsFile = candidate;
                matchType = 'Bug pattern';
            }
        }
    }

    // 5. Explicit check for VirtualHost
    // VirtualHost/VirtualHost-GetInfoRequest.xml -> virtualhost/virtual-host-get-info-request.js (Strategy 1 should cover if toKebabCase works right)

    // Fallback: search in jsMap by filename
    if (!jsFile) {
        // Try strict filename match
        const exact = toKebabCase(filename) + '.js';
        const found = jsFiles.find(f => path.basename(f) === exact);
        if (found) {
            jsFile = found;
            matchType = 'Filename match';
        }
    }


    let jsCount = 0;
    let status = 'MISSING';
    let jsRel = 'N/A';

    if (jsFile) {
        jsRel = path.relative(jsBase, jsFile).replace(/\\/g, '/');
        const jsContent = fs.readFileSync(jsFile, 'utf8');
        jsCount = countOccurrences(jsContent, /\bit\s*\(/g);

        if (jsCount === xmlCount) {
            status = 'MATCH';
        } else {
            status = 'MISMATCH';
            // Simple check: maybe off by 1?
            if (Math.abs(jsCount - xmlCount) === 0) status = "MATCH"; // Redundant but clear
        }
    }

    const output = `${relXml} | ${xmlCount} | ${jsRel} | ${jsCount} | ${status}\n`;
    fs.appendFileSync('audit_results.txt', output);
    totalXml += xmlCount;
    if (jsFile) totalJs += jsCount;
});

fs.appendFileSync('audit_results.txt', '--- | --- | --- | --- | ---\n');
fs.appendFileSync('audit_results.txt', `**TOTAL** | **${totalXml}** | | **${totalJs}** |\n`);
