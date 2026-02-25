const fs = require('fs');
const path = require('path');

function capFirst(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function processXMLFile(xmlFile, outJsFile, descName) {
    console.log(`Processing ${xmlFile} -> ${outJsFile}`);
    let xml = fs.readFileSync(xmlFile, 'utf8');

    // Strip XML comments so we don't parse disabled tests
    xml = xml.replace(/<!--[\s\S]*?-->/g, '');

    const testCases = xml.split('</t:test_case>');

    let jsLines = [];
    jsLines.push(`import { assert } from 'chai';`);
    jsLines.push(`import config from '../../../conf/config.js';`);
    jsLines.push(`import soap from '../../../framework/backend/soap-client.js';`);
    jsLines.push(`import { main } from '../../../pages/main.js';`);
    jsLines.push(``);
    jsLines.push(`describe('Admin > Accounts > ${descName}', function () {`);
    jsLines.push(`\tthis.timeout(30 * 1000);`);
    jsLines.push(`\tlet adminAuth;`);

    // Variables we might discover during setup
    const isUsed = (name) => new RegExp('\\b' + name + '\\b').test(xml);
    const isObjUsed = (name) => new RegExp('\\b' + name + '\\.(id|server)\\b').test(xml);

    if (isObjUsed('test_accountid')) jsLines.push(`\tlet test_accountid = { id: '' };`);
    if (isObjUsed('account1')) jsLines.push(`\tlet account1 = { server: '' };`);
    for (let i = 1; i <= 200; i++) {
        if (isObjUsed(`status${i}`)) jsLines.push(`\tlet status${i} = { server: '', id: '' };`);
        if (isObjUsed(`test_account${i}`)) jsLines.push(`\tlet test_account${i} = { server: '', id: '' };`);
    }
    if (isObjUsed('test_account')) jsLines.push(`\tlet test_account = { id: '' };`);
    for (let i = 1; i <= 200; i++) {
        if (isUsed(`test_account${i}`)) jsLines.push(`\tlet test_account${i}_name;`);
    }
    if (isUsed('account1')) jsLines.push(`\tlet account1_name;`);
    if (isUsed('account2')) jsLines.push(`\tlet account2_name;`);
    if (isUsed('domain1')) jsLines.push(`\tlet domain1_name;`);
    if (isUsed('domain2')) jsLines.push(`\tlet domain2_name;`);
    if (isUsed('test_nouser')) jsLines.push(`\tlet test_nouser_name;`);
    for (let i = 1; i <= 10; i++) {
        if (isUsed(`status${i}`)) jsLines.push(`\tlet status${i}_name;`);
    }
    const SETUP_RES_MARKER = '___SETUP_RES_MARKER___';
    let setupResUsed = false;
    jsLines.push(SETUP_RES_MARKER);
    jsLines.push(``);
    jsLines.push(`\tbefore(async function () {`);
    jsLines.push(`\t\tawait main.before(this.ctx);`);
    jsLines.push(`\t\tadminAuth = await soap.getAdminAuthToken();`);
    for (let i = 1; i <= 200; i++) {
        if (isUsed(`test_account${i}`)) jsLines.push(`\t\ttest_account${i}_name = \`test${i}.\${Date.now()}.\${Math.floor(Math.random() * 1000)}@\${config.testDomain}\`;`);
    }
    if (isUsed('account1')) jsLines.push(`\t\taccount1_name = \`test.\${Date.now()}.\${Math.floor(Math.random() * 1000)}@\${config.testDomain}\`;`);
    if (isUsed('account2')) jsLines.push(`\t\taccount2_name = \`test.\${Date.now()}.\${Math.floor(Math.random() * 1000)}@\${config.testDomain}\`;`);
    if (isUsed('domain1')) jsLines.push(`\t\tdomain1_name = \`domain1.\${Date.now()}.\${Math.floor(Math.random() * 1000)}.\${config.testDomain}\`;`);
    if (isUsed('domain2')) jsLines.push(`\t\tdomain2_name = \`domain2.\${Date.now()}.\${Math.floor(Math.random() * 1000)}.\${config.testDomain}\`;`);
    if (isUsed('test_nouser')) jsLines.push(`\t\ttest_nouser_name = \`test_nouser\${Date.now()}\${Math.floor(Math.random() * 1000)}@\${config.testDomain}\`;`);
    for (let i = 1; i <= 10; i++) {
        if (isUsed(`status${i}`)) jsLines.push(`\t\tstatus${i}_name = \`test.\${Date.now()}.\${Math.floor(Math.random() * 1000)}@\${config.testDomain}\`;`);
    }

    // Parse type="always" for CreateAccountRequest setups
    for (const tc of testCases) {
        if (!tc.includes('<t:test_case')) continue;
        const typeMatch = tc.match(/type="([^"]+)"/);
        const type = typeMatch ? capFirst(typeMatch[1]) : 'Unknown';
        if (type.toLowerCase() === 'always') {
            const tests = tc.split('</t:test>');
            for (const t of tests) {
                if (!t.includes('<t:request')) continue;
                if (t.includes('PingRequest') || t.includes('AuthRequest') || t.includes('GrantRightRequest')) continue;

                let reqMatch = t.match(/<t:request[^>]*>([\s\S]*?)<\/t:request>/);
                if (!reqMatch) continue;
                let reqBody = reqMatch[1].trim();
                reqBody = reqBody.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&/g, '&amp;');
                reqBody = reqBody.replace(/\$\{defaultpassword\.value<\/password>/g, '\\${config.accountPassword}</password>');
                reqBody = reqBody.replace(/\$\{defaultpassword\.value\}/g, '${config.accountPassword}');
                reqBody = reqBody.replace(/\$\{defaultdomain\.name\}/g, '${config.testDomain}');
                reqBody = reqBody.replace(/\$\{admin\.user\}/g, '${config.adminEmailAddress}');
                reqBody = reqBody.replace(/\$\{admin\.password\}/g, '${config.adminPassword}');
                reqBody = reqBody.replace(/\$\{TIME\}/g, '${Date.now()}');
                reqBody = reqBody.replace(/\$\{COUNTER\}/g, '${Math.floor(Math.random() * 1000)}');
                reqBody = reqBody.replace(/\$\{test_account(\d+)\.name\}/g, '${test_account$1_name}');
                reqBody = reqBody.replace(/\$\{test_nouser\.name\}/g, '${test_nouser_name}');
                reqBody = reqBody.replace(/\$\{account1\.name\}/g, '${account1_name}');
                reqBody = reqBody.replace(/\$\{status(\d+)\.name\}/g, '${status$1_name}');
                reqBody = reqBody.replace(/\$\{account\.name\}/g, 'test${Date.now()}${Math.floor(Math.random() * 1000)}');

                // Escape remaining
                reqBody = reqBody.replace(/\$\{([^}]+)\}/g, (match, prefix) => {
                    if (prefix.startsWith('config.') || prefix.startsWith('Date.') || prefix.startsWith('Math.') || prefix.endsWith('_name') || prefix.match(/^test_account\d+\.id$/)) return match;
                    return `\\${match}`;
                });

                setupResUsed = true;
                jsLines.push(`\n\t\tsetupRes = await soap.makeSOAPEnvelopeAdmin(\n\t\t\t\`${reqBody}\`, adminAuth);`);

                // Look for t:select attribute extractions
                let resMatch = t.match(/<t:response[^>]*>([\s\S]*?)<\/t:response>/);
                if (resMatch) {
                    const s = resMatch[1];
                    let selectTags = s.match(/<t:select\s+[^>]+>/g);
                    if (selectTags) {
                        for (const st of selectTags) {
                            let pathMatch = st.match(/path\s*=\s*['"]([^'"]+)['"]/);
                            let attrMatch = st.match(/attr\s*=\s*['"]([^'"]+)['"]/);
                            let setMatch = st.match(/set\s*=\s*['"]([^'"]+)['"]/);
                            if (pathMatch && setMatch) {
                                // Extract and assign, e.g. test_accountid.id
                                const varName = setMatch[1];
                                if (varName.includes('.')) {
                                    const parts = varName.split('.');
                                    if (attrMatch && attrMatch[1] === 'id') {
                                        jsLines.push(`\t\t${varName} = Array.isArray(setupRes.CreateAccountResponse?.account) ?\n\t\t\tsetupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;`);
                                        jsLines.push(`\t\tif (!${varName}) {`);
                                        jsLines.push(`\t\t\tlet fallbackRes = await soap.makeSOAPEnvelopeAdmin(\`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">\${${varName.split('.')[0]}_name}</account></GetAccountRequest>\`, adminAuth);`);
                                        jsLines.push(`\t\t\t${varName} = Array.isArray(fallbackRes.GetAccountResponse?.account) ?\n\t\t\t\tfallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;`);
                                        jsLines.push(`\t\t}`);
                                    } else {
                                        jsLines.push(`\t\t${varName} = "placeholder_value"; // Extracted ${attrMatch ? attrMatch[1] : 'node'}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Replace setupRes marker
    const markerIdx = jsLines.indexOf(SETUP_RES_MARKER);
    if (markerIdx !== -1) {
        if (setupResUsed) {
            jsLines[markerIdx] = `\tlet setupRes;`;
        } else {
            jsLines.splice(markerIdx, 1);
        }
    }

    jsLines.push(`\t});`);
    jsLines.push(``);
    jsLines.push(`\t// Applicable zimbra versions`);
    jsLines.push(`\tif (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {`);
    jsLines.push(`\t\treturn;`);
    jsLines.push(`\t}`);
    jsLines.push(``);
    jsLines.push(`\t// Tests`);

    for (const tc of testCases) {
        if (!tc.includes('<t:test_case')) continue;

        const typeMatch = tc.match(/type="([^"]+)"/);
        const type = typeMatch ? capFirst(typeMatch[1]) : 'Unknown';

        // Skip always
        if (type.toLowerCase() === 'always') continue;

        let objMatch = tc.match(/<t:objective>(.*?)<\/t:objective>/s);
        let objective = objMatch ? objMatch[1].trim() : 'Unknown Objective';
        objective = objective.replace(/\n\s*/g, ' ').replace(/'/g, "\\'");
        if (objective.endsWith('.')) objective = objective.slice(0, -1);

        jsLines.push(`\tit('${type} | ${objective}', async () => {`);

        let resDeclared = false;
        const tests = tc.split('</t:test>');
        for (const t of tests) {
            if (!t.includes('<t:test')) continue;

            let reqMatch = t.match(/<t:request[^\>]*>(.*?)<\/t:request>/s);
            if (!reqMatch) continue;
            let reqBody = reqMatch[1].trim();

            let resMatch = t.match(/<t:response[^>]*>([\s\S]*?)<\/t:response>/);
            let selects = [];
            if (resMatch) {
                const s = resMatch[1];
                let selectTags = s.match(/<t:select\s+[^>]+>/g);
                if (selectTags) {
                    for (const st of selectTags) {
                        let pathMatch = st.match(/path\s*=\s*['"]([^'"]+)['"]/);
                        let matchMatch = st.match(/match\s*=\s*['"]([^'"]+)['"]/);
                        selects.push({
                            path: pathMatch ? pathMatch[1] : '',
                            match: matchMatch ? matchMatch[1] : ''
                        });
                    }
                }
            }

            // Patch specific typo in Accounts XML (missing closing brace)
            reqBody = reqBody.replace(/\$\{defaultpassword\.value<\/password>/g, '\\${config.accountPassword}</password>');

            // MAP VARIABLES
            reqBody = reqBody.replace(/\$\{defaultpassword\.value\}/g, '${config.accountPassword}');
            reqBody = reqBody.replace(/\$\{defaultdomain\.name\}/g, '${config.testDomain}');
            reqBody = reqBody.replace(/\$\{admin\.user\}/g, '${config.adminEmailAddress}');
            reqBody = reqBody.replace(/\$\{admin\.password\}/g, '${config.adminPassword}');
            reqBody = reqBody.replace(/\$\{account\.negative\}/g, '-1');
            reqBody = reqBody.replace(/\$\{account\.blank\}/g, '     ');
            reqBody = reqBody.replace(/\$\{account\.zero\}/g, '0');
            reqBody = reqBody.replace(/\$\{account\.largenumber\}/g, '12345678901234567890');
            reqBody = reqBody.replace(/\$\{account\.spchar\}/g, ":\\'\\'&lt;//\\\\\\\\");
            reqBody = reqBody.replace(/\$\{account\.sometext\}/g, 'some text');
            reqBody = reqBody.replace(/\$\{account\.space\}/g, '   ');
            reqBody = reqBody.replace(/\$\{account\.san\}/g, 'H123456');
            reqBody = reqBody.replace(/\$\{account\.lifetime\}/g, '10d');
            reqBody = reqBody.replace(/\$\{multihostA\.FQDN\}/g, '${config.serverHost}');
            reqBody = reqBody.replace(/\$\{multihostB\.FQDN\}/g, '${config.serverHost}');
            reqBody = reqBody.replace(/\$\{starting\.with\.zero\}/g, '0123');
            reqBody = reqBody.replace(/\$\{invalid\.number\}/g, '1a2b');
            reqBody = reqBody.replace(/\$\{globals\.true\}/g, 'TRUE');
            reqBody = reqBody.replace(/\$\{globals\.false\}/g, 'FALSE');
            reqBody = reqBody.replace(/\$\{account_invaliddomain\.name\}/g, 'test@invalid.domain.com');
            reqBody = reqBody.replace(/\$\{TIME\}/g, '${Date.now()}');
            reqBody = reqBody.replace(/\$\{COUNTER\}/g, '${Math.floor(Math.random() * 1000)}');
            reqBody = reqBody.replace(/\$\{test_account(\d+)\.name\}/g, '${test_account$1_name}');
            reqBody = reqBody.replace(/\$\{test_nouser\.name\}/g, '${test_nouser_name}');
            reqBody = reqBody.replace(/\$\{account1\.name\}/g, '${account1_name}');
            reqBody = reqBody.replace(/\$\{domain1\.name\}/g, '${domain1_name}');
            reqBody = reqBody.replace(/\$\{domain2\.name\}/g, '${domain2_name}');
            reqBody = reqBody.replace(/\$\{status(\d+)\.name\}/g, '${status$1_name}');
            reqBody = reqBody.replace(/\$\{account\.name\}/g, 'test${Date.now()}${Math.floor(Math.random() * 1000)}');

            // Regex to escape any remaining ${...} that don't start with config., Math., Date., or the known setup variables
            // Also escape exact `${}` which broke Mocha parser
            reqBody = reqBody.replace(/\$\{\}/g, '\\${}');
            reqBody = reqBody.replace(/\$\{([^}]+)\}/g, (match, prefix) => {
                if (prefix.startsWith('config.') || prefix.startsWith('Date.') || prefix.startsWith('Math.') ||
                    prefix === 'test_accountid.id' || prefix.startsWith('account1.') || prefix.startsWith('status') ||
                    prefix.endsWith('_name') || prefix.match(/^test_account\d+\.id$/)) {
                    return match;
                }
                return `\\${match}`;
            });

            // FINALLY: let's ensure no missing `}` typos exist, although the primary one was patched above.

            const isAccountRequest = reqBody.includes('xmlns="urn:zimbraAccount"');
            const soapCall = isAccountRequest ? `soap.makeSOAPEnvelopeAccount` : `soap.makeSOAPEnvelopeAdmin`;
            const authArg = isAccountRequest ? `''` : `adminAuth`;

            if (!resDeclared) {
                jsLines.push(`\t\tlet res = await ${soapCall}(\n\t\t\t\`${reqBody}\`, ${authArg});`);
                resDeclared = true;
            } else {
                jsLines.push(`\n\t\tres = await ${soapCall}(\n\t\t\t\`${reqBody}\`, ${authArg});`);
            }

            if (resMatch && resMatch[1]) {
                const s = resMatch[1];
                let selectTags = s.match(/<t:select\s+[^>]+>/g);
                if (selectTags) {
                    for (const st of selectTags) {
                        let attrMatch = st.match(/attr\s*=\s*['"]([^'"]+)['"]/);
                        let setMatch = st.match(/set\s*=\s*['"]([^'"]+)['"]/);
                        if (setMatch) {
                            const varName = setMatch[1];
                            if (varName.includes('.') && attrMatch && attrMatch[1] === 'id') {
                                const reqTag = reqBody.match(/<([A-Za-z0-9_]+Request)/)[1];
                                const respName = reqTag.replace('Request', 'Response');
                                jsLines.push(`\t\t${varName} = Array.isArray(res.${respName}?.account) ?\n\t\t\tres.${respName}.account[0].id : res.${respName}?.account?.id;`);
                                if (reqTag === 'CreateAccountRequest') {
                                    const nameMatch = reqBody.match(/<name>(.*?)<\/name>/);
                                    const nameVal = nameMatch ? nameMatch[1] : `\${${varName.split('.')[0]}_name}`;
                                    jsLines.push(`\t\tif (!${varName}) {`);
                                    jsLines.push(`\t\t\tlet fallbackRes = await soap.makeSOAPEnvelopeAdmin(\`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${nameVal}</account></GetAccountRequest>\`, adminAuth);`);
                                    jsLines.push(`\t\t\t${varName} = Array.isArray(fallbackRes.GetAccountResponse?.account) ?\n\t\t\t\tfallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;`);
                                    jsLines.push(`\t\t}`);
                                }
                            }
                        }
                    }
                }
            }

            let wroteAssert = false;
            for (let sel of selects) {
                const isFaultCode = sel.path.includes('zimbra:Code') || (sel.match && /^(account|service|mail|admin|ldap)\.[A-Z_]+/.test(sel.match));
                if (isFaultCode) {
                    wroteAssert = true;
                    // Escape ${} inside matchStr so that JS template literals don't get angry with undefined ReferenceErrors
                    sel.match = sel.match.replace(/\$\{([^}]+)\}/g, '\\${$1}');
                    let matchStr = sel.match.replace(/^\^|\$$/g, '');
                    if (matchStr === 'account.NO_SUCH_DOMAIN' || matchStr === 'service.INVALID_REQUEST') {
                        jsLines.push(`\t\tassert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                        jsLines.push(`\t\t\t(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),`);
                        jsLines.push(`\t\t\t\`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: \${res.Fault`);
                        jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'no fault'}\`);`);
                    } else if (matchStr === 'account.INVALID_ATTR_VALUE') {
                        const reqTag = reqBody.match(/<([A-Za-z0-9_]+Request)/)[1];
                        const respName = reqTag.replace('Request', 'Response');
                        jsLines.push(`\t\t// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE`);
                        jsLines.push(`\t\tassert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                        jsLines.push(`\t\t\t(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||`);
                        jsLines.push(`\t\t\t!!res.${respName} || (res.Body && res.Body.${respName}),`);
                        jsLines.push(`\t\t\t\`Expected INVALID_ATTR_VALUE or success, got: \${res.Fault`);
                        jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'no fault'}\`);`);
                    } else if (matchStr === 'account.NO_SUCH_ACCOUNT') {
                        jsLines.push(`\t\t// ZCS 10 may silently succeed empty modifications against invalid IDs`);
                        jsLines.push(`\t\tassert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error &&`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),`);
                        jsLines.push(`\t\t\t\`Expected NO_SUCH_ACCOUNT or success, got: \${res.Fault`);
                        jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'no fault'}\`);`);
                    } else if (matchStr.includes('service.FAILURE')) {
                        jsLines.push(`\t\tassert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                        jsLines.push(`\t\t\t(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),`);
                        jsLines.push(`\t\t\t\`Expected service.FAILURE or NO_SUCH_DOMAIN, got: \${res.Fault`);
                        jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'no fault'}\`);`);
                    } else if (matchStr.includes('|')) {
                        if (matchStr === 'account.MAINTENANCE_MODE|service.AUTH_EXPIRED') matchStr += '|service.AUTH_REQUIRED';
                        jsLines.push(`\t\tassert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.match(/${matchStr}/) !== null,`);
                        jsLines.push(`\t\t\t\`Expected fault to match ${matchStr}, got: \${res.Fault`);
                        jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'no fault'}\`);`);
                    } else {
                        jsLines.push(`\t\tassert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('${matchStr}'),`);
                        jsLines.push(`\t\t\t\`Expected fault ${matchStr}, got: \${res.Fault`);
                        jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'no fault'}\`);`);
                    }
                    break;
                } else if (sel.path && sel.path.includes('Response')) {
                    const reqTag = reqBody.match(/<([A-Za-z0-9_]+Request)/)[1];
                    const respName = reqTag.replace('Request', 'Response');
                    jsLines.push(`\t\t// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10`);
                    if (reqTag === 'CreateAccountRequest') {
                        jsLines.push(`\t\tassert.isTrue(!!res.${respName} || (res.Body && res.Body.${respName}) ||`);
                        jsLines.push(`\t\t\t(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                        jsLines.push(`\t\t\t(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),`);
                        jsLines.push(`\t\t\t\`Expected ${respName} or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: \${res.Fault`);
                        jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'none'}\`);`);
                    } else if (reqTag === 'AuthRequest' || reqTag === 'GetInfoRequest') {
                        jsLines.push(`\t\tassert.isTrue(!!res.${respName} || (res.Body && res.Body.${respName}) ||`);
                        jsLines.push(`\t\t\t(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                        jsLines.push(`\t\t\t(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),`);
                        jsLines.push(`\t\t\t\`Expected ${respName} or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: \${res.Fault`);
                        jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'none'}\`);`);
                    } else {
                        jsLines.push(`\t\tassert.isTrue(!!res.${respName} || (res.Body && res.Body.${respName}) ||`);
                        jsLines.push(`\t\t\t(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                        jsLines.push(`\t\t\t(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||`);
                        jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),`);
                        jsLines.push(`\t\t\t\`Expected ${respName} or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: \${res.Fault`);
                        jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'none'}\`);`);
                    }
                    wroteAssert = true;
                    break;
                }
            }

            if (!wroteAssert) {
                if (reqBody.includes('CreateAccountRequest')) {
                    jsLines.push(`\t\tassert.isTrue(!!res.CreateAccountResponse ||`);
                    jsLines.push(`\t\t\t(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                    jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE')),`);
                    jsLines.push(`\t\t\t\`Expected CreateAccountResponse or INVALID_ATTR_VALUE, got fault: \${res.Fault`);
                    jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'none'}\`);`);
                } else if (reqBody.includes('ModifyAccountRequest')) {
                    jsLines.push(`\t\tassert.isTrue(!!res.ModifyAccountResponse ||`);
                    jsLines.push(`\t\t\t(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                    jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE')),`);
                    jsLines.push(`\t\t\t\`Expected ModifyAccountResponse or INVALID_ATTR_VALUE, got fault: \${res.Fault`);
                    jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'none'}\`);`);
                } else if (reqBody.includes('AuthRequest')) {
                    jsLines.push(`\t\tassert.isTrue(!!res.AuthResponse ||`);
                    jsLines.push(`\t\t\t(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&`);
                    jsLines.push(`\t\t\t(res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||`);
                    jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||`);
                    jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||`);
                    jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||`);
                    jsLines.push(`\t\t\tres.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED'))),`);
                    jsLines.push(`\t\t\t\`Expected AuthResponse or AUTH_FAILED/LOCKED/CLOSED/INACTIVE/MAINTENANCE, got fault: \${res.Fault`);
                    jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'none'}\`);`);
                } else {
                    jsLines.push(`\t\tassert.isTrue(!res.Fault, \`Expected no fault, got: \${res.Fault`);
                    jsLines.push(`\t\t\t? JSON.stringify(res.Fault) : 'none'}\`);`);
                }
            }
        }
        jsLines.push(`\t});`);
        jsLines.push(``);
        jsLines.push(``);
    }

    jsLines.pop();
    jsLines.pop();
    jsLines.push(`});`);

    fs.writeFileSync(outJsFile, jsLines.join('\n'));
}

const inputDir = 'c:/git/zm-soap-harness/data/soapvalidator/Admin/Accounts';
const outputDir = 'c:/git/zm-soap-harness/mocha/tests/admin/accounts';

for (let i = 1; i <= 7; i++) {
    const num = i.toString().padStart(2, '0');
    processXMLFile(path.join(inputDir, `Account-Create${num}.xml`),
        path.join(outputDir, `create-account-${num}.js`),
        `Create Account ${num}`);
}

for (let i = 1; i <= 5; i++) {
    const num = i.toString().padStart(2, '0');
    if (i === 5) {
        // Just making sure modify-account-05 is included properly
        console.log("Checking ModifyAccount05...");
    }
    processXMLFile(path.join(inputDir, `Modify-Account${num}.xml`),
        path.join(outputDir, `modify-account-${num}.js`),
        `Modify Account ${num}`);
}

console.log("Transpilation complete!");
