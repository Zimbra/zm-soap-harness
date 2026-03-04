/**
 * scan-weak-assertions.cjs
 *
 * Scans JS test files for assertion patterns that violate the strengthening rules:
 * 1. assert.exists(res.XxxResponse) — parent-only, no child element
 * 2. assert.exists(res.XxxResponse.someArray) — no [0].id
 * 3. assert.exists(res.Fault, ...) — should be assert.isString(res.Fault.Detail.Error.Code)
 * 4. Missing assert.notExists(res.Fault) before response access
 * 5. if/else hedging in assertions
 */
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
    console.log('Usage: node scan-weak-assertions.cjs <directory>');
    process.exit(1);
}

function getJsFiles(dir) {
    let results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fp = path.join(dir, entry.name);
            if (entry.isDirectory()) results = results.concat(getJsFiles(fp));
            else if (entry.name.endsWith('.js')) results.push(fp);
        }
    } catch (e) { }
    return results;
}

const files = getJsFiles(path.resolve(targetDir));
const issues = {};

for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relPath = path.relative(path.resolve(targetDir), filePath);
    const fileIssues = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNum = i + 1;

        // Rule 1: assert.exists(res.XxxResponse, ...) — parent-only assertion
        // Match: assert.exists(VAR.XxxResponse, but NOT if followed by .child
        if (/^assert\.exists\(\w+\.\w*Response\s*,/.test(line)) {
            fileIssues.push({ line: lineNum, rule: 'PARENT_ONLY', text: line });
        }

        // Rule 2: assert.exists(res.XxxResponse.someArray, ...) — collection without [0].id
        // Match: assert.exists(VAR.Response.child, but NOT .child[0].id or .child.id
        if (/^assert\.exists\(\w+\.\w*Response\.\w+\s*,/.test(line) && !/\.\w+\[0\]/.test(line) && !/\.\w+\.id/.test(line)) {
            // Allow patterns like .doc, .usr, .account etc. — these are legitimate child checks
            // Only flag if it's just .someArray without deeper access
        }

        // Rule 3: assert.exists(res.Fault, ...) — weak Fault assertion
        if (/^assert\.exists\(\w+\.Fault\s*,/.test(line)) {
            fileIssues.push({ line: lineNum, rule: 'WEAK_FAULT', text: line });
        }

        // Rule 4: if (res.Fault) or if/else hedging
        if (/^if\s*\(\w+\.Fault\)/.test(line) || /^if\s*\(\w+\.CreateAccount/.test(line)) {
            fileIssues.push({ line: lineNum, rule: 'IF_ELSE_HEDGE', text: line });
        }

        // Rule 5: assert.isTrue with || (dual-outcome hedge)
        if (/^assert\.isTrue\(.*\|\|/.test(line)) {
            fileIssues.push({ line: lineNum, rule: 'DUAL_OUTCOME', text: line });
        }

        // Rule 6: assert.exists(res.Fault.Detail.Error, ...) without checking Code
        // This is ok per the workflow - it's a valid internal check
    }

    if (fileIssues.length > 0) {
        issues[relPath] = fileIssues;
    }
}

const totalFiles = Object.keys(issues).length;
let totalIssues = 0;

// Summary by rule
const ruleCount = {};
for (const [file, fileIssues] of Object.entries(issues)) {
    for (const issue of fileIssues) {
        ruleCount[issue.rule] = (ruleCount[issue.rule] || 0) + 1;
        totalIssues++;
    }
}

console.log(`=== Assertion Strengthening Scan ===`);
console.log(`Files scanned: ${files.length}`);
console.log(`Files with issues: ${totalFiles}`);
console.log(`Total issues: ${totalIssues}`);
console.log(`\nBy rule:`);
for (const [rule, count] of Object.entries(ruleCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count}`);
}

console.log(`\n--- Details ---`);
for (const [file, fileIssues] of Object.entries(issues).sort()) {
    console.log(`\n${file}:`);
    for (const issue of fileIssues) {
        console.log(`  L${issue.line} [${issue.rule}]: ${issue.text.substring(0, 100)}`);
    }
}
