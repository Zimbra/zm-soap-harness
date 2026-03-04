import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Mail > Mail Post Basic', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);
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
	it('Sanity | Post a message via REST servlet', async () => {
		const emlContent = Buffer.from(
			'From: foo@foo.com\r\nTo: ' + account1Email + '\r\nSubject: restPostTest\r\n' +
			'MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n' +
			'rest post test content\r\n'
		);

		const postRes = await rest.makeRestPostRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fileBuffer: emlContent,
			contentType: 'message/rfc822'
		});

		// Verify response
		assert.equal(postRes.status, 200, 'REST POST should return 200');

		// Verify the message was imported
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:restPostTest</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const msgs = searchRes.SearchResponse?.m;
		const msgArr = Array.isArray(msgs) ? msgs : (msgs ? [msgs] : []);

		// Verify response
		assert.isAtLeast(msgArr.length, 1, 'Should find at least one imported message');
	});
});
