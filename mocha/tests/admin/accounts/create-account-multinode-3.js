import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Create Account Multinode 3', function () {
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

    it('Sanity | Accounts with COS pool (A,B) should not be created on server C', async () => {
        const cosName = 'multihostcos' + common.getUniqueString();
        const acctAName = 'multihost' + common.getUniqueString() +
            '@' + config.testDomain;
        const acctBName = 'multihost' + common.getUniqueString() +
            '@' + config.testDomain;
        const acctCName = 'multihost' + common.getUniqueString() +
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
        if (servers.length < 3) {
            this.skip('Requires at least 3 servers');
        }
        const serverAId = servers[0].id;
        const serverBId = servers[1].id;
        const serverCName = servers[2].name;

        // Create COS with servers A and B in pool
        const cosRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraMailHostPool">${serverAId}</a>
				<a n="zimbraMailHostPool">${serverBId}</a>
			</CreateCosRequest>`, adminAuth);
        assert.exists(cosRes.CreateCosResponse,
            'CreateCosResponse should exist');
        const cosId = cosRes.CreateCosResponse.cos.id;

        // Create 3 accounts and verify none on server C
        for (const name of [acctAName, acctBName, acctCName]) {
            const res = await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
					<a n="zimbraCOSId">${cosId}</a>
				</CreateAccountRequest>`, adminAuth);
            assert.exists(res.CreateAccountResponse,
                `Should create account ${name}`);
            const acct = Array.isArray(
                res.CreateAccountResponse.account)
                ? res.CreateAccountResponse.account[0]
                : res.CreateAccountResponse.account;
            const mailHost = acct.a.find(
                a => a.n === 'zimbraMailHost');
            assert.notEqual(mailHost._content, serverCName,
                `Account should NOT be on server C`);
        }
    });
});
