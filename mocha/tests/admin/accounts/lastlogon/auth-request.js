import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Lastlogon > Auth Request', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | AuthRequest - verify zimbraLastLogonTimestamp is updated', async () => {
		const acctName = `user${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as user
		await soap.getAccountAuthToken(acctName, config.accountPassword);

		// Check zimbraLastLogonTimestamp via admin GetAccountRequest
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${acctName}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetAccountResponse,
			'GetAccountResponse should exist');
		const account = Array.isArray(getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0]
			: getRes.GetAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');

		const attrs = getRes.GetAccountResponse.account[0].a || [];
		const lastLogon = attrs.find(a => a.n === 'zimbraLastLogonTimestamp');

		// Verify response
		assert.exists(lastLogon, 'zimbraLastLogonTimestamp should be set after login');
		assert.isNotEmpty(lastLogon._content,
			'zimbraLastLogonTimestamp should have a value');
	});
});
