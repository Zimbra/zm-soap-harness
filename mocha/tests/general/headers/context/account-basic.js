import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('General > Headers > Context > Account Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Email = `account${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		account1Id = account.id;
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
	it('Smoke | Verify that using account (by name) in the context uses the specified account for the request (AddMsgRequest)', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body

</content>
				</m>
			</AddMsgRequest>`, adminAuthToken, account1Email
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(account1Email);

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${subject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = searchRes.SearchResponse.m;

		// Verify response
		assert.exists(msgs, 'Should find the message');
	});


	it('Sanity | Verify that using account (by id) in the context uses the specified account for the request (AddMsgRequest)', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body

</content>
				</m>
			</AddMsgRequest>`, adminAuthToken, account1Id
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(account1Email);

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${subject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = searchRes.SearchResponse.m;

		// Verify response
		assert.exists(msgs, 'Should find the message');
	});
});
