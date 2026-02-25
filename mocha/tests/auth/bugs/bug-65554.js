import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Bugs > Bug 65554', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let account1Name;
	let account2Name;
	let account1AuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		const account1Server = host1 ? host1._content : config.server;

		// Create account2
		account2Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		// Auth as account1 to get authToken
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.exists(authRes.AuthResponse, 'Should authenticate account1');

		account1AuthToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | AuthRequest with authtoken contains verifyAccount=1 should match encoded account name in authtoken', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<authToken verifyAccount="1">${account1AuthToken}</authToken>
			</AuthRequest>`, null, true
		);
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
	});


	it('Sanity | AuthRequest with authtoken contains verifyAccount=1 should return AUTH_REQUIRED if account name does not match encoded account name in authtoken', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<authToken verifyAccount="1">${account1AuthToken}</authToken>
			</AuthRequest>`, null, true
		);
		if (response.Fault) {
			assert.include(response.Fault.Detail.Error.Code, 'service.AUTH_REQUIRED',
				'Should return AUTH_REQUIRED');
		} else {
			assert.fail('Expected Fault response for mismatched account');
		}
	});
});
