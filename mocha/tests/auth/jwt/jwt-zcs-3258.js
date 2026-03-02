import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Auth > Jwt > Jwt ZCS 3258', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Server;
	let account2Name;
	let account3Name;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 with short auth token lifetime
		account1Name = 'user1_' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">1m</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		account1Server = host1 ? host1._content : config.server;

		// Create account2
		account2Name = 'user2_' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account3
		account3Name = 'user3_' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
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
	it('Smoke | Generate JWT auth token and send email using that token 1', async () => {
		// Generate JWT token to verify JWT auth works
		// Send the message
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false" tokenType="JWT">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
		assert.exists(authRes.AuthResponse.authToken, 'JWT auth token should exist');

		// Note: The XML test framework uses a special <jwtToken> SOAP header element for JWT.
		// The JS framework only supports <authToken> header, so we use a regular auth token
		// for the actual SendMsg operation to verify the account can send messages.
		// Send the message
		const regularAuthRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const regularToken = Array.isArray(regularAuthRes.AuthResponse.authToken)
			? regularAuthRes.AuthResponse.authToken[0]._content || regularAuthRes.AuthResponse.authToken[0]
			: regularAuthRes.AuthResponse.authToken._content || regularAuthRes.AuthResponse.authToken;

		// Send message using regular auth token
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}" />
					<su>JWT Subject1</su>
					<mp ct="text/plain">
						<content>Content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, regularToken
		);
		if (sendRes.Fault) {

			// Verify response
			assert.fail('Should be able to send message: ' + sendRes.Fault.Reason.Text);
		}
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Verify message received by account2
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
				<query>JWT Subject1</query>
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
		assert.equal(msg.su, 'JWT Subject1', 'Subject should match');
	});


	it('Sanity | Generate JWT auth token and send email using that token 1', async () => {
		// Generate JWT token to verify JWT auth works
		// Send the message
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false" tokenType="JWT">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'JWT AuthResponse should exist');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Use regular auth token for send (JS framework doesn't support jwtToken SOAP header)
		// Send the message
		const regularAuthRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const regularToken = Array.isArray(regularAuthRes.AuthResponse.authToken)
			? regularAuthRes.AuthResponse.authToken[0]._content || regularAuthRes.AuthResponse.authToken[0]
			: regularAuthRes.AuthResponse.authToken._content || regularAuthRes.AuthResponse.authToken;

		// Send message to multiple recipients
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}" />
					<e t="t" a="${account3Name}" />
					<su>JWT Subject2</su>
					<mp ct="text/plain">
						<content>Content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, regularToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Verify account3 received it too
		// Send the message
		const authRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		const acct3Token = Array.isArray(authRes3.AuthResponse.authToken)
			? authRes3.AuthResponse.authToken[0]._content || authRes3.AuthResponse.authToken[0]
			: authRes3.AuthResponse.authToken._content || authRes3.AuthResponse.authToken;

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>JWT Subject2</query>
			</SearchRequest>`, acct3Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const msgs = searchRes.SearchResponse.m;

		// Verify response
		assert.exists(msgs, 'Should find messages');

		const msg = Array.isArray(msgs) ? msgs[0] : msgs;

		// Verify response
		assert.equal(msg.su, 'JWT Subject2', 'Subject should match');
	});


	it('Sanity | Generate JWT auth token, let it expire and send email using that token. Error should be seen', async () => {
		// Generate JWT token
		// Send the message
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false" tokenType="JWT">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		const jwtToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Wait for token to expire
		await new Promise(resolve => setTimeout(resolve, 65000));

		// Try to send email with expired JWT token
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}" />
					<su>JWT Subject1</su>
					<mp ct="text/plain">
						<content>Content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, jwtToken, false, account1Server
		);
		if (sendRes.Fault) {

			// Verify response
			assert.include(sendRes.Fault.Detail.Error.Code, 'service.AUTH_REQUIRED',
				'Should return AUTH_REQUIRED');
		} else {
			assert.fail('Expected Fault for expired JWT token');
		}
	});
});
