import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Multihost > Account Create', function () {
    this.timeout(30 * 1000);
    let adminAuth;

    before(async function () {
        adminAuth = await soap.getAdminAuthToken();
    });

    // Applicable zimbra versions
    if (config.serial === true ||
        !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    it('Sanity | Create two accounts - one on HostA, one on HostB', async () => {
        const account1Name = 'multihost' + common.getUniqueString() +
            '@' + config.testDomain;
        const account2Name = 'multihost' + common.getUniqueString() +
            '@' + config.testDomain;

        // Get all servers
        const serversRes = await soap.makeSOAPEnvelopeAdmin(
            `<GetAllServersRequest xmlns="urn:zimbraAdmin"/>`,
            adminAuth);
        assert.exists(serversRes.GetAllServersResponse,
            'GetAllServersResponse should exist');
        const servers = Array.isArray(
            serversRes.GetAllServersResponse.server)
            ? serversRes.GetAllServersResponse.server
            : [serversRes.GetAllServersResponse.server];
        if (servers.length < 2) {
            this.skip('Requires at least 2 servers');
        }
        const serverAName = servers[0].name;
        const serverBName = servers[1].name;

        // Create account 1 on Host A
        const acct1Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailHost">${serverAName}</a>
			</CreateAccountRequest>`, adminAuth);
        assert.exists(acct1Res.CreateAccountResponse,
            'Should create account 1 on Host A');
        const acct1 = Array.isArray(
            acct1Res.CreateAccountResponse.account)
            ? acct1Res.CreateAccountResponse.account[0]
            : acct1Res.CreateAccountResponse.account;
        assert.exists(acct1.id,
            'Account 1 should have an id');

        // Create account 2 on Host B
        const acct2Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailHost">${serverBName}</a>
			</CreateAccountRequest>`, adminAuth);
        assert.exists(acct2Res.CreateAccountResponse,
            'Should create account 2 on Host B');
        const acct2 = Array.isArray(
            acct2Res.CreateAccountResponse.account)
            ? acct2Res.CreateAccountResponse.account[0]
            : acct2Res.CreateAccountResponse.account;
        assert.exists(acct2.id,
            'Account 2 should have an id');
    });
});
