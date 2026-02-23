const fs = require('fs');
const path = require('path');

const mappings = [
    { js: 'mocha/tests/admin/accounts/create-account-03.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Create.xml' },
    { js: 'mocha/tests/admin/accounts/create-account-04.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Create03.xml' },
    { js: 'mocha/tests/admin/accounts/create-account-05.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Create04.xml' },
    { js: 'mocha/tests/admin/accounts/create-account-06.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Create05.xml' },
    { js: 'mocha/tests/admin/accounts/create-account-07.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Create06.xml' },
    { js: 'mocha/tests/admin/accounts/create-account-08.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Create07.xml' },
    { js: 'mocha/tests/admin/accounts/account-modify-01.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Modify01.xml' },
    { js: 'mocha/tests/admin/accounts/account-modify-02.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Modify02.xml' },
    { js: 'mocha/tests/admin/accounts/account-modify-03.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Modify03.xml' },
    { js: 'mocha/tests/admin/accounts/account-modify-04.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Modify04.xml' },
    { js: 'mocha/tests/admin/accounts/account-modify-05.js', xml: 'data/soapvalidator/Admin/Accounts/Account-Modify05.xml' }
];

console.log('File Name | JS it() Count | XML <t:test_case> Count | Discrepancy');
console.log('---|---|---|---');

mappings.forEach(m => {
    if (!fs.existsSync(m.js) || !fs.existsSync(m.xml)) return;

    const jsContent = fs.readFileSync(m.js, 'utf8');
    const xmlContent = fs.readFileSync(m.xml, 'utf8');

    // Count it() blocks starting with Smoke/Sanity/Functional/Regression
    const jsCount = (jsContent.match(/it\(['"](Smoke|Sanity|Functional|Regression)/g) || []).length;

    // Count <t:test_case tags
    const xmlCount = (xmlContent.match(/<t:test_case/g) || []).length;

    console.log(`${path.basename(m.js)} | ${jsCount} | ${xmlCount} | ${jsCount - xmlCount}`);
});
