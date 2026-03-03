import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Attach > Search Uuencode', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	// Content strings from XML properties
	const msg01Content = 'Western Digital WD800JB 80GB 8MB Buffer';
	const msg02Content = 'Lucky Craft PT65-803BRT Pointer';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create account2
		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Inject message with uuencoded Word Doc content into account1
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: uuencode word doc
MIME-Version: 1.0
${msg01Content}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// Inject message with uuencoded text content into account2
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail2}
Subject: uuencode text
MIME-Version: 1.0
${msg02Content}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken2
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
	it('Regression | Search attachment content of a mime message with uuencoded Word Doc attachment (Bug: 1246)', async () => {
		// Search for content in account1's inbox
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m?.[0].id, 'Message id should exist');

		// Search for content string
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>content:(${msg01Content})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Regression | Search attachment content of a mime message with uuencoded text attachment (Bug: 1246,700)', async () => {
		// Search for content in account2's inbox
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m?.[0].id, 'Message id should exist');

		// Search for content string
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>content:(${msg02Content})</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});
});
