import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Get Account Multinode', function () {
    this.timeout(30 * 1000);
    let adminAuth;

    before(async function () {
        adminAuth = await soap.getAdminAuthToken();
    });

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    it('Sanity | Verify that GetAccountRequest is successfully proxied', async function () {
        if (!config.mailboxServerHost1 || !config.mailboxServerHost2) {
            this.skip('Requires multinode environment with STORE1 and STORE2');
        }

        const serverAName = config.mailboxServerHost1;
        const serverBName = config.mailboxServerHost2;
        const account1Name = 'hostA' + common.getUniqueString() + '@' + config.testDomain;
        const account2Name = 'hostB' + common.getUniqueString() + '@' + config.testDomain;

        // Create account 1 on server A
        const acct1Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailHost">${serverAName}</a>
			</CreateAccountRequest>`, adminAuth);
        assert.exists(acct1Res.CreateAccountResponse, 'Should create account 1');
        const acct1 = Array.isArray(acct1Res.CreateAccountResponse.account)
            ? acct1Res.CreateAccountResponse.account[0]
            : acct1Res.CreateAccountResponse.account;
        const acct1Id = acct1.id;
        const mailHost1 = acct1.a.find(a => a.n === 'zimbraMailHost');
        assert.equal(mailHost1._content, serverAName, 'Account 1 should be on server A');

        // Create account 2 on server B
        const acct2Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailHost">${serverBName}</a>
			</CreateAccountRequest>`, adminAuth);
        assert.exists(acct2Res.CreateAccountResponse, 'Should create account 2');
        const acct2 = Array.isArray(acct2Res.CreateAccountResponse.account)
            ? acct2Res.CreateAccountResponse.account[0]
            : acct2Res.CreateAccountResponse.account;
        const acct2Id = acct2.id;
        const mailHost2 = acct2.a.find(a => a.n === 'zimbraMailHost');
        assert.equal(mailHost2._content, serverBName, 'Account 2 should be on server B');

        // GetAccountRequest for account 1 (proxied)
        const get1Res = await soap.makeSOAPEnvelopeAdmin(
            `<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acct1Id}</account>
			</GetAccountRequest>`, adminAuth);
        assert.exists(get1Res.GetAccountResponse, 'GetAccountResponse for account 1 should exist');

        // GetAccountRequest for account 2 (proxied)
        const get2Res = await soap.makeSOAPEnvelopeAdmin(
            `<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acct2Id}</account>
			</GetAccountRequest>`, adminAuth);
        assert.exists(get2Res.GetAccountResponse, 'GetAccountResponse for account 2 should exist');
    });
});
