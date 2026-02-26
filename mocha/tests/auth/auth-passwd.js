import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Auth Passwd', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let validUser1;
	const validPassword1 = '#@!/98d7s\'sd/\\s\\\\sdsd*([][';
	let validUser2;
	const validPassword2 = 'hello 123';
	let validUser3;
	const validPassword3 = '\u00e5\u00e7\u00e8123';

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account with complex password
		validUser1 = 'Test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${validUser1}</name>
				<password>${validPassword1}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create user1');

		// Create account with space in password
		validUser2 = 'Test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${validUser2}</name>
				<password>${validPassword2}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create user2');

		// Create account with accented password
		validUser3 = 'Test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${validUser3}</name>
				<password>${validPassword3}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes3.Fault, 'Response should not be a Fault');
		assert.exists(createRes3.CreateAccountResponse, 'Should create user3');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify complex password works', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser1}</account>
				<password>${validPassword1}</password>
			</AuthRequest>`, null, true
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify password with spaces works 1', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser2}</account>
				<password>${validPassword2}</password>
			</AuthRequest>`, null, true
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify password with spaces works 1 1', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser3}</account>
				<password>${validPassword3}</password>
			</AuthRequest>`, null, true
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});
});
