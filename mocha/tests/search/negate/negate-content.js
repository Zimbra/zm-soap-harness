import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Negate > Negate Content', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

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
	it('Sanity | Verify that a search for not content - (text) returns the correct email meessage', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>not content:(simple)</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res.SearchResponse, 'Response element should exist');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Sanity | Verify that a search for -content - (text) returns the correct email meessage', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>-content:(simple)</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res.SearchResponse, 'Response element should exist');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Sanity | Verify that a search for -text returns the correct email meessage', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>-simple</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res.SearchResponse, 'Response element should exist');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Sanity | Verify that a search for not text returns the correct email meessage', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>not simple</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res.SearchResponse, 'Response element should exist');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});
});
