const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, '..', '..', 'mocha', 'tests');
const modules = ['admin', 'prefs', 'mail-client', 'folders', 'ews', 'search', 'rest-servlet', 'auth', 'ical', 'sync', 'sanity-test'];

function getJsFiles(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(getJsFiles(fullPath));
      } else if (entry.name.endsWith('.js')) {
        results.push(fullPath);
      }
    }
  } catch (e) { }
  return results;
}

console.log('Module | Total | HasAcctResp | HasMailHost | Missing');
console.log('-------|-------|-------------|------------|--------');

let totalMissing = 0;
let missingFiles = [];

for (const mod of modules) {
  const modDir = path.join(testsDir, mod);
  const files = getJsFiles(modDir);
  let hasAcctResp = 0;
  let hasMailHost = 0;
  let missing = [];

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const hasCreateAcct = content.includes('CreateAccountResponse');
    const hasHost = content.includes('zimbraMailHost');

    if (hasCreateAcct) hasAcctResp++;
    if (hasHost) hasMailHost++;

    if (hasCreateAcct && !hasHost) {
      missing.push(path.relative(testsDir, f));
    }
  }

  console.log(`${mod} | ${files.length} | ${hasAcctResp} | ${hasMailHost} | ${missing.length}`);
  totalMissing += missing.length;
  missingFiles = missingFiles.concat(missing);
}

console.log(`\nTotal missing: ${totalMissing}`);
console.log('\nFiles needing zimbraMailHost:');
missingFiles.forEach(f => console.log(`  ${f}`));
