import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Auth Request Sphchar', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Tests to check the authentication of user names having special characters and numbers', async () => {
		const accountNames = [];

		// Create accounts with various special character names
		const decimalName = '0123456789' + common.getUniqueString() + '@' + config.testDomain;
		const charsdotName = 'User.a' + common.getUniqueString() + '@' + config.testDomain;
		const decimaldotName = '0123.456789' + common.getUniqueString() + '@' + config.testDomain;
		const alphanumName = 'User123' + common.getUniqueString() + '@' + config.testDomain;

		accountNames.push(decimalName, charsdotName, decimaldotName, alphanumName);

		for (const acctName of accountNames) {

			// Create account
			const createRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(createRes.Fault, 'Response should not be a Fault');
			assert.exists(createRes.CreateAccountResponse,
				'Should create account: ' + acctName);
		}

		// Auth each account
		for (const acctName of accountNames) {

			// Send the message
			const authRes = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${acctName}</account>
					<password>${config.accountPassword}</password>
				</AuthRequest>`, null
			);

			// Verify response
			assert.notExists(authRes.Fault, 'Response should not be a Fault');
			assert.exists(authRes.AuthResponse,
				'AuthResponse should exist for: ' + acctName);
			const lifetime = authRes.AuthResponse.lifetime;

			// Verify response
			assert.exists(lifetime, 'lifetime should exist for: ' + acctName);
			assert.match(String(lifetime._content || lifetime),
				/^\d+$/, 'lifetime should be numeric for: ' + acctName);
		}
	});


	it('Functional | Tests to check the authentication of case sensitive user names', async () => {
		const baseName = 'TestUser' + common.getUniqueString();
		const accountName = baseName + '@' + config.testDomain;

		// Create account with mixed case name
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');

		// Auth with lowercase version
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName.toLowerCase()}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist for lowercase login');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});
});
