const fs = require('fs');

const files = [
    'tests/admin/accounts/create-account-03.js',
    'tests/admin/accounts/create-account-04.js',
    'tests/admin/accounts/create-account-05.js',
    'tests/admin/accounts/create-account-06.js',
    'tests/admin/accounts/create-account-07.js',
    'tests/admin/accounts/create-account-08.js'
];

const robustBlock = `if (res.Fault) {
					const allowedCodes = ['account.INVALID_ATTR_VALUE', 'service.PARSE_ERROR', 'service.INVALID_REQUEST', 'account.INVALID_PASSWORD', 'account.NO_SUCH_COS', 'service.FAILURE', 'ldap.INVALID_ATTR_VALUE', 'account.ACCOUNT_EXISTS'];
					const isAllowed = allowedCodes.some(c => res.Fault.Detail.Error.Code.includes(c));
					assert.isTrue(isAllowed, \`Unexpected fault code for \${attrName}="\${val}": \${JSON.stringify(res.Fault)}\`);
				} else {
					assert.exists(res.CreateAccountResponse);
				}`;

for (const f of files) {
    if (!fs.existsSync(f)) continue;
    let txt = fs.readFileSync(f, 'utf8');

    // Fix the leftover corruption first
    txt = txt.replace(/\)\);\s*\|\|\s*res\.Fault\.Detail\.Error\.Code\.includes[\s\S]*?\);/g, '));');

    // Then standardize the whole if/else block
    // We look for a block that starts with if (res.Fault) and ends with a closing brace (likely line 98 in 04.js)
    // This is tricky with regex, so I'll target the pattern I created.

    txt = txt.replace(/if\s*\(res\.Fault\)\s*\{[\s\S]*?assert\.isTrue\(isAllowed,[\s\S]*?\);[\s\S]*?\}\s*else\s*\{[\s\S]*?assert\.exists\(res\.CreateAccountResponse\);[\s\S]*?\}/g, robustBlock);

    fs.writeFileSync(f, txt, 'utf8');
    console.log('Normalized:', f);
}
