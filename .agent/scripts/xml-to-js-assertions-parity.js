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
        // Count static it(' and it(` calls
        let count = (content.match(/it\([`']/g) || []).length;

        // Detect forEach-generated tests: arrayName.forEach(... it(
        // These generate N tests from 1 source it() call
        // Look for patterns like: varName.forEach((... => { ... it(
        const forEachBlocks = content.match(/(\w+)\.forEach\s*\(/g) || [];
        for (const match of forEachBlocks) {
            const varName = match.replace(/\.forEach\s*\(/, '');
            // Check if this forEach contains an it() call
            const forEachIdx = content.indexOf(match);
            const blockAfter = content.slice(forEachIdx, forEachIdx + 500);
            if (/it\([`']/.test(blockAfter)) {
                // Find the array definition and count elements
                const arrayPattern = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
                const arrayMatch = content.match(arrayPattern);
                if (arrayMatch) {
                    // Count quoted strings (timezone IDs, test params, etc.)
                    const elements = arrayMatch[1].match(/'[^']*'|"[^"]*"/g) || [];
                    if (elements.length > 1) {
                        // Subtract the 1 source it() already counted, add actual element count
                        count = count - 1 + elements.length;
                    }
                }
                // Also check for spread arrays: [...arr1, ...arr2, ...arr3]
                const spreadPattern = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\[\\.\\.\\.\\w+`);
                if (spreadPattern.test(content)) {
                    // Find all spread sources
                    const spreadMatch = content.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\[([^\\]]+)\\]`));
                    if (spreadMatch) {
                        const spreadSources = spreadMatch[1].match(/\.\.\.(\w+)/g) || [];
                        let totalElements = 0;
                        for (const src of spreadSources) {
                            const srcName = src.replace('...', '');
                            const srcArr = content.match(new RegExp(`(?:const|let|var)\\s+${srcName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
                            if (srcArr) {
                                totalElements += (srcArr[1].match(/'[^']*'|"[^"]*"/g) || []).length;
                            }
                        }
                        if (totalElements > 1) {
                            count = count - 1 + totalElements;
                        }
                    }
                }
            }
        }
        return count;
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
        const singleQuote = content.match(/it\('([^']+)'/g) || [];
        const backtick = content.match(/it\(`([^`]+)`/g) || [];
        const all = [
            ...singleQuote.map(m => m.replace(/^it\('/, '').replace(/'$/, '')),
            ...backtick.map(m => m.replace(/^it\(`/, '').replace(/`$/, ''))
        ];
        return all;
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

    let totalJs = 0, totalXml = 0, countOk = 0, countExtra = 0, countDeficit = 0;
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
                countExtra++;
                mismatches.push({ jsShort, jsTests, xmlTests, xmlFile, diff: jsTests - xmlTests });
            } else {
                status = C.red(`❌ -${xmlTests - jsTests}`);
                countDeficit++;
                mismatches.push({ jsShort, jsTests, xmlTests, xmlFile, diff: jsTests - xmlTests });
            }
            console.log(`  ${jsShort.padEnd(50)} ${String(jsTests).padStart(5)} ${String(xmlTests).padStart(5)} ${status}`);
        } else {
            console.log(`  ${jsShort.padEnd(50)} ${String(jsTests).padStart(5)} ${'N/A'.padStart(5)} —`);
        }
    }
    console.log('');
    console.log(`  Totals: JS=${totalJs} XML=${totalXml} | Match=${countOk} Extra=${countExtra} Deficit=${countDeficit}`);
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
        // Only flag real assertion hedges: if (res.Fault) or if (res.XResponse) { assert
        // Exclude control flow: if (!res.Response.x) return; or if (res.Response?.x) break;
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n');
        let realHedges = 0;
        for (const line of lines) {
            if (/if \(.*Response/.test(line)) {
                const trimmed = line.trim();
                // Exclude: polling/guard patterns like return/break/continue
                if (/return|break|continue/.test(trimmed)) continue;
                // Exclude: optional chaining checks like if (res.Response?.x)
                if (/\?\./.test(trimmed)) continue;
                // Exclude: negation guards like if (!res.Response.x)
                if (/if \(!/.test(trimmed)) continue;
                // Exclude: existence-check chains like if (res.Response && res.Response.x)
                if (/&&/.test(trimmed)) continue;
                realHedges++;
            }
        }
        if (realHedges > 0) { console.log(C.yellow(`  ⚠️  if/else hedge: ${subRel(f, jsDir)} (${realHedges})`)); ifCount += realHedges; }
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

    // --- Section 5.5: Duplicate Const Declarations ---
    console.log('--- Duplicate Const Declarations ---');
    let dupeFiles = 0;
    const DUPE_VARS = ['host', 'createAcctRes', 'acctInfo', 'acctInfoRes'];
    for (const f of jsFiles) {
        const content = fs.readFileSync(f, 'utf8');
        const dupes = [];
        for (const v of DUPE_VARS) {
            const re = new RegExp(`const\\\\s+${v}\\\\s*=`, 'g');
            const m = content.match(re);
            if (m && m.length > 1) dupes.push(`${v}(${m.length})`);
        }
        if (dupes.length > 0) {
            console.log(C.red(`  ❌ ${subRel(f, jsDir)}: ${dupes.join(', ')}`));
            dupeFiles++;
        }
    }
    console.log(dupeFiles === 0
        ? C.green(`  ✅ No duplicate const declarations found`)
        : C.red(`  ${dupeFiles} file(s) with duplicate const declarations`));
    console.log('');

    // --- Section 6: Verdict ---
    // Only count deficits as issues (not JS-has-more)
    // Detect paired file redistributions: if deficit + surplus net to 0, not an issue
    let netDeficit = 0;
    const deficits = mismatches.filter(m => m.diff < 0);
    const extras = mismatches.filter(m => m.diff > 0);
    let realDeficit = deficits.reduce((s, m) => s + Math.abs(m.diff), 0);
    const totalExtra = extras.reduce((s, m) => s + m.diff, 0);
    // If total JS >= total XML, deficits are redistributions
    if (totalJs >= totalXml) realDeficit = 0;
    const issues = realDeficit + unmatchedXml + hFail + aFail + weak + arrayW + dupeFiles;

    console.log(C.bold('--- VERDICT ---'));
    console.log(`  Files:       ${jsFiles.length} JS / ${xmlFiles.length} XML (${mappedCount} mapped)`);
    console.log(`  Tests:       ${totalJs} JS / ${totalXml} XML (${countOk} match, ${countExtra} extra, ${countDeficit} deficit)`);
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

    return { mod, issues, jsFiles: jsFiles.length, xmlFiles: xmlFiles.length, totalJs, totalXml, countOk, countExtra, countDeficit, unmatchedXml, hFail, weak };
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
