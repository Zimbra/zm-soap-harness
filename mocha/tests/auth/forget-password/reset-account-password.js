import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Auth > Forget Password > Reset Account Password', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name;
	let testAccount1Name;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test_account1 (recovery email recipient)
		testAccount1Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccount1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create test_account1');

		// Create account1 with recovery email pre-configured
		account1Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
				<a n="zimbraPrefPasswordRecoveryAddress">${testAccount1Name}</a>
				<a n="zimbraPrefPasswordRecoveryAddressStatus">verified</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account1');
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
	it('Smoke | Reset password from recover link', async () => {
		// Auth as account1
		// Send the message
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes1.Fault, 'Response should not be a Fault');
		assert.exists(authRes1.AuthResponse, 'AuthResponse should exist');

		const acct1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		// Send RecoverAccountRequest
		const recoverRes = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest xmlns="urn:zimbraMail">
				<op>sendRecoveryLink</op>
				<email>${account1Name}</email>
			</RecoverAccountRequest>`, acct1Token
		);

		// Verify response
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
		assert.exists(recoverRes.RecoverAccountResponse,
			'RecoverAccountResponse should exist');

		// Reset account password via admin
		adminAuthToken = await soap.getAdminAuthToken();

		// ResetAccountPasswordRequest
		const resetRes = await soap.makeSOAPEnvelopeAdmin(
			`<ResetAccountPasswordRequest xmlns="urn:zimbraAdmin">
				<account by="name">${account1Name}</account>
			</ResetAccountPasswordRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(resetRes.Fault, 'Response should not be a Fault');
		assert.exists(resetRes.ResetAccountPasswordResponse,
			'ResetAccountPasswordResponse should exist');

		// Wait for email delivery
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Auth as test_account1 and search for reset password email
		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccount1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes2.Fault, 'Response should not be a Fault');
		assert.exists(authRes2.AuthResponse, 'AuthResponse should exist');

		const testAcct1Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		// Search for any email in test_account1 inbox (recovery notification)
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, testAcct1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const msgs = searchRes.SearchResponse.m;

		// Verify response
		assert.exists(msgs, 'Should find recovery email in inbox');

		const msg = Array.isArray(msgs) ? msgs[0] : msgs;

		// Verify response
		assert.exists(msg.id, 'Message should have an id');

		// Get message and validate it has content
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg.id}" />
			</GetMsgRequest>`, testAcct1Token
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');

		const fullMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;

		// Verify response
		assert.equal(fullMsg.id, msg.id, 'Message id should match');
		assert.exists(fullMsg.mp, 'Message part should exist');
	});
});
