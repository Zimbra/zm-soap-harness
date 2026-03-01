const fs = require('fs');
const path = require('path');
function walk(d) { const r = []; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? r.push(...walk(f)) : r.push(f) } return r }
const vt = ['smoke', 'sanity', 'functional', 'regression', 'bhr'];
const xmlDir = 'data/soapvalidator/MailClient';
const jsBase = 'mocha/tests/mail-client';
const x2j = { AddressList: 'address-list', Auth: 'auth', Briefcase: 'briefcase', Calendar: 'calendar', Contacts: 'contacts', Conversation: 'conversation', DataSource: 'data-source', DistributionList: 'distribution-list', Dumpster: 'dumpster', Filters: 'filters', Folders: 'folders', GAL: 'gal', HAB: 'hab', Headers: 'headers', Identities: 'identities', Mail: 'mail', Misc: 'misc', Mobile: 'mobile', Passwd: 'passwd', Prefs: 'prefs', Search: 'search', Smime: 'smime', Spam: 'spam', Tags: 'tags', Tasks: 'tasks', VoiceMail: 'voicemail', ZCO: 'zco' };

// Extra dirs to investigate
const extras = ['briefcase', 'calendar', 'contacts', 'distribution-list', 'hab', 'mail', 'prefs', 'search', 'smime', 'spam', 'tasks', 'voicemail'];
const out = [];

for (const jsDir of extras) {
    // Find XML dir
    let xmlSubDir = null;
    for (const [xd, jd] of Object.entries(x2j)) { if (jd === jsDir) { xmlSubDir = xd; break; } }

    out.push(`\n=== ${jsDir} (XML dir: ${xmlSubDir || 'NONE'}) ===`);

    // Count XML tests per file
    const xmlPath = xmlSubDir ? path.join(xmlDir, xmlSubDir) : null;
    const xmlTests = [];
    if (xmlPath && fs.existsSync(xmlPath)) {
        const xFiles = walk(xmlPath).filter(f => f.endsWith('.xml'));
        for (const f of xFiles) {
            const c = fs.readFileSync(f, 'utf8');
            const bn = path.relative(xmlPath, f);
            const parts = c.split(/<t:test_case\s+/);
            for (let i = 1; i < parts.length; i++) {
                const tm = parts[i].match(/type\s*=\s*"([^"]+)"/);
                const im = parts[i].match(/testcaseid\s*=\s*"([^"]+)"/i);
                const om = parts[i].match(/<t:objective>([\s\S]*?)<\/t:objective>/);
                const t = tm ? tm[1].toLowerCase() : '';
                const id = im ? im[1] : '';
                const obj = om ? om[1].replace(/\s+/g, ' ').trim().substring(0, 60) : '';
                if (t === 'always' || t === 'deprecated') continue;
                if (id.toLowerCase() === 'ping' || id.toLowerCase().includes('setup')) continue;
                if (vt.includes(t)) xmlTests.push({ file: bn, id, type: t, obj });
            }
        }
    }

    // Count JS tests per file
    const jsPath = path.join(jsBase, jsDir);
    const jsTests = [];
    if (fs.existsSync(jsPath)) {
        const jFiles = walk(jsPath).filter(f => f.endsWith('.js'));
        for (const f of jFiles) {
            const c = fs.readFileSync(f, 'utf8');
            const bn = path.basename(f);
            const matches = [...c.matchAll(/\bit\s*\(\s*'([^']+)'/g)];
            for (const m of matches) jsTests.push({ file: bn, desc: m[1].substring(0, 70) });
        }
    }

    out.push(`XML migratable: ${xmlTests.length}`);
    out.push(`JS it() blocks: ${jsTests.length}`);
    out.push(`EXTRA: ${jsTests.length - xmlTests.length}`);

    out.push(`\nXML tests (${xmlTests.length}):`);
    for (const t of xmlTests) out.push(`  [${t.type}] ${t.id} | ${t.obj}`);

    out.push(`\nJS tests (${jsTests.length}):`);
    for (const t of jsTests) out.push(`  ${t.file}: ${t.desc}`);
}

fs.writeFileSync('extra_analysis.txt', out.join('\n'), 'utf8');
console.log('Written to extra_analysis.txt');
