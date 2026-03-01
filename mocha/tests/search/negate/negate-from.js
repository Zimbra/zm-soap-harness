import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Negate > Negate From', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	before(async function () {
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify that a negateive search for not from - (address) returns the correct email meessage', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest limit="100" xmlns="urn:zimbraMail" types="message">
			   <query>not from:(origination_address)</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res1.SearchResponse, 'Response element should exist');
		assert.exists(res1.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest limit="100" xmlns="urn:zimbraMail" types="message">
			   <query>not from:(origination_address@origination_domain.com)</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res2.SearchResponse, 'Response element should exist');
		assert.exists(res2.SearchResponse, 'Response element should exist');
	});


	it('Sanity | Verify that a negateive search for -from - (address) returns the correct email meessage', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest limit="100" xmlns="urn:zimbraMail" types="message">
			   <query>-from:(origination_address)</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res1.SearchResponse, 'Response element should exist');
		assert.exists(res1.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest limit="100" xmlns="urn:zimbraMail" types="message">
			   <query>-from:(origination_address@origination_domain.com)</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res2.SearchResponse, 'Response element should exist');
		assert.exists(res2.SearchResponse, 'Response element should exist');
	});
});
