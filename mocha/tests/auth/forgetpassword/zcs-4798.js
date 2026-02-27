import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Forgetpassword > Zcs 4798', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	let account1Server;
	let account2Name;
	let account3Name;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 with reset password enabled
		account1Name = 'test1.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
				<a n="zimbraResetPasswordRecoveryCodeExpiry">50s</a>
				<a n="zimbraPasswordRecoveryMaxAttempts">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		account1Server = host1 ? host1._content : config.server;

		// Create account2
		account2Name = 'test2.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		// Create account3 with reset password enabled
		account3Name = 'test3.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes3.Fault, 'Response should not be a Fault');
		assert.exists(createRes3.CreateAccountResponse, 'Should create account3');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Set recovery email and validate it using code', async () => {
		// Auth as account1
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(authRes1.Fault, 'Response should not be a Fault');
		assert.exists(authRes1.AuthResponse, 'Should authenticate account1');
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
		assert.notExists(sendCodeRes.Fault, 'Response should not be a Fault');
		assert.exists(sendCodeRes.SetRecoveryAccountResponse,
			'SetRecoveryAccountResponse should exist');

		// Auth as account2 to get recovery code email
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes2.Fault, 'Response should not be a Fault');
		assert.exists(authRes2.AuthResponse, 'Should authenticate account2');
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
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		// Extract recovery code from email
		const conversations = searchRes.SearchResponse.c;
		assert.exists(conversations, 'Should find recovery code email');

		const conv = Array.isArray(conversations) ? conversations[0] : conversations;
		const fragment = conv.fr;
		assert.exists(fragment, 'Should have message fragment with recovery code');

		const codeMatch = fragment.match(/Recovery email verification code: (\S+)/);
		assert.exists(codeMatch, 'Should find recovery code in email');

		const recoveryCode = codeMatch[1];

		// Re-auth as account1 and validate code
		const authRes1b = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acct1TokenB = Array.isArray(authRes1b.AuthResponse.authToken)
			? authRes1b.AuthResponse.authToken[0]._content || authRes1b.AuthResponse.authToken[0]
			: authRes1b.AuthResponse.authToken._content || authRes1b.AuthResponse.authToken;

		const validateRes = await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="validateCode" recoveryAccountVerificationCode="${recoveryCode}" channel="email" xmlns="urn:zimbraMail" />`, acct1TokenB
		);
		assert.notExists(validateRes.Fault, 'Response should not be a Fault');
		assert.exists(validateRes.SetRecoveryAccountResponse,
			'SetRecoveryAccountResponse should exist');

		// Verify recovery email status via admin
		adminAuthToken = await soap.getAdminAuthToken();
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account1Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(getAcctRes.Fault, 'Response should not be a Fault');
		assert.exists(getAcctRes.GetAccountResponse, 'GetAccountResponse should exist');

		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const recoveryAddr = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddress');
		assert.exists(recoveryAddr, 'Recovery address should be set');
		assert.equal(recoveryAddr._content, account2Name,
			'Recovery address should match account2');
		const recoveryStatus = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddressStatus');
		assert.exists(recoveryStatus, 'Recovery status should be set');
		assert.equal(recoveryStatus._content, 'verified',
			'Recovery status should be verified');
	});


	it('Sanity | Get recovery details for the account', async () => {
		// Auth as account1
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'Should authenticate account1');
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
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
		assert.exists(recoverRes.RecoverAccountResponse,
			'RecoverAccountResponse should exist');
		assert.exists(recoverRes.RecoverAccountResponse.recoveryAccount,
			'Recovery account should be returned');
	});


	it('Sanity | Get recovery details for the account 1', async () => {
		// Auth as account1
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'Should authenticate account1');
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
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
		assert.exists(recoverRes.RecoverAccountResponse,
			'RecoverAccountResponse should exist');
	});


	it('Sanity | Verify resend feature of the RecoverAccount API', async () => {
		// Auth as account1
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'Should authenticate account1');
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
		assert.notExists(attempt1.Fault, 'Response should not be a Fault');
		assert.exists(attempt1.RecoverAccountResponse, 'Attempt 1 should succeed');

		// Attempt 2 - should succeed
		const attempt2 = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken, false
		);
		assert.notExists(attempt2.Fault, 'Response should not be a Fault');
		assert.exists(attempt2.RecoverAccountResponse, 'Attempt 2 should succeed');

		// Attempt 3 - should succeed
		const attempt3 = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken, false
		);
		assert.notExists(attempt3.Fault, 'Response should not be a Fault');
		assert.exists(attempt3.RecoverAccountResponse, 'Attempt 3 should succeed');

		// Attempt 4 - should fail with max attempts
		const attempt4 = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken, false
		);
		if (attempt4.Fault) {
			assert.include(attempt4.Fault.Reason.Text, 'Max re-send attempts reached',
				'Should indicate max attempts reached');
			assert.include(attempt4.Fault.Detail.Error.Code, 'service.MAX_ATTEMPTS_REACHED_SUSPEND_FEATURE',
				'Error code should be MAX_ATTEMPTS_REACHED_SUSPEND_FEATURE');
		} else {
			assert.fail('Expected Fault for exceeding max recovery attempts');
		}
	});
});
