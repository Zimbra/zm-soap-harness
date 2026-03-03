import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

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
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account with complex password
		validUser1 = 'Test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${validUser1}</name>
				<password>${validPassword1}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		assert.exists(acct1.id, 'Account1 ID should exist');
		assert.isString(acct1.id, 'Account1 ID should be a string');
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host1, 'Account1 zimbraMailHost should exist');

		// Create account with space in password
		validUser2 = 'Test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${validUser2}</name>
				<password>${validPassword2}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		assert.exists(acct2.id, 'Account2 ID should exist');
		assert.isString(acct2.id, 'Account2 ID should be a string');
		const host2 = acct2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'Account2 zimbraMailHost should exist');

		// Create account with accented password
		validUser3 = 'Test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${validUser3}</name>
				<password>${validPassword3}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes3.Fault, 'Response should not be a Fault');
		const acct3 = Array.isArray(createRes3.CreateAccountResponse.account)
			? createRes3.CreateAccountResponse.account[0]
			: createRes3.CreateAccountResponse.account;
		assert.exists(acct3.id, 'Account3 ID should exist');
		assert.isString(acct3.id, 'Account3 ID should be a string');
		const host3 = acct3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'Account3 zimbraMailHost should exist');
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
	it('Sanity | Verify complex password works', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser1}</account>
				<password>${validPassword1}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify password with spaces works 1', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser2}</account>
				<password>${validPassword2}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		const lifetime = response.AuthResponse.lifetime;

		// Verify response
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify password with spaces works 2', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser3}</account>
				<password>${validPassword3}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		const lifetime = response.AuthResponse.lifetime;

		// Verify response
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});
});
