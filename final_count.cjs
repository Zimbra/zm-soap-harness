const fs = require('fs');
const path = require('path');
function walk(d) { const r = []; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? r.push(...walk(f)) : r.push(f) } return r }
const vt = ['smoke', 'sanity', 'functional', 'regression', 'bhr'];
const xmlDir = 'data/soapvalidator/MailClient';
const jsBase = 'mocha/tests/mail-client';
const xmlFiles = walk(xmlDir).filter(f => f.endsWith('.xml'));
const jsFiles = walk(jsBase).filter(f => f.endsWith('.js'));
const x2j = { AddressList: 'address-list', Auth: 'auth', Briefcase: 'briefcase', Calendar: 'calendar', Contacts: 'contacts', Conversation: 'conversation', DataSource: 'data-source', DistributionList: 'distribution-list', Dumpster: 'dumpster', Filters: 'filters', Folders: 'folders', GAL: 'gal', HAB: 'hab', Headers: 'headers', Identities: 'identities', Mail: 'mail', Misc: 'misc', Mobile: 'mobile', Passwd: 'passwd', Prefs: 'prefs', Search: 'search', Smime: 'smime', Spam: 'spam', Tags: 'tags', Tasks: 'tasks', VoiceMail: 'voicemail', ZCO: 'zco' };
const xc = {}, jc = {};
for (const f of xmlFiles) { const c = fs.readFileSync(f, 'utf8'), r = path.relative(xmlDir, f).split(path.sep)[0], d = x2j[r]; if (!d) continue; if (!xc[d]) xc[d] = 0; const p = c.split(/<t:test_case\s+/); for (let i = 1; i < p.length; i++) { const tm = p[i].match(/type\s*=\s*"([^"]+)"/), im = p[i].match(/testcaseid\s*=\s*"([^"]+)"/i), t = tm ? tm[1].toLowerCase() : '', id = im ? im[1].toLowerCase() : ''; if (t === 'always' || t === 'deprecated') continue; if (id === 'ping' || id.includes('setup')) continue; if (vt.includes(t)) xc[d]++ } }
for (const f of jsFiles) { const c = fs.readFileSync(f, 'utf8'), n = (c.match(/\bit\(/g) || []).length, r = path.relative(jsBase, f).split(path.sep)[0]; if (!jc[r]) jc[r] = 0; jc[r] += n }
const all = new Set([...Object.keys(xc), ...Object.keys(jc)]);
const lines = ['Dir|XML|JS|Delta|Status'];
let tx = 0, tj = 0;
for (const d of [...all].sort()) { const x = xc[d] || 0, j = jc[d] || 0, delta = j - x; const s = delta === 0 ? 'MATCH' : delta > 0 ? 'EXTRA +' + delta : 'SHORT ' + delta; lines.push(d + '|' + x + '|' + j + '|' + delta + '|' + s); tx += x; tj += j }
lines.push('TOTAL|' + tx + '|' + tj + '|' + (tj - tx) + '|');
fs.writeFileSync('final_count.txt', lines.join('\n'), 'utf8');
