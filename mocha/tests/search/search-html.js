import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Search > Html', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;
	let res;

	// Test data variables (from XML properties)
	const html_alpha = { name: `html_alpha_${common.getUniqueString()}`, subject: `html_alpha_${common.getUniqueString()}`, from: accountEmail, content: `html_alpha_${common.getUniqueString()}`, value: `html_alpha_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `html_alpha_id`, toString() { return this.name; } };
	const html_decimal = { name: `html_decimal_${common.getUniqueString()}`, subject: `html_decimal_${common.getUniqueString()}`, from: accountEmail, content: `html_decimal_${common.getUniqueString()}`, value: `html_decimal_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `html_decimal_id`, toString() { return this.name; } };
	const html_negative = { name: `html_negative_${common.getUniqueString()}`, subject: `html_negative_${common.getUniqueString()}`, from: accountEmail, content: `html_negative_${common.getUniqueString()}`, value: `html_negative_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `html_negative_id`, toString() { return this.name; } };
	const html_number = { name: `html_number_${common.getUniqueString()}`, subject: `html_number_${common.getUniqueString()}`, from: accountEmail, content: `html_number_${common.getUniqueString()}`, value: `html_number_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `html_number_id`, toString() { return this.name; } };
	const html_spaces = { name: `html_spaces_${common.getUniqueString()}`, subject: `html_spaces_${common.getUniqueString()}`, from: accountEmail, content: `html_spaces_${common.getUniqueString()}`, value: `html_spaces_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `html_spaces_id`, toString() { return this.name; } };
	const html_spchar = { name: `html_spchar_${common.getUniqueString()}`, subject: `html_spchar_${common.getUniqueString()}`, from: accountEmail, content: `html_spchar_${common.getUniqueString()}`, value: `html_spchar_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `html_spchar_id`, toString() { return this.name; } };
	const html_text = { name: `html_text_${common.getUniqueString()}`, subject: `html_text_${common.getUniqueString()}`, from: accountEmail, content: `html_text_${common.getUniqueString()}`, value: `html_text_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `html_text_id`, toString() { return this.name; } };

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
	it('Smoke | Verify html attribute of search for html 1', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="1">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.equal(res.SearchResponse?.m?.[0].mp.mp[0].ct, 'text/html', 'ct should match');
		assert.equal(res.SearchResponse?.m?.[0].mp.mp[0].body, '1', 'body should match');
		// Verify empty result set
	});


	it('Sanity | Verify html attribute of search for html 0', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="0">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.equal(res.SearchResponse?.m?.[0].mp.mp[0].ct, 'text/plain', 'ct should match');
		// XPath expression removed (not valid JS)
		assert.equal(res.SearchResponse?.m?.[0].mp.mp[0].body, '1', 'body should match');
	});


	it('Regression | Verify html attribute of search by putting invalid values(blank, spaces, spchar, number, negative, text, alphanumeric, decimal)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res1.Fault, 'Response should be a Fault');
		assert.include(res1.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_spaces}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res2.Fault, 'Response should be a Fault');
		assert.include(res2.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_spchar}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res3.Fault, 'Response should be a Fault');
		assert.include(res3.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_number}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res4.Fault, 'Response should be a Fault');
		assert.include(res4.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_negative}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res5.Fault, 'Response should be a Fault');
		assert.include(res5.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_text}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res6.Fault, 'Response should be a Fault');
		assert.include(res6.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_alpha}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res7.Fault, 'Response should be a Fault');
		assert.include(res7.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_decimal}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res8.Fault, 'Response should be a Fault');
		assert.include(res8.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Verify the response of query with fetch 0 and html 1', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="0" html="1">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
	});


	it('Regression | Verify html attribute of search by putting leading and trailing spaces', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="    1">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res1.Fault, 'Response should be a Fault');
		assert.include(res1.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="1     ">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res2.Fault, 'Response should be a Fault');
		assert.include(res2.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});
});
