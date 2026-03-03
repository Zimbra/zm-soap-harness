import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Auth > Forget Password > ZCS 4798', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	let account1Server;
	let account2Name;
	let account3Name;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 with reset password enabled
		account1Name = 'test1.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
				<a n="zimbraResetPasswordRecoveryCodeExpiry">50s</a>
				<a n="zimbraPasswordRecoveryMaxAttempts">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		account1Server = host1 ? host1._content : config.server;

		// Create account2
		account2Name = 'test2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');

		// Create account3 with reset password enabled
		account3Name = 'test3.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes3.Fault, 'Response should not be a Fault');
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
	it('Sanity | Set recovery email and validate it using code', async () => {
		// Auth as account1
		// Send the message
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);

		// Verify response
		assert.notExists(authRes1.Fault, 'Response should not be a Fault');
		assert.match(String(authRes1.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes1.AuthResponse.authToken, 'authToken should exist');

		const acct1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		// Send recovery code
		const sendCodeRes = await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="sendCode" recoveryAccount="${account2Name}" channel="email" xmlns="urn:zimbraMail" />`, acct1Token
		);

		// Verify response
		assert.notExists(sendCodeRes.Fault, 'Response should not be a Fault');

		// Auth as account2 to get recovery code email
		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes2.Fault, 'Response should not be a Fault');
		assert.match(String(authRes2.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');

		const acct2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		// Wait for email delivery
		await new Promise(resolve => setTimeout(resolve, 20000));

		// Search for recovery code email
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
				<query>${account1Name}</query>
			</SearchRequest>`, acct2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');

		// Extract recovery code from email
		const conversations = searchRes.SearchResponse.c;

		// Verify response
		assert.exists(conversations, 'Should find recovery code email');

		const conv = Array.isArray(conversations) ? conversations[0] : conversations;
		const fragment = conv.fr;

		// Verify response
		assert.exists(fragment, 'Should have message fragment with recovery code');

		const codeMatch = fragment.match(/Recovery email verification code: (\S+)/);

		// Verify response
		assert.exists(codeMatch, 'Should find recovery code in email');

		const recoveryCode = codeMatch[1];

		// Re-auth as account1 and validate code
		// Send the message
		const authRes1b = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acct1TokenB = Array.isArray(authRes1b.AuthResponse.authToken)
			? authRes1b.AuthResponse.authToken[0]._content || authRes1b.AuthResponse.authToken[0]
			: authRes1b.AuthResponse.authToken._content || authRes1b.AuthResponse.authToken;

		// SetRecoveryAccountRequest
		const validateRes = await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="validateCode" recoveryAccountVerificationCode="${recoveryCode}" channel="email" xmlns="urn:zimbraMail" />`, acct1TokenB
		);

		// Verify response
		assert.notExists(validateRes.Fault, 'Response should not be a Fault');

		// Verify recovery email status via admin
		adminAuthToken = await soap.getAdminAuthToken();

		// GetAccountRequest
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account1Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getAcctRes.Fault, 'Response should not be a Fault');

		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const recoveryAddr = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddress');

		// Verify response
		assert.exists(recoveryAddr, 'Recovery address should be set');
		assert.equal(recoveryAddr._content, account2Name,
			'Recovery address should match account2');
		const recoveryStatus = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddressStatus');

		// Verify response
		assert.exists(recoveryStatus, 'Recovery status should be set');
		assert.equal(recoveryStatus._content, 'verified',
			'Recovery status should be verified');
	});


	it('Sanity | Get recovery details for the account', async () => {
		// Auth as account1
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Get recovery account
		const recoverRes = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="getRecoveryAccount" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken
		);

		// Verify response
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
		assert.exists(recoverRes.RecoverAccountResponse.recoveryAccount,
			'Recovery account should be returned');
	});


	it('Sanity | Get recovery details for the account 1', async () => {
		// Auth as account1
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Send recovery code
		const recoverRes = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken
		);

		// Verify response
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify resend feature of the RecoverAccount API', async () => {
		// Auth as account1
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Attempt 1 - should succeed
		const attempt1 = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken, false
		);

		// Verify response
		assert.notExists(attempt1.Fault, 'Response should not be a Fault');

		// Attempt 2 - should succeed
		const attempt2 = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken, false
		);

		// Verify response
		assert.notExists(attempt2.Fault, 'Response should not be a Fault');

		// Attempt 3 - should succeed
		const attempt3 = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken, false
		);

		// Verify response
		assert.notExists(attempt3.Fault, 'Response should not be a Fault');

		// Attempt 4 - should fail with max attempts
		const attempt4 = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken, false
		);
		assert.isString(attempt4.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(attempt4.Fault.Reason.Text, 'Max re-send attempts reached',
			'Should indicate max attempts reached');
		assert.include(attempt4.Fault.Detail.Error.Code, 'service.MAX_ATTEMPTS_REACHED_SUSPEND_FEATURE',
			'Error code should be MAX_ATTEMPTS_REACHED_SUSPEND_FEATURE');
	});
});
