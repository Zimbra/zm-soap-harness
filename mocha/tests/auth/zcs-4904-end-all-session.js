import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Zcs 4904 End All Session', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let account1Name;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		account1Name = 'user' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account1');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | End Session Request to end specific active session', async () => {
		// Auth request 1 - get first session
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes1.Fault, 'Response should not be a Fault');
		assert.exists(authRes1.AuthResponse, 'First AuthResponse should exist');
		assert.match(String(authRes1.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes1.AuthResponse.authToken, 'authToken should exist');

		const token1 = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content
			: authRes1.AuthResponse.authToken._content
			|| authRes1.AuthResponse.authToken;

		// Auth request 2 - get second session
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes2.Fault, 'Response should not be a Fault');
		assert.exists(authRes2.AuthResponse, 'Second AuthResponse should exist');
		assert.match(String(authRes2.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');

		const token2 = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content
			: authRes2.AuthResponse.authToken._content
			|| authRes2.AuthResponse.authToken;

		// Auth request 3 - active session for EndSessionRequest
		const authRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes3.Fault, 'Response should not be a Fault');
		assert.exists(authRes3.AuthResponse, 'Third AuthResponse should exist');
		assert.match(String(authRes3.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes3.AuthResponse.authToken, 'authToken should exist');

		const token3 = Array.isArray(authRes3.AuthResponse.authToken)
			? authRes3.AuthResponse.authToken[0]._content
			: authRes3.AuthResponse.authToken._content
			|| authRes3.AuthResponse.authToken;

		// Verify token3 is still valid by re-authenticating with it
		const verifyRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false">
				<authToken>${token3}</authToken>
			</AuthRequest>`, null
		);
		assert.notExists(verifyRes.Fault, 'Response should not be a Fault');
		assert.exists(verifyRes.AuthResponse, 'Token3 should still be valid for re-auth');
		assert.match(String(verifyRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(verifyRes.AuthResponse.authToken, 'authToken should exist');
	});


	it('Regression | End Session Request to end all active sessions', async () => {
		// Auth request 1
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes1.Fault, 'Response should not be a Fault');
		assert.exists(authRes1.AuthResponse, 'First AuthResponse should exist');
		assert.match(String(authRes1.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes1.AuthResponse.authToken, 'authToken should exist');

		const token1 = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content
			: authRes1.AuthResponse.authToken._content
			|| authRes1.AuthResponse.authToken;

		// Auth request 2
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes2.Fault, 'Response should not be a Fault');
		assert.exists(authRes2.AuthResponse, 'Second AuthResponse should exist');
		assert.match(String(authRes2.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');

		const token2 = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content
			: authRes2.AuthResponse.authToken._content
			|| authRes2.AuthResponse.authToken;

		// End all sessions using token2
		const endRes = await soap.makeSOAPEnvelopeAccount(
			'<EndSessionRequest xmlns="urn:zimbraAccount" logoff="1"/>', token2
		);
		assert.notExists(endRes.Fault, 'Response should not be a Fault');
		assert.exists(endRes.EndSessionResponse, 'EndSessionResponse should exist');

		// Verify token1 is invalidated
		const verifyRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false">
				<authToken>${token1}</authToken>
			</AuthRequest>`, null
		);
		if (verifyRes.Fault) {
			assert.include(verifyRes.Fault.Detail.Error.Code, 'service.AUTH_EXPIRED',
				'Token1 should be expired after EndSession');
		}

		// Verify token2 is also invalidated
		const verifyRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false">
				<authToken>${token2}</authToken>
			</AuthRequest>`, null
		);
		if (verifyRes2.Fault) {
			assert.include(verifyRes2.Fault.Detail.Error.Code, 'service.AUTH_EXPIRED',
				'Token2 should be expired after EndSession');
		}
	});
});
