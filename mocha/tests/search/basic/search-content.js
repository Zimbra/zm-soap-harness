import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Basic > Content', function () {
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
	it('Functional | Login as the appropriate test account', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});


	it('Functional | Verify that a search for simple text returns the correct email meessage 1', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>content:(simple text string in the body)</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.equal(res.SearchResponse?.m?.[0].su, 'email01A', 'Value should match');
	});


	it('Functional | Verify that a search for simple text returns the correct email meessage 2', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>content:(simple text string in the attachment)</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');

	});


	it('Functional | Verify that a search for simple text with common terms (i.e. to) returns correctly (Bug: 1701)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>content:(contributing to xmlbeans)</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m?.[0].su), /.*email01H.*/, 'su should match pattern');
		assert.match(String(res.SearchResponse?.m?.[0].su), /.*email01H.*/, 'su should match pattern');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>contributing to xmlbeans</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m?.[0].su), /.*email01H.*/, 'su should match pattern');
		assert.match(String(res.SearchResponse?.m?.[0].su), /.*email01H.*/, 'su should match pattern');
		assert.exists(res2.SearchResponse?.m, 'Response element should exist');
	});
});
