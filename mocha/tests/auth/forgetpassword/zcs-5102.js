import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Forgetpassword > Zcs 5102', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	let account1Server;
	let account2Name;
	let account3Name;
	let account3Id;
	let account4Name;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 with lockout enabled
		account1Name = 'test1.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
			</CreateAccountRequest>`, adminAuthToken
		);
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

		// Create account3 with lockout and failure lifetime
		account3Name = 'test3.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">30s</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct3 = Array.isArray(createRes3.CreateAccountResponse.account)
			? createRes3.CreateAccountResponse.account[0]
			: createRes3.CreateAccountResponse.account;
		account3Id = acct3.id;

		// Create account4
		account4Name = 'test4.' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Set up recovery email for account1 (reusing account2)
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acct1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="sendCode" recoveryAccount="${account2Name}" channel="email" xmlns="urn:zimbraMail" />`, acct1Token
		);

		// Auth as account2, get code, validate
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		const acct2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		await new Promise(resolve => setTimeout(resolve, 20000));

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
				<query>${account1Name}</query>
			</SearchRequest>`, acct2Token
		);
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const codeMatch = conv.fr.match(/Recovery email verification code: (\S+)/);
		const recoveryCode = codeMatch[1];

		const authRes1b = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acct1TokenB = Array.isArray(authRes1b.AuthResponse.authToken)
			? authRes1b.AuthResponse.authToken[0]._content || authRes1b.AuthResponse.authToken[0]
			: authRes1b.AuthResponse.authToken._content || authRes1b.AuthResponse.authToken;

		await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="validateCode" recoveryAccountVerificationCode="${recoveryCode}" channel="email" xmlns="urn:zimbraMail" />`, acct1TokenB
		);

		// Set up recovery email for account3 (reusing account4)
		const authRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		const acct3Token = Array.isArray(authRes3.AuthResponse.authToken)
			? authRes3.AuthResponse.authToken[0]._content || authRes3.AuthResponse.authToken[0]
			: authRes3.AuthResponse.authToken._content || authRes3.AuthResponse.authToken;

		await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="sendCode" recoveryAccount="${account4Name}" channel="email" xmlns="urn:zimbraMail" />`, acct3Token
		);

		const authRes4 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		const acct4Token = Array.isArray(authRes4.AuthResponse.authToken)
			? authRes4.AuthResponse.authToken[0]._content || authRes4.AuthResponse.authToken[0]
			: authRes4.AuthResponse.authToken._content || authRes4.AuthResponse.authToken;

		await new Promise(resolve => setTimeout(resolve, 20000));

		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
				<query>${account3Name}</query>
			</SearchRequest>`, acct4Token
		);
		const conv3 = Array.isArray(searchRes3.SearchResponse.c)
			? searchRes3.SearchResponse.c[0] : searchRes3.SearchResponse.c;
		const codeMatch3 = conv3.fr.match(/Recovery email verification code: (\S+)/);
		const recoveryCode3 = codeMatch3[1];

		const authRes3b = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		const acct3TokenB = Array.isArray(authRes3b.AuthResponse.authToken)
			? authRes3b.AuthResponse.authToken[0]._content || authRes3b.AuthResponse.authToken[0]
			: authRes3b.AuthResponse.authToken._content || authRes3b.AuthResponse.authToken;

		await soap.makeSOAPEnvelopeAccount(
			`<SetRecoveryAccountRequest op="validateCode" recoveryAccountVerificationCode="${recoveryCode3}" channel="email" xmlns="urn:zimbraMail" />`, acct3TokenB
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Set recovery email and validate it using code - account1', async () => {
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


	it('Sanity | Set recovery email and validate it using code - account3', async () => {
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
		assert.equal(recoveryAddr._content, account4Name,
			'Recovery address should match');
		const recoveryStatus = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddressStatus');
		assert.equal(recoveryStatus._content, 'verified', 'Status should be verified');
	});


	it('Sanity | Get recovery details for the account and verify account lockout scenario .', async () => {
		const invalidRecoveryCode = 'abc1234';

		// Auth as account1 and send recovery code
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken
		);

		// Attempt 1 - invalid recovery code
		const attempt1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<recoveryCode>${invalidRecoveryCode}</recoveryCode>
			</AuthRequest>`, null, true, account1Server
		);
		assert.exists(attempt1.Fault, 'Attempt 1 should fail');
		assert.include(attempt1.Fault.Reason.Text, 'authentication failed',
			'Should indicate auth failed');

		// Attempt 2 - invalid recovery code
		const attempt2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<recoveryCode>${invalidRecoveryCode}</recoveryCode>
			</AuthRequest>`, null, true, account1Server
		);
		assert.exists(attempt2.Fault, 'Attempt 2 should fail');

		// Attempt 3 - should trigger lockout
		const attempt3 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<recoveryCode>${invalidRecoveryCode}</recoveryCode>
			</AuthRequest>`, null, true, account1Server
		);
		assert.exists(attempt3.Fault, 'Attempt 3 should fail');

		// Verify account is locked out
		adminAuthToken = await soap.getAdminAuthToken();
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account1Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const accountStatus = acct.a.find(a => a.n === 'zimbraAccountStatus');
		assert.equal(accountStatus._content, 'lockout', 'Account should be locked out');
	});


	it('Sanity | Get recovery details for the account and verify account lockout scenario . - zimbraPasswordLockoutFailureLifetime honored', async () => {
		const invalidRecoveryCode = 'abc1234';

		// Auth as account3 and send recovery code
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account3Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken
		);

		// Attempt 1 - invalid recovery code
		const attempt1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<recoveryCode>${invalidRecoveryCode}</recoveryCode>
			</AuthRequest>`, null, true
		);
		assert.exists(attempt1.Fault, 'Attempt 1 should fail');

		// Wait for lockout failure lifetime to expire
		await new Promise(resolve => setTimeout(resolve, 30000));

		// Attempt 2 - after lifetime expired, should not lock out
		const attempt2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<recoveryCode>${invalidRecoveryCode}</recoveryCode>
			</AuthRequest>`, null, true
		);
		assert.exists(attempt2.Fault, 'Attempt 2 should fail');

		// Verify account is NOT locked out
		adminAuthToken = await soap.getAdminAuthToken();
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account3Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const accountStatus = acct.a.find(a => a.n === 'zimbraAccountStatus');
		assert.equal(accountStatus._content, 'active', 'Account should still be active');
	});
});
