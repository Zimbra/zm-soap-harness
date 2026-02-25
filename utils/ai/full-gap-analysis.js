const fs = require('fs');
const path = require('path');

const xmlDir = 'data/soapvalidator/Admin/Accounts';
const jsDir = 'mocha/tests/admin/accounts';

// Manual map of XML files to JS files
const fileMap = {
    'Account-Alias-Add.xml': 'account-alias-add.js',
    'Account-Alias-Remove.xml': 'account-alias-remove.js',
    'Account-Count.xml': 'account-count.js',
    'Account-Create-Sphchar.xml': 'create-account-sphchar.js',
    'Account-Create01.xml': 'create-account-01.js',
    'Account-Create02.xml': 'create-account-02.js',
    'Account-Create03.xml': 'create-account-03.js',
    'Account-Create04.xml': 'create-account-04.js',
    'Account-Create05.xml': 'create-account-05.js',
    'Account-Create06.xml': 'create-account-06.js',
    'Account-Create07.xml': 'create-account-07.js',
    'Account-Delete.xml': 'account-delete.js',
    'Account-Device-Reminder-Set-Unset.xml': 'account-device-reminder.js',
    'Account-Get.xml': 'account-get.js',
    'Account-Getinfo.xml': 'account-getinfo.js',
    'Account-Getmembership.xml': 'account-getmembership.js',
    'Account-Rename.xml': 'account-rename.js',
    'AccountLoggerRequest.xml': 'account-logger.js',
    'AccountRequest.xml': 'account-request.js',
    'Accounts-Loop.xml': 'accounts-loop.js',
    'Bug39720.xml': 'bug-39720.js',
    'CountAccountRequest.xml': 'count-account-request.js',
    'CreateAccountMulitnode1.xml': 'create-account-multinode-1.js',
    'CreateAccountMulitnode2.xml': 'create-account-multinode-2.js',
    'CreateAccountMulitnode3.xml': 'create-account-multinode-3.js',
    'GetAccountMultinode.xml': 'get-account-multinode.js',
    'GetAllAdminAccountsRequest.xml': 'get-all-admin-accounts.js',
    'Modify-Account01.xml': 'modify-account-01.js',
    'Modify-Account02.xml': 'modify-account-02.js',
    'Modify-Account03.xml': 'modify-account-03.js',
    'Modify-Account04.xml': 'modify-account-04.js',
    'Modify-Account05.xml': 'modify-account-05.js',
    'ReloadAccountRequest_Basic.xml': 'reload-account-request.js',
    // Subdirectories
    'AddressBookSizeLimit/Addressbook-Size-Limit.xml': 'addressbooksizelimit/addressbook-size-limit.js',
    'COS/Account-Create.xml': 'cos/account-create.js',
    'ForeignPrincipal/Account-Create.xml': 'foreignprincipal/account-create.js',
    'ForeignPrincipal/Account-Get.xml': 'foreignprincipal/account-get.js',
    'ForeignPrincipal/Account-Getmembership.xml': 'foreignprincipal/account-getmembership.js',
    'ForeignPrincipal/Account-Modify.xml': 'foreignprincipal/account-modify.js',
    'ForeignPrincipal/BackupRequest.xml': 'foreignprincipal/backup-request.js',
    'ForeignPrincipal/Resource-Create.xml': 'foreignprincipal/resource-create.js',
    'ForeignPrincipal/Resource-Get.xml': 'foreignprincipal/resource-get.js',
    'ForeignPrincipal/Resource-Modify.xml': 'foreignprincipal/resource-modify.js',
    'ForeignPrincipal/SearchDirectoryRequest.xml': 'foreignprincipal/search-directory-request.js',
    'LastLogon/AuthRequest.xml': 'lastlogon/auth-request.js',
    'LastLogon/ForeignPrincipal-AuthRequest.xml': 'lastlogon/foreign-principal-auth-request.js',
    'LastLogon/GetAccountRequest.xml': 'lastlogon/get-account-request.js',
    'LastLogon/Preauth-AuthRequest.xml': 'lastlogon/preauth-auth-request.js',
    'Multihost/Multihost-Account-Create.xml': 'multihost/multihost-account-create.js',
    'Quota/ZimbraQuotaWarnMessage.xml': 'quota/zimbra-quota-warn-message.js',
};

// Also check for XML files not in the map
const allXmlFiles = [];
function findXml(dir) {
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) findXml(full);
        else if (f.endsWith('.xml')) allXmlFiles.push(path.relative(xmlDir, full).replace(/\\/g, '/'));
    }
}
findXml(xmlDir);

const mappedXml = new Set(Object.keys(fileMap).map(k => k.replace(/\\/g, '/')));
const unmapped = allXmlFiles.filter(f => !mappedXml.has(f));
if (unmapped.length > 0) {
    console.log('=== UNMAPPED XML FILES (no JS counterpart) ===');
    unmapped.forEach(f => console.log('  ' + f));
    console.log('');
}

// Extract XML test objectives (skip type="always")
function getXmlObjectives(xmlPath) {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const results = [];
    const tcRegex = /<t:test_case[^>]*type="([^"]+)"[^>]*>[\s\S]*?<t:objective>([\s\S]*?)<\/t:objective>/g;
    let m;
    while ((m = tcRegex.exec(xml)) !== null) {
        const type = m[1].trim().toLowerCase();
        const obj = m[2].trim().replace(/\s+/g, ' ');
        if (type !== 'always') results.push({ type, obj });
    }
    return results;
}

// Extract JS it() names
function getJsTests(jsPath) {
    const js = fs.readFileSync(jsPath, 'utf8');
    const results = [];
    const itRegex = /it\('((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = itRegex.exec(js)) !== null) {
        results.push(m[1].replace(/\\'/g, "'"));
    }
    return results;
}

// Normalize for comparison
function normalize(s) {
    return s.replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim().toLowerCase();
}

let totalMissing = 0;
const report = [];

for (const [xmlFile, jsFile] of Object.entries(fileMap)) {
    const xmlPath = path.join(xmlDir, xmlFile);
    const jsPath = path.join(jsDir, jsFile);

    if (!fs.existsSync(xmlPath)) { report.push(`SKIP: ${xmlFile} not found`); continue; }
    if (!fs.existsSync(jsPath)) { report.push(`SKIP: ${jsFile} not found`); continue; }

    const xmlTests = getXmlObjectives(xmlPath);
    const jsTests = getJsTests(jsPath);

    // Normalize JS names (strip type prefix)
    const jsNormalized = new Set(jsTests.map(t => normalize(t.replace(/^(Smoke|Sanity|Functional|Regression) \| /, ''))));

    const missing = xmlTests.filter(t => !jsNormalized.has(normalize(t.obj)));

    if (missing.length > 0) {
        report.push(`\n${xmlFile} -> ${jsFile} (XML=${xmlTests.length}, JS=${jsTests.length})`);
        report.push(`  MISSING ${missing.length} test(s):`);
        missing.forEach(t => report.push(`    [${t.type}] ${t.obj}`));
        totalMissing += missing.length;
    }
}

if (totalMissing === 0) {
    report.push('\n✅ All XML test objectives have corresponding JS it() blocks!');
} else {
    report.push(`\n⚠ Total missing: ${totalMissing} test(s)`);
}

const output = report.join('\n');
console.log(output);
fs.writeFileSync('utils/ai/gap-analysis-report.txt', output, 'utf8');
