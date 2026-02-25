import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > LastLogon > Preauth Auth Request', function () {
	this.timeout(120 * 1000);
	let adminAuth;

	before(async function () {
		adminAuth = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	it('Functional | AuthRequest - verify zimbraLastLogonTimestamp is updated', async () => {
		const domainName = 'preauth' + common.getUniqueString() + '.com';
		const preauthKey =
			'7c9d4c4372457f2e9df0a681e31559e691199762171b832ec042861bc9b610ba';
		const accountName = 'preauth' + common.getUniqueString() +
			'@' + domainName;

		// Get current zimbraLastLogonTimestampFrequency
		const configRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraLastLogonTimestampFrequency"/>
			</GetConfigRequest>`, adminAuth);
		assert.exists(configRes.GetConfigResponse,
			'GetConfigResponse should exist');

		// Create domain with preauth key
		const domainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraPreAuthKey">${preauthKey}</a>
			</CreateDomainRequest>`, adminAuth);
		assert.exists(domainRes.CreateDomainResponse,
			'CreateDomainResponse should exist');

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(createRes.CreateAccountResponse,
			'Should create account');
		const acct = Array.isArray(
			createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const acctId = acct.id;

		// Set frequency to 1 second
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraLastLogonTimestampFrequency">1s</a>
			</ModifyConfigRequest>`, adminAuth);

		// Flush cache
		await soap.makeSOAPEnvelopeAdmin(
			`<FlushCacheRequest xmlns="urn:zimbraAdmin">
				<cache type="config"/>
			</FlushCacheRequest>`, adminAuth);

		// Auth with password (preauth requires HMAC computation
		// not available in JS, so use password auth)
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);
		assert.exists(authRes.AuthResponse,
			'AuthResponse should exist');

		// Get initial timestamp
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuth);
		const acctData = Array.isArray(
			getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0]
			: getRes.GetAccountResponse.account;
		const timestamp1 = acctData.a.find(
			a => a.n === 'zimbraLastLogonTimestamp');
		assert.exists(timestamp1,
			'zimbraLastLogonTimestamp should have a value');

		// Wait and auth again
		await new Promise(r => setTimeout(r, 5000));

		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);

		// Get updated timestamp
		const getRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuth);
		const acctData2 = Array.isArray(
			getRes2.GetAccountResponse.account)
			? getRes2.GetAccountResponse.account[0]
			: getRes2.GetAccountResponse.account;
		const timestamp2 = acctData2.a.find(
			a => a.n === 'zimbraLastLogonTimestamp');
		assert.exists(timestamp2,
			'zimbraLastLogonTimestamp should still exist');
		assert.notEqual(
			timestamp1._content,
			timestamp2._content,
			'Timestamp should have been updated');
	});
});
