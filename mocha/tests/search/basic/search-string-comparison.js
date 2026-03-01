import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Basic > String Comparison', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;
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
	it('Smoke | Verify that a search for from - greater than address and from - greater than address with partial query returns the correct email meessage', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>from:">gfoo"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m.e.a), /^spamaddress.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^itestfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^hfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^gfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^origination_address.*/, 'a should match pattern');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>from:">=gfoo"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m.e.a), /^spamaddress.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^itestfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^hfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^gfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^origination_address.*/, 'a should match pattern');
	});


	it('Sanity | Verify that a search for from - greater than address with exact query returns the correct email meessage', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>from:">gfoo@foo.com"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m.e.a), /^spamaddress.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^itestfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^hfoo.*/, 'a should match pattern');
		// Verify empty result set
		assert.match(String(res.SearchResponse?.m.e.a), /^origination_address.*/, 'a should match pattern');
	});


	it('Sanity | Verify that a search for from - ltaddress with partial query returns the correct email meessage', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>from:"&lt;gfoo"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m.e.a), /^foo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^efoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^dfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^cfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^bfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^afoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^fromFirst.fromLast.*/, 'a should match pattern');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>from:"&lt;=gfoo"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m.e.a), /^foo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^efoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^dfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^cfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^bfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^afoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^fromFirst.fromLast.*/, 'a should match pattern');
	});


	it('Sanity | Verify that a search for from - ltaddress with exact query returns the correct email meessage', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>from:"&lt;gfoo@foo.com"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m.e.a), /^foo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^efoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^dfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^cfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^bfoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^afoo.*/, 'a should match pattern');
		assert.match(String(res.SearchResponse?.m.e.a), /^fromFirst.fromLast.*/, 'a should match pattern');
		// Verify empty result set
	});


	it('Sanity | Verify that a search for CC - greater than address with partial query returns the correct email meessage', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>cc:">ecopy_address"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m?.[0].su), /.*email01F$/, 'Value should match pattern');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>cc:"ecopy_address@copy_domain.com"</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m?.[0].su), /.*email01F$/, 'Value should match pattern');
	});
});
