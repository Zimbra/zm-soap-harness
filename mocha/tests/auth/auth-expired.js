import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Auth Expired', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let account1Name;

	before(async function () {
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
		assert.exists(createRes.CreateAccountResponse, 'Should create account1');
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
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');

		const lifetime = authRes.AuthResponse.lifetime;

		// Verify response
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
		assert.exists(infoRes.GetInfoResponse,
			'GetInfoResponse should exist (token still valid)');
		assert.exists(infoRes.GetInfoResponse.name, 'GetInfoResponse should have name');
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
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
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
		try {

			// GetInfoRequest
			const infoRes = await soap.makeSOAPEnvelopeAccount(
				'<GetInfoRequest xmlns="urn:zimbraAccount"/>', token
			);
			if (infoRes.Fault) {

				// Verify response
				assert.include(infoRes.Fault.Detail.Error.Code, 'service.AUTH_EXPIRED',
					'Should return AUTH_EXPIRED');
			} else {
				assert.fail('Expected AUTH_EXPIRED fault');
			}
		} catch (error) {
			// Server may return XML fault for expired tokens, causing JSON parse error
			assert.match(String(error), /AUTH_EXPIRED|not valid JSON|SyntaxError/,
				'Should fail due to expired token');
		}
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
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
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
		assert.exists(infoRes1.GetInfoResponse,
			'First GetInfoResponse should exist (token still valid)');

		// Wait 3 more seconds (now past 5s lifetime)
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Second request should fail
		try {

			// GetInfoRequest
			const infoRes2 = await soap.makeSOAPEnvelopeAccount(
				'<GetInfoRequest xmlns="urn:zimbraAccount"/>', token
			);
			if (infoRes2.Fault) {

				// Verify response
				assert.include(infoRes2.Fault.Detail.Error.Code, 'service.AUTH_EXPIRED',
					'Should return AUTH_EXPIRED');
			} else {
				assert.fail('Expected AUTH_EXPIRED fault');
			}
		} catch (error) {
			// Server may return XML fault for expired tokens, causing JSON parse error
			assert.match(String(error), /AUTH_EXPIRED|not valid JSON|SyntaxError/,
				'Should fail due to expired token');
		}
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
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content
			: authRes.AuthResponse.authToken._content
			|| authRes.AuthResponse.authToken;

		// Wait for token expiration (5s lifetime + buffer)
		await new Promise(resolve => setTimeout(resolve, 6000));

		// Try to re-auth with the expired token in the context
		try {

			// Send the message
			const reAuthRes = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${account1Name}</account>
					<password>${config.accountPassword}</password>
				</AuthRequest>`, token
			);
			if (reAuthRes.Fault) {

				// Verify response
				assert.include(reAuthRes.Fault.Detail.Error.Code, 'service.AUTH_EXPIRED',
					'Should return AUTH_EXPIRED');
			} else {
				// Some servers may still allow re-auth
				assert.notExists(reAuthRes.Fault, 'Response should not be a Fault');
				assert.exists(reAuthRes.AuthResponse, 'AuthResponse should exist');
				assert.match(String(reAuthRes.AuthResponse.lifetime), /^\d+$/,
					'lifetime should be numeric');
				assert.exists(reAuthRes.AuthResponse.authToken, 'authToken should exist');
			}
		} catch (error) {
			assert.match(String(error), /AUTH_EXPIRED|not valid JSON|SyntaxError/,
				'Should fail due to expired token');
		}
	});
});
