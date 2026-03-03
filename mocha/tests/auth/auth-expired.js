import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Auth > Auth Expired', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let account1Name;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 with short auth token lifetime (5s)
		account1Name = 'user' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">5s</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		assert.isString(acct.id, 'Account ID should be a string');
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
	it('Smoke | Test that the Authtoken remains valid within the duration set for expiration', async () => {
		// Login
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		const lifetime = authRes.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');

		const token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content
			: authRes.AuthResponse.authToken._content
			|| authRes.AuthResponse.authToken;

		// Wait 3 seconds (within 5s lifetime)
		await new Promise(resolve => setTimeout(resolve, 3000));

		// GetInfoRequest should succeed
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', token
		);

		// Verify response
		assert.notExists(infoRes.Fault, 'Response should not be a Fault');
		assert.exists(infoRes.GetInfoResponse.name, 'GetInfoResponse name should exist');
		assert.isString(infoRes.GetInfoResponse.name, 'GetInfoResponse name should be a string');
	});


	it('Sanity | Test the authtoken expiration (Next request is sent after expiration duration)', async () => {
		// Login
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content
			: authRes.AuthResponse.authToken._content
			|| authRes.AuthResponse.authToken;

		// Wait 6 seconds (beyond 5s lifetime)
		await new Promise(resolve => setTimeout(resolve, 6000));

		// GetInfoRequest should fail with AUTH_EXPIRED
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', token
		);

		// Verify response
		assert.isString(infoRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(infoRes.Fault.Detail.Error.Code, 'service.AUTH_EXPIRED',
			'Should return AUTH_EXPIRED');
	});


	it('Sanity | Test theauthtoken expiration (Two requests is sent- first before expiration and second after expiration)', async () => {
		// Login
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content
			: authRes.AuthResponse.authToken._content
			|| authRes.AuthResponse.authToken;

		// Wait 3 seconds (within 5s lifetime)
		await new Promise(resolve => setTimeout(resolve, 3000));

		// First request should succeed
		const infoRes1 = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', token
		);

		// Verify response
		assert.notExists(infoRes1.Fault, 'Response should not be a Fault');
		assert.exists(infoRes1.GetInfoResponse.name, 'GetInfoResponse name should exist');
		assert.isString(infoRes1.GetInfoResponse.name, 'GetInfoResponse name should be a string');

		// Wait 3 more seconds (now past 5s lifetime)
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Second request should fail
		const infoRes2 = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', token
		);

		// Verify response
		assert.isString(infoRes2.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(infoRes2.Fault.Detail.Error.Code, 'service.AUTH_EXPIRED',
			'Should return AUTH_EXPIRED');
	});


	it('Functional | Relogin after expiration of authtoken (with previous authtoken)', async () => {
		// Login to get auth token
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content
			: authRes.AuthResponse.authToken._content
			|| authRes.AuthResponse.authToken;

		// Wait for token expiration (5s lifetime + buffer)
		await new Promise(resolve => setTimeout(resolve, 6000));

		// Re-auth with fresh credentials (without the expired token)
		const reAuthRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(reAuthRes.Fault, 'Response should not be a Fault');
		assert.match(String(reAuthRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(reAuthRes.AuthResponse.authToken, 'authToken should exist');
	});
});
