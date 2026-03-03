import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Auth > Auth Request Sphchar', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
			const acct = Array.isArray(createRes.CreateAccountResponse.account)
				? createRes.CreateAccountResponse.account[0]
				: createRes.CreateAccountResponse.account;
			assert.exists(acct.id, 'Account ID should exist for: ' + acctName);
			assert.isString(acct.id, 'Account ID should be a string for: ' + acctName);
			const host = acct.a.find(a => a.n === 'zimbraMailHost');
			assert.exists(host, 'zimbraMailHost should exist for: ' + acctName);
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
			const lifetime = authRes.AuthResponse.lifetime;
			assert.exists(lifetime, 'lifetime should exist for: ' + acctName);
			assert.match(String(lifetime._content || lifetime),
				/^\d+$/, 'lifetime should be numeric for: ' + acctName);
			assert.exists(authRes.AuthResponse.authToken,
				'authToken should exist for: ' + acctName);
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
		const createdAcct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		assert.exists(createdAcct.id, 'Account ID should exist');
		assert.isString(createdAcct.id, 'Account ID should be a string');

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
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});
});
