import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Forgetpassword > Set Recovery Email', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	let account1Server;
	let account2Name;
	let account3Name;
	let account3Id;
	let account4Name;
	let account4Id;
	let account1RecoveryCode;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Name = 'test1.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account3 with recovery settings
		account3Name = 'test3.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
				<a n="zimbraRecoveryAccountCodeValidity">30s</a>
				<a n="zimbraPasswordRecoveryMaxAttempts">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct3 = Array.isArray(createRes3.CreateAccountResponse.account)
			? createRes3.CreateAccountResponse.account[0]
			: createRes3.CreateAccountResponse.account;
		account3Id = acct3.id;

		// Create account4
		account4Name = 'test4.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
				<a n="zimbraRecoveryAccountCodeValidity">30s</a>
				<a n="zimbraPasswordRecoveryMaxAttempts">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct4 = Array.isArray(createRes4.CreateAccountResponse.account)
			? createRes4.CreateAccountResponse.account[0]
			: createRes4.CreateAccountResponse.account;
		account4Id = acct4.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Set recovery email and send code to that email 1', async () => {
		// Auth as account1
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acct1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		// Send recovery code
		const sendCodeRes = await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="sendCode" recoveryAccount="${account2Name}" channel="email" xmlns="urn:zimbraMail" />`, acct1Token
		);
		assert.notExists(sendCodeRes.Fault, 'Response should not be a Fault');
		assert.exists(sendCodeRes.SetRecoveryAccountResponse, 'Should send code');

		// Auth as account2
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		const acct2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		await new Promise(resolve => setTimeout(resolve, 30000));

		// Search for recovery code
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
				<query>${account1Name}</query>
			</SearchRequest>`, acct2Token
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const codeMatch = conv.fr.match(/Recovery email verification code: (\S+)/);
		assert.exists(codeMatch, 'Should find recovery code');

		account1RecoveryCode = codeMatch[1];

		// Verify status is pending
		adminAuthToken = await soap.getAdminAuthToken();
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account1Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const recoveryAddr = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddress');
		assert.equal(recoveryAddr._content, account2Name,
			'Recovery address should match');
		const recoveryStatus = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddressStatus');
		assert.equal(recoveryStatus._content, 'pending', 'Status should be pending');
	});


	it('Sanity | Verify that the recovery code sent can be used to set recovery email 1', async () => {
		// Auth as account1
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Validate code
		const validateRes = await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="validateCode" recoveryAccountVerificationCode="${account1RecoveryCode}" channel="email" xmlns="urn:zimbraMail" />`, acctToken
		);
		assert.notExists(validateRes.Fault, 'Response should not be a Fault');
		assert.exists(validateRes.SetRecoveryAccountResponse,
			'Validation should succeed');

		// Verify status is verified
		adminAuthToken = await soap.getAdminAuthToken();
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account1Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const recoveryAddr = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddress');
		assert.equal(recoveryAddr._content, account2Name,
			'Recovery address should match');
		const recoveryStatus = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddressStatus');
		assert.equal(recoveryStatus._content, 'verified', 'Status should be verified');
	});


	it('Sanity | Verify that the recovery code sent can be used to set recovery email 1 1', async () => {
		// Auth as account1
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Reset recovery email
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			'<SetRecoveryAccountRequest op="reset" channel="email" xmlns="urn:zimbraMail" />', acctToken
		);
		assert.notExists(resetRes.Fault, 'Response should not be a Fault');
		assert.exists(resetRes.SetRecoveryAccountResponse, 'Reset should succeed');

		// Verify recovery address and status are removed
		adminAuthToken = await soap.getAdminAuthToken();
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account1Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const recoveryAddr = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddress');
		assert.notExists(recoveryAddr, 'Recovery address should be removed after reset');
	});


	it('Sanity | Set recovery email and send code to that email 1 1', async () => {
		// Auth as account3
		const authRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		const acct3Token = Array.isArray(authRes3.AuthResponse.authToken)
			? authRes3.AuthResponse.authToken[0]._content || authRes3.AuthResponse.authToken[0]
			: authRes3.AuthResponse.authToken._content || authRes3.AuthResponse.authToken;

		// Send initial code
		await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="sendCode" recoveryAccount="${account2Name}" channel="email" xmlns="urn:zimbraMail" />`, acct3Token
		);

		// Wait for code to expire, then resend
		await new Promise(resolve => setTimeout(resolve, 40000));

		const authRes3b = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		const acct3TokenB = Array.isArray(authRes3b.AuthResponse.authToken)
			? authRes3b.AuthResponse.authToken[0]._content || authRes3b.AuthResponse.authToken[0]
			: authRes3b.AuthResponse.authToken._content || authRes3b.AuthResponse.authToken;

		const resendRes = await soap.makeSOAPEnvelopeAccount(
			'<SetRecoveryAccountRequest op="resendCode" channel="email" xmlns="urn:zimbraMail" />', acct3TokenB
		);
		assert.notExists(resendRes.Fault, 'Response should not be a Fault');
		assert.exists(resendRes.SetRecoveryAccountResponse, 'Resend should succeed');

		// Verify status is still pending
		adminAuthToken = await soap.getAdminAuthToken();
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account3Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const recoveryAddr = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddress');
		assert.equal(recoveryAddr._content, account2Name,
			'Recovery address should match');
		const recoveryStatus = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddressStatus');
		assert.equal(recoveryStatus._content, 'pending', 'Status should be pending');
	});


	it('Sanity | Set recovery email as primary email and verify error message', async () => {
		// Auth as account4
		const authRes4 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		const acct4Token = Array.isArray(authRes4.AuthResponse.authToken)
			? authRes4.AuthResponse.authToken[0]._content || authRes4.AuthResponse.authToken[0]
			: authRes4.AuthResponse.authToken._content || authRes4.AuthResponse.authToken;

		// Try to set recovery email as own email
		const sendCodeRes = await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="sendCode" recoveryAccount="${account4Name}" channel="email" xmlns="urn:zimbraMail" />`, acct4Token
		);
		if (sendCodeRes.Fault) {
			assert.include(sendCodeRes.Fault.Reason.Text, 'Recovery address should not be same as primary/alias email address',
				'Should indicate recovery same as primary error');
			assert.include(sendCodeRes.Fault.Detail.Error.Code, 'service.RECOVERY_EMAIL_SAME_AS_PRIMARY_OR_ALIAS',
				'Error code should match');
		} else {
			assert.fail('Expected Fault for setting recovery as own email');
		}

		// Verify no recovery address is set
		adminAuthToken = await soap.getAdminAuthToken();
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account4Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const recoveryAddr = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddress');
		assert.notExists(recoveryAddr, 'Recovery address should not be set');
	});
});
