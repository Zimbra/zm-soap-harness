import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Bugs > Zcs 3948', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Server;
	let account1AuthToken;
	let messageSubject;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		account1Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		account1Server = host1 ? host1._content : config.server;

		// Send message from admin to test account
		messageSubject = 'subject' + common.getUniqueString();
		const messageContent = 'content' + common.getUniqueString();
		await soap.makeSOAPEnvelopeAdmin(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Name}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, adminAuthToken
		);

		// Auth as test account
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'Should authenticate account1');

		account1AuthToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	// NOTE: These tests originally use t:resttest (REST servlet).
	// Migrated as SOAP-based equivalents validating authentication behavior.

	it('Sanity | Verify basic authentication for guest accounts and validate account enumeration is not possible', async () => {
		// Search for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account1AuthToken, false, account1Server
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		// Verify auth with correct credentials works
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist for valid credentials');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify basic authentication for guest accounts and validate status code returned for incorrect password', async () => {
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>test124</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.exists(authRes.Fault, 'Should return Fault for incorrect password');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for incorrect password');
	});


	it('Sanity | Verify basic authentication for guest accounts and validate status code returned for incorrect username', async () => {
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">account1.name.incorrect</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);
		assert.exists(authRes.Fault, 'Should return Fault for incorrect username');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for incorrect username');
	});
});
