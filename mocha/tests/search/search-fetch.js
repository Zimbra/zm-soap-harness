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
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.equal(res.SearchResponse?.m?.[0].su, 'test mail', 'su should match');
	});


	it('Regression | Verify fetch attribute of search by putting invalid values of fetch (blank,spchar,integers,negative,sometext,alpha,space) (Bug: 27139)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		if (res1.Fault) {
			assert.exists(res1.Fault, 'Response may be a Fault for blank fetch');
		} else {
			assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		}

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_spchar}">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		if (res2.Fault) {
			assert.exists(res2.Fault, 'Response may be a Fault for spchar fetch');
		} else {
			assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		}

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

		if (res5.Fault) {
			assert.exists(res5.Fault, 'Response may be a Fault for text fetch');
		} else {
			assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		}

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_alpha}">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		if (res6.Fault) {
			assert.exists(res6.Fault, 'Response may be a Fault for alpha fetch');
		} else {
			assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		}

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${fetch_spaces}">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		if (res7.Fault) {
			assert.exists(res7.Fault, 'Response may be a Fault for spaces fetch');
		} else {
			assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		}
	});


	it('Regression | Verify fetch attributes of search by putting leading space with its value 1 (Bug: 27139)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch=" 1">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		if (res.Fault) {
			assert.exists(res.Fault, 'Response should be a Fault for leading space');
		} else {
			assert.exists(res.SearchResponse, 'SearchResponse should exist');
		}
	});


	it('Regression | Verify fetch attributes of search by putting trailing space with its value 1 (Bug: 27139)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1 ">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		if (res.Fault) {
			assert.exists(res.Fault, 'Response should be a Fault for trailing space');
		} else {
			assert.exists(res.SearchResponse, 'SearchResponse should exist');
		}
	});


	it('Regression | Verify fetch attributes of search by putting decimal value', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1.0">
				<query>subject:(test mail)</query>
			</SearchRequest>`, accountAuthToken
		);

		if (res.Fault) {
			assert.exists(res.Fault, 'Response should be a Fault for decimal');
		} else {
			assert.exists(res.SearchResponse, 'SearchResponse should exist');
		}
	});
});
