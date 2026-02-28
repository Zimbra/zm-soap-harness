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
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101_MULTINODE|ZIMBRAX/)) {
		return;
	}

	it('Sanity | Verify that the accounts with COS having 2 servers(A and B) in the server Pool are getting created on server A or B but not on C', async function () {
		const serverAName = config.mailboxServerHost1;
		const serverBName = config.mailboxServerHost2;
		const cosName = 'multihostcos' + common.getUniqueString();
		const acctNames = [
			'multihost' + common.getUniqueString() + '@' + config.testDomain,
			'multihost' + common.getUniqueString() + '@' + config.testDomain,
			'multihost' + common.getUniqueString() + '@' + config.testDomain
		];

		// Get server IDs by name
		const serversRes = await soap.makeSOAPEnvelopeAdmin(
			'<GetAllServersRequest xmlns="urn:zimbraAdmin"/>', adminAuth);

		// Verify response
		assert.notExists(serversRes.Fault, 'Response should not be a Fault');
		assert.exists(serversRes.GetAllServersResponse, 'GetAllServersResponse should exist');
		const servers = Array.isArray(serversRes.GetAllServersResponse.server)
			? serversRes.GetAllServersResponse.server
			: [serversRes.GetAllServersResponse.server];
		const serverA = servers.find(s => s.name === serverAName);
		const serverB = servers.find(s => s.name === serverBName);

		// Verify response
		assert.exists(serverA, `Server A (${serverAName}) should exist`);
		assert.exists(serverB, `Server B (${serverBName}) should exist`);

		// Find a server C (any server that is not A or B)
		const serverC = servers.find(s => s.name !== serverAName && s.name !== serverBName);
		const serverCName = serverC ? serverC.name : 'nonexistent-server';

		// Create COS with servers A and B in pool
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraMailHostPool">${serverA.id}</a>
				<a n="zimbraMailHostPool">${serverB.id}</a>
			</CreateCosRequest>`, adminAuth);

		// Verify response
		assert.notExists(cosRes.Fault, 'Response should not be a Fault');
		assert.exists(cosRes.CreateCosResponse, 'CreateCosResponse should exist');
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		// Create 3 accounts and verify none on server C
		for (const name of acctNames) {

			// Create account
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
					<a n="zimbraCOSId">${cosId}</a>
				</CreateAccountRequest>`, adminAuth);

			// Verify response
			assert.notExists(res.Fault, 'Response should not be a Fault');
			assert.exists(res.CreateAccountResponse, `Should create account ${name}`);
			const acct = Array.isArray(res.CreateAccountResponse.account)
				? res.CreateAccountResponse.account[0]
				: res.CreateAccountResponse.account;
			const mailHost = acct.a.find(a => a.n === 'zimbraMailHost');

			// Verify response
			assert.notEqual(mailHost._content, serverCName, 'Account should NOT be on server C');

			assert.isTrue(mailHost._content === serverAName || mailHost._content === serverBName,
				`Account should be on server A or B, got: ${mailHost._content}`);
		}
	});
});
