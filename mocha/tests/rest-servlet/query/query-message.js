import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Query > Message Query', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let subject;

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

		// Add a message to inbox
		subject = 'queryTest' + common.getUniqueString();
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nquery test content ${subject}\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Search messages via REST servlet query parameter', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'rss',
			query: `subject:${subject}`
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, subject, 'Response should contain the queried message');
	});
});
