#!/usr/bin/env node
/**
 * XML-to-JS Assertion Parity Verification — Node.js (Fast)
 *
 * USAGE:
 *   node .agent/scripts/xml-to-js-assertions-parity.js <module>
 *   node .agent/scripts/xml-to-js-assertions-parity.js --all
 *   node .agent/scripts/xml-to-js-assertions-parity.js --list
 *
 * EXAMPLES:
 *   node .agent/scripts/xml-to-js-assertions-parity.js briefcase
 *   node .agent/scripts/xml-to-js-assertions-parity.js --all
 */

const fs = require('fs');
const path = require('path');

// --- Module mapping ---
const MODULE_MAP = {
    admin: 'Admin', auth: 'Auth', briefcase: 'Briefcase', calendar: 'Calendar',
    contacts: 'Contacts', dav: 'Dav', delegated: 'Delegated', ews: 'EWS',
    folders: 'Folders', general: 'General', ical: 'iCal', mail: 'Mail',
    'mail-client': 'MailClient', prefs: 'Prefs', 'rest-servlet': 'RestServlet',
    'sanity-test': 'SanityTest', search: 'Search', sharing: 'Sharing',
    sync: 'Sync', tags: 'Tags', tasks: 'Tasks'
};

const ALL_MODULES = Object.keys(MODULE_MAP);
const JS_BASE = 'mocha/tests';
const XML_BASE = 'data/soapvalidator';
const LOG_FILE = '.agent/xml-to-js-assertions.txt';

// --- Colors ---
const C = {
    red: s => `\x1b[31m${s}\x1b[0m`,
    green: s => `\x1b[32m${s}\x1b[0m`,
    yellow: s => `\x1b[33m${s}\x1b[0m`,
    cyan: s => `\x1b[36m${s}\x1b[0m`,
    bold: s => `\x1b[1m${s}\x1b[0m`,
};

// --- Helpers ---
function findFiles(dir, ext) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    function walk(d) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith(ext)) results.push(full.replace(/\\/g, '/'));
        }
    }
    walk(dir);
    return results.sort();
}

function normalize(name) {
    return name.toLowerCase().replace(/[-_.]/g, '');
}

function getWords(name) {
    return [...new Set(
        name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[-_.]/g, ' ').split(/\s+/).filter(Boolean)
    )];
}

function wordOverlap(a, b) {
    const wa = getWords(a), wb = getWords(b);
    if (!wa.length) return 0;
    const wbSet = new Set(wb);
    const match = wa.filter(w => wbSet.has(w)).length;
    return Math.round(match * 100 / wa.length);
}

function countInFile(filepath, pattern) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        return (content.match(regex) || []).length;
    } catch { return 0; }
}

function countXmlTests(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const totalTests = (content.match(/<t:test_case\s/g) || []).length;
        const setupTests = (content.match(/type="always"/g) || []).length;
        const deprecatedTests = (content.match(/type="deprecated"/g) || []).length;
        return Math.max(0, totalTests - setupTests - deprecatedTests);
    } catch { return 0; }
}

function countJsTests(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        return (content.match(/it\('/g) || []).length;
    } catch { return 0; }
}

function getXmlObjectives(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const objs = [];
        // Parse test_case blocks - only get objectives from non-always blocks
        const blocks = content.split(/<t:test_case\s/);
        for (let i = 1; i < blocks.length; i++) {
            if (/type="always"/.test(blocks[i]) || /type="deprecated"/.test(blocks[i])) continue;
            const m = blocks[i].match(/<t:objective>(.*?)<\/t:objective>/);
            if (m) objs.push(m[1].trim());
        }
        return objs;
    } catch { return []; }
}

function getJsItDescriptions(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const matches = content.match(/it\('([^']+)'/g) || [];
        return matches.map(m => m.replace(/^it\('/, '').replace(/'$/, ''));
    } catch { return []; }
}

function subRel(filepath, base) {
    return filepath.replace(base + '/', '');
}

// --- Fix bare parent assertions ---
function fixBareParents(filepath) {
    try {
        let content = fs.readFileSync(filepath, 'utf8');
        const pattern = /assert\.(exists|ok)\(([^,]*)\.[A-Za-z]+Response,([^)]*)\)/g;
        const count = (content.match(pattern) || []).length;
        if (count > 0) {
            content = content.replace(pattern, 'assert.notExists($2.Fault,$3)');
            fs.writeFileSync(filepath, content, 'utf8');
        }
        return count;
    } catch { return 0; }
}

