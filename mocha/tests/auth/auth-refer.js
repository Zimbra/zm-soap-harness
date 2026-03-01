import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Auth > Auth Refer', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let testAccountName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		testAccountName = 'test.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create test account');
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify that AuthRequest to a server that has the users mailbox does not return refer element in the response', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		// Verify 'refer' element is NOT present (emptyset=1 means it should not exist)
		assert.notExists(response.AuthResponse.refer,
			'refer element should not be present when user mailbox is on this server');
	});
});
