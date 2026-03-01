import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Basic > Subject String Comparison', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

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

		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

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
	it('Sanity | Verify that a search for subject - greater than address and subject - greater than address returns the correct email meessage', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>subject:">kite"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^openwavemail.*/, 'Value should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^mail.*/, 'Value should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^xmlbeans.*/, 'Value should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^language test.*/, 'Value should match pattern');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>subject:">=kite"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^openwavemail.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^mail.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^xmlbeans.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^language test.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^kite.*/, 'Value should match pattern');
	});


	it('Sanity | Verify that a search for subject - ltaddress and subjectlt address returns the correct email meessage', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>subject:"&lt;kite"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^fmail.*/, 'Value should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^javamail.*/, 'Value should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^ibibo.*/, 'Value should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^hotmail.*/, 'Value should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^gmail.*/, 'Value should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^email01A.*/, 'Value should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^bug8260.*/, 'Value should match pattern');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>subject:"&lt;=kite"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^fmail.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^javamail.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^ibibo.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^hotmail.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^gmail.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^email01A.*/, 'Value should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^bug8260.*/, 'Value should match pattern');
	});
});
