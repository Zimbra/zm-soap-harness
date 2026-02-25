import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Create Account Multinode 1', function () {
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

    it('Sanity | Create accounts with COS having 2 servers in pool using zimbraMailHost(A)', async () => {
        const cosName = 'multihostcos' + common.getUniqueString();
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
        const serverAId = servers[0].id;
        const serverBId = servers[1].id;
        const serverAName = servers[0].name;

        // Create COS with server pool
        const cosRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraMailHostPool">${serverAId}</a>
				<a n="zimbraMailHostPool">${serverBId}</a>
			</CreateCosRequest>`, adminAuth);
        assert.exists(cosRes.CreateCosResponse,
            'CreateCosResponse should exist');
        const cosId = cosRes.CreateCosResponse.cos.id;

        // Create account 1 on server A
        const acct1Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraMailHost">${serverAName}</a>
			</CreateAccountRequest>`, adminAuth);
        assert.exists(acct1Res.CreateAccountResponse,
            'Should create account 1');
        const acct1 = Array.isArray(
            acct1Res.CreateAccountResponse.account)
            ? acct1Res.CreateAccountResponse.account[0]
            : acct1Res.CreateAccountResponse.account;
        const mailHost1 = acct1.a.find(
            a => a.n === 'zimbraMailHost');
        assert.equal(mailHost1._content, serverAName,
            'Account 1 should be on server A');

        // Create account 2 on server A
        const acct2Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraMailHost">${serverAName}</a>
			</CreateAccountRequest>`, adminAuth);
        assert.exists(acct2Res.CreateAccountResponse,
            'Should create account 2');
        const acct2 = Array.isArray(
            acct2Res.CreateAccountResponse.account)
            ? acct2Res.CreateAccountResponse.account[0]
            : acct2Res.CreateAccountResponse.account;
        const mailHost2 = acct2.a.find(
            a => a.n === 'zimbraMailHost');
        assert.equal(mailHost2._content, serverAName,
            'Account 2 should be on server A');
    });
});
