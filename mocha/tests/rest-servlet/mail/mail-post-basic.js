import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Mail > Post Basic', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		account1Token = await soap.getAccountAuthToken(account1Email);
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

		const postRes = await soap.makeRestPostRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fileBuffer: emlContent,
			contentType: 'message/rfc822'
		});
		assert.equal(postRes.status, 200, 'REST POST should return 200');

		// Verify the message was imported
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:restPostTest</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const msgs = searchRes.SearchResponse?.m;
		const msgArr = Array.isArray(msgs) ? msgs : (msgs ? [msgs] : []);
		assert.isAtLeast(msgArr.length, 1, 'Should find at least one imported message');
	});
});
