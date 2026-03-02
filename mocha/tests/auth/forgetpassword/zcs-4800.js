import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Auth > Forgetpassword > ZCS 4800', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	let account1Server;
	let account1Alias;
	let account2Name;
	let account3Name;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 with reset password and lockout enabled
		account1Name = 'test1.' + common.getUniqueString() + '@' + config.testDomain;
		account1Alias = 'alias_' + account1Name;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureResetPasswordStatus">enabled</a>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
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

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account3
		account3Name = 'test3.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Add alias for account1
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${account1Alias}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
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

		// Verify response
		assert.notExists(sendCodeRes.Fault, 'Response should not be a Fault');
		assert.exists(sendCodeRes.SetRecoveryAccountResponse,
			'SetRecoveryAccountResponse should exist');

		// Auth as account2
		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		const acct2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		await new Promise(resolve => setTimeout(resolve, 20000));

		// Search for recovery code email
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
				<query>${account1Name}</query>
			</SearchRequest>`, acct2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const codeMatch = conv.fr.match(/Recovery email verification code: (\S+)/);

		// Verify response
		assert.exists(codeMatch, 'Should find recovery code');

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
		assert.exists(validateRes.SetRecoveryAccountResponse,
			'Validation should succeed');

		// Verify via admin
		adminAuthToken = await soap.getAdminAuthToken();

		// GetAccountRequest
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account1Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0]
			: getAcctRes.GetAccountResponse.account;
		const recoveryAddr = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddress');

		// Verify response
		assert.equal(recoveryAddr._content, account2Name,
			'Recovery address should match');
		const recoveryStatus = acct.a.find(a => a.n === 'zimbraPrefPasswordRecoveryAddressStatus');

		// Verify response
		assert.equal(recoveryStatus._content, 'verified', 'Status should be verified');
	});


	it('Sanity | Get recovery details for the account 1', async () => {
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// RecoverAccountRequest
		const recoverRes = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken
		);

		// Verify response
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
		assert.exists(recoverRes.RecoverAccountResponse,
			'RecoverAccountResponse should exist');
	});


	it('Sanity | Use recovery code to generate Auth token', async () => {
		// Wait for recovery code email
		await new Promise(resolve => setTimeout(resolve, 50000));

		// Auth as account2 to get recovery code
		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		const acct2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:"Reset your" in:inbox</query>
			</SearchRequest>`, acct2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const msgs = searchRes.SearchResponse.m;

		// Verify response
		assert.exists(msgs, 'Should find messages');

		const msg = Array.isArray(msgs) ? msgs[0] : msgs;

		// Verify response
		assert.exists(msg, 'Should have at least one message');

		// Get message body if fragment is not available
		let messageText = msg.fr || '';
		if (!messageText) {

			// GetMsgRequest
			const getMsgRes = await soap.makeSOAPEnvelopeAccount(
				`<GetMsgRequest xmlns="urn:zimbraMail">
					<m id="${msg.id}" />
				</GetMsgRequest>`, acct2Token
			);
			const fullMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
				? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
			messageText = fullMsg.fr || '';
		}
		const codeMatch = messageText.match(/Temporary Reset Code: (\S+)/);

		// Verify response
		assert.exists(codeMatch, 'Should find recovery code');

		const recoveryCode = codeMatch[1];

		// Auth with recovery code
		// Send the message
		const authRecovery = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<recoveryCode>${recoveryCode}</recoveryCode>
			</AuthRequest>`, null, true, account1Server
		);

		// Verify response
		assert.notExists(authRecovery.Fault, 'Response should not be a Fault');
		assert.exists(authRecovery.AuthResponse, 'Should auth with recovery code');
		assert.match(String(authRecovery.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRecovery.AuthResponse.authToken, 'authToken should exist');

		const recoveryToken = Array.isArray(authRecovery.AuthResponse.authToken)
			? authRecovery.AuthResponse.authToken[0]._content || authRecovery.AuthResponse.authToken[0]
			: authRecovery.AuthResponse.authToken._content || authRecovery.AuthResponse.authToken;

		// Verify temporary auth token can't send email
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Name}" />
					<su>recovery auth email1</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, recoveryToken
		);
		if (sendRes.Fault) {

			// Verify response
			assert.include(sendRes.Fault.Reason.Text, 'reset password',
				'Should indicate reset password restriction');
		} else {
			assert.fail('Expected Fault when using recovery token to send email');
		}
	});


	it('Sanity | Get recovery details for the account and generate auth token for alias account', async () => {
		// Auth as account1
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Send recovery code
		const recoverRes = await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken
		);

		// Verify response
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
		assert.exists(recoverRes.RecoverAccountResponse, 'Should send recovery code');

		// Wait and get code from account2
		await new Promise(resolve => setTimeout(resolve, 50000));

		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		const acct2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:"Reset your" in:inbox</query>
			</SearchRequest>`, acct2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const msgs = searchRes.SearchResponse.m;

		// Verify response
		assert.exists(msgs, 'Should find messages');

		const msg = Array.isArray(msgs) ? msgs[0] : msgs;

		// Verify response
		assert.exists(msg, 'Should have at least one message');

		// Get message body if fragment is not available
		let messageText = msg.fr || '';
		if (!messageText) {

			// GetMsgRequest
			const getMsgRes = await soap.makeSOAPEnvelopeAccount(
				`<GetMsgRequest xmlns="urn:zimbraMail">
					<m id="${msg.id}" />
				</GetMsgRequest>`, acct2Token
			);
			const fullMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
				? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
			messageText = fullMsg.fr || '';
		}
		const codeMatch = messageText.match(/Temporary Reset Code: (\S+)/);

		// Verify response
		assert.exists(codeMatch, 'Should find recovery code');

		const recoveryCode2 = codeMatch[1];

		// Auth with alias and recovery code
		// Send the message
		const authAlias = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Alias}</account>
				<recoveryCode>${recoveryCode2}</recoveryCode>
			</AuthRequest>`, null, true, account1Server
		);

		// Verify response
		assert.notExists(authAlias.Fault, 'Response should not be a Fault');
		assert.exists(authAlias.AuthResponse, 'Should auth with alias and recovery code');
		assert.match(String(authAlias.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authAlias.AuthResponse.authToken, 'authToken should exist');

		const aliasToken = Array.isArray(authAlias.AuthResponse.authToken)
			? authAlias.AuthResponse.authToken[0]._content || authAlias.AuthResponse.authToken[0]
			: authAlias.AuthResponse.authToken._content || authAlias.AuthResponse.authToken;

		// Verify temporary token can't send email
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${config.adminUser}" />
					<su>recovery auth email2</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, aliasToken
		);
		if (sendRes.Fault) {

			// Verify response
			assert.include(sendRes.Fault.Reason.Text, 'reset password',
				'Should indicate reset password restriction');
		} else {
			assert.fail('Expected Fault when using recovery token to send email');
		}
	});


	it('Sanity | Get recovery details for the malformed email and verify error', async () => {
		const malformedEmail = 'abc.com';

		// Auth as account1
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const acctToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Send recovery code
		await soap.makeSOAPEnvelopeAccount(
			`<RecoverAccountRequest op="sendRecoveryCode" email="${account1Name}" channel="email" xmlns="urn:zimbraMail" />`, acctToken
		);

		// Wait and get code
		await new Promise(resolve => setTimeout(resolve, 50000));

		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		const acct2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:"Reset your" in:inbox</query>
			</SearchRequest>`, acct2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const msgs = searchRes.SearchResponse.m;

		// Verify response
		assert.exists(msgs, 'Should find messages');

		const msg = Array.isArray(msgs) ? msgs[0] : msgs;

		// Verify response
		assert.exists(msg, 'Should have at least one message');

		// Get message body if fragment is not available
		let messageText = msg.fr || '';
		if (!messageText) {

			// GetMsgRequest
			const getMsgRes = await soap.makeSOAPEnvelopeAccount(
				`<GetMsgRequest xmlns="urn:zimbraMail">
					<m id="${msg.id}" />
				</GetMsgRequest>`, acct2Token
			);
			const fullMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
				? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
			messageText = fullMsg.fr || '';
		}
		const codeMatch = messageText.match(/Temporary Reset Code: (\S+)/);
		const recoveryCode = codeMatch[1];

		// Try to auth with malformed email
		// Send the message
		const authMalformed = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${malformedEmail}</account>
				<recoveryCode>${recoveryCode}</recoveryCode>
			</AuthRequest>`, null
		);
		if (authMalformed.Fault) {

			// Verify response
			assert.include(authMalformed.Fault.Reason.Text, 'authentication failed',
				'Should fail for malformed email');
		} else {
			assert.fail('Expected Fault for malformed email auth');
		}
	});
});
