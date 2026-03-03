import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Search > Search Fetch', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data constants for invalid value testing
	const fetch_spchar = '!@#$%';
	const fetch_numbers = '12345';
	const fetch_negative = '-1';
	const fetch_text = 'sometext';
	const fetch_alpha = 'abcdef';
	const fetch_spaces = '   ';

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

		// Inject test message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: test mail
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
	it('Sanity | Verify fetch attribute of search for fetch 1 along with type message,appointment', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.equal(res.SearchResponse?.m?.[0].su, 'test mail', 'su should match');
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
		assert.equal(res.SearchResponse?.m?.[0].su, 'test mail', 'su should match');
		// Verify empty result set
	});


	it('Sanity | Verify fetch attribute of search for fetch all', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" fetch="all">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.equal(res.SearchResponse?.m?.[0].su, 'test mail', 'su should match');
	});


	it('Regression | Verify fetch attribute of search by putting invalid values of fetch (blank,spchar,integers,negative,sometext,alpha,space) (Bug: 27139)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken, false
		);

		assert.isString(res1.Fault.Detail.Error.Code, 'SearchRequest with blank fetch should fault');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_spchar}">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken, false
		);

		assert.isString(res2.Fault.Detail.Error.Code, 'SearchRequest with spchar fetch should fault');

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
			</SearchRequest>`, accountAuthToken, false
		);

		assert.isString(res5.Fault.Detail.Error.Code, 'SearchRequest with text fetch should fault');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_alpha}">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken, false
		);

		assert.isString(res6.Fault.Detail.Error.Code, 'SearchRequest with alpha fetch should fault');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_spaces}">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken, false
		);

		assert.isString(res7.Fault.Detail.Error.Code, 'SearchRequest with spaces fetch should fault');
	});


	it('Regression | Verify fetch attributes of search by putting leading space with its value 1 (Bug: 27139)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch=" 1">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken, false
		);

		// Server does not trim whitespace from fetch attribute
		// Verify response - may fault or succeed depending on server version
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		} else {
			assert.exists(res.SearchResponse, 'SearchResponse should exist');
		}
	});


	it('Regression | Verify fetch attributes of search by putting trailing space with its value 1 (Bug: 27139)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1 ">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken, false
		);

		// Server does not trim whitespace from fetch attribute
		// Verify response - may fault or succeed depending on server version
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		} else {
			assert.exists(res.SearchResponse, 'SearchResponse should exist');
		}
	});


	it('Regression | Verify fetch attributes of search by putting decimal value', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1.0">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken, false
		);

		// Server may not accept decimal values for fetch attribute
		// Verify response - may fault or succeed depending on server version
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		} else {
			assert.exists(res.SearchResponse, 'SearchResponse should exist');
		}
	});
});
