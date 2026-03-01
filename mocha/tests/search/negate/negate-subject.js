import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Negate > Negate Subject', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Inject test messages
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: test message
MIME-Version: 1.0
Test content</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
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
	it('Sanity | Verify that a search for not subject - (text) returns the correct email meessage', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest limit="100" xmlns="urn:zimbraMail" types="message">
				<query>not subject:(subject line text email01G)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res1.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest limit="100" xmlns="urn:zimbraMail" types="message">
				<query>not subject:(email01G)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res2.SearchResponse, 'Response element should exist');
	});


	it('Sanity | Verify that a search for -subject - (text) returns the correct email meessage', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest limit="100" xmlns="urn:zimbraMail" types="message">
				<query>-subject:(subject line text email01G)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res1.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest limit="100" xmlns="urn:zimbraMail" types="message">
				<query>-subject:(email01G)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res2.SearchResponse, 'Response element should exist');
	});
});
