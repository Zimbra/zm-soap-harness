const fs = require('fs');
const path = require('path');

function walk(d) {
    const r = [];
    try {
        fs.readdirSync(d).forEach(f => {
            const p = path.join(d, f);
            fs.statSync(p).isDirectory() ? r.push(...walk(p)) : r.push(p);
        });
    } catch (e) { }
    return r;
}

const xmlDir = 'data/soapvalidator/Admin/Accounts';
const jsDir = 'mocha/tests/admin/accounts';

const xmlFiles = walk(xmlDir).filter(f => f.endsWith('.xml'));
const jsFiles = walk(jsDir).filter(f => f.endsWith('.js'));

function countXmlTests(file) {
    const content = fs.readFileSync(file, 'utf8');
    const re = /<t:test_case[^>]*type="(smoke|sanity|functional|regression|bhr)"/gi;
    const matches = content.match(re);
    return matches ? matches.length : 0;
}

function countJsTests(file) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/\bit\(/g);
    return matches ? matches.length : 0;
}

console.log('=== XML FILES ===\n');
let totalXml = 0;
xmlFiles.forEach(f => {
    const count = countXmlTests(f);
    totalXml += count;
    console.log(path.relative(xmlDir, f) + ': ' + count);
});

console.log('\n=== JS FILES ===\n');
let totalJs = 0;
jsFiles.forEach(f => {
    const count = countJsTests(f);
    totalJs += count;
    console.log(path.relative(jsDir, f) + ': ' + count);
});

console.log('\n=== SUMMARY ===');
console.log('Total XML test cases: ' + totalXml);
console.log('Total JS test cases: ' + totalJs);
console.log('Difference: ' + (totalXml - totalJs));
