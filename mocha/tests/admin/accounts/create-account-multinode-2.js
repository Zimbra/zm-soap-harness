import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Create Account Multinode 2', function () {
	this.timeout(30 * 1000);
	let adminAuth;

	before(async function () {
		adminAuth = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101_MULTINODE|ZIMBRAX/)) {
		return;
	}

	it('Sanity | Verify that the accounts with COS having server(A) in the server Pool has mail boxes on mail server(A).', async function () {
		const serverAName = config.mailboxServerHost1;
		const cosName = 'cos' + common.getUniqueString();
		const account1Name = 'multihost' + common.getUniqueString() + '@' + config.testDomain;
		const account2Name = 'multihost' + common.getUniqueString() + '@' + config.testDomain;

		// Get server A ID by name
		const serversRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllServersRequest xmlns="urn:zimbraAdmin"/>`, adminAuth);
		assert.exists(serversRes.GetAllServersResponse, 'GetAllServersResponse should exist');
		const servers = Array.isArray(serversRes.GetAllServersResponse.server)
			? serversRes.GetAllServersResponse.server
			: [serversRes.GetAllServersResponse.server];
		const serverA = servers.find(s => s.name === serverAName);
		assert.exists(serverA, `Server A (${serverAName}) should exist`);

		// Create COS with only server A in pool
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraMailHostPool">${serverA.id}</a>
			</CreateCosRequest>`, adminAuth);
		assert.exists(cosRes.CreateCosResponse, 'CreateCosResponse should exist');
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		// Create account 1 with COS
		const acct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(acct1Res.CreateAccountResponse, 'Should create account 1');
		const acct1 = Array.isArray(acct1Res.CreateAccountResponse.account)
			? acct1Res.CreateAccountResponse.account[0]
			: acct1Res.CreateAccountResponse.account;
		const mailHost1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.equal(mailHost1._content, serverAName, 'Account 1 should be on server A');

		// Create account 2 with COS
		const acct2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(acct2Res.CreateAccountResponse, 'Should create account 2');
		const acct2 = Array.isArray(acct2Res.CreateAccountResponse.account)
			? acct2Res.CreateAccountResponse.account[0]
			: acct2Res.CreateAccountResponse.account;
		const mailHost2 = acct2.a.find(a => a.n === 'zimbraMailHost');
		assert.equal(mailHost2._content, serverAName, 'Account 2 should be on server A');
	});
});
