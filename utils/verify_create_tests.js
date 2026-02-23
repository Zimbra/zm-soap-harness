import fs from 'fs';
import path from 'path';

const xmlDir = 'c:/git/zm-soap-harness/data/soapvalidator/Admin/Accounts';
const jsDir = 'c:/git/zm-soap-harness/mocha/tests/admin/accounts';

const xmlFiles = [
    'Account-Create.xml',
    'Account-Create02.xml',
    'Account-Create03.xml',
    'Account-Create04.xml',
    'Account-Create05.xml',
    'Account-Create06.xml',
    'Account-Create07.xml'
];

const jsFilesPrefix = 'create-account';

const countOccurrences = (content, regex) => {
    const matches = content.match(regex);
    return matches ? matches.length : 0;
};

let totalXmlTests = 0;
let totalJsTests = 0;

console.log('--- XML Files ---');
for (const file of xmlFiles) {
    const filePath = path.join(xmlDir, file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Count `<t:test ` and `<t:test>` but ignore setup/always tests if possible
        const totalCases = countOccurrences(content, /<t:test(>|\s+.*?>)/g);

        // Count specific test cases
        const functional = countOccurrences(content, /type="functional"/gi);
        const regression = countOccurrences(content, /type="regression"/gi);
        const sanity = countOccurrences(content, /type="sanity"/gi);

        console.log(`${file}: ${totalCases} <t:test> blocks (Functional/Regression/Sanity cases: ${functional + regression + sanity})`);
        totalXmlTests += totalCases;
    } else {
        console.log(`${file}: NOT FOUND`);
    }
}

console.log('\n--- JS Files ---');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.startsWith(jsFilesPrefix) && f.endsWith('.js'));
for (const file of jsFiles) {
    const filePath = path.join(jsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const totalIts = countOccurrences(content, /\sit\(/g);
    // including variants with .only or .skip if any, but let's assume `it(`
    console.log(`${file}: ${totalIts} 'it(' blocks`);
    totalJsTests += totalIts;
}

console.log('\n--- Summary ---');
console.log(`Total <t:test> blocks across 7 XML files: ${totalXmlTests}`);
console.log(`Total 'it(' blocks across ${jsFiles.length} JS files: ${totalJsTests}`);
