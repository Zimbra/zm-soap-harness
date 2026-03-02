import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Fmt > Sync Conv', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;
	let message1Id;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Send a message to create a conversation
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>convTest${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>conversation test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		message1Id = sendRes.SendMsgResponse?.m?.id
			|| (Array.isArray(sendRes.SendMsgResponse?.m)
				? sendRes.SendMsgResponse.m[0].id : undefined);
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
	it('Sanity | Verify X-Zimbra-Conv header in sync format for sent message', async () => {
		if (!message1Id) return;
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: message1Id,
			fmt: 'sync'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Conv', 'Should contain X-Zimbra-Conv header');
	});


	it('Sanity | Verify X-Zimbra-Conv header for received message', async () => {
		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Search for received message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const msgs = searchRes.SearchResponse?.m;
		const msgArr = Array.isArray(msgs) ? msgs : (msgs ? [msgs] : []);
		if (msgArr.length === 0) return;
		const msgId = msgArr[0].id;

		const res = await rest.makeRestRequest(account2Token, {
			user: account2Email,
			id: msgId,
			fmt: 'sync'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Conv', 'Should contain X-Zimbra-Conv header');
	});
});
