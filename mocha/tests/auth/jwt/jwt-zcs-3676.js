import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Jwt > Jwt Zcs 3676', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	let account1Server;
	let account1ForeignPrincipal;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1ForeignPrincipal = 'test:' + common.getUniqueString();

		// Create account1 with foreign principal
		account1Name = 'zcs3676_' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${account1ForeignPrincipal}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		account1Id = acct1.id;
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		account1Server = host1 ? host1._content : config.server;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | AuthRequest - Generate auth request for user with name with JWT type for token', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" tokenType="JWT">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		assert.exists(response.AuthResponse.authToken, 'Auth token should exist');
	});


	it('Sanity | AuthRequest - Generate auth request for user with name with auth type for token', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="true" tokenType="auth">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.exists(response.AuthResponse.lifetime, 'lifetime should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'Auth token should exist');
	});


	it('Sanity | AuthRequest - Generate auth request for user with name with no token type specified', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.exists(response.AuthResponse.lifetime, 'lifetime should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'Auth token should exist');
	});


	it('Sanity | AuthRequest - Generate auth request for user with id with jwt token type specified', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false" tokenType="JWT">
				<account by="id">${account1Id}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		assert.exists(response.AuthResponse.authToken, 'Auth token should exist');
	});


	it('Sanity | AuthRequest - Generate auth request for user with foreign principal with jwt token type specified', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="true" tokenType="JWT">
				<account by="foreignPrincipal">${account1ForeignPrincipal}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		assert.exists(response.AuthResponse.authToken, 'Auth token should exist');
	});


	it('Sanity | Auth request for preauth with token type as JWT', async () => {
		const timestamp = String(Date.now());
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" tokenType="JWT">
				<account by="name">${account1Name}</account>
				<preauth timestamp="${timestamp}" expires="0">dummypreauthkey</preauth>
			</AuthRequest>`, null, true, account1Server
		);
		if (response.Fault) {
			assert.match(response.Fault.Detail.Error.Code,
				/account\.AUTH_FAILED|service\.INVALID_REQUEST/,
				'Should return AUTH_FAILED or INVALID_REQUEST');
		} else {
			assert.notExists(response.Fault, 'Response should not be a Fault');
			assert.exists(response.AuthResponse, 'AuthResponse should exist');
			assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');
			assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		}
	});


	it('Sanity | Auth request as an invalid email account and tokeType as JWT', async () => {
		const invalidUser = 'user2.' + common.getUniqueString();
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" tokentype="JWT">
				<account by="name">${invalidUser}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		if (response.Fault) {
			assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED');
		} else {
			assert.fail('Expected Fault for invalid user');
		}
	});


	it('Sanity | AuthRequest - Generate JWToken based on auth token', async () => {
		// Get a regular auth token first
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false" tokenType="auth">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const authToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Try to generate JWT from auth token - should fail (not supported)
		const jwtRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false" tokenType="JWT">
				<authToken>${authToken}</authToken>
			</AuthRequest>`, null, true, account1Server
		);
		// Generation of JWT from auth token is not supported - response should not contain authToken
		if (jwtRes.AuthResponse) {
			// If it returns a response, the authToken field should be empty
			const token = jwtRes.AuthResponse.authToken;
			if (token) {
				const tokenValue = typeof token === 'string' ? token
					: (Array.isArray(token) ? token[0]._content || token[0] : token._content || '');
				assert.equal(tokenValue, '', 'JWT token from auth token should be empty');
			}
		}
		// If it returns a Fault, that's also acceptable
	});
});
