import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Auth > Forgetpassword > Reset Password ZCS 4802', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1NewPassword;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 with reset password enabled
		account1Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
				<a n="zimbraResetPasswordRecoveryCodeExpiry">30m</a>
				<a n="zimbraPasswordMinLength">6</a>
				<a n="zimbraPasswordLocked">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account1');

		Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
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
	it('Sanity | Reset password for a valid auth token', async () => {
		// Auth as account1
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

		const acct1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Reset password
		account1NewPassword = 't_est@1234';

		// ResetPasswordRequest
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<ResetPasswordRequest xmlns="urn:zimbraAccount">
				<password>${account1NewPassword}</password>
			</ResetPasswordRequest>`, acct1Token
		);

		// Verify response
		assert.notExists(resetRes.Fault, 'Response should not be a Fault');
		assert.exists(resetRes.ResetPasswordResponse,
			'ResetPasswordResponse should exist');

		// Login with new password - should pass
		// Send the message
		const authResNew = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${account1NewPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authResNew.Fault, 'Response should not be a Fault');
		assert.exists(authResNew.AuthResponse,
			'AuthResponse with new password should exist');
		assert.exists(authResNew.AuthResponse.authToken, 'authToken should exist');

		// Login with old password - should fail
		// Send the message
		const authResOld = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password></password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.exists(authResOld.Fault, 'Should return Fault for old password');
		assert.match(authResOld.Fault.Detail.Error.Code, /^account.AUTH_FAILED/,
			'Should return AUTH_FAILED');
	});


	it('Sanity | Reset password based on auth token for password less than min length', async () => {
		// Auth as account1 with the new password from previous test
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${account1NewPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const acct1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Reset password with too short password - should fail
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<ResetPasswordRequest xmlns="urn:zimbraAccount">
				<password>test</password>
			</ResetPasswordRequest>`, acct1Token
		);

		// Verify response
		assert.exists(resetRes.Fault, 'Should return Fault for short password');
		assert.match(resetRes.Fault.Detail.Error.Code, /account.INVALID_PASSWORD/,
			'Should return INVALID_PASSWORD');
		assert.match(resetRes.Fault.Reason.Text, /too short/,
			'Error text should mention too short');
	});


	it('Regression | Reset password based on auth token for empty password', async () => {
		// Auth as account1
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${account1NewPassword || config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const acct1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Reset password with empty password - should fail
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<ResetPasswordRequest xmlns="urn:zimbraAccount">
				<password></password>
			</ResetPasswordRequest>`, acct1Token
		);

		// Verify response
		assert.exists(resetRes.Fault, 'Should return Fault for empty password');
		assert.exists(resetRes.Fault.Detail.Error.Code, 'Error code should exist');
	});
});
