import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Search > Read', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	// Test data variables (from XML properties)
	const read_alpha = { name: `read_alpha_${common.getUniqueString()}`, subject: `read_alpha_${common.getUniqueString()}`, from: accountEmail, content: `read_alpha_${common.getUniqueString()}`, value: `read_alpha_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `read_alpha_id`, toString() { return this.name; } };
	const read_decimal = { name: `read_decimal_${common.getUniqueString()}`, subject: `read_decimal_${common.getUniqueString()}`, from: accountEmail, content: `read_decimal_${common.getUniqueString()}`, value: `read_decimal_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `read_decimal_id`, toString() { return this.name; } };
	const read_negative = { name: `read_negative_${common.getUniqueString()}`, subject: `read_negative_${common.getUniqueString()}`, from: accountEmail, content: `read_negative_${common.getUniqueString()}`, value: `read_negative_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `read_negative_id`, toString() { return this.name; } };
	const read_number = { name: `read_number_${common.getUniqueString()}`, subject: `read_number_${common.getUniqueString()}`, from: accountEmail, content: `read_number_${common.getUniqueString()}`, value: `read_number_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `read_number_id`, toString() { return this.name; } };
	const read_spaces = { name: `read_spaces_${common.getUniqueString()}`, subject: `read_spaces_${common.getUniqueString()}`, from: accountEmail, content: `read_spaces_${common.getUniqueString()}`, value: `read_spaces_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `read_spaces_id`, toString() { return this.name; } };
	const read_spchar = { name: `read_spchar_${common.getUniqueString()}`, subject: `read_spchar_${common.getUniqueString()}`, from: accountEmail, content: `read_spchar_${common.getUniqueString()}`, value: `read_spchar_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `read_spchar_id`, toString() { return this.name; } };
	const read_text = { name: `read_text_${common.getUniqueString()}`, subject: `read_text_${common.getUniqueString()}`, from: accountEmail, content: `read_text_${common.getUniqueString()}`, value: `read_text_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `read_text_id`, toString() { return this.name; } };

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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify read attribute of search by putting fetch 0 and read 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="0" read="1">
                <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
                <query>is:read</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Sanity | Verify read attribute of search for read 0 (Bug: 6473, 16719)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="0">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.equal(res1.SearchResponse?.m?.[0].mp[0].body, '1', 'body should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
                <query>is:unread</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify read attribute of search for read 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="1">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.equal(res1.SearchResponse?.m?.[0].mp[0].body, '1', 'body should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist', 'a should match');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
                <query>is:read</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Regression | Verify read attribute of search by putting invalid values of it (blank, spchar, integer negative, sometext, alpha, spaces, deciaml)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res1.Fault, 'Response should be a Fault');
		assert.include(res1.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_spchar}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res2.Fault, 'Response should be a Fault');
		assert.include(res2.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_number}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res3.Fault, 'Response should be a Fault');
		assert.include(res3.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_negative}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res4.Fault, 'Response should be a Fault');
		assert.include(res4.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_text}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res5.Fault, 'Response should be a Fault');
		assert.include(res5.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_alpha}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res6.Fault, 'Response should be a Fault');
		assert.include(res6.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_spaces}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res7.Fault, 'Response should be a Fault');
		assert.include(res7.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_decimal}">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res8.Fault, 'Response should be a Fault');
		assert.include(res8.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Verify read attribute of search by putting leading and trailing spaces with its value 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="   1">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res1.Fault, 'Response should be a Fault');
		assert.include(res1.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="1   ">
                  <query>message</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res2.Fault, 'Response should be a Fault');
		assert.include(res2.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});
});
