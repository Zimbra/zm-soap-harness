import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Search > Fetch', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const conversation1 = { name: `conversation1_${common.getUniqueString()}`, subject: `conversation1_${common.getUniqueString()}`, from: accountEmail, content: `conversation1_${common.getUniqueString()}`, value: `conversation1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `conversation1_id`, toString() { return this.name; } };
	const fetch_alpha = { name: `fetch_alpha_${common.getUniqueString()}`, subject: `fetch_alpha_${common.getUniqueString()}`, from: accountEmail, content: `fetch_alpha_${common.getUniqueString()}`, value: `fetch_alpha_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `fetch_alpha_id`, toString() { return this.name; } };
	const fetch_negative = { name: `fetch_negative_${common.getUniqueString()}`, subject: `fetch_negative_${common.getUniqueString()}`, from: accountEmail, content: `fetch_negative_${common.getUniqueString()}`, value: `fetch_negative_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `fetch_negative_id`, toString() { return this.name; } };
	const fetch_numbers = { name: `fetch_numbers_${common.getUniqueString()}`, subject: `fetch_numbers_${common.getUniqueString()}`, from: accountEmail, content: `fetch_numbers_${common.getUniqueString()}`, value: `fetch_numbers_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `fetch_numbers_id`, toString() { return this.name; } };
	const fetch_spaces = { name: `fetch_spaces_${common.getUniqueString()}`, subject: `fetch_spaces_${common.getUniqueString()}`, from: accountEmail, content: `fetch_spaces_${common.getUniqueString()}`, value: `fetch_spaces_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `fetch_spaces_id`, toString() { return this.name; } };
	const fetch_spchar = { name: `fetch_spchar_${common.getUniqueString()}`, subject: `fetch_spchar_${common.getUniqueString()}`, from: accountEmail, content: `fetch_spchar_${common.getUniqueString()}`, value: `fetch_spchar_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `fetch_spchar_id`, toString() { return this.name; } };
	const fetch_text = { name: `fetch_text_${common.getUniqueString()}`, subject: `fetch_text_${common.getUniqueString()}`, from: accountEmail, content: `fetch_text_${common.getUniqueString()}`, value: `fetch_text_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `fetch_text_id`, toString() { return this.name; } };

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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify fetch attribute of search for fetch 1 along with type message,appointment', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.equal(res.SearchResponse?.m?.[0].su, 'test mail', 'su should match');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify fetch attribute of search for fetch 0', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="0">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.equal(res.SearchResponse?.m?.[0].su, 'test mail', 'su should match');
		// Verify empty result set
	});


	it('Sanity | Verify fetch attribute of search for fetch all', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" fetch="all">
                  <query>subject:(${conversation1.subject})</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Regression | Verify fetch attribute of search by putting invalid values of fetch (blank,spchar,integers,negative,sometext,alpha,space) (Bug: 27139)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res1.Fault, 'Response should be a Fault');
		assert.include(res1.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_spchar}">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res2.Fault, 'Response should be a Fault');
		assert.include(res2.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_numbers}">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.equal(res3.SearchResponse?.m?.[0].su, 'test mail', 'su should match');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_negative}">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.equal(res4.SearchResponse?.m?.[0].su, 'test mail', 'su should match');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_text}">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res5.Fault, 'Response should be a Fault');
		assert.include(res5.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_alpha}">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res6.Fault, 'Response should be a Fault');
		assert.include(res6.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_spaces}">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res7.Fault, 'Response should be a Fault');
		assert.include(res7.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Verify fetch attributes of search by putting leading space with its value 1 (Bug: 27139)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch=" 1">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.equal(res.SearchResponse?.m?.[0].su, 'test mail', 'su should match');
	});


	it('Regression | Verify fetch attributes of search by putting trailing space with its value 1 (Bug: 27139)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1 ">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.equal(res.SearchResponse?.m?.[0].su, 'test mail', 'su should match');
	});


	it('Regression | Verify fetch attributes of search by putting decimal value', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1.0">
                  <query>subject:(test mail)</query>
            </SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});
});
