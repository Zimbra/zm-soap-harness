import soap from './mocha/framework/backend/soap-client.js';
import config from './mocha/conf/config.js';
import common from './mocha/framework/core/common.js';

async function debug() {
    const adminAuth = await soap.getAdminAuthToken();
    const testAccountName = `debug.${common.getUniqueString()}@${config.testDomain}`;
    const zimbraId = `A971B599-5A90-4B73-A092-${common.getUniqueString()}BBC78032F`;

    console.log('--- Requesting CreateAccount with zimbraId ---');
    const res = await soap.makeSOAPEnvelopeAdmin(
        `<CreateAccountRequest xmlns="urn:zimbraAdmin">
            <name>${testAccountName}</name>
            <password>${config.accountPassword}</password>
            <a n="zimbraId">${zimbraId}</a>
        </CreateAccountRequest>`, adminAuth);

    console.log('Response:', JSON.stringify(res, null, 2));

    if (res.CreateAccountResponse?.account) {
        const account = res.CreateAccountResponse.account;
        console.log('Account attributes:', JSON.stringify(account.a, null, 2));
        const zimbraIdAttr = (account.a || []).find(a => a.n === 'zimbraId');
        console.log('Found zimbraId attribute:', zimbraIdAttr);
    }
}

debug().catch(console.error);