// =============================================================================
// Verify a single module
// =============================================================================
function verifyModule(mod) {
    const xmlRel = MODULE_MAP[mod];
    const jsDir = `${JS_BASE}/${mod}`;
    const xmlDir = `${XML_BASE}/${xmlRel}`;

    if (!fs.existsSync(jsDir)) { console.log(`  ERROR: ${jsDir} not found`); return null; }
    if (!fs.existsSync(xmlDir)) { console.log(`  ERROR: ${xmlDir} not found`); return null; }

    const jsFiles = findFiles(jsDir, '.js');
    const xmlFiles = findFiles(xmlDir, '.xml');

    console.log('');
    console.log(C.bold('============================================================'));
    console.log(C.bold(`  MODULE: ${C.cyan(mod)} (${jsFiles.length} JS / ${xmlFiles.length} XML)`));
    console.log(C.bold('============================================================'));
    console.log('');

    // --- Step 1: Build mapping ---
    const jsXmlMap = new Map();
    const xmlMatched = new Set();

    // Pre-compute normalized names
    const xmlIndex = xmlFiles.map(f => ({
        path: f,
        basename: path.basename(f, '.xml'),
        norm: normalize(path.basename(f, '.xml')),
        subNorm: normalize(subRel(path.dirname(f), xmlDir)),
    }));

    for (const jsFile of jsFiles) {
        const jsBn = path.basename(jsFile, '.js');
        const jsNorm = normalize(jsBn);
        const jsSubNorm = normalize(subRel(path.dirname(jsFile), jsDir));

        let bestMatch = null, bestScore = 0;

        for (const xml of xmlIndex) {
            if (xmlMatched.has(xml.path)) continue;
            let score = 0;

            if (jsNorm === xml.norm) score = 100;
            else if (xml.norm.includes(jsNorm)) score = 60;
            else if (jsNorm.includes(xml.norm)) score = 50;
            else {
                const overlap = wordOverlap(jsBn, xml.basename);
                if (overlap >= 60) score = Math.floor(overlap / 2) + 10;
            }

            if (score > 0 && jsSubNorm === xml.subNorm) score += 20;
            if (score > bestScore) { bestScore = score; bestMatch = xml.path; }
        }

        if (bestMatch && bestScore >= 50) {
            jsXmlMap.set(jsFile, bestMatch);
            xmlMatched.add(bestMatch);
        }
    }

    // --- Section 1: File Mapping ---
    console.log('--- File Mapping ---');
    let unmatchedJs = 0, unmatchedXml = 0, mappedCount = jsXmlMap.size;

    for (const f of jsFiles) {
        if (!jsXmlMap.has(f)) {
            console.log(C.yellow(`  ⚠️  JS WITHOUT XML: ${subRel(f, jsDir)}`));
            unmatchedJs++;
        }
    }
    for (const f of xmlFiles) {
        if (!xmlMatched.has(f)) {
            const tc = countXmlTests(f);
            if (tc > 0) {
                console.log(C.red(`  ❌ XML WITHOUT JS: ${subRel(f, xmlDir)} (${tc} test cases)`));
                unmatchedXml++;
            } else {
                console.log(C.yellow(`  ℹ️  XML SKIPPED (0 real tests): ${subRel(f, xmlDir)}`));
            }
        }
    }
    if (unmatchedJs === 0 && unmatchedXml === 0) {
        console.log(C.green(`  ✅ All files mapped (${mappedCount} pairs)`));
    } else {
        console.log(`  Mapped: ${mappedCount} | Unmatched JS: ${unmatchedJs} | Unmatched XML: ${unmatchedXml}`);
    }
    console.log('');

    // --- Section 2: Test Case Counts ---
    console.log('--- Test Case Counts ---');
    console.log(`  ${'File'.padEnd(50)} ${'JS'.padStart(5)} ${'XML'.padStart(5)} Status`);
    console.log(`  ${'----'.padEnd(50)} ${'---'.padStart(5)} ${'---'.padStart(5)} ------`);

    let totalJs = 0, totalXml = 0, countOk = 0, countBad = 0;
    const mismatches = [];

    for (const jsFile of jsFiles) {
        const jsShort = subRel(jsFile, jsDir);
        const jsTests = countJsTests(jsFile);
        totalJs += jsTests;

        const xmlFile = jsXmlMap.get(jsFile);
        if (xmlFile) {
            const xmlTests = countXmlTests(xmlFile);
            totalXml += xmlTests;

            let status;
            if (jsTests === xmlTests) {
                status = C.green('✅');
                countOk++;
            } else if (jsTests > xmlTests) {
                status = C.yellow(`⚠️  JS+${jsTests - xmlTests}`);
                countBad++;
                mismatches.push({ jsShort, jsTests, xmlTests, xmlFile });
            } else {
                status = C.red(`❌ -${xmlTests - jsTests}`);
                countBad++;
                mismatches.push({ jsShort, jsTests, xmlTests, xmlFile });
            }
            console.log(`  ${jsShort.padEnd(50)} ${String(jsTests).padStart(5)} ${String(xmlTests).padStart(5)} ${status}`);
        } else {
            console.log(`  ${jsShort.padEnd(50)} ${String(jsTests).padStart(5)} ${'N/A'.padStart(5)} —`);
        }
    }
    console.log('');
    console.log(`  Totals: JS=${totalJs} XML=${totalXml} | Match=${countOk} Mismatch=${countBad}`);
    console.log('');

    // --- Section 3: zimbraMailHost ---
    console.log('--- zimbraMailHost Coverage ---');
    let hPass = 0, hFail = 0;
    for (const f of jsFiles) {
        if (countInFile(f, /zimbraMailHost/g) > 0) hPass++;
        else { console.log(C.red(`  ❌ ${subRel(f, jsDir)}`)); hFail++; }
    }
    console.log(hFail === 0 ? C.green(`  ✅ All ${hPass} files have zimbraMailHost`) : `  Pass: ${hPass} | Fail: ${hFail}`);
    console.log('');

    // --- Section 4: Account ID ---
    console.log('--- Account ID Extraction ---');
    let aPass = 0, aFail = 0;
    for (const f of jsFiles) {
        if (countInFile(f, /CreateAccountRequest/g) > 0) {
            if (countInFile(f, /\.id/g) > 0) aPass++;
            else { console.log(C.red(`  ❌ ${subRel(f, jsDir)}`)); aFail++; }
        }
    }
    console.log(aFail === 0 ? C.green(`  ✅ All ${aPass} files extract .id`) : `  Pass: ${aPass} | Fail: ${aFail}`);
    console.log('');

    // --- Section 5: Weak Patterns ---
    console.log('--- Weak Assertion Patterns ---');
    let bare = 0, ifCount = 0, fault = 0, arrayW = 0;

    for (const f of jsFiles) {
        const c = countInFile(f, /assert\.(exists|ok)\([^,]*Response,/g);
        if (c > 0) { console.log(C.yellow(`  ⚠️  Bare parent: ${subRel(f, jsDir)} (${c})`)); bare += c; }
    }
    for (const f of jsFiles) {
        const c = countInFile(f, /if \(.*Response/g);
        if (c > 0) { console.log(C.yellow(`  ⚠️  if/else hedge: ${subRel(f, jsDir)} (${c})`)); ifCount += c; }
    }
    for (const f of jsFiles) {
        const c = countInFile(f, /assert\.exists\(.*\.Fault/g);
        if (c > 0) { console.log(C.yellow(`  ⚠️  assert.exists(Fault): ${subRel(f, jsDir)} (${c})`)); fault += c; }
    }
    for (const f of jsFiles) {
        const resp = countInFile(f, /\.(account|folder|link|doc|action|m)\b/g);
        const arr = countInFile(f, /Array\.isArray/g);
        if (resp > 3 && arr === 0) { console.log(C.yellow(`  ⚠️  No Array.isArray: ${subRel(f, jsDir)}`)); arrayW++; }
    }

    const weak = bare + ifCount + fault;
    if (weak === 0 && arrayW === 0) console.log(C.green('  ✅ No weak patterns found'));
    else console.log(`  Total: ${bare} bare + ${ifCount} conditionals + ${fault} fault + ${arrayW} array-unsafe`);
    console.log('');

    // --- Section 6: Verdict ---
    const issues = countBad + unmatchedXml + hFail + aFail + weak + arrayW;

    console.log(C.bold('--- VERDICT ---'));
    console.log(`  Files:       ${jsFiles.length} JS / ${xmlFiles.length} XML (${mappedCount} mapped)`);
    console.log(`  Tests:       ${totalJs} JS / ${totalXml} XML (${countOk} match, ${countBad} mismatch)`);
    console.log(`  Unmapped:    ${unmatchedJs} JS-only, ${unmatchedXml} XML-only`);
    console.log(`  MailHost:    ${hPass} pass, ${hFail} fail`);
    console.log(`  Account ID:  ${aPass} pass, ${aFail} fail`);
    console.log(`  Weak:        ${weak} patterns + ${arrayW} array-unsafe`);
    console.log('');

    if (issues === 0) {
        console.log(C.green(C.bold(`  🎉 ${mod}: COMPLETE — zero issues`)));
    } else {
        console.log(C.red(C.bold(`  ⚠️  ${mod}: ${issues} ISSUE(S) REMAINING`)));
        if (mismatches.length > 0) {
            console.log('\n  Test count mismatches:');
            for (const m of mismatches) {
                const diff = m.xmlTests - m.jsTests;
                console.log(`    ${m.jsShort}: JS=${m.jsTests} XML=${m.xmlTests} (${diff > 0 ? 'missing ' + diff : 'JS has more'})`);
            }
        }
    }
    console.log('');

    // --- Section 7: Direct Fixes ---
    if (issues > 0) {
        console.log(C.bold('--- APPLYING FIXES ---'));
        console.log('');

        const today = new Date().toISOString().slice(0, 10);
        let fixedCount = 0;

        // 7a: Fix bare parent assertions
        if (bare > 0) {
            console.log(C.bold('  [A] Fixing bare parent assertions...'));
            for (const f of jsFiles) {
                const c = fixBareParents(f);
                if (c > 0) {
                    console.log(C.green(`    ✅ FIXED: ${subRel(f, jsDir)} — replaced ${c} bare parent(s)`));
                    fixedCount += c;
                }
            }
            console.log('');
        }

        // 7b: Log findings
        console.log(C.bold(`  [B] Logging findings to ${LOG_FILE}...`));
        let logContent = `\n[${today}] FOLDER: ${mod}\n`;

        for (const f of xmlFiles) {
            if (!xmlMatched.has(f)) {
                const short = subRel(f, xmlDir);
                logContent += `  MISMATCH: ${short} has no JS counterpart\n`;
                console.log(`    Logged MISMATCH: ${short}`);
            }
        }

        for (const m of mismatches) {
            if (m.jsTests < m.xmlTests) {
                const diff = m.xmlTests - m.jsTests;
                logContent += `  TODO:     ${m.jsShort} — missing ${diff} test case(s) vs XML\n`;

                // Find specifically missing objectives
                const xmlObjs = getXmlObjectives(m.xmlFile);
                const jsIts = getJsItDescriptions(path.join(jsDir, m.jsShort));

                for (const obj of xmlObjs) {
                    const objLower = obj.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const found = jsIts.some(it => {
                        const itLower = it.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return itLower.includes(objLower) || objLower.includes(itLower);
                    });
                    if (!found) {
                        logContent += `            Missing: ${obj}\n`;
                    }
                }
                console.log(`    Logged TODO: ${m.jsShort} (missing ${diff})`);
            }
        }

        fs.appendFileSync(LOG_FILE, logContent, 'utf8');
        console.log('');
        console.log(C.green(`  Fixed: ${fixedCount} bare parent assertion(s)`));
        console.log(`  Logged all findings to: ${LOG_FILE}`);
        console.log('');
    }

    return { mod, issues, jsFiles: jsFiles.length, xmlFiles: xmlFiles.length, totalJs, totalXml, countOk, countBad, unmatchedXml, hFail, weak };
}

// =============================================================================
// MAIN
// =============================================================================
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node .agent/scripts/xml-to-js-assertions-parity.js <module|--all|--list>');
    console.log('');
    console.log('  <module>  Module name (e.g. briefcase, auth, calendar)');
    console.log('  --all     Run verification for ALL modules');
    console.log('  --list    List all available modules');
    process.exit(0);
}

if (args[0] === '--list' || args[0] === '-l') {
    console.log('Available modules:\n');
    console.log(`  ${'Module'.padEnd(20)} ${'XML Folder'.padEnd(20)} Status`);
    console.log(`  ${'-'.repeat(20)} ${'-'.repeat(20)} ------`);
    for (const mod of ALL_MODULES) {
        const jsDir = `${JS_BASE}/${mod}`;
        const xmlDir = `${XML_BASE}/${MODULE_MAP[mod]}`;
        const jsOk = fs.existsSync(jsDir), xmlOk = fs.existsSync(xmlDir);
        if (jsOk && xmlOk) {
            const jsC = findFiles(jsDir, '.js').length;
            const xmlC = findFiles(xmlDir, '.xml').length;
            console.log(`  ${mod.padEnd(20)} ${MODULE_MAP[mod].padEnd(20)} JS=${jsC} XML=${xmlC}`);
        } else {
            console.log(`  ${mod.padEnd(20)} ${MODULE_MAP[mod].padEnd(20)} ⚠️  missing`);
        }
    }
    process.exit(0);
}

if (args[0] === '--all' || args[0] === '-a') {
    console.log('');
    console.log(C.bold('================================================================'));
    console.log(C.bold(`  BATCH VERIFICATION — ALL MODULES`));
    console.log(C.bold(`  ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`));
    console.log(C.bold('================================================================'));

    const results = [];
    for (const mod of ALL_MODULES) {
        const jsDir = `${JS_BASE}/${mod}`;
        const xmlDir = `${XML_BASE}/${MODULE_MAP[mod]}`;
        if (fs.existsSync(jsDir) && fs.existsSync(xmlDir)) {
            const r = verifyModule(mod);
            if (r) results.push(r);
        } else {
            console.log(C.yellow(`\n  SKIPPED: ${mod} (directory missing)`));
        }
    }

    console.log('');
    console.log(C.bold('================================================================'));
    console.log(C.bold('  BATCH SUMMARY'));
    console.log(C.bold('================================================================'));
    console.log('');

    const clean = results.filter(r => r.issues === 0);
    const dirty = results.filter(r => r.issues > 0);
    const totalIssues = results.reduce((s, r) => s + r.issues, 0);

    console.log(`  Modules Checked:     ${results.length}`);
    console.log(`  Modules Clean:       ${clean.length}`);
    console.log(`  Modules With Issues: ${dirty.length}`);
    console.log(`  Total Issues:        ${totalIssues}`);
    console.log('');
    if (clean.length) console.log(C.green(`  ✅ Clean: ${clean.map(r => r.mod).join(' ')}`));
    if (dirty.length) console.log(C.red(`  ⚠️  Issues: ${dirty.map(r => `${r.mod}(${r.issues})`).join(' ')}`));
    console.log('');
} else {
    const mod = args[0];
    if (!MODULE_MAP[mod]) {
        console.log(`ERROR: Unknown module '${mod}'`);
        console.log(`Available: ${ALL_MODULES.join(', ')}`);
        process.exit(1);
    }
    console.log(`\n  ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`);
    verifyModule(mod);
}
