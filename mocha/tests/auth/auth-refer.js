import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Auth Refer', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let testAccountName;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		testAccountName = 'test.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes.CreateAccountResponse, 'Should create test account');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify that AuthRequest to a server that has the users mailbox does not return refer element in the response', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		// Verify 'refer' element is NOT present (emptyset=1 means it should not exist)
		assert.notExists(response.AuthResponse.refer,
			'refer element should not be present when user mailbox is on this server');
	});
});
