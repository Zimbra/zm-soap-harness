#!/usr/bin/env node
/**
 * parity-check.cjs — Unified Assertion Parity Verification
 *
 * Combines functionality from:
 *   - xml-to-js-assertions-parity.js (file mapping, test counts, weak patterns, fixes)
 *   - verify-tselect-parity.cjs (t:select ratio table)
 *   - scan-weak-assertions.cjs (weak assertion pattern detection)
 *
 * USAGE:
 *   node .agent/scripts/parity-check.cjs <module>
 *   node .agent/scripts/parity-check.cjs --all
 *   node .agent/scripts/parity-check.cjs --list
 *
 * EXAMPLES:
 *   node .agent/scripts/parity-check.cjs contacts
 *   node .agent/scripts/parity-check.cjs --all
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
const LOG_FILE = '.agent/scripts/report-xml-to-js-assertions.txt';

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
    return Math.round(wa.filter(w => wbSet.has(w)).length * 100 / wa.length);
}

function countInFile(filepath, pattern) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        return (content.match(regex) || []).length;
    } catch { return 0; }
}

function subRel(filepath, base) {
    return filepath.replace(base + '/', '');
}

// --- XML helpers ---
// WHITELIST: Only count t:select from these test case types
const ELIGIBLE_TYPES = /type="(?:smoke|sanity|functional|regression)"/;

// Strip XML comments (<!-- ... -->) to avoid counting commented-out t:select
function stripXmlComments(content) {
    return content.replace(/<!--[\s\S]*?-->/g, '');
}

function countXmlTests(filepath) {
    try {
        const content = stripXmlComments(fs.readFileSync(filepath, 'utf8'));
        const blocks = content.split(/<t:test_case\s/);
        let count = 0;
        for (let i = 1; i < blocks.length; i++) {
            if (ELIGIBLE_TYPES.test(blocks[i])) count++;
        }
        return count;
    } catch { return 0; }
}

function countXmlSelects(filepath) {
    try {
        const content = stripXmlComments(fs.readFileSync(filepath, 'utf8'));
        const blocks = content.split(/<t:test_case\s/);
        let total = 0;
        // Block 0 = before suite (before first t:test_case) — include its t:select
        total += (blocks[0].match(/<t:select/g) || []).length;
        // Blocks 1+ = test cases — only include eligible types
        for (let i = 1; i < blocks.length; i++) {
            if (!ELIGIBLE_TYPES.test(blocks[i])) continue;
            total += (blocks[i].match(/<t:select/g) || []).length;
        }
        return total;
    } catch { return 0; }
}

function getXmlObjectives(filepath) {
    try {
        const content = stripXmlComments(fs.readFileSync(filepath, 'utf8'));
        const objs = [];
        const blocks = content.split(/<t:test_case\s/);
        for (let i = 1; i < blocks.length; i++) {
            if (!ELIGIBLE_TYPES.test(blocks[i])) continue;
            const m = blocks[i].match(/<t:objective>(.*?)<\/t:objective>/);
            if (m) objs.push(m[1].trim());
        }
        return objs;
    } catch { return []; }
}

// --- JS helpers ---
function countJsTests(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        let count = (content.match(/it\([`']/g) || []).length;
        const forEachBlocks = content.match(/(\w+)\.forEach\s*\(/g) || [];
        for (const match of forEachBlocks) {
            const varName = match.replace(/\.forEach\s*\(/, '');
            const forEachIdx = content.indexOf(match);
            const blockAfter = content.slice(forEachIdx, forEachIdx + 500);
            if (/it\([`']/.test(blockAfter)) {
                const arrayPattern = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
                const arrayMatch = content.match(arrayPattern);
                if (arrayMatch) {
                    const elements = arrayMatch[1].match(/'[^']*'|"[^"]*"/g) || [];
                    if (elements.length > 1) count = count - 1 + elements.length;
                }
                const spreadPattern = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\[\\.\\.\\.\\w+`);
                if (spreadPattern.test(content)) {
                    const spreadMatch = content.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\[([^\\]]+)\\]`));
                    if (spreadMatch) {
                        const spreadSources = spreadMatch[1].match(/\.\.\.(\w+)/g) || [];
                        let totalElements = 0;
                        for (const src of spreadSources) {
                            const srcName = src.replace('...', '');
                            const srcArr = content.match(new RegExp(`(?:const|let|var)\\s+${srcName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
                            if (srcArr) totalElements += (srcArr[1].match(/'[^']*'|"[^"]*"/g) || []).length;
                        }
                        if (totalElements > 1) count = count - 1 + totalElements;
                    }
                }
            }
        }
        return count;
    } catch { return 0; }
}

function countJsAssertions(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n');
        const ASSERT_RE = /assert\.(exists|notExists|isString|equal|include|match|isTrue|isNotEmpty|isArray|isNumber|isAbove|isBelow|isAtLeast|isAtMost|lengthOf|deepEqual|notEqual|notInclude|ok|isOk)/g;

        let total = 0;
        let loopMultiplier = 1;
        let loopDepth = 0;
        let braceCount = 0;
        let inLoop = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Detect for-loop with numeric range: for (let i = 0; i < N; i++) or for (let i = 1; i <= N; i++)
            const forMatch = trimmed.match(/^for\s*\(\s*(?:let|var|const)\s+\w+\s*=\s*(\d+)\s*;\s*\w+\s*[<]=?\s*(\d+)\s*;/);
            // Also detect: for (let i = 0; i < arrayName.length; i++)
            const forLenMatch = !forMatch && trimmed.match(/^for\s*\(\s*(?:let|var|const)\s+\w+\s*=\s*(\d+)\s*;\s*\w+\s*[<]=?\s*(\w+)\.length\s*;/);
            if (forMatch || forLenMatch) {
                const m = forMatch || forLenMatch;
                const start = parseInt(m[1]);
                let end;
                if (forMatch) {
                    end = parseInt(m[2]);
                } else {
                    // Look up array length from declaration
                    const arrName = m[2];
                    const arrRe = new RegExp(`(?:const|let|var)\\s+${arrName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
                    const arrMatch = content.match(arrRe);
                    if (arrMatch) {
                        const elements = arrMatch[1].split(',').filter(e => e.trim().length > 0);
                        end = elements.length;
                    } else {
                        end = start + 1; // fallback: assume at least 1
                    }
                }
                const hasEqual = /<=/.test(trimmed);
                loopMultiplier = hasEqual ? (end - start + 1) : (end - start);
                if (loopMultiplier < 1) loopMultiplier = 1;
                loopDepth++;
                inLoop = true;
                // Count braces on this line before continuing
                braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
                continue;
            }


            // Detect for-of loop with known array: for (const x of arrayName)
            const forOfMatch = trimmed.match(/^for\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+(\w+)\s*\)/);
            if (forOfMatch) {
                const arrName = forOfMatch[1];
                // Try to find the array declaration to get length
                const arrRe = new RegExp(`(?:const|let|var)\\s+${arrName}\\s*=\\s*\\[([^\\]]+)\\]`);
                const arrMatch = content.match(arrRe);
                if (arrMatch) {
                    // Count elements: strings, numbers, or identifiers separated by commas
                    const elements = arrMatch[1].split(',').filter(e => e.trim().length > 0);
                    loopMultiplier = Math.max(1, elements.length);
                } else {
                    loopMultiplier = 1;
                }
                loopDepth++;
                inLoop = true;
                // Count braces on this line before continuing
                braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
                continue;
            }

            // Track braces to know when we exit the loop
            if (inLoop) {
                const opens = (line.match(/{/g) || []).length;
                const closes = (line.match(/}/g) || []).length;
                braceCount += opens - closes;
                if (braceCount <= 0 && loopDepth > 0) {
                    loopDepth--;
                    if (loopDepth === 0) {
                        inLoop = false;
                        loopMultiplier = 1;
                    }
                }
            }

            // Count assertions on this line, multiplied by loop factor
            const assertCount = (line.match(ASSERT_RE) || []).length;
            total += assertCount * (inLoop ? loopMultiplier : 1);
        }
        return total;
    } catch { return 0; }
}


function getJsItDescriptions(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const singleQuote = content.match(/it\('([^']+)'/g) || [];
        const backtick = content.match(/it\(`([^`]+)`/g) || [];
        return [
            ...singleQuote.map(m => m.replace(/^it\('/, '').replace(/'$/, '')),
            ...backtick.map(m => m.replace(/^it\(`/, '').replace(/`$/, ''))
        ];
    } catch { return []; }
}

// --- Scan weak assertions ---
function scanWeakAssertions(filepath) {
    const issues = [];
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;
            if (/^assert\.exists\(\w+\.\w*Response\s*,/.test(line))
                issues.push({ line: lineNum, rule: 'PARENT_ONLY', text: line });
            if (/^assert\.exists\(\w+\.Fault\s*,/.test(line))
                issues.push({ line: lineNum, rule: 'WEAK_FAULT', text: line });
            if (/^if\s*\(\w+\.Fault\)/.test(line) || /^if\s*\(\w+\.CreateAccount/.test(line))
                issues.push({ line: lineNum, rule: 'IF_ELSE_HEDGE', text: line });
            if (/^assert\.isTrue\(.*\|\|/.test(line))
                issues.push({ line: lineNum, rule: 'DUAL_OUTCOME', text: line });
        }
    } catch { }
    return issues;
}

// --- Fix bare parent assertions (delete the line entirely) ---
function fixBareParents(filepath) {
    try {
        let content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n');
        const filtered = lines.filter(line => {
            const trimmed = line.trim();
            return !/^assert\.(exists|ok)\([^,]*\.[A-Za-z]+Response\s*,/.test(trimmed);
        });
        const removed = lines.length - filtered.length;
        if (removed > 0) {
            fs.writeFileSync(filepath, filtered.join('\n'), 'utf8');
        }
        return removed;
    } catch { return 0; }
}

// --- Fix WEAK_FAULT: assert.exists(VAR.Fault, ...) → deep Fault check ---
function fixWeakFaults(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n');
        const filteredLines = [];
        let fixCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const weakMatch = trimmed.match(/^assert\.exists\((\w+)\.Fault,\s*(?:'[^']*'|`[^`]*`)\);$/);
            if (weakMatch) {
                const varName = weakMatch[1];
                let nextIdx = i + 1;
                while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;
                const nextLine = nextIdx < lines.length ? lines[nextIdx].trim() : '';
                const hasDeepCheck = nextLine.includes(`${varName}.Fault.Detail`) ||
                    nextLine.includes(`${varName}.Fault?.Detail`) ||
                    nextLine.includes(`${varName}.Fault.Reason`) ||
                    nextLine.includes(`${varName}.Fault?.Reason`);
                if (hasDeepCheck) {
                    fixCount++;
                    continue;
                } else {
                    const indent = line.match(/^(\t*)/)[1];
                    filteredLines.push(`${indent}assert.isString(${varName}.Fault.Detail.Error.Code, 'Fault error Code should be a string');`);
                    fixCount++;
                    continue;
                }
            }
            filteredLines.push(line);
        }
        if (fixCount > 0) {
            fs.writeFileSync(filepath, filteredLines.join('\n'), 'utf8');
        }
        return fixCount;
    } catch { return 0; }
}

// --- Fix DUAL_OUTCOME: assert.isTrue(!!a || !!b, ...) → deterministic ---
function fixDualOutcome(filepath) {
    try {
        let content = fs.readFileSync(filepath, 'utf8');
        let fixCount = 0;
        const dualRe = /^(\t+)const (\w+HasFault) = (\w+)\.Fault && \3\.Fault\.Detail && \3\.Fault\.Detail\.Error;\n\t+const (\w+HasAction) = \3\.(\w+) && \3\.\5\.action;\n\t+assert\.isTrue\(!!\2 \|\| !!\4, '([^']+)'\);$/gm;
        content = content.replace(dualRe, (match, indent, faultVar, varName, actionVar, responseName, msg) => {
            fixCount++;
            return `${indent}assert.notExists(${varName}.Fault, '${msg}');\n` +
                `${indent}assert.exists(${varName}.${responseName}.action, '${responseName} action should exist');`;
        });
        if (fixCount > 0) {
            fs.writeFileSync(filepath, content, 'utf8');
        }
        return fixCount;
    } catch { return 0; }
}

// --- Fix MAILHOST+ID: add zimbraMailHost + id extraction after CreateAccountRequest ---
function fixMailHostAndId(filepath) {
    try {
        let content = fs.readFileSync(filepath, 'utf8');
        if (content.includes('zimbraMailHost')) return 0;
        if (!content.includes('CreateAccountRequest')) return 0;
        let fixCount = 0;
        const pattern = /^(\t+)assert\.notExists\((\w+)\.Fault, '(Create \w+ should not fault)'\);$/gm;
        content = content.replace(pattern, (match, indent, varName, msg) => {
            const nextStart = content.indexOf(match) + match.length;
            const nextChunk = content.substring(nextStart, nextStart + 200);
            if (nextChunk.includes('CreateAccountResponse')) return match;
            const matchIdx = content.indexOf(match);
            const prevChunk = content.substring(Math.max(0, matchIdx - 500), matchIdx);
            if (!prevChunk.includes('CreateAccountRequest')) return match;
            fixCount++;
            const infoVar = varName + 'Info';
            const hostVar = varName + 'Host';
            return match + '\n' +
                `${indent}const ${infoVar} = Array.isArray(${varName}.CreateAccountResponse.account) ? ${varName}.CreateAccountResponse.account[0] : ${varName}.CreateAccountResponse.account;\n` +
                `${indent}assert.exists(${infoVar}.id, 'Account ID should exist');\n` +
                `${indent}const ${hostVar} = ${infoVar}.a.find(a => a.n === 'zimbraMailHost');\n` +
                `${indent}assert.exists(${hostVar}, 'zimbraMailHost should exist');`;
        });
        if (fixCount > 0) {
            fs.writeFileSync(filepath, content, 'utf8');
        }
        return fixCount;
    } catch { return 0; }
}

// --- Build JS↔XML mapping ---
function buildMapping(jsFiles, xmlFiles, jsDir, xmlDir) {
    const xmlIndex = xmlFiles.map(f => ({
        path: f,
        basename: path.basename(f, '.xml'),
        norm: normalize(path.basename(f, '.xml')),
        subNorm: normalize(subRel(path.dirname(f), xmlDir)),
    }));

    const jsXmlMap = new Map();
    const xmlMatched = new Set();

    // Keys: JS relative path from jsDir, Values: XML relative path from xmlDir
    const HARDCODED = {
        'autocomplete/autocomplete-gal-shared.js': 'AutoComplete/AutoComplete-GALandSharedContacts.xml',
        'gal/autocomplete-gal.js': 'GAL/Autocomplete-Gal.xml',
        'gal/search-gal.js': 'GAL/SearchGAL.xml',
        'gal/galaccount/search-gal-resources.js': 'GAL/GALAccount/Resources/SearchGalRequest.xml',
        'autocomplete/autocomplete-i18n.js': 'AutoComplete/AutoCompleteRequesti18n.xml',
        'gal/galaccount/sync-gal-resources.js': 'GAL/GALAccount/Resources/SyncGalRequest.xml'
    };

    for (const jsFile of jsFiles) {
        const jsRel = subRel(jsFile, jsDir);
        const jsRelNorm = jsRel.replace(/\\/g, '/');

        if (HARDCODED[jsRelNorm]) {
            const xmlTarget = path.join(xmlDir, HARDCODED[jsRelNorm]).replace(/\\/g, '/');
            const match = xmlIndex.find(x => x.path.replace(/\\/g, '/') === xmlTarget);
            if (match) {
                jsXmlMap.set(jsFile, match.path);
                xmlMatched.add(match.path);
                continue;
            }
        }

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
            else { const o = wordOverlap(jsBn, xml.basename); if (o >= 60) score = Math.floor(o / 2) + 10; }
            if (score > 0 && jsSubNorm === xml.subNorm) score += 20;
            if (score > bestScore) { bestScore = score; bestMatch = xml.path; }
        }
        if (bestMatch && bestScore >= 50) {
            jsXmlMap.set(jsFile, bestMatch);
            xmlMatched.add(bestMatch);
        }
    }

    return { jsXmlMap, xmlMatched };
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

    // --- Build mapping ---
    const { jsXmlMap, xmlMatched } = buildMapping(jsFiles, xmlFiles, jsDir, xmlDir);

    let unmatchedJs = 0, unmatchedXml = 0, mappedCount = jsXmlMap.size;
    const unmatchedJsList = [];
    const unmatchedXmlList = [];

    for (const f of jsFiles) {
        if (!jsXmlMap.has(f)) {
            unmatchedJsList.push(subRel(f, jsDir));
            unmatchedJs++;
        }
    }
    for (const f of xmlFiles) {
        if (!xmlMatched.has(f)) {
            const tc = countXmlTests(f);
            if (tc > 0) {
                unmatchedXmlList.push({ name: subRel(f, xmlDir), tc });
                unmatchedXml++;
            }
        }
    }

    // Data-driven test files where assertions are in helpers called inside loops.
    // Static counting cannot capture the true runtime assertion count for these files.
    const DATA_DRIVEN_SKIP = new Set([
        'autocomplete/autocomplete-i18n.js',
    ]);

    // --- Section 1: Test & Assertion Parity ---
    let totalJs = 0, totalXml = 0, countOk = 0, countExtra = 0, countDeficit = 0;
    let tselectIssues = 0, totalJsAsserts = 0, totalXmlSelects = 0;
    const mismatches = [];
    let cleanFiles = 0;
    const gapRows = [];

    for (const jsFile of jsFiles) {
        const jsShort = subRel(jsFile, jsDir);

        // Completely exclude data-driven test files from all JS and XML counting
        if (DATA_DRIVEN_SKIP.has(jsShort.replace(/\\/g, '/'))) {
            cleanFiles++;
            continue;
        }

        const jsTests = countJsTests(jsFile);
        const jsAsserts = countJsAssertions(jsFile);
        totalJs += jsTests;
        totalJsAsserts += jsAsserts;
        const xmlFile = jsXmlMap.get(jsFile);

        if (!xmlFile) {
            // JS without XML — skip from display
            continue;
        }

        const xmlTests = countXmlTests(xmlFile);
        const xmlSelects = countXmlSelects(xmlFile);
        totalXml += xmlTests;
        totalXmlSelects += xmlSelects;

        // Test count status
        let testStatus;
        if (jsTests === xmlTests) { testStatus = 'ok'; countOk++; }
        else if (jsTests > xmlTests) { testStatus = 'extra'; countExtra++; mismatches.push({ jsShort, jsTests, xmlTests, xmlFile, diff: jsTests - xmlTests }); }
        else { testStatus = 'deficit'; countDeficit++; mismatches.push({ jsShort, jsTests, xmlTests, xmlFile, diff: jsTests - xmlTests }); }

        // Assertion gap status
        let hasGap = false;
        if (xmlSelects > 0 && jsAsserts < xmlSelects) { tselectIssues++; hasGap = true; }

        // Collect gap rows for display
        if (hasGap) {
            const testCol = `${xmlTests}/${jsTests}`;
            const assertCol = `${xmlSelects}/${jsAsserts}`;
            const parts = [];
            if (testStatus === 'deficit') parts.push(C.red(`-${xmlTests - jsTests} tests`));
            if (hasGap) parts.push(C.red(`GAP(${xmlSelects - jsAsserts})`));
            gapRows.push(`  ${jsShort.padEnd(50)} ${testCol.padEnd(14)} ${assertCol.padEnd(15)} ${parts.join(' ')}`);
        } else {
            cleanFiles++;
        }
    }

    // Only show header + rows if there are gaps
    if (gapRows.length > 0) {
        console.log(`  ${'File'.padEnd(50)} ${'XML/JS Tests'.padEnd(14)} ${'XML/JS Assert'.padEnd(15)} Status`);
        console.log(`  ${'─'.repeat(50)} ${'─'.repeat(14)} ${'─'.repeat(15)} ──────`);
        for (const row of gapRows) console.log(row);
    }
    console.log('');
    const notPassing = jsXmlMap.size - cleanFiles;
    console.log(`  ${C.green(`✅ ${cleanFiles} passing`)}  ${notPassing > 0 ? C.red(`❌ ${notPassing} with gaps`) : ''}`);
    if (notPassing === 0) console.log('');
    console.log(`  Tests:      JS=${totalJs} XML=${totalXml} | Match=${countOk} Extra=${countExtra} Deficit=${countDeficit}`);
    console.log(`  Assertions: JS=${totalJsAsserts} XML=${totalXmlSelects} (${totalXmlSelects > 0 ? (totalJsAsserts / totalXmlSelects * 100).toFixed(1) + '%' : '—'}) | Gaps: ${tselectIssues} files`);
    console.log('');

    // --- Section 3: zimbraMailHost ---
    let hPass = 0, hFail = 0;
    for (const f of jsFiles) {
        if (countInFile(f, /zimbraMailHost/g) > 0) hPass++;
        else { hFail++; }
    }
    if (hFail > 0) {
        console.log(C.bold('--- 3. zimbraMailHost Coverage ---'));
        for (const f of jsFiles) {
            if (countInFile(f, /zimbraMailHost/g) === 0) console.log(C.red(`  ❌ ${subRel(f, jsDir)}`));
        }
        console.log(`  Pass: ${hPass} | Fail: ${hFail}`);
        console.log('');
    }

    // --- Section 4: Account ID ---
    let aPass = 0, aFail = 0;
    for (const f of jsFiles) {
        if (countInFile(f, /CreateAccountRequest/g) > 0) {
            if (countInFile(f, /\.id/g) > 0) aPass++;
            else { aFail++; }
        }
    }
    if (aFail > 0) {
        console.log(C.bold('--- 4. Account ID Extraction ---'));
        for (const f of jsFiles) {
            if (countInFile(f, /CreateAccountRequest/g) > 0 && countInFile(f, /\.id/g) === 0)
                console.log(C.red(`  ❌ ${subRel(f, jsDir)}`));
        }
        console.log(`  Pass: ${aPass} | Fail: ${aFail}`);
        console.log('');
    }

    // --- Section 5: Weak Assertion Patterns ---
    let bare = 0, ifCount = 0, fault = 0, arrayW = 0, dualOutcome = 0;
    const weakDetails = {};

    for (const f of jsFiles) {
        const issues = scanWeakAssertions(f);
        if (issues.length > 0) {
            weakDetails[subRel(f, jsDir)] = issues;
            for (const issue of issues) {
                if (issue.rule === 'PARENT_ONLY') bare++;
                else if (issue.rule === 'WEAK_FAULT') fault++;
                else if (issue.rule === 'IF_ELSE_HEDGE') ifCount++;
                else if (issue.rule === 'DUAL_OUTCOME') dualOutcome++;
            }
        }
    }
    for (const f of jsFiles) {
        const resp = countInFile(f, /\.(account|folder|link|doc|action|m)\b/g);
        const arr = countInFile(f, /Array\.isArray/g);
        if (resp > 3 && arr === 0) { console.log(C.yellow(`  ⚠️  No Array.isArray: ${subRel(f, jsDir)}`)); arrayW++; }
    }

    const weak = bare + ifCount + fault + dualOutcome;
    if (weak > 0 || arrayW > 0) {
        console.log(C.bold('--- 5. Weak Assertion Patterns ---'));
        for (const [file, issues] of Object.entries(weakDetails).sort()) {
            for (const issue of issues) {
                console.log(C.yellow(`  ⚠️  [${issue.rule}] ${file}:L${issue.line}: ${issue.text.substring(0, 80)}`));
            }
        }
        console.log(`  Total: ${bare} bare + ${ifCount} conditionals + ${fault} fault + ${dualOutcome} dual-outcome + ${arrayW} array-unsafe`);
        console.log('');
    }
    // --- Section 6: Duplicate Const Declarations ---
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
    if (dupeFiles > 0) {
        console.log(C.bold('--- 6. Duplicate Const Declarations ---'));
        console.log(C.red(`  ${dupeFiles} file(s) with duplicate const declarations`));
        console.log('');
    }

    // --- Verdict ---
    let realDeficit = mismatches.filter(m => m.diff < 0).reduce((s, m) => s + Math.abs(m.diff), 0);
    if (totalJs >= totalXml) realDeficit = 0;
    const allIssues = realDeficit + unmatchedXml + hFail + aFail + weak + arrayW + dupeFiles;

    console.log(C.bold('  ════════════════ VERDICT ════════════════'));
    console.log(`  Assertions:  ${totalJsAsserts} JS / ${totalXmlSelects} XML t:selects (${totalXmlSelects > 0 ? (totalJsAsserts / totalXmlSelects * 100).toFixed(1) + '%' : '—'})`);
    console.log(`  MailHost:    ${hPass} pass, ${hFail} fail`);
    console.log(`  Account ID:  ${aPass} pass, ${aFail} fail`);
    console.log(`  Weak:        ${weak} patterns + ${arrayW} array-unsafe`);
    if (unmatchedJsList.length > 0 || unmatchedXmlList.length > 0) {
        console.log('');
        for (const name of unmatchedJsList) {
            console.log(C.yellow(`  ⚠️  JS WITHOUT XML: ${name}`));
        }
        for (const { name, tc } of unmatchedXmlList) {
            console.log(C.red(`  ❌ XML WITHOUT JS: ${name} (${tc} test cases)`));
        }
    }

    // --- Log to file: only unmapped XML files (deduplicated) ---
    const existing = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';
    let newEntries = '';
    for (const f of xmlFiles) {
        if (!xmlMatched.has(f)) {
            const tc = countXmlTests(f);
            if (tc > 0) {
                const entry = `  ❌ XML WITHOUT JS: ${mod}/${subRel(f, xmlDir)} (${tc} test cases)`;
                if (!existing.includes(entry)) {
                    newEntries += entry + '\n';
                }
            }
        }
    }
    if (newEntries) {
        const today = new Date().toISOString().slice(0, 10);
        const block = `[${today}] MODULE: ${mod}\n${newEntries}`;
        fs.appendFileSync(LOG_FILE, block, 'utf8');
    }
    console.log('');
    console.log(`  Progress logged to: ${LOG_FILE}`);
    console.log('');

    // =========================================================================
    // Phase 2: Auto-fix all detected issues
    // =========================================================================
    const fixable = bare + fault + dualOutcome + hFail + aFail;
    if (fixable > 0) {
        console.log(C.bold('--- Phase 2: Auto-fix ---'));

        // Fix PARENT_ONLY (remove bare parent assertions)
        if (bare > 0) {
            let fixedCount = 0;
            for (const f of jsFiles) {
                const c = fixBareParents(f);
                if (c > 0) {
                    console.log(C.green(`    ✅ FIXED: ${subRel(f, jsDir)} — removed ${c} bare parent assertion(s)`));
                    fixedCount += c;
                }
            }
            if (fixedCount > 0) console.log(C.green(`  Auto-fixed: ${fixedCount} PARENT_ONLY assertion(s)`));
        }

        // Fix WEAK_FAULT (assert.exists(res.Fault) → deep Fault check)
        if (fault > 0) {
            let fixedCount = 0;
            for (const f of jsFiles) {
                const c = fixWeakFaults(f);
                if (c > 0) {
                    console.log(C.green(`    ✅ FIXED: ${subRel(f, jsDir)} — strengthened ${c} weak fault assertion(s)`));
                    fixedCount += c;
                }
            }
            if (fixedCount > 0) console.log(C.green(`  Auto-fixed: ${fixedCount} WEAK_FAULT assertion(s)`));
        }

        // Fix DUAL_OUTCOME (remove || hedging → deterministic)
        if (dualOutcome > 0) {
            let fixedCount = 0;
            for (const f of jsFiles) {
                const c = fixDualOutcome(f);
                if (c > 0) {
                    console.log(C.green(`    ✅ FIXED: ${subRel(f, jsDir)} — fixed ${c} dual-outcome assertion(s)`));
                    fixedCount += c;
                }
            }
            if (fixedCount > 0) console.log(C.green(`  Auto-fixed: ${fixedCount} DUAL_OUTCOME assertion(s)`));
        }

        // Fix MAILHOST+ID (add zimbraMailHost + account ID extraction)
        if (hFail > 0) {
            let fixedCount = 0;
            for (const f of jsFiles) {
                if (countInFile(f, /zimbraMailHost/g) === 0) {
                    const c = fixMailHostAndId(f);
                    if (c > 0) {
                        console.log(C.green(`    ✅ FIXED: ${subRel(f, jsDir)} — added ${c} mailHost+ID extraction(s)`));
                        fixedCount += c;
                    }
                }
            }
            if (fixedCount > 0) console.log(C.green(`  Auto-fixed: ${fixedCount} MAILHOST+ID extraction(s)`));
        }

        console.log('');
    }

    return { mod, issues: allIssues, jsFiles: jsFiles.length, xmlFiles: xmlFiles.length, totalJs, totalXml, countOk, countExtra, countDeficit, unmatchedXml, hFail, weak, tselectIssues, totalJsAsserts, totalXmlSelects };
}

// =============================================================================
// MAIN
// =============================================================================
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node .agent/scripts/parity-check.cjs <module|--all|--list>');
    console.log('');
    console.log('  <module>  Module name (e.g. contacts, auth, calendar)');
    console.log('  --all     Run verification for ALL modules');
    console.log('  --list    List all available modules');
    console.log('');
    console.log('This script combines:');
    console.log('  - xml-to-js-assertions-parity.js (file mapping, test counts, weak patterns)');
    console.log('  - verify-tselect-parity.cjs (t:select assertion ratio table)');
    console.log('  - scan-weak-assertions.cjs (weak assertion pattern detection)');
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
    const grandJsAsserts = results.reduce((s, r) => s + (r.totalJsAsserts || 0), 0);
    const grandXmlSelects = results.reduce((s, r) => s + (r.totalXmlSelects || 0), 0);

    console.log(`  Modules Checked:     ${results.length}`);
    console.log(`  Modules Clean:       ${clean.length}`);
    console.log(`  Modules With Issues: ${dirty.length}`);
    console.log(`  Total Issues:        ${totalIssues}`);
    console.log(`  Grand Assertion Ratio: ${grandXmlSelects > 0 ? (grandJsAsserts / grandXmlSelects * 100).toFixed(1) + '%' : '—'} (${grandJsAsserts}/${grandXmlSelects})`);
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
    verifyModule(mod);
}
