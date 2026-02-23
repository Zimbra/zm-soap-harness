const fs = require('fs');
const path = require('path');

const files = [
    'tests/admin/accounts/foreignprincipal/account-get.js',
    'tests/admin/accounts/foreignprincipal/account-modify.js',
    'tests/admin/accounts/foreignprincipal/search-directory-request.js',
    'tests/admin/accounts/lastlogon/get-account-request.js',
    'tests/admin/accounts/account-request.js',
    'tests/admin/accounts/account-alias-add.js',
];

for (const f of files) {
    let txt = fs.readFileSync(f, 'utf8');
    let orig = txt;

    // R1: X.CreateAccountResponse.account[0].id -> safe access
    txt = txt.replace(
        /(\w+)\.CreateAccountResponse\.account\[0\]\.id/g,
        (_, v) => `(Array.isArray(${v}.CreateAccountResponse?.account) ? ${v}.CreateAccountResponse.account[0].id : ${v}.CreateAccountResponse?.account?.id)`
    );

    // R2: X.GetAccountResponse.account[0].id -> safe access
    txt = txt.replace(
        /(\w+)\.GetAccountResponse\.account\[0\]\.id/g,
        (_, v) => `(Array.isArray(${v}.GetAccountResponse?.account) ? ${v}.GetAccountResponse.account[0].id : ${v}.GetAccountResponse?.account?.id)`
    );

    if (txt !== orig) {
        fs.writeFileSync(f, txt, 'utf8');
        console.log('Fixed:', f);
    } else {
        console.log('No changes:', f);
    }
}
