import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Auth > Jwt > Jwt ZCS 2478', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Server;
	let account2Name;

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
	it('Sanity | Generate JWT auth token, let it expire and send email using that token. Error should be thrown', async () => {
		// Generate JWT auth token
		// Send the message
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false" tokenType="JWT">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, account1Server
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Wait for token to expire (1 minute)
		await new Promise(resolve => setTimeout(resolve, 65000));

		// Try to send email with expired JWT token - should fail
		const jwtToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// SendMsgRequest
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
		assert.isString(sendRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(sendRes.Fault.Detail.Error.Code, 'service.AUTH_REQUIRED',
			'Should return AUTH_REQUIRED');
	});
});
