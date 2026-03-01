const fs = require('fs');
const path = require('path');

function walk(d) {
    const r = [];
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) r.push(...walk(f));
        else r.push(f);
    }
    return r;
}

const validTypes = ['smoke', 'sanity', 'functional', 'regression', 'bhr'];

function getXmlTests(xmlSubDir) {
    const xmlDir = path.join('data/soapvalidator/MailClient', xmlSubDir);
    if (!fs.existsSync(xmlDir)) return [];
    const xmlFiles = walk(xmlDir).filter(f => f.endsWith('.xml'));
    const tests = [];
    for (const f of xmlFiles) {
        const content = fs.readFileSync(f, 'utf8');
        const rel = path.relative('data/soapvalidator/MailClient', f);
        const parts = content.split(/<t:test_case\s+/);
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const typeMatch = part.match(/type\s*=\s*"([^"]+)"/);
            const idMatch = part.match(/testcaseid\s*=\s*"([^"]+)"/i);
            const objMatch = part.match(/<t:objective>([\s\S]*?)<\/t:objective>/);
            const type = typeMatch ? typeMatch[1].toLowerCase() : '';
            const tcId = idMatch ? idMatch[1] : '';
            const obj = objMatch ? objMatch[1].replace(/\s+/g, ' ').trim() : '';
            // Exclusions
            if (type === 'always' || type === 'deprecated') continue;
            if (tcId.toLowerCase() === 'ping' || tcId.toLowerCase().includes('setup')) continue;
            const migratable = validTypes.includes(type);
            tests.push({ file: rel, tcId, type, obj, migratable });
        }
    }
    return tests;
}

function getJsTests(jsSubDir) {
    const jsDir = path.join('mocha/tests/mail-client', jsSubDir);
    if (!fs.existsSync(jsDir)) return [];
    const jsFiles = walk(jsDir).filter(f => f.endsWith('.js'));
    const tests = [];
    for (const f of jsFiles) {
        const content = fs.readFileSync(f, 'utf8');
        const rel = path.relative('mocha/tests/mail-client', f);
        const matches = content.matchAll(/\bit\s*\(\s*'([^']+)'/g);
        for (const m of matches) {
            tests.push({ file: rel, desc: m[1] });
        }
    }
    return tests;
}

// Analyze DataSource
console.log('========= DATA-SOURCE ANALYSIS =========');
const dsXml = getXmlTests('DataSource');
const dsJs = getJsTests('data-source');
console.log('XML migratable: ' + dsXml.filter(t => t.migratable).length);
console.log('XML excluded (non-migratable types): ' + dsXml.filter(t => !t.migratable).length);
console.log('JS it() blocks: ' + dsJs.length);
console.log('\nXML migratable tests:');
for (const t of dsXml.filter(t => t.migratable)) {
    console.log('  [' + t.type + '] ' + t.tcId + ' | ' + t.obj.substring(0, 60));
}
console.log('\nXML non-migratable (should NOT be JS tests):');
for (const t of dsXml.filter(t => !t.migratable)) {
    console.log('  [' + t.type + '] ' + t.tcId + ' | ' + t.obj.substring(0, 60));
}
console.log('\nJS tests per file:');
const dsJsFiles = {};
for (const t of dsJs) {
    if (!dsJsFiles[t.file]) dsJsFiles[t.file] = [];
    dsJsFiles[t.file].push(t.desc);
}
for (const [file, descs] of Object.entries(dsJsFiles).sort()) {
    console.log('  ' + file + ' (' + descs.length + '):');
    for (const d of descs) console.log('    ' + d.substring(0, 70));
}

// Analyze GAL
console.log('\n\n========= GAL ANALYSIS =========');
const galXml = getXmlTests('GAL');
const galJs = getJsTests('gal');
console.log('XML migratable: ' + galXml.filter(t => t.migratable).length);
console.log('XML excluded (non-migratable types): ' + galXml.filter(t => !t.migratable).length);
console.log('JS it() blocks: ' + galJs.length);
console.log('\nXML migratable tests:');
for (const t of galXml.filter(t => t.migratable)) {
    console.log('  [' + t.type + '] ' + t.tcId + ' | ' + t.obj.substring(0, 60));
}
console.log('\nXML non-migratable (should NOT be JS tests):');
for (const t of galXml.filter(t => !t.migratable)) {
    console.log('  [' + t.type + '] ' + t.tcId + ' | ' + t.obj.substring(0, 60));
}
console.log('\nJS tests per file:');
const galJsFiles = {};
for (const t of galJs) {
    if (!galJsFiles[t.file]) galJsFiles[t.file] = [];
    galJsFiles[t.file].push(t.desc);
}
for (const [file, descs] of Object.entries(galJsFiles).sort()) {
    console.log('  ' + file + ' (' + descs.length + '):');
    for (const d of descs) console.log('    ' + d.substring(0, 70));
}
