import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Mail > Rest Message', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account3Email, account4Email;
	let message1Id, message1Subject, message1Content;
	let message2Id, message2Subject;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		message1Subject = 'subject' + common.getUniqueString();
		message1Content = 'content' + common.getUniqueString();
		message2Subject = 'subject' + common.getUniqueString();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		account3Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		account4Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		for (const email of [account1Email, account2Email, account3Email, account4Email]) {

			// Create account
			const createRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(createRes.Fault, 'Response should not be a Fault');
			assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
			const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
			assert.exists(host, 'zimbraMailHost should exist');
		}

		account1Token = await soap.getAccountAuthToken(account1Email);

		// Send message1 with To, Cc, Bcc
		const send1Res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="c" a="${account3Email}"/>
					<e t="b" a="${account4Email}"/>
					<su>${message1Subject}</su>
					<mp ct="text/plain">
						<content>${message1Content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(send1Res.Fault, 'Response should not be a Fault');
		const m1 = send1Res.SendMsgResponse?.m;
		message1Id = (Array.isArray(m1) ? m1[0] : m1).id;

		// Send message2 (for second send, reuse same setup)
		const send2Res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="c" a="${account3Email}"/>
					<e t="b" a="${account4Email}"/>
					<su>${message1Subject}</su>
					<mp ct="text/plain">
						<content>${message1Content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(send2Res.Fault, 'Response should not be a Fault');

		// Add external message via AddMsgRequest (instead of LMTP inject)
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: external@test.com\r\nTo: ${account1Email}\r\nSubject: ${message2Subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nexternal message content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addMsgRes.Fault, 'Response should not be a Fault');
		const m2 = addMsgRes.AddMsgResponse?.m;
		message2Id = (Array.isArray(m2) ? m2[0] : m2).id;
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
	it('Sanity | Basic verification of Rest Servlet - get a message by id', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: message1Id
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, account2Email, 'Response should contain To address');
		assert.include(res.body, message1Subject, 'Response should contain Subject');
	});


	it('Sanity | Basic verification of Rest Servlet - get a message (externally sent) by id', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: message2Id
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, account1Email, 'Response should contain To address');
		assert.include(res.body, 'external@test.com', 'Response should contain From address');
		assert.include(res.body, message2Subject, 'Response should contain Subject');
	});


	it('Sanity | Basic Rest Servlet Test - Verify the http 200 response', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: message1Id
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.isAbove(res.body.length, 10, 'Response should have content');
	});


	it('Sanity | Basic Content Servlet Test - Verify the http response is 404 when an invalid ID is sent', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: '252525'
		});

		// Verify response
		assert.equal(res.status, 404, 'Invalid ID should return 404');
	});
});
